var _ = require('underscore'),
  async = require('async'),
  child_process = require('child_process');

function Repoman(opts) {

  function _exec(command, cb) {
    command = command.split(' ');
    spawn = child_process.spawn(command.shift(), command);
    spawn.stdout.on('data', function (data) {
      process.stdout.write(data);
    });
    spawn.stderr.on('data', function (data) {
      process.stderr.write(data);
    });
    spawn.on('exit', function (code) {
      // consider all exit code as non-error
      // this is to allow any command to fail and proceed with the rest of the commands
      cb(null, { code: code });
    });
  }

  function _apply(command, params) {
    _.keys(params).forEach(function (param) {
      command = command.replace(new RegExp('{' + param + '}'), params[param]);
    });
    return command;
  }

  function run(action, cb) {

    var tasks = {};

    _.keys(opts.repos).forEach(function (repo) {

      var params = _.clone(opts.repos[repo]),
        command = opts.scms[opts.repos[repo].type][action];

      params.name = repo;
      params.workspace = opts.workspace;

      command = _apply(command, params);

      tasks[repo] = function (cb) {
        console.log('+ ' + params.name);
        console.log(command);
        _exec(command, cb);
      }
    });

    async.series(tasks, cb);
  }

  return {
    run: run
  };
}

exports.Repoman = Repoman;