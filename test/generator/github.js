'use strict';

const BluePromise = require('bluebird');
const sinon = require('sinon');

const GithubAuth = require('../../lib/auth/github');

let lastGithubConstructorOpts;

const mockGithub = {
  authenticate: sinon.spy(),
  repos: {},
  hasNextPage: sinon.stub(),
  getNextPage: sinon.stub()
};

jest.mock(
  '@octokit/rest',
  () =>
    function GithubConstructor(opts) {
      lastGithubConstructorOpts = opts;
      return mockGithub;
    }
);

const GitHub = require('../../lib/generator/github');

describe('github', () => {
  beforeEach(() => {
    lastGithubConstructorOpts = null;
  });

  afterEach(() => {
    mockGithub.authenticate.resetHistory();
  });

  describe('github', () => {
    let githubAuthMock;

    beforeEach(() => {
      githubAuthMock = sinon.mock(GithubAuth.prototype);
    });

    afterEach(() => {
      githubAuthMock.verify();
      githubAuthMock.restore();
    });

    it('should authenticate when username and password are specified', () => {
      new GitHub(() => {}, 'someuser', 'somepass');
      sinon.assert.calledWith(mockGithub.authenticate, {
        type: 'basic',
        username: 'someuser',
        password: 'somepass'
      });
    });

    it('should authenticate when username and password are not specified but auth token exists', done => {
      const tokenPromise = BluePromise.resolve('tooken');
      githubAuthMock.expects('readAuthToken').once().returns(tokenPromise);
      new GitHub(() => {});
      tokenPromise.then(() => {
        sinon.assert.calledWith(mockGithub.authenticate, {
          type: 'oauth',
          token: 'tooken'
        });
        done();
      });
    });

    it('should not authenticate when username and password are not specified', () => {
      new GitHub(() => {});
      sinon.assert.notCalled(mockGithub.authenticate);
    });
  });

  describe('with proxy settings', () => {
    let originalProxySetting;

    beforeEach(() => {
      originalProxySetting = process.env.HTTPS_PROXY;
    });

    afterEach(() => {
      process.env.HTTPS_PROXY = originalProxySetting;
    });

    it('should use proxy from env vars ', () => {
      process.env.HTTPS_PROXY = 'https://proxy.example.com:4711';
      new GitHub(() => {}, 'someuser', 'somepass');
      expect(lastGithubConstructorOpts.proxy).toEqual({
        host: 'proxy.example.com',
        port: '4711'
      });
    });
  });

  describe('generate', () => {
    beforeEach(() => {});

    it("should create repoman config with users and orgs' repos", done => {
      const gitHub = new GitHub(() => {
        gitHub.gh.repos.getForUser = ({ username, page, per_page }, cb) => {
          expect(username).toEqual('user1');
          expect(page).toEqual(1);
          expect(per_page).toEqual(100);
          cb(null, 'someuserresult');
        };
        gitHub.gh.repos.getForOrg = ({ org, page, per_page }, cb) => {
          expect(org).toEqual('org1');
          expect(page).toEqual(1);
          expect(per_page).toEqual(100);
          cb(null, 'someorgresult');
        };
        gitHub._paginate = (result, cb) => {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], (err, result) => {
          expect(err).toEqual(null);
          expect(result).toEqual({
            someapp: { url: 'https://somecloneurl' }
          });
          done();
        });
      });
    });

    it('should pass error to callback when an error occurs while retrieving repos', done => {
      const gitHub = new GitHub(() => {
        gitHub.gh.repos.getForUser = ({ username, page, per_page }, cb) => {
          expect(username).toEqual('user1');
          expect(page).toEqual(1);
          expect(per_page).toEqual(100);
          cb(new Error('some error'));
        };
        gitHub.gh.repos.getForOrg = ({ org, page, per_page }, cb) => {
          expect(org).toEqual('org1');
          expect(page).toEqual(1);
          expect(per_page).toEqual(100);
          cb(new Error('some error'));
        };
        gitHub._paginate = (result, cb) => {
          cb(null, [{ name: 'someapp', clone_url: 'https://somecloneurl' }]);
        };
        gitHub.generate(['user1'], ['org1'], ({ message }) => {
          expect(message).toEqual('some error');
          done();
        });
      });
    });
  });

  describe('_paginate', () => {
    beforeEach(() => {
      sinon.spy(console, 'log');
    });

    afterEach(() => {
      console.log.restore();
    });

    it('should log remaining usage and pass result', done => {
      const result = {
        data: ['first'],
        meta: {
          'x-ratelimit-remaining': 23,
          'x-ratelimit-limit': 100
        }
      };
      const nextResult = {
        data: ['second'],
        meta: {
          'x-ratelimit-remaining': 22,
          'x-ratelimit-limit': 100
        }
      };

      mockGithub.hasNextPage.withArgs(result).returns(true);
      mockGithub.hasNextPage.withArgs(nextResult).returns(false);
      mockGithub.getNextPage.withArgs(result).callsArgWith(1, null, nextResult);
      const gitHub = new GitHub(() => {
        gitHub._paginate(result, (err, resultInner) => {
          expect(err).toEqual(null);
          expect(resultInner).toEqual(['first', 'second']);

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
