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
            exit: bag.cli.exit,
            parse: function (commands, dir) {
              checks.bag_parse_commands = commands;
              checks.bag_parse_dir = dir;
            },
            readConfigFileSync: function (file) {
              return mocks['fs_readFileSync_/someuserhome/.repoman.json'];
            }
          }
        },
        fs: bag.mock.fs(checks, mocks),
        './repoman': function(config, scms) {
          return {
            config: function (exit) {
              checks.repoman_config_exit = exit;
            },
            exec: function (command, exit) {
              checks.repoman_run_command = command;
              checks.repoman_run_exit = exit;
            }
          };
        }
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
        'fs_readFileSync_/somedir/repoman/conf/scms.json': '{}',
        'fs_readFileSync_/someuserhome/.repoman.json': '{}'
      };
      cli = create(checks, mocks);
      cli.exec();
    });

    afterEach(function () {
      checks.bag_parse_dir.should.equal('/somedir/repoman/lib');
    });

    it('should contain config commands and delegate to repoman config when exec is called', function () {
      checks.bag_parse_commands.config.desc.should.equal('create sample configuration file');
      checks.bag_parse_commands.config.action();
      checks.repoman_config_exit.should.be.a('function');
    });

    it('should contain delete commands and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands['delete'].desc.should.equal('delete the local repositories');
      checks.bag_parse_commands['delete'].action();
      checks.repoman_run_command.should.equal('delete');
      checks.repoman_run_exit.should.be.a('function');
    });

    it('should contain init commands and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.init.desc.should.equal('initialise the repositories');
      checks.bag_parse_commands.init.action();
      checks.repoman_run_command.should.equal('init');
      checks.repoman_run_exit.should.be.a('function');
    });

    it('should contain get commands and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.get.desc.should.equal('update local repositories with changes from remote repositories');
      checks.bag_parse_commands.get.action();
      checks.repoman_run_command.should.equal('get');
      checks.repoman_run_exit.should.be.a('function');
    });

    it('should contain changes commands and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.changes.desc.should.equal('display the changes in local repositories');
      checks.bag_parse_commands.changes.action();
      checks.repoman_run_command.should.equal('changes');
      checks.repoman_run_exit.should.be.a('function');
    });

    it('should contain save commands and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.save.desc.should.equal('update remote repositories with changes from local repositories');
      checks.bag_parse_commands.save.action();
      checks.repoman_run_command.should.equal('save');
      checks.repoman_run_exit.should.be.a('function');
    });
  });
});
 
