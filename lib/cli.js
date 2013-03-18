var _ = require('underscore'),
  bag = require('bagofholding'),
  commander = require('commander'),
  fs = require('fs'),
  p = require('path'),
  Repoman = require('./repoman');

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
      config = JSON.parse(bag.cli.lookupFile(options.parent.configFile || '.repoman.json')),
      scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile)));

    command = (options.name !== 'exec') ? options.name : command;

    new Repoman(config, scms).exec(command, bag.cli.exit);
  };
}

/**
 * Execute Repoman CLI.
 */
function exec() {

  var actions = {
    commands: {
      config: { action: _config },
      'delete': { action: _exec() },
      init: { action: _exec() },
      get: { action: _exec() },
      changes: { action: _exec() },
      save: { action: _exec() },
      undo: { action: _exec() },
      exec: { action: _exec() },
      clean: { action: _clean }
    }
  };

  bag.cli.command(__dirname, actions);
}

exports.exec = exec;
