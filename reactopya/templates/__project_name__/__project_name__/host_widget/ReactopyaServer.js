const WebSocket = require('ws');
const fs = require('fs');
const ReactopyaPythonProcess = require('./ReactopyaPythonProcess');

class IncomingConnection {
    constructor(dir, ws) {
        this._dir = dir;
        this._ws = ws;
        this._validated = null;
        this._ws.on('message', (message) => {this._handleMessage(message);});
        this._python_processes = {};
        this._message_index = 100000;
    }
    iterate() {
        this._checkForMessages();
    }
    _checkForMessages() {
        let messageFiles = [];
        try {
            fs.readdirSync(this._dir).forEach(function(file) {
                if (file.endsWith('.msg-from-python')) {
                    messageFiles.push(file);
                }
            });
            messageFiles.sort();
            for (let msgFile of messageFiles) {
                let msg = read_json_file(`${this._dir}/${msgFile}`);
                fs.unlinkSync(`${this._dir}/${msgFile}`);
                this._sendMessage({message_type: 'from_python_process', message: msg});
                // break; // only one at a time for now
            }
        }
        catch(err) {
            if (!fs.existsSync(this._dir)) {
                // todo: end
                return false;
            }
            console.warn('Problem checking for messages.', this._dir, err);
        }
        return true;
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
                console.info(`Validated incoming connection: ${this._dir}`);
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
        if (msg.message_type == 'to_python_process') {
            let fname = `${this._dir}/${this._message_index}.msg-from-js`;
            this._message_index++;
            write_json_file(fname, msg.message);
        }
        else {
            console.error(`Unexpected message type ${msg.message_type}`);
        }
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
        this._connections_dir = opts.connections_dir || undefined;
        this._wss = new WebSocket.Server({ port: this._port, server: this._server });
        this._wss.on('connection', (ws) => {
            let id = this._last_connection_id + 1;
            let dir = `${this._connections_dir}/connection_${id}`
            fs.mkdirSync(dir);
            let X = new IncomingConnection(dir, ws);
            this._last_connection_id = id;
            this._connections[id] = X;
        });
        if (this._port) {
            console.info(`Reactopya web socket server listening on port ${this._port}`);
        }
        else if (this._server) {
            console.info(`Reactopya web socket server listening on ${this._server.address().port}`);
        }
        this._nextIteration();
    }
    _nextIteration() {
        let that = this;
        this._iterate();
        setTimeout(function() {
            that._nextIteration();
        }, 100);
    }
    _iterate() {
        for (let id in this._connections) {
            let connection = this._connections[id];
            connection.iterate();
        }
    }
}

function read_json_file(fname) {
    let txt = read_text_file(fname);
    return JSON.parse(txt);
}

function read_text_file(fname) {
    return fs.readFileSync(fname, 'utf8');
}

function write_json_file(fname, x) {
    write_text_file(fname, JSON.stringify(x));
}

function write_text_file(fname, txt) {
    fs.writeFileSync(fname + '.tmp', txt);
    fs.renameSync(fname + '.tmp', fname);
}

module.exports = ReactopyaServer;