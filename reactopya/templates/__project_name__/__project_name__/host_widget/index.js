const express = require('express');
const ReactopyaServer = require('./ReactopyaServer');

var app = express();

//setting middleware
app.use(express.static(process.env.REACTOPYA_PUBLIC_DIR));


const port = process.env.REACTOPYA_PORT || 6060;
let server = app.listen(port);
console.info(`Reactopya server is listening on port ${port}`);

setTimeout(function() {
    console.info('Starting websocket server...');
    const WSS = new ReactopyaServer();
    WSS.start({server: server, connections_dir: process.env.REACTOPYA_CONNECTIONS_DIR});
    console.info('Websocket server running.');
}, 500);



