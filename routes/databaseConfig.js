var mysql = require('mysql');
var key = require('./key.js');

var config = {
  host: key.db_host,
  user: key.db_user,
  password: key.db_pw,
  database: key.db_database,
  connectionLimit: 30
};

var pool = mysql.createPool(config);

module.exports = pool;