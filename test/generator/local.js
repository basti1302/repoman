'use strict';

const ini = require('ini');
const Local = require('../../lib/generator/local');
const svnInfo = require('svn-info');

const mockFs = require('mock-fs');

const sinon = require('sinon');

describe('local', () => {
  describe('generate', () => {
    let iniMock;
    let svnInfoMock;

    beforeEach(() => {
      iniMock = sinon.mock(ini);
      svnInfoMock = sinon.mock(svnInfo);
    });

    afterEach(() => {
      mockFs.restore();
      iniMock.verify();
      iniMock.restore();
      svnInfoMock.verify();
      svnInfoMock.restore();
    });

    it('should construct config of git repos using git config remote origin', done => {
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

      const local = new Local('.');

      local.generate((err, { repo1, repo2 }) => {
        expect(err).toBeNull();
        expect(repo1.type).toEqual('git');
        expect(repo1.url).toEqual('http://github.com/some/repo1');
        expect(repo2.type).toEqual('git');
        expect(repo2.url).toEqual('http://github.com/some/repo2');

        done();
      });
    });

    it('should construct config of svn repos using svn info repository root', done => {
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

      const local = new Local('.');

      local.generate((err, { repo1, repo2 }) => {
        expect(err).toBeNull();
        expect(repo1.type).toEqual('svn');
        expect(repo1.url).toEqual('http://svnhub.com/some/repo1');
        expect(repo2.type).toEqual('svn');
        expect(repo2.url).toEqual('http://svnhub.com/some/repo2');

        done();
      });
    });

    it('should pass empty config when repo is neither git nor svn', done => {
      mockFs({
        repo1: {},
        repo2: {}
      });

      const local = new Local('.');

      local.generate((err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual({});

        done();
      });
    });
  });
});
