#!/usr/bin/env node --harmony

var chalk = require('chalk');
const userManager = new (require("./user_manager.js"))();
const promptManager = new (require("./prompt_manager.js"))();
const Connection = require("./connection.js");
const AppCrypto = new (require("./appcrypto.js"))();
var activeConnection = null;

var args = process.argv.slice(2);
var customEmail = null;
for(var arg of args) {
  arg = arg.split("=");
  var key = arg[0];
  var value = arg[1];
  if(key === "email") {
    customEmail = value;
  }
}

if(customEmail) {
  loadApplication(false);
} else {
  userManager.loadSavedUser(function(user){
    loadApplication(true);
  })
}


function loadApplication(authenticated) {

  var onReady = function() {
    console.log(chalk.cyan("Signed in as", userManager.user.email));
    beginMessaging();
  }

  if(!authenticated) {

    var onEmail = function(email) {
      // check if registered
      userManager.getRegistrationStatus(email, function(status){
        if(!status) {
          // unable to check status
        } else {
          // is registered
          if(status === "registered") {
            onExistingUser(email);
          } else {
            // not registered
            onNewUser(email);
          }
        }
      });
    }

    var onExistingUser = function(email) {
      promptManager.promptUser([
        {property: "password", display: "Password"},
      ], true, function(pwResult){
        var password = pwResult.password;

        // sign in
        userManager.signIn(email, password, function(user){
          if(!user) {
            // invalid signin
            console.log("Invalid signin, try again.");
            onExistingUser(email);
            return;
          }
          onReady();
        })
      });
    }

    var onNewUser = function(email) {
      promptManager.promptUser([
        {property: "password", display: "Choose password"},
      ], true, function(pwResult){
        var password = pwResult.password;
        userManager.register(email, password, function(response){
          if(!response) {
            // error registering
            return;
          }
          onReady();
        })
      })
    }

    if(customEmail) {
      onEmail(customEmail);
    } else {
      // ask for email
      promptManager.promptUser([
        {property: "email", display: "Email"},
      ], true, function(result){
        var email = result.email;
        onEmail(email);
      })
    }
  } else {
    // start messaging
    onReady();
  }
}

var roomKey;

function beginMessaging() {
  promptManager.promptUser([
    {property: "guest", display: "Chat with"},
  ], true, function(result){
    var guest = result.guest;

    activeConnection = new Connection(userManager.user.email, guest);

    activeConnection.onOpen = function() {
      promptForRoomKey(function(){
        beginMessagePrompt();
      })
    }

    activeConnection.onMessage = function(payload) {
      var message = payload.message;

      var tempMessage = payload.sender + ": " + message.content;
      console.log(chalk.cyan(tempMessage));

      if(roomKey) {
        message = AppCrypto.decrypt(message, roomKey);
        setTimeout(function () {
          promptManager.deleteLastMessage(tempMessage);
          console.log(chalk.cyan(payload.sender + ":", message.content));
        }, 200);
      } else {
        console.log(chalk.cyan(payload.sender + ":", message.content));
      }
    }
  });
}


function promptForRoomKey(callback) {
  promptManager.promptUser([
    {property: "key", display: "Enter secret sentence (optional)"},
  ], true, function(result){
    var key = result.key;
    if(key && key.length > 0) {
      roomKey = AppCrypto.sha256(key);
    }
    callback();
  });
}

function beginMessagePrompt() {

  promptManager.beginMessagePrompt();
  promptManager.onNewLine = function(message) {
    if(roomKey) {
      payload = AppCrypto.encrypt(message, roomKey);
    } else {
      payload = {content: message}
    }
    var data = {
      command: "message",
      data: JSON.stringify({action: "send_message", message: payload, sender: userManager.user.email}),
      identifier: JSON.stringify({channel: "MessagesChannel", room: activeConnection.room})
    };

    activeConnection.send(data);

    var tempMessage = userManager.user.email + ": " + payload.content;
    console.log(chalk.yellow(tempMessage));
    setTimeout(function () {
      promptManager.deleteLastMessage(tempMessage);
      console.log(chalk.yellow(userManager.user.email + ": " + message));
    }, 200);
  }
}
