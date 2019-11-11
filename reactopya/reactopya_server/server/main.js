import ReactopyaServer from './ReactopyaServer.js';
import fs from 'fs';

checkEnvironmentVariable('REACTOPYA_SERVER_WORKING_DIR', {checkDirExists: true});
checkEnvironmentVariable('REACTOPYA_SERVER_CONFIG_PATH', {checkFileExists: true});
checkEnvironmentVariable('REACTOPYA_SERVER_LISTEN_PORT', {checkIsInt: true});

async function main() {
    let config = JSON.parse(fs.readFileSync(process.env.REACTOPYA_SERVER_CONFIG_PATH), 'utf8');
    config.configFilePath = process.env.REACTOPYA_SERVER_CONFIG_PATH;
    const server = new ReactopyaServer({
        workingDir: process.env.REACTOPYA_SERVER_WORKING_DIR,
        config: config
    });
    await server.listen(process.env.REACTOPYA_SERVER_LISTEN_PORT);
}

function checkEnvironmentVariable(varname, opts) {
    let val = process.env[varname];
    if (!val) {
        throw new Error(`Missing environment variable: ${varname}`)
    }
    if (opts.checkDirExists) {
        if (!fs.existsSync(val)) {
            throw new Error(`Directory does not exist: ${val}`)
        }
        if (!fs.lstatSync(val).isDirectory()) {
            throw new Error(`Not a directory: ${val}`)
        }
    }
    if (opts.checkFileExists) {
        if (!fs.existsSync(val)) {
            throw new Error(`File does not exist: ${val}`)
        }
        if (!fs.lstatSync(val).isFile()) {
            throw new Error(`Not a file: ${val}`);
        }
    }
    if (opts.checkIsInt) {
        let val2 = Number(val);
        if (isNaN(val2)) {
            throw new Error(`Invalid value for ${varname}: ${val}`);
        }
        if (val2 != Math.floor(val2)) {
            throw new Error(`Invalid value for ${varname}: ${val}`);
        }
    }
}

main();