var _ = require('underscore'),
  assert = require('assert'),
  jscoverageHack = require('../lib/repoman'),
  sandbox = require('sandboxed-module'),
  vows = require('vows');

vows.describe('repoman').addBatch({
  'run': {
    topic: function () {
      return function (checks) {
        return sandbox.require('../lib/repoman', {
          requires: {
            cly: {
              exec: function (command, fallthrough, cb) {
                assert.isTrue(fallthrough);
                // simulate success on git repo and failure on svn repo
                if (command === 'git clone http://github.com/x/y /workspace/xy') {
                  cb(null, { status: 'success', checks: checks });
                } else if (command === 'svn checkout http://abc.googlecode.com /workspace/abc') {
                  cb(new Error('dummyerror'), { status: 'error', checks: checks });
                }
              }
            }
          },
          globals: {
            console: {
              log: function (message) {
                checks.messages.log.push(message);
              }
            }
          }
        });
      };
    },
    'when command execution has successful and failure command executions': {
      topic: function (topic) {
        var checks = { messages: { log: [], error: [] } },
          repoman = new topic(checks).Repoman({
            workspace: '/workspace',
            repos: {
              xy: { url: 'http://github.com/x/y', type: 'git' },
              abc: { url: 'http://abc.googlecode.com', type: 'svn' }
            },
            scms: {
              "git": {
                "init": "git clone {url} {workspace}/{name}"
              },
              "svn": {
                "init": "svn checkout {url} {workspace}/{name}"
              }
            }
          });
        repoman.run('init', this.callback);
      },
      'then successful command should have status ok': function (err, results) {
        assert.equal(results.xy.status, 'success');
        assert.equal(results.abc.status, 'error');
      },
      'and failure command should pass correct error message': function (err, results) {
        assert.equal(err.message, 'dummyerror');
      },
      'and log messages should be written to console': function (err, results) {
        assert.equal(results.xy.checks.messages.log.length, 4);
        assert.equal(results.xy.checks.messages.log[0], '+ xy');
        assert.equal(results.xy.checks.messages.log[1], 'git clone http://github.com/x/y /workspace/xy');
        assert.equal(results.xy.checks.messages.log[2], '+ abc');
        assert.equal(results.xy.checks.messages.log[3], 'svn checkout http://abc.googlecode.com /workspace/abc');
      }
    }
  }
}).exportTo(module);
