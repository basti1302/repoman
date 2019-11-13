var async = require('async');
var gitorioujs = require('gitoriou.js');

/**
 * Configuration generator for remote Gitorious repositories.
 *
 * @param {String} url Gitorious server URL
 * @class
 */
function Gitorious(url) {
  this.client = new gitorioujs.Gitorious({ url: url });
}

/**
 * Generate Repoman configuration from remote Gitorious repositories.
 *
 * @param {Array} projects an array of project names
 * @param {Function} cb standard cb(err, result) callback
 */
Gitorious.prototype.generate = function(projects, cb) {
  var tasks = [];
  var self = this;

  projects.forEach(function(project) {
    tasks.push(function(cb) {
      self.client.getProject(project, cb);
    });
  });

  async.parallelLimit(tasks, 50, function(err, results) {
    var config = {};
    if (!err) {
      results.forEach(function(result) {
        result.project.repositories.mainlines.repository.forEach(function(
          repo
        ) {
          config[repo.name] = { url: repo.clone_url };
        });
      });
    }
    cb(err, config);
  });
};

module.exports = Gitorious;
