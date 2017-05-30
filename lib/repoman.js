var _         = require('lodash');
var async     = require('async');
var bag       = require('bagofcli');
var fs        = require('fs');
var fsx       = require('fs.extra');
var Bitbucket = require('./generator/bitbucket');
var GitHub    = require('./generator/github');
var Gitorious = require('./generator/gitorious');
var mustache  = require('mustache');
var Local     = require('./generator/local');
var os        = require('os');
var p         = require('path');

const CONFIG_FILE = '.repoman.json';

/**
 * class Repoman
 *
 * @param {Object} repos: repository name and details mapping (schemas/repoman.Schema)
 * @param {Object} scms: SCM details mapping (schemas/scms.Schema)
 */
function Repoman(repos, scms) {
  this.repos = repos || {};
  this.scms  = scms || {};
}

/**
 * Create a sample .repoman.json configuration file in current directory.
 * If config options contains GitHub user or org, then configuration file will contain the corresponding GitHub projects.
 *
 * @param {Object} opts: config options
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.config = function (opts, cb) {

  function _saveConfig(err, result) {
    if (!err) {
      if (fs.existsSync(CONFIG_FILE)) {
        var existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if(opts.removeExtraneous){
          existing = _.pick(existing, function(existingKey){
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

    console.log('Setting configuration file: %s, with Bitbucket repositories', CONFIG_FILE);
    var bitbucket = new Bitbucket(opts.bitbucket.authUser, opts.bitbucket.authPass);
    bitbucket.generate(_saveConfig);

  } else if (opts.github) {

    console.log('Setting configuration file: %s, with GitHub repositories', CONFIG_FILE);
    var github = new GitHub(function(){
      github.generate(
          (opts.github.user) ? opts.github.user.split(',') : [],
          (opts.github.org) ? opts.github.org.split(',') : [],
          _saveConfig);
    }, opts.github.authUser, opts.github.authPass, opts.github.useSsh);
  } else if (opts.gitorious) {

    console.log('Setting configuration file: %s, with Gitorious repositories', CONFIG_FILE);
    var gitorious = new Gitorious(opts.gitorious.url);
    gitorious.generate(
      (opts.gitorious.project) ? opts.gitorious.project.split(',') : [],
      _saveConfig);

  } else if (opts.local) {

    console.log('Setting configuration file: %s, with local repositories', CONFIG_FILE);
    var local = new Local(opts.local.dir);
    local.generate(_saveConfig);

  } else {

    console.log('Creating sample configuration file: %s', CONFIG_FILE);
    fsx.copy(p.join(__dirname, '../examples/' + CONFIG_FILE), CONFIG_FILE, cb);
  }
};

/**
 * Execute commands, once for each repository.
 * Command is constructed based on the repository type and URL.
 * If command is unsupported (i.e. it does not exist in conf/scms.json),
 * the command will then be executed as-is.
 *
 * @param {String} command: command to execute
 * @param {Object} opts: optional
 * - failFast: if true then process will exit as soon as there's an error, false allows an error and resume with the next command
 * - regex: regular expression string
 * - tags: an array of tags, when defined then only repos with specified tags will be applied
 * @param {Function} cb: caolan/async cb(err, results) callback with results of each command execution
 */
Repoman.prototype.exec = function (command, opts, cb) {

  opts = opts || {};

  opts.failFast = opts.failFast || false;
  opts.verbose = opts.verbose || false;

  var dir   = process.cwd();
  var tasks = [];
  var self = this;

  _.each(this.repos, function (repo, name) {

    if (self._selectRepo(repo, name, opts)) {
      var repoType = self._determineRepoType(repo);
      var changeDir = 'cd "{{{workspace}}}{{{pathseparator}}}{{{name}}}" && ';
      var fullCommand =
        (self.scms[repoType][command]) ?
          self.scms[repoType][command] :
          changeDir + command;
      var params   = {
        name: name,
        url: repo.url,
        workspace: dir,
        pathseparator: p.sep,
      };

      tasks.push(function (cb) {
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
 * Get a list of repository names.
 *
 * @param {Object} opts: optional
 * - regex: regular expression string
 * - tags: an array of tags, when defined then only repos with specified tags will be applied
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.list = function (opts, cb) {
  var repos = [];
  var self  = this;
  _.each(this.repos, function (repo, name) {
    if (self._selectRepo(repo, name, opts)) {
      repos.push(name);
    }
  });
  cb(null, repos);
};

/**
 * Remove directories in workspace which are not configured in .repoman.json file.
 *
 * @param {Boolean} dryRun: if true then only display a list of files/directories which will be deleted,
 *     otherwise really remove those files and directories
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.clean = function (dryRun, cb) {

  function _dryRun(files, cb) {
    files = _.filter(files, function (file) {
      return !file.match(/^\..+/);
    });
    cb(null, _.difference(files, _.keys(self.repos)));
  }

  function _delete(files, cb) {
    var tasks = [];
    files.forEach(function (file) {
      if (!self.repos[file] && !file.match(/^\..+/)) {
        tasks.push(function (cb) {
          console.log('- %s has been deleted', file);
          fsx.remove(file, cb);
        });
      }
    });
    async.parallel(tasks, cb);
  }

  var self = this;
  fs.readdir(process.cwd(), function (err, files) {
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
 * @param {Object} repo: repository object, must contain URL, type is optional
 * @return {String} repository type
 */
Repoman.prototype._determineRepoType = function (repo) {

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
 * @param {Object} repo: repository object, must contain URL, type is optional
 * @param {String} name: repository name, used by regex matching
 * @return {Boolean} true if passed selection criteria
 */
Repoman.prototype._selectRepo = function (repo, name, opts) {

  function selectByTags(repo) {
    var isSelected = true;
    if (!_.isEmpty(opts.tags) &&
        (_.isEmpty(repo.tags) ||
         _.isEmpty(_.intersection(opts.tags, repo.tags)))) {
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
