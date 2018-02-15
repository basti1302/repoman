'use strict';

var bag     = require('bagofrequest');
var github  = require('github');
var GitHub  = require('../../lib/generator/github');
var GithubAuth  = require('../../lib/auth/github');
var BluePromise  = require('bluebird');
var dotfile = require('dotfile');

var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

describe('github', function() {

  describe('github', function() {

    var githubMock;
    var bagMock;
    var githubAuthMock;

    beforeEach(function () {
      githubMock = sinon.mock(github.prototype);
      bagMock = sinon.mock(bag);
      githubAuthMock = sinon.mock(GithubAuth.prototype);
    });

    afterEach(function () {
      githubMock.verify();
      githubMock.restore();
      bagMock.verify();
      bagMock.restore();
      githubAuthMock.verify();
      githubAuthMock.restore();
    });

    it('should authenticate when username and password are specified', function () {
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      githubMock.expects('authenticate').once().withExactArgs({ type: 'basic', username: 'someuser', password: 'somepass' });
      new GitHub(function(){}, 'someuser', 'somepass');
    });

    it('should authenticate when username and password are not specified but auth token exists', function (done) {
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      bagMock.expects('proxy').withExactArgs().returns('http://someproxy:1234');
      githubMock.expects('authenticate').once().withExactArgs({ type: 'oauth', token : 'tooken' });
      var tokenPromise = BluePromise.resolve('tooken');
      githubAuthMock.expects('readAuthToken').once().returns(tokenPromise);
      new GitHub(function(){});
      tokenPromise.then(function() {
        done();
      });
    });

    it('should not authenticate when username and password are not specified', function () {
      bagMock.expects('proxy').withExactArgs().returns(null);
      bagMock.expects('proxy').withExactArgs().returns(null);
      githubMock.expects('authenticate').never();
      new GitHub(function(){});
    });
  });

  describe('generate', function() {

    beforeEach(function () {
    });

    it('should create repoman config with users and orgs\' repos', function (done) {
      var gitHub = new GitHub(function(){
        gitHub.gh.repos.getFromUser = function (opts, cb) {
          assert.equal(opts.user, 'user1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(null, 'someuserresult');
        };
        gitHub.gh.repos.getFromOrg = function (opts, cb) {
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
        gitHub.gh.repos.getFromUser = function (opts, cb) {
          assert.equal(opts.user, 'user1');
          assert.equal(opts.page, 1);
          assert.equal(opts.per_page, 100);
          cb(new Error('some error'));
        };
        gitHub.gh.repos.getFromOrg = function (opts, cb) {
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

    var githubMock;

    beforeEach(function () {
      sinon.spy(console, 'log');
      githubMock = sinon.mock(github.prototype);
    });

    afterEach(function () {
      console.log.restore();
      githubMock.restore();
    });

    it('should log remaining usage and pass result', function (done) {
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
     githubMock.expects('hasNextPage').once().withExactArgs(result).returns(true);
      githubMock.expects('hasNextPage').once().withExactArgs(nextResult).returns(false);
      githubMock.expects('getNextPage').once().withArgs(result).callsArgWith(1, null, nextResult);
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
