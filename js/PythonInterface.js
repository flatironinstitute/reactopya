import PythonProcess from './PythonProcess';
const stable_stringify = require('json-stable-stringify');

export default class PythonInterface {
    constructor(reactComponent, config) {
        this._reactComponent = reactComponent;
        this._pythonModuleName = config.pythonModuleName;
        this._pythonComponentName = config.pythonComponentName;
        this._syncPythonStateToStateKeys = config.pythonStateKeys;
        this._syncStateToJavaScriptStateKeys = config.javaScriptStateKeys;
        this._pythonProcess = null;
        this._pythonState = {};
        this._javaScriptState = {};
        this._pendingJavaScriptState = {};
    }
    start() {
        console.info(`Starting python interface for ${this._reactComponent.constructor.name}`)
        if (this._reactComponent.props.jupyterModel) {
            let init_state0 = {};
            for (let key of this._syncPythonStateToStateKeys) {
                this._reactComponent.props.jupyterModel.on(`change:${key}`, () => {this._handleJupyterPythonStateToState(key);}, this);
                init_state0[key] = _json_parse(this._reactComponent.props.jupyterModel.get(key, null));
            }
            this._reactComponent.setState(init_state0);
        }
        else {
            if (this._pythonProcess) return;
            this._pythonProcess = new PythonProcess(this._pythonModuleName, this._pythonComponentName);
            this._pythonProcess.onReceiveMessage(this._handleReceiveMessageFromProcess);
            this._pythonProcess.start();
            window.addEventListener('beforeunload', () => {
                this.stop();
                window.removeEventListener('beforeunload', this._cleanup); // remove the event handler for normal unmounting
            });
            if (Object.keys(this._pendingJavaScriptState).length > 0) {
                this.setJavaScriptState(this._pendingJavaScriptState);
                this._pendingJavaScriptState = {};
            }
        }
        this.update();
    }
    stop() {
        this._cleanup();
    }
    update() {
        this._copyStateToJavaScriptState();
    }
    setJavaScriptState(state) {
        if ((!this._reactComponent.props.jupyterModel) && (!this._pythonProcess)) {
            for (let key in state) {
                this._pendingJavaScriptState[key] = state[key];
            }
            return;
        }
        let newJavaScriptState = {};
        for (let key in state) {
            if (!compare(state[key], this._javaScriptState[key])) {
                this._javaScriptState[key] = clone(state[key]);
                newJavaScriptState[key] = clone(state[key]);
            }
        }
        if (Object.keys(newJavaScriptState).length > 0) {
            if (this._reactComponent.props.jupyterModel) {
                if (this._reactComponent.props.jupyterModel) {
                    for (let key in newJavaScriptState) {
                        this._reactComponent.props.jupyterModel.set(key, _json_stringify(newJavaScriptState[key]));
                    }
                    this._reactComponent.props.jupyterModel.save_changes();
                }
            }
            else {
                this._pythonProcess.sendMessage({
                    name: 'setJavaScriptState',
                    state: newJavaScriptState
                });
            }
        }
    }
    getJavaScriptState(key) {
        if (key in this._javaScriptState) {
            return JSON.parse(JSON.stringify(this._javaScriptState[key]));
        }
        else return undefined;
    }

    getPythonState(key) {
        if (key in this._pythonState) {
            return JSON.parse(JSON.stringify(this._pythonState[key]));
        }
        else return undefined;
    }

    _handleJupyterPythonStateToState = (key) => {
        let state0 = {};
        let val0 = _json_parse(this._reactComponent.props.jupyterModel.get(key, null));
        state0[key] = val0;
        this._reactComponent.setState(state0);
    }

    _cleanup() {
        if (!this._reactComponent.props.jupyterModel) {
            if (!this._pythonProcess) return;
            this._pythonProcess.close();
            this._pythonProcess = null;
        }
    }

    _handleReceiveMessageFromProcess = (msg) => {
        if (msg.name == 'setPythonState') {
            let somethingChanged = false;
            for (let key in msg.state) {
                if (!compare(msg.state[key], this._pythonState[key])) {
                    this._pythonState[key] = clone(msg.state[key]);
                    somethingChanged = true;
                }
            }
            if (somethingChanged) {
                this._copyPythonStateToState(this._syncPythonStateToStateKeys);
            }
        }
    }

    _copyPythonStateToState(keys) {
        let newState = {};
        for (let key of keys) {
            if (!compare(this._pythonState[key], this._reactComponent.state[key])) {
                newState[key] = clone(this._pythonState[key]);
            }
        }
        this._reactComponent.setState(newState);
    }
    _copyStateToJavaScriptState() {
        let newState = {};
        for (let key of this._syncStateToJavaScriptStateKeys) {
            if (!compare(this.getJavaScriptState[key], this._reactComponent.state[key])) {
                newState[key] = clone(this._reactComponent.state[key]);
            }
        }
        if (Object.keys(newState).length > 0) {
            this.setJavaScriptState(newState);
        }
    }
}

function compare(a, b) {
    if ((a === undefined) && (b === undefined))
        return true;
    if ((a === null) && (b === null))
        return true;
    return (stable_stringify(a) === stable_stringify(b));
}

function clone(a) {
    if (a === undefined)
        return undefined;
    if (a === null)
        return null;
    return JSON.parse(stable_stringify(a));
}

function _json_parse(x) {
    try {
        return JSON.parse(x);
    }
    catch(err) {
        return null;
    }
}

function _json_stringify(x) {
    try {
        return JSON.stringify(x);
    }
    catch(err) {
        return '';
    }
}

