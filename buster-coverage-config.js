module.exports.unit = {
  environment: 'node',
  rootPath: process.cwd(),
  sources: [
    'lib/**/*.js'
  ],
  tests: [
    'test/**/*.js'
  ],
  extensions: [
    require('buster-istanbul')
  ],
  'buster-istanbul': {
    outputDirectory: '.build/coverage/buster-istanbul/',
    formats: ['text', 'lcov']
  }
};
