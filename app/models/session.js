var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var User = require('./user');

var Session = db.Model.extend({
  tableName: 'sessions',
  user_id: function () {
    return this.belongsTo(User);
  },
  hasTimestamps: true
});

// initialize with hashed password here?

module.exports = Session;
