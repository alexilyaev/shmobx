const m = require('./shmobx');
// const m = require('mobx');

const noop = () => {};

describe('Index', () => {
  describe('basic', () => {
    it('should proxy object mutations', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);

      expect(data.count).toBe(initial.count);
      expect(data.name).toBe(initial.name);

      data.count = 2;
      data.name = 'Robin';
      data.new = 999;

      expect(data.count).toBe(2);
      expect(data.name).toBe('Robin');
      expect(data.new).toBe(999);

      delete data.name;

      expect(data.name).toBeUndefined();
    });

    it('should proxy array mutations', () => {
      const initial = [1, 2, 3];
      const data = m.observable(initial);

      expect(data[0]).toBe(1);
      expect(data[1]).toBe(2);
      expect(data[2]).toBe(3);

      data[0] = 111;
      data.push(4);

      expect(data[0]).toBe(111);
      expect(data[3]).toBe(4);

      data.shift();

      expect(data[0]).toBe(2);
      expect(data.length).toBe(3);
    });
  });

  describe('autorun', () => {
    describe('object', () => {
      it('should register autorun handlers: basic', () => {
        const initial = {
          count: 1,
          name: 'John'
        };
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.count;
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        // Not observed by the autorun
        data.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        expect(data).toEqual({
          count: 2,
          name: 'Robin'
        });
      });

      it('should register autorun handlers: tracking non existing keys', () => {
        const data = m.observable({});

        const handler = jest.fn(() => {
          return data.count;
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        data.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        expect(data).toEqual({
          count: 2,
          name: 'Robin'
        });
      });

      it('should unregister autorun handlers: track different key', () => {
        const initial = {
          count: 1,
          name: 'John'
        };
        const data = m.observable(initial);
        let runsCount = 0;

        const handler = jest.fn(() => {
          runsCount++;

          return runsCount === 1 ? data.count : data.name;
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        // Not tracked at this point, so won't trigger autorun
        data.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        // No longer tracked after the 1st run, so won't trigger
        data.count = 3;
        expect(handler).toHaveBeenCalledTimes(2);

        data.name = 'Jane';
        expect(handler).toHaveBeenCalledTimes(3);

        expect(data).toEqual({
          count: 3,
          name: 'Jane'
        });
      });

      it('should unregister autorun handlers: track different target', () => {
        const data1 = m.observable({
          count: 1
        });
        const data2 = m.observable({
          name: 'John'
        });
        let runsCount = 0;

        const handler = jest.fn(() => {
          runsCount++;

          return runsCount === 1 ? data1.count : data2.name;
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        // Both are not tracked at this point
        data1.name = 'Robin';
        data2.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data1.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        // No longer tracked
        data1.count = 3;
        expect(handler).toHaveBeenCalledTimes(2);

        data2.name = 'Jane';
        expect(handler).toHaveBeenCalledTimes(3);
      });
    });

    describe('array', () => {
      it('should register autorun handlers: basic', () => {
        const initial = [1, 2, 3, 4];
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.map(val => val);
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        data[0] = 111;
        expect(handler).toHaveBeenCalledTimes(2);

        data.push(5);
        expect(handler).toHaveBeenCalledTimes(3);

        data.pop();
        expect(handler).toHaveBeenCalledTimes(4);
        expect(data).toEqual([111, 2, 3, 4]);
      });

      it('should register autorun handlers: observe nested Objects', () => {
        const initial = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' },
          { id: 3, name: 'Jane' }
        ];
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.map(user => user.name);
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        // The `id` key is not tracked anywhere
        data[2].id = 33;
        expect(handler).toHaveBeenCalledTimes(1);

        data[2].name = 'Jake';
        expect(handler).toHaveBeenCalledTimes(2);

        // `foo` not tracked anywhere
        data[2].foo = null;
        expect(handler).toHaveBeenCalledTimes(2);

        data.push({ id: 4, name: 'Thor' });
        expect(handler).toHaveBeenCalledTimes(3);

        data[3].name = 'Loki';
        expect(handler).toHaveBeenCalledTimes(4);

        expect(data).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' },
          { id: 33, name: 'Jake', foo: null },
          { id: 4, name: 'Loki' }
        ]);
      });

      it('should register autorun handlers: observe nested Array', () => {
        const initial = [[1, 2, 3], [4, 5, 6]];
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.map(nums => nums.forEach(noop));
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        data[0][0] = 111;
        expect(handler).toHaveBeenCalledTimes(2);

        data.push([7, 8, 9]);
        expect(handler).toHaveBeenCalledTimes(3);

        data[2][2] = 999;
        expect(handler).toHaveBeenCalledTimes(4);

        expect(data).toEqual([[111, 2, 3], [4, 5, 6], [7, 8, 999]]);
      });

      it('should unregister autorun handlers: remove nested Object', () => {
        const initial = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' },
          { id: 3, name: 'Jane' }
        ];
        const data = m.observable(initial);
        const janeProxy = data[2];

        const handler = jest.fn(() => {
          return data.map(user => user.name);
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        janeProxy.name = 'Jake';
        expect(handler).toHaveBeenCalledTimes(2);

        data.pop();
        expect(handler).toHaveBeenCalledTimes(3);

        // `janeProxy` object is no longer in `data`, so in no longer tracked
        janeProxy.name = 'Jane';
        expect(handler).toHaveBeenCalledTimes(3);

        expect(data).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' }
        ]);
      });
    });

    describe('dispose', () => {
      it('should unregister autorun handlers: disposer', () => {
        const initial = {
          count: 1,
          name: 'John'
        };
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.count;
        });

        const autorunDisposer = m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        autorunDisposer();
        data.count = 2;

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should unregister autorun handlers: reaction dispose', () => {
        const initial = {
          count: 1,
          name: 'John'
        };
        const data = m.observable(initial);
        let runs = 0;

        const handler = jest.fn(reaction => {
          runs++;

          if (runs === 2) {
            reaction.dispose();
          }

          return data.count;
        });

        m.autorun(handler);

        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        data.count = 3;
        expect(handler).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('transaction', () => {
    it('should combine multiple mutations and notify once', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);

      const handler = jest.fn(() => {
        // Track all properties of `data`
        return Object.values(data);
      });

      m.autorun(handler);

      m.transaction(() => {
        data.count = 2;
        data.name = 'Robin';
      });

      expect(handler).toHaveBeenCalledTimes(2);

      expect(data).toEqual({
        count: 2,
        name: 'Robin'
      });
    });

    it('should handle different tracked objects and multiple listeners', () => {
      const data1 = m.observable({
        count: 1
      });
      const data2 = m.observable({
        name: 'John'
      });

      const handler1 = jest.fn(() => {
        return [data1.count, data2.name];
      });
      const handler2 = jest.fn(() => {
        return data2.name;
      });

      m.autorun(handler1);
      m.autorun(handler2);

      m.transaction(() => {
        data1.count = 2;
        data2.name = 'Robin';
      });

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(2);
    });

    it('should handle complex array mutations and notify once', () => {
      const initial = [1, 2, 3, 4, 5];
      const data = m.observable(initial);

      const handler = jest.fn(() => {
        return data.map(val => val);
      });

      m.autorun(handler);

      m.transaction(() => {
        // Makes several mutations cause it needs to move items from the end to
        // Fill the place of the removed item
        data.splice(1, 1);
        // Same as with `splice`
        data.shift();
      });
      expect(handler).toHaveBeenCalledTimes(2);
      expect(data).toEqual([3, 4, 5]);
    });
  });

  describe('reaction', () => {
    it('should register reaction handlers: basic', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);

      const dataFunc = jest.fn(() => {
        return data.count;
      });
      const handler = jest.fn(count => {
        expect(count).toBe(2);

        return [data.count, data.name];
      });

      m.reaction(dataFunc, handler);

      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      // `name` not tracked in `dataFunc`
      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should register reaction handlers: fireImmediately', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);
      let runs = 0;

      const dataFunc = jest.fn(() => {
        return data.count;
      });
      const handler = jest.fn(count => {
        runs++;
        expect(count).toBe(runs === 1 ? 1 : 2);

        return [data.count, data.name];
      });

      m.reaction(dataFunc, handler, { fireImmediately: true });

      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);

      // `name` not tracked in `dataFunc`
      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should unregister reaction handlers: reaction dispose', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);

      const dataFunc = jest.fn(() => {
        return data.count;
      });
      const handler = jest.fn(count => {
        expect(count).toBe(2);

        return [data.count, data.name];
      });

      const reactionDisposer = m.reaction(dataFunc, handler);

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      reactionDisposer();

      data.count = 3;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister reaction handlers: effect func dispose', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);

      const dataFunc = jest.fn(() => {
        return data.count;
      });
      const handler = jest.fn((count, reaction) => {
        expect(count).toBe(2);

        if (count === 2) {
          reaction.dispose();
        }

        return [data.count, data.name];
      });

      m.reaction(dataFunc, handler);

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      data.count = 3;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister reaction handlers: tracked keys change', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = m.observable(initial);
      let runsCount = 0;

      const dataFunc = jest.fn(() => {
        runsCount++;

        return runsCount === 1 ? data.count : data.name;
      });
      const handler = jest.fn(data => {
        expect(data).toBe(runsCount < 3 ? 'Robin' : 'Jane');

        return [data.count, data.name];
      });

      m.reaction(dataFunc, handler);

      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      // Not tracked at this point
      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      // No longer tracked
      data.count = 3;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      data.name = 'Jane';
      expect(dataFunc).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
