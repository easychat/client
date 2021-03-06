"use strict";

var http = require('http');
var https = require('https');
const url = require('url');

let defaults = {};

class HttpManager {

  constructor() {

  }

  setServer(server) {
    var parsedUrl = url.parse(server);
    this.server = parsedUrl;
    this.secure = parsedUrl.protocol === "https:";
    defaults.host = parsedUrl.hostname;
    defaults.port = parsedUrl.port;
    defaults.protocol = parsedUrl.protocol;
  }

  get getServer() {
    return this.server;
  }

  request(verb, path, params, success, failure) {

    if(verb == "GET" && Object.keys(params).length > 0) {
      path = path + this.formatParams(params);
    }

    var body = JSON.stringify(params);

    var options = Object.assign(defaults, {
      method: verb,
      path: path,
      headers: {
        "Content-Type" : "application/json",
      }
    });

    if(verb == "POST") {
      options.headers["Content-Length"] = Buffer.byteLength(body)
    }

    var handler = function(response) {
      var str = ''
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        // console.log(str);
        str = JSON.parse(str)
        if(response.statusCode < 200 || response.statusCode >= 400) {
          failure(str);
        } else {
          success(str);
        }
      });
    }

    var library = this.secure ? https : http;
    var req = library.request(options, handler);
    req.on("error", function(error){
      console.log("request error", error);
      failure(error);
    })

    if(verb == "POST") {
      req.write(body);
    }

    req.end();
  }

  get(path, params, success, failure) {
    this.request("GET", path, params, success, failure);
  }

  post(path, params, success, failure) {
    this.request("POST", path, params, success, failure);
  }

  formatParams(params) {
    return "?" + Object
          .keys(params)
          .map(function(key){
            return key+"="+encodeURIComponent(params[key])
          })
          .join("&")
      }
}


module.exports = new HttpManager()
