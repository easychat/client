var dirty = require('dirty');
var HttpManager = require('./http_manager');
const AppCrypto = require("./appcrypto.js");
var user = {};

class UserManager {

  constructor() {
    this.db = dirty('user.db');
  }

  get user() {
    return user;
  }

  loadSavedUser(callback) {
    this.db.on('load', function() {
      user = this.db.get('user') || {};
      callback(user);
    }.bind(this));

  }

  saveUser() {
    this.db.set("user", user);
  }

  handleAuthSuccess(response) {
    this.user.token = response.token;
    this.user.email = response.user.email;
    this.saveUser();
  }

  getRegistrationStatus(email, callback) {
    HttpManager.get("/auth/status", {email: email}, function(response){
      callback(response.status);
    }, function(error){
      console.log("Status error:", error);
      callback(null);
    })
  }

  signIn(email, password, callback) {
    HttpManager.post("/auth/sign_in", {password: AppCrypto.sha256(password), email: email}, function(response){
      this.handleAuthSuccess(response);
      callback(user);
    }.bind(this), function(error){
      console.error("Error signing in", error);
      callback(null);
    })
  }

  register(email, password, callback) {
    HttpManager.post("/auth", {email: email, password: AppCrypto.sha256(password)}, function(response){
      this.handleAuthSuccess(response);
      callback(response);
    }.bind(this), function(error){
      console.error("Registration error:", error);
      callback(null);
    })
  }

  logout(callback) {
    this.db.rm("user", callback);
  }

}

module.exports = new UserManager()
