var bag = require('bagofholding'),
  buster = require('buster'),
  cli = require('../lib/cli'),
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
      assert.equals(opts.github.auth.user, 'someauthuser');
      assert.equals(opts.github.auth.pass, 'someauthpass');
      cb();
    });
    cli.exec();
  }
});

/*
buster.testCase('cli - _exec', {
  'should execute custom command specified in arg if command is exec': function () {

  },
  'should pass non-exec command as-is': function () {

  },
  'should use win32 command when executed on windows': function () {

  }
});

buster.testCase('cli - clean', {
  'should delete nothing when there is no directory to clean up': function () {

  },
  'should delete directories to clean up when user confirms to do so': function () {

  },
  'should not delete directories to clean up when user confirms to not clean': function () {

  },
  'should pass error to callback when there is an error during dry run': function () {

  }
});
*/

/*
var bag = require('bagofholding'),
  sandbox = require('sandboxed-module'),
  should = require('should'),
  checks, mocks,
  cli;

describe('cli', function () {

  function create(checks, mocks) {
    return sandbox.require('../lib/cli', {
      requires: {
        bagofholding: {
          cli: {
            exit: function (err, result) {
              checks.bag_cli_exit_err = err;
              checks.bag_cli_exit_result = result;
            },
            parse: function (commands, dir) {
              checks.bag_parse_commands = commands;
              checks.bag_parse_dir = dir;
            },
            readConfigFileSync: function (file) {
              return mocks['fs_readFileSync_/someuserhome/.repoman.json'];
            },
            readCustomConfigFileSync: function (file) {
              return mocks['fs_readFileSync_/curr/dir/.custom.repoman.json'];
            }
          }
        },
        commander: {
          prompt: function (question, cb) {
            checks.commander_prompt_question = question;
            cb(mocks.commander_prompt_answer);
          }
        },
        fs: bag.mock.fs(checks, mocks),
        './repoman': function (config, scms) {
          checks.repoman_config = config;
          return {
            clean: function (dryRun, cb) {
              if (dryRun) {
                cb(mocks.clean_dryRun_err,
                  mocks.clean_dryRun_result);
              } else {
                cb(mocks.clean_nonDryRun_err,
                  mocks.clean_nonDryRun_result);
              }
            },
            config: function (opts, exit) {
              checks.repoman_config_opts = opts;
              checks.repoman_config_exit = exit;
            },
            exec: function (command, exit) {
              checks.repoman_run_command = command;
              checks.repoman_run_exit = exit;
            }
          };
        }
      },
      globals: {
        process: bag.mock.process(checks, mocks),
        console: bag.mock.console(checks, mocks)
      },
      locals: {
        __dirname: '/somedir/repoman/lib'
      }
    });
  }

  beforeEach(function () {
    checks = {};
    mocks = {};
  });

  describe('exec', function () {

    beforeEach(function () {
      mocks = {
        process_cwd: '/curr/dir/',
        'fs_readFileSync_/somedir/repoman/conf/scms.json': '{}',
        'fs_readFileSync_/someuserhome/.repoman.json': '{}',
        'fs_readFileSync_/curr/dir/.custom.repoman.json': '{ "customfoo": "custombar" }'
      };
      cli = create(checks, mocks);
      cli.exec();
    });

    afterEach(function () {
      checks.bag_parse_dir.should.equal('/somedir/repoman/lib');
    });

    it('should contain config command and delegate to repoman config when exec is called', function () {
      checks.bag_parse_commands.config.desc.should.equal('Create configuration file');
      checks.bag_parse_commands.config.options.length.should.equal(4);
      checks.bag_parse_commands.config.options[0].arg.should.equal('--github-user <githubUser>');
      checks.bag_parse_commands.config.options[0].desc.should.equal('Comma-separated GitHub usernames');
      checks.bag_parse_commands.config.options[1].arg.should.equal('--github-org <githubOrg>');
      checks.bag_parse_commands.config.options[1].desc.should.equal('Comma-separated GitHub organisations');
      checks.bag_parse_commands.config.options[2].arg.should.equal('--github-auth-user <githubAuthUser>');
      checks.bag_parse_commands.config.options[2].desc.should.equal('GitHub authentication username');
      checks.bag_parse_commands.config.options[3].arg.should.equal('--github-auth-pass <githubAuthPass>');
      checks.bag_parse_commands.config.options[3].desc.should.equal('GitHub authentication password');

      // without any flag
      checks.bag_parse_commands.config.action({});

      // with github flags
      checks.bag_parse_commands.config.action({
        githubUser: 'somegithubuser',
        githubOrg: 'somegithuborg',
        githubAuthUser: 'somegithubauthuser',
        githubAuthPass: 'somegithubauthpass'
      });
      checks.repoman_config_opts.github.user.should.equal('somegithubuser');
      checks.repoman_config_opts.github.org.should.equal('somegithuborg');
      checks.repoman_config_opts.github.auth.user.should.equal('somegithubauthuser');
      checks.repoman_config_opts.github.auth.pass.should.equal('somegithubauthpass');

      checks.repoman_config_exit.should.be.a('function');
      should.not.exist(checks.fs_readFileSync_file);
    });

    it('should contain delete command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands['delete'].desc.should.equal('Delete the local repositories');
      checks.bag_parse_commands['delete'].action({ name: 'delete', parent: {} });
      checks.repoman_run_command.should.equal('delete');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain init command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.init.desc.should.equal('Initialise local repositories');
      checks.bag_parse_commands.init.action({ name: 'init', parent: {} });
      checks.repoman_run_command.should.equal('init');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should use custom config file when config arg is specified', function () {
      checks.bag_parse_commands.init.desc.should.equal('Initialise local repositories');
      checks.bag_parse_commands.init.action({ name: 'init', parent: { configFile: '.custom.repoman.json' } });
      checks.repoman_config.customfoo.should.equal('custombar');
    });

    it('should contain get command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.get.desc.should.equal('Update local repositories with changes from remote repositories');
      checks.bag_parse_commands.get.action({ name: 'get', parent: {} });
      checks.repoman_run_command.should.equal('get');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain changes command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.changes.desc.should.equal('Display the changes in local repositories');
      checks.bag_parse_commands.changes.action({ name: 'changes', parent: {} });
      checks.repoman_run_command.should.equal('changes');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain save command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.save.desc.should.equal('Update remote repositories with changes from local repositories');
      checks.bag_parse_commands.save.action({ name: 'save', parent: {} });
      checks.repoman_run_command.should.equal('save');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain undo command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.undo.desc.should.equal('Remove uncommitted changes from local repositories');
      checks.bag_parse_commands.undo.action({ name: 'undo', parent: {} });
      checks.repoman_run_command.should.equal('undo');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain command and use windows-specific config file when platform is windows', function () {
      mocks = {
        process_platform: 'win32',
        'fs_readFileSync_/somedir/repoman/conf/scms-win32.json': '{}',
        'fs_readFileSync_/someuserhome/.repoman.json': '{}'
      };
      cli = create(checks, mocks);
      cli.exec();
      checks.bag_parse_commands['delete'].action({ name: 'delete', parent: {} });
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms-win32.json');
    });

    it('should contain exec command and delegate to repoman exec with first argument as the command', function () {
      checks.bag_parse_commands.exec.desc.should.equal('Execute custom command against local repositories');
      checks.bag_parse_commands.exec.action('touch .gitignore;', { name: 'exec', parent: {} });
      checks.repoman_run_command.should.equal('touch .gitignore;');
      checks.repoman_run_exit.should.be.a('function');
    });

    it('should contain clean command and delegate to repoman exec with first argument as the command', function () {
      checks.bag_parse_commands.clean.desc.should.equal('Delete non-Repoman local repositories');
      checks.bag_parse_commands.clean.action({ name: 'clean', parent: {} });
    });
  });

  describe('clean', function () {

    beforeEach(function () {
      mocks = {
        process_cwd: '/curr/dir/',
        'fs_readFileSync_/someuserhome/.repoman.json': '{}'
      };
    });

    it('should pass error when dry run clean returns an error', function () {
      mocks.clean_dryRun_err = new Error('someerror');
      cli = create(checks, mocks);
      cli.exec();
      checks.bag_parse_commands.clean.action({ parent: {}});
      checks.bag_cli_exit_err.message.should.equal('someerror');
      should.not.exist(checks.bag_cli_exit_result);
    });

    it('should display nothing to delete message when dry run returns empty result', function () {
      mocks.clean_dryRun_result = [];
      cli = create(checks, mocks);
      cli.exec();
      checks.bag_parse_commands.clean.action({ parent: {}});
      checks.process_exit_code.should.equal(0);
      checks.console_log_messages.length.should.equal(1);
      checks.console_log_messages[0].should.equal('Nothing to delete.');
    });

    it('should display nothing is deleted when confirmation answer is not Y', function () {
      mocks.clean_dryRun_result = ['foo', 'bar'];
      mocks.commander_prompt_answer = 'N';
      cli = create(checks, mocks);
      cli.exec();
      checks.bag_parse_commands.clean.action({ parent: {}});
      checks.commander_prompt_question.should.equal('Are you sure? (Y/N)');
      checks.process_exit_code.should.equal(0);
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('The following files/directories will be deleted: foo, bar');
      checks.console_log_messages[1].should.equal('Nothing is deleted.');
    });

    it('should call non dry run clean when confirmation answer is Y', function () {
      mocks.clean_dryRun_result = ['foo', 'bar'];
      mocks.clean_nonDryRun_result = 'dummyresult';
      mocks.commander_prompt_answer = 'Y';
      cli = create(checks, mocks);
      cli.exec();
      checks.bag_parse_commands.clean.action({ parent: {}});
      checks.commander_prompt_question.should.equal('Are you sure? (Y/N)');
      checks.console_log_messages.length.should.equal(1);
      checks.console_log_messages[0].should.equal('The following files/directories will be deleted: foo, bar');
      checks.bag_cli_exit_result.should.equal('dummyresult');
    });
  });
});
 
*/