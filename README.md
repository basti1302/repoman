<img align="right" src="https://raw.github.com/basti1302/repoman/master/avatar.jpg" alt="Avatar"/>

[![Build Status](https://img.shields.io/travis/basti1302/repoman.svg)](http://travis-ci.org/basti1302/repoman)
[![Dependencies Status](https://img.shields.io/david/basti1302/repoman.svg)](http://david-dm.org/basti1302/repoman)
[![Published Version](https://img.shields.io/npm/v/repoman.svg)](http://www.npmjs.com/package/repoman)
<br/>
[![npm Badge](https://nodei.co/npm/repoman.png)](http://npmjs.org/package/repoman)

Repoman
-------

Multi-repository management command-line tool with support for Git and Subversion.

Repoman is a handy tool when you're working on multiple related version control repositories. Rather than updating each repository one by one, repoman allows you to just run `repoman get` and update all of them in one go. Rather than checking for uncommitted local changes one by one, you can run `repoman changes` or `repoman report` and check all in one go.

If you often switch between multiple computers, you can use the same .repoman.json file on those computers and easily manage the same set of repositories or share a .repoman.json file with you team so everyone can clone the required set of repositories in one step.

If you are have a GitHub account, you can use Repoman to clone all of your repositories from GitHub with a one liner: `repoman config --github-user <user> && repoman init` .

Installation
------------

```
npm install -g repoman
```

Usage
-----

### Initial Configuration

* `repoman config`: Create sample .repoman.json configuration file.
* `repoman config --github-user basti1302`: Create .repoman.json containing public GitHub projects of a user.
* `repoman config --github-user basti1302 --github-auth-user basti1302 --github-auth-pass somepassword`: Create .repoman.json containing private and public GitHub projects. Basic authentication will be used to get the private projects. This will not work if you have two-factor authentication enabled, see `repoman signin` for support for two factor authentication.
* `repoman signin`: Starts repoman's GitHub authentication assistant (asking for your GitHub user name, password and a two factor auth token). The generated authentication token is stored in `~/.repomanrc.json` and used for subsequent requests to GitHub (for example, with repoman config --github-user username`).
* `repoman config --github-org jenkinsci`: Create .repoman.json containing GitHub projects of an organisation.
* `repoman config --github-user basti1302 --github-org jenkinsci,github`: Create .repoman.json containing GitHub projects of multiple users and organisations.
* `repoman config --bitbucket-auth-user basti1302 --bitbucket-auth-pass somepassword`: Create .repoman.json containing Bitbucket projects.
* `repoman config --local`: Create .repoman.json configuration file from local repositories in current directory.
* `repoman clean`: Delete local repositories not managed by Repoman (that is, not configured in .repoman.json).

### Initial Clone/Checkout

* `repoman init`: Initialise local repositories. `repoman init` clones/checks out all repositories mentioned in .repoman.json into the current folder. You can also run this safely when you already have cloned some of those repositories before, after adding more repositories to the .repoman.json file. Existing repositories/directories will simply be skipped.

### Everyday Workflow Commands

* `repoman get`: Update local repositories with changes from remote repositories. For git, it executes `git pull --rebase`, for SVN, `svn up` is executed.
* `repoman changes`: Display the changes in local repositories.
* `repoman report`: Display a brief status summary for each repository (branch name, uncommitted changes, unpushed commits). Here is an example of how this looks like:
```
┌────────────────┬────────────────────────┬─────────────┬──────────┐
│ Repository     │ Branch                 │ Uncommitted │ Unpushed │
│ httpd          │ master                 │ Clean       │ 0        │
│ nodejs         │ feature-branch-xyz     │ Clean       │ 11       │
│ benchmarks     │ master                 │ Clean       │ 0        │
│ internal-tools │ master                 │ Clean       │ 0        │
│ svn-repo       │ trunk                  │ Clean       │ N. A.    │
│ documentation  │ master                 │ Dirty       │ 0        │
│ ui             │ another-feature-branch │ Clean       │ 9        │
└────────────────┴────────────────────────┴─────────────┴──────────┘
```
* `repoman save`: Update remote repositories with changes from local repositories.
* `repoman delete`: Delete local repositories.
* `repoman undo`: Remove uncommitted changes from local repositories.

### Custom commands

* `repoman exec <command>`: Execute custom command against local repositories.

You can use [mustache.js](https://github.com/janl/mustache.js) templates in the custom command. The variables `workspace` and `name` will be substituted by the workspace directory (where your `.repoman.json` lives) and the directory name of the repository respectively. Additionally, the variable `pathseparator` will be replaced by [`path.sep`](https://nodejs.org/api/path.html#path_path_sep), that is by `\\` on Windows and `/` on all Unix-based operating systems. Note: It is recommended to use `{{{` and `}}}` instead of `{{` and `}}` to avoid the HTML-escaping mustache.js does for the latter.

Here are some examples for custom commands:

* `repoman exec 'touch .gitignore && echo "Created {{{workspace}}}/{{{name}}}/.gitignore file;"'`: Create a .gitignore file in each repository and print a message.
* `repoman --fail-fast exec 'chown -R user:group /some/path/{name}';`: Execute custom command and exit as soon as there is any command failure.

### Advanced Examples

* `repoman list | parallel nestor build {}`: Write repository names to standard output and pipe to another command.
* `repoman -c somerepoman.json init|get|changes|save|delete|clean|exec|report|list`: Use `somerepoman.json` instead of the default `.repoman.json` configuration file.
* `repoman --tags apache,github init|get|changes|save|delete|exec|report|list`: Filter repositories by tags, if multiple tags (comma-separated) are specified then repo will be included if it matches at least one tag.
* `repoman --regex .*github.* init|get|changes|save|delete|exec|report|list`: Filter repositories by regex against repo name or URL.

Configuration
-------------

Repositories can be configured in .repoman.json file:

```
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
```

Type property is optional. If not provided, Repoman will try to determine the type from the URL by checking the existence of keywords: git, svn, subversion. If type can't be determined from the URL, it defaults to git.

Repoman will choose which configuration file to use in this order:

1. Any file specified in -c/--config-file flag
2. .repoman.json file in the current directory
3. .repoman.json file in home directory (process.env.USERPROFILE on Windows, process.env.HOME on *nix)



SCM Command Mappings
--------------------

Repoman uses the following SCM command mapping.

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
    <td>git pull --rebase</td>
    <td>svn up</td>
  </tr>
  <tr>
    <td>repoman changes</td>
    <td>git status -s && git log --branches --not --remotes --oneline</td>
    <td>svn stat</td>
  </tr>
  <tr>
    <td>repoman save</td>
    <td>git push origin master</td>
    <td>svn commit -m "Commited by Repoman"</td>
  </tr>
  <tr>
    <td>repoman undo</td>
    <td>git reset --hard</td>
    <td>svn revert -R .</td>
  </tr>
</table>

Contributing
------------

Run `npm run build` to kick off the full build including tests, integration tests, coverage etc. Note: Currently, the integration tests will fail on systems where git uses a different localization than English.

Articles
--------

* [Introducing Repoman](http://blog.cliffano.com/2013/05/26/introducing-repoman/)

History
-------

Repoman has been developed by @cliffano until late 2015. Nowadays it is maintained by @basti1302.

* 1.6.0 (13.11.2019): Add new commands `add` and `remove` to add/remove repos from a config.
* 1.5.5 (12.11.2019): Fix "repoman config --local crashes when a repo has no origin" (#30, thanks @stennie).
* 1.5.4 (11.03.2018): Fix breaking changes from upgrade to octokit/rest.js, add documentation about `repoman signin` and `--github-auth-user`/`--github-auth-pass`.
* 1.5.3 (18.02.2018): Update all dependencies, upgrade to octokit/rest.js
* 1.5.2 (14.02.2018): Update to bagofcli@1.1.0.
* 1.5.1 (14.02.2018): README overhaul.
* 1.5.0 (13.02.2018): Improve layout for `report` command.
* 1.4.0 (11.02.2018): Add new command `report`.
* 1.3.0 (30.05.2017): Add new options `--github-use-ssh` and `--remove-extraneous` (see #23 and #24, thanks to @scamden).
* 1.1.0 (21.06.2016): Improve error message when .repoman.json is not found (#19).
