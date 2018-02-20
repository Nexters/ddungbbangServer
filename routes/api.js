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
      returnData.active_account_flag = inputParam.activeAccountFlag;
      responseReturn.returnSuccess(res, 'data', returnData);
    } else {
      returnData.code = '0002';
      returnData.errmsg = '서버오류로 인증메일 발송을 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
      throw new Error('인증 이메일 발송 에러!!!');
    }
  }).catch(function(err) {
    console.log(err);
    responseReturn.error(res, returnData, 200);
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
    queryStr += "now(6)) ";

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
        returnData.idx = idx; //성공
        responseReturn.returnSuccess(res, 'data', returnData);
      }).catch(function(err) {
        console.log(err);
        returnData.code = '0005'; //인증코드 업데이트 실패
        returnData.errmsg = '서버오류로 인증코드 업데이트를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
        responseReturn.error(res, returnData, 200);
      });
    } else {
      returnData.code = '0003'; //이미인증됨
      returnData.errmsg = '이미 인증된 아이디 입니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
      responseReturn.error(res, returnData, 200);
    }
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0004'; //인증코드 실패
    returnData.errmsg = '서버오류로 인증코드 업데이트를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
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
  var inputParam = {};
  var returnData = {};

  inputParam.email = email;
  inputParam.password = password;

  retrieveSignIn(inputParam).then(function(signInResult) {
    console.log(signInResult);
    returnData = signInResult[0];
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0006'; //아이디 또는 비밀번호 오류
    returnData.errmsg = '아이디 또는 비밀번호 오류';
    responseReturn.error(res, returnData, 200);
  });

});

function retrieveSignIn(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    // queryStr += 'id, ';
    queryStr += 'email, ';
    queryStr += 'nickname, ';
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

router.post('/resendverifyemail', function(req, res, next) {
  console.log('***** user resendverifyemail start *****')
  console.log(req.body);

  var idx = req.body.idx;
  var email = req.body.email;
  var active_account_code = createCode();

  var returnData = {};

  var updateParam = {};
  updateParam.idx = idx;
  updateParam.email = email;
  updateParam.activeAccountCode = active_account_code;

  resendEmailUpdate(updateParam).then(function(updateResult) {
    return sendVerifyMail(updateParam);
  }).then(function(mailResult) {
    var returnData = {};
    if (mailResult == 'OK') {
      returnData.code = '0000';
      returnData.idx = idx;
      returnData.email = email;
      responseReturn.returnSuccess(res, 'data', returnData);
    } else {
      returnData.code = '0008'; //인증코드 재발송 오류
      returnData.errmsg = '서버오류로 인증코드 재발송을 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
      responseReturn.error(res, returnData, 200);
    }
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0007'; //인증코드 업데이트 에러
    returnData.errmsg = '서버오류로 인증코드 업데이트를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function resendEmailUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'active_account_code = "' + param.activeAccountCode + '" ';
    queryStr += 'WHERE idx = ' + param.idx + ' ';
    queryStr += 'AND email = "' + param.email + '" ';
    queryStr += 'AND active_account_flag = 0';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('resendEmailUpdate query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/write', function(req, res, next) {
  console.log('***** user write start *****')
  console.log(req.body);

  var userIdx = req.body.userIdx;
  var contents = req.body.contents;
  var openDate = req.body.openDate;
  var inputParam = {};
  var returnData = {};

  inputParam.userIdx = userIdx;
  inputParam.contents = contents;
  inputParam.openDate = openDate;

  diaryInsert(inputParam).then(function(insertResult) {
    returnData.contents_idx = insertResult.insertId;
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0009'; //글쓰기 오류
    returnData.errmsg = '서버오류로 글쓰기를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function diaryInsert(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'INSERT INTO diary (';
    queryStr += 'user_idx, ';
    queryStr += 'contents, ';
    queryStr += 'open_date, ';
    queryStr += 'status_flag, ';
    queryStr += 'insert_date) VALUES (';
    queryStr += param.userIdx + " , ";
    queryStr += "\"" + param.contents + "\", ";
    queryStr += "date_format(\"" + param.openDate + "\", \'%Y-%m-%d %H:%i:%s\'), ";
    queryStr += "1, ";
    queryStr += "now(6)) ";

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('diaryInsert query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/list', function(req, res, next) {
  console.log('***** user list start *****')
  console.log(req.body);

  var userIdx = req.body.userIdx;
  var selectParam = {};
  var returnData = {};

  selectParam.userIdx = userIdx;

  diaryListSelect(selectParam).then(function(selectResult) {
    console.log(selectResult);
    returnData = selectResult;
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0010'; //리스트 가져오기 오류
    returnData.errmsg = '서버오류로 리스트를 불러오는데 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function diaryListSelect(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'user_idx, ';
    queryStr += 'contents, ';
    queryStr += 'date_format(insert_date, \'%Y-%m-%d %H:%i:%s\') AS insert_date, ';
    queryStr += 'date_format(open_date, \'%Y-%m-%d %H:%i:%s\') AS open_date, ';
    queryStr += 'date_format(update_date, \'%Y-%m-%d %H:%i:%s\') AS update_date ';
    queryStr += 'FROM diary ';
    queryStr += 'WHERE user_idx = ' + param.userIdx + ' '
    queryStr += 'AND status_flag != 3 ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('diaryListSelect query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/read', function(req, res, next) {
  console.log('***** user read start *****')
  console.log(req.body);

  var userIdx = req.body.userIdx;
  var contentsIdx = req.body.contentsIdx;
  var selectParam = {};
  var returnData = {};

  selectParam.userIdx = userIdx;
  selectParam.contentsIdx = contentsIdx;

  diaryDetailSelect(selectParam).then(function(selectResult) {
    returnData = selectResult[0];
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0011'; //상세글 가져오기 오류
    returnData.errmsg = '서버오류로 다이어리를 불러오는데 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function diaryDetailSelect(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'user_idx, ';
    queryStr += 'contents, ';
    queryStr += 'date_format(insert_date, \'%Y-%m-%d %H:%i:%s\') AS insert_date, ';
    queryStr += 'date_format(open_date, \'%Y-%m-%d %H:%i:%s\') AS open_date, ';
    queryStr += 'date_format(update_date, \'%Y-%m-%d %H:%i:%s\') AS update_date ';
    queryStr += 'FROM diary ';
    queryStr += 'WHERE user_idx = ' + param.userIdx + ' '
    queryStr += 'AND idx = ' + param.contentsIdx + ' '
    queryStr += 'AND status_flag != 3 ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('diaryDetailSelect query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/delete', function(req, res, next) {
  console.log('***** user delete start *****')
  console.log(req.body);

  var userIdx = req.body.userIdx;
  var contentsIdx = req.body.contentsIdx;
  var deleteParam = {};
  var returnData = {};

  deleteParam.userIdx = userIdx;
  deleteParam.contentsIdx = contentsIdx;

  diaryDetailDelete(deleteParam).then(function(deleteResult) {
    returnData.user_idx = userIdx;
    returnData.contents_idx = contentsIdx;
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0012'; //글삭제 오류
    returnData.errmsg = '서버오류로 삭제를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function diaryDetailDelete(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE diary SET ';
    queryStr += 'status_flag = 3, ';
    queryStr += 'update_date = now(6) ';
    queryStr += 'WHERE idx = ' + param.contentsIdx + ' ';
    queryStr += 'AND user_idx = "' + param.userIdx + '" ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('diaryDetailDelete query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/updatepassword', function(req, res, next) {
  console.log('***** user updatepassword start *****')
  console.log(req.body);

  var userIdx = req.body.idx;
  var password = req.body.password;
  var updateParam = {};
  var returnData = {};

  updateParam.userIdx = userIdx;
  updateParam.password = password;

  userPasswordUpdate(updateParam).then(function(deleteResult) {
    console.log(deleteResult);
    returnData.user_idx = userIdx;
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0013'; //비밀번호 업데이트 오류
    returnData.errmsg = '서버오류로 비밀번호 변경을 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function userPasswordUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'password = "' + param.password + '", ';
    queryStr += 'status_flag = 2, ';
    queryStr += 'update_date = now(6) ';
    queryStr += 'WHERE idx = ' + param.userIdx + ' ';
    queryStr += 'AND active_account_flag = 1 ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('userPasswordUpdate query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/updatelocknum', function(req, res, next) {
  console.log('***** user updatelocknum start *****')
  console.log(req.body);

  var userIdx = req.body.idx;
  var lockNumber = req.body.lockNumber;
  var updateParam = {};
  var returnData = {};

  updateParam.userIdx = userIdx;
  updateParam.lockNumber = lockNumber;

  userLockPasswordUpdate(updateParam).then(function(deleteResult) {
    console.log(deleteResult);
    returnData.user_idx = userIdx;
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0014'; //잠금 비밀번호 업데이트 오류
    returnData.errmsg = '서버오류로 잠금 비밀번호 변경을 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function userLockPasswordUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'lock_pin_number = "' + param.lockNumber + '", ';
    queryStr += 'status_flag = 2, ';
    queryStr += 'update_date = now(6) ';
    queryStr += 'WHERE idx = ' + param.userIdx + ' ';
    queryStr += 'AND active_account_flag = 1 ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('userLockPasswordUpdate query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/updatepushtoken', function(req, res, next) {
  console.log('***** user updatepushtoken start *****')
  console.log(req.body);

  var userIdx = req.body.idx;
  var deviceType = req.body.deviceType;
  var pushToken = req.body.pushToken;
  var updateParam = {};
  var returnData = {};

  updateParam.userIdx = userIdx;
  updateParam.deviceType = deviceType;
  updateParam.pushToken = pushToken;

  userTokenUpdate(updateParam).then(function(deleteResult) {
    console.log(deleteResult);
    returnData.user_idx = userIdx;
    returnData.code = '0000'; //성공
    responseReturn.returnSuccess(res, 'data', returnData);
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0015'; //유저 푸쉬토큰 업데이트 오류
    returnData.errmsg = '서버오류로 푸쉬 업데이트를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function userTokenUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'fcm_token = "' + param.pushToken + '", ';
    queryStr += 'device_type = "' + param.deviceType + '", ';
    queryStr += 'status_flag = 2, ';
    queryStr += 'update_date = now(6) ';
    queryStr += 'WHERE idx = ' + param.userIdx + ' ';
    queryStr += 'AND active_account_flag = 1 ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('userTokenUpdate query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/confirmpassword', function(req, res, next) {
  console.log('***** user getpassword start *****')
  console.log(req.body);

  var userIdx = req.body.idx;
  var password = req.body.password;
  var selectParam = {};
  var returnData = {};

  selectParam.userIdx = userIdx;
  selectParam.password = password;

  userPasswordSelect(selectParam).then(function(selectResult) {
    console.log(selectResult);
    if (selectResult.length > 0) {
      responseReturn.returnSuccess(res, 'data', returnData);
    } else {
      returnData.code = '0019'; //비밀번호 틀렷
      returnData.errmsg = '비밀번호가 틀렸습니다.';
      responseReturn.error(res, returnData, 200);
    }
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0016'; //유저 비밀번호 가져오기 오류
    returnData.errmsg = '서버오류로 비밀번호를 불러오는데 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function userPasswordSelect(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'SELECT ';
    queryStr += 'idx, ';
    queryStr += 'email ';
    queryStr += 'FROM user ';
    queryStr += 'WHERE idx = ' + param.userIdx + ' ';
    queryStr += 'AND password = "' + param.password + '" ';
    queryStr += 'AND active_account_flag = 1 ';
    queryStr += 'AND status_flag != 3 ';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error) {
        reject(new Error('userPasswordSelect query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

router.post('/passwordresetemail', function(req, res, next) {
  console.log('***** user passwordresetemail start *****')
  console.log(req.body);

  // var idx = req.body.idx;
  var email = req.body.email;
  var newPassword = makePassword();

  var returnData = {};

  var updateParam = {};
  // updateParam.idx = idx;
  updateParam.email = email;
  updateParam.newPassword = newPassword;

  resendPasswordUpdate(updateParam).then(function(updateResult) {
    return sendNewPasswordMail(updateParam);
  }).then(function(mailResult) {
    var returnData = {};
    if (mailResult == 'OK') {
      returnData.code = '0000';
      // returnData.idx = idx;
      returnData.email = email;
      responseReturn.returnSuccess(res, 'data', returnData);
    } else {
      returnData.code = '0017'; //비밀번호 재발송 오류
      returnData.errmsg = '서버오류로 비밀번호 발송을 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
      responseReturn.error(res, returnData, 200);
    }
  }).catch(function(err) {
    console.log(err);
    returnData.code = '0018'; //비밀번호 업데이트 에러
    returnData.errmsg = '서버오류로 비밀번호 업데이트를 실패했습니다.\n관리자에게 문의해주세요\ntimarycs@gmail.com';
    responseReturn.error(res, returnData, 200);
  });
});

function makePassword() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function resendPasswordUpdate(param) {
  return new Promise(function(resolve, reject) {
    var queryStr = 'UPDATE user SET ';
    queryStr += 'password = "' + param.newPassword + '", ';
    queryStr += 'update_date = now(6) ';
    // queryStr += 'WHERE idx = ' + param.idx + ' ';
    queryStr += 'WHERE email = "' + param.email + '" ';
    queryStr += 'AND active_account_flag = 1 ';
    queryStr += 'AND status_flag != 3';

    console.log(queryStr);

    dbPool.query(queryStr, function(error, rows, fields) {
      if (error || rows.affectedRows == 0) {
        reject(new Error('resendPasswordUpdate query error!'));
      } else {
        resolve(rows);
      }
    });
  });
}

function sendNewPasswordMail(param) {
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
      subject: 'timary 비밀번호 재설정 이메일입니다!',
      text: '이메일 : ' + param.email + '\n' +
        '새 비밀번호 : ' + param.newPassword + '\n'
    };
    transporter.sendMail(mailOptions, function(error, response) {
      if (error) {
        console.log(error);
        reject(new Error('sendNewPasswordMail query error!'));
      } else {
        resolve('OK');
      }
      transporter.close();
    });
  });
}

module.exports = router;