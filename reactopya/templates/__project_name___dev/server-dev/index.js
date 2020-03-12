const ReactopyaServer = require('./ReactopyaServer');


const port = process.env.PORT || 5051;

// web socket server
const WSS = new ReactopyaServer();
WSS.start({port: port});


