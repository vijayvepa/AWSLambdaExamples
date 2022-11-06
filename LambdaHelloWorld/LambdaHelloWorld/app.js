console.log('Loading Function');

exports.handler = function (event, context) {

    if (event != null) {
        console.log('event = ' + JSON.stringify(event));
    }
    else {
        console.log('No event object');

    }

    var name = '';
    if ('name' in event) {
        name = event['name']
    } else {
        name = 'World'
    }

    var greeting = 'Hello ' + name + "!";
    console.log(greeting);

    context.done(null, greeting);  // SUCCESS with message
    return greeting;
};
