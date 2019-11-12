import WebSocket from 'ws';

export default class ReactopyaWebsocketServer {
    constructor(server) {
        this._server = server; // the server of the express app
        this._connections = {}; // connections by session id
        this._pendingMessagesBySessionId = {}; // in case we get messages from python before the websocket connection has been made\
        this._messageFromJavaScriptHandlers = []; // handlers for javascript messages
        this._disconnectHandlers = [];
    }
    onMessageFromJavaScript(handler) {
        // handler will by async function!
        // register handler for messages from js
        this._messageFromJavaScriptHandlers.push(handler);
    }
    onDisconnect(handler) {
        this._disconnectHandlers.push(handler);
    }
    async sendMessageToJavaScript(sessionId, msg) {
        // send a message to javascript
        if (sessionId in this._connections) {
            // send message to the session connection
            await this._connections[sessionId].sendMessage(msg);
        }
        else {
            // the connection is not yet established. save it as pending
            this._pendingMessagesBySessionId[sessionId] = this._pendingMessagesBySessionId[sessionId] || [];
            this._pendingMessagesBySessionId[sessionId].push(msg);
        }
    }
    async start() {
        // make a websocket server listening on the same port as the server
        this._wss = new WebSocket.Server({ server: this._server });
        this._wss.on('connection', (ws) => {
            ws.on('disconnect', async () => {
                if ('_sessionId' in ws) {
                    if (ws._sessionId in this._connections) {
                        delete this._connections[ws._sessionId];
                    }
                    for (let handler of this._disconnectHandlers) {
                        await handler(ws._sessionId);
                    }
                }
            });
            // new connection from client
            let X = new IncomingConnection(ws);
            X.onReceivedSessionId(async (sessionId) => {
                ws._sessionId = sessionId;
                // we have received the info about the session id, so we can save this connection
                this._connections[sessionId] = X;
                if (sessionId in this._pendingMessagesBySessionId) {
                    // send the pending messages
                    for (let msg of this._pendingMessagesBySessionId[sessionId]) {
                        await X.sendMessage(msg);
                    }
                    delete this._pendingMessagesBySessionId[sessionId];
                }
                X.onMessageFromJavaScript(async (msg) => {
                    // got a message from javascript, so handle it
                    for (let handler of this._messageFromJavaScriptHandlers) {
                        await handler(sessionId, msg);
                    }
                });
            });
        });
    }
}

class IncomingConnection {
    // A connection from javascript in the client browser
    constructor(ws) {
        this._ws = ws; // the websocket
        this._validated = null; // whether we validated the connection
        this._messageFromJavaScriptHandlers = []; // handlers for messages from js
        this._receivedSessionIdHandlers = []; // handlers for when we have received the session id
        this._sessionId = null; // the session id (after it has been received)
        this._connected = true;
        this._ws.on('message', async (message) => {await this._handleMessage(message);}); // handle a message from the js client
        this._ws.on('close', () => {this._connected = false;}); // the websocket connection has closed
    }
    connected() {
        // whether this websocket is still connected
        return this._connected;
    }
    sessionId() {
        // the session id
        return this._sessionId;
    }
    onReceivedSessionId(handler) {
        // handler will be an async function!
        // register handler for session id received
        this._receivedSessionIdHandlers.push(handler);
    }
    onMessageFromJavaScript(handler) {
        // handler will be an async function!
        // register handler for messages from javascript
        this._messageFromJavaScriptHandlers.push(handler);
    }
    async _handleMessage(message) {
        // handle a message from javascript
        let msg;
        try {
            // parse the websocket message
            msg = JSON.parse(message);
        }
        catch(err) {
            console.error('Error parsing JSON message for connection.');
            // something bad happened, let's terminate the connection
            that._ws.terminate();
            return;
        }
        if (!this._validated) {
            // if we are not yet validated, then this better be the validation message
            if ((msg.message_type == 'validation') && (msg.validation_string == 'reactopya-2') && (msg.session_id)) {
                console.info(`Validated incoming connection: ${msg.session_id}`);
                this._validated = true;
                await this.sendMessage({message_type: 'validation_confirmed'});
                // we got the session id.. so let's notify
                this._sessionId = msg.session_id;
                for (let handler of this._receivedSessionIdHandlers) {
                    await handler(msg.session_id);
                }
                return;
            }
            else {
                // validation wasn't perfect so we are terminating
                console.error('Error validating.', msg);
                this._ws.terminate();
                return;
            }
        }
        if (msg.message_type == 'start_python_process') {
            // no longer relevant
            console.info('ignoring message of type start_python_process');
        }
        else if (msg.message_type == 'to_python_process') {
            // send message to python process
            for (let handler of this._messageFromJavaScriptHandlers) {
                await handler(msg.message);
            }
        }
        else if (msg.message_type == 'stop_python_process') {
            // no longer relevant
            console.info('ignoring message of type stop_python_process');
        }
        else {
            // unexpected message
            console.error(`Unexpected message type ${msg.message_type}`);
        }
    }
    async sendMessage(msg) {
        // send message to js client
        this._ws.send(JSON.stringify(msg));
    }
}