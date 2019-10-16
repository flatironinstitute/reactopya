// import PythonProcess from './PythonProcess';
const stable_stringify = require('json-stable-stringify');

export default class PythonInterface {
    constructor(reactComponent, config) {
        this._reactComponent = reactComponent;
        this._projectName = config.project_name;
        this._type = config.type;
        this._pythonState = {};
        this._javaScriptState = {};
        this._pendingJavaScriptState = {};
        this._reactopyaModel = reactComponent.reactopyaModel || reactComponent.props.reactopyaModel;
        if ((!this._reactopyaModel) && (reactComponent.props.reactopyaParent)) {
            let parent = reactComponent.props.reactopyaParent;
            let parentModel = null;
            // the following is tricky, but handles some sitations where parents appear as grandparents
            while (true) {
                parentModel = (parent.reactopyaModel) || (parent.props.reactopyaModel);
                if (parentModel) {
                    break;
                }
                else {
                    if (parent.props.reactopyaParent) {
                        parent = parent.props.reactopyaParent;
                        // now we try again
                    }
                    else {
                        break;
                    }
                }
            }
            if (parentModel) {
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
            else {
                console.error(`Parent of ${this._type} does not have a reactopya model`, reactComponent, parent);
            }
        }
    }
    start() {
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
        this._setComponentStateFromModel(); // this is important for snapshots (static html exports)
    }
    stop() {
        if (this._reactopyaModel) {
            this._reactopyaModel.stop();
        }
    }
    setState(state) {
        this.setJavaScriptState(state);
    }
    setJavaScriptState(state) {
        let newJavaScriptState = {};
        for (let key in state) {
            if (!compare(state[key], this._javaScriptState[key])) {
                this._javaScriptState[key] = clone(state[key]);
                newJavaScriptState[key] = clone(state[key]);
            }
        }
        if (Object.keys(newJavaScriptState).length > 0) {
            this._reactComponent.setState(newJavaScriptState);
            if (this._reactopyaModel) {
                this._reactopyaModel.setJavaScriptState(newJavaScriptState);
            }
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
    sendMessage(msg) {
        if (this._reactopyaModel) {
            this._reactopyaModel.sendCustomMessage(msg);
        }
        else {
            console.error('Problem in sendMessage: unable to find one of: this.reactopyaModel, props.reactopyaModel');
        }
    }
    onMessage(handler) {
        if (this._reactopyaModel) {
            this._reactopyaModel.onCustomMessage(handler);
        }
        else {
            console.error('Problem in onMessage: unable to find one of: this.reactopyaModel, props.reactopyaModel');
        }
    }
    _setComponentStateFromModel() {
        // important for html snapshots
        if (this._reactopyaModel) {
            this.setState(this._reactopyaModel.getJavaScriptState());
            this._reactComponent.setState(this._reactopyaModel.getPythonState());
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
