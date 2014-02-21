<img align="right" src="https://raw.github.com/cliffano/repoman/master/avatar.jpg" alt="Avatar"/>

[![Build Status](https://secure.travis-ci.org/cliffano/repoman.png?branch=master)](http://travis-ci.org/cliffano/repoman)
[![Dependencies Status](https://david-dm.org/cliffano/repoman.png)](http://david-dm.org/cliffano/repoman)
[![Coverage Status](https://coveralls.io/repos/cliffano/repoman/badge.png?branch=master)](https://coveralls.io/r/cliffano/repoman?branch=master)
[![Published Version](https://badge.fury.io/js/repoman.png)](http://badge.fury.io/js/repoman)
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

    repoman exec 'touch .gitignore; echo "Created {workspace}/{name}/.gitignore file;"'

Execute custom command and exit as soon as there is any command failure:

    repoman --fail-fast exec 'chown -R user:group /some/path/{name}';

Write repository names to standard output and pipe to another command:

    repoman list | parallel nestor build {}

Override default .repoman.json configuration file:

    repoman -c somerepoman.json init|get|changes|save|delete|clean|exec|list

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
        "url": "http://git-wip-us.apache.org/repos/asf/couchdb.git"
      },
      "httpd": {
        "type": "svn",
        "url": "http://svn.apache.org/repos/asf/httpd/httpd/trunk/"
      },
      "node": {
        "type": "git",
        "url": "http://github.com/joyent/node"
      }
    }

Type property is optional. If not provided, Repoman will try to determine the type from the URL by checking the existence of keywords: git, svn, subversion. If type can't be determined from the URL, it defaults to git.

Repoman will choose which configuration file to use in this order:

1. Any file specified in -c/--config-file flag
2. .repoman.json file in the current directory
3. .repoman.json file in home directory (process.env.USERPROFILE on Windows, process.env.HOME on *nix)

Colophon
--------

* [Introducing Repoman](http://blog.cliffano.com/2013/05/26/introducing-repoman/)
