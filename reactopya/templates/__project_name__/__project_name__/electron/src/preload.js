window.using_electron = true;

const util = require('util');
const fs = require('fs');
const ReactopyaModel = require('./ReactopyaModel.js');

class ReactopyaElectronPythonProcess {
    constructor(message_dir, children) {
        this._message_dir = message_dir;
        this._running = false;
        this._receive_message_handlers = [];
        this._javaScriptPythonStateModel = null;
        this._message_index = 1000000;
        this._model = new ReactopyaModel();
        this.onReceiveMessage((msg) => {
            if (msg.name === 'setPythonState') {
                this._model.setPythonState(msg.state);
            }
            else if (msg.name === 'customMessage') {
                this._model.handleCustomMessage(msg.message);
            }
        });
        this._initialize_model(this._model, children);
    }
    reactopyaModel() {
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
    _initialize_model(model, children) {
        let that = this;
        model.onJavaScriptStateChanged((state) => {
            that.sendMessage({
                name: 'setJavaScriptState',
                state: state
            });
        });
        model.onSendCustomMessage((msg) => {
            that.sendMessage({
                name: 'customMessage',
                message: msg
            });
        });
        model.addChildModelsFromSerializedChildren(children);

        // important to do this after adding the serialized children because this is for dynamic children
        model.onChildModelAdded(function(data) {
            that.sendMessage({
                name: 'addChild',
                data: data
            });
        });
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



