var bag = require('bagofholding'),
  buster = require('buster'),
  config = require('../lib/config'),
  fs = require('fs'),
  fsx = require('fs.extra'),
  Repoman = require('../lib/repoman');

buster.testCase('repoman - config', {
  setUp: function () {
    this.mockConfig = this.mock(config);
    this.mockConsole = this.mock(console);
    this.mockFs = this.mock(fs);
    this.repoman = new Repoman();
  },
  'should copy sample couchpenter.js file to current directory when init is called': function (done) {
    this.mockConsole.expects('log').once().withExactArgs('Creating sample configuration file: %s', '.repoman.json');
    this.stub(fsx, 'copy', function (src, dest, cb) {
      assert.isTrue(src.match(/\/examples\/.repoman.json$/).length === 1);
      assert.equals(dest, '.repoman.json');
      cb();
    });
    this.repoman.config({}, function (err, result) {
      assert.equals(err, undefined);
      done();
    });
  },
  'should create .repoman.json containing repos on github when github config is specified': function (done) {
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with GitHub repositories', '.repoman.json');
    this.mockConfig.expects('github').once().callsArgWith(1, null, { foo: 'bar' });
    this.mockFs.expects('writeFile').once().withArgs('.repoman.json', '{\n  "foo": "bar"\n}').callsArgWith(2, null);
    this.repoman.config({ github: { user: 'someuser' } }, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should pass error to callback when an error occurs while creating config containing github repos': function (done) {
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with GitHub repositories', '.repoman.json');
    this.mockConfig.expects('github').once().callsArgWith(1, new Error('some error'));
    this.repoman.config({ github: { user: 'someuser' } }, function (err, result) {
      assert.equals(err.message, 'some error');
      done();
    });
  }
});
/*
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

    it('should create .repoman.json file containing GitHub repositories when config is called with github flags', function (done) {
      mocks.requires = {
        fs: {
          writeFile: function (file, data, cb) {
            checks.fs_writeFile_file = file;
            checks.fs_writeFile_data = data;
            cb();
          }
        },
        './config': {
          github: function (opts, cb) {
            checks.github_opts = opts;
            cb(null, {
              "someuserrepo1": {
                "url": "someusergiturl1"
              },
              "someuserrepo2": {
                "url": "someusergiturl2"
              },
              "someorgrepo1": {
                "url": "someorggiturl1"
              },
              "someorgrepo2": {
                "url": "someorggiturl2"
              }
            });
          }
        }
      };
      repoman = new (create(checks, mocks))();
      repoman.config({ github: { user: 'someuser', org: 'someorg', auth: { user: 'someauthuser', pass: 'someauthpass' } } }, function () {
        done();
      }); 
      checks.github_opts.user.should.equal('someuser');
      checks.github_opts.org.should.equal('someorg');
      checks.github_opts.auth.user.should.equal('someauthuser');
      checks.github_opts.auth.pass.should.equal('someauthpass');
      checks.fs_writeFile_file.should.equal('.repoman.json');
      checks.fs_writeFile_data.should.equal('{\n  "someuserrepo1": {\n    "url": "someusergiturl1"\n  },\n  "someuserrepo2": {\n    "url": "someusergiturl2"\n  },\n  "someorgrepo1": {\n    "url": "someorggiturl1"\n  },\n  "someorgrepo2": {\n    "url": "someorggiturl2"\n  }\n}');
      checks.console_log_messages.length.should.equal(1);
      checks.console_log_messages[0].should.equal('Creating configuration file: .repoman.json, with GitHub repositories');
    });
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

  describe('clean', function () {

    it('should pass an error when directory does not exist', function (done) {
      checks.fsx_remove_files = [];
      mocks.process_cwd = '/somedir';
      mocks.requires = {
        fs: {
          readdir: function (dir, cb) {
            dir.should.equal('/somedir');
            cb(new Error('dir not found'));
          }
        }
      };
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        };
      repoman = new (create(checks, mocks))(repos);
      repoman.clean(false, function (err, results) {
        checks.clean_err = err;
        done();        
      });
      checks.clean_err.message.should.equal('dir not found');
    });

    it('should remove nothing when only hidden files exist', function (done) {
      checks.fsx_remove_files = [];
      mocks.process_cwd = '/somedir';
      mocks.requires = {
        fs: {
          readdir: function (dir, cb) {
            dir.should.equal('/somedir');
            cb(null, ['.repoman.json', '.bob.json']);
          }
        }
      };
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        };
      repoman = new (create(checks, mocks))(repos);
      repoman.clean(false, function (err, results) {
        should.not.exist(err);
        should.not.exist(results[0]);
        should.not.exist(results[1]);
        done();
      });
      checks.fsx_remove_files.length.should.equal(0);
      checks.console_log_messages.length.should.equal(0);
    });

    it('should remove non-repos files and directories when they exist', function (done) {
      checks.fsx_remove_files = [];
      mocks.process_cwd = '/somedir';
      mocks.requires = {
        fs: {
          readdir: function (dir, cb) {
            dir.should.equal('/somedir');
            cb(null, ['foo', 'couchdb', 'httpd', 'bar']);
          }
        },
        'fs.extra': {
          remove: function (file, cb) {
            checks.fsx_remove_files.push(file);
            cb(null);
          }
        }
      };
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        };
      repoman = new (create(checks, mocks))(repos);
      repoman.clean(false, function (err, results) {
        should.not.exist(err);
        done();        
      });
      checks.fsx_remove_files.length.should.equal(2);
      checks.fsx_remove_files[0].should.equal('foo');
      checks.fsx_remove_files[1].should.equal('bar');
      checks.console_log_messages.length.should.equal(2);
      checks.console_log_messages[0].should.equal('- foo has been deleted');
      checks.console_log_messages[1].should.equal('- bar has been deleted');
    });

    it('should return a list of files and directories to be removed when clean is a dry run', function (done) {
      checks.fsx_remove_files = [];
      mocks.process_cwd = '/somedir';
      mocks.requires = {
        fs: {
          readdir: function (dir, cb) {
            dir.should.equal('/somedir');
            cb(null, ['.bob.json', 'foo', 'couchdb', 'httpd', 'bar']);
          }
        },
        'fs.extra': {
          remove: function (file, cb) {
            checks.fsx_remove_files.push(file);
            cb(null);
          }
        }
      };
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        };
      repoman = new (create(checks, mocks))(repos);
      repoman.clean(true, function (err, results) {
        should.not.exist(err);
        checks.repoman_clean_results = results;
        done();        
      });
      checks.fsx_remove_files.length.should.equal(0);
      checks.repoman_clean_results.length.should.equal(2);
      checks.repoman_clean_results[0].should.equal('foo');
      checks.repoman_clean_results[1].should.equal('bar');
    });

    it('should return empty list when clean is a dry run and none should be deleted', function (done) {
      checks.fsx_remove_files = [];
      mocks.process_cwd = '/somedir';
      mocks.requires = {
        fs: {
          readdir: function (dir, cb) {
            dir.should.equal('/somedir');
            cb(null, ['.bob.json', 'couchdb', 'httpd']);
          }
        },
        'fs.extra': {
          remove: function (file, cb) {
            checks.fsx_remove_files.push(file);
            cb(null);
          }
        }
      };
      var repos = {
          "couchdb": {
            "url": "http://keywordless/repos/asf/couchdb"
          },
          "httpd": {
            "url": "http://keywordless/repos/asf/httpd/httpd/trunk/"
          }
        };
      repoman = new (create(checks, mocks))(repos);
      repoman.clean(true, function (err, results) {
        should.not.exist(err);
        checks.repoman_clean_results = results;
        done();        
      });
      checks.fsx_remove_files.length.should.equal(0);
      checks.repoman_clean_results.length.should.equal(0);
    });
  });
});
*/
