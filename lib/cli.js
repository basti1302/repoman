var cly = require('cly'),
  p = require('path'),
  Repoman = require('./repoman').Repoman,
  scms = cly.readJsonFile(p.join(__dirname, '../conf/scm.json')),
  repos = cly.readJsonFile(p.join(process.cwd(), 'repoman.json'));
  repoman = new Repoman({ repos: repos, scms: scms, workspace: process.cwd() });

function exec() {


  function _cb(err, results) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  var commands = {};
  ['delete', 'init', 'get', 'changes', 'save'].forEach(function (command) {
    commands[command] = {
      callback: function (args) {
        repoman.run(command, _cb);
      }
    };
  });
  
  cly.parse(__dirname, 'repoman', commands);
}

exports.exec = exec;