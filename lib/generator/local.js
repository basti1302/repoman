var fs = require('fs');
var ini = require('ini');
var p = require('path');
var svnInfo = require('svn-info');

/**
 * Configuration generator for local repositories.
 *
 * @param {String} dir directory where the local repositories are located
 * @class
 */
function Local(dir) {
  this.dir = dir;
}

/**
 * Generate Repoman configuration from local repositories.
 * Only supports vanilla git clone (using git config),
 * and subversion checkouts (using svn info).
 *
 * @param {Function} cb standard cb(err, result) callback
 */
Local.prototype.generate = function(cb) {
  var self = this;
  var config = {};
  var repos = fs.readdirSync(this.dir);

  repos.forEach(function(repo) {
    var gitConfig = p.join(repo, '.git', 'config');
    var svnEntries = p.join(repo, '.svn', 'entries');

    if (fs.existsSync(gitConfig)) {
      self._git(gitConfig, repo, config);
    } else if (fs.existsSync(svnEntries)) {
      self._svn(svnEntries, repo, config);
    }
  });

  cb(null, config);
};

Local.prototype._git = function(gitConfig, repo, config) {
  var info = ini.parse(fs.readFileSync(gitConfig, 'utf-8'));

  if (info['remote "origin"'])
    config[repo] = { type: 'git', url: info['remote "origin"'].url };
};

Local.prototype._svn = function(svnEntries, repo, config) {
  var info = svnInfo.sync(repo);
  var url = info.repositoryRoot;

  config[repo] = { type: 'svn', url: url };
};

module.exports = Local;
