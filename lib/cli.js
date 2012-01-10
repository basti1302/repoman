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

  function _cb(err, results) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  nomnom.scriptName('repoman').opts(scriptOpts);

  nomnom.command('delete').callback(function (args) {
    repoman.run('delete', _cb);
  });

  nomnom.command('init').callback(function (args) {
    repoman.run('init', _cb);
  });

  nomnom.command('get').callback(function (args) {
    repoman.run('get', _cb);
  });

  nomnom.command('changes').callback(function (args) {
    repoman.run('changes', _cb);
  });

  nomnom.command('save').callback(function (args) {
    repoman.run('save', _cb);
  });

  nomnom.command('').callback(function (args) {
    console.log(nomnom.getUsage());
  });

  nomnom.parseArgs();
}

exports.exec = exec;