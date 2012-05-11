var _ = require('underscore'),
  async = require('async'),
  bag = require('bagofholding');

/**
 * class Repoman
 * - repos (Object): repository name and details mapping (schemas/repoman.Schema)
 * - scms (Object): SCM details mapping (schemas/scms.Schema)
 **/
function Repoman(repos, scms) {
  this.repos = repos;
  this.scms = scms;
}

/**
 * Repoman#run
 * - command (String): command to execute
 * - cb (Function): caolan/async cb(err, results) callback with results of each command execution
 *
 * Execute commands, one for each repository. 
 * Command is constructed based on the repository type and URL.
 **/
Repoman.prototype.run = function (command, cb) {

  var dir = process.cwd(),
    tasks = [],
    self = this;

  _.each(this.repos, function (repo, name) {

    var _command = bag.text.apply(
      self.scms[repo.type][command],
      { name: name, url: repo.url, workspace: dir }
    );

    tasks.push(function (cb) {
      console.log('+ ' + name);
      bag.cli.exec(_command, true, cb);
    });
  });

  async.series(tasks, cb);
}

module.exports = Repoman;