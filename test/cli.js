'use strict';

var bag = require('bagofcli');
var cli = require('../lib/cli');
var colors = require('colors/safe');
var fs = require('fs');
var prompt = require('prompt');
var Repoman = new require('../lib/repoman');

var mocha = require('mocha');
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

describe('cli', function() {

  var commandStub;
  var lookupFileStub;

  beforeEach(function () {
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
    sinon.stub(process, 'exit');
    commandStub = sinon.stub(bag, 'command');
    lookupFileStub = sinon.stub(bag, 'lookupFile');
  });

  afterEach(function () {
    console.log.restore();
    console.error.restore();
    process.exit.restore();
    bag.command.restore();
    bag.lookupFile.restore();
  });

  describe('exec', function() {

    it('should contain commands with actions', function (done) {
      var mockCommand = function (base, actions) {
        assert.isDefined(base);
        assert.isDefined(actions.commands.config.action);
        assert.isDefined(actions.commands['delete'].action);
        assert.isDefined(actions.commands.init.action);
        assert.isDefined(actions.commands.get.action);
        assert.isDefined(actions.commands.changes.action);
        assert.isDefined(actions.commands.save.action);
        assert.isDefined(actions.commands.undo.action);
        assert.isDefined(actions.commands.exec.action);
        assert.isDefined(actions.commands.clean.action);
        done();
      };
      commandStub.callsFake(mockCommand);
      cli.exec();
    });
  });

  describe('config', function() {

    var configStub;

    beforeEach(function () {
      sinon.stub(process, 'cwd');
      configStub = sinon.stub(Repoman.prototype, 'config');
    });

    afterEach(function () {
      process.cwd.restore();
      Repoman.prototype.config.restore();
    });

    it('should pass empty opts when there is no arg', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.config.action({});
      });
      configStub.callsFake(function (opts, cb) {
        assert.isEmpty(opts);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass bitbucket opts when specified in args', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.config.action({
          bitbucketAuthUser: 'someauthuser',
          bitbucketAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(function (opts, cb) {
        assert.equal(opts.bitbucket.authUser, 'someauthuser');
        assert.equal(opts.bitbucket.authPass, 'someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass github opts when specified in args', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.config.action({
          githubUser: 'someuser',
          githubOrg: 'someorg',
          githubAuthUser: 'someauthuser',
          githubAuthPass: 'someauthpass'
        });
      });
      configStub.callsFake(function (opts, cb) {
        assert.equal(opts.github.user, 'someuser');
        assert.equal(opts.github.org, 'someorg');
        assert.equal(opts.github.authUser, 'someauthuser');
        assert.equal(opts.github.authPass, 'someauthpass');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass gitorious opts when specified in args', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.config.action({
          gitoriousUrl: 'http://somehost.com',
          gitoriousProject: 'someproject'
        });
      });
      configStub.callsFake(function (opts, cb) {
        assert.equal(opts.gitorious.url, 'http://somehost.com');
        assert.equal(opts.gitorious.project, 'someproject');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass local opts when specified in args', function () {
      process.cwd.returns('somedir');
      commandStub.callsFake(function (base, actions) {
        actions.commands.config.action({
          local: true
        });
      });
      configStub.callsFake(function (opts, cb) {
        assert.equal(opts.local.dir, 'somedir');
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('_exec', function() {

    var execStub;
    var mockFs;

    beforeEach(function () {
      mockFs = sinon.mock(fs);
      execStub = sinon.stub(Repoman.prototype, 'exec');
    });

    afterEach(function () {
      Repoman.prototype.exec.restore();
      mockFs.verify();
      mockFs.restore();
    });

    it('should execute custom command specified in arg if command is exec', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.exec.action('ls -al', { _name: 'exec', parent: {} });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function (command, opts, cb) {
        assert.equal(command, 'ls -al');
        assert.equal(opts.failFast, undefined);
        assert.equal(opts.regex, undefined);
        assert.equal(opts.tags, undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass built-in command as-is', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: {} });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function (command, opts, cb) {
        assert.equal(command, 'init');
        assert.equal(opts.failFast, undefined);
        assert.equal(opts.regex, undefined);
        assert.equal(opts.tags, undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use win32 command when executed on windows', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: { platform: 'win32' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.repoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function (command, opts, cb) {
        assert.equal(command, 'init');
        assert.equal(opts.failFast, undefined);
        assert.equal(opts.regex, undefined);
        assert.equal(opts.tags, undefined);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should use custom config file when specified in args', function () {
      commandStub.callsFake(function (base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: { failFast: true, regex: '.*github.*', tags: 'tag1,tag2', configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      mockFs.expects('readFileSync').returns('{}');
      execStub.callsFake(function (command, opts, cb) {
        assert.equal(command, 'init');
        assert.equal(opts.failFast, true);
        assert.equal(opts.regex, '.*github.*');
        assert.sameMembers(opts.tags, ['tag1', 'tag2']);
        cb();
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('list', function() {

    var listStub;

    beforeEach(function () {
      listStub = sinon.stub(Repoman.prototype, 'list');
    });

    afterEach(function () {
      Repoman.prototype.list.restore();
    });

    it('should log each repo name when there is result array', function () {
      listStub.callsFake(function (opts, cb) {
        cb(null, ['somerepo1', 'somerepo2']);
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.list.action({ _name: 'list', parent: { tags: 'somerepo' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'somerepo1');
      sinon.assert.calledWith(console.log, 'somerepo2');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not log anything when there is no result', function () {
      listStub.callsFake(function (opts, cb) {
        cb(null, []);
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.list.action({ _name: 'list', parent: { configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(process.exit, 0);
    });
  });

  describe('clean', function() {

    var cleanStub;
    var mockPrompt;

    beforeEach(function () {
      cleanStub = sinon.stub(Repoman.prototype, 'clean');
      mockPrompt = sinon.mock(prompt);
    });

    afterEach(function () {
      mockPrompt.verify();
      mockPrompt.restore();
      Repoman.prototype.clean.restore();
    });

    it('should delete nothing when there is no directory to clean up', function () {
      cleanStub.callsFake(function (dryRun, cb) {
        assert.equal(dryRun, true);
        cb(null, null);
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'Nothing to delete');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should delete directories to clean up when user confirms to do so', function () {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': 'Y' });
      cleanStub.callsFake(function (dryRun, cb) {
        if (dryRun) {
          cb(null, ['dir1', 'dir2']);
        } else {
          cb();
        }
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'The following files/directories will be deleted: %s', 'dir1, dir2');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not delete directories to clean up when user confirms to not clean', function () {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': 'N' });
      cleanStub.callsFake(function (dryRun, cb) {
        assert.equal(dryRun, true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'The following files/directories will be deleted: %s', 'dir1, dir2');
      sinon.assert.calledWith(console.log, 'Nothing is deleted');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should not delete directories to clean up when user does not provide confirmation answer', function () {
      mockPrompt.expects('start').once().withExactArgs();
      mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': '' });
      cleanStub.callsFake(function (dryRun, cb) {
        assert.equal(dryRun, true);
        cb(null, ['dir1', 'dir2']);
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.somerepoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.log, 'The following files/directories will be deleted: %s', 'dir1, dir2');
      sinon.assert.calledWith(console.log, 'Nothing is deleted');
      sinon.assert.calledWith(process.exit, 0);
    });

    it('should pass error to callback when there is an error during dry run', function () {
      cleanStub.callsFake(function (dryRun, cb) {
        assert.equal(dryRun, true);
        cb(new Error('some error'));
      });
      commandStub.callsFake(function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: {} });
      });
      lookupFileStub.callsFake(function (file) {
        assert.equal(file, '.repoman.json');
        return '{}';
      });
      cli.exec();
      sinon.assert.calledWith(console.error, colors.red('some error'));
      sinon.assert.calledWith(process.exit, 1);
    });
  });

});

