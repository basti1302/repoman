var bitbucket = require('bitbucket-api');
var Bitbucket = require('../../lib/generator/bitbucket');

var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

describe('bitbucket', function() {

  describe('bitbucket - bitbucket', function() {

    beforeEach(function () {
      bitbucketMock = sinon.mock(bitbucket);
    });

    afterEach(function () {
      bitbucketMock.verify();
      bitbucketMock.restore();
    });

    it('should authenticate when username and password are specified', function () {
      bitbucketMock.expects('createClient').once().withExactArgs({ username: 'someuser', password: 'somepassword' });
      new Bitbucket('someuser', 'somepassword');
    });
  });

  describe('bitbucket - generate', function() {

    beforeEach(function () {
      sinon.spy(console, 'log');
      sinon.spy(console, 'error');
    });

    afterEach(function () {
      console.log.restore();
      console.error.restore();
    });

    it('should create repoman config with repos', function (done) {
      var bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = function (cb) {
        var result = [
          { slug: 'repo1', owner: 'someuser', scm: 'git' },
          { slug: 'repo2', owner: 'otheruser', scm: 'git' }
        ];
        cb(null, result);
      };
      bitbucket.generate(function (err, result) {
        assert.equal(err, null);
        assert.equal(result.repo1.url, 'ssh://git@bitbucket.org/someuser/repo1.git');
        assert.equal(result.repo2.url, 'ssh://git@bitbucket.org/otheruser/repo2.git');
        done();
      });
    });

    it('should log an error message when repo scm is unsupported', function (done) {
      var bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = function (cb) {
        var result = [
          { slug: 'repo1', owner: 'someuser', scm: 'someunsupportedscm' },
          { slug: 'repo2', owner: 'otheruser', scm: 'git' }
        ];
        cb(null, result);
      };
      bitbucket.generate(function (err, result) {
        assert.equal(err, null);
        assert.equal(result.repo2.url, 'ssh://git@bitbucket.org/otheruser/repo2.git');
        sinon.assert.calledWith(console.error, 'TODO: %s scm is not yet supported', 'someunsupportedscm');
        done();
      });
    });

    it('should pass error to callback when an error occurs while retrieving repos', function (done) {
      var bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = function (cb) {
        cb(new Error('some error'));
      };
      bitbucket.generate(function (err, result) {
        assert.equal(err.message, 'some error');
        done();
      });
    });
  });

});
