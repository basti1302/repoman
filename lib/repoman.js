'use strict';

const Table = require('cli-table');
const _ = require('lodash');
const async = require('async');
const bag = require('bagofcli');
const colors = require('colors/safe');
const fs = require('fs');
const fsx = require('fs.extra');
const mustache = require('mustache');
const p = require('path');

const Bitbucket = require('./generator/bitbucket');
const GitHub = require('./generator/github');
const Local = require('./generator/local');

const CONFIG_FILE = '.repoman.json';
const CHANGE_DIR_COMMAND =
  'cd "{{{workspace}}}{{{pathseparator}}}{{{name}}}" && ';

/**
 * @param {Object} repos repository name and details mapping (schemas/repoman.Schema)
 * @param {Object} scms SCM details mapping (schemas/scms.Schema)
 * @class
 */
class Repoman {
  constructor(repos, scms) {
    this.repos = repos || {};
    this.scms = scms || {};
  }

  /**
   * Create an initial .repoman.json configuration file in current directory.
   * If config options contains GitHub user or org, then configuration file will
   * contain the corresponding GitHub projects.
   *
   * @param {Object} opts config options
   * @param {Function} cb standard cb(err, result) callback
   */
  config(opts, cb) {
    function _saveConfig(err, result) {
      if (!err) {
        if (fs.existsSync(CONFIG_FILE)) {
          let existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
          if (opts.removeExtraneous) {
            existing = _.pick(existing, existingKey => !!result[existingKey]);
          }
          result = _.extend(existing, result);
        }
        fs.writeFile(CONFIG_FILE, JSON.stringify(result, null, 2), cb);
      } else {
        cb(err);
      }
    }

    if (opts.bitbucket) {
      console.log(
        'Setting configuration file: %s, with Bitbucket repositories',
        CONFIG_FILE
      );
      const bitbucket = new Bitbucket(
        opts.bitbucket.authUser,
        opts.bitbucket.authPass
      );
      bitbucket.generate(_saveConfig);
    } else if (opts.github) {
      console.log(
        'Setting configuration file: %s, with GitHub repositories',
        CONFIG_FILE
      );
      const github = new GitHub(
        () => {
          github.generate(
            opts.github.user ? opts.github.user.split(',') : [],
            opts.github.org ? opts.github.org.split(',') : [],
            _saveConfig
          );
        },
        opts.github.authUser,
        opts.github.authPass,
        opts.github.useSsh
      );
    } else if (opts.local) {
      console.log(
        'Setting configuration file: %s, with local repositories',
        CONFIG_FILE
      );
      const local = new Local(opts.local.dir);
      local.generate(_saveConfig);
    } else {
      console.log('Creating sample configuration file: %s', CONFIG_FILE);
      fsx.copy(
        p.join(__dirname, `../examples/${CONFIG_FILE}`),
        CONFIG_FILE,
        cb
      );
    }
  }

  /**
   * Adds a given repository to the existing .repoman.json configuration file and clones the repo.
   *
   * @param {string} type the type of the repository, either 'git' or 'svn'
   * @param {string} repositoryName the local name of the repository
   * @param {string} url the remote url of the repository
   * @param {Object} opts config options
   * @param {Function} cb standard cb(err, result) callback
   */
  add(type, repositoryName, url, opts, cb) {
    const newConfig = {
      type,
      url
    };
    _addToConfig(this, repositoryName, newConfig, opts, cb);
  }

  /**
   * Removes a given repository from the existing .repoman.json configuration file and deletes the repo.
   *
   * @param {string} repositoryName the local name of the repository
   * @param {Object} opts config options
   * @param {Function} cb standard cb(err, result) callback
   */
  remove(repositoryName, opts, cb) {
    _removeFromConfig(this, repositoryName, opts, cb);
  }

  /**
   * Execute commands, once for each repository.
   * Command is constructed based on the repository type and URL.
   * If command is unsupported (i.e. it does not exist in conf/scms.json),
   * the command will then be executed as-is.
   *
   * @param {String} command command to execute
   * @param {Object} opts optional
   * - failFast: if true then process will exit as soon as there's an error,
   *   false allows an error and resume with the next command
   * - regex: regular expression string
   * - tags: an array of tags, when defined then only repos with specified tags will be applied
   * @param {Function} cb caolan/async cb(err, results) callback with results of each command execution
   */
  // eslint-disable-next-line default-param-last
  exec(command, opts = {}, cb) {
    opts.failFast = opts.failFast || false;
    opts.verbose = opts.verbose || false;

    const dir = process.cwd();
    const tasks = [];
    const self = this;

    _.each(this.repos, (repo, name) => {
      if (self._selectRepo(repo, name, opts)) {
        const repoType = self._determineRepoType(repo);
        /* jshint ignore:start */
        const fullCommand =
          self.scms && self.scms[repoType] && self.scms[repoType][command]
            ? self.scms[repoType][command]
            : CHANGE_DIR_COMMAND + command;
        /* jshint ignore:end */
        const params = {
          name,
          url: repo.url,
          workspace: dir,
          pathseparator: p.sep
        };

        tasks.push(cbTask => {
          console.log('\n+ %s', name);
          const renderedCommand = mustache.render(fullCommand, params);
          if (opts.verbose) {
            console.log('> %s', renderedCommand.replace(/^cd ".+?" && /, ''));
          }
          bag.exec(renderedCommand, !opts.failFast, cbTask);
        });
      }
    });

    async.series(tasks, cb);
  }

  /**
   * Create a report with a short one line status summary for each repository.
   *
   * @param {Object} opts optional
   * - regex: regular expression string
   * - tags: an array of tags, when defined then only repos with specified tags will be applied
   * @param {Function} cb standard cb(err, result) callback
   */
  // eslint-disable-next-line default-param-last
  report(opts = {}, mainCb) {
    opts.verbose = opts.verbose || false;

    const dir = process.cwd();
    const tasks = [];
    const self = this;
    const report = {};

    _.each(this.repos, (repo, name) => {
      initReport(report, name);
      if (self._selectRepo(repo, name, opts)) {
        const repoType = self._determineRepoType(repo);
        const changeDir = mustache.render(CHANGE_DIR_COMMAND, {
          name,
          url: repo.url,
          workspace: dir,
          pathseparator: p.sep
        });
        const reportCommands = self.scms[repoType].report;
        const getBranchNameCmd = changeDir + reportCommands.getBranchName;
        const hasUncommittedCmd = changeDir + reportCommands.hasUncommitted;
        const hasUnpushedCmd = changeDir + reportCommands.hasUnpushed;

        addReportTask(tasks, getBranchNameCmd, report[name], 'branch');
        addReportTask(tasks, hasUncommittedCmd, report[name], 'uncommitted');
        addReportTask(tasks, hasUnpushedCmd, report[name], 'unpushed');
      }
    });
    async.parallel(tasks, () => {
      const formatted = formatReport(report);
      mainCb(null, formatted);
    });
  }

  /**
   * Get a list of repository names.
   *
   * @param {Object} opts optional
   * - regex: regular expression string
   * - tags: an array of tags, when defined then only repos with specified tags will be applied
   * @param {Function} cb standard cb(err, result) callback
   */
  list(opts, cb) {
    const repos = [];
    const self = this;
    _.each(this.repos, (repo, name) => {
      if (self._selectRepo(repo, name, opts)) {
        repos.push(name);
      }
    });
    cb(null, repos);
  }

  /**
   * Remove directories in workspace which are not configured in .repoman.json file.
   *
   * @param {Boolean} dryRun if true then only display a list of files/directories which will be deleted,
   *     otherwise really remove those files and directories
   * @param {Function} cb standard cb(err, result) callback
   */
  clean(dryRun, cb) {
    const self = this;

    function _dryRun(files, cbDryRun) {
      files = _.filter(files, file => !file.match(/^\..+/));
      cbDryRun(null, _.difference(files, _.keys(self.repos)));
    }

    function _delete(files, cbDelete) {
      const tasks = [];
      files.forEach(file => {
        if (!self.repos[file] && !file.match(/^\..+/)) {
          tasks.push(cbTask => {
            console.log('- %s has been deleted', file);
            fsx.remove(file, cbTask);
          });
        }
      });
      async.parallel(tasks, cbDelete);
    }

    fs.readdir(process.cwd(), (err, files) => {
      if (!err) {
        if (dryRun) {
          _dryRun(files, cb);
        } else {
          _delete(files, cb);
        }
      } else {
        cb(err, files);
      }
    });
  }

  /**
   * Determine repository type in this order:
   * 1. Use repo.type if provided in configuration file
   * 2. Check the existence of certain keyword in repository URL
   * 3. If type still can't be determined, default to git
   *
   * @param {Object} repo repository object, must contain URL, type is optional
   * @return {String} repository type
   */
  _determineRepoType({ url, type }) {
    function _checkKeywords() {
      const keywords = {
        git: ['git'],
        svn: ['svn', 'subversion']
      };

      const types = _.keys(keywords);
      let typeInner;
      for (let i = 0, iln = types.length; i < iln; i += 1) {
        for (let j = 0, jln = keywords[types[i]].length; j < jln; j += 1) {
          if (url.includes(keywords[types[i]][j])) {
            typeInner = types[i];
            break;
          }
        }
      }
      return typeInner;
    }

    let repoType;
    if (type) {
      repoType = type;
    } else {
      repoType = _checkKeywords();
      if (!repoType) {
        repoType = 'git';
      }
    }

    return repoType;
  }

  /**
   * Select a repo by tags and regex.
   * If a tag or a regex is not supplied,
   * then the selection criteria is considered to be unnecessary.
   *
   * @param {Object} repo repository object, must contain URL, type is optional
   * @param {String} name repository name, used by regex matching
   * @return {Boolean} true if passed selection criteria
   */
  _selectRepo(repo, name, { tags: tagsFromOptions, regex }) {
    function selectByTags({ tags: tagsFromRepo }) {
      let isSelected = true;
      if (
        !_.isEmpty(tagsFromOptions) &&
        (_.isEmpty(tagsFromRepo) ||
          _.isEmpty(_.intersection(tagsFromOptions, tagsFromRepo)))
      ) {
        isSelected = false;
      }
      return isSelected;
    }

    function selectByRegex({ url }, nameInner) {
      let isSelected = true;
      if (regex) {
        const re = new RegExp(regex);
        if (!nameInner.match(re) && !url.match(re)) {
          isSelected = false;
        }
      }
      return isSelected;
    }

    return selectByTags(repo) && selectByRegex(repo, name);
  }
}

function _addToConfig({ scms }, repositoryName, newConfig, { verbose }, cb) {
  let config;
  if (fs.existsSync(CONFIG_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (existing[repositoryName]) {
      return cb(
        new Error(
          `A configuration for ${repositoryName} already exists, won't overwrite.`
        )
      );
    }
    const configIncrement = {};
    configIncrement[repositoryName] = newConfig;
    config = _.extend(existing, configIncrement);
  } else {
    config = { [repositoryName]: newConfig };
  }
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), err => {
    if (err) {
      return cb(err);
    }
    const initCmd = scms[newConfig.type].init;
    const renderedInitCmd = mustache.render(initCmd, {
      name: repositoryName,
      url: newConfig.url,
      workspace: process.cwd(),
      pathseparator: p.sep
    });
    if (verbose) {
      console.log('> %s', renderedInitCmd);
    }
    bag.exec(renderedInitCmd, false, cb);
  });
}

function _removeFromConfig({ scms }, repositoryName, { verbose }, cb) {
  let config;
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (!config[repositoryName]) {
      return cb(
        new Error(
          `There is no entry in the configuration file for ${repositoryName}, so there is nothing to remove.`
        )
      );
    }
    delete config[repositoryName];
  } else {
    return cb(new Error(`No config file ${CONFIG_FILE}found.`));
  }
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), err => {
    if (err) {
      return cb(err);
    }
    const deleteCmd = scms.git.delete;
    const renderedDeleteCmd = mustache.render(deleteCmd, {
      name: repositoryName,
      workspace: process.cwd(),
      pathseparator: p.sep
    });
    if (verbose) {
      console.log('> %s', renderedDeleteCmd);
    }
    bag.exec(renderedDeleteCmd, false, cb);
  });
}

function initReport(report, name) {
  if (!report[name]) {
    report[name] = {
      name,
      branch: 'unknown',
      uncommitted: 'unknown',
      unpushed: 'unknown'
    };
  }
}

function addReportTask(tasks, command, reportItem, attribute) {
  tasks.push(cb => {
    bag.execAndCollect(
      command,
      false,
      (err, stdOutOutput, stdErrOutput, result) => {
        if (err) {
          console.error(err);
        }
        if (result) {
          console.error(result);
        }
        if (stdErrOutput) {
          console.error(stdErrOutput);
        }
        reportItem[attribute] = orDefault(stdOutOutput, reportItem[attribute]);
        cb(null);
      }
    );
  });
}

function orDefault(string, defaultValue) {
  return string || defaultValue;
}

function formatReport(report) {
  let reportItems = _(report)
    .values() // convert object to array
    .sortBy('name') // sort alphabetically by name of repository
    .value();
  const widthRepoName = calcWidth(reportItems, 'name');
  const widthBranchName = calcWidth(reportItems, 'branch');

  // colorize needs to be called _after_ calcWidth, otherwise color codes will
  // mess up width calculation
  _.each(reportItems, colorize);

  const reportTable = new Table({
    head: ['Repository', 'Branch', 'Uncommitted', 'Unpushed'],
    colWidths: [widthRepoName, widthBranchName, 13, 10],
    chars: {
      mid: '',
      'left-mid': '',
      'mid-mid': '',
      'right-mid': ''
    },
    style: { head: ['bold'] }
  });

  // map each report item object to array
  reportItems = _.map(reportItems, _.values);
  // add items to table
  _.each(reportItems, item => {
    reportTable.push(item);
  });

  // return rendered table
  return reportTable.toString();
}

function colorize(reportItem) {
  if (reportItem.uncommitted === 'Dirty' || reportItem.unpushed > 0) {
    reportItem.name = colors.red(reportItem.name);
  } else {
    reportItem.name = colors.green(reportItem.name);
  }
  if (reportItem.uncommitted === 'Dirty') {
    reportItem.uncommitted = colors.red(reportItem.uncommitted);
  } else {
    reportItem.uncommitted = colors.green(reportItem.uncommitted);
  }
  if (reportItem.unpushed === 'N. A.') {
    // no color
  } else if (reportItem.unpushed > 0) {
    reportItem.unpushed = colors.red(reportItem.unpushed);
  } else {
    reportItem.unpushed = colors.green(reportItem.unpushed);
  }
}

function calcWidth(reportItems, attribute) {
  let maxWidth =
    _(reportItems)
      .map(attribute) // get attribute (e. g. "branchname) from report items
      .map(_.size) // map all strings to their length
      .max() + 2; // find maximum string length for attribute, add two for left and right padding
  maxWidth = Math.max(maxWidth, 5);
  maxWidth = Math.min(maxWidth, 40);
  return maxWidth;
}

module.exports = Repoman;
