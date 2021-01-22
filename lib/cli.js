var _ = require('lodash');
var bag = require('bagofcli');
var fs = require('fs');
var p = require('path');
var prompt = require('prompt');
var prompts = require('prompts');
var Repoman = require('./repoman');
var GithubAuth = require('./auth/github');

/**
 * Repoman CLI module.
 * @module cli
 */

function _config(args) {
  var opts = {};

  if (args.removeExtraneous) {
    opts.removeExtraneous = true;
  }

  if (args.bitbucketAuthUser || args.bitbucketAuthPass) {
    opts.bitbucket = {
      authUser: args.bitbucketAuthUser,
      authPass: args.bitbucketAuthPass
    };
  } else if (
    args.githubUser ||
    args.githubOrg ||
    args.githubAuthUser ||
    args.githubAuthPass
  ) {
    opts.github = {
      user: args.githubUser,
      org: args.githubOrg,
      authUser: args.githubAuthUser,
      authPass: args.githubAuthPass,
      useSsh: args.githubUseSsh
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

function _add(args) {
  var type = args.type;
  var name = args.repositoryName || args.name;
  if (typeof name === 'function') {
    name = null;
  }
  var url = args.url;

  if (!!type && type !== 'git' && type !== 'svn') {
    console.error('Unknown --type "' + type + '".');
    process.exit(1);
  }
  if (!type) {
    console.log('No --type specified, will assume "git".');
    type = 'git';
  }
  if (!url) {
    console.error('You need to provide the mandatory parameter --url.');
    process.exit(1);
  }
  if (!name && type === 'git') {
    const nameMatch = /^.*\/(.*)\.git/.exec(url);
    if (nameMatch) {
      name = nameMatch[1];
      console.log(
        'You have given no --repository-name (or --name), I have tried to figure it out from the given --url and arrived at "' +
          name +
          '".'
      );
    }
  }
  if (!name) {
    console.error(
      'You have given no --repository-name (or --name) and I have not been able to figure it out from the given --url. Please provide the name explicitly.'
    );
    process.exit(1);
  }

  var opts = { verbose: args.parent.verbose };
  createRepomanInstance(args).add(type, name, url, opts, function(err) {
    if (err) {
      return bag.exit(err);
    } else {
      console.log(name + ': ' + url + ' has been added.');
      return bag.exit(err);
    }
  });
}

function _remove(args) {
  var name = args.repositoryName || args.name;
  if (typeof name === 'function') {
    name = null;
  }

  if (!name) {
    console.error(
      'You need to provide the mandatory parameter --name (or --repository-name).'
    );
    process.exit(1);
  }

  if (args.force) {
    _reallyRemove(args, name);
  } else {
    prompts({
      type: 'confirm',
      name: 'confirmed',
      message:
        'This will delete the folder ' +
        name +
        ' from your disk, are you sure you want to do this?',
      initial: true
    }).then(function(response) {
      if (response && response.confirmed) {
        _reallyRemove(args, name);
      } else {
        process.exit(0);
      }
    });
  }
}

function _reallyRemove(args, name) {
  var opts = { verbose: args.parent.verbose };
  createRepomanInstance(args).remove(name, opts, function(err) {
    if (err) {
      return bag.exit(err);
    } else {
      console.log(name + ' has been removed.');
      return bag.exit(err);
    }
  });
}

function _signin() {
  prompt.start();
  const authOpts = {};
  prompt.get(['Enter your Github username'], function(err, result) {
    authOpts.username = result['Enter your Github username'];
    prompt.get(['Enter your Github password'], function(err, result) {
      authOpts.password = result['Enter your Github password'];
      var ghAuth = new GithubAuth();
      ghAuth.authBasic(authOpts.username, authOpts.password);
      ghAuth.fetchAndStoreAuthToken(authOpts.twoFactor).catch(function(e) {
        if (
          e &&
          e.code === 401 &&
          e.message &&
          e.message.indexOf('two-factor') !== -1
        ) {
          prompt.get(['Enter your Github two factor auth code'], function(
            err,
            result
          ) {
            ghAuth.fetchAndStoreAuthToken(
              result['Enter your Github two factor auth code']
            );
          });
        }
      });
    });
  });
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
  opts.verbose = args.parent.verbose;
  opts.regex = args.parent.regex;
  if (args.parent.tags) {
    opts.tags = args.parent.tags.split(',');
  }

  createRepomanInstance(args).exec(command, opts, bag.exit);
}

function _report(command, args) {
  var opts = {};

  if (!args) {
    args = command;
    command = args._name;
  }

  opts.verbose = args.parent.verbose;
  opts.regex = args.parent.regex;
  if (args.parent.tags) {
    opts.tags = args.parent.tags.split(',');
  }

  createRepomanInstance(args).report(opts, function(err, result) {
    if (err) {
      return bag.exit(err);
    } else {
      // write formatted report to stdout
      console.log(result);
      return bag.exit();
    }
  });
}

function _list(args) {
  var opts = {};
  opts.regex = args.parent.regex;
  if (args.parent.tags) {
    opts.tags = args.parent.tags.split(',');
  }

  var config = loadConfigFile(args);
  var repoman = new Repoman(config);

  repoman.list(
    opts,
    bag.exitCb(null, function(result) {
      result.forEach(function(name) {
        console.log(name);
      });
    })
  );
}

function _clean(args) {
  var config = loadConfigFile(args);
  var repoman = new Repoman(config);

  function _confirm() {
    prompt.start();
    prompt.get(['Are you sure? (Y/N)'], function(err, result) {
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

  repoman.clean(true, function(err, result) {
    if (!err) {
      if (!_.isEmpty(result)) {
        console.log(
          'The following files/directories will be deleted: %s',
          result.join(', ')
        );
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

function createRepomanInstance(args) {
  var platform = args.parent.platform || process.platform;
  var scmsFile = platform === 'win32' ? 'scms-win32.json' : 'scms.json';
  var scms = JSON.parse(
    fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile))
  );
  var config = loadConfigFile(args);
  return new Repoman(config, scms);
}

function loadConfigFile(args) {
  /* jshint ignore:start */
  var configFile =
    args && args.parent && args.parent.configFile
      ? args.parent.configFile
      : '.repoman.json';
  /* jshint ignore:end */
  try {
    return JSON.parse(bag.lookupFile(configFile));
  } catch (e) {
    if (
      e.name === 'Error' &&
      e.message &&
      e.message.indexOf('Unable to lookup file in ') >= 0
    ) {
      console.error('Config file .repoman.json does not exist.');
      console.error(e.message);
      process.exit(1);
    } else {
      throw e;
    }
  }
}

function exec() {
  var actions = {
    commands: {
      config: { action: _config },
      add: { action: _add },
      remove: { action: _remove },
      delete: { action: _exec },
      init: { action: _exec },
      get: { action: _exec },
      changes: { action: _exec },
      report: { action: _report },
      save: { action: _exec },
      undo: { action: _exec },
      exec: { action: _exec },
      list: { action: _list },
      clean: { action: _clean },
      signin: { action: _signin }
    }
  };

  bag.command(__dirname, actions);
}

/**
 * Execute a Repoman command line command.
 */
exports.exec = exec;
