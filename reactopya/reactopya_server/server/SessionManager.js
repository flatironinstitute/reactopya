import fs from 'fs';
import { spawn } from 'child_process';
import { Session } from 'inspector';
import path from 'path';
import { SIGINT } from 'constants';

// Manage the app sessions
export default class SessionManager {
    constructor(config, workingDir) {
        this._config = config; // config comes from the config json file
        this._workingDir = workingDir; // the working directory for this server
        this._sessions = {};
        this._messageFromPythonHandlers = [];

        // collect the app configs by name, for convenience
        this._appConfigByName = {};
        for (let a of this._config.apps) {
            this._appConfigByName[a.name] = a;
        }

        // make the directory for the sessions
        mkdirIfNeeded(`${this._workingDir}/sessions`);
    }
    async onMessageFromPython(handler) {
        // this handler is async!
        this._messageFromPythonHandlers.push(handler);
    }
    async startSession(appName, query) {
        // check if we recognize this app by name
        if (!(appName in this._appConfigByName)) {
            return null;
        }

        // Create a new session
        let S = new AppSession(this._config, this._workingDir, this._appConfigByName[appName], query);
        console.info(`Session started: ${appName} ${S.sessionId()}`);
        this._sessions[S.sessionId()] = S;
        S.onMessageFromPython(async (msg) => {
            for (let handler of this._messageFromPythonHandlers) {
                await handler(S.sessionId(), msg);
            }
        });
        S.onStopped(async () => {
            console.info(`Session stopped: ${appName} ${S.sessionId()}`);
            delete this._sessions[S.sessionId()];
        });
        if (!await S.start()) {
            // it didn't start somehow
            return null;
        }

        // Return the new session
        return S;
    }
    async handleMessageFromJavaScript(sessionId, message) {
        if (!(sessionId in this._sessions)) {
            console.error(`Cannot handle message from javascript. No session with id ${sessionId}`);
            return;
        }
        await this._sessions[sessionId].handleMessageFromJavaScript(message);
    }
    async stopSession(sessionId) {
        if (!(sessionId in this._sessions)) {
            return;
        }
        await this._sessions[sessionId].stop();
    }
}

class AppSession {
    // A single user session of an app
    constructor(config, workingDir, appConfig, query) {
        this._config = config; // this config from the json file
        this._appConfig = appConfig; // the config just for the app
        this._query = query; // the query from the url
        this._sessionId = makeRandomId(10); // a random session id
        this._messageIndex = 100000;
        this._sessionDir = `${workingDir}/sessions/${this._sessionId}`; // the working directory for this session
        this._pythonProcess = null; // will be created on start()
        this._status = 'pending'; // waiting to start
        this._messageFromPythonHandlers = []; // message handlers - see onMessageFromPython
        this._stoppedHandlers = [];
        this._lastKeepAlive = new Date();
    }
    sessionId() {
        return this._sessionId;
    }
    async start() {
        await fs.promises.mkdir(this._sessionDir); // Create the session directory
        // start the python process
        this._pythonProcess = new PythonProcess(
            this._config,
            this._appConfig,
            this._sessionDir,
            this._sessionId,
            this._query
        );
        let ret = await this._pythonProcess.start();
        if (!ret) {
            this._status = 'error';
            return;
        }
        this._status = 'running';
        // start checking for messages from python
        await this._checkForMessagesFromPython();
        return true;
    }
    async stop() {
        await this._doStop();
    }
    async handleMessageFromJavaScript(message) {
        if (message.name === 'keepAlive') {
            this._lastKeepAlive = new Date();
            return;
        }
        let fname = `${this._sessionDir}/${this._messageIndex}.msg-from-js`;
        this._messageIndex++;

        await fs.promises.writeFile(fname + '.tmp', JSON.stringify(message), 'utf-8');
        await fs.promises.rename(fname + '.tmp', fname);
    }
    onMessageFromPython(handler) {
        // Note that handler must be an async function!
        // register the handler
        this._messageFromPythonHandlers.push(handler);
    }
    onStopped(handler) {
        this._stoppedHandlers.push(handler);
    }
    status() {
        // return the status, pending, running, stopped, error
        return this._status;
    }
    async getHtml() {
        // get the full html bundle created by the widget - read from index.html in the session directory
        let timer = new Date();
        while (true) {
            try {
                let html = await fs.promises.readFile(this._sessionDir + '/index.html', 'utf-8');
                return html;
            }
            catch (err) {
                let elapsed = (new Date()) - timer;
                if (elapsed > 15000) {
                    // it's been too long
                    this._status = 'error';
                    console.warn('Timout waiting for index.html to appear.');
                    return null;
                }
            }
            await waitMsec(200);
        }
    }
    async _checkForMessagesFromPython() {
        if (this._pythonProcess.exited()) {
            await this._doStop();
            return;
        }
        if (this._status !== 'running')
            return;
        let elapsedSinceLastKeepAlive = (new Date()) - this._lastKeepAlive;
        if (elapsedSinceLastKeepAlive > 60 * 1000) {
            await this._doStop();
            return;
        }
        // look for message files (from python) in the session directory
        let messageFiles = [];
        let files;
        try {
            files = await fs.promises.readdir(this._sessionDir);
        }
        catch(err) {
            console.warn('Closing session because unable to read session directory.');
            await this._doStop();
            return;
        }
        for (let file of files) {
            if (file.endsWith('.msg-from-py')) {
                messageFiles.push(file);
            }
        }
        // sort them so that we process them in the right order
        messageFiles.sort();
        for (let msgFile of messageFiles) {
            let msgPath = `${this._sessionDir}/${msgFile}`;
            let msgText = await fs.promises.readFile(msgPath);
            let msg = JSON.parse(msgText);
            // remove the message after parsing it
            await fs.promises.unlink(msgPath);
            for (let handler of this._messageFromPythonHandlers) {
                // send to the handlers, which must be async functions!
                await handler({
                    message_type: 'from_python_process',
                    message: msg
                });
            }
        }
        if (!fs.existsSync(this._sessionDir)) {
            // the session directory does not exist, so we are done
            await this._doStop();
            return;
        }
        setTimeout(async () => {
            // we need to do it this way so that we can return from the function
            // maybe there is a better way
            await this._checkForMessagesFromPython();
        }, 500);
    }
    async _doStop() {
        if (this._status === 'stopped')
            return;
        this._status = 'stopped';
        await this._pythonProcess.stop();
        try {
            deleteFolderRecursive(this._sessionDir);
        }
        catch(err) {
            // maybe it was already gone.
        }
        for (let handler of this._stoppedHandlers) {
            await handler();
        }
    }
}

function waitMsec(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file, index) => {
            const curPath = Path.join(path, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

class PythonProcess {
    // The python process for a single user session for an app
    constructor(config, appConfig, sessionDir, sessionId, query) {
        this._config = config; // the config from the json file
        this._appConfig = appConfig; // the config specific to this app
        this._sessionDir = sessionDir; // the working directory for this session
        this._sessionId = sessionId;
        this._query = query; // they query from the url
        this._process = null; // will create at start()
        this._exited = false;
    }
    exited() {
        return this._exited;
    }
    async start() {
        // the config path is needed to resolve the location of the py files
        // which are specified relative to the location of the config json
        // the configFilePath is (hackily) set in main.js
        let configPath = path.dirname(this._config.configFilePath);
        if (!this._appConfig.pyFile) {
            throw Error('Missing pyFile in app config');
        }
        let pyFilePath = path.resolve(configPath, this._appConfig.pyFile);

        // spawn the process and pass the query parameters
        let env = Object.create(process.env);
        env.REACTOPYA_SERVER_SESSION_DIR = this._sessionDir;
        env.REACTOPYA_SERVER_SESSION_ID = this._sessionId;
        let args = [pyFilePath]
        for (let key0 in this._query) {
            args.push(`--${key0}`);
            args.push(this._query[key0]);
        }
        this._process = spawn('python', args, { env: env });
        this._process.stderr.on('data', (data) => {
            // stderr from the process
            console.error('FROM PROCESS:', data.toString());
        });
        this._process.stdout.on('data', (data) => {
            // stdout from the process
            console.info('FROM PROCESS:', data.toString());
        });
        this._process.on('exit', (code) => {
            this._exited = true;
        });
        return true;
    }
    async stop() {
        if (this._exited) return;
        let signals = ['SIGINT', 'SIGINT', 'SIGTERM', 'SIGTERM', 'SIGKILL', 'SIGKILL']
        for (let sig of signals) {
            this._process.kill(sig);
            await waitMsec(500);
            if (this._exited) return;
            await waitMsec(4500);
            if (this._exited) return;
        }
        if (!this._exited) {
            console.warn('Unable to stop process after trying signals.');
        }
    }
}

function mkdirIfNeeded(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

function makeRandomId(num_chars) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < num_chars; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}