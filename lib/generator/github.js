var async   = require('async');
var bag     = require('bagofrequest');
var github  = require('github');
var url     = require('url');
var BluePromise = require('bluebird');
var GithubAuth = require('../auth/github');

/**
 * class GitHub
 * Configuration generator for remote GitHub repositories.
 *
 * @param {String} user: GitHub username
 * @param {String} pass: GitHub password
 */
function GitHub(ready, user, pass) {

  var opts = {
    version: '3.0.0',
    timeout: 30000
  };

  var proxy = bag.proxy();
  if (proxy) {
    proxy = url.parse(proxy);
    opts.proxy = {
      host: proxy.hostname,
      port: proxy.port
    };
  }

  this.gh = new github(opts);
  
  var self = this;
  if (user && pass) {
    self.gh.authenticate({
      type: 'basic',
      username: user,
      password: pass
    });
    ready();
    return;
  }
 
  (new GithubAuth()).readAuthToken().then(function success(token){
     self.gh.authenticate({
        type : 'oauth',
        token : token
      });
      ready();
  }, function error(){
    ready();
  });
}

/**
 * Generate Repoman configuration from remote GitHub repositories.
 * Supports combination of multiple GitHub usernames and multiple GitHub organisations.
 * NOTE: GitHub enforces a rate-limit, but this is only a problem if the total number of
 *       repositories is greater than 60 pages worth of GitHub results.
 *
 * @param {Array} users: an array of GitHub usernames
 * @param {Array} orgs: an array of GitHub organisations
 * @param {Function} cb: standard cb(err, result) callback
 */
GitHub.prototype.generate = function (users, orgs, cb) {
  var tasks = [],
    self = this;

  // retrieve user repos only when user opt is specified
  users.forEach(function (user) {
    tasks.push(function (cb) {

      self.gh.repos.getFromUser({
        user    : user,
        page    : 1,
        per_page: 100
      },
      function (err, result) {
        if (!err) {
          self._paginate(result, cb);
        } else {
          cb(err, result);
        }
      });
    });
  });

  // retrieve organisation repos only when org opt is specified
  orgs.forEach(function (org) {
    tasks.push(function (cb) {
      self.gh.repos.getFromOrg({
        org     : org,
        page    : 1,
        per_page: 100
      },
      function (err, result) {
        if (!err) {
          self._paginate(result, cb);
        } else {
          cb(err, result);
        }
      });
    });
  });

  async.parallelLimit(tasks, 50, function (err, results) {
    var config = {};
    if (!err) {
      results.forEach(function (result) { // each task (user and org)
        result.forEach(function (repo) { // each repo in each task's result
          config[repo.name] = { url: repo.clone_url };
        });
      });
    }
    cb(err, config);
  });
};

GitHub.prototype._paginate = function (result, cb) {

  var results = [],
    self = this;

  function process(repo) {
    console.log('Remaining GitHub API usage: %s/%s',
      repo.meta['x-ratelimit-remaining'],
      repo.meta['x-ratelimit-limit']);
    results = results.concat(repo.slice(0, repo.length));
  }
  process(result);

  function check() {
    return self.gh.hasNextPage(result);
  }
  function _do(cb) {
    self.gh.getNextPage(result, function (err, nextPageResult) {
      result = nextPageResult;
      process(result);
      cb(err, nextPageResult);
    });
  }
  function done(err) {
    cb(err, results);
  }
  async.whilst(check, _do, done);
};

module.exports = GitHub;