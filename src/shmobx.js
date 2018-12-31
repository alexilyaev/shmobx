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

const shmobx = (() => {
  function observable(data) {
    if (isPlainObject(data)) {
      const keys = Object.keys(data);

      keys.forEach(key => {
        const _key = '_' + key;

        data[_key] = data[key];

        Object.defineProperty(data, key, {
          get() {
            return this[_key];
          }
        });

        Object.defineProperty(data, key, {
          set(value) {
            this[_key] = value;
          }
        });
      });

      return data;
    }

    return data;
  }

  return {
    observable
  };
})();

if (typeof window !== 'undefined') {
  window.shmobx = shmobx;
}

module.exports = shmobx;
