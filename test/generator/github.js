'use strict';

var proxyquire = require('proxyquire');

var bag = require('bagofrequest');
var GithubAuth = require('../../lib/auth/github');
var BluePromise = require('bluebird');
var dotfile = require('dotfile');

var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

var githubStub = {
  authenticate: sinon.spy(),
  repos: {},
  hasNextPage: sinon.stub(),
  getNextPage: sinon.stub()
};
var GitHub =
  proxyquire('../../lib/generator/github', {
    '@octokit/rest': function() {
      return githubStub;
    }
  });

describe('github', function() {

  afterEach(function () {
    githubStub.authenticate.resetHistory();
  });

  describe('github', function() {

    var bagMock;
    var githubAuthMock;

    beforeEach(function () {
      bagMock = sinon.mock(bag);
      githubAuthMock = sinon.mock(GithubAuth.prototype);
    });

    afterEach(function () {
      bagMock.verify();
      bagMock.restore();
      githubAuthMock.verify();
      githubAuthMock.restore();
    });

    it('should authenticate when username and password are specified', function () {
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      new GitHub(function(){}, 'someuser', 'somepass');
      sinon.assert.calledWith(githubStub.authenticate, ({ type: 'basic', username: 'someuser', password: 'somepass' }));
    });

    it('should authenticate when username and password are not specified but auth token exists', function (done) {
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      var tokenPromise = BluePromise.resolve('tooken');
      githubAuthMock.expects('readAuthToken').once().returns(tokenPromise);
      new GitHub(function(){});
      tokenPromise.then(function() {
        sinon.assert.calledWith(githubStub.authenticate, ({ type: 'oauth', token : 'tooken' }));
        done();
      });
    });

    it('should not authenticate when username and password are not specified', function () {
      bagMock.expects('proxy').withExactArgs().returns(null);
      bagMock.expects('proxy').withExactArgs().returns(null);
      new GitHub(function(){});
      sinon.assert.notCalled(githubStub.authenticate);
    });
  });

  describe('generate', function() {

    beforeEach(function () {
    });

    it('should create repoman config with users and orgs\' repos', function (done) {
      var gitHub = new GitHub(function(){
        gitHub.gh.repos.getForUser = function (opts, cb) {
          assert.equal(opts.username, 'user1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(null, 'someuserresult');
        };
        gitHub.gh.repos.getForOrg = function (opts, cb) {
          assert.equal(opts.org, 'org1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(null, 'someorgresult');
        };
        gitHub._paginate = function (result, cb) {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], function (err, result) {
          assert.equal(err, null);
          assert.deepEqual(result, { someapp: { url: "https://somecloneurl" } });
          done();
        });
      });
    });

    it('should pass error to callback when an error occurs while retrieving repos', function (done) {
      var gitHub = new GitHub(function(){
        gitHub.gh.repos.getForUser = function (opts, cb) {
          assert.equal(opts.username, 'user1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(new Error('some error'));
        };
        gitHub.gh.repos.getForOrg = function (opts, cb) {
          assert.equal(opts.org, 'org1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(new Error('some error'));
        };
        gitHub._paginate = function (result, cb) {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], function (err, result) {
          assert.equal(err.message, 'some error');
          done();
        });
      });
    });
  });

  describe('_paginate', function() {

    beforeEach(function () {
      sinon.spy(console, 'log');
    });

    afterEach(function () {
      console.log.restore();
    });

    it('should log remaining usage and pass result', function (done) {
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

      githubStub.hasNextPage.withArgs(result).returns(true);
      githubStub.hasNextPage.withArgs(nextResult).returns(false);
      githubStub.getNextPage.withArgs(result).callsArgWith(1, null, nextResult);
      var gitHub = new GitHub(function(){
        gitHub._paginate(result, function (err, result) {
          assert.equal(err, null);
          assert.sameMembers(result, ['first', 'second']);

          sinon.assert.calledWith(console.log, 'Remaining GitHub API usage: %s/%s', 23, 100);
          sinon.assert.calledWith(console.log, 'Remaining GitHub API usage: %s/%s', 22, 100);

          done();
        });
      });
    });
  });

});
