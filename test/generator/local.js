var buster  = require('buster-node');
var fs      = require('fs');
var ini     = require('ini');
var Local   = require('../../lib/generator/local');
var referee = require('referee');
var svnInfo = require('svn-info');
var assert  = referee.assert;

buster.testCase('local - generate', {
  setUp: function () {
    this.mockFs      = this.mock(fs);
    this.mockIni     = this.mock(ini);
    this.mockSvnInfo = this.mock(svnInfo);
  },
  'should construct config of git repos using git config remote origin': function (done) {

    this.mockFs.expects('readdirSync').withExactArgs('somedir').returns(['repo1', 'repo2']);
    this.mockFs.expects('existsSync').withExactArgs('repo1/.git/config').returns(true);
    this.mockFs.expects('existsSync').withExactArgs('repo2/.git/config').returns(true);
    this.mockFs.expects('readFileSync').withExactArgs('repo1/.git/config', 'utf-8').returns('somedata1');
    this.mockFs.expects('readFileSync').withExactArgs('repo2/.git/config', 'utf-8').returns('somedata2');
    this.mockIni.expects('parse').withExactArgs('somedata1').returns({ 'remote "origin"': { url: 'http://github.com/some/repo1' }});
    this.mockIni.expects('parse').withExactArgs('somedata2').returns({ 'remote "origin"': { url: 'http://github.com/some/repo2' }});

    var local = new Local('somedir');

    local.generate(function (err, result) {

      assert.isNull(err);
      assert.equals(result.repo1.type, 'git');
      assert.equals(result.repo1.url, 'http://github.com/some/repo1');
      assert.equals(result.repo2.type, 'git');
      assert.equals(result.repo2.url, 'http://github.com/some/repo2');

      done();
    });
  },
  'should construct config of svn repos using svn info repository root': function (done) {

    this.mockFs.expects('readdirSync').withExactArgs('somedir').returns(['repo1', 'repo2']);
    this.mockFs.expects('existsSync').withExactArgs('repo1/.git/config').returns(false);
    this.mockFs.expects('existsSync').withExactArgs('repo2/.git/config').returns(false);
    this.mockFs.expects('existsSync').withExactArgs('repo1/.svn/entries').returns(true);
    this.mockFs.expects('existsSync').withExactArgs('repo2/.svn/entries').returns(true);
    this.mockSvnInfo.expects('sync').withExactArgs('repo1').returns({ repositoryRoot: 'http://svnhub.com/some/repo1' });
    this.mockSvnInfo.expects('sync').withExactArgs('repo2').returns({ repositoryRoot: 'http://svnhub.com/some/repo2' });

    var local = new Local('somedir');

    local.generate(function (err, result) {

      assert.isNull(err);
      assert.equals(result.repo1.type, 'svn');
      assert.equals(result.repo1.url, 'http://svnhub.com/some/repo1');
      assert.equals(result.repo2.type, 'svn');
      assert.equals(result.repo2.url, 'http://svnhub.com/some/repo2');

      done();
    });
  },
  'should pass empty config when repo is neither git nor svn': function (done) {

    this.mockFs.expects('readdirSync').withExactArgs('somedir').returns(['repo1', 'repo2']);
    this.mockFs.expects('existsSync').withExactArgs('repo1/.git/config').returns(false);
    this.mockFs.expects('existsSync').withExactArgs('repo2/.git/config').returns(false);
    this.mockFs.expects('existsSync').withExactArgs('repo1/.svn/entries').returns(false);
    this.mockFs.expects('existsSync').withExactArgs('repo2/.svn/entries').returns(false);

    var local = new Local('somedir');

    local.generate(function (err, result) {

      assert.isNull(err);
      assert.equals(result, {});

      done();
    });
  }
});