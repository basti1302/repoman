var buster = require('buster-node'),
  gitorioujs = require('gitoriou.js'),
  Gitorious = require('../../lib/generator/gitorious'),
  referee = require('referee'),
  assert = referee.assert;

buster.testCase('gitorious - generate', {
  setUp: function () {
    this.mockClient = { getProject: function (project, cb) {} };
    this.mockGitorioujs = this.mock(gitorioujs);
  },
  'should pass error when an error occurs while retrieving project': function (done) {
    this.mockGitorioujs.expects('Gitorious').once().withExactArgs({ url: 'http://someurl' }).returns(this.mockClient);
    this.stub(this.mockClient, 'getProject', function (project, cb) {
      assert.equals(project, 'someproject');
      cb(new Error('some error'));
    });
    var gitorious = new Gitorious('http://someurl');
    gitorious.generate(['someproject'], function (err, config) {
      assert.equals(err.message, 'some error');
      assert.equals(config, {});
      done();
    });
  },
  'should pass repo URL when there is no error': function (done) {
    this.mockGitorioujs.expects('Gitorious').once().withExactArgs({ url: 'http://someurl' }).returns(this.mockClient);
    this.stub(this.mockClient, 'getProject', function (project, cb) {
      assert.equals(project, 'someproject');
      var repos = [
        { name: 'somerepo1', clone_url: 'somecloneurl1' },
        { name: 'somerepo2', clone_url: 'somecloneurl2' }
      ];
      cb(null, { project: { repositories: { mainlines: { repository: repos } } } });
    });
    var gitorious = new Gitorious('http://someurl');
    gitorious.generate(['someproject'], function (err, config) {
      assert.equals(err, undefined);
      assert.equals(config.somerepo1, { url: 'somecloneurl1' });
      assert.equals(config.somerepo2, { url: 'somecloneurl2' });
      done();
    });
  }
});
