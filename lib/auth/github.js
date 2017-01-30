var bag = require('bagofrequest');
var github = require('github');
var url = require('url');
var dotfile = require('dotfile')('repomanrc');
var BluePromise = require('bluebird');

/**
 * class GitHub
 * Configuration generator for remote GitHub repositories.
 *
 * @param {String} user: GitHub username
 * @param {String} pass: GitHub password
 */
function GithubAuth() {

  var opts = {
    version: '3.0.0',
    timeout: 30000
  };

  var proxy = bag.proxy();
  if (proxy) {
    proxy = url.parse(proxy);
    opts.proxy = {
      host: proxy.hostname,
      port: proxy.port
    };
  }

  this.gh = new github(opts);
}

GithubAuth.prototype.authBasic = function(user, pass){ 
  return this.gh.authenticate({
    type: 'basic',
    username: user,
    password: pass
  });
};


GithubAuth.prototype.fetchAndStoreAuthToken = function(optionalTwoFactor){
  var self = this;
  return new BluePromise(function(s, f){
    var headers = {};    
    if(optionalTwoFactor){
      headers["X-GitHub-OTP"] = optionalTwoFactor;
    }
    self.gh.authorization.create({
      scopes: ["user", "public_repo", "repo", "repo:status", "gist"],
      note: "read repos for repoman4",
      headers: headers
    }, function(err, res) {      
      if (res && res.token) {
        self.ghToken = res.token;
        console.log('got Github auth token');      

        dotfile.exists(function (yesno) {
          dotfile.write({githubAuthToken : self.ghToken}, function (err) {
            dotfile.read(function (err, disk) {
              console.log('saved Github auth');
              console.log(disk);
              s();
            });
          });
        });
      } else if(err){
          console.log(err);
          f(err);
        }      
    });  
  });
};


GithubAuth.prototype.readAuthToken = function(){
  return new BluePromise(function(s, f){   
    dotfile.exists(function (yesno) {
      if(yesno){
        dotfile.read(function (err, disk) {
          if(disk.githubAuthToken){           
            s(disk.githubAuthToken);
          } else {
            f(new Error('no auth token in dotfile'));
          }
        });
      } else {
        f(new Error('no dotfile'));
      }
    });
  });
}


module.exports = GithubAuth;
