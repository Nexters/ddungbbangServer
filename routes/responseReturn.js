module.exports.returnHeader = function(res) {
    res.contentType('application/json; charset=utf-8');
    res.write('{\"result\":\"success\"');
}

module.exports.returnBody = function(res, key, value) {
    res.write(',\"' + key + '\":');
    res.write(JSON.stringify(value));
}

module.exports.returnFooter = function(res) {
    res.write('}');
    res.end();
}

module.exports.error = function(res, message, code) {
    res.contentType('application/json; charset=utf-8');
    res.status(code);
    res.write(JSON.stringify({ 'result': 'failed', 'data': message }));
    res.end();
}