var chalk = require('chalk');
const WebSocket = require('ws');
var ws;

class Connection {

  constructor(localEmail, remoteEmail, token) {
    this.token = token;
    this.localEmail = localEmail;

    var room = this.room = [localEmail, remoteEmail].sort().join("|");
    console.log(chalk.cyan("Creating secure connection"));
    let path = "ws://0.0.0.0:5000/cable";
    var ws = this.ws = new WebSocket(path, {
      perMessageDeflate: false
    });

    ws.on('error', function (err) {
      console.log("On error:", err);
    });

    ws.on('open', function open() {
      console.log(chalk.cyan("🔒  Connected with", remoteEmail));
      var data = {command: "subscribe", identifier: JSON.stringify({channel: "MessagesChannel", room: room, token: token})};
      ws.send(JSON.stringify(data));
      this.onOpen();
    }.bind(this));

    ws.on('message', function incoming(data, flags) {
      data = JSON.parse(data);
      if(data.type == "ping" || data.type == "welcome" || data.type === "confirm_subscription") {
        return;
      }

      var payload = data.message.payload;
      if(payload.sender === localEmail) {
        return;
      }

      if(payload.message) {
        this.onMessage(payload);
      }
    }.bind(this));

    ws.on('close', function close() {
      console.log(chalk.yellow('Disconnected'));
      if(this.onClose()) {
        this.onClose();
      }
    }.bind(this));
  }

  send(payload, sender) {

    var data = {
      command: "message",
      data: JSON.stringify({action: "send_message", message: payload, sender: this.localEmail}),
      identifier: JSON.stringify({channel: "MessagesChannel", room: this.room, token: this.token})
    };

    this.ws.send(JSON.stringify(data))

  }
}

module.exports = Connection
