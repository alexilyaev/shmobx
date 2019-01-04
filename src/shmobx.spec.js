// const shmobx = require('./shmobx');
const shmobx = require('mobx');

describe('Index', () => {
  describe('basic', () => {
    it('should add getters/setters for object properties', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = shmobx.observable(initial);

      expect(data.count).toBe(initial.count);
      expect(data.name).toBe(initial.name);

      data.count = 2;
      data.name = 'Robin';

      expect(data.count).toBe(2);
      expect(data.name).toBe('Robin');
    });
  });

  describe('autorun', () => {
    it('should register autorun handlers', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = shmobx.observable(initial);

      const handler = jest.fn(() => {
        return data.count;
      });

      shmobx.autorun(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      data.name = 'Robin';
      expect(handler).toHaveBeenCalledTimes(1);

      data.count = 2;
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should register handlers for a non existing property', () => {
      const data = shmobx.observable({});

      const handler = jest.fn(() => {
        return data.count;
      });

      shmobx.autorun(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      data.name = 'Robin';
      expect(handler).toHaveBeenCalledTimes(1);

      data.count = 2;
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('reaction', () => {
    it('should register reaction handlers', () => {
      const initial = {
        count: 1,
        name: 'John'
      };
      const data = shmobx.observable(initial);

      const dataFunc = jest.fn(() => {
        return data.count;
      });
      const handler = jest.fn(count => {
        expect(count).toBe(2);
      });

      shmobx.reaction(dataFunc, handler);

      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.name = 'Robin';
      expect(dataFunc).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();

      data.count = 2;
      expect(dataFunc).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
