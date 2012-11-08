var async = require('async'),
  github = require('github');

/**
 * Create configuration containing GitHub repositories.
 *
 * @param {String} opts: GitHub options { user: '', org: '', auth: { user: '', pass: '' } }
 * @param {Function} cb: standard cb(err, result) callback
 */
function _github(opts, cb) {
  var gh = new github({ version: '3.0.0' }),
    tasks = [];

  if (opts.auth.user && opts.auth.password) {
    gh.authenticate({
      type: 'basic',
      username: opts.auth.user,
      password: opts.auth.password
    });
  }

  // page through the results (each result contains a meta link to the next page)
  function _paginate(result, cb) {

    var results = [];
    function _process(result) {
      if (result.meta) {
        console.log('Remaining GitHub API usage: %s/%s',
          result.meta['x-ratelimit-remaining'],
          result.meta['x-ratelimit-limit']);
        results = results.concat(result.slice(0, result.length));
      }
    }
    _process(result);

    function _check() {
      return gh.hasNextPage(result);
    }
    function _do(_cb) {
      gh.getNextPage(result, function (err, nextPageResult) {
        result = nextPageResult;
        _process(result);
        _cb(err, nextPageResult);
      });
    }
    function _done(err) {
      cb(err, results);
    }
    async.whilst(_check, _do, _done);
  }

  // retrieve user repos only when user opt is specified
  if (opts.user) {
    opts.user.split(',').forEach(function (user) {
      tasks.push(function (cb) {
        gh.repos.getFromUser({
          user: user,
          page: 1,
          per_page: 100
        }, function (err, result) {
          if (!err) {
            _paginate(result, cb);
          } else {
            cb(err, result);
          }
        });
      });
    });
  }

  // retrieve organisation repos only when org opt is specified
  if (opts.org) {
    opts.org.split(',').forEach(function (org) {
      tasks.push(function (cb) {
        gh.repos.getFromOrg({
          org: org,
          page: 1,
          per_page: 100
        }, function (err, result) {
          if (!err) {
            _paginate(result, cb);
          } else {
            cb(err, result);
          }
        });
      });
    });
  }

  async.parallel(tasks, function (err, results) {
    var config = {};
    if (!err) {
      results.forEach(function (result) { // each task (user and org)
        result.forEach(function (repo) { // each repo in each task's result
          config[repo.name] = { url: repo.git_url };
        });
      });
    }
    cb(err, config);
  });
}

exports.github = _github;