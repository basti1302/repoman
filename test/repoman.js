var bag = require('bagofcli'),
  buster = require('buster-node'),
  fs = require('fs'),
  fsx = require('fs.extra'),
  GitHub = require('../lib/github'),
  Gitorious = require('../lib/gitorious'),
  Local = require('../lib/local'),
  referee = require('referee'),
  Repoman = require('../lib/repoman'),
  assert = referee.assert;

buster.testCase('repoman - config', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockFs = this.mock(fs);
    this.mockGitHub = this.mock(GitHub.prototype);
    this.mockGitorious = this.mock(Gitorious.prototype);
    this.mockLocal = this.mock(Local.prototype);
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
    this.mockGitHub.expects('generate').once().withArgs(['someuser'], ['someorg']).callsArgWith(2, null, { foo: 'bar' });
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with GitHub repositories', '.repoman.json');
    this.mockFs.expects('writeFile').once().withArgs('.repoman.json', '{\n  "foo": "bar"\n}').callsArgWith(2, null);
    this.repoman.config({ github: { user: 'someuser', org: 'someorg' } }, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should pass error to callback when an error occurs while creating config containing github repos': function (done) {
    this.mockGitHub.expects('generate').once().withArgs([], []).callsArgWith(2, new Error('some error'));
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with GitHub repositories', '.repoman.json');
    this.repoman.config({ github: {} }, function (err, result) {
      assert.equals(err.message, 'some error');
      done();
    });
  },
  'should create .repoman.json containing repos on gitorious when gitorious config is specified': function (done) {
    this.mockGitorious.expects('generate').once().withArgs(['someproject1', 'someproject2']).callsArgWith(1, null, { foo: 'bar' });
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with Gitorious repositories', '.repoman.json');
    this.mockFs.expects('writeFile').once().withArgs('.repoman.json', '{\n  "foo": "bar"\n}').callsArgWith(2, null);
    this.repoman.config({ gitorious: { url: 'http://someurl', project: 'someproject1,someproject2' } }, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should create .repoman.json containing repos on local repositories when local config is specified': function (done) {
    this.mockLocal.expects('generate').once().withArgs().callsArgWith(0, null, { foo: 'bar' });
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with local repositories', '.repoman.json');
    this.mockFs.expects('writeFile').once().withArgs('.repoman.json', '{\n  "foo": "bar"\n}').callsArgWith(2, null);
    this.repoman.config({ local: true }, function (err, result) {
      assert.isNull(err);
      done();
    });
  },
  'should pass error to callback when an error occurs while creating config containing gitorious repos': function (done) {
    this.mockGitorious.expects('generate').once().withArgs([]).callsArgWith(1, new Error('some error'));
    this.mockConsole.expects('log').once().withExactArgs('Creating configuration file: %s, with Gitorious repositories', '.repoman.json');
    this.repoman.config({ gitorious: { url: 'http://someurl' } }, function (err, result) {
      assert.equals(err.message, 'some error');
      done();
    });
  }
});

buster.testCase('repoman - exec', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockProcess = this.mock(process);
    this.mockProcess.expects('cwd').once().returns('/somedir');

    this.repos = {
      "couchdb": {
        "type": "git",
        "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
      },
      "httpd": {
        "type": "svn",
        "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
      }
    };
    this.scms = {
      "git": {
        "init": "git clone {url} {workspace}/{name}"
      },
      "svn": {
        "init": "svn checkout {url} {workspace}/{name}"
      }
    };
  },
  'should return empty results when there is no repository and scm': function (done) {
    var repoman = new Repoman();
    repoman.exec('init', { failFast: false }, function cb(err, results) {
      assert.equals(err, undefined);
      assert.equals(results, []);
      done();        
    });
  },
  'should log repositories name and execute commands with parameters applied when repositories exist': function (done) {
    this.mockConsole.expects('log').once().withExactArgs('\n+ %s', 'couchdb');
    this.mockConsole.expects('log').once().withExactArgs('> %s', 'git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb');
    this.mockConsole.expects('log').once().withExactArgs('\n+ %s', 'httpd');
    this.mockConsole.expects('log').once().withExactArgs('> %s', 'svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd');
    this.stub(bag, 'exec', function (command, fallthrough, cb) {
      assert.isTrue(fallthrough);
      cb(null, command);
    });
    var repoman = new Repoman(this.repos, this.scms);
    repoman.exec('init', {}, function cb(err, results) {
      assert.equals(results[0], 'git clone http://git-wip-us.apache.org/repos/asf/couchdb.git /somedir/couchdb');
      assert.equals(results[1], 'svn checkout http://svn.apache.org/repos/asf/httpd/httpd/trunk/ /somedir/httpd');
      done();        
    });
  },
  'should execute command as-is on each repository when command is unsupported': function (done) {
    this.mockConsole.expects('log').once().withExactArgs('\n+ %s', 'couchdb');
    this.mockConsole.expects('log').once().withExactArgs('> %s', 'echo "Created /somedir/couchdb/.gitignore file";');
    this.mockConsole.expects('log').once().withExactArgs('\n+ %s', 'httpd');
    this.mockConsole.expects('log').once().withExactArgs('> %s', 'echo "Created /somedir/httpd/.gitignore file";');
    this.stub(bag, 'exec', function (command, fallthrough, cb) {
      assert.isTrue(fallthrough);
      cb(null, command);
    });
    var repoman = new Repoman(this.repos, this.scms);
    repoman.exec('touch .gitignore; echo "Created {workspace}/{name}/.gitignore file";', undefined, function cb(err, results) {
      assert.equals(results[0], 'cd /somedir/couchdb; touch .gitignore; echo "Created /somedir/couchdb/.gitignore file";');
      assert.equals(results[1], 'cd /somedir/httpd; touch .gitignore; echo "Created /somedir/httpd/.gitignore file";');
      done();        
    });
  }
});

buster.testCase('repoman - clean', {
  setUp: function () {
    this.repos = {
      "couchdb": {
        "type": "git",
        "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
      },
      "httpd": {
        "type": "svn",
        "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
      }
    };
  },
  'should pass repositories keys as list value': function (done) {
    var repoman = new Repoman(this.repos);
    repoman.list(function (err, result) {
      assert.isNull(err);
      assert.equals(result, ['couchdb', 'httpd']);
      done();
    });
  }
});

buster.testCase('repoman - clean', {
  setUp: function () {
    this.mockConsole = this.mock(console);
    this.mockFs = this.mock(fs);
    this.mockFsx = this.mock(fsx);
    this.mockProcess = this.mock(process);

    this.mockProcess.expects('cwd').returns('/somedir');
    var repos = {
      "couchdb": {
        "type": "git",
        "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
      },
      "httpd": {
        "type": "svn",
        "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
      }
    };
    this.repoman = new Repoman(repos);
  },
  'should return a list of non-repo dirs to delete during dry run': function (done) {
    var dirs = ['dir1', 'couchdb', 'httpd', 'dir2'];
    this.mockFs.expects('readdir').withArgs('/somedir').callsArgWith(1, null, dirs);
    this.repoman.clean(true, function (err, results) {
      assert.isNull(err);
      assert.equals(results, ['dir1', 'dir2']);
      done();
    });
  },
  'should remove a list of non-repo dirs during non dry run': function (done) {
    var dirs = ['dir1', 'couchdb', 'httpd', 'dir2'];
    this.mockFs.expects('readdir').withArgs('/somedir').callsArgWith(1, null, dirs);
    this.mockConsole.expects('log').withExactArgs('- %s has been deleted', 'dir1');
    this.mockConsole.expects('log').withExactArgs('- %s has been deleted', 'dir2');
    this.mockFsx.expects('remove').withArgs('dir1').callsArgWith(1, null, 'dir1');
    this.mockFsx.expects('remove').withArgs('dir2').callsArgWith(1, null, 'dir2');

    this.repoman.clean(false, function (err, results) {
      assert.isNull(err);
      assert.equals(results, ['dir1', 'dir2']);
      done();
    });
  },
  'should pass error to callback when an error occurs while reading the workspace dir': function (done) {
    var dirs = ['dir1', 'couchdb', 'httpd', 'dir2'];
    this.mockFs.expects('readdir').withArgs('/somedir').callsArgWith(1, new Error('some error'));
    this.repoman.clean(true, function (err, results) {
      assert.equals(err.message, 'some error');
      done();
    });
  }
});

buster.testCase('repoman - _determineRepoType', {
  setUp: function () {
    this.repoman = new Repoman();
  },
  'should determine repo type based on keywords when repo config does not have type property': function () {
    assert.equals(
      this.repoman._determineRepoType({ url: 'http://git-wip-us.apache.org/repos/asf/couchdb.git' }),
      'git');
    assert.equals(
      this.repoman._determineRepoType({ url: 'http://svn.apache.org/repos/asf/httpd/httpd/trunk/' }),
      'svn');
    assert.equals(
      this.repoman._determineRepoType({ url: 'http://somesubversion/repo' }),
      'svn');
  },
  'should default repo type to git when repo config does not have type property and URL does not contain repo keyword': function () {
    assert.equals(
      this.repoman._determineRepoType({ url: 'http://unknown/repo' }),
      'git');
  },
  'should use type if specified in repo': function () {
    assert.equals(
      this.repoman._determineRepoType({ url: 'http://unknown/repo', type: 'svn' }),
      'svn');
  }
});
