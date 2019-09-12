const WebSocket = require('ws');

class ReactopyaClient {
    constructor() {
        this._validation_confirmed = false;
        this._connected = false;
        this._last_python_process_id = 1000;
        this._python_processes = {};
    }
    connect(url) {
        if ((typeof(window) !== 'undefined') && (window.WebSocket)) {
            this._ws = new window.WebSocket(url);
            this._ws.addEventListener('open', () => {
                this._connected = true;
                this._sendMessage({message_type: 'validation', validation_string: 'reactopya-1'});
            });
            this._ws.addEventListener('message', (evt) => {this._handleMessage(evt.data);});
        }
        else {
            this._ws = new WebSocket(url);
            this._ws.on('open', () => {
                this._connected = true;
                this._sendMessage({message_type: 'validation', validation_string: 'reactopya-1'});
            });
            this._ws.on('message', (msg) => {this._handleMessage(msg);});
        }
    }
    _handleMessage(message) {
        let msg;
        try {
            msg = JSON.parse(message);
        }
        catch(err) {
            console.error('Error parsing JSON message.');
            this._ws.terminate();
            return;
        }
        if (msg.message_type == 'validation_confirmed') {
            this._validation_confirmed = true;
        }
        else if (msg.message_type == 'from_python_process') {
            let id = msg.processId;
            if (id in this._python_processes) {
                this._python_processes[id]._handleMessage(msg.message);
            }
            else {
                console.error(`Unexpected, unable to find python process with id ${id}`);
                return;
            }
        }
    }
    _sendMessage(message) {
        if (!this._connected) {
            let that = this;
            setTimeout(function() {
                that._sendMessage(message);
            }, 1);
            return;
        }
        this._ws.send(JSON.stringify(message));
    }
    startPythonProcess(projectName, type, initialChildren, props, onReceiveMessage) {
        let id = this._last_python_process_id + 1;
        this._last_python_process_id = id;
        this._sendMessage({
            message_type: 'start_python_process',
            projectName: projectName,
            type: type,
            initialChildren: initialChildren,
            props: props,
            processId: id
        });
        let PP = new _RemotePythonProcess(this, id, onReceiveMessage);
        this._python_processes[id] = PP;
        return PP;
    }
}

class _RemotePythonProcess {
    constructor(client, process_id, onReceiveMessage) {
        this._client = client;
        this._process_id = process_id;
        this._on_receive_message = onReceiveMessage;
    }
    sendMessage(msg) {
        this._client._sendMessage({
            message_type: 'to_python_process',
            processId: this._process_id,
            message: msg
        });
    }
    stop() {
        this._client._sendMessage({
            message_type: 'stop_python_process',
            processId: this._process_id
        });
    }
    _handleMessage(msg) {
        this._on_receive_message(msg);
    }
}

module.exports = ReactopyaClient;