var _ = require('lodash'),
  bag = require('bagofcli'),
  fs = require('fs'),
  p = require('path'),
  prompt = require('prompt'),
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
  } else if (args.gitoriousUrl || args.gitoriousProject) {
    opts.gitorious = {
      url: args.gitoriousUrl,
      project: args.gitoriousProject
    };
  } else if (args.local) {
    opts.local = {
      dir: process.cwd()
    };
  }
  new Repoman().config(opts, bag.exit);
}

function _exec(command, args) {
  var opts = {};

  // repoman exec provides command and args as function arguments
  // other 'exec' commands (e.g. init, get) only provides args as the only function argument
  if (!args) {
    args = command;
    command = args._name;
  }

  opts.failFast = args.parent.failFast;

  var scmsFile = (process.platform === 'win32') ? 'scms-win32.json' : 'scms.json',
    scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile))),
    config = JSON.parse(bag.lookupFile(args.config || '.repoman.json'));

  new Repoman(config, scms).exec(command, opts, bag.exit);
}

function _list(args) {
  var config = JSON.parse(bag.lookupFile(args.config || '.repoman.json')),
    repoman = new Repoman(config);
  repoman.list(bag.exitCb(null, function (result) {
    result.forEach(function (name) {
      console.log(name);
    });
  }));
}

function _clean(args) {

  var config = JSON.parse(bag.lookupFile(args.config || '.repoman.json')),
    repoman = new Repoman(config);

  function _confirm() {
    prompt.start();
    prompt.get(['Are you sure? (Y/N)'], function (err, result) {
      var answer = result['Are you sure? (Y/N)'];
      answer = answer ? answer.toUpperCase() : 'N';
      if (answer === 'Y') {
        repoman.clean(false, bag.exit);
      } else {
        console.log('Nothing is deleted');
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
        console.log('Nothing to delete');
        process.exit(0);
      }
    } else {
      bag.exit(err, result);
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
      list: { action: _list },
      clean: { action: _clean }
    }
  };

  bag.command(__dirname, actions);
}

exports.exec = exec;
