const shmobx = require('./shmobx');

describe('Index', () => {
  beforeEach(() => {
    shmobx.reset();
  });

  it('should add getters/setters for object properties', () => {
    const data = {
      count: 1,
      name: 'John'
    };

    const obs = shmobx.observable(data);

    expect(obs.count).toBe(data.count);
    expect(obs.name).toBe(data.name);

    obs.count = 2;
    obs.name = 'Robin';

    expect(obs.count).toBe(2);
    expect(obs.name).toBe('Robin');
  });

  it('should register reaction handlers using autorun and call them on changes', () => {
    const data = {
      count: 1,
      name: 'John'
    };

    const obs = shmobx.observable(data);

    const handler = jest.fn(() => {
      return data.count;
    });

    shmobx.autorun(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(obs._handlers.count).toHaveLength(1);
    expect(obs._handlers.count[0]).toBe(handler);

    obs.name = 'Robin';
    expect(handler).toHaveBeenCalledTimes(1);

    obs.count = 2;
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
