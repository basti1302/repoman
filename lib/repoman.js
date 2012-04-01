var _ = require('underscore'),
  async = require('async'),
  cly = require('cly');

function Repoman(opts) {

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
        cly.exec(command, true, cb);
      };
    });

    async.series(tasks, cb);
  }

  return {
    run: run
  };
}

exports.Repoman = Repoman;