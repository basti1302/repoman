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
            cly: {
              readJsonFile: function (file) {
                if (file === 'dummydir/.repoman.json') {
                  return '{ "foo": "bar" }';
                } 
              },
              parse: function (dir, scriptName, commands) {
                checks.scriptName = scriptName;
                checks.commands = commands;
                commands.init.callback();
              },
              exit: function (err, result) {
                checks.err = err;
                checks.result = result;
              }
            }
          },
          globals: {
            process: {
              cwd: function () {
                return 'dummydir';
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
      assert.equal(checks.err.message, 'some error');
      assert.isUndefined(checks.result);
      assert.equal(checks.scriptName, 'repoman');
      assert.equal(_.keys(checks.commands).length, 5);
    },
    'should pass exit code 0 when action callbacks have no error': function (topic) {
      var checks = {},
        cli = topic('init', {}, checks);
      cli.exec();
      assert.isNull(checks.err);
      assert.equal(_.keys(checks.commands).length, 5);
    }
  }
}).exportTo(module);