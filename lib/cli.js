var _ = require('underscore'),
  bag = require('bagofholding'),
  fs = require('fs'),
  p = require('path'),
  repoman = require('./repoman');

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
      new repoman().config(opts, bag.cli.exit);
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
          JSON.parse(bag.cli.readConfigFileSync('.repoman.json')),
        scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile)));
      new repoman(config, scms).exec(
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
          { arg: '--github-user <githubUser>', desc: 'GitHub username' },
          { arg: '--github-org <githubOrg>', desc: 'GitHub organisation' },
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
      exec: {
        desc: 'Execute custom command against local repositories',
        options: options,
        action: _exec()
      }
    };

  bag.cli.parse(commands, __dirname, options);
}

exports.exec = exec;
