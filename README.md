<img align="right" src="https://raw.github.com/basti1302/repoman/master/avatar.jpg" alt="Avatar"/>

[![Build Status](https://img.shields.io/travis/basti1302/repoman.svg)](http://travis-ci.org/basti1302/repoman)
[![Dependencies Status](https://img.shields.io/david/basti1302/repoman.svg)](http://david-dm.org/basti1302/repoman)
[![Published Version](https://img.shields.io/npm/v/repoman.svg)](http://www.npmjs.com/package/repoman)
<br/>
[![npm Badge](https://nodei.co/npm/repoman.png)](http://npmjs.org/package/repoman)

Repoman
-------

Multi-repository management command-line tool.

This is handy when you're working on multiple SCM repositories and/or on multiple computers.
E.g. rather than updating each repository one by one, it's easier to just run `repoman get` and update all of them in one go. Rather than checking for uncommitted local changes one by one, it's easier to just run `repoman changes` and check all in one go.
And if you often switch between multiple computers, simply use the same .repoman.json file on those computers and easily manage the same set of repositories.

If you are a GitHub user, you can use Repoman to clone all of your repositories from GitHub with a one liner: `repoman --github-user <user> && repoman init` .

Installation
------------

    npm install -g repoman

Usage
-----

Create sample .repoman.json configuration file:

    repoman config

Create .repoman.json containing GitHub projects of a user:

    repoman config --github-user cliffano

Create .repoman.json containing GitHub projects of an organisation:

    repoman config --github-org jenkinsci

Create .repoman.json containing GitHub projects of multiple users and organisations:

    repoman config --github-user cliffano --github-org jenkinsci,github

Create .repoman.json containing Bitbucket projects:

    repoman config --bitbucket-auth-user cliffano --bitbucket-auth-pass somepassword

Create .repoman.json configuration file from local repositories in current directory:

    repoman config --local

Initialise local repositories:

    repoman init

Update local repositories with changes from remote repositories:

    repoman get

Display the changes in local repositories:

    repoman changes

Update remote repositories with changes from local repositories:

    repoman save

Delete local repositories:

    repoman delete

Delete non-Repoman local repositories:

    repoman clean

Remove uncommitted changes from local repositories:

    repoman undo

Execute custom command against local repositories:

    repoman exec 'touch .gitignore; echo "Created {{{workspace}}}/{{{name}}}/.gitignore file;"'

You can use [mustache.js](https://github.com/janl/mustache.js) templates in the custom command. The variables `workspace` and `name` will be substituted by the workspace directory (where your `.repoman.json` lives and the directory name of the repository respectively.

Execute custom command and exit as soon as there is any command failure:

    repoman --fail-fast exec 'chown -R user:group /some/path/{name}';

Write repository names to standard output and pipe to another command:

    repoman list | parallel nestor build {}

Override default .repoman.json configuration file:

    repoman -c somerepoman.json init|get|changes|save|delete|clean|exec|list

Filter repositories by tags, if multiple tags (comma-separated) are specified then repo will be included if it matches at least one tag:

    repoman --tags apache,github init|get|changes|save|delete|exec|list

Filter repositories by regex against repo name or URL:

    repoman --regex .*github.* init|get|changes|save|delete|exec|list

Repoman uses the following SCM command mapping, it currently only supports Git and Subversion:

<table>
  <tr>
    <th>Repoman</th>
    <th>Git</th>
    <th>Subversion</th>
  </tr>
  <tr>
    <td>repoman init</td>
    <td>git clone {url}</td>
    <td>svn checkout {url}</td>
  </tr>
  <tr>
    <td>repoman get</td>
    <td>git pull</td>
    <td>svn up</td>
  </tr>
  <tr>
    <td>repoman changes</td>
    <td>git status</td>
    <td>svn stat</td>
  </tr>
  <tr>
    <td>repoman save</td>
    <td>git push origin master</td>
    <td>svn commit -m "Commited by Repoman"</td>
  </tr>
  <tr>
    <td>repoman undo</td>
    <td>git stash + git stash clear</td>
    <td>svn revert -R .</td>
  </tr>
</table>
.

Configuration
-------------

Repositories can be configured in .repoman.json file:

    {
      "couchdb": {
        "type": "git",
        "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git",
        "tags": ["apache", "database"]
      },
      "httpd": {
        "type": "svn",
        "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/",
        "tags": ["apache", "webserver"]
      },
      "node": {
        "type": "git",
        "url": "http://github.com/joyent/node",
        "tags": ["github", "javascript"]
      }
    }

Type property is optional. If not provided, Repoman will try to determine the type from the URL by checking the existence of keywords: git, svn, subversion. If type can't be determined from the URL, it defaults to git.

Repoman will choose which configuration file to use in this order:

1. Any file specified in -c/--config-file flag
2. .repoman.json file in the current directory
3. .repoman.json file in home directory (process.env.USERPROFILE on Windows, process.env.HOME on *nix)

Colophon
--------

[Developer's Guide](http://cliffano.github.io/developers_guide.html#nodejs)

Build reports:

* [Code complexity report](http://cliffano.github.io/repoman/complexity/plato/index.html)
* [Unit tests report](http://cliffano.github.io/repoman/test/buster.out)
* [Test coverage report](http://cliffano.github.io/repoman/coverage/buster-istanbul/lcov-report/lib/index.html)
* [Integration tests report](http://cliffano.github.io/repoman/test-integration/cmdt.out)
* [API Documentation](http://cliffano.github.io/repoman/doc/dox-foundation/index.html)

Articles:

* [Introducing Repoman](http://blog.cliffano.com/2013/05/26/introducing-repoman/)
