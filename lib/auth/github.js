'use strict';

const BluePromise = require('bluebird');
const Github = require('@octokit/rest');
const dotfile = require('dotfile')('repomanrc');
const urlModule = require('url');

/**
 * Configuration generator for remote GitHub repositories.
 *
 * @param {String} user: GitHub username
 * @param {String} pass: GitHub password
 * @class
 */
class GithubAuth {
  static createGithubClient() {
    const opts = {
      version: '3.0.0',
      timeout: 30000
    };

    const proxyAddress =
      process.env.http_proxy ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.HTTPS_PROXY;

    if (proxyAddress) {
      const proxyUrl = urlModule.parse(proxyAddress);
      opts.proxy = {
        host: proxyUrl.hostname,
        port: proxyUrl.port
      };
    }

    return new Github(opts);
  }

  constructor() {
    this.gh = GithubAuth.createGithubClient();
  }

  authBasic(user, pass) {
    return this.gh.authenticate({
      type: 'basic',
      username: user,
      password: pass
    });
  }

  fetchAndStoreAuthToken(optionalTwoFactor) {
    const self = this;
    return new BluePromise((s, f) => {
      const headers = {};
      if (optionalTwoFactor) {
        headers['X-GitHub-OTP'] = optionalTwoFactor;
      }
      self.gh.authorization.create(
        {
          scopes: ['user', 'public_repo', 'repo', 'repo:status', 'gist'],
          note: 'read repos for repoman4',
          headers
        },
        (err, res) => {
          if (res && res.data && res.data.token) {
            self.ghToken = res.data.token;
            console.log('got Github auth token');

            dotfile.exists(() => {
              dotfile.write({ githubAuthToken: self.ghToken }, () => {
                dotfile.read((readErr, disk) => {
                  console.log('saved Github auth');
                  console.log(disk);
                  s();
                });
              });
            });
          } else if (err) {
            console.log(err);
            f(err);
          }
        }
      );
    });
  }

  readAuthToken() {
    return new BluePromise((s, f) => {
      dotfile.exists(yesno => {
        if (yesno) {
          dotfile.read((err, { githubAuthToken }) => {
            if (githubAuthToken) {
              s(githubAuthToken);
            } else {
              f(new Error('no auth token in dotfile'));
            }
          });
        } else {
          f(new Error('no dotfile'));
        }
      });
    });
  }
}

module.exports = GithubAuth;
