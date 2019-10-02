const { spawn } = require('child_process');

const fs = require('fs');
const tmp = require('tmp');

function ReactopyaPythonProcess(projectName, type, initialChildren, props, onReceiveMessage) {
    let that = this;
    let m_tmpDir = null;
    let m_buf = '';
    let m_process = null;

    this.start = function() {
        m_tmpDir = tmp.dirSync({ template: 'tmp-reactopya-XXXXXX'});;

        let initial_children_json_b64 = btoa(JSON.stringify(initialChildren));
        let pythonCode = '';
        pythonCode = pythonCode + `import json` + '\n'
        pythonCode = pythonCode + `import base64` + '\n'
        pythonCode = pythonCode + `from ${projectName} import ${type}` + '\n\n'

        pythonCode = pythonCode + `if __name__ == '__main__':` + '\n'
        pythonCode = pythonCode + `  A = ${type}()` + '\n'
        pythonCode = pythonCode + `  initial_children_json_b64='${initial_children_json_b64}'` + '\n'
        pythonCode = pythonCode + `  initial_children_json=base64.b64decode(initial_children_json_b64).decode('utf-8')` + '\n'
        pythonCode = pythonCode + `  initial_children = json.loads(initial_children_json)` + '\n'
        pythonCode = pythonCode + `  A.add_serialized_children(initial_children)` + '\n'
        pythonCode = pythonCode + `  A.run_process_mode('${m_tmpDir.name}')` + '\n'

        let exePath = m_tmpDir.name + '/entry.py';
        fs.writeFileSync(exePath, pythonCode);

        let messageReader = new MessageReader(m_tmpDir.name);
        messageReader.onMessage(function(msg) {
            onReceiveMessage && onReceiveMessage(msg);
        });

        m_process = spawn('python', [exePath]);
        m_process.stdout.on('data', (data) => {
            console.error('FROM PROCESS STDOUT:', data.toString());
        });
        m_process.stderr.on('data', (data) => {
            console.error('FROM PROCESS STDERR:', data.toString());
        });

        /*
        m_process.stdout.on('data', (data) => {
            m_buf = m_buf + data.toString();
            while (true) {
                let ind = m_buf.indexOf('\n');
                if (ind >= 0) {
                    let txt = m_buf.slice(0, ind);
                    m_buf = m_buf.slice(ind + 1);
                    let msg;
                    try {
                        msg = JSON.parse(txt);
                    }
                    catch(err) {
                        console.error('Error parsing message --------');
                        console.error(txt);
                        msg = null;
                    }
                    if (msg) {
                        onReceiveMessage && onReceiveMessage(msg);
                    }
                }
                else {
                    break;
                }
            }
        });
        */
    }
    this.sendMessage = function (msg) {
        try {
            writeMessage(m_tmpDir.name, msg);
        }
        catch(err) {
            if (fs.existsSync(m_tmpDir.name)) {
                console.warn('Problem writing message', msg);
            }
        }
        // try {
        //     m_process.stdin.write(JSON.stringify(msg) + '\n');
        // }
        // catch(err) {
        //     console.error(err);
        //     console.error('Error writing message to stdin of process');
        // }
    }
    this.stop = function() {
        that.sendMessage({name: "quit"});
        // remove the temporary directory
        if (fs.existsSync(m_tmpDir.name)) {
            deleteFolderRecursive(m_tmpDir.name);
        }
    }
}

function MessageReader(dirpath) {
    let m_message_callbacks = [];
    this.onMessage=function(callback) {
        m_message_callbacks.push(callback);
    }

    function checkForMessages() {
        let messageFiles = [];
        try {
            fs.readdirSync(dirpath).forEach(function(file) {
                if (file.endsWith('.msg-from-python')) {
                    messageFiles.push(file);
                }
            });
            messageFiles.sort();
            for (let msgFile of messageFiles) {
                let msg = read_json_file(`${dirpath}/${msgFile}`);
                fs.unlinkSync(`${dirpath}/${msgFile}`)
                for (let cb of m_message_callbacks) {
                    cb(msg);
                }
                break; // only one at a time for now
            }
        }
        catch(err) {
            if (!fs.existsSync(dirpath)) {
                return false;
            }
            console.warn('Problem checking for messages.', dirpath, err);
        }
        return true;
    }

    function nextCheck() {
        setTimeout(function() {
            if (!checkForMessages()) return;
            nextCheck();
        }, 100);
    }
    nextCheck();
}

let global_message_index = 100000;

function writeMessage(dirpath, msg) {
    let fname = `${dirpath}/${global_message_index}.msg-from-js`;
    global_message_index++;
    write_json_file(fname, msg);
}

function read_json_file(fname) {
    let txt = read_text_file(fname);
    return JSON.parse(txt);
}

function read_text_file(fname) {
    return fs.readFileSync(fname, 'utf8');
}

function write_json_file(fname, x) {
    write_text_file(fname, JSON.stringify(x));
}

function write_text_file(fname, txt) {
    fs.writeFileSync(fname + '.tmp', txt);
    fs.renameSync(fname + '.tmp', fname);
}

var deleteFolderRecursive = function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index){
        var curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };

module.exports = ReactopyaPythonProcess;