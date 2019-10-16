const stable_stringify = require('json-stable-stringify');

export default class PythonProcess {
    constructor(projectName, type, initialChildren, props, key, reactopyaModel) {
        this._projectName = projectName;
        this._type = type;
        this._initialChildren = clone(initialChildren);
        this._props = clone(props);
        this._key = key;
        this._reactopyaModel = reactopyaModel;
        this._pythonState = {};
        this._javaScriptState = {};
        this._receiveMessageHandlers = [];
        this._process = null;
        this._pendingMessages = [];

        this._onReceiveMessage((msg) => {
            if (msg.name == 'setPythonState') {
                this._reactopyaModel.setPythonState(msg.state);
            }
            else if (msg.name == 'customMessage') {
                this._reactopyaModel.handleCustomMessage(msg.message);
            }
            else {
                console.warn('Unexpected message name in PythonProcess._onReceiveMessage', msg.name, msg);
            }
        });
        reactopyaModel.onJavaScriptStateChanged((state) => {
            this._sendMessage({
                name: 'setJavaScriptState',
                state: state
            });
        });
        reactopyaModel.onSendCustomMessage((msg) => {
            this._sendMessage({
                name: 'customMessage',
                message: msg
            });
        })
        reactopyaModel.onStart(() => {
            this.start();
        });
        reactopyaModel.onStop(() => {
            this.stop();
        });
        reactopyaModel.onChildModelAdded((data) => {
            this._sendMessage({
                name: 'addChild',
                data: data
            });
        });
    }

    start() {
        if (this._process) return;
        if (window.reactopya_client) {
            this._process = window.reactopya_client.startPythonProcess(this._projectName, this._type, this._initialChildren, this._props, this._handleProcessMessage);
        }
        else if (window.ReactopyaPythonProcess) {
            this._process = new window.ReactopyaPythonProcess(this._projectName, this._type, this._initialChildren, this._props, this._handleProcessMessage);
            this._process.start();
        }
        else {
            console.error('Found no mechanism to start python process.', this._projectName, this._type);
            return;
        }
        if (this._process) {
            for (let msg of this._pendingMessages) {
                this._sendMessage(msg);
            }
            this._pendingMessages = [];
        }
    }
    stop() {
        if (!this._process) return;
        this._process.stop();
        this._process = null;
    }
    _sendMessage(msg) {
        if (this._process) {
            this._process.sendMessage(msg);
        }
        else {
            this._pendingMessages.push(msg);
        }
    }
    _onReceiveMessage(handler) {
        this._receiveMessageHandlers.push(handler);
    }
    _handleProcessMessage = (msg) => {
        this._receiveMessageHandlers.forEach((handler) => {
            handler(msg);
        });
    }
}

function clone(a) {
    if (a === undefined)
        return undefined;
    if (a === null)
        return null;
    return JSON.parse(stable_stringify(a));
}