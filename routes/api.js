var express = require('express');
var router = express.Router();
var dbPool = require('./databaseConfig.js');
var responseReturn = require('./responseReturn.js');
var Promise = require('bluebird');
var nodemailer = require('nodemailer');

function createCode() {
  var random_num1 = Math.floor(Math.random() * 10);
  var random_num2 = Math.floor(Math.random() * 10);
  var random_num3 = Math.floor(Math.random() * 10);
  var random_num4 = Math.floor(Math.random() * 10);
  var code = random_num1.toString() + random_num2.toString() + random_num3.toString() + random_num4.toString();
  return code;
}

router.post('/signup', function(req, res, next) {
  console.log('***** user signUp start *****')
  console.log(req.body);

  var email = req.body.email;
  var password = req.body.password;
  var nickname = req.body.nickname;
  var active_account_code = createCode();
  var inputParam = {};
  var returnData = {};

  inputParam.id = email;
  inputParam.email = email;
  inputParam.password = password;
  inputParam.nickname = nickname;
  inputParam.activeAccountFlag = 0;
  inputParam.activeAccountCode = active_account_code;
  inputParam.typeFlag = 1;
  inputParam.statusFalg = 1;

  signupEmailCheck(inputParam).then(function(checkResult) {
    if (checkResult.length == 0) {
      return signupInsert(inputParam);
    } else if (checkResult.length != 0 && checkResult[0].active_account_flag == 0) {
      inputParam.idx = checkResult[0].idx;
      return signupUpdate(inputParam);
    } else if (checkResult.length != 0 && checkResult[0].active_account_flag == 1) {
      returnData.code = '0001';
      returnData.errmsg = '이미 등록된 아이디 입니다!';
      throw new Error('이미 등록된 아이디 입니다!');
    }
  }).then(function(idResult) {
    console.log('이메일 인증 보내는 부분!!!!!');
    inputParam.idx = idResult.insertId;
    return sendVerifyMail(inputParam);
  }).then(function(mailResult) {
    if (mailResult == 'OK') {
      returnData.code = '0000';
      returnData.idx = inputParam.idx;
      returnData.email = inputParam.email;
      returnData.activeAccountFlag = inputParam.activeAccountFlag;
      responseReturn.returnHeader(res);
      responseReturn.returnBody(res, 'data', returnData);
      responseReturn.returnFooter(res);
    } else {
      returnData.code = '0002';
      returnData.errmsg = '인증 이메일 발송 에러!!!';
      throw new Error('인증 이메일 발송 에러!!!');
    }
  }).catch(function(err) {
    console.log(err);
    responseReturn.returnHeader(res);
    responseReturn.returnBody(res, 'data', returnData);
    responseReturn.returnFooter(res);
  });
});

function signupEmailCheck(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'email, ';
    queryStr += 'active_account_flag, ';
    queryStr += 'type_flag, ';
    queryStr += 'status_flag, ';
    queryStr += 'insert_date ';
    queryStr += 'FROM user ';
    queryStr += 'WHERE email = "' + param.email + '" ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('signupEmailCheck query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

function signupInsert(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'INSERT INTO user (';
    queryStr += 'id, ';
    queryStr += 'email, ';
    queryStr += 'password, ';
    queryStr += 'nickname, ';
    queryStr += 'active_account_flag, ';
    queryStr += 'active_account_code, ';
    queryStr += 'type_flag, ';
    queryStr += 'status_flag, ';
    queryStr += 'insert_date) VALUES (';
    queryStr += "\"" + param.email + "\", ";
    queryStr += "\"" + param.email + "\", ";
    queryStr += "\"" + param.password + "\", ";
    queryStr += "\"" + param.nickname + "\", ";
    queryStr += param.activeAccountFlag + " , ";
    queryStr += "\"" + param.activeAccountCode + "\", ";
    queryStr += param.typeFlag + " , ";
    queryStr += param.statusFalg + " , ";
    queryStr += "now()) ";

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('signupInsert query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

function signupUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'password = "' + param.password + '", ';
    queryStr += 'nickname = "' + param.nickname + '", ';
    queryStr += 'active_account_code = "' + param.activeAccountCode + '" ';
    queryStr += 'WHERE idx = ' + param.idx;

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('signupUpdate query error!'));
      } else {
        rows.insertId = param.idx;
        resolve(rows);
      }
    });
  });
}

function sendVerifyMail(param) {
  return new Promise(function(resolve, reject) {
    var poolConfig = {
      pool: true,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use TLS
      auth: {
        user: 'timarycs@gmail.com',
        pass: 'cco123456'
      }
    };

    var transporter = nodemailer.createTransport(poolConfig);

    var mailOptions = {
      from: 'timarycs@gmail.com',
      // to: param.email,
      to: 'timarycs@gmail.com',
      subject: 'timary 인증 이메일입니다!',
      text: '아이디 : ' + param.idx + '\n' +
        '이메일 : ' + param.email + '\n' +
        '액티베이트코드 : ' + param.activeAccountCode + '\n'
    };
    transporter.sendMail(mailOptions, function(error, response) {
      if (error) {
        console.log(error);
        reject(new Error('sendVerifyMail query error!'));
      } else {
        resolve('OK');
      }
      transporter.close();
    });
  });
}

router.post('/verifyemail', function(req, res, next) {
  console.log('***** user verifyEmail start *****')
  console.log(req.body);

  var idx = req.body.idx;
  var activeAccountCode = req.body.activeAccountCode;

  var selectParam = {};
  selectParam.idx = idx;
  selectParam.code = activeAccountCode;

  var returnData = {};

  retrieveActivationCode(selectParam).then(function(retrieveResult) {
    console.log('***** user retrieveActivationCode result *****')
    console.log(retrieveResult);
    if (retrieveResult[0].active_account_flag == 0) {
      updateActivationFlag(selectParam).then(function(updateResult) {
        console.log(updateResult);
        returnData.code = '0000'; //성공
        responseReturn.returnHeader(res);
        responseReturn.returnBody(res, 'data', returnData);
        responseReturn.returnFooter(res);
      }).catch(function(err) {
        console.log(err);
        returnData.code = '0005'; //인증코드 업데이트 실패
        returnData.errmsg = '인증코드 업데이트 실패';
        responseReturn.returnHeader(res);
        responseReturn.returnBody(res, 'data', returnData);
        responseReturn.returnFooter(res);
      });
    } else {
      returnData.code = '0003'; //이미인증됨
      returnData.errmsg = '이미인증됨';
      responseReturn.returnHeader(res);
      responseReturn.returnBody(res, 'data', returnData);
      responseReturn.returnFooter(res);
    }
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0004'; //인증코드 실패
    returnData.errmsg = '인증코드 실패';
    responseReturn.returnHeader(res);
    responseReturn.returnBody(res, 'data', returnData);
    responseReturn.returnFooter(res);
  });
});

function retrieveActivationCode(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'id, ';
    queryStr += 'email, ';
    queryStr += 'active_account_flag ';
    queryStr += 'FROM user ';
    queryStr += 'WHERE idx = ' + param.idx + ' ';
    queryStr += 'AND active_account_code = ' + '"' + param.code + '" ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.length == 0) {
        reject(new Error('retrieveActivationCode query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

function updateActivationFlag(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'active_account_flag = 1 ';
    queryStr += 'WHERE idx = ' + param.idx + ' ';
    queryStr += 'AND active_account_code = ' + '"' + param.code + '" ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('updateActivationFlag query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/signin', function(req, res, next) {
  console.log('***** user signin start *****')
  console.log(req.body);

  var email = req.body.email;
  var password = req.body.password;
  // var deviceType = req.body.deviceType;
  // var fcm_token = req.body.fcmToken;
  var inputParam = {};
  var returnData = {};

  inputParam.email = email;
  inputParam.password = password;
  // inputParam.deviceType = deviceType;

  retrieveSignIn(inputParam).then(function(signInResult) {
    console.log(signInResult);
    // if (fcm_token == signInResult.fcm_token) {
    //   updateSignInfo();
    // }
    returnData = signInResult[0];
    returnData.code = '0000'; //성공
    responseReturn.returnHeader(res);
    responseReturn.returnBody(res, 'data', returnData);
    responseReturn.returnFooter(res);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0006'; //아이디 또는 비밀번호 오류
    returnData.errmsg = '아이디 또는 비밀번호 오류';
    responseReturn.returnHeader(res);
    responseReturn.returnBody(res, 'data', returnData);
    responseReturn.returnFooter(res);
  });

});

function retrieveSignIn(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    // queryStr += 'id, ';
    queryStr += 'email, ';
    // queryStr += 'fcm_token, ';
    queryStr += 'active_account_flag ';
    queryStr += 'FROM user ';
    queryStr += 'WHERE email = ' + '"' + param.email + '" '
    queryStr += 'AND password = ' + '"' + param.password + '" ';
    queryStr += 'AND status_flag != 3 ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.length == 0) {
        reject(new Error('retrieveSignIn query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}



// router.post('/resendverifyemail', function(req, res, next) {
//   console.log('***** user resendverifyemail start *****')
//   console.log(req.body);

//   var email = req.body.email;
//   var password = req.body.password;
//   var nickname = req.body.nickname;
//   // var fcm_token = req.body.fcmToken;
//   var active_account_code = createCode();
//   var inputParam = {};

//   inputParam.id = email;
//   inputParam.email = email;
//   inputParam.password = password;
//   inputParam.nickname = nickname;
//   inputParam.activeAccountFlag = 0;
//   inputParam.activeAccountCode = active_account_code;
//   inputParam.typeFlag = 1;
//   inputParam.statusFalg = 1;

//   signupInsert(inputParam).then(function(loginResult) {
//     inputParam.idx = loginResult.insertId;
//     return sendVerifyMail(inputParam);
//   }).then(function(mailResult) {
//     var returnData = {};
//     if (mailResult == 'OK') {
//       returnData.idx = inputParam.idx;
//       returnData.email = inputParam.email;
//       returnData.activeAccountFlag = inputParam.activeAccountFlag;
//       responseReturn.returnHeader(res);
//       responseReturn.returnBody(res, 'data', returnData);
//       responseReturn.returnFooter(res);
//     } else {
//       responseReturn.error(res, 'email certification error!!', 500);
//     }
//   }).catch(function(err) {
//     console.log(err);
//     responseReturn.error(res, 'FAIL', 500);
//   });
// });

module.exports = router;