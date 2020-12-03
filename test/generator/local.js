'use strict';

var ini = require('ini');
var Local = require('../../lib/generator/local');
var svnInfo = require('svn-info');

var mockFs = require('mock-fs');

var sinon = require('sinon');

describe('local', function() {
  describe('generate', function() {
    var iniMock;
    var svnInfoMock;

    beforeEach(function() {
      iniMock = sinon.mock(ini);
      svnInfoMock = sinon.mock(svnInfo);
    });

    afterEach(function() {
      mockFs.restore();
      iniMock.verify();
      iniMock.restore();
      svnInfoMock.verify();
      svnInfoMock.restore();
    });

    it('should construct config of git repos using git config remote origin', function(done) {
      mockFs({
        repo1: {
          '.git': {
            config: 'somedata1'
          }
        },
        repo2: {
          '.git': {
            config: 'somedata2'
          }
        }
      });
      iniMock
        .expects('parse')
        .withExactArgs('somedata1')
        .returns({
          'remote "origin"': { url: 'http://github.com/some/repo1' }
        });
      iniMock
        .expects('parse')
        .withExactArgs('somedata2')
        .returns({
          'remote "origin"': { url: 'http://github.com/some/repo2' }
        });

      var local = new Local('.');

      local.generate(function(err, result) {
        expect(err).toBeNull();
        expect(result.repo1.type).toEqual('git');
        expect(result.repo1.url).toEqual('http://github.com/some/repo1');
        expect(result.repo2.type).toEqual('git');
        expect(result.repo2.url).toEqual('http://github.com/some/repo2');

        done();
      });
    });

    it('should construct config of svn repos using svn info repository root', function(done) {
      mockFs({
        repo1: {
          '.svn': {
            entries: 'foo'
          }
        },
        repo2: {
          '.svn': {
            entries: 'bar'
          }
        }
      });

      svnInfoMock
        .expects('sync')
        .withExactArgs('repo1')
        .returns({ repositoryRoot: 'http://svnhub.com/some/repo1' });
      svnInfoMock
        .expects('sync')
        .withExactArgs('repo2')
        .returns({ repositoryRoot: 'http://svnhub.com/some/repo2' });

      var local = new Local('.');

      local.generate(function(err, result) {
        expect(err).toBeNull();
        expect(result.repo1.type).toEqual('svn');
        expect(result.repo1.url).toEqual('http://svnhub.com/some/repo1');
        expect(result.repo2.type).toEqual('svn');
        expect(result.repo2.url).toEqual('http://svnhub.com/some/repo2');

        done();
      });
    });

    it('should pass empty config when repo is neither git nor svn', function(done) {
      mockFs({
        repo1: {},
        repo2: {}
      });

      var local = new Local('.');

      local.generate(function(err, result) {
        expect(err).toBeNull();
        expect(result).toEqual({});

        done();
      });
    });
  });
});
