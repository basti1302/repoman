var bitbucket = require('bitbucket-api');
var util = require('util');

/**
 * Configuration generator for remote Bitbucket repositories.
 *
 * @param {String} user Bitbucket username
 * @param {String} pass Bitbucket password
 * @class
 */
function Bitbucket(user, pass) {
  this.user = user;
  this.client = bitbucket.createClient({ username: user, password: pass });
}

/**
 * Generate Repoman configuration from remote Bitbucket repositories.
 *
 * @param {Function} cb standard cb(err, result) callback
 */
Bitbucket.prototype.generate = function(cb) {
  var config = {};
  this.client.repositories(function(err, repos) {
    if (!err) {
      repos.forEach(function(repo) {
        if (repo.scm === 'git') {
          const url = util.format(
            'ssh://git@bitbucket.org/%s/%s.git',
            repo.owner,
            repo.slug
          );
          config[repo.slug] = { url: url };
        } else {
          console.error('TODO: %s scm is not yet supported', repo.scm);
        }
      });
    }
    cb(err, config);
  });
};

module.exports = Bitbucket;
