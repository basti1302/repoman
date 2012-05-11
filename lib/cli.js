var _ = require('underscore'),
  bag = require('bagofholding'),
  fs = require('fs'),
  p = require('path'),
  repoman = require('./repoman');

/**
 * cli#exec
 * 
 * Execute repoman using .repoman.json and scms.json config files.
 **/
function exec() {

  var config = JSON.parse(bag.cli.readConfigFileSync('.repoman.json')),
    scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/scms.json'))),
    _repoman = new repoman(config, scms),
    commands;

  function _run(command) {
    return function () {
      _repoman.run(command, bag.cli.exit);
    };
  }

  commands = {
    'delete': {
      desc: 'delete the local repositories',
      action: _run('delete')
    },
    init: {
      desc: 'initialise the repositories',
      action: _run('init')
    },
    get: {
      desc: 'update local repositories with changes from remote repositories',
      action: _run('get')
    },
    changes: {
      desc: 'display the changes in local repositories',
      action: _run('changes')
    },
    save: {
      desc: 'update remote repositories with changes from local repositories',
      action: _run('save')
    }
  };

  bag.cli.parse(commands, __dirname);
}

exports.exec = exec;
