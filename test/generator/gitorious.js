'use strict';

var gitorioujs = require('gitoriou.js');
var Gitorious = require('../../lib/generator/gitorious');

var sinon = require('sinon');

describe('gitorious', function() {
  describe('generate', function() {
    var clientMock;
    var gitorioujsMock;

    beforeEach(function() {
      clientMock = { getProject: function() {} };
      gitorioujsMock = sinon.mock(gitorioujs);
    });

    afterEach(function() {
      gitorioujsMock.verify();
      gitorioujsMock.restore();
    });

    it('should pass error when an error occurs while retrieving project', function(done) {
      gitorioujsMock
        .expects('Gitorious')
        .once()
        .withExactArgs({ url: 'http://someurl' })
        .returns(clientMock);
      sinon.stub(clientMock, 'getProject').callsFake(function(project, cb) {
        expect(project).toEqual('someproject');
        cb(new Error('some error'));
      });
      var gitorious = new Gitorious('http://someurl');
      gitorious.generate(['someproject'], function(err, config) {
        expect(err.message).toEqual('some error');
        expect(config).toEqual({});
        done();
      });
    });

    it('should pass repo URL when there is no error', function(done) {
      gitorioujsMock
        .expects('Gitorious')
        .once()
        .withExactArgs({ url: 'http://someurl' })
        .returns(clientMock);
      sinon.stub(clientMock, 'getProject').callsFake(function(project, cb) {
        expect(project).toEqual('someproject');
        var repos = [
          { name: 'somerepo1', clone_url: 'somecloneurl1' },
          { name: 'somerepo2', clone_url: 'somecloneurl2' }
        ];
        cb(null, {
          project: { repositories: { mainlines: { repository: repos } } }
        });
      });
      var gitorious = new Gitorious('http://someurl');
      gitorious.generate(['someproject'], function(err, config) {
        expect(err).toEqual(null);
        expect(config.somerepo1).toEqual({ url: 'somecloneurl1' });
        expect(config.somerepo2).toEqual({ url: 'somecloneurl2' });
        done();
      });
    });
  });
});
