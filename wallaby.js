module.exports = function () {
  return {
    files: [
      'lib/**/*.js',
      'wrestler.js',
      'test/setup.js',
    ],

    tests: [
      'test/**/*.test.js'
    ],

    testFramework: 'mocha',

    env: {
      type: 'node'
    }

  };
};
