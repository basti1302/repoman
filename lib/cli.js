var _ = require('underscore'),
  bag = require('bagofholding'),
  commander = require('commander'),
  fs = require('fs'),
  p = require('path'),
  Repoman = require('./repoman');

/**
 * Execute repoman using .repoman.json and scms.json config files.
 */
function exec() {

  function _config() {
    return function (command) {
      var opts = {
        github: {
          user: command.githubUser,
          org: command.githubOrg,
          auth: {
            user: command.githubAuthUser,
            pass: command.githubAuthPass
          }
        }
      };
      new Repoman().config(opts, bag.cli.exit);
    };
  }

  function _clean() {
    return function (command, options) {
      // for all commands other than exec, first arg will be the options
      if (!options) {
        options = command;
      }
      var config = (options.parent.configFile) ?
          JSON.parse(bag.cli.readCustomConfigFileSync(options.parent.configFile)) :
          JSON.parse(bag.cli.readConfigFileSync('.repoman.json')),
        repoman = new Repoman(config);

      function _confirm() {
        commander.prompt('Are you sure? (Y/N)', function (answer) {
          answer = answer ? answer.toUpperCase() : 'N';
          if (answer === 'Y') {
            repoman.clean(false, bag.cli.exit);
          } else {
            console.log('Nothing is deleted.');
            process.exit(0);
          }
        });
      }

      repoman.clean(true, function (err, result) {
        if (!err) {
          if (!_.isEmpty(result)) {
            console.log('The following files/directories will be deleted: %s',
              result.join(', '));
            _confirm();
          } else {
            console.log('Nothing to delete.');
            process.exit(0);
          }
        } else {
          bag.cli.exit(err, result);
        }
      });
    };
  }

  function _exec() {
    return function (command, options) {
      // for all commands other than exec, first arg will be the options
      if (!options) {
        options = command;
      }
      var scmsFile = (process.platform === 'win32') ? 'scms-win32.json' : 'scms.json',
        config = (options.parent.configFile) ?
          JSON.parse(bag.cli.readCustomConfigFileSync(options.parent.configFile)) :
          JSON.parse(bag.cli.readConfigFileSync('.repoman.json'));
        scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile)));
      new Repoman(config, scms).exec(
        (options.name !== 'exec') ? options.name : command,
        bag.cli.exit);
    };
  }

  var options = [
      { arg: '-c, --config-file <configFile>', desc: 'Configuration file' }
    ],
    commands = {
      config: {
        desc: 'Create sample configuration file',
        options: [
          { arg: '--github-user <githubUser>', desc: 'Comma-separated GitHub usernames' },
          { arg: '--github-org <githubOrg>', desc: 'Comma-separated GitHub organisations' },
          { arg: '--github-auth-user <githubAuthUser>', desc: 'GitHub authentication username' },
          { arg: '--github-auth-pass <githubAuthPass>', desc: 'GitHub authentication password' }
        ],
        action: _config()
      },
      'delete': {
        desc: 'Delete the local repositories',
        options: options,
        action: _exec()
      },
      init: {
        desc: 'Initialise local repositories',
        options: options,
        action: _exec()
      },
      get: {
        desc: 'Update local repositories with changes from remote repositories',
        options: options,
        action: _exec()
      },
      changes: {
        desc: 'Display the changes in local repositories',
        options: options,
        action: _exec()
      },
      save: {
        desc: 'Update remote repositories with changes from local repositories',
        options: options,
        action: _exec()
      },
      undo: {
        desc: 'Remove uncommitted changes from local repositories',
        options: options,
        action: _exec()
      },
      exec: {
        desc: 'Execute custom command against local repositories',
        options: options,
        action: _exec()
      },
      clean: {
        desc: 'Delete non-Repoman local repositories',
        options: options,
        action: _clean()
      }
    };

  bag.cli.parse(commands, __dirname, options);
}

exports.exec = exec;
