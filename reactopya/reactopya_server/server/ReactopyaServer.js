import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import SessionManager from './SessionManager.js';
import ReactopyaWebsocketServer from './ReactopyaWebsocketServer.js';

export default class ReactopyaServer {
    constructor(opts) {
        this._workingDir = opts.workingDir;
        this._config = opts.config;
        this._listenPort = opts.listenPort;
        this._sessionManager = new SessionManager(this._config, this._workingDir);
        this._sessionManager.onMessageFromPython(async (sessionId, msg) => {await this._handleMessageFromPython(sessionId, msg);});
        this._websocketServer = null;

        this._app = express(); // the express app

        this._app.set('json spaces', 4); // when we respond with json, this is how it will be formatted
        // this._app.use(cors()); // in the future, if we want to do this
        this._app.use(express.json());

        this._app.get('/probe', async (req, res) => {
            await waitMsec(1000);
            try {
                await this._apiProbe(req, res) 
            }
            catch(err) {
                await this._errorResponse(req, res, 500, err.message);
            }
        });
        this._app.get('/app/:appName', async (req, res) => {
            try {
                await this._apiStartSession(req, res)
            }
            catch(err) {
                await this._errorResponse(req, res, 500, err.message);
            }
        });
    }
    async _handleMessageFromPython(sessionId, msg) {
        await this._websocketServer.sendMessageToJavaScript(sessionId, msg);
    }
    async _apiProbe(req, res) {
        res.json({ success: true });
    }
    async _apiStartSession(req, res) {
        let params = req.params;
        let query = req.query;
        let appName = params.appName;
        let S = await this._sessionManager.startSession(appName, query);
        if (!S) {
            await this._errorResponse(req, res, 500, 'Unable to start session.');
            return;
        }
        let html = await S.getHtml();
        if (!html) {
            await this._errorResponse(req, res, 500, 'Unable to to get html for session.');
            return;
        }
        res.send(html);
    }
    async _errorResponse(req, res, code, errstr) {
        console.info(`Responding with error: ${code} ${errstr}`);
        try {
            res.status(code).send(errstr);
        }
        catch(err) {
            console.warn(`Problem sending error: ${err.message}`);
        }
        await waitMsec(100);
        try {
            req.connection.destroy();
        }
        catch(err) {
            console.warn(`Problem destroying connection: ${err.message}`);
        }
    }
    async listen(port) {
        console.info('Starting http server...');
        await start_http_server(this._app, port);
        console.info('Starting websocket server...');
        this._websocketServer = new ReactopyaWebsocketServer(this._app.server);
        this._websocketServer.onMessageFromJavaScript(async (sessionId, message) => {
            await this._sessionManager.handleMessageFromJavaScript(sessionId, message);
        });
        await this._websocketServer.start();
        console.info('Server running.');
    }
}

function waitMsec(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function start_http_server(app, listen_port) {
    app.port = listen_port;
    if (process.env.SSL != null ? process.env.SSL : listen_port % 1000 == 443) {
        // The port number ends with 443, so we are using https
        app.USING_HTTPS = true;
        app.protocol = 'https';
        // Look for the credentials inside the encryption directory
        // You can generate these for free using the tools of letsencrypt.org
        const options = {
            key: fs.readFileSync(__dirname + '/encryption/privkey.pem'),
            cert: fs.readFileSync(__dirname + '/encryption/fullchain.pem'),
            ca: fs.readFileSync(__dirname + '/encryption/chain.pem')
        };

        // Create the https server
        app.server = https.createServer(options, app);
    } else {
        app.protocol = 'http';
        // Create the http server and start listening
        app.server = http.createServer(app);
    }
    await app.server.listen(listen_port);
    console.info(`Server is running ${app.protocol} on port ${app.port}`);
}

function readJsonFile(filePath) {
    const txt = fs.readFileSync(filePath);
    try {
        return JSON.parse(txt);
    }
    catch (err) {
        throw new Error(`Unable to parse JSON of file: ${filePath}`);
    }
}

function mkdirIfNeeded(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}