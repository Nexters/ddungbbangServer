module.exports.returnSuccess = function(res, key, value) {
  res.contentType('application/json; charset=utf-8');
  res.status(200);
  res.write('{\"code\":\"0000\",\"' + key + '\":');
  res.write(JSON.stringify(value));
  res.write('}');
  res.end();
}

module.exports.error = function(res, value, code) {
  res.contentType('application/json; charset=utf-8');
  res.status(code);
  res.write(JSON.stringify(value));
  console.log(JSON.stringify(value));
  res.end();
}