'use strict';

var bag = require('bagofrequest');
var GithubAuth = require('../../lib/auth/github');
var BluePromise = require('bluebird');

var sinon = require('sinon');

var mockGithub = {
  authenticate: sinon.spy(),
  repos: {},
  hasNextPage: sinon.stub(),
  getNextPage: sinon.stub()
};

jest.mock(
  '@octokit/rest',
  () =>
    function() {
      return mockGithub;
    }
);

var GitHub = require('../../lib/generator/github');

describe('github', function() {
  afterEach(function() {
    mockGithub.authenticate.resetHistory();
  });

  describe('github', function() {
    var bagMock;
    var githubAuthMock;

    beforeEach(function() {
      bagMock = sinon.mock(bag);
      githubAuthMock = sinon.mock(GithubAuth.prototype);
    });

    afterEach(function() {
      bagMock.verify();
      bagMock.restore();
      githubAuthMock.verify();
      githubAuthMock.restore();
    });

    it('should authenticate when username and password are specified', function() {
      bagMock
        .expects('proxy')
        .withExactArgs()
        .returns('http://someproxy:1234');
      new GitHub(function() {}, 'someuser', 'somepass');
      sinon.assert.calledWith(mockGithub.authenticate, {
        type: 'basic',
        username: 'someuser',
        password: 'somepass'
      });
    });

    it('should authenticate when username and password are not specified but auth token exists', function(done) {
      bagMock
        .expects('proxy')
        .withExactArgs()
        .returns('http://someproxy:1234');
      bagMock
        .expects('proxy')
        .withExactArgs()
        .returns('http://someproxy:1234');
      var tokenPromise = BluePromise.resolve('tooken');
      githubAuthMock
        .expects('readAuthToken')
        .once()
        .returns(tokenPromise);
      new GitHub(function() {});
      tokenPromise.then(function() {
        sinon.assert.calledWith(mockGithub.authenticate, {
          type: 'oauth',
          token: 'tooken'
        });
        done();
      });
    });

    it('should not authenticate when username and password are not specified', function() {
      bagMock
        .expects('proxy')
        .withExactArgs()
        .returns(null);
      bagMock
        .expects('proxy')
        .withExactArgs()
        .returns(null);
      new GitHub(function() {});
      sinon.assert.notCalled(mockGithub.authenticate);
    });
  });

  describe('generate', function() {
    beforeEach(function() {});

    it("should create repoman config with users and orgs' repos", function(done) {
      var gitHub = new GitHub(function() {
        gitHub.gh.repos.getForUser = function(opts, cb) {
          expect(opts.username).toEqual('user1');
          expect(opts.page).toEqual(1);
          expect(opts.per_page).toEqual(100);
          cb(null, 'someuserresult');
        };
        gitHub.gh.repos.getForOrg = function(opts, cb) {
          expect(opts.org).toEqual('org1');
          expect(opts.page).toEqual(1);
          expect(opts.per_page).toEqual(100);
          cb(null, 'someorgresult');
        };
        gitHub._paginate = function(result, cb) {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], function(err, result) {
          expect(err).toEqual(null);
          expect(result).toEqual({
            someapp: { url: 'https://somecloneurl' }
          });
          done();
        });
      });
    });

    it('should pass error to callback when an error occurs while retrieving repos', function(done) {
      var gitHub = new GitHub(function() {
        gitHub.gh.repos.getForUser = function(opts, cb) {
          expect(opts.username).toEqual('user1');
          expect(opts.page).toEqual(1);
          expect(opts.per_page).toEqual(100);
          cb(new Error('some error'));
        };
        gitHub.gh.repos.getForOrg = function(opts, cb) {
          expect(opts.org).toEqual('org1');
          expect(opts.page).toEqual(1);
          expect(opts.per_page).toEqual(100);
          cb(new Error('some error'));
        };
        gitHub._paginate = function(result, cb) {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], function(err) {
          expect(err.message).toEqual('some error');
          done();
        });
      });
    });
  });

  describe('_paginate', function() {
    beforeEach(function() {
      sinon.spy(console, 'log');
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should log remaining usage and pass result', function(done) {
      var result = {
        data: ['first'],
        meta: {
          'x-ratelimit-remaining': 23,
          'x-ratelimit-limit': 100
        }
      };
      var nextResult = {
        data: ['second'],
        meta: {
          'x-ratelimit-remaining': 22,
          'x-ratelimit-limit': 100
        }
      };

      mockGithub.hasNextPage.withArgs(result).returns(true);
      mockGithub.hasNextPage.withArgs(nextResult).returns(false);
      mockGithub.getNextPage.withArgs(result).callsArgWith(1, null, nextResult);
      var gitHub = new GitHub(function() {
        gitHub._paginate(result, function(err, result) {
          expect(err).toEqual(null);
          expect(result).toEqual(['first', 'second']);

          sinon.assert.calledWith(
            console.log,
            'Remaining GitHub API usage: %s/%s',
            23,
            100
          );
          sinon.assert.calledWith(
            console.log,
            'Remaining GitHub API usage: %s/%s',
            22,
            100
          );

          done();
        });
      });
    });
  });
});
