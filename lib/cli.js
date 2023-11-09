'use strict';

const _ = require('lodash');
const bag = require('bagofcli');
const fs = require('fs');
const p = require('path');
const prompt = require('prompt');
const prompts = require('prompts');
const Repoman = require('./repoman');
const GithubAuth = require('./auth/github');

/**
 * Repoman CLI module.
 * @module cli
 */

function _config(args) {
  const opts = {};

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
  } else if (args.local) {
    opts.local = {
      dir: process.cwd()
    };
  }

  new Repoman().config(opts, bag.exit);
}

function _add(args) {
  let type = args.type;
  let name = args.repositoryName || args.name;
  if (typeof name === 'function') {
    name = null;
  }
  const url = args.url;

  if (!!type && type !== 'git' && type !== 'svn') {
    console.error(`Unknown --type "${type}".`);
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
        // eslint-disable-next-line max-len
        `You have given no --repository-name (or --name), I have tried to figure it out from the given --url and arrived at "${name}".`
      );
    }
  }
  if (!name) {
    console.error(
      // eslint-disable-next-line max-len
      'You have given no --repository-name (or --name) and I have not been able to figure it out from the given --url. Please provide the name explicitly.'
    );
    process.exit(1);
  }

  const opts = { verbose: args.parent.verbose };
  createRepomanInstance(args).add(type, name, url, opts, err => {
    if (err) {
      return bag.exit(err);
    } else {
      console.log(`${name}: ${url} has been added.`);
      return bag.exit(err);
    }
  });
}

function _remove(args) {
  let name = args.repositoryName || args.name;
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
      message: `This will delete the folder ${name} from your disk, are you sure you want to do this?`,
      initial: true
    }).then(response => {
      if (response && response.confirmed) {
        _reallyRemove(args, name);
      } else {
        process.exit(0);
      }
    });
  }
}

function _reallyRemove(args, name) {
  const opts = { verbose: args.parent.verbose };
  createRepomanInstance(args).remove(name, opts, err => {
    if (err) {
      return bag.exit(err);
    } else {
      console.log(`${name} has been removed.`);
      return bag.exit(err);
    }
  });
}

function _signin() {
  prompt.start();
  const authOpts = {};
  prompt.get(['Enter your Github username'], (err1, result1) => {
    authOpts.username = result1['Enter your Github username'];
    prompt.get(['Enter your Github password'], (err2, result2) => {
      authOpts.password = result2['Enter your Github password'];
      const ghAuth = new GithubAuth();
      ghAuth.authBasic(authOpts.username, authOpts.password);
      ghAuth.fetchAndStoreAuthToken(authOpts.twoFactor).catch(e => {
        if (
          e &&
          e.code === 401 &&
          e.message &&
          e.message.includes('two-factor')
        ) {
          prompt.get(
            ['Enter your Github two factor auth code'],
            (err3, result3) => {
              ghAuth.fetchAndStoreAuthToken(
                result3['Enter your Github two factor auth code']
              );
            }
          );
        }
      });
    });
  });
}

function _exec(command, args) {
  const opts = {};

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
  const opts = {};

  if (!args) {
    args = command;
    command = args._name;
  }

  opts.verbose = args.parent.verbose;
  opts.regex = args.parent.regex;
  if (args.parent.tags) {
    opts.tags = args.parent.tags.split(',');
  }

  createRepomanInstance(args).report(opts, (err, result) => {
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
  const opts = {};
  opts.regex = args.parent.regex;
  if (args.parent.tags) {
    opts.tags = args.parent.tags.split(',');
  }

  const config = loadConfigFile(args);
  const repoman = new Repoman(config);

  repoman.list(
    opts,
    bag.exitCb(null, result => {
      result.forEach(name => {
        console.log(name);
      });
    })
  );
}

function _clean(args) {
  const config = loadConfigFile(args);
  const repoman = new Repoman(config);

  function _confirm() {
    prompt.start();
    prompt.get(['Are you sure? (Y/N)'], (err, result) => {
      let answer = result['Are you sure? (Y/N)'];
      answer = answer ? answer.toUpperCase() : 'N';
      if (answer === 'Y') {
        repoman.clean(false, bag.exit);
      } else {
        console.log('Nothing is deleted');
        process.exit(0);
      }
    });
  }

  repoman.clean(true, (err, result) => {
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
  const platform = args.parent.platform || process.platform;
  const scmsFile = platform === 'win32' ? 'scms-win32.json' : 'scms.json';
  const scms = JSON.parse(
    fs.readFileSync(p.join(__dirname, `../conf/${scmsFile}`))
  );
  const config = loadConfigFile(args);
  return new Repoman(config, scms);
}

function loadConfigFile(args) {
  /* jshint ignore:start */
  const configFile =
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
      e.message.includes('Unable to lookup file in ')
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
  const actions = {
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
