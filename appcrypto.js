const crypto = require('crypto');
let algo = 'aes-256-gcm';

class Crypto {
  constructor() {

  }

  sha1(input) {
    return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex')
  }

  sha256(input) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex')
  }

  sha512(input) {
    return crypto.createHash('sha512').update(JSON.stringify(input)).digest('hex')
  }

  hmac256(message, secret) {
    return crypto.createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  }

  stringToHex(string) {
    return new Buffer(string, 'utf8').toString("hex");
  }

  generateRandomKey(size) {
    var key = crypto.randomBytes(size/8).toString('hex');
    return key;
  }

  encrypt(text, key) {
    var iv = new Buffer(crypto.randomBytes(12));
    key = new Buffer(key, 'hex')
    var cipher = crypto.createCipheriv(algo, key, iv)
    var encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex');
    var tag = cipher.getAuthTag();
    return {
      content: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encrypted, key) {
    key = new Buffer(key, 'hex')
    var iv = new Buffer(encrypted.iv, 'hex')
    var decipher = crypto.createDecipheriv(algo, key, iv)
    decipher.setAuthTag(new Buffer(encrypted.tag, 'hex'));
    var dec = decipher.update(encrypted.content, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return {
      content: dec
    }
  }

}

module.exports = Crypto
