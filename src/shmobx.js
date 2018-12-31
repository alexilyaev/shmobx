// const arrayTag = '[object Array]';
// const funcTag = '[object Function]';
// const numberTag = '[object Number]';
const objectTag = '[object Object]';
// const stringTag = '[object String]';

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
  registerMode = false;
  registerHandler = null;

  _setupObservableObj(obj) {
    const keys = Object.keys(obj);

    obj._handlers = {};

    keys.forEach(key => {
      const _key = '_' + key;

      obj[_key] = obj[key];

      Object.defineProperty(obj, key, {
        get: () => {
          if (this.registerMode) {
            if (!obj._handlers[key]) {
              obj._handlers[key] = [];
            }

            if (!obj._handlers[key].includes(this.registerHandler)) {
              obj._handlers[key].push(this.registerHandler);
            }
          }

          return obj[_key];
        }
      });

      Object.defineProperty(obj, key, {
        set: value => {
          obj[_key] = value;

          if (obj._handlers[key]) {
            obj._handlers[key].forEach(handler => handler());
          }
        }
      });
    });

    return obj;
  }

  observable(data) {
    if (isPlainObject(data)) {
      return this._setupObservableObj(data);
    }

    return data;
  }

  autorun(func) {
    this.registerMode = true;
    this.registerHandler = func;

    func();

    this.registerMode = false;
    this.registerHandler = null;
  }

  reset() {}
}

const shmobx = new Shmobx();

if (typeof window !== 'undefined') {
  window.shmobx = shmobx;
}

module.exports = shmobx;
