'use strict';

const fs = require('fs');
const ini = require('ini');
const p = require('path');
const svnInfo = require('svn-info');

/**
 * Configuration generator for local repositories.
 *
 * @param {String} dir directory where the local repositories are located
 * @class
 */
class Local {
  constructor(dir) {
    this.dir = dir;
  }

  /**
   * Generate Repoman configuration from local repositories.
   * Only supports vanilla git clone (using git config),
   * and subversion checkouts (using svn info).
   *
   * @param {Function} cb standard cb(err, result) callback
   */
  generate(cb) {
    const self = this;
    const config = {};
    const repos = fs.readdirSync(this.dir);

    repos.forEach(repo => {
      const gitConfig = p.join(repo, '.git', 'config');
      const svnEntries = p.join(repo, '.svn', 'entries');

      if (fs.existsSync(gitConfig)) {
        self._git(gitConfig, repo, config);
      } else if (fs.existsSync(svnEntries)) {
        self._svn(svnEntries, repo, config);
      }
    });

    cb(null, config);
  }

  _git(gitConfig, repo, config) {
    const info = ini.parse(fs.readFileSync(gitConfig, 'utf-8'));

    if (info['remote "origin"']) {
      config[repo] = { type: 'git', url: info['remote "origin"'].url };
    }
  }

  _svn(svnEntries, repo, config) {
    const info = svnInfo.sync(repo);
    const url = info.repositoryRoot;

    config[repo] = { type: 'svn', url };
  }
}

module.exports = Local;
