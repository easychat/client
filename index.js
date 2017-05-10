#!/usr/bin/env node --harmony

var chalk = require('chalk');
const userManager = require("./user_manager.js");
const promptManager = require("./prompt_manager.js");
const Connection = require("./connection.js");
const AppCrypto = require("./appcrypto.js");
var HttpManager = require('./http_manager');
var activeConnection = null;

HttpManager.setServer(process.env.EASY_SERVER ? process.env.EASY_SERVER : "https://easy.gd/api");

var args = process.argv.slice(2);
var customEmail = null;
for(var arg of args) {
  arg = arg.split("=");
  var key = arg[0];
  var value = arg[1];
  if(key === "e" || key === "email") {
    customEmail = value;
  } else if(key === "s" || key === "server") {
    HttpManager.setServer(value);
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
    promptForChatAddress();
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

var sourceRoomKey, roomKey;

function promptForChatAddress() {
  promptManager.promptUser([
    {property: "guest", display: "Chat with"},
  ], true, function(result){
    var guest = result.guest;

    if(!guest || guest.length === 0) {
      console.log(chalk.red("Enter the email address of the person you want to chat with."))
      promptForChatAddress();
      return;
    }

    if(guest === userManager.user.email) {
      console.log(chalk.red("Type someone else's email address."))
      promptForChatAddress();
      return;
    }

    activeConnection = new Connection(userManager.user.email, guest, userManager.user.token);

    activeConnection.onOpen = function() {
      promptForRoomKey(function(){
        beginMessagePrompt();
      })
    }

    activeConnection.onMessage = function(content) {
      var textParams = content.text_params;

      if(roomKey && textParams.iv) {
        var tempMessage = content.sender + ": " + textParams.text;
        console.log(chalk.cyan(tempMessage));

        textParams = AppCrypto.decrypt(textParams, roomKey);

        setTimeout(function () {
          promptManager.deleteLastMessage(tempMessage);
          if(textParams.error) {
            console.log(chalk.red("Unable to decrypt message. Type ':set-secret' to change secret."));
          } else {
            console.log(chalk.cyan(content.sender + ":", textParams.text));
          }
        }, 200);
      } else {
        console.log(chalk.cyan(content.sender + ":", textParams.text));
      }
    }

    activeConnection.onClose = function() {
      promptForChatAddress();
    }
  });
}

let commands = [
  {name: ":set-secret", handler: function(){
    promptForRoomKey(function(){
      beginMessagePrompt();
    })
  }},
  {name: ":show-secret", handler: function(){
    console.log(sourceRoomKey);
    beginMessagePrompt();
  }},
  {name: ":server", handler: function(){
    console.log(HttpManager.getServer.href);
    beginMessagePrompt();
  }},
]

function isMessageCommand(message) {
  for(var cmd of commands) {
    if(cmd.name === message) {
      return true;
    }
  }

  return false;
}

function handleCommand(command) {
  commands.filter(function(cmd){return cmd.name === command})[0].handler();
}


function promptForRoomKey(callback) {
  promptManager.promptUser([
    {property: "key", display: "Enter secret sentence (optional)"},
  ], true, function(result){
    var key = result.key;
    if(key && key.length > 0) {
      roomKey = AppCrypto.sha256(key);
      sourceRoomKey = key;
    }
    callback();
  });
}

function beginMessagePrompt() {

  promptManager.beginMessagePrompt();
  promptManager.onNewLine = function(message) {
    if(isMessageCommand(message)) {
      handleCommand(message);
      return;
    }

    var textParams;
    if(roomKey) {
      textParams = AppCrypto.encrypt(message, roomKey);
    } else {
      textParams = {text: message}
    }

    activeConnection.sendMessage({text_params: textParams});

    var tempMessage = userManager.user.email + ": " + textParams.text;
    console.log(chalk.magenta(tempMessage));
    setTimeout(function () {
      promptManager.deleteLastMessage(tempMessage);
      console.log(chalk.magenta(userManager.user.email + ": " + message));
    }, 200);
  }
}
