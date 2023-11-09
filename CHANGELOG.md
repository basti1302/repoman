### 1.6.0 (13.11.2019)
* Add new commands `add` and `remove` to add/remove repos from a config.

### 1.5.5 (12.11.2019)
* Fix "repoman config --local crashes when a repo has no origin" (#30, thanks @stennie).

### 1.5.4 (11.03.2018)
* Fix breaking changes from upgrade to octokit/rest.js, add documentation about `repoman signin` and `--github-auth-user`/`--github-auth-pass`.

### 1.5.3 (18.02.2018)
* Update all dependencies, upgrade to octokit/rest.js

### 1.5.2 (14.02.2018)
* Update to bagofcli@1.1.0.

### 1.5.1 (14.02.2018)
* README overhaul.

### 1.5.0 (13.02.2018)
* Improve layout for `report` command.

### 1.4.0 (11.02.2018)
* Add new command `report`.

### 1.3.0 (30.05.2017)
* Add new options `--github-use-ssh` and `--remove-extraneous` (see #23 and #24, thanks to @scamden).

### 1.1.0 (21.06.2016)
* Improve error message when .repoman.json is not found (#19).

### 1.0.0 (2016-01-31)

* Use Mustache.js templates instead of Jazz templates for `repoman exec`. This is a breaking change for you if you used Jazz template substitutions in your `repoman exec` commands &ndash; that is, if you used something like `repoman exec 'touch .gitignore && echo "Created {workspace}/{name}/.gitignore file;"`. You would need to change this to `repoman exec 'touch .gitignore && echo "Created {{{workspace}}}/{{{name}}}/.gitignore file;"`.
* Make `repoman exec` work on Windows ([#20](https://github.com/basti1302/repoman/issues/20), thanks to @Guysbert for the report).
* Use `&&` instead of `;` in command lines with multiple commands, in particular, when a `cd` command is required before the actual command. That means, if repoman cannot successfully `cd` into the repository directory, it will not attempt to execute the action for this repository.
* Use `git reset --head` instead of `git stash && git stash clear` for `repoman undo`.

### 0.2.5
* Improved output for `repoman changes` for git.

### 0.2.4
* Add build reports to readme

### 0.2.3
* Fix Bitbucket repo config URL construction [faandi](https://github.com/faandi)

### 0.2.2
* Add Bitbucket generator

### 0.2.1
* Add tags and regex filter support to list command

### 0.2.0
* Change --config flag to --config-file as per README
* Add tags filter support
* Add regex filter support
* Modify config generator to merge repositories in configuration file

### 0.1.0
* Set min node engine to >= 0.10.0

### 0.0.16
* Add --local flag to config command, for generating config file from local repositories [Stephen Steneker](https://github.com/stennie)

### 0.0.15
* Change get command for git to use --rebase

### 0.0.14
* Fix clean command prompt handling
* Change test lib to buster-node + referee
* Set min node engine to >= v0.8.0

### 0.0.13
* Fix exec command argument handling.

### 0.0.12
* Add -f/--fail-fast flag
* Add list command
* Add Gitorious repositories configuration file generation
* Replace underscore with lodash, replace bagofholding with bagofcli and bagofrequest
* Display commands to be executed on each repo

### 0.0.11
* Re-add custom config file override (accidentally removed)

### 0.0.10
* Add GitHub client proxy setting

### 0.0.9
* GitHub configuration file uses clone URL

### 0.0.8
* Add support for creating configuration file containing GitHub repositories
* Add undo command
* Add clean command

### 0.0.7
* Add custom config file override
* Add exec command

### 0.0.6
* Set max node engine to < 0.9.0

### 0.0.5
* Add Windows support
* Configuration file in current directory now takes precedence over one in home directory

### 0.0.4
* Add config command for creating sample .repoman.json file

### 0.0.3
* Use cly to handle process exit
* Config file name is now .repoman.json
* Replace cly with bagofholding, replace vows with mocha
* Config file .repoman.json can now be placed at user home directory, or at current directory

### 0.0.2
* Display usage on arg-less comamand
* Upgrade vows to v0.6.1
* Use cly to parse CLI arguments and execute shell commands

### 0.0.1
* Initial version
