module.exports.returnSuccess = function(res, key, value) {
  res.contentType('application/json; charset=utf-8');
  res.status(200);
  res.write('{\"code\":\"0000\",\"' + key + '\":');
  res.write(JSON.stringify(value));
  res.write('}');
  res.end();
}

module.exports.error = function(res, errcode, value, code) {
  res.contentType('application/json; charset=utf-8');
  res.status(code);
  res.write('{\"code\":\"' + errcode + '\",\"data\":');
  res.write(JSON.stringify(value));
  res.write('}');
  res.end();
}