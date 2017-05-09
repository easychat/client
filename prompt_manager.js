var chalk = require('chalk');
const readline = require('readline');
const util = require('util');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const wrapAnsi = require('wrap-ansi');

class PromptManager {

  constructor() {
    this.messagePrompt = chalk.gray("> ");

    var fu = function(type, args) {
        var t = Math.ceil((rl.line.length + this.messagePrompt.length) / process.stdout.columns);
        var text = util.format.apply(console, args);
        rl.output.write("\n\x1B[" + t + "A\x1B[0J");
        rl.output.write(text + "\n");
        rl.output.write(Array(t).join("\n\x1B[E"));
        rl._refreshLine();
    }.bind(this);

    console.log = function() {
        fu("log", arguments);
    };
    console.warn = function() {
        fu("warn", arguments);
    };
    console.info = function() {
        fu("info", arguments);
    };
    console.error = function() {
        fu("error", arguments);
    };

  }

  promptUser(prompts, keepPromptDisplayed, callback) {
    var index = 0;
    var result = {};

    var next = function() {
      if(index >= prompts.length) {
        callback(result);
        return;
      }

      var prompt = prompts[index];
      var property, display;
      if(typeof prompt === 'object') {
        property = prompt.property;
        display = prompt.display;
      } else {
        property = prompt;
        display = prompt;
      }

      rl.question(chalk.gray(display + ": "), (answer) => {
        if(!keepPromptDisplayed) {
          erasePreviousLine(1);
        }
        result[property] = answer;
        // rl.close();
        index++;
        next();
      });
    }

    next();
  }

  beginMessagePrompt() {
    rl.setPrompt(this.messagePrompt, this.messagePrompt.length);
    rl.prompt(true);

    rl.on("line", function(line) {
      var output = this.messagePrompt + line;
      this.deleteLastMessage(output);
      
      this.onNewLine(line);

      rl.prompt(true);
    }.bind(this));
  }

  deleteLastMessage(message) {
    message = wrapAnsi(message, process.stdout.columns || 80, {wordWrap: false});
    var lineLength = message.split("\n").length;
    moveCursorUp(lineLength);
  }

}

module.exports = PromptManager

// terminal functions

function erasePreviousLine(lines) {
  for(var i = 0; i < lines; i++) {
    // Move the cursor up N lines: \033[<N>A
    console.log("\033[2A")
    // clear line
    console.log("\033[2K")
    // move cursor
    console.log("\033[2A")
  }
}

function moveCursorUp(lines) {
  for(var i = 0; i < lines; i++) {
    // Move the cursor up N lines: \033[<N>A
    console.log("\033[2A")
  }
}
