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
  isRegisterMode = false;
  currRegisterHandler = null;

  _setupObservableObj(obj) {
    const keys = Object.keys(obj);

    obj._handlers = {};

    keys.forEach(key => {
      const _key = '_' + key;

      obj[_key] = obj[key];

      Object.defineProperty(obj, key, {
        get: () => {
          if (this.isRegisterMode) {
            if (!obj._handlers[key]) {
              obj._handlers[key] = [];
            }

            if (!obj._handlers[key].includes(this.currRegisterHandler)) {
              obj._handlers[key].push(this.currRegisterHandler);
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
    this.isRegisterMode = true;
    this.currRegisterHandler = func;

    func();

    this.isRegisterMode = false;
    this.currRegisterHandler = null;
  }

  reset() {}
}

const shmobx = new Shmobx();

if (typeof window !== 'undefined') {
  window.shmobx = shmobx;
}

module.exports = shmobx;
