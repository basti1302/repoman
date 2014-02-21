var async = require('async'),
  gitorioujs = require('gitoriou.js');

function Gitorious(url) {
  this.client = new gitorioujs.Gitorious({ url: url });
}

Gitorious.prototype.generate = function (projects, cb) {
  var tasks = [],
    self = this;

  projects.forEach(function (project) {
    tasks.push(function (cb) {
      self.client.getProject(project, cb);
    });
  });

  async.parallelLimit(tasks, 50, function (err, results) {
    var config = {};
    if (!err) {
      results.forEach(function (result) {
        result.project.repositories.mainlines.repository.forEach(function (repo) {
          config[repo.name] = { url: repo.clone_url };
        });
      });
    }
    cb(err, config);
  });
};

module.exports = Gitorious;