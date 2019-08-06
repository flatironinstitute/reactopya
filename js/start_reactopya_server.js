#!/usr/bin/env node

const ReactopyaServer = require('./ReactopyaServer.js');

const port = process.env['PORT'] || 8081;

const SERVER = new ReactopyaServer();
SERVER.start({port: port});