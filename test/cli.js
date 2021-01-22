'use strict';

var bag = require('bagofcli');
var cli = require('../lib/cli');
var colors = require('colors/safe');
var fs = require('fs');
var prompt = require('prompt');
var Repoman = require('../lib/repoman');

var sinon = require('sinon');

describe('cli', function() {
  var commandStub;
  var lookupFileStub;

  beforeEach(function() {
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
    sinon.stub(process, 'exit');
    commandStub = sinon.stub(bag, 'command');
    lookupFileStub = sinon.stub(bag, 'lookupFile');
  });

  afterEach(function() {
    console.log.restore();
    console.error.restore();
    process.exit.restore();
    bag.command.restore();
    bag.lookupFile.restore();
  });

  describe('exec', function() {
    it('should contain commands with actions', function(done) {
      var mockCommand = function(base, actions) {
        expect(base).toBeDefined();
        expect(actions.commands.config.action).toBeDefined();
        expect(actions.commands['delete'].action).toBeDefined();
        expect(actions.commands.init.action).toBeDefined();
        expect(actions.commands.get.action).toBeDefined();
        expect(actions.commands.changes.action).toBeDefined();
        expect(actions.commands.save.action).toBeDefined();
        expect(actions.commands.undo.action).toBeDefined();
        expect(actions.commands.exec.action).toBeDefined();
        expect(actions.commands.clean.action).toBeDefined();
        done();
      };
      commandStub.callsFake(mockCommand);
      cli.exec();
    });
  });

  describe('config', function() {
    var configStub;

    beforeEach(function() {
      sinon.stub(process, 'cwd');
      configStub = sinon.stub(Repoman.prototype, 'config');
    });

    afterEach(function() {
      process.cwd.restore();
      Repoman.prototype.config.restore();
    });

    it('should pass empty opts when there is no arg', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.config.action({});
      });
      configStub.callsFake(function(opts, cb) {
        expect(opts).toEqual({});
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass bitbucket opts when specified in args', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.config.action({
          bitbucketAuthUser: 'someauthuser',
          bitbucketAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(function(opts, cb) {
        expect(opts.bitbucket.authUser).toEqual('someauthuser');
        expect(opts.bitbucket.authPass).toEqual('someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass github opts when specified in args', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.config.action({
          githubUser: 'someuser',
          githubOrg: 'someorg',
          githubAuthUser: 'someauthuser',
          githubAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(function(opts, cb) {
        expect(opts.github.user).toEqual('someuser');
        expect(opts.github.org).toEqual('someorg');
        expect(opts.github.authUser).toEqual('someauthuser');
        expect(opts.github.authPass).toEqual('someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass gitorious opts when specified in args', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.config.action({
          gitoriousUrl: 'http://somehost.com',
          gitoriousProject: 'someproject'
        });
      });
      configStub.callsFake(function(opts, cb) {
        expect(opts.gitorious.url).toEqual('http://somehost.com');
        expect(opts.gitorious.project).toEqual('someproject');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass local opts when specified in args', function() {
      process.cwd.returns('somedir');
      commandStub.callsFake(function(base, actions) {
        actions.commands.config.action({
          local: true
        });
      });
      configStub.callsFake(function(opts, cb) {
        expect(opts.local.dir).toEqual('somedir');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('_exec', function() {
    var execStub;
    var mockFs;

    beforeEach(function() {
      mockFs = sinon.mock(fs);
      execStub = sinon.stub(Repoman.prototype, 'exec');
    });

    afterEach(function() {
      Repoman.prototype.exec.restore();
      mockFs.verify();
      mockFs.restore();
    });

    it('should execute custom command specified in arg if command is exec', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.exec.action('ls -al', { _name: 'exec', parent: {} });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function(command, opts, cb) {
        expect(command).toEqual('ls -al');
        expect(opts.failFast).toEqual(undefined);
        expect(opts.regex).toEqual(undefined);
        expect(opts.tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass built-in command as-is', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: {} });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function(command, opts, cb) {
        expect(command).toEqual('init');
        expect(opts.failFast).toEqual(undefined);
        expect(opts.regex).toEqual(undefined);
        expect(opts.tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use win32 command when executed on windows', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.exec.action({
          _name: 'init',
          parent: { platform: 'win32' }
        });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function(command, opts, cb) {
        expect(command).toEqual('init');
        expect(opts.failFast).toEqual(undefined);
        expect(opts.regex).toEqual(undefined);
        expect(opts.tags).toEqual(undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use custom config file when specified in args', function() {
      commandStub.callsFake(function(base, actions) {
        actions.commands.exec.action({
          _name: 'init',
          parent: {
            failFast: true,
            regex: '.*github.*',
            tags: 'tag1,tag2',
            configFile: '.somerepoman.json'
          }
        });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function(command, opts, cb) {
        expect(command).toEqual('init');
        expect(opts.failFast).toEqual(true);
        expect(opts.regex).toEqual('.*github.*');
        expect(opts.tags).toEqual(['tag1', 'tag2']);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('list', function() {
    var listStub;

    beforeEach(function() {
      listStub = sinon.stub(Repoman.prototype, 'list');
    });

    afterEach(function() {
      Repoman.prototype.list.restore();
    });

    it('should log each repo name when there is result array', function() {
      listStub.callsFake(function(opts, cb) {
        cb(null, ['somerepo1', 'somerepo2']);
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.list.action({
          _name: 'list',
          parent: { tags: 'somerepo' }
        });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'somerepo1');
      sinon.assert.calledWith(console.log, 'somerepo2');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not log anything when there is no result', function() {
      listStub.callsFake(function(opts, cb) {
        cb(null, []);
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.list.action({
          _name: 'list',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('clean', function() {
    var cleanStub;
    var mockPrompt;

    beforeEach(function() {
      cleanStub = sinon.stub(Repoman.prototype, 'clean');
      mockPrompt = sinon.mock(prompt);
    });

    afterEach(function() {
      mockPrompt.verify();
      mockPrompt.restore();
      Repoman.prototype.clean.restore();
    });

    it('should delete nothing when there is no directory to clean up', function() {
      cleanStub.callsFake(function(dryRun, cb) {
        expect(dryRun).toEqual(true);
        cb(null, null);
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'Nothing to delete');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should delete directories to clean up when user confirms to do so', function() {
      mockPrompt
        .expects('start')
        .once()
        .withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': 'Y' });
      cleanStub.callsFake(function(dryRun, cb) {
        if (dryRun) {
          cb(null, ['dir1', 'dir2']);
        } else {
          cb();
        }
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(function(file) {
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

    it('should not delete directories to clean up when user confirms to not clean', function() {
      mockPrompt
        .expects('start')
        .once()
        .withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': 'N' });
      cleanStub.callsFake(function(dryRun, cb) {
        expect(dryRun).toEqual(true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(function(file) {
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

    it('should not delete directories to clean up when user does not provide confirmation answer', function() {
      mockPrompt
        .expects('start')
        .once()
        .withExactArgs();
      mockPrompt
        .expects('get')
        .once()
        .withArgs(['Are you sure? (Y/N)'])
        .callsArgWith(1, null, { 'Are you sure? (Y/N)': '' });
      cleanStub.callsFake(function(dryRun, cb) {
        expect(dryRun).toEqual(true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.clean.action({
          _name: 'clean',
          parent: { configFile: '.somerepoman.json' }
        });
      });
      lookupFileStub.callsFake(function(file) {
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

    it('should pass error to callback when there is an error during dry run', function() {
      cleanStub.callsFake(function(dryRun, cb) {
        expect(dryRun).toEqual(true);
        cb(new Error('some error'));
      });
      commandStub.callsFake(function(base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: {} });
      });
      lookupFileStub.callsFake(function(file) {
        expect(file).toEqual('.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.error, colors.red('some error'));
      sinon.assert.calledWith(process.exit, 1);
    });
  });
});
