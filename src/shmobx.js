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
    if (!Events.listeners.get(target).has(key)) {
      Events.listeners.get(target).set(key, new Set());
    }

    Events.listeners
      .get(target)
      .get(key)
      .add(handler);
  }

  static dispatch(target, key) {
    const targetMap = Events.listeners.get(target);

    if (!targetMap || !targetMap.get(key)) {
      return;
    }

    Events.listeners
      .get(target)
      .get(key)
      .forEach(handler => handler());
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

        if (!targetKeyListeners) {
          return;
        }

        targetKeyListeners.forEach(listener => uniqueListeners.add(listener));
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

    if (Array.isArray(data)) {
      data.forEach((value, key) => {
        Shmobx._wrapNestedValue(data, key, value);
      });
    }
    if (isPlainObject(data)) {
      Object.entries(data).forEach(([key, value]) => {
        Shmobx._wrapNestedValue(data, key, value);
      });
    }

    return new Proxy(data, {
      get(target, key) {
        // console.log('GET', target, key);

        if (Shmobx.inRegisterMode) {
          let targetTrackedKeys = Shmobx.currRegisterMap.get(target);

          if (!targetTrackedKeys) {
            targetTrackedKeys = Shmobx.currRegisterMap
              .set(target, new Set())
              .get(target);
          }

          targetTrackedKeys.add(key);
        }

        return Reflect.get(...arguments);
      },

      /* eslint-disable-next-line no-unused-vars */
      set(target, key, value) {
        // console.log('SET', target, key, value);

        const res = Reflect.set(...arguments);

        Shmobx._wrapNestedValue(target, key, value);

        if (Shmobx.inTransactionMode) {
          let targetTrackedKeys = Shmobx.currTransactionMap.get(target);

          if (!targetTrackedKeys) {
            targetTrackedKeys = Shmobx.currTransactionMap
              .set(target, new Set())
              .get(target);
          }

          targetTrackedKeys.add(key);
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

  static autorun(func) {
    function handler() {
      Shmobx.inRegisterMode = true;
      func();
      Shmobx.inRegisterMode = false;

      Shmobx._trackTargets(handler);
    }

    handler();
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

    handler.dispose = () => {
      // Will untrack everything we previously tracked in dataFunc since
      // Shmobx.currRegisterMap will be empty
      Shmobx._trackTargets(handler);
    };

    handler();

    return handler.dispose;
  }

  static transaction(func) {
    Shmobx.inTransactionMode = true;
    func();
    Shmobx.inTransactionMode = false;

    Events.dispatchTransaction(Shmobx.currTransactionMap);
    Shmobx.currTransactionMap = new Map();
  }
}

if (typeof window !== 'undefined') {
  window.shmobx = Shmobx;
} else if (typeof module !== 'undefined') {
  module.exports = Shmobx;
}
