var _ = require('underscore'),
  assert = require('assert'),
  sandbox = require('sandboxed-module'),
  vows = require('vows');

vows.describe('cli').addBatch({
  'exec': {
    topic: function () {
      return function (command, repoman, checks) {
        checks.messages = [];
        return sandbox.require('../lib/cli', {
          requires: {
            './repoman': {
              Repoman: function () {
                return {
                  run: function (action, cb) {
                    assert.isNotNull(action);
                    if (repoman.err) {
                      cb(repoman.err);
                    } else {
                      cb(null, {});
                    }
                  }
                };
              }
            },
            nomnom: {
              scriptName: function (name) {
                assert.equal(name, 'repoman');
                return {
                  opts: function (scriptOpts) {
                    assert.equal(scriptOpts.version.string, '-v');
                    assert.isTrue(scriptOpts.version.flag);
                    assert.equal(scriptOpts.version.help, 'Repoman version number');
                    assert.equal(scriptOpts.version.callback(), '1.2.3');
                  }
                };
              },
              command: function (name) {
                return {
                  callback: function (cb) {
                    cb({});
                  }
                };
              },
              parseArgs: function () {
                checks.parseArgsCount = 1;
              }
            },
            fs: {
              readFileSync: function (file) {
                return '{ "version": "1.2.3" }';
              }
            },
            'dummydir/params': {
              params: { foo: 'bar' }
            }
          },
          globals: {
            process: {
              exit: function (code) {
                checks.code = code;
              },
              cwd: function () {
                return 'dummydir';
              }
            },
            console: {
              error: function (message) {
                checks.messages.push(message);
              }
            }
          }
        });
      };
    },
    'should pass exit code 1 when action callbacks have an error': function (topic) {
      var checks = {},
        cli = topic('init', { err: new Error('some error')}, checks);
      cli.exec();
      assert.equal(checks.code, 1);
      assert.equal(checks.parseArgsCount, 1);
      // 5, one for each action
      assert.equal(checks.messages.length, 5);
      assert.equal(checks.messages[0], 'some error');
      assert.equal(checks.messages[1], 'some error');
      assert.equal(checks.messages[2], 'some error');
      assert.equal(checks.messages[3], 'some error');
      assert.equal(checks.messages[4], 'some error');
    },
    'should pass exit code 0 when action callbacks have no error': function (topic) {
      var checks = {},
        cli = topic('init', {}, checks);
      cli.exec();
      assert.equal(checks.code, 0);
      assert.equal(checks.parseArgsCount, 1);
      assert.equal(checks.messages.length, 0);
    }
  }
}).exportTo(module);