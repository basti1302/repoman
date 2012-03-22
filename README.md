Repoman [![http://travis-ci.org/cliffano/repoman](https://secure.travis-ci.org/cliffano/repoman.png?branch=master)](http://travis-ci.org/cliffano/repoman)
-------

Repoman is a simple multi-repository management tool.

Installation
------------

    npm install -g repoman

Usage
-----

Create repoman.json file:

    {
      "ae86": {
        "type": "git",
        "url": "ssh://git@github.com/cliffano/ae86.git"
      },
      "bloojm": {
        "type": "svn",
        "url": "https://bloojm.googlecode.com/svn/trunk"
      },
      "nestor": {
        "type": "git",
        "url": "http://github.com/cliffano/nestor"
      }
    }

Initialise local repositories:

    repoman init

Retrieve latest code from remote repositories:

    repoman get

Display new and modified files:

    repoman changes

Save local code to remote repositories:

    repoman save

Delete local repositories:

    repoman delete

At the moment, Repoman only supports Git and Subversion.

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

Authentication
--------------

It's much easier to authenticate using keys over SSH:

* Git: [GitHub](http://help.github.com/set-up-git-redirect/), [Bitbucket](http://confluence.atlassian.com/display/BITBUCKET/Using+the+SSH+protocol+with+bitbucket).
* [SVN](http://tortoisesvn.net/ssh_howto.html)

Otherwise, username/password will be prompted as usual.

Colophon
--------

Follow [@cliffano](http://twitter.com/cliffano) on Twitter.
