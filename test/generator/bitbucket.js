'use strict';

const bitbucket = require('bitbucket-api');
const Bitbucket = require('../../lib/generator/bitbucket');

const sinon = require('sinon');

describe('bitbucket', () => {
  describe('bitbucket - bitbucket', () => {
    let bitbucketMock;

    beforeEach(() => {
      bitbucketMock = sinon.mock(bitbucket);
    });

    afterEach(() => {
      bitbucketMock.verify();
      bitbucketMock.restore();
    });

    it('should authenticate when username and password are specified', () => {
      bitbucketMock
        .expects('createClient')
        .once()
        .withExactArgs({ username: 'someuser', password: 'somepassword' });
      new Bitbucket('someuser', 'somepassword');
    });
  });

  describe('bitbucket - generate', () => {
    beforeEach(() => {
      sinon.spy(console, 'log');
      sinon.spy(console, 'error');
    });

    afterEach(() => {
      console.log.restore();
      console.error.restore();
    });

    it('should create repoman config with repos', done => {
      const bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = cb => {
        const result = [
          { slug: 'repo1', owner: 'someuser', scm: 'git' },
          { slug: 'repo2', owner: 'otheruser', scm: 'git' }
        ];
        cb(null, result);
      };
      bitbucket.generate((err, { repo1, repo2 }) => {
        expect(err).toEqual(null);
        expect(repo1.url).toEqual('ssh://git@bitbucket.org/someuser/repo1.git');
        expect(repo2.url).toEqual(
          'ssh://git@bitbucket.org/otheruser/repo2.git'
        );
        done();
      });
    });

    it('should log an error message when repo scm is unsupported', done => {
      const bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = cb => {
        const result = [
          { slug: 'repo1', owner: 'someuser', scm: 'someunsupportedscm' },
          { slug: 'repo2', owner: 'otheruser', scm: 'git' }
        ];
        cb(null, result);
      };
      bitbucket.generate((err, { repo2 }) => {
        expect(err).toEqual(null);
        expect(repo2.url).toEqual(
          'ssh://git@bitbucket.org/otheruser/repo2.git'
        );
        sinon.assert.calledWith(
          console.error,
          'TODO: %s scm is not yet supported',
          'someunsupportedscm'
        );
        done();
      });
    });

    it('should pass error to callback when an error occurs while retrieving repos', done => {
      const bitbucket = new Bitbucket('someuser', 'somepassword');
      bitbucket.client.repositories = cb => {
        cb(new Error('some error'));
      };
      bitbucket.generate(({ message }) => {
        expect(message).toEqual('some error');
        done();
      });
    });
  });
});
