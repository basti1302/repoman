'use strict';

const bag = require('bagofcli');
const fs = require('fs');
const fsx = require('fs.extra');
const sinon = require('sinon');

const Bitbucket = require('../lib/generator/bitbucket');
const GitHub = require('../lib/generator/github');
const Local = require('../lib/generator/local');
const Repoman = require('../lib/repoman');

describe('repoman', () => {
  beforeEach(() => {
    sinon.spy(console, 'log');
    sinon.spy(process, 'exit');
  });

  afterEach(() => {
    process.exit.restore();
    console.log.restore();
  });

  describe('config', () => {
    let fsMock;
    let fsxCopyStub;
    let bitbucketMock;
    let gitHubMock;
    let localMock;

    beforeEach(() => {
      bitbucketMock = sinon.mock(Bitbucket.prototype);
      gitHubMock = sinon.mock(GitHub.prototype);
      localMock = sinon.mock(Local.prototype);

      fsMock = sinon.mock(fs);
      fsxCopyStub = sinon.stub(fsx, 'copy');
    });

    afterEach(() => {
      fsxCopyStub.restore();
      fsMock.restore();

      bitbucketMock.verify();
      bitbucketMock.restore();
      gitHubMock.verify();
      gitHubMock.restore();
      localMock.verify();
      localMock.restore();
    });

    it('should copy sample couchpenter.js file to current directory when init is called', done => {
      fsxCopyStub.callsFake((src, dest, cb) => {
        expect(src.match(/\/examples\/.repoman.json$/).length === 1).toBe(true);
        expect(dest).toEqual('.repoman.json');
        cb();
      });
      const repoman = new Repoman();
      repoman.config({}, err => {
        expect(err).toEqual(undefined);
        sinon.assert.calledWith(
          console.log,
          'Creating sample configuration file: %s',
          '.repoman.json'
        );
        done();
      });
    });

    it('should create .repoman.json containing repos on bitbucket when bitbucket config is specified', done => {
      fsMock
        .expects('existsSync')
        .withExactArgs('.repoman.json')
        .returns(false);
      bitbucketMock
        .expects('generate')
        .once()
        .withArgs()
        .callsArgWith(0, null, { foo: 'bar' });
      fsMock
        .expects('writeFile')
        .once()
        .withArgs('.repoman.json', '{\n  "foo": "bar"\n}')
        .callsArgWith(2, null);
      const repoman = new Repoman();
      repoman.config(
        { bitbucket: { authUser: 'someuser', authPass: 'somepassword' } },
        err => {
          expect(err).toBeNull();
          sinon.assert.calledWith(
            console.log,
            'Setting configuration file: %s, with Bitbucket repositories',
            '.repoman.json'
          );
          done();
        }
      );
    });

    it('should create .repoman.json containing repos on github when github config is specified', done => {
      fsMock
        .expects('existsSync')
        .withExactArgs('.repoman.json')
        .returns(false);
      gitHubMock
        .expects('generate')
        .once()
        .withArgs(['someuser'], ['someorg'])
        .callsArgWith(2, null, { foo: 'bar' });
      fsMock
        .expects('writeFile')
        .once()
        .withArgs('.repoman.json', '{\n  "foo": "bar"\n}')
        .callsArgWith(2, null);
      const repoman = new Repoman();
      repoman.config({ github: { user: 'someuser', org: 'someorg' } }, err => {
        expect(err).toBeNull();
        sinon.assert.calledWith(
          console.log,
          'Setting configuration file: %s, with GitHub repositories',
          '.repoman.json'
        );
        done();
      });
    });

    it('should pass error to callback when an error occurs while creating config containing github repos', done => {
      gitHubMock
        .expects('generate')
        .once()
        .withArgs([], [])
        .callsArgWith(2, new Error('some error'));
      const repoman = new Repoman();
      repoman.config({ github: {} }, ({ message }) => {
        expect(message).toEqual('some error');
        sinon.assert.calledWith(
          console.log,
          'Setting configuration file: %s, with GitHub repositories',
          '.repoman.json'
        );
        done();
      });
    });

    it('should create .repoman.json containing repos on local repositories when local config is specified', done => {
      fsMock
        .expects('existsSync')
        .withExactArgs('.repoman.json')
        .returns(false);
      localMock
        .expects('generate')
        .once()
        .withArgs()
        .callsArgWith(0, null, { foo: 'bar' });
      fsMock
        .expects('writeFile')
        .once()
        .withArgs('.repoman.json', '{\n  "foo": "bar"\n}')
        .callsArgWith(2, null);

      const repoman = new Repoman();
      repoman.config({ local: { dir: 'somedir' } }, err => {
        sinon.assert.calledWith(
          console.log,
          'Setting configuration file: %s, with local repositories',
          '.repoman.json'
        );
        expect(err).toBeNull();
        done();
      });
    });

    // eslint-disable-next-line max-len
    it('should create .repoman.json containing repos on local repositories and remove any repos not existing locally if removeExtraneous is specified', done => {
      fsMock.expects('existsSync').withExactArgs('.repoman.json').returns(true);
      fsMock
        .expects('readFileSync')
        .withExactArgs('.repoman.json', 'utf-8')
        .returns('{"some_repo" : {"url" : "git://blah.com"}}');
      localMock
        .expects('generate')
        .once()
        .withArgs()
        .callsArgWith(0, null, { foo: 'bar' });
      fsMock
        .expects('writeFile')
        .once()
        .withArgs('.repoman.json', '{\n  "foo": "bar"\n}')
        .callsArgWith(2, null);

      const repoman = new Repoman();
      repoman.config(
        { removeExtraneous: true, local: { dir: 'somedir' } },
        err => {
          expect(err).toBeNull();
          sinon.assert.calledWith(
            console.log,
            'Setting configuration file: %s, with local repositories',
            '.repoman.json'
          );
          done();
        }
      );
    });
  });

  describe('exec', () => {
    let repos;
    let scms;
    let bagExecStub;

    beforeEach(() => {
      sinon.stub(process, 'cwd').onFirstCall().returns('/somedir');
      bagExecStub = sinon.stub(bag, 'exec');

      repos = {
        couchdb: {
          type: 'git',
          url: 'http://git-wip-us.apache.org/repos/asf/couchdb.git',
          tags: ['database', 'apache']
        },
        httpd: {
          type: 'svn',
          url: 'http://svn.apache.org/repos/asf/httpd/httpd/trunk/'
        }
      };
      scms = {
        git: {
          init: 'git clone {{{url}}} {{{workspace}}}/{{{name}}}'
        },
        svn: {
          init: 'svn checkout {{{url}}} {{{workspace}}}/{{{name}}}'
        }
      };
    });

    afterEach(() => {
      sinon.assert.calledOnce(process.cwd);
      bag.exec.restore();
      process.cwd.restore();
    });

    it('should return empty results when there is no repository and scm', done => {
      const repoman = new Repoman();
      repoman.exec('init', { failFast: false }, (err, results) => {
        expect(err).toEqual(null);
        expect(results).toEqual([]);
        done();
      });
    });

    it('should log repositories name and execute commands with parameters applied when repositories exist', done => {
      bagExecStub.callsFake((command, fallthrough, cb) => {
        expect(fallthrough).toBe(true);
        cb(null, command);
      });
      const repoman = new Repoman(repos, scms);
      repoman.exec('init', { verbose: true }, (err, results) => {
        expect(results[0]).toEqual(
          'git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb'
        );
        expect(results[1]).toEqual(
          'svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd'
        );

        sinon.assert.calledWith(console.log, '\n+ %s', 'couchdb');
        sinon.assert.calledWith(
          console.log,
          '> %s',
          'git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb'
        );
        sinon.assert.calledWith(console.log, '\n+ %s', 'httpd');
        sinon.assert.calledWith(
          console.log,
          '> %s',
          'svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd'
        );

        done();
      });
    });

    it('should execute command as-is on each repository when command is unsupported', done => {
      bagExecStub.callsFake((command, fallthrough, cb) => {
        expect(fallthrough).toBe(true);
        cb(null, command);
      });
      const repoman = new Repoman(repos, scms);
      repoman.exec(
        'touch .gitignore; echo "Created {{{workspace}}}/{{{name}}}/.gitignore file";',
        { verbose: true },
        (err, results) => {
          expect(results.length).toEqual(2);
          expect(results[0]).toEqual(
            'cd "/somedir/couchdb" && touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );
          expect(results[1]).toEqual(
            'cd "/somedir/httpd" && touch .gitignore; echo "Created /somedir/httpd/.gitignore file";'
          );

          sinon.assert.calledWith(console.log, '\n+ %s', 'couchdb');
          sinon.assert.calledWith(
            console.log,
            '> %s',
            'touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );
          sinon.assert.calledWith(console.log, '\n+ %s', 'httpd');
          sinon.assert.calledWith(
            console.log,
            '> %s',
            'touch .gitignore; echo "Created /somedir/httpd/.gitignore file";'
          );

          done();
        }
      );
    });

    it('should execute command as-is on matching repository when tag is provided', done => {
      bagExecStub.callsFake((command, fallthrough, cb) => {
        expect(fallthrough).toBe(true);
        cb(null, command);
      });
      const repoman = new Repoman(repos, scms);
      repoman.exec(
        'touch .gitignore; echo "Created {{{workspace}}}/{{{name}}}/.gitignore file";',
        { tags: ['database', 'someothertag'], verbose: true },
        (err, results) => {
          expect(results.length).toEqual(1);
          expect(results[0]).toEqual(
            'cd "/somedir/couchdb" && touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );

          sinon.assert.calledWith(console.log, '\n+ %s', 'couchdb');
          sinon.assert.calledWith(
            console.log,
            '> %s',
            'touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );

          done();
        }
      );
    });

    it('should execute command as-is on matching repository when regex is provided', done => {
      bagExecStub.callsFake((command, fallthrough, cb) => {
        expect(fallthrough).toBe(true);
        cb(null, command);
      });
      const repoman = new Repoman(repos, scms);
      repoman.exec(
        'touch .gitignore; echo "Created {{{workspace}}}/{{{name}}}/.gitignore file";',
        { regex: '.*couchdb.*', verbose: true },
        (err, results) => {
          expect(results.length).toEqual(1);
          expect(results[0]).toEqual(
            'cd "/somedir/couchdb" && touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );

          sinon.assert.calledWith(console.log, '\n+ %s', 'couchdb');
          sinon.assert.calledWith(
            console.log,
            '> %s',
            'touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";'
          );

          done();
        }
      );
    });

    it('should not execute any command when neither tags nor regex filters is applicable', done => {
      bagExecStub.callsFake((command, fallthrough, cb) => {
        expect(fallthrough).toBe(true);
        cb(null, command);
      });
      const repoman = new Repoman(repos, scms);
      repoman.exec(
        'touch .gitignore; echo "Created {{{workspace}}}/{{{name}}}/.gitignore file";',
        {
          regex: 'blah',
          tags: ['inexistingtag1', 'inexistingtag2'],
          verbose: true
        },
        (err, results) => {
          expect(results.length).toEqual(0);
          done();
        }
      );
    });
  });

  describe('list', () => {
    let repos;

    beforeEach(() => {
      repos = {
        couchdb: {
          type: 'git',
          url: 'http://git-wip-us.apache.org/repos/asf/couchdb.git',
          tags: ['apache']
        },
        httpd: {
          type: 'svn',
          url: 'http://svn.apache.org/repos/asf/httpd/httpd/trunk/'
        }
      };
    });

    it('should pass repositories keys as list value', done => {
      const repoman = new Repoman(repos);
      repoman.list({}, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(['couchdb', 'httpd']);
        done();
      });
    });

    it('should filter repository by tag', done => {
      const repoman = new Repoman(repos);
      repoman.list({ tags: ['apache'] }, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(['couchdb']);
        done();
      });
    });

    it('should filter repository by regex', done => {
      const repoman = new Repoman(repos);
      repoman.list({ regex: '.*httpd.*' }, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(['httpd']);
        done();
      });
    });
  });

  describe('clean', () => {
    let fsReaddirStub;
    let fsxMock;
    let repoman;

    beforeEach(() => {
      fsReaddirStub = sinon.stub(fs, 'readdir');
      fsxMock = sinon.mock(fsx);
      sinon.stub(process, 'cwd').onFirstCall().returns('/somedir');

      const repos = {
        couchdb: {
          type: 'git',
          url: 'http://git-wip-us.apache.org/repos/asf/couchdb.git'
        },
        httpd: {
          type: 'svn',
          url: 'http://svn.apache.org/repos/asf/httpd/httpd/trunk/'
        }
      };

      repoman = new Repoman(repos);
    });

    afterEach(() => {
      sinon.assert.calledOnce(process.cwd);
      fs.readdir.restore();
      fsxMock.verify();
      fsxMock.restore();
      process.cwd.restore();
    });

    it('should return a list of non-repo dirs to delete during dry run', done => {
      const dirs = ['dir1', 'couchdb', 'httpd', 'dir2'];
      fsReaddirStub.withArgs('/somedir').callsArgWith(1, null, dirs);
      repoman.clean(true, (err, results) => {
        expect(err).toBeNull();
        expect(results).toEqual(['dir1', 'dir2']);
        done();
      });
    });

    it('should remove a list of non-repo dirs during non dry run', done => {
      const dirs = ['dir1', 'couchdb', 'httpd', 'dir2'];
      fsReaddirStub.withArgs('/somedir').callsArgWith(1, null, dirs);
      fsxMock.expects('remove').withArgs('dir1').callsArgWith(1, null, 'dir1');
      fsxMock.expects('remove').withArgs('dir2').callsArgWith(1, null, 'dir2');

      repoman.clean(false, (err, results) => {
        expect(err).toEqual(null);
        expect(results).toEqual(['dir1', 'dir2']);

        sinon.assert.calledWith(console.log, '- %s has been deleted', 'dir1');
        sinon.assert.calledWith(console.log, '- %s has been deleted', 'dir2');

        done();
      });
    });

    it('should pass error to callback when an error occurs while reading the workspace dir', done => {
      fsReaddirStub
        .withArgs('/somedir')
        .callsArgWith(1, new Error('some error'));
      repoman.clean(true, ({ message }) => {
        expect(message).toEqual('some error');
        done();
      });
    });
  });

  describe('_determineRepoType', () => {
    let repoman;

    beforeEach(() => {
      repoman = new Repoman();
    });

    it('should determine repo type based on keywords when repo config does not have type property', () => {
      expect(
        repoman._determineRepoType({
          url: 'http://git-wip-us.apache.org/repos/asf/couchdb.git'
        })
      ).toEqual('git');
      expect(
        repoman._determineRepoType({
          url: 'http://svn.apache.org/repos/asf/httpd/httpd/trunk/'
        })
      ).toEqual('svn');
      expect(
        repoman._determineRepoType({ url: 'http://somesubversion/repo' })
      ).toEqual('svn');
    });

    // eslint-disable-next-line max-len
    it('should default repo type to git when repo config does not have type property and URL does not contain repo keyword', () => {
      expect(
        repoman._determineRepoType({ url: 'http://unknown/repo' })
      ).toEqual('git');
    });

    it('should use type if specified in repo', () => {
      expect(
        repoman._determineRepoType({ url: 'http://unknown/repo', type: 'svn' })
      ).toEqual('svn');
    });
  });
});
