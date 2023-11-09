'use strict';

const bag = require('bagofcli');
const colors = require('colors/safe');
const fs = require('fs');
const prompt = require('prompt');
const sinon = require('sinon');

const Repoman = require('../lib/repoman');
const cli = require('../lib/cli');

describe('cli', () => {
  let commandStub;
  let lookupFileStub;

  beforeEach(() => {
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
    sinon.stub(process, 'exit');
    commandStub = sinon.stub(bag, 'command');
    lookupFileStub = sinon.stub(bag, 'lookupFile');
  });

  afterEach(() => {
    console.log.restore();
    console.error.restore();
    process.exit.restore();
    bag.command.restore();
    bag.lookupFile.restore();
  });

  describe('exec', () => {
    it('should contain commands with actions', done => {
      const mockCommand = (base, { commands }) => {
        expect(base).toBeDefined();
        expect(commands.config.action).toBeDefined();
        expect(commands.delete.action).toBeDefined();
        expect(commands.init.action).toBeDefined();
        expect(commands.get.action).toBeDefined();
        expect(commands.changes.action).toBeDefined();
        expect(commands.save.action).toBeDefined();
        expect(commands.undo.action).toBeDefined();
        expect(commands.exec.action).toBeDefined();
        expect(commands.clean.action).toBeDefined();
        done();
      };
      commandStub.callsFake(mockCommand);
      cli.exec();
    });
  });

  describe('config', () => {
    let configStub;

    beforeEach(() => {
      sinon.stub(process, 'cwd');
      configStub = sinon.stub(Repoman.prototype, 'config');
    });

    afterEach(() => {
      process.cwd.restore();
      Repoman.prototype.config.restore();
    });

    it('should pass empty opts when there is no arg', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.config.action({});
      });
      configStub.callsFake((opts, cb) => {
        expect(opts).toEqual({});
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass bitbucket opts when specified in args', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.config.action({
          bitbucketAuthUser: 'someauthuser',
          bitbucketAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(({ bitbucket }, cb) => {
        expect(bitbucket.authUser).toEqual('someauthuser');
        expect(bitbucket.authPass).toEqual('someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass github opts when specified in args', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.config.action({
          githubUser: 'someuser',
          githubOrg: 'someorg',
          githubAuthUser: 'someauthuser',
          githubAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(({ github }, cb) => {
        expect(github.user).toEqual('someuser');
        expect(github.org).toEqual('someorg');
        expect(github.authUser).toEqual('someauthuser');
        expect(github.authPass).toEqual('someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass local opts when specified in args', () => {
      process.cwd.returns('somedir');
      commandStub.callsFake((base, { commands }) => {
        commands.config.action({
          local: true
        });
      });
      configStub.callsFake(({ local }, cb) => {
        expect(local.dir).toEqual('somedir');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('_exec', () => {
    let execStub;
    let mockFs;

    beforeEach(() => {
      mockFs = sinon.mock(fs);
      execStub = sinon.stub(Repoman.prototype, 'exec');
    });

    afterEach(() => {
      Repoman.prototype.exec.restore();
      mockFs.verify();
      mockFs.restore();
    });

    it('should execute custom command specified in arg if command is exec', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.exec.action('ls -al', { _name: 'exec', parent: {} });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake((command, { failFast, regex, tags }, cb) => {
        expect(command).toEqual('ls -al');
        expect(failFast).toEqual(undefined);
        expect(regex).toEqual(undefined);
        expect(tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass built-in command as-is', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.exec.action({ _name: 'init', parent: {} });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake((command, { failFast, regex, tags }, cb) => {
        expect(command).toEqual('init');
        expect(failFast).toEqual(undefined);
        expect(regex).toEqual(undefined);
        expect(tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use win32 command when executed on windows', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.exec.action({
          _name: 'init',
          parent: { platform: 'win32' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake((command, { failFast, regex, tags }, cb) => {
        expect(command).toEqual('init');
        expect(failFast).toEqual(undefined);
        expect(regex).toEqual(undefined);
        expect(tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use custom config file when specified in args', () => {
      commandStub.callsFake((base, { commands }) => {
        commands.exec.action({
          _name: 'init',
          parent: {
            failFast: true,
            regex: '.*github.*',
            tags: 'tag1,tag2',
            configFile: '.somerepoman.json'
          }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake((command, { failFast, regex, tags }, cb) => {
        expect(command).toEqual('init');
        expect(failFast).toEqual(true);
        expect(regex).toEqual('.*github.*');
        expect(tags).toEqual(['tag1', 'tag2']);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('list', () => {
    let listStub;

    beforeEach(() => {
      listStub = sinon.stub(Repoman.prototype, 'list');
    });

    afterEach(() => {
      Repoman.prototype.list.restore();
    });

    it('should log each repo name when there is result array', () => {
      listStub.callsFake((opts, cb) => {
        cb(null, ['somerepo1', 'somerepo2']);
      });
      commandStub.callsFake((base, { commands }) => {
        commands.list.action({
          _name: 'list',
          parent: { tags: 'somerepo' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'somerepo1');
      sinon.assert.calledWith(console.log, 'somerepo2');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not log anything when there is no result', () => {
      listStub.callsFake((opts, cb) => {
        cb(null, []);
      });
      commandStub.callsFake((base, { commands }) => {
        commands.list.action({
          _name: 'list',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('clean', () => {
    let cleanStub;
    let mockPrompt;

    beforeEach(() => {
      cleanStub = sinon.stub(Repoman.prototype, 'clean');
      mockPrompt = sinon.mock(prompt);
    });

    afterEach(() => {
      mockPrompt.verify();
      mockPrompt.restore();
      Repoman.prototype.clean.restore();
    });

    it('should delete nothing when there is no directory to clean up', () => {
      cleanStub.callsFake((dryRun, cb) => {
        expect(dryRun).toEqual(true);
        cb(null, null);
      });
      commandStub.callsFake((base, { commands }) => {
        commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'Nothing to delete');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should delete directories to clean up when user confirms to do so', () => {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': 'Y' });
      cleanStub.callsFake((dryRun, cb) => {
        if (dryRun) {
          cb(null, ['dir1', 'dir2']);
        } else {
          cb();
        }
      });
      commandStub.callsFake((base, { commands }) => {
        commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(
        console.log,
        'The following files/directories will be deleted: %s',
        'dir1, dir2'
      );
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not delete directories to clean up when user confirms to not clean', () => {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': 'N' });
      cleanStub.callsFake((dryRun, cb) => {
        expect(dryRun).toEqual(true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake((base, { commands }) => {
        commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(
        console.log,
        'The following files/directories will be deleted: %s',
        'dir1, dir2'
      );
      sinon.assert.calledWith(console.log, 'Nothing is deleted');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not delete directories to clean up when user does not provide confirmation answer', () => {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': '' });
      cleanStub.callsFake((dryRun, cb) => {
        expect(dryRun).toEqual(true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake((base, { commands }) => {
        commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(
        console.log,
        'The following files/directories will be deleted: %s',
        'dir1, dir2'
      );
      sinon.assert.calledWith(console.log, 'Nothing is deleted');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass error to callback when there is an error during dry run', () => {
      cleanStub.callsFake((dryRun, cb) => {
        expect(dryRun).toEqual(true);
        cb(new Error('some error'));
      });
      commandStub.callsFake((base, { commands }) => {
        commands.clean.action({ _name: 'clean', parent: {} });
      });
      lookupFileStub.callsFake(file => {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.error, colors.red('some error'));
      sinon.assert.calledWith(process.exit, 1);
    });
  });
});
