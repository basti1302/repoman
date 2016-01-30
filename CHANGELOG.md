### 1.0.0 &ndash; 2016-01-31
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
