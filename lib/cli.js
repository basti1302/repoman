var _ = require('underscore'),
  bag = require('bagofholding'),
  fs = require('fs'),
  p = require('path'),
  repoman = require('./repoman');

/**
 * Execute repoman using .repoman.json and scms.json config files.
 */
function exec() {

  function _config() {
    new repoman().config(bag.cli.exit);
  }

  function _exec(command) {
    return function (args) {
      var scmsFile = (process.platform === 'win32') ? 'scms-win32.json' : 'scms.json',
        config = (args && args.config) ?
          JSON.parse(bag.cli.readCustomConfigFileSync(args.config)) :
          JSON.parse(bag.cli.readConfigFileSync('.repoman.json')),
        scms = JSON.parse(fs.readFileSync(p.join(__dirname, '../conf/' + scmsFile)));
      new repoman(config, scms).exec(command, bag.cli.exit);
    };
  }

  var options = [
      { arg: '-c --config <config>', desc: 'Configuration file' }
    ],
    commands = {
      config: {
        desc: 'Create sample configuration file',
        action: _config
      },
      'delete': {
        desc: 'Delete the local repositories',
        options: options,
        action: _exec('delete')
      },
      init: {
        desc: 'Initialise local repositories',
        options: options,
        action: _exec('init')
      },
      get: {
        desc: 'Update local repositories with changes from remote repositories',
        options: options,
        action: _exec('get')
      },
      changes: {
        desc: 'Display the changes in local repositories',
        options: options,
        action: _exec('changes')
      },
      save: {
        desc: 'Update remote repositories with changes from local repositories',
        options: options,
        action: _exec('save')
      }
    };

  bag.cli.parse(commands, __dirname, options);
}

exports.exec = exec;
