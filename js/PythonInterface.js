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


class ReactopyaProcessPythonInterface {
    constructor(reactComponent, pythonModuleName, pythonComponentName) {
        this._reactComponent = reactComponent;
        this._pythonModuleName = pythonModuleName;
        this._pythonComponentName = pythonComponentName
        this._syncPythonStateToStateKeys = [];
        this._process = null;
        this._pythonState = {};
        this._javaScriptState = {};
        this._pendingJavaScriptState = {};
    }
    syncPythonStateToState(keys) {
        this._syncPythonStateToStateKeys.push(...keys);
    }
    start() {
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
    stop() {
        this._cleanup();
    }
    setJavaScriptState(state) {
        if (!this._process) {
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
            this._process.sendMessage({
                name: 'setJavaScriptState',
                state: newJavaScriptState
            });
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
        if (!this._process) return;
        this._process.close();
        this._process = null;
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

export default class PythonInterface {
    constructor(reactComponent, pythonModuleName, pythonComponentName) {
        this._reactComponent = reactComponent;
        this._syncStateToJavaScriptStateKeys = [];

        this._impl = new ReactopyaProcessPythonInterface(reactComponent, pythonModuleName, pythonComponentName);
    }
    syncPythonStateToState(keys) {
        this._impl.syncPythonStateToState(keys);
    }
    syncStateToJavaScriptState(keys) {
        this._syncStateToJavaScriptStateKeys.push(...keys);
    }
    start() {
        this._impl.start();
        this.update();
    }
    stop() {
        this._impl.stop();
    }
    getJavaScriptState(key) {
        return this._impl.getJavaScriptState(key);
    }
    getPythonState(key) {
        return this._impl.getPythonState(key);
    }
    setJavaScriptState(state) {
        this._impl.setJavaScriptState(state);
    }
    update() {
        this._copyStateToJavaScriptState();
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
