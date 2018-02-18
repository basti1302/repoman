'use strict';

var gitorioujs = require('gitoriou.js');
var Gitorious = require('../../lib/generator/gitorious');

var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

describe('gitorious', function() {

  describe('generate', function() {

    var clientMock;
    var gitorioujsMock;

    beforeEach(function () {
      clientMock = { getProject: function (project, cb) {} };
      gitorioujsMock = sinon.mock(gitorioujs);
    });

    afterEach(function () {
      gitorioujsMock.verify();
      gitorioujsMock.restore();
    });

    it('should pass error when an error occurs while retrieving project', function (done) {
      gitorioujsMock.expects('Gitorious').once().withExactArgs({ url: 'http://someurl' }).returns(clientMock);
      sinon.stub(clientMock, 'getProject').callsFake(function (project, cb) {
        assert.equal(project, 'someproject');
        cb(new Error('some error'));
      });
      var gitorious = new Gitorious('http://someurl');
      gitorious.generate(['someproject'], function (err, config) {
        assert.equal(err.message, 'some error');
        assert.isEmpty(config);
        done();
      });
    });

    it('should pass repo URL when there is no error', function (done) {
      gitorioujsMock.expects('Gitorious').once().withExactArgs({ url: 'http://someurl' }).returns(clientMock);
      sinon.stub(clientMock, 'getProject').callsFake(function (project, cb) {
        assert.equal(project, 'someproject');
        var repos = [
          { name: 'somerepo1', clone_url: 'somecloneurl1' },
          { name: 'somerepo2', clone_url: 'somecloneurl2' }
        ];
        cb(null, { project: { repositories: { mainlines: { repository: repos } } } });
      });
      var gitorious = new Gitorious('http://someurl');
      gitorious.generate(['someproject'], function (err, config) {
        assert.equal(err, null);
        assert.deepEqual(config.somerepo1, { url: 'somecloneurl1' });
        assert.deepEqual(config.somerepo2, { url: 'somecloneurl2' });
        done();
      });
    });
  });

});
