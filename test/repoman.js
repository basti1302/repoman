var bag = require('bagofholding'),
  _jscov = require('../lib/repoman'),
  sandbox = require('sandboxed-module'),
  should = require('should'),
  checks, mocks,
  repoman;

describe('repoman', function () {

  function create(checks, mocks) {
    return sandbox.require('../lib/repoman', {
      requires: mocks.requires,
      globals: {
        console: bag.mock.console(checks),
        process: bag.mock.process(checks, mocks)
      },
      locals: {
        __dirname: '/somedir/repoman/lib'
      }
    });
  }

  beforeEach(function () {
    checks = {};
    mocks = {};
  });

  describe('config', function () {

    it('should copy sample .repoman.json file to current directory when config is called', function (done) {
      mocks.requires = {
        'fs.extra': {
          copy: function (source, target, cb) {
            checks.fsx_copy_source = source;
            checks.fsx_copy_target = target;
            cb();
          }
        }
      };
      repoman = new (create(checks, mocks))();
      repoman.config({}, function () {
        done();
      }); 
      checks.fsx_copy_source.should.equal('/somedir/repoman/examples/.repoman.json');
      checks.fsx_copy_target.should.equal('.repoman.json');
      checks.console_log_messages.length.should.equal(1);
      checks.console_log_messages[0].should.equal('Creating sample configuration file: .repoman.json');
    });
/*
    it('should create .repoman.json file containing GitHub repositories when config is called with github flags', function (done) {
      mocks.requires = {
        fs: {
          writeFile: function (file, data, cb) {
            checks.fs_writeFile_file = file;
            checks.fs_writeFile_data = data;
            cb();
          }
        },
        github: function (opts) {
          checks.github_opts = opts;
          return {
            authenticate: function (opts) {
              checks.github_authenticate_opts = opts;
            },
            repos: {
              getFromUser: function (opts, cb) {
                checks.github_getFromUser_opts = opts;
                cb(null, [
                  { name: 'someuserrepo1', git_url: 'someusergiturl1' },
                  { name: 'someuserrepo2', git_url: 'someusergiturl2' }
                ]);
              },
              getFromOrg: function (opts, cb) {
                checks.github_getFromOrg_opts = opts;
                cb(null, [
                  { name: 'someorgrepo1', git_url: 'someorggiturl1' },
                  { name: 'someorgrepo2', git_url: 'someorggiturl2' }
                ]);
              }
            }
          };
        }
      };
      repoman = new (create(checks, mocks))();
      repoman.config({ github: { user: 'someuser', org: 'someorg', auth: { user: 'someauthuser', pass: 'someauthpass' } } }, function () {
        done();
      }); 
      checks.github_opts.version.should.equal('3.0.0');
      checks.github_getFromUser_opts.user.should.equal('someuser');
      checks.github_getFromUser_opts.page.should.equal(100);
      checks.github_getFromUser_opts.per_page.should.equal(100);
      checks.github_getFromOrg_opts.org.should.equal('someorg');
      checks.github_getFromOrg_opts.page.should.equal(100);
      checks.github_getFromOrg_opts.per_page.should.equal(100);
      checks.fs_writeFile_file.should.equal('.repoman.json');
      checks.fs_writeFile_data.should.equal('{\n  "someuserrepo1": {\n    "url": "someusergiturl1"\n  },\n  "someuserrepo2": {\n    "url": "someusergiturl2"\n  },\n  "someorgrepo1": {\n    "url": "someorggiturl1"\n  },\n  "someorgrepo2": {\n    "url": "someorggiturl2"\n  }\n}');
      checks.console_log_messages.length.should.equal(1);
      checks.console_log_messages[0].should.equal('Creating configuration file: .repoman.json, with GitHub repositories');
    });
*/
  });

  describe('exec', function () {

    beforeEach(function () {
      mocks.requires = {
        bagofholding: {
          cli: {
            exec: function fn(command, fallthrough, cb) {
              cb(null, fn['arguments']);
            }
          },
          text: bag.text
        }
      };
    });

    it('should not log anything when repositories and scms do not exist', function (done) {
      mocks.process_cwd = '/somedir';
      repoman = new (create(checks, mocks))({}, {});
      repoman.exec('init', function cb(err, results) {
        checks.repoman_exec_cb_args = cb['arguments'];
        done();        
      });
      checks.console_log_messages.length.should.equal(0);

      should.not.exist(checks.repoman_exec_cb_args[0]);
      Object.keys(checks.repoman_exec_cb_args[1]).length.should.equal(0);
    });

    it('should log repositories name and execute commands with parameters applied when repositories exist', function (done) {
      mocks.process_cwd = '/somedir';
      var repos = {
          "couchdb": {
            "type": "git",
            "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
          },
          "httpd": {
            "type": "svn",
            "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
          }
        },
        scms = {
          "git": {
            "init": "git clone {url} {workspace}/{name}"
          },
          "svn": {
            "init": "svn checkout {url} {workspace}/{name}"
          }
        };
      repoman = new (create(checks, mocks))(repos, scms);
      repoman.exec('init', function cb(err, results) {
        checks.repoman_exec_cb_args = cb['arguments'];
        done();        
      });
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('+ couchdb');
      checks.console_log_messages[1].should.equal('+ httpd');

      should.not.exist(checks.repoman_exec_cb_args[0]);

      checks.repoman_exec_cb_args[1][0][0].should.equal('git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb');
      checks.repoman_exec_cb_args[1][0][1].should.equal(true);
      checks.repoman_exec_cb_args[1][0][2].should.be.a('function');
      checks.repoman_exec_cb_args[1][1][0].should.equal('svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd');
      checks.repoman_exec_cb_args[1][1][1].should.equal(true);
      checks.repoman_exec_cb_args[1][1][2].should.be.a('function');
    });

    it('should execute command as-is on each repository when command is unsupported', function (done) {
      mocks.process_cwd = '/somedir';
      var repos = {
          "couchdb": {
            "type": "git",
            "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
          },
          "httpd": {
            "type": "svn",
            "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
          }
        },
        scms = {
          "git": {
            "init": "git clone {url} {workspace}/{name}"
          },
          "svn": {
            "init": "svn checkout {url} {workspace}/{name}"
          }
        };
      repoman = new (create(checks, mocks))(repos, scms);
      repoman.exec('touch .gitignore; echo "Created {workspace}/{name}/.gitignore file";', function cb(err, results) {
        checks.repoman_exec_cb_args = cb['arguments'];
        done();        
      });
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('+ couchdb');
      checks.console_log_messages[1].should.equal('+ httpd');

      should.not.exist(checks.repoman_exec_cb_args[0]);

      checks.repoman_exec_cb_args[1][0][0].should.equal('cd /somedir/couchdb; touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";');
      checks.repoman_exec_cb_args[1][0][1].should.equal(true);
      checks.repoman_exec_cb_args[1][0][2].should.be.a('function');
      checks.repoman_exec_cb_args[1][1][0].should.equal('cd /somedir/httpd; touch .gitignore; echo "Created /somedir/httpd/.gitignore file";');
      checks.repoman_exec_cb_args[1][1][1].should.equal(true);
      checks.repoman_exec_cb_args[1][1][2].should.be.a('function');
    });

    it('should determine repo type based on keywords when repo config does not have type property', function (done) {
      mocks.process_cwd = '/somedir';
      var repos = {
          "couchdb": {
            "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
          },
          "httpd": {
            "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
          }
        },
        scms = {
          "git": {
            "init": "git clone {url} {workspace}/{name}"
          },
          "svn": {
            "init": "svn checkout {url} {workspace}/{name}"
          }
        };
      repoman = new (create(checks, mocks))(repos, scms);
      repoman.exec('init', function cb(err, results) {
        checks.repoman_exec_cb_args = cb['arguments'];
        done();        
      });
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('+ couchdb');
      checks.console_log_messages[1].should.equal('+ httpd');

      should.not.exist(checks.repoman_exec_cb_args[0]);

      checks.repoman_exec_cb_args[1][0][0].should.equal('git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb');
      checks.repoman_exec_cb_args[1][0][1].should.equal(true);
      checks.repoman_exec_cb_args[1][0][2].should.be.a('function');
      checks.repoman_exec_cb_args[1][1][0].should.equal('svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd');
      checks.repoman_exec_cb_args[1][1][1].should.equal(true);
      checks.repoman_exec_cb_args[1][1][2].should.be.a('function');
    });

    it('should default repo type to git when repo config does not have type property and URL does not contain repo keyword', function (done) {
      mocks.process_cwd = '/somedir';
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        },
        scms = {
          "git": {
            "init": "git clone {url} {workspace}/{name}"
          },
          "svn": {
            "init": "svn checkout {url} {workspace}/{name}"
          }
        };
      repoman = new (create(checks, mocks))(repos, scms);
      repoman.exec('init', function cb(err, results) {
        checks.repoman_exec_cb_args = cb['arguments'];
        done();        
      });
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('+ couchdb');
      checks.console_log_messages[1].should.equal('+ httpd');

      should.not.exist(checks.repoman_exec_cb_args[0]);

      checks.repoman_exec_cb_args[1][0][0].should.equal('git clone http://keywordless/repos/asf/couchdb /somedir/couchdb');
      checks.repoman_exec_cb_args[1][0][1].should.equal(true);
      checks.repoman_exec_cb_args[1][0][2].should.be.a('function');
      checks.repoman_exec_cb_args[1][1][0].should.equal('git clone http://keywordless/repos/asf/httpd/httpd/trunk/ /somedir/httpd');
      checks.repoman_exec_cb_args[1][1][1].should.equal(true);
      checks.repoman_exec_cb_args[1][1][2].should.be.a('function');
    });
  });
});
 
