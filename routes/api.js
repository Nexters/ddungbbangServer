var express = require('express');
var router = express.Router();
var dbPool = require('./databaseConfig.js');
var Promise = require('bluebird');

router.get('/', function(req, res, next) {
  var queryStr = 'SELECT * from user ';
  dbPool.query(queryStr, function(error, rows, fields) {
    if (error) {
      console.log(error);
    } else {
      console.log(rows);
    }
  });
  res.render('index', { title: 'Express' });
});

router.post('/login', function(req, res, next) {
  console.log('***** user insert start *****')
  console.log(req.body);

  var email = req.body.email;
  var password = req.body.password;
  var type_flag = req.body.typeFlag;
  var fcm_token = req.body.fcmToken;
  var inputParam = {};

  if (type_flag == '1') { //일반 로그인
    inputParam.id = email;
    inputParam.email = email;
    inputParam.password = password;
  } else if (type_flag == '2') { //페이스북 로그인
    inputParam.id = email;
  } else {
    console.log('user insert type_flag error!!!!!')
  }

  inputParam.type_flag = type_flag;
  inputParam.fcm_token = fcm_token;

  console.log('check!!');
  loginCheck(inputParam).then(function(returnResult) {
  	console.log(returnResult);
  	res.render('index', { title: 'Express' });
  }).catch(function(err) {

  });





  // var queryStr = 'INSERT INTO user(id, email, password, type_flag, fcm_token) VALUES (';
  // queryStr += inputParam.id + ', ';
  // queryStr += inputParam.email + ', ';
  // queryStr += inputParam.password + ', ';
  // queryStr += inputParam.type_flag + ', ';
  // queryStr += inputParam.fcm_token + ')';
  // console.log(queryStr);
  // dbPool.query(queryStr, function(error, rows, fields) {
  //   if (error) {
  //     console.log(error);
  //   } else {
  //     console.log(rows);
  //   }
  // });
  
});

function loginCheck(inputParam) {
  return new Promise(function(resolve, reject) {
  	console.log('aaaa');
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'id, ';
    queryStr += 'nickname ';
    queryStr += 'FROM user ';
    queryStr += 'WHERE id = \"' + inputParam.id + '\" ';
    queryStr += 'AND type_flag = ' + inputParam.type_flag;

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('loginCheck query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = router;