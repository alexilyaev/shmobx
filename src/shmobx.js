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

class Shmobx {
  static isRegisterMode = false;
  static currRegisterHandler = null;
  static handlers = new WeakMap();

  static _setupObservableObj(obj) {
    return new Proxy(obj, {
      get(target, key) {
        // console.log('GET', key);

        if (Shmobx.isRegisterMode) {
          let targetHandlers = Shmobx.handlers.get(obj);

          if (!targetHandlers) {
            targetHandlers = Shmobx.handlers.set(obj, {}).get(obj);
          }
          if (!targetHandlers[key]) {
            targetHandlers[key] = new Set();
          }

          targetHandlers[key].add(Shmobx.currRegisterHandler);
        }

        return Reflect.get(...arguments);
      },

      set(target, key) {
        // console.log('SET', key, value);

        const res = Reflect.set(...arguments);

        const targetHandlers = Shmobx.handlers.get(obj);

        if (targetHandlers && targetHandlers[key]) {
          targetHandlers[key].forEach(handler => handler());
        }

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
    Shmobx.isRegisterMode = true;
    Shmobx.currRegisterHandler = func;

    func();

    Shmobx.isRegisterMode = false;
    Shmobx.currRegisterHandler = null;
  }
}

const shmobx = Shmobx;

if (typeof window !== 'undefined') {
  window.shmobx = shmobx;
} else if (typeof module !== 'undefined') {
  module.exports = shmobx;
}
