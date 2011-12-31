var _ = require('underscore'),
  async = require('async'),
  child_process = require('child_process');

function Repoman(opts) {

  function _exec(command, cb) {
    child = child_process.exec(command,
      function (err, stdout, stderr) {
        if (err) {
          console.error(stderr);
          // mask error as ok, to allow async.series to execute all tasks
          cb(null, err);
        } else {
          console.log(stdout);
          cb(null, { status: 'ok' });
        }
    });
  }

  function run(action, cb) {

    var tasks = {};

    _.keys(opts.repos).forEach(function (repo) {

      var params = _.clone(opts.repos[repo]),
        command = opts.scms[opts.repos[repo].type][action];

      params.name = repo;
      params.workspace = opts.workspace;

      // apply params to command pattern
      _.keys(params).forEach(function (param) {
        command = command.replace(new RegExp('{' + param + '}'), params[param]);
      });

      tasks[repo] = function (cb) {
        console.log('+ ' + params.name);
        console.log(command);
        _exec(command, cb);
      };
    });

    async.series(tasks, cb);
  }

  return {
    run: run
  };
}

exports.Repoman = Repoman;