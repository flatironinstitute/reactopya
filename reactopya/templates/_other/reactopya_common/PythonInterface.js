// import PythonProcess from './PythonProcess';
const stable_stringify = require('json-stable-stringify');

export default class PythonInterface {
    constructor(reactComponent, config) {
        this._reactComponent = reactComponent;
        this._projectName = config.project_name;
        this._type = config.type;
        this._syncPythonStateToStateKeys = config.pythonStateKeys;
        this._syncStateToJavaScriptStateKeys = config.javaScriptStateKeys;
        // this._pythonProcess = null;
        this._pythonState = {};
        this._javaScriptState = {};
        this._pendingJavaScriptState = {};
        this._reactopyaModel = reactComponent.reactopyaModel || reactComponent.props.reactopyaModel;
        if ((!this._reactopyaModel) && (reactComponent.props.reactopyaParent)) {
            let parent = reactComponent.props.reactopyaParent;
            let parentModel = parent.reactopyaModel || parent.props.reactopyaModel;
            let childId = reactComponent.props.reactopyaChildId;
            if (childId) {
                let isDynamic = true;
                let model = parentModel.addChild(childId, this._projectName, this._type, isDynamic);
                reactComponent.reactopyaModel = model; // i don't think we can set the props here
                this._reactopyaModel = model;    
            }
            else {
                console.error('Missing prop: childId');
            }
        }
    }
    start() {
        this._setComponentStateFromModel(); // this is important for snapshots (static html exports)
        if (this._reactopyaModel) {
            this._reactopyaModel.onPythonStateChanged((state) => {
                this._reactComponent.setState(state);
            });
            this._reactopyaModel.start();
        }
        else {
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
        if (this._reactopyaModel) {
            this._reactopyaModel.stop();
        }
    }
    update() {
        this._copyStateToJavaScriptState();
    }
    setJavaScriptState(state) {
        // if ((!this._reactopyaModel) && (!this._pythonProcess)) {
        //     for (let key in state) {
        //         this._pendingJavaScriptState[key] = state[key];
        //     }
        //     return;
        // }
        let newJavaScriptState = {};
        for (let key in state) {
            if (!compare(state[key], this._javaScriptState[key])) {
                this._javaScriptState[key] = clone(state[key]);
                newJavaScriptState[key] = clone(state[key]);
            }
        }
        if (Object.keys(newJavaScriptState).length > 0) {
            if (this._reactopyaModel) {
                this._reactopyaModel.setJavaScriptState(newJavaScriptState);
            }
            // else if (this._pythonProcess) {
            //     this._pythonProcess.sendMessage({
            //         name: 'setJavaScriptState',
            //         state: newJavaScriptState
            //     });
            // }
            else {
                console.error('Problem in setJavaScriptState: unable to find one of: this.reactopyaModel, props.reactopyaModel');
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

    // _handleReceiveMessageFromProcess = (msg) => {
    //     if (msg.name == 'setPythonState') {
    //         let somethingChanged = false;
    //         for (let key in msg.state) {
    //             if (!compare(msg.state[key], this._pythonState[key])) {
    //                 this._pythonState[key] = clone(msg.state[key]);
    //                 somethingChanged = true;
    //             }
    //         }
    //         if (somethingChanged) {
    //             this._copyPythonStateToState(this._syncPythonStateToStateKeys);
    //         }
    //     }
    // }

    _copyPythonStateToState(keys) {
        let newState = {};
        for (let key of keys) {
            if (!compare(this._pythonState[key], this._reactComponent.state[key])) {
                newState[key] = clone(this._pythonState[key]);
            }
        }
        this._reactComponent.setState(newState);
    }
    _setComponentStateFromModel() {
        // important for html snapshots
        let newState = {};
        if (this._reactopyaModel) {
            let javaScriptState = this._reactopyaModel.getJavaScriptState();
            for (let key in javaScriptState) {
                newState[key] = javaScriptState[key];
            }

            let pythonState = this._reactopyaModel.getPythonState();
            for (let key in pythonState) {
                newState[key] = pythonState[key];
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
