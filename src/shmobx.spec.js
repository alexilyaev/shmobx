const m = require('./shmobx');
// const m = require('mobx');

describe('Index', () => {
  describe('basic', () => {
    it('should proxy target mutations', () => {
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
    });
  });

  describe('autorun', () => {
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
