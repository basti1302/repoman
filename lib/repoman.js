var _ = require('lodash');
var async = require('async');
var bag = require('bagofcli');
var colors = require('colors/safe');
var fs = require('fs');
var fsx = require('fs.extra');
var Bitbucket = require('./generator/bitbucket');
var GitHub = require('./generator/github');
var Gitorious = require('./generator/gitorious');
var mustache = require('mustache');
var Local = require('./generator/local');
var p = require('path');
var Table = require('cli-table');

const CONFIG_FILE = '.repoman.json';
const CHANGE_DIR_COMMAND =
  'cd "{{{workspace}}}{{{pathseparator}}}{{{name}}}" && ';

/**
 * @param {Object} repos repository name and details mapping (schemas/repoman.Schema)
 * @param {Object} scms SCM details mapping (schemas/scms.Schema)
 * @class
 */
function Repoman(repos, scms) {
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
Repoman.prototype.config = function(opts, cb) {
  function _saveConfig(err, result) {
    if (!err) {
      if (fs.existsSync(CONFIG_FILE)) {
        var existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (opts.removeExtraneous) {
          existing = _.pick(existing, function(existingKey) {
            return !!result[existingKey];
          });
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
    var bitbucket = new Bitbucket(
      opts.bitbucket.authUser,
      opts.bitbucket.authPass
    );
    bitbucket.generate(_saveConfig);
  } else if (opts.github) {
    console.log(
      'Setting configuration file: %s, with GitHub repositories',
      CONFIG_FILE
    );
    var github = new GitHub(
      function() {
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
  } else if (opts.gitorious) {
    console.log(
      'Setting configuration file: %s, with Gitorious repositories',
      CONFIG_FILE
    );
    var gitorious = new Gitorious(opts.gitorious.url);
    gitorious.generate(
      opts.gitorious.project ? opts.gitorious.project.split(',') : [],
      _saveConfig
    );
  } else if (opts.local) {
    console.log(
      'Setting configuration file: %s, with local repositories',
      CONFIG_FILE
    );
    var local = new Local(opts.local.dir);
    local.generate(_saveConfig);
  } else {
    console.log('Creating sample configuration file: %s', CONFIG_FILE);
    fsx.copy(p.join(__dirname, '../examples/' + CONFIG_FILE), CONFIG_FILE, cb);
  }
};

/**
 * Adds a given repository to the existing .repoman.json configuration file and clones the repo.
 *
 * @param {string} type the type of the repository, either 'git' or 'svn'
 * @param {string} repositoryName the local name of the repository
 * @param {string} url the remote url of the repository
 * @param {Object} opts config options
 * @param {Function} cb standard cb(err, result) callback
 */
Repoman.prototype.add = function(type, repositoryName, url, opts, cb) {
  var newConfig = {
    type: type,
    url: url
  };
  _addToConfig(this, repositoryName, newConfig, opts, cb);
};

function _addToConfig(self, repositoryName, newConfig, opts, cb) {
  var config;
  if (fs.existsSync(CONFIG_FILE)) {
    var existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (existing[repositoryName]) {
      return cb(
        new Error(
          'A configuration for ' +
            repositoryName +
            " already exists, won't overwrite."
        )
      );
    }
    var configIncrement = {};
    configIncrement[repositoryName] = newConfig;
    config = _.extend(existing, configIncrement);
  } else {
    config = { [repositoryName]: newConfig };
  }
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), function(err) {
    if (err) {
      return cb(err);
    }
    var initCmd = self.scms[newConfig.type].init;
    var renderedInitCmd = mustache.render(initCmd, {
      name: repositoryName,
      url: newConfig.url,
      workspace: process.cwd(),
      pathseparator: p.sep
    });
    if (opts.verbose) {
      console.log('> %s', renderedInitCmd);
    }
    bag.exec(renderedInitCmd, false, cb);
  });
}

/**
 * Removes a given repository from the existing .repoman.json configuration file and deletes the repo.
 *
 * @param {string} repositoryName the local name of the repository
 * @param {Object} opts config options
 * @param {Function} cb standard cb(err, result) callback
 */
Repoman.prototype.remove = function(repositoryName, opts, cb) {
  _removeFromConfig(this, repositoryName, opts, cb);
};

function _removeFromConfig(self, repositoryName, opts, cb) {
  var config;
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (!config[repositoryName]) {
      return cb(
        new Error(
          'There is no entry in the configuration file for ' +
            repositoryName +
            ', so there is nothing to remove.'
        )
      );
    }
    delete config[repositoryName];
  } else {
    return cb(new Error('No config file ' + CONFIG_FILE + 'found.'));
  }
  fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), function(err) {
    if (err) {
      return cb(err);
    }
    var deleteCmd = self.scms.git.delete;
    var renderedDeleteCmd = mustache.render(deleteCmd, {
      name: repositoryName,
      workspace: process.cwd(),
      pathseparator: p.sep
    });
    if (opts.verbose) {
      console.log('> %s', renderedDeleteCmd);
    }
    bag.exec(renderedDeleteCmd, false, cb);
  });
}

/**
 * Execute commands, once for each repository.
 * Command is constructed based on the repository type and URL.
 * If command is unsupported (i.e. it does not exist in conf/scms.json),
 * the command will then be executed as-is.
 *
 * @param {String} command command to execute
 * @param {Object} opts optional
 * - failFast: if true then process will exit as soon as there's an error, false allows an error and resume with the next command
 * - regex: regular expression string
 * - tags: an array of tags, when defined then only repos with specified tags will be applied
 * @param {Function} cb caolan/async cb(err, results) callback with results of each command execution
 */
Repoman.prototype.exec = function(command, opts, cb) {
  opts = opts || {};

  opts.failFast = opts.failFast || false;
  opts.verbose = opts.verbose || false;

  var dir = process.cwd();
  var tasks = [];
  var self = this;

  _.each(this.repos, function(repo, name) {
    if (self._selectRepo(repo, name, opts)) {
      var repoType = self._determineRepoType(repo);
      /* jshint ignore:start */
      var fullCommand =
        self.scms && self.scms[repoType] && self.scms[repoType][command]
          ? self.scms[repoType][command]
          : CHANGE_DIR_COMMAND + command;
      /* jshint ignore:end */
      var params = {
        name: name,
        url: repo.url,
        workspace: dir,
        pathseparator: p.sep
      };

      tasks.push(function(cb) {
        console.log('\n+ %s', name);
        var renderedCommand = mustache.render(fullCommand, params);
        if (opts.verbose) {
          console.log('> %s', renderedCommand.replace(/^cd ".+?" && /, ''));
        }
        bag.exec(renderedCommand, !opts.failFast, cb);
      });
    }
  });

  async.series(tasks, cb);
};

/**
 * Create a report with a short one line status summary for each repository.
 *
 * @param {Object} opts optional
 * - regex: regular expression string
 * - tags: an array of tags, when defined then only repos with specified tags will be applied
 * @param {Function} cb standard cb(err, result) callback
 */
Repoman.prototype.report = function(opts, mainCb) {
  opts = opts || {};
  opts.verbose = opts.verbose || false;

  var dir = process.cwd();
  var tasks = [];
  var self = this;
  var report = {};

  _.each(this.repos, function(repo, name) {
    initReport(report, name);
    if (self._selectRepo(repo, name, opts)) {
      var repoType = self._determineRepoType(repo);
      var changeDir = mustache.render(CHANGE_DIR_COMMAND, {
        name: name,
        url: repo.url,
        workspace: dir,
        pathseparator: p.sep
      });
      var reportCommands = self.scms[repoType].report;
      var getBranchNameCmd = changeDir + reportCommands.getBranchName;
      var hasUncommittedCmd = changeDir + reportCommands.hasUncommitted;
      var hasUnpushedCmd = changeDir + reportCommands.hasUnpushed;

      addReportTask(tasks, getBranchNameCmd, report[name], 'branch');
      addReportTask(tasks, hasUncommittedCmd, report[name], 'uncommitted');
      addReportTask(tasks, hasUnpushedCmd, report[name], 'unpushed');
    }
  });
  async.parallel(tasks, function() {
    var formatted = formatReport(report);
    mainCb(null, formatted);
  });
};

function initReport(report, name) {
  if (!report[name]) {
    report[name] = {
      name: name,
      branch: 'unknown',
      uncommitted: 'unknown',
      unpushed: 'unknown'
    };
  }
}

function addReportTask(tasks, command, reportItem, attribute) {
  tasks.push(function(cb) {
    bag.execAndCollect(command, false, function(
      err,
      stdOutOutput,
      stdErrOutput,
      result
    ) {
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
    });
  });
}

function orDefault(string, defaultValue) {
  return string ? string : defaultValue;
}

function formatReport(report) {
  var reportItems = _(report)
    .values() // convert object to array
    .sortBy('name') // sort alphabetically by name of repository
    .value();
  var widthRepoName = calcWidth(reportItems, 'name');
  var widthBranchName = calcWidth(reportItems, 'branch');

  // colorize needs to be called _after_ calcWidth, otherwise color codes will
  // mess up width calculation
  _.each(reportItems, colorize);

  var reportTable = new Table({
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
  _.each(reportItems, function(item) {
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
  var maxWidth =
    _(reportItems)
      .map(attribute) // get attribute (e. g. "branchname) from report items
      .map(_.size) // map all strings to their length
      .max() + 2; // find maximum string length for attribute, add two for left and right padding
  maxWidth = Math.max(maxWidth, 5);
  maxWidth = Math.min(maxWidth, 40);
  return maxWidth;
}

/**
 * Get a list of repository names.
 *
 * @param {Object} opts optional
 * - regex: regular expression string
 * - tags: an array of tags, when defined then only repos with specified tags will be applied
 * @param {Function} cb standard cb(err, result) callback
 */
Repoman.prototype.list = function(opts, cb) {
  var repos = [];
  var self = this;
  _.each(this.repos, function(repo, name) {
    if (self._selectRepo(repo, name, opts)) {
      repos.push(name);
    }
  });
  cb(null, repos);
};

/**
 * Remove directories in workspace which are not configured in .repoman.json file.
 *
 * @param {Boolean} dryRun if true then only display a list of files/directories which will be deleted,
 *     otherwise really remove those files and directories
 * @param {Function} cb standard cb(err, result) callback
 */
Repoman.prototype.clean = function(dryRun, cb) {
  function _dryRun(files, cb) {
    files = _.filter(files, function(file) {
      return !file.match(/^\..+/);
    });
    cb(null, _.difference(files, _.keys(self.repos)));
  }

  function _delete(files, cb) {
    var tasks = [];
    files.forEach(function(file) {
      if (!self.repos[file] && !file.match(/^\..+/)) {
        tasks.push(function(cb) {
          console.log('- %s has been deleted', file);
          fsx.remove(file, cb);
        });
      }
    });
    async.parallel(tasks, cb);
  }

  var self = this;
  fs.readdir(process.cwd(), function(err, files) {
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
};

/**
 * Determine repository type in this order:
 * 1. Use repo.type if provided in configuration file
 * 2. Check the existence of certain keyword in repository URL
 * 3. If type still can't be determined, default to git
 *
 * @param {Object} repo repository object, must contain URL, type is optional
 * @return {String} repository type
 */
Repoman.prototype._determineRepoType = function(repo) {
  function _checkKeywords() {
    var keywords = {
        git: ['git'],
        svn: ['svn', 'subversion']
      },
      types = _.keys(keywords),
      type;
    for (var i = 0, iln = types.length; i < iln; i += 1) {
      for (var j = 0, jln = keywords[types[i]].length; j < jln; j += 1) {
        if (repo.url.indexOf(keywords[types[i]][j]) >= 0) {
          type = types[i];
          break;
        }
      }
    }
    return type;
  }

  var repoType;
  if (repo.type) {
    repoType = repo.type;
  } else {
    repoType = _checkKeywords();
    if (!repoType) {
      repoType = 'git';
    }
  }

  return repoType;
};

/**
 * Select a repo by tags and regex.
 * If a tag or a regex is not supplied,
 * then the selection criteria is considered to be unnecessary.
 *
 * @param {Object} repo repository object, must contain URL, type is optional
 * @param {String} name repository name, used by regex matching
 * @return {Boolean} true if passed selection criteria
 */
Repoman.prototype._selectRepo = function(repo, name, opts) {
  function selectByTags(repo) {
    var isSelected = true;
    if (
      !_.isEmpty(opts.tags) &&
      (_.isEmpty(repo.tags) || _.isEmpty(_.intersection(opts.tags, repo.tags)))
    ) {
      isSelected = false;
    }
    return isSelected;
  }

  function selectByRegex(repo, name) {
    var isSelected = true;
    if (opts.regex) {
      var re = new RegExp(opts.regex);
      if (!name.match(re) && !repo.url.match(re)) {
        isSelected = false;
      }
    }
    return isSelected;
  }

  return selectByTags(repo) && selectByRegex(repo, name);
};

module.exports = Repoman;
