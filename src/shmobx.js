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

  static removeListener(target, key, handler) {
    Events.listeners
      .get(target)
      .get(key)
      .delete(handler);
  }
}

class Shmobx {
  static isRegisterMode = false;
  static currRegisterMap = new Map();

  static _setupObservableObj(obj) {
    return new Proxy(obj, {
      get(target, key) {
        // console.log('GET', key);

        if (Shmobx.isRegisterMode) {
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

      set(target, key) {
        // console.log('SET', key, value);

        const res = Reflect.set(...arguments);

        Events.dispatch(target, key);

        return res;
      }
    });
  }

  static observable(data) {
    if (isPlainObject(data)) {
      return Shmobx._setupObservableObj(data);
    }

    return data;
  }

  static autorun(func) {
    function handler() {
      Shmobx.isRegisterMode = true;

      func();

      Shmobx.isRegisterMode = false;

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
}

if (typeof window !== 'undefined') {
  window.shmobx = Shmobx;
} else if (typeof module !== 'undefined') {
  module.exports = Shmobx;
}
