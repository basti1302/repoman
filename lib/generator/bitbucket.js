'use strict';

const bitbucket = require('bitbucket-api');
const util = require('util');

/**
 * Configuration generator for remote Bitbucket repositories.
 *
 * @param {String} user Bitbucket username
 * @param {String} pass Bitbucket password
 * @class
 */
class Bitbucket {
  constructor(user, pass) {
    this.user = user;
    this.client = bitbucket.createClient({ username: user, password: pass });
  }

  /**
   * Generate Repoman configuration from remote Bitbucket repositories.
   *
   * @param {Function} cb standard cb(err, result) callback
   */
  generate(cb) {
    const config = {};
    this.client.repositories((err, repos) => {
      if (!err) {
        repos.forEach(({ scm, owner, slug }) => {
          if (scm === 'git') {
            const url = util.format(
              'ssh://git@bitbucket.org/%s/%s.git',
              owner,
              slug
            );
            config[slug] = { url };
          } else {
            console.error('TODO: %s scm is not yet supported', scm);
          }
        });
      }
      cb(err, config);
    });
  }
}

module.exports = Bitbucket;
