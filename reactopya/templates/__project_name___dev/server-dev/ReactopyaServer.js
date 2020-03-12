const WebSocket = require('ws');
const ReactopyaPythonProcess = require('./ReactopyaPythonProcess');

class IncomingConnection {
    constructor(id, ws) {
        this._id = id;
        this._ws = ws;
        this._validated = null;
        this._ws.on('message', (message) => {this._handleMessage(message);});
        this._python_processes = {};
    }
    connected() {
        // TODO
    }
    _handleMessage(message) {
        let msg;
        try {
            msg = JSON.parse(message);
        }
        catch(err) {
            console.error('Error parsing JSON message for connection.');
            that._ws.terminate();
            return;
        }
        if (!this._validated) {
            if ((msg.message_type == 'validation') && (msg.validation_string == 'reactopya-1')) {
                console.info(`Validated incoming connection: ${this._id}`);
                this._validated = true;
                this._sendMessage({message_type: 'validation_confirmed'});
                return;
            }
            else {
                console.error('Error validating.');
                this._ws.terminate();
                return;
            }
        }
        if (msg.message_type == 'start_python_process') {
            this._startPythonProcess(msg.projectName, msg.type, msg.initialChildren, msg.props, msg.processId);
        }
        else if (msg.message_type == 'to_python_process') {
            if (msg.processId in this._python_processes) {
                this._python_processes[msg.processId].sendMessage(msg.message);
            }
            else {
                console.error(`Unexpected problem. No such python process with id: ${msg.processId}`);
            }
        }
        else if (msg.message_type == 'stop_python_process') {
            if (msg.processId in this._python_processes) {
                this._python_processes[msg.processId].stop();
                delete this._python_processes[msg.processId];
            }
            else {
                console.error(`Unexpected problem for stop_python_process. No such python process with id: ${msg.processId}`);
            }
        }
        else {
            console.error(`Unexpected message type ${msg.message_type}`);
        }
    }
    _startPythonProcess(projectName, type, initialChildren, props, processId) {
        let X = new ReactopyaPythonProcess(projectName, type, initialChildren, props, (msg) => {
            this._sendMessage({message_type: "from_python_process", processId: processId, message: msg});
        });
        X.start();
        this._python_processes[processId] = X;
    }
    _sendMessage(msg) {
        this._ws.send(JSON.stringify(msg));
    }
}

class ReactopyaServer {
    constructor() {
        this._port = null;
        this._wss = null;
        this._connections = {};
        this._last_connection_id = 0;
    }
    
    start(opts) {
        this._port = opts.port || undefined;
        this._server = opts.server || undefined;
        this._wss = new WebSocket.Server({ port: this._port, server: this._server });
        this._wss.on('connection', (ws) => {
            let id = this._last_connection_id + 1;
            let X = new IncomingConnection(id, ws);
            this._last_connection_id = id;
            this._connections[id] = X;
        });
        if (this._port) {
            console.info(`Reactopya web socket server listening on port ${this._port}`);
        }
        else if (this._server) {
            console.info(`Reactopya web socket server listening on ${this._server.address().port}`);
        }
    }
}

module.exports = ReactopyaServer;