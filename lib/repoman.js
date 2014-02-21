var _ = require('lodash'),
  async = require('async'),
  bag = require('bagofcli'),
  fs = require('fs'),
  fsx = require('fs.extra'),
  GitHub = require('./generator/github'),
  Gitorious = require('./generator/gitorious'),
  jazz = require('jazz'),
  Local = require('./generator/local'),
  p = require('path');

/**
 * class Repoman
 *
 * @param {Object} repos: repository name and details mapping (schemas/repoman.Schema)
 * @param {Object} scms: SCM details mapping (schemas/scms.Schema)
 */
function Repoman(repos, scms) {
  this.repos = repos || {};
  this.scms = scms || {};
}

/**
 * Create a sample .repoman.json configuration file in current directory.
 * If config options contains GitHub user or org, then configuration file will contain the corresponding GitHub projects.
 *
 * @param {Object} opts: config options
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.config = function (opts, cb) {
  var file = '.repoman.json';

  function _writeConfig(err, result) {
    if (!err) {
      fs.writeFile(file, JSON.stringify(result, null, 2), cb);
    } else {
      cb(err);
    }
  }

  if (opts.github) {
  
    console.log('Creating configuration file: %s, with GitHub repositories', file);
    var github = new GitHub(opts.github.authUser, opts.github.authPass);
    github.generate(
      (opts.github.user) ? opts.github.user.split(',') : [],
      (opts.github.org) ? opts.github.org.split(',') : [],
      _writeConfig);

  } else if (opts.gitorious) {
    
    console.log('Creating configuration file: %s, with Gitorious repositories', file);
    var gitorious = new Gitorious(opts.gitorious.url);
    gitorious.generate(
      (opts.gitorious.project) ? opts.gitorious.project.split(',') : [],
      _writeConfig);
  
  } else if (opts.local) {

    console.log('Creating configuration file: %s, with local repositories', file);
    var local = new Local(opts.local.dir);
    local.generate(_writeConfig);
 
  } else {
    console.log('Creating sample configuration file: %s', file);
    fsx.copy(p.join(__dirname, '../examples/' + file), file, cb);
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
 * @param {Function} cb: caolan/async cb(err, results) callback with results of each command execution
 */
Repoman.prototype.exec = function (command, opts, cb) {
  opts = opts || {};
  opts.failFast = opts.failFast || false;

  var dir = process.cwd(),
    tasks = [],
    self = this;

  _.each(this.repos, function (repo, name) {

    var repoType = self._determineRepoType(repo),
      _command =  (self.scms[repoType][command]) ?
        self.scms[repoType][command] :
        'cd {workspace}/{name}; ' + command,
      params = { name: name, url: repo.url, workspace: dir };

    tasks.push(function (cb) {
      console.log('\n+ %s', name);
      jazz.compile(_command).process(params, function (text) {
        console.log('> %s', text.replace(/^cd.+; /, ''));
        bag.exec(text, !opts.failFast, cb);
      });
    });
  });

  async.series(tasks, cb);
};

/**
 * Get a list of repository names.
 *
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.list = function (cb) {
  cb(null, Object.keys(this.repos));
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

module.exports = Repoman;
