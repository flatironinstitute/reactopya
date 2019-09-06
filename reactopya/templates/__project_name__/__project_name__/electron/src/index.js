const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const util = require('util');

function print_usage() {
    console.info(`Usage:`);
    console.info(`reactopya_elec show --widget [widget_spec.json] --bundle [bundle_file.js] --message_dir [message_directory]`);
}

let mainWindow;

const arg1 = process.argv[2] || null;
let args = {};
for (let i=2; i<process.argv.length; i++) {
    if (process.argv[i] == '--bundle') {
        args.bundle = process.argv[i+1];
    }
    else if (process.argv[i] == '--widget') {
        args.widget = process.argv[i+1];
    }
    else if (process.argv[i] == '--message_dir') {
        args.message_dir = process.argv[i+1];
    }
    else if (process.argv[i] == '--help') {
        print_usage();
        process.exit(0);
    }
}

const command = arg1;
const bundle_fname = args.bundle;
const widget_spec_fname = args.widget;
const message_dir = args.message_dir;

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
        let model0 = process0.javaScriptPythonStateModel();
        props.javaScriptPythonStateModel = model0;
        set_models_on_children('${project_name}', children, model0);
        window.reactopya.widgets.${project_name}.${type}.render(div, children, props, '${key}');
        process0.start();

        function set_models_on_children(parent_project_name, children1, model1) {
            for (let i=0; i<children1.length; i++) {
                if (!children1[i].project_name) {
                    children1[i].project_name = parent_project_name;
                }
                let props = children1[i].props || {};
                props.javaScriptPythonStateModel = model1.childModel(i);
                children1[i].props = props;

                set_models_on_children(children1[i].project_name, children1[i].children||[], model1.childModel(i));
            }
        }
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