var buster    = require('buster-node');
var bitbucket = require('bitbucket-api');
var Bitbucket = require('../../lib/generator/bitbucket');
var referee   = require('referee');
var assert    = referee.assert;

buster.testCase('bitbucket - bitbucket', {
  setUp: function () {
    this.mockBitbucket = this.mock(bitbucket);
  },
  'should authenticate when username and password are specified': function () {
    this.mockBitbucket.expects('createClient').once().withExactArgs({ username: 'someuser', password: 'somepassword' });
    new Bitbucket('someuser', 'somepassword');
  }
});

buster.testCase('bitbucket - generate', {
  setUp: function () {
    this.mockConsole = this.mock(console);
  },
  'should create repoman config with repos': function (done) {
    var bitbucket = new Bitbucket('someuser', 'somepassword');
    bitbucket.client.repositories = function (cb) {
      var result = [
        { name: 'repo1', scm: 'git' },
        { name: 'repo2', scm: 'git' }
      ];
      cb(null, result);
    };
    bitbucket.generate(function (err, result) {
      assert.equals(err, null);
      assert.equals(result.repo1.url, 'ssh://git@bitbucket.org/someuser/repo1.git');
      assert.equals(result.repo2.url, 'ssh://git@bitbucket.org/someuser/repo2.git');
      done();
    });
  },
  'should log an error message when repo scm is unsupported': function (done) {
    this.mockConsole.expects('error').once().withExactArgs('TODO: %s scm is not yet supported', 'someunsupportedscm');
    var bitbucket = new Bitbucket('someuser', 'somepassword');
    bitbucket.client.repositories = function (cb) {
      var result = [
        { name: 'repo1', scm: 'someunsupportedscm' },
        { name: 'repo2', scm: 'git' }
      ];
      cb(null, result);
    };
    bitbucket.generate(function (err, result) {
      assert.equals(err, null);
      assert.equals(result.repo2.url, 'ssh://git@bitbucket.org/someuser/repo2.git');
      done();
    });
  },
  'should pass error to callback when an error occurs while retrieving repos': function (done) {
    var bitbucket = new Bitbucket('someuser', 'somepassword');
    bitbucket.client.repositories = function (cb) {
      cb(new Error('some error'));
    };
    bitbucket.generate(function (err, result) {
      assert.equals(err.message, 'some error');
      done();
    });
  }
});
