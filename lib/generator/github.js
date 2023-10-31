const async = require('async');
const bag = require('bagofrequest');
const github = require('@octokit/rest');
const url = require('url');
const GithubAuth = require('../auth/github');

/**
 * Configuration generator for remote GitHub repositories.
 *
 * @param {String} user GitHub username
 * @param {String} pass GitHub password
 * @class
 */
class GitHub {
  constructor(ready, user, pass, useSsh) {
    const opts = {
      version: '3.0.0',
      timeout: 30000
    };

    let proxy = bag.proxy();
    if (proxy) {
      proxy = url.parse(proxy);
      opts.proxy = {
        host: proxy.hostname,
        port: proxy.port
      };
    }

    this.gh = new github(opts);
    this.useSsh = useSsh;

    const self = this;
    if (user && pass) {
      // if credentials are provided, use those to authenticate
      self.gh.authenticate({
        type: 'basic',
        username: user,
        password: pass
      });
      // the other branches (oauth and no authentication only call the ready()
      // callback after another callback has resolved, which guarantees that this
      // (constructor) function has returned before the ready callback has been
      // called. This, in turn, ensures that the code calling this constructor has received a constructed object. To ensure this also for the basic auth case, we need to make this asynchronous as well.
      process.nextTick(ready);
    } else {
      const gitHubAuth = new GithubAuth();
      gitHubAuth.readAuthToken().then(
        function success(token) {
          self.gh.authenticate({
            type: 'oauth',
            token
          });
          ready();
        },
        function error() {
          // no auth token, user did not execute repoman --signin
          // continue without authentication
          ready();
        }
      );
    }
  }

  /**
   * Generate Repoman configuration from remote GitHub repositories.
   * Supports combination of multiple GitHub usernames and multiple GitHub organisations.
   * NOTE: GitHub enforces a rate-limit, but this is only a problem if the total number of
   *       repositories is greater than 60 pages worth of GitHub results.
   *
   * @param {Array} users an array of GitHub usernames
   * @param {Array} orgs an array of GitHub organisations
   * @param {Function} cb standard cb(err, result) callback
   */
  generate(users, orgs, cb) {
    const tasks = [],
      self = this;

    // retrieve user repos only when user opt is specified
    users.forEach(user => {
      tasks.push(cb => {
        self.gh.repos.getForUser(
          {
            username: user,
            page: 1,
            per_page: 100
          },
          (err, result) => {
            if (!err) {
              self._paginate(result, cb);
            } else {
              cb(err, result);
            }
          }
        );
      });
    });

    // retrieve organisation repos only when org opt is specified
    orgs.forEach(org => {
      tasks.push(cb => {
        self.gh.repos.getForOrg(
          {
            org,
            page: 1,
            per_page: 100
          },
          (err, result) => {
            if (!err) {
              self._paginate(result, cb);
            } else {
              cb(err, result);
            }
          }
        );
      });
    });

    async.parallelLimit(tasks, 50, (err, results) => {
      const config = {};
      if (!err) {
        results.forEach(result => {
          // each task (user and org)
          result.forEach(({ ssh_url, clone_url, name }) => {
            // each repo in each task's result
            const url = (self.useSsh && ssh_url) || clone_url;
            config[name] = { url };
          });
        });
      }
      cb(err, config);
    });
  }

  _paginate(result, cb) {
    let results = [];
    const self = this;

    function process({ meta, data, length }) {
      console.log(
        'Remaining GitHub API usage: %s/%s',
        meta['x-ratelimit-remaining'],
        meta['x-ratelimit-limit']
      );
      results = results.concat(data.slice(0, length));
    }
    process(result);

    function check() {
      return self.gh.hasNextPage(result);
    }
    function _do(cb) {
      self.gh.getNextPage(result, (err, nextPageResult) => {
        result = nextPageResult;
        process(result);
        cb(err, nextPageResult);
      });
    }
    function done(err) {
      cb(err, results);
    }
    async.whilst(check, _do, done);
  }
}

module.exports = GitHub;
