var mysql = require('mysql');

var db_port = '3306';
var db_user = 'ddungbbang';
var db_pw = '71500894';
var db_host = '45.63.120.140';
var db_database = 'ddungbbang';

var config = {
  host: db_host,
  user: db_user,
  password: db_pw,
  database: db_database,
  connectionLimit: 30
};

var pool = mysql.createPool(config); 

module.exports = pool;