var bag     = require('bagofcli');
var buster  = require('buster-node');
var cli     = require('../lib/cli');
var fs      = require('fs');
var referee = require('referee');
var prompt  = require('prompt');
var Repoman = new require('../lib/repoman');
var assert  = referee.assert;

buster.testCase('cli - exec', {
  'should contain commands with actions': function (done) {
    var mockCommand = function (base, actions) {
      assert.defined(base);
      assert.defined(actions.commands.config.action);
      assert.defined(actions.commands['delete'].action);
      assert.defined(actions.commands.init.action);
      assert.defined(actions.commands.get.action);
      assert.defined(actions.commands.changes.action);
      assert.defined(actions.commands.save.action);
      assert.defined(actions.commands.undo.action);
      assert.defined(actions.commands.exec.action);
      assert.defined(actions.commands.clean.action);
      done();
    };
    this.mock({});
    this.stub(bag, 'command', mockCommand);
    cli.exec();
  }
});

buster.testCase('cli - config', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
  },
  'should pass empty opts when there is no arg': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.config.action({});
    });
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts, {});
      cb();
    });
    cli.exec();
  },
  'should pass bitbucket opts when specified in args': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.config.action({
        bitbucketAuthUser: 'someauthuser',
        bitbucketAuthPass: 'someauthpass'
      });
    });
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts.bitbucket.authUser, 'someauthuser');
      assert.equals(opts.bitbucket.authPass, 'someauthpass');
      cb();
    });
    cli.exec();
  },
  'should pass github opts when specified in args': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.config.action({
        githubUser: 'someuser',
        githubOrg: 'someorg',
        githubAuthUser: 'someauthuser',
        githubAuthPass: 'someauthpass'
      });
    });
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts.github.user, 'someuser');
      assert.equals(opts.github.org, 'someorg');
      assert.equals(opts.github.authUser, 'someauthuser');
      assert.equals(opts.github.authPass, 'someauthpass');
      cb();
    });
    cli.exec();
  },
  'should pass gitorious opts when specified in args': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.config.action({
        gitoriousUrl: 'http://somehost.com',
        gitoriousProject: 'someproject'
      });
    });
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts.gitorious.url, 'http://somehost.com');
      assert.equals(opts.gitorious.project, 'someproject');
      cb();
    });
    cli.exec();
  },
  'should pass local opts when specified in args': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.config.action({
        local: true
      });
    });
    this.mockProcess.expects('cwd').withExactArgs().returns('somedir');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts.local.dir, 'somedir');
      cb();
    });
    cli.exec();
  }
});

buster.testCase('cli - _exec', {
  setUp: function () {
    this.mockFs = this.mock(fs);
    this.mockProcess = this.mock(process);
  },
  'should execute custom command specified in arg if command is exec': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.exec.action('ls -al', { _name: 'exec', parent: {} });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.repoman.json');
      return '{}';
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, opts, cb) {
      assert.equals(command, 'ls -al');
      assert.equals(opts.failFast, undefined);
      assert.equals(opts.regex, undefined);
      assert.equals(opts.tags, undefined);
      cb();
    });
    cli.exec();
  },
  'should pass built-in command as-is': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.exec.action({ _name: 'init', parent: {} });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.repoman.json');
      return '{}';
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, opts, cb) {
      assert.equals(command, 'init');
      assert.equals(opts.failFast, undefined);
      assert.equals(opts.regex, undefined);
      assert.equals(opts.tags, undefined);
      cb();
    });
    cli.exec();
  },
  'should use win32 command when executed on windows': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.exec.action({ _name: 'init', parent: { platform: 'win32' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.repoman.json');
      return '{}';
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, opts, cb) {
      assert.equals(command, 'init');
      assert.equals(opts.failFast, undefined);
      assert.equals(opts.regex, undefined);
      assert.equals(opts.tags, undefined);
      cb();
    });
    cli.exec();
  },
  'should use custom config file when specified in args': function () {
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.exec.action({ _name: 'init', parent: { failFast: true, regex: '.*github.*', tags: 'tag1,tag2', configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, opts, cb) {
      assert.equals(command, 'init');
      assert.equals(opts.failFast, true);
      assert.equals(opts.regex, '.*github.*');
      assert.equals(opts.tags, ['tag1', 'tag2']);
      cb();
    });
    cli.exec();
  }
});

buster.testCase('cli - list', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
  },
  'should log each repo name when there is result array': function () {
    this.mockConsole.expects('log').once().withExactArgs('somerepo1');
    this.mockConsole.expects('log').once().withExactArgs('somerepo2');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'list', function (opts, cb) {
      cb(null, ['somerepo1', 'somerepo2']);
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.list.action({ _name: 'list', parent: { tags: 'somerepo' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.repoman.json');
      return '{}';
    });
    cli.exec();
  },
  'should not log anything when there is no result': function () {
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'list', function (opts, cb) {
      cb(null, []);
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.list.action({ _name: 'list', parent: { configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    cli.exec();
  }
});

buster.testCase('cli - clean', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
    this.mockPrompt = this.mock(prompt);
  },
  'should delete nothing when there is no directory to clean up': function () {
    this.mockConsole.expects('log').once().withExactArgs('Nothing to delete');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, null);
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    cli.exec();
  },
  'should delete directories to clean up when user confirms to do so': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockPrompt.expects('start').once().withExactArgs();
    this.mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': 'Y' });
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      if (dryRun) {
        cb(null, ['dir1', 'dir2']);
      } else {
        cb();
      }
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    cli.exec();
  },
  'should not delete directories to clean up when user confirms to not clean': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockConsole.expects('log').once().withExactArgs('Nothing is deleted');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockPrompt.expects('start').once().withExactArgs();
    this.mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': 'N' });
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, ['dir1', 'dir2']);
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    cli.exec();
  },
  'should not delete directories to clean up when user does not provide confirmation answer': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockConsole.expects('log').once().withExactArgs('Nothing is deleted');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockPrompt.expects('start').once().withExactArgs();
    this.mockPrompt.expects('get').once().withArgs(['Are you sure? (Y/N)']).callsArgWith(1, null, { 'Are you sure? (Y/N)': '' });
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, ['dir1', 'dir2']);
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.clean.action({ _name: 'clean', parent: { configFile: '.somerepoman.json' } });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.somerepoman.json');
      return '{}';
    });
    cli.exec();
  },
  'should pass error to callback when there is an error during dry run': function () {
    this.mockConsole.expects('error').once().withExactArgs('some error'.red);
    this.mockProcess.expects('exit').once().withExactArgs(1);
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(new Error('some error'));
    });
    this.stub(bag, 'command', function (base, actions) {
      actions.commands.clean.action({ _name: 'clean', parent: {} });
    });
    this.stub(bag, 'lookupFile', function (file) {
      assert.equals(file, '.repoman.json');
      return '{}';
    });
    cli.exec();
  }
});
