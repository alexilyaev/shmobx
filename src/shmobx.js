// const funcTag = '[object Function]';
const objectTag = '[object Object]';

function isObjectLike(value) {
  return value !== null && typeof value === 'object';
}

function isPlainObject(value) {
  return (
    isObjectLike(value) && Object.prototype.toString.call(value) === objectTag
  );
}

//----------------------------------------------------------

class Events {
  /**
   * Abstract Structure:
   * {
   *   [{ ... }]: {
   *     [key]: [handler, handler, ...],
   *     ...
   *   },
   *   ...
   * }
   */
  static listeners = new Map();

  static on(target, key, handler) {
    if (!Events.listeners.has(target)) {
      Events.listeners.set(target, new Map());
    }

    const targetListeners = Events.listeners.get(target);

    if (targetListeners.has(key)) {
      targetListeners.get(key).add(handler);
    } else {
      targetListeners.set(key, new Set([handler]));
    }
  }

  static dispatch(target, key) {
    const targetMap = Events.listeners.get(target);

    if (!targetMap || !targetMap.get(key)) {
      return;
    }

    targetMap.get(key).forEach(handler => handler());
  }

  static dispatchTransaction(changedMap) {
    const uniqueListeners = new Set();

    changedMap.forEach((changedKeys, target) => {
      const targetMap = Events.listeners.get(target);

      if (!targetMap) {
        return;
      }

      changedKeys.forEach(changedKey => {
        const targetKeyListeners = targetMap.get(changedKey);

        if (targetKeyListeners) {
          targetKeyListeners.forEach(listener => uniqueListeners.add(listener));
        }
      });
    });

    uniqueListeners.forEach(handler => handler());
  }

  static removeListener(target, key, handler) {
    const targetMap = Events.listeners.get(target);

    if (!targetMap || !targetMap.has(key)) {
      return;
    }

    const targetKeyListeners = targetMap.get(key);

    targetKeyListeners.delete(handler);

    // Cleanup ghost references
    if (targetKeyListeners.size === 0) {
      targetMap.delete(key);
    }
    if (targetMap.size === 0) {
      Events.listeners.delete(target);
    }
  }
}

class Shmobx {
  static inRegisterMode = false;
  static inTransactionMode = false;
  static currRegisterMap = new Map();
  static currTransactionMap = new Map();

  static _wrapNestedValue(target, key, value) {
    if (isPlainObject(value) || Array.isArray(value)) {
      target[key] = Shmobx.observable(value);
    }
  }

  static observable(data) {
    if (!isPlainObject(data) && !Array.isArray(data)) {
      throw new Error('Currently supporting only Object and Array');
    }

    // Will work for both Objects and Arrays
    Object.keys(data).forEach(key => {
      Shmobx._wrapNestedValue(data, key, data[key]);
    });

    return new Proxy(data, {
      get(target, key) {
        // console.log('GET', target, key);

        if (Shmobx.inRegisterMode) {
          const targetTrackedKeys = Shmobx.currRegisterMap.get(target);

          if (targetTrackedKeys) {
            targetTrackedKeys.add(key);
          } else {
            Shmobx.currRegisterMap.set(target, new Set([key]));
          }
        }

        return Reflect.get(...arguments);
      },

      set(target, key, value) {
        // console.log('SET', target, key, value);

        const res = Reflect.set(...arguments);

        Shmobx._wrapNestedValue(target, key, value);

        if (Shmobx.inTransactionMode) {
          const targetTrackedKeys = Shmobx.currTransactionMap.get(target);

          if (targetTrackedKeys) {
            targetTrackedKeys.add(key);
          } else {
            Shmobx.currTransactionMap.set(target, new Set([key]));
          }
        } else {
          Events.dispatch(target, key);
        }

        return res;
      }
    });
  }

  static _trackTargets(handler) {
    // Add listeners
    Shmobx.currRegisterMap.forEach((trackedKeys, target) => {
      trackedKeys.forEach(key => {
        Events.on(target, key, handler);
      });
    });

    // Remove no longer needed listeners
    if (handler.prevRegisterMap) {
      handler.prevRegisterMap.forEach((prevTrackedKeys, prevTarget) => {
        const currTargetTrackedKeys = Shmobx.currRegisterMap.get(prevTarget);

        prevTrackedKeys.forEach(prevTrackedKey => {
          if (
            !currTargetTrackedKeys ||
            !currTargetTrackedKeys.has(prevTrackedKey)
          ) {
            Events.removeListener(prevTarget, prevTrackedKey, handler);
          }
        });
      });
    }

    handler.prevRegisterMap = Shmobx.currRegisterMap;
    Shmobx.currRegisterMap = new Map();
  }

  static _createDisposer(handler) {
    // Will untrack everything we previously tracked since
    // Shmobx.currRegisterMap will be empty
    return () => {
      // Handle calling `dispose` inside autorun/reaction
      Shmobx.inRegisterMode = false;

      Shmobx._trackTargets(handler);
    };
  }

  static autorun(func) {
    function handler() {
      Shmobx.inRegisterMode = true;
      func(handler);
      Shmobx.inRegisterMode = false;

      Shmobx._trackTargets(handler);
    }

    handler.dispose = Shmobx._createDisposer(handler);
    handler();

    return handler.dispose;
  }

  static reaction(dataFunc, effectFunc, options = {}) {
    let isFirstRun = !options.fireImmediately;

    function handler() {
      Shmobx.inRegisterMode = true;

      const res = dataFunc();

      Shmobx.inRegisterMode = false;

      Shmobx._trackTargets(handler);

      if (!isFirstRun) {
        effectFunc(res, handler);

        return;
      }

      isFirstRun = false;
    }

    handler.dispose = Shmobx._createDisposer(handler);
    handler();

    return handler.dispose;
  }

  static transaction(func) {
    Shmobx.inTransactionMode = true;
    func();
    Shmobx.inTransactionMode = false;

    const transactionMapCopy = new Map(Shmobx.currTransactionMap);

    Shmobx.currTransactionMap = new Map();
    Events.dispatchTransaction(transactionMapCopy);
  }
}

if (typeof window !== 'undefined') {
  window.shmobx = Shmobx;
} else if (typeof module !== 'undefined') {
  module.exports = Shmobx;
}
