console.log('Loading');

exports.handler = function (event, context, callback) {
    callback(null, event.myip);
};
