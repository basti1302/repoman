var bag     = require('bagofrequest');
var buster  = require('buster-node');
var github  = require('github');
var GitHub  = require('../../lib/generator/github');
var GithubAuth  = require('../../lib/auth/github');
var BluePromise  = require('bluebird');
var referee = require('referee');
var dotfile = require('dotfile');
var assert  = referee.assert;

buster.testCase('github - github', {
  setUp: function () {
    this.mockGithub = this.mock(github.prototype);
    this.mockBag = this.mock(bag);
    this.mockGithubAuth = this.mock(GithubAuth.prototype);
  },
  'should authenticate when username and password are specified': function () {
    this.mockBag.expects('proxy').withExactArgs().returns('http://someproxy:1234');
    this.mockGithub.expects('authenticate').once().withExactArgs({ type: 'basic', username: 'someuser', password: 'somepass' });    
    new GitHub(function(){}, 'someuser', 'somepass');
  },
  'should authenticate when username and password are not specified but auth token exists': function (done) {
    this.mockBag.expects('proxy').withExactArgs().returns('http://someproxy:1234');
    this.mockBag.expects('proxy').withExactArgs().returns('http://someproxy:1234');
    this.mockGithub.expects('authenticate').once().withExactArgs({ type: 'oauth', token : 'tooken' });    
    var tokenPromise = BluePromise.resolve('tooken');
    this.mockGithubAuth.expects('readAuthToken').once().returns(tokenPromise);
    new GitHub(function(){});
    tokenPromise.then(done);
  },
  'should not authenticate when username and password are not specified': function () {
    this.mockBag.expects('proxy').withExactArgs().returns(null);
    this.mockBag.expects('proxy').withExactArgs().returns(null);
    this.mockGithub.expects('authenticate').never();
    new GitHub(function(){});
  }
});

buster.testCase('github - generate', {
  setUp: function () {
    this.mock({});
  },
  'should create repoman config with users and orgs\' repos': function (done) {
    var gitHub = new GitHub(function(){
      gitHub.gh.repos.getFromUser = function (opts, cb) {
        assert.equals(opts.user, 'user1');
        assert.equals(opts.page, 1);
        assert.equals(opts.per_page, 100);
        cb(null, 'someuserresult');
      };
      gitHub.gh.repos.getFromOrg = function (opts, cb) {
        assert.equals(opts.org, 'org1');
        assert.equals(opts.page, 1);
        assert.equals(opts.per_page, 100);
        cb(null, 'someorgresult');
      };
      gitHub._paginate = function (result, cb) {
        cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
      };
      gitHub.generate(['user1'], ['org1'], function (err, result) {
        assert.equals(err, null);
        assert.equals(result, { someapp: { url: "https://somecloneurl" } });
        done();
      });
    });
   
  },
  'should pass error to callback when an error occurs while retrieving repos': function (done) {
    var gitHub = new GitHub(function(){
      gitHub.gh.repos.getFromUser = function (opts, cb) {
        assert.equals(opts.user, 'user1');
        assert.equals(opts.page, 1);
        assert.equals(opts.per_page, 100);
        cb(new Error('some error'));
      };
      gitHub.gh.repos.getFromOrg = function (opts, cb) {
        assert.equals(opts.org, 'org1');
        assert.equals(opts.page, 1);
        assert.equals(opts.per_page, 100);
        cb(new Error('some error'));
      };
      gitHub._paginate = function (result, cb) {
        cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
      };
      gitHub.generate(['user1'], ['org1'], function (err, result) {
        assert.equals(err.message, 'some error');
        done();
      });
    });
  }
});
 
buster.testCase('github - _paginate', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockGithub = this.mock(github.prototype);
  },
  'should log remaining usage and pass result': function (done) {
    var result = ['first'];
    result.meta = {
      'x-ratelimit-remaining': 23,
      'x-ratelimit-limit': 100
    };
    var nextResult = ['second'];
    nextResult.meta = {
      'x-ratelimit-remaining': 22,
      'x-ratelimit-limit': 100
    };
    this.mockConsole.expects('log').once().withExactArgs('Remaining GitHub API usage: %s/%s', 23, 100);
    this.mockConsole.expects('log').once().withExactArgs('Remaining GitHub API usage: %s/%s', 22, 100);
    this.mockGithub.expects('hasNextPage').once().withExactArgs(result).returns(true);
    this.mockGithub.expects('hasNextPage').once().withExactArgs(nextResult).returns(false);
    this.mockGithub.expects('getNextPage').once().withArgs(result).callsArgWith(1, null, nextResult);
    var gitHub = new GitHub(function(){
      gitHub._paginate(result, function (err, result) {
        assert.equals(err, null);
        assert.equals(result, ['first', 'second']);
        done();
      });
    });
    
  }
});
