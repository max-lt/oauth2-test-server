const store = require('./store');

module.exports = {

  // As includes all Bs ? Bs : false
  allIn: (a, b) => b.split(' ').every((s) => a.includes(s)) ? b : false,

  dropDuplicates: (e) => e.split(' ').filter((e, i, a) => a.indexOf(e) === i).join(' '),

  updateUser: async (id, fn) => {
    const user = await store.user.get(id);

    if (!user)
      throw new Error('Could not find referenced user');

    return store.user.set(id, fn(user));
  }


};
