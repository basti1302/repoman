var cly = require('cly'),
  p = require('path'),
  Repoman = require('./repoman').Repoman,
  scms = cly.readJsonFile(p.join(__dirname, '../conf/scm.json')),
  repos = cly.readJsonFile(p.join(process.cwd(), '.repoman.json'));
  repoman = new Repoman({ repos: repos, scms: scms, workspace: process.cwd() });

function exec() {

  var commands = {};
  ['delete', 'init', 'get', 'changes', 'save'].forEach(function (command) {
    commands[command] = {
      callback: function (args) {
        repoman.run(command, cly.exit);
      }
    };
  });
  
  cly.parse(__dirname, 'repoman', commands);
}

exports.exec = exec;