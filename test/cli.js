var bag = require('bagofholding'),
  buster = require('buster'),
  cli = require('../lib/cli'),
  commander = require('commander'),
  fs = require('fs'),
  Repoman = new require('../lib/repoman');

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
    this.stub(bag, 'cli', { command: mockCommand });
    cli.exec();
  }
});

buster.testCase('cli - config', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
  },
  'should pass empty opts when there is no arg': function () {
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.config.action({});
      },
      exit: bag.cli.exit
    });
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'config', function (opts, cb) {
      assert.equals(opts, {});
      cb();
    });
    cli.exec();
  },
  'should pass github opts when specified in args': function () {
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.config.action({
          githubUser: 'someuser',
          githubOrg: 'someorg',
          githubAuthUser: 'someauthuser',
          githubAuthPass: 'someauthpass'
        });
      },
      exit: bag.cli.exit
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
  }
});

buster.testCase('cli - _exec', {
  setUp: function () {
    this.mockFs = this.mock(fs);
    this.mockProcess = this.mock(process);
  },
  'should execute custom command specified in arg if command is exec': function () {
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.exec.action('ls -al', { _name: 'exec', parent: {} });
      },
      lookupFile: function (file) {
        assert.equals(file, '.repoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, cb) {
      assert.equals(command, 'ls -al');
      cb();
    });
    cli.exec();
  },
  'should pass built-in command as-is': function () {
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: {} });
      },
      lookupFile: function (file) {
        assert.equals(file, '.repoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, cb) {
      assert.equals(command, 'init');
      cb();
    });
    cli.exec();
  },
  'should use win32 command when executed on windows': function () {
    this.stub(process, 'platform', 'win32');
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.exec.action({ _name: 'init', parent: {} });
      },
      lookupFile: function (file) {
        assert.equals(file, '.repoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, cb) {
      assert.equals(command, 'init');
      cb();
    });
    cli.exec();
  },
  'should use custom config file when specified in args': function () {
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.exec.action({ _name: 'init', config: '.somerepoman.json' });
      },
      lookupFile: function (file) {
        assert.equals(file, '.somerepoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    this.mockFs.expects('readFileSync').returns('{}');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'exec', function (command, cb) {
      assert.equals(command, 'init');
      cb();
    });
    cli.exec();
  }
});

buster.testCase('cli - clean', {
  setUp: function () {
    this.mockCommander = this.mock(commander);
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
  },
  'should delete nothing when there is no directory to clean up': function () {
    this.mockConsole.expects('log').once().withExactArgs('Nothing to delete.');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, null);
    });
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', config: '.somerepoman.json' });
      },
      lookupFile: function (file) {
        assert.equals(file, '.somerepoman.json');
        return '{}';
      }
    });
    cli.exec();
  },
  'should delete directories to clean up when user confirms to do so': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockCommander.expects('prompt').once().withArgs('Are you sure? (Y/N)').callsArgWith(1, 'Y');
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      if (dryRun) {
        cb(null, ['dir1', 'dir2']);
      } else {
        cb();
      }
    });
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', config: '.somerepoman.json' });
      },
      lookupFile: function (file) {
        assert.equals(file, '.somerepoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    cli.exec();
  },
  'should not delete directories to clean up when user confirms to not clean': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockConsole.expects('log').once().withExactArgs('Nothing is deleted.');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockCommander.expects('prompt').once().withArgs('Are you sure? (Y/N)').callsArgWith(1, 'N');
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, ['dir1', 'dir2']);
    });
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', config: '.somerepoman.json' });
      },
      lookupFile: function (file) {
        assert.equals(file, '.somerepoman.json');
        return '{}';
      }
    });
    cli.exec();
  },
  'should not delete directories to clean up when user does not provide confirmation answer': function () {
    this.mockConsole.expects('log').once().withExactArgs('The following files/directories will be deleted: %s', 'dir1, dir2');
    this.mockConsole.expects('log').once().withExactArgs('Nothing is deleted.');
    this.mockProcess.expects('exit').once().withExactArgs(0);
    this.mockCommander.expects('prompt').once().withArgs('Are you sure? (Y/N)').callsArgWith(1, '');
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(null, ['dir1', 'dir2']);
    });
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', config: '.somerepoman.json' });
      },
      lookupFile: function (file) {
        assert.equals(file, '.somerepoman.json');
        return '{}';
      }
    });
    cli.exec();
  },
  'should pass error to callback when there is an error during dry run': function () {
    this.mockConsole.expects('error').once().withExactArgs('some error');
    this.mockProcess.expects('exit').once().withExactArgs(1);
    this.stub(Repoman.prototype, 'clean', function (dryRun, cb) {
      assert.equals(dryRun, true);
      cb(new Error('some error'));
    });
    this.stub(bag, 'cli', {
      command: function (base, actions) {
        actions.commands.clean.action({ _name: 'clean', parent: {} });
      },
      lookupFile: function (file) {
        assert.equals(file, '.repoman.json');
        return '{}';
      },
      exit: bag.cli.exit
    });
    cli.exec();
  }
});