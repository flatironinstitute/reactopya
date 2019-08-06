export default class PythonProcess {
    constructor(componentModule, componentName) {
        this._componentModule = componentModule;
        this._componentName = componentName;
        this._pythonState = {};
        this._javaScriptState = {};
        this._receiveMessageHandlers = [];
        this._process = null;
    }

    sendMessage(msg) {
        this._process.sendMessage(msg);
    }
    start() {
        if (this._process) return;
        if (window.reactopya_client) {
            this._process = window.reactopya_client.startPythonProcess(this._componentModule, this._componentName, this._handleProcessMessage);
        }
        else if (window.ReactopyaPythonProcess) {
            this._process = new window.ReactopyaPythonProcess(this._componentModule, this._componentName, this._handleProcessMessage);
            this._process.start();
        }
        else {
            console.error('Found no mechanism to start python process.');
            return;
        }
    }
    stop() {
        if (!this._process) return;
        this._process.stop();
        this._process = null;
    }
    onReceiveMessage(handler) {
        this._receiveMessageHandlers.push(handler);
    }
    _handleProcessMessage = (msg) => {
        this._receiveMessageHandlers.forEach((handler) => {
            handler(msg);
        })
    }
}
