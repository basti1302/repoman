var fs      = require('fs');
var ini     = require('ini');
var p       = require('path');
var svnInfo = require('svn-info');

/**
 * class Local
 *
 * @param {String} dir: directory where the local repositories are located
 */
function Local(dir) {
  this.dir = dir;
}

Local.prototype.generate = function (cb) {

  var self   = this;
  var config = {};
  var repos  = fs.readdirSync(this.dir);

  repos.forEach(function (repo) {

    var gitConfig  = p.join(repo, '.git', 'config');
    var svnEntries = p.join(repo, '.svn', 'entries');
    
    if (fs.existsSync(gitConfig)) {
      self._git(gitConfig, repo, config);

    } else if (fs.existsSync(svnEntries)) {
      self._svn(svnEntries, repo, config);
    }

  });

  cb(null, config);
};

Local.prototype._git = function (gitConfig, repo, config) {  
  var info = ini.parse(fs.readFileSync(gitConfig, 'utf-8'));
  var url  = info['remote "origin"'].url;
  config[repo] = { type: 'git', url: url };
};

Local.prototype._svn = function (svnEntries, repo, config) {
  var info = svnInfo.sync(repo);
  var url  = info.repositoryRoot;
  config[repo] = { type: 'svn', url: url };
};

module.exports = Local;