console.log('Loading Function');

exports.handler = function (event, context) {

    if (event != null) {
        console.log('event = ' + JSON.stringify(event));
    }
    else {
        console.log('No event object');

    }

    var name = getProperty(event, 'name', 'World');
    var greet = getProperty(event, 'greet', 'Hello')
    var greeting = greet + ' ' + name + "!";
    console.log(greeting);

    context.done(null, greeting);  // SUCCESS with message
    return greeting;
};

function getProperty(event, propName, defaultValue) {
    var name = '';
    if (propName in event) {
        name = event[propName];
    } else {
        name = defaultValue;
    }
    return name;
}
