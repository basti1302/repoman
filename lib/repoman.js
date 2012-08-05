var _ = require('underscore'),
  async = require('async'),
  bag = require('bagofholding'),
  fsx = require('fs.extra'),
  p = require('path');

/**
 * Determine repository type in this order:
 * 1. Use repo.type if provided in configuration file
 * 2. Check the existence of certain keyword in repository URL
 * 3. If type still can't be determined, default to git
 *
 * @param {Object} repo: repository object, must contain URL, type is optional
 * @return {String} repository type
 */
function _determineRepoType(repo) {

  var repoType;

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

  if (repo.type) {
    repoType = repo.type;
  } else {
    repoType = _checkKeywords();
    if (!repoType) {
      repoType = 'git';
    }
  }

  return repoType;
}

/**
 * class Repoman
 *
 * @param {Object} repos: repository name and details mapping (schemas/repoman.Schema)
 * @param {Object} scms: SCM details mapping (schemas/scms.Schema)
 */
function Repoman(repos, scms) {
  this.repos = repos;
  this.scms = scms;
}

/**
 * Create a sample .repoman.json configuration file in current directory.
 *
 * @param {Function} cb: standard cb(err, result) callback
 */
Repoman.prototype.config = function (cb) {
  console.log('Creating sample configuration file: .repoman.json');
  fsx.copy(p.join(__dirname, '../examples/.repoman.json'), '.repoman.json', cb);
};

/**
 * Execute commands, once for each repository. 
 * Command is constructed based on the repository type and URL.
 * If command is unsupported (i.e. it does not exist in conf/scms.json),
 * the command will then be executed as-is.
 *
 * @param {String} command: command to execute
 * @param {Function} cb: caolan/async cb(err, results) callback with results of each command execution
 */
Repoman.prototype.exec = function (command, cb) {

  var dir = process.cwd(),
    tasks = [],
    self = this;

  _.each(this.repos, function (repo, name) {

    var repoType = _determineRepoType(repo),
      _command = bag.text.apply(
        (self.scms[repoType][command]) ?
          self.scms[repoType][command] :
          'cd {workspace}/{name}; ' + command,
        { name: name, url: repo.url, workspace: dir }
      );

    tasks.push(function (cb) {
      console.log('+ %s', name);
      bag.cli.exec(_command, true, cb);
    });
  });

  async.series(tasks, cb);
};

module.exports = Repoman;
