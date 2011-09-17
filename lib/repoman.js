var CURR_DIR = '.',
    ENCODING = 'utf8',
    MODE = 0755,
    async = require('async'),
    exec = require('child_process').exec,
    fs = require('fs');

function Repoman(confFile, workspaceDir) {

    function warmUp() {
        try {
            fs.statSync(workspaceDir);
        } catch (e) {
            if (workspaceDir !== CURR_DIR) {
                console.log('Workspace directory \'' + workspaceDir + '\' does not exist.\nFret not! Repoman shall create it for you.');
                fs.mkdirSync(workspaceDir, MODE);
            }
        }

        var conf;
        try {
            fs.statSync(confFile);
            conf = JSON.parse(fs.readFileSync(confFile, ENCODING));
        } catch (e1) {
            console.error('Unable to load ' + confFile + '.\nError: ' + e1.message);
        }
        return conf;
    }

    function hustle(action, conf) {
        function articulate(command, params) {
            var param;
            for (param in params) {
                if (params.hasOwnProperty(param)) {
                    command = command.replace(new RegExp('{' + param + '}'), params[param]);
                }
            }
            return command;
        }
        function flow(fns) {
            async.series(fns, function (err, results) {
                var repo;
                for (repo in results) {
                    if (results.hasOwnProperty(repo)) {
                        console.log('[' + ((results[repo] === true) ? ' OK ' : 'ERR') + '] ' + repo);
                    }
                }
            });     
        }
        function readyGear(repo) {
            return function (cb) {
                console.log('[' + repo + ']');
                var params = conf[repo], command, child;
                params.name = repo;
                params.workspaceDir = workspaceDir;
                command = articulate(require('./scm').scm[conf[repo].type][action], params);
                console.log(command);
                child = exec(command, function (error, stdout, stderr) {
                    if (error) {
                        console.error(error.message);
                        cb(error);
                    } else {
                        console.log(stdout);
                        cb(null, true);    
                    }
                });
            };
        }
        var fns = {}, repo;
        for (repo in conf) {
            if (conf.hasOwnProperty(repo)) {
                fns[repo] = readyGear(repo);
            }
        }
        flow(fns);
    }

    return {
        warmUp: warmUp,
        hustle: hustle
    };
}

exports.Repoman = Repoman;