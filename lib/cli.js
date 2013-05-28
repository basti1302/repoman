var _ = require('underscore'),
  bag = require('bagofholding'),
  commander = require('commander'),
  fs = require('fs'),
  p = require('path'),
  Repoman = require('./repoman');

function _config(args) {
  var opts = {};
  if (args.githubUser || args.githubOrg || args.githubAuthUser || args.githubAuthPass) {
    opts.github = {
      user: args.githubUser,
      org: args.githubOrg,
      authUser: args.githubAuthUser,
      authPass: args.githubAuthPass
    };
  }
  new Repoman().config(opts, bag.cli.exit);
}

function _exec(args,  execArgs) {
  var command;

  // for exec command, first arg is the exact command to execute, second arg is just command line args
  // for other commands, only first arg exists and that's the command line args
  if (execArgs) {
    command = args;
    args = execArgs;
  } else {
    command = args._name;
  }

  var scmsFile = (process.platform === 'win32') ? 'scms-win32.json' : 'scms.json',
    scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile))),
    config = JSON.parse(bag.cli.lookupFile(args.config || '.repoman.json'));

  new Repoman(config, scms).exec(command, bag.cli.exit);
}

function _clean(args) {

  var config = JSON.parse(bag.cli.lookupFile(args.config || '.repoman.json')),
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
}

/**
 * Execute Repoman CLI.
 */
function exec() {

  var actions = {
    commands: {
      config: { action: _config },
      'delete': { action: _exec },
      init: { action: _exec },
      get: { action: _exec },
      changes: { action: _exec },
      save: { action: _exec },
      undo: { action: _exec },
      exec: { action: _exec },
      clean: { action: _clean }
    }
  };

  bag.cli.command(__dirname, actions);
}

exports.exec = exec;
