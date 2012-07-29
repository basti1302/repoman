var _ = require('underscore'),
  async = require('async'),
  bag = require('bagofholding'),
  fsx = require('fs.extra'),
  p = require('path');

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
 * Execute commands, one for each repository. 
 * Command is constructed based on the repository type and URL.
 *
 * @param {String} command: command to execute
 * @param {Function} cb: caolan/async cb(err, results) callback with results of each command execution
 */
Repoman.prototype.exec = function (command, cb) {

  var dir = process.cwd(),
    tasks = [],
    self = this;

  _.each(this.repos, function (repo, name) {

    var _command = bag.text.apply(
      self.scms[repo.type][command],
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
