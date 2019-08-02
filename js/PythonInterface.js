const stable_stringify = require('json-stable-stringify');

class CompanionProcess {
    constructor(componentModule, componentName) {
        this._pythonState = {};
        this._javaScriptState = {};
        this._receiveMessageHandlers = [];
        let pythonCode = '';
        pythonCode = pythonCode + `from ${componentModule} import ${componentName} as Component` + '\n\n'
        pythonCode = pythonCode + `if __name__ == '__main__':` + '\n'
        pythonCode = pythonCode + `  A = Component()` + '\n'
        pythonCode = pythonCode + `  A.run_process_mode()` + '\n'
        this._process = new window.ProcessRunner(pythonCode);
        this._process.onReceiveMessage(this._handleProcessMessage);
    }

    sendMessage(msg) {
        this._process.sendMessage(msg);
    }
    close() {
        this._process.close();
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


export default class PythonInterface {
    constructor(reactComponent, pythonModuleName, pythonComponentName) {
        this._reactComponent = reactComponent;
        this._pythonModuleName = pythonModuleName;
        this._pythonComponentName = pythonComponentName
        this._syncPythonStateToStateKeys = [];
        this._syncStateToJavaScriptStateKeys = [];
        this._process = null;
        this._pythonState = {};
        this._javaScriptState = {};
        this._pendingJavaScriptState = {};
    }
    syncPythonStateToState(keys) {
        this._syncPythonStateToStateKeys.push(...keys);
        if (this._reactComponent.props.jupyterModel) {
            let init_state0 = {};
            for (let key of keys) {
                this._reactComponent.props.jupyterModel.on(`change:${key}`, () => {this._handleJupyterPythonStateToState(key);}, this);
                init_state0[key] = _json_parse(this._reactComponent.props.jupyterModel.get(key, null));
            }
            this._reactComponent.setState(init_state0);
        }
    }
    syncStateToJavaScriptState(keys) {
        this._syncStateToJavaScriptStateKeys.push(...keys);
        this._copyStateToJavaScriptState();
    }
    _handleJupyterPythonStateToState = (key) => {
        let state0 = {};
        let val0 = _json_parse(this._reactComponent.props.jupyterModel.get(key, null));
        state0[key] = val0;
        this._reactComponent.setState(state0);
    }
    start() {
        console.info(`Starting python interface for ${this._reactComponent.constructor.name}`)
        if (window.using_electron) {
            if (this._process) return;
            this._process = new CompanionProcess(this._pythonModuleName, this._pythonComponentName);
            this._process.onReceiveMessage(this._handleReceiveMessageFromProcess);
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
        if ((window.using_electron) && (!this._process)) {
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
            if (window.using_electron) {
                this._process.sendMessage({
                    name: 'setJavaScriptState',
                    state: newJavaScriptState
                });
            }
            else {
                if (this._reactComponent.props.jupyterModel) {
                    for (let key in newJavaScriptState) {
                        this._reactComponent.props.jupyterModel.set(key, _json_stringify(newJavaScriptState[key]));
                    }
                    this._reactComponent.props.jupyterModel.save_changes();
                }
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

    _cleanup() {
        if (window.using_electron) {
            if (!this._process) return;
            this._process.close();
            this._process = null;
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

