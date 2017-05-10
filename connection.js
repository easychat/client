var chalk = require('chalk');
var HttpManager = require('./http_manager');
const WebSocket = require('ws');
var ws;

var path = process.env.EASY_SOCKET ? process.env.EASY_SOCKET : "wss://easy.gd/cable";

class Connection {

  constructor(localEmail, remoteEmail, token) {
    this.token = token;
    this.localEmail = localEmail;
    this.remoteEmail = remoteEmail;

    console.log(chalk.gray("Creating secure connection"));
    var ws = this.ws = new WebSocket(path, {
      perMessageDeflate: false
    });

    ws.on('error', function (err) {
      console.log("On error:", err);
    });

    ws.on('open', function open() {
      var data = {command: "subscribe", identifier: JSON.stringify({channel: "MessagesChannel", recipient: this.remoteEmail, token: token})};
      ws.send(JSON.stringify(data));
      this.onOpen();
    }.bind(this));

    ws.on('message', function incoming(data, flags) {
      data = JSON.parse(data);
      if(data.type == "ping" || data.type == "welcome") {
        // console.log("Received meta message:", data);
        return;
      }

      // console.log("Received data", data);
      if(data.type === "confirm_subscription") {
        console.log(chalk.cyan("🔒  Connected with", remoteEmail));
        return;
      }

      var content = data.message.content;
      if(content.sender === localEmail) {
        return;
      }

      if(content.meta) {
        if(content.type == "new-member") {
          console.log(chalk.yellow(content.who + " has joined the room"));
          this.send("send_message", {meta: true, type: "im-here", who: this.localEmail});
        } else if(content.type == "less-member") {
          console.log(chalk.gray(content.who + " has left the room"));
        } else if(content.type === "im-here") {
          console.log(chalk.yellow(content.who + " is here"));
        }
      } else if(content.text_params) {
        this.onMessage(content);
      }
    }.bind(this));

    ws.on('close', function close() {
      console.log(chalk.yellow('Disconnected'));
      if(this.onClose()) {
        this.onClose();
      }
    }.bind(this));
  }

  send(action, content) {
    content.sender = this.localEmail;
    var data = {
      command: "message",
      data: JSON.stringify(Object.assign({action: action}, content)),
      identifier: JSON.stringify({channel: "MessagesChannel", recipient: this.remoteEmail, token: this.token})
    };

    this.ws.send(JSON.stringify(data))
  }

  sendMessage(content) {
    this.send("send_message", content);
  }
}

module.exports = Connection
