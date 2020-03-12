let express;
try {
    express = require('express');
}
catch(err) {
    console.error('Unable to import express or another package.');
    console.error('You should run the following:');
    console.error('npm install -g express ws tmp');
    return;
}
const ReactopyaServer = require('./ReactopyaServer');

var app = express();


//setting middleware
app.use(express.static(__dirname + '/../dist'));


const port = process.env.PORT || 6060;
let server = app.listen(port);
console.info(`Reactopya server is listening on port ${port}`);

const WSS = new ReactopyaServer();
WSS.start({server: server});


