const m = require('./shmobx');
// const m = require('mobx');

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

        data.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

        expect(data).toEqual({
          count: 2,
          name: 'Robin'
        });
      });

      it('should register autorun handlers: non existing key', () => {
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

        data.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

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

        data1.name = 'Robin';
        data2.name = 'Robin';
        expect(handler).toHaveBeenCalledTimes(1);

        data1.count = 2;
        expect(handler).toHaveBeenCalledTimes(2);

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

        data[2].name = 'Jake';
        expect(handler).toHaveBeenCalledTimes(2);

        data[2].foo = null;
        expect(handler).toHaveBeenCalledTimes(2);

        data.push({ id: 4, name: 'Thor' });
        expect(handler).toHaveBeenCalledTimes(3);

        data[3].name = 'Loki';
        expect(handler).toHaveBeenCalledTimes(4);

        expect(data).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' },
          { id: 3, name: 'Jake', foo: null },
          { id: 4, name: 'Loki' }
        ]);
      });

      it('should register autorun handlers: observe nested Array', () => {
        const initial = [[1, 2, 3], [4, 5, 6]];
        const data = m.observable(initial);

        const handler = jest.fn(() => {
          return data.map(nums => nums.join(''));
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

        janeProxy.name = 'Jane';
        expect(handler).toHaveBeenCalledTimes(3);

        expect(data).toEqual([
          { id: 1, name: 'John' },
          { id: 2, name: 'Robin' }
        ]);
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
        return [data.count, data.name];
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
        data.splice(1, 1);
        data.shift();
      });
      expect(handler).toHaveBeenCalledTimes(2);
      expect(data).toEqual([3, 4, 5]);
    });
  });

  describe('reaction', () => {
    it('should register reaction handlers', () => {
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

      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister reaction handlers when the reaction is disposed', () => {
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

      const disposer = m.reaction(dataFunc, handler);

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      disposer();

      data.count = 3;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister reaction handlers when no longer needed', () => {
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

      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      data.count = 3;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);

      data.name = 'Jane';
      expect(dataFunc).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
