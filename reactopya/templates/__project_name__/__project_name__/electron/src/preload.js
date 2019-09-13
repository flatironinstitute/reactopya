window.using_electron = true;

const util = require('util');

const fs = require('fs');

class JavaScriptPythonStateModelElectron {
    constructor() {
        this._pythonStateStringified = {};
        this._javaScriptStateStringified = {};
        this._pythonStateChangedHandlers = [];
        this._javaScriptStateChangedHandlers = [];
        this._childModels = [];
    }
    setPythonState(state) {
        this._setStateHelper(state, this._pythonStateStringified, this._pythonStateChangedHandlers);
    }
    setJavaScriptState(state) {
        this._setStateHelper(state, this._javaScriptStateStringified, this._javaScriptStateChangedHandlers);
    }
    onPythonStateChanged(handler) {
        this._pythonStateChangedHandlers.push(handler);
    }
    onJavaScriptStateChanged(handler) {
        this._javaScriptStateChangedHandlers.push(handler);
    }
    addChildModel(model) {
        this._childModels.push(model);
    }
    childModel(index) {
        return this._childModels[index];
    }
    _setStateHelper(state, existingStateStringified, handlers) {
        let changedState = {};
        let somethingChanged = false;
        for (let key in state) {
            let val = state[key];
            let valstr = JSON.stringify(val);
            if (valstr !== existingStateStringified[key]) {
                existingStateStringified[key] = valstr;
                changedState[key] = JSON.parse(valstr);
                somethingChanged = true;
            }
        }
        if (somethingChanged) {
            for (let handler of handlers) {
                handler(changedState);
            }
        }
    }
}

class ReactopyaElectronPythonProcess {
    constructor(message_dir, children) {
        this._message_dir = message_dir;
        this._running = false;
        this._receive_message_handlers = [];
        this._javaScriptPythonStateModel = null;
        this._message_index = 1000000;
        this._model = new JavaScriptPythonStateModelElectron();
        this.onReceiveMessage((msg) => {
            if (msg.name === 'setPythonState') {
                let ptr = this._model;
                for (let ind of msg.child_indices) {
                    ptr = ptr.childModel(ind);
                }
                ptr.setPythonState(msg.state);
            }
        });
        this._initialize_model(this._model, [], children);
    }
    javaScriptPythonStateModel() {
        return this._model;
    }
    start() {
        this._running = true;
        this._iterate();
    }
    sendMessage(msg) {
        this._message_index++;
        write_js_message(this._message_dir, this._message_index, msg);
    }
    stop() {
        this._running = false;
    }
    onReceiveMessage(handler) {
        this._receive_message_handlers.push(handler);
    }
    _initialize_model(model, child_indices, children) {
        model.onJavaScriptStateChanged((state) => {
            this.sendMessage({
                name: 'setJavaScriptState',
                state: state,
                child_indices: child_indices
            });
        });
        for (let i=0; i<children.length; i++) {
            let child_model = new JavaScriptPythonStateModelElectron();
            model.addChildModel(child_model);
            let new_inds = JSON.parse(JSON.stringify(child_indices));
            new_inds.push(i);
            this._initialize_model(child_model, new_inds, children[i].children || []);
        }
    }
    _iterate() {
        if (!this._running) return;
        this._do_iterate(() => {
            setTimeout(() => {
                this._iterate();
            }, 100);
        });
    }
    _do_iterate = async (callback) => {
        let messages = await take_py_messages(this._message_dir);
        for (let msg of messages) {
            for (let handler of this._receive_message_handlers) {
                handler(msg);
            }
        }
        callback();
    }
}
window.ReactopyaElectronPythonProcess = ReactopyaElectronPythonProcess;

async function take_py_messages(dirname) {
    const readdir = util.promisify(fs.readdir);
    const unlink = util.promisify(fs.unlink);

    let files = await readdir(dirname);

    files.sort();

    let messages = [];
    for (let file of files) {
        if (file.endsWith('.py.msg')) {
            let fname = dirname + '/' + file;
            let msg = await read_json_file(fname);
            await unlink(fname);
            messages.push(msg);
        }
    }
    return messages;
}

async function write_js_message(dirname, message_index, msg) {
    const fname = `${dirname}/${message_index}.js.msg`;
    await write_json_file(fname + '.tmp', msg);
    await rename_file(fname + '.tmp', fname);
}

async function read_json_file(fname) {
    let txt = await read_text_file(fname);
    return JSON.parse(txt);
}

async function read_text_file(fname) {
    const readFile = util.promisify(fs.readFile);
    return await readFile(fname, 'utf8');
}

async function write_json_file(fname, x) {
    await write_text_file(fname, JSON.stringify(x));
}

async function write_text_file(fname, txt) {
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(fname, txt);
}

async function rename_file(fname1, fname2) {
    const rename = util.promisify(fs.rename);
    await rename(fname1, fname2);
}



