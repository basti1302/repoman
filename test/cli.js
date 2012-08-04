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
            },
            readCustomConfigFileSync: function (file) {
              return mocks['fs_readFileSync_/curr/dir/.custom.repoman.json'];
            }
          }
        },
        fs: bag.mock.fs(checks, mocks),
        './repoman': function (config, scms) {
          checks.repoman_config = config;
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
      globals: {
        process: bag.mock.process(checks, mocks)
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
      checks.bag_parse_commands.config.desc.should.equal('Create sample configuration file');
      checks.bag_parse_commands.config.action();
      checks.repoman_config_exit.should.be.a('function');
      should.not.exist(checks.fs_readFileSync_file);
    });

    it('should contain delete command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands['delete'].desc.should.equal('Delete the local repositories');
      checks.bag_parse_commands['delete'].action();
      checks.repoman_run_command.should.equal('delete');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain init command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.init.desc.should.equal('Initialise local repositories');
      checks.bag_parse_commands.init.action();
      checks.repoman_run_command.should.equal('init');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should use custom config file when config arg is specified', function () {
      checks.bag_parse_commands.init.desc.should.equal('Initialise local repositories');
      checks.bag_parse_commands.init.action({ config: '.custom.repoman.json' });
      checks.repoman_config.customfoo.should.equal('custombar');
    });

    it('should contain get command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.get.desc.should.equal('Update local repositories with changes from remote repositories');
      checks.bag_parse_commands.get.action();
      checks.repoman_run_command.should.equal('get');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain changes command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.changes.desc.should.equal('Display the changes in local repositories');
      checks.bag_parse_commands.changes.action();
      checks.repoman_run_command.should.equal('changes');
      checks.repoman_run_exit.should.be.a('function');
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms.json');
    });

    it('should contain save command and delegate to repoman exec when exec is called', function () {
      checks.bag_parse_commands.save.desc.should.equal('Update remote repositories with changes from local repositories');
      checks.bag_parse_commands.save.action();
      checks.repoman_run_command.should.equal('save');
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
      checks.bag_parse_commands['delete'].action();
      checks.fs_readFileSync_file.should.equal('/somedir/repoman/conf/scms-win32.json');
    });
  });
});
 
