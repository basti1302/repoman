var fs = require('fs'),
  nomnom = require('nomnom'),
  p = require('path'),
  Repoman = require('./repoman').Repoman,
  scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/scm.json'))),
  repos = JSON.parse(fs.readFileSync(p.join(process.cwd(), 'repoman.json')));
  repoman = new Repoman({ repos: repos, scms: scms, workspace: process.cwd() });

function exec() {

  var scriptOpts = {
    version: {
      string: '-v',
      flag: true,
      help: 'Repoman version number',
      callback: function () {
        return JSON.parse(fs.readFileSync(p.join(__dirname, '../package.json'))).version;
      }
    }
  };

  function _cb(err, result) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      console.log(result);
      process.exit(0);
    }
  }

  nomnom.scriptName('repoman').opts(scriptOpts);

  nomnom.command('init').callback(function (args) {
    repoman.run('init', _cb);
  });

  nomnom.parseArgs();
}

exports.exec = exec;