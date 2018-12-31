const m = require('./shmobx');

describe('Index', () => {
  it('should work', () => {
    const data = {
      count: 1
    };

    const obs = m.observable(data);

    // console.log('obs', obs);

    expect(obs.count).toBe(1);

    obs.count = 2;

    expect(obs.count).toBe(2);
  });
});
