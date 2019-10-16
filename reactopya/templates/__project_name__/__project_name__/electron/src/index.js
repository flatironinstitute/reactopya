const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const util = require('util');

function print_usage() {
    console.info(`Usage:`);
    console.info(`reactopya_elec --command show --widget [widget_spec.json] --bundle [bundle_file.js] --message_dir [message_directory]`);
}

let mainWindow;

let kwargs = {};
for (let i=3; i<process.argv.length; i++) {
    if (process.argv[i] == '--bundle') {
        kwargs.bundle = process.argv[i+1];
    }
    else if (process.argv[i] == '--widget') {
        kwargs.widget = process.argv[i+1];
    }
    else if (process.argv[i] == '--message_dir') {
        kwargs.message_dir = process.argv[i+1];
    }
    else if (process.argv[i] == '--command') {
        kwargs.command = process.argv[i+1];
    }
    else if (process.argv[i] == '--help') {
        print_usage();
        process.exit(0);
    }
}

const command = kwargs.command;
const bundle_fname = kwargs.bundle;
const widget_spec_fname = kwargs.widget;
const message_dir = kwargs.message_dir;

if (command == 'show') {
    if (!bundle_fname) {
        print_usage();
        process.exit(-1);
    }
    if (!widget_spec_fname) {
        print_usage();
        process.exit(-1);
    }
    if (!message_dir) {
        print_usage();
        process.exit(-1);
    }
    show();
}
else {
    console.info(`Unrecognized command: ${command}`);
    process.exit(-1);
}

async function show() {
    await app.whenReady();

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            preload: __dirname + '/preload.js'
        }
    });

    //open links externally
    mainWindow.webContents.on('new-window', function(event, url){
        event.preventDefault();
        shell.openExternal(url);
    });

    await mainWindow.loadURL(`file://${__dirname}/../web/index.html`);

    const widget_spec = await read_json_file(widget_spec_fname);
    const bundle_js = await read_text_file(bundle_fname);

    await exec_javascript(mainWindow, bundle_js);

    // const type = 'ElectrodeGeometry';
    // const children = [];
    // const props = {
    //     "path": "sha1dir://0ba09f6658e767d4e70055773805a8d939a9a4c6.paired_mea64c/20160415_patch2/geom.csv",
    //     "download_from": "spikeforest.public"
    // };

    const project_name = '{{ project_name }}';
    const type = widget_spec.type;
    const children = widget_spec.children || [];
    const props = widget_spec.props || {};
    const key = widget_spec.key || '';

    const js = `
    {
        document.title = '${type} (${project_name})';
        const div = document.getElementById("root");
        const children = JSON.parse(\`${JSON.stringify(children)}\`);
        const props = JSON.parse(\`${JSON.stringify(props)}\`);
        let process0 = new window.ReactopyaElectronPythonProcess('${message_dir}', children);
        let model0 = process0.reactopyaModel();
        window.reactopya.widgets.${project_name}.${type}.render(
            div,
            children,
            props,
            '${key}',
            model0,
            {
                fullBrowser: true
            }
        );
        process0.start();
    }
    `;
    await exec_javascript(mainWindow, js);
}

async function read_json_file(fname) {
    let txt = await read_text_file(fname);
    return JSON.parse(txt);
}

async function read_text_file(fname) {
    const readFile = util.promisify(fs.readFile);
    return await readFile(fname, 'utf8');
}

function exec_javascript(window, js) {
    return new Promise(resolve => {
        window.webContents.executeJavaScript(js, null, function () {
            resolve();
        });
    });
}