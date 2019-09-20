const { spawn } = require('child_process');

const fs = require('fs');
const tmp = require('tmp');

function ReactopyaPythonProcess(projectName, type, initialChildren, props, onReceiveMessage) {
    let that = this;
    let m_tmpDir = null;
    let m_buf = '';
    let m_process = null;

    this.start = function() {
        let pythonCode = '';
        pythonCode = pythonCode + `from ${projectName} import ${type}` + '\n\n'
        pythonCode = pythonCode + `if __name__ == '__main__':` + '\n'
        pythonCode = pythonCode + `  A = ${type}()` + '\n'
        pythonCode = pythonCode + `  A.run_process_mode()` + '\n'

        m_tmpDir = tmp.dirSync({ template: 'tmp-reactopya-XXXXXX'});;
        let exePath = m_tmpDir.name + '/entry.py';
        fs.writeFileSync(exePath, pythonCode);

        m_process = spawn('python', [exePath]);
        m_process.stderr.on('data', (data) => {
            console.error('FROM PROCESS:', data.toString());
        });
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
                        console.error('Error parsing message ---SERVER--');
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
    }
    this.sendMessage = function (msg) {
        try {
            m_process.stdin.write(JSON.stringify(msg) + '\n');
        }
        catch(err) {
            console.error(err);
            console.error('Error writing message to stdin of process');
        }
    }
    this.stop = function() {
        // remove the temporary directory
        if (fs.existsSync(m_tmpDir.name)) {
            deleteFolderRecursive(m_tmpDir.name);
        }
        that.sendMessage({name: "quit"});
    }
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