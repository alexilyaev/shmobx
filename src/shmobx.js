// const arrayTag = '[object Array]';
// const funcTag = '[object Function]';
// const numberTag = '[object Number]';
// const stringTag = '[object String]';
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

  static _wrapNestedVal(target, key, val) {
    if (isPlainObject(val) || Array.isArray(val)) {
      target[key] = Shmobx.observable(val);
    }
  }

  static observable(data) {
    if (!isPlainObject(data) && !Array.isArray(data)) {
      throw new Error('Currently supporting only Object and Array');
    }

    if (Array.isArray(data)) {
      data.forEach((val, key) => {
        Shmobx._wrapNestedVal(data, key, val);
      });
    }
    if (isPlainObject(data)) {
      Object.entries(data).forEach(([key, val]) => {
        Shmobx._wrapNestedVal(data, key, val);
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

        Shmobx._wrapNestedVal(target, key, value);

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

  static autorun(func) {
    function handler() {
      Shmobx.inRegisterMode = true;
      func();
      Shmobx.inRegisterMode = false;

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

    handler();
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
