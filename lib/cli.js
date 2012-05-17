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

  function _exec(command) {
    return function () {
      var scmsFile = (process.platform === 'win32') ? 'scms-win32.json' : 'scms.json',
        config = JSON.parse(bag.cli.readConfigFileSync('.repoman.json')),
        scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile)));
      new repoman(config, scms).exec(command, bag.cli.exit);
    };
  }

  var commands = {
    config: {
      desc: 'Create sample configuration file',
      action: function () {
        new repoman().config(bag.cli.exit);
      }
    },
    'delete': {
      desc: 'Delete the local repositories',
      action: _exec('delete')
    },
    init: {
      desc: 'Initialise local repositories',
      action: _exec('init')
    },
    get: {
      desc: 'Update local repositories with changes from remote repositories',
      action: _exec('get')
    },
    changes: {
      desc: 'Display the changes in local repositories',
      action: _exec('changes')
    },
    save: {
      desc: 'Update remote repositories with changes from local repositories',
      action: _exec('save')
    }
  };

  bag.cli.parse(commands, __dirname);
}

exports.exec = exec;
