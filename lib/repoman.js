var _ = require('underscore'),
  child_process = require('child_process');

function Repoman(opts) {

  function _exec(command, cb) {
    child_process.exec(command, function (err, stdout, stderr) {
      if (err) {
        cb(err);
      } else if (stderr) {
        cb(new Error(stderr));
      } else {
        cb(null, stdout);  
      }
    });
  }

  function _apply(command, params) {
    _.keys(params).forEach(function (param) {
      command = command.replace(new RegExp('{' + param + '}'), params[param]);
    });
    return command;
  }

  function run(action, cb) {
    opts.repos.forEach(function (repo) {
      console.log('+ ' + repo.name);

      var command = opts.scms[repo.type][action];
      if (command) {
        repo.workspace = opts.workspace;
        _exec(_apply(command, repo), cb);
      } else {
        cb(new Error(action + ' is not supported'));
      }
    });
  }

  return {
    run: run
  };
}

exports.Repoman = Repoman;