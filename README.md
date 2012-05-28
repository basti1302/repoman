Overview [![http://travis-ci.org/cliffano/repoman](https://secure.travis-ci.org/cliffano/repoman.png?branch=master)](http://travis-ci.org/cliffano/repoman)
--------
Repoman is a simple multi-repository management command-line tool.

It is handy when you're working on multiple SCM repositories and/or on multiple computers.
E.g. rather than updating each repository one by one, it's easier to just run `repoman get` and update all of them in one go. Rather than checking for uncommitted local changes one by one, it's easier to just run `repoman changes` and check all in one go.
And if you often switch between multiple computers, simply use the same .repoman.json file on those computers and easily manage the same set of repositories.

Installation
------------

    npm install -g repoman

Usage
-----

Create sample .repoman.json configuration file:

    repoman config

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

It's better to place this file in your home directory (process.env.USERPROFILE on Windows, process.env.HOME on *nix), so you can use Repoman from any directory. If this file is placed in another directory, then Repoman can only be used from that same directory.

If configuration file exists in both current and home directories, then the one in current directory takes precedence over the one in the home directory.

Authentication
--------------

It's recommended to authenticate using keys over SSH:

* Git: [GitHub](http://help.github.com/set-up-git-redirect/), [Bitbucket](http://confluence.atlassian.com/display/BITBUCKET/Using+the+SSH+protocol+with+bitbucket).
* [SVN](http://tortoisesvn.net/ssh_howto.html)

If keys are not set up, then username/password will be prompted interactively.
