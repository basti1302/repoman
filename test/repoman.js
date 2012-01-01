var _ = require('underscore'),
  assert = require('assert'),
  sandbox = require('sandboxed-module'),
  vows = require('vows');

vows.describe('repoman').addBatch({
  'run': {
    topic: function () {
      return function (checks) {
        return sandbox.require('../lib/repoman', {
          requires: {
            child_process: {
              exec: function (command, cb) {
                // simulate success on git repo and failure on svn repo
                if (command === 'git clone http://github.com/x/y /workspace/xy') {
                  cb(null, 'success message');
                } else if (command === 'svn checkout http://abc.googlecode.com /workspace/abc') {
                  cb(new Error('dummyerror'), null, 'error message');
                }
              }
            }
          },
          globals: {
            console: {
              log: function (message) {
                checks.messages.log.push(message);
              },
              error: function (message) {
                checks.messages.error.push(message);
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
        assert.equal(checks.messages.log.length, 5);
        assert.equal(checks.messages.log[0], '+ xy');
        assert.equal(checks.messages.log[1], 'git clone http://github.com/x/y /workspace/xy');
        assert.equal(checks.messages.log[2], 'success message');
        assert.equal(checks.messages.log[3], '+ abc');
        assert.equal(checks.messages.log[4], 'svn checkout http://abc.googlecode.com /workspace/abc');
        assert.equal(checks.messages.error.length, 1);
        assert.equal(checks.messages.error[0], 'error message');
      },
      'then successful command should have status ok': function (err, results) {
        assert.isNull(err);
        assert.equal(results.xy.status, 'ok');
      },
      'and failure command should pass correct error message': function (err, results) {
        assert.equal(results.abc.message, 'dummyerror');
      }
    }
  }
}).exportTo(module);
