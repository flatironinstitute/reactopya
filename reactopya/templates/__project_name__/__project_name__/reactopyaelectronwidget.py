import simplejson
import uuid
import tempfile
import shutil
import os
from .shellscript import ShellScript

class ReactopyaElectronWidget:
    """Reactopya electron widget"""
    def __init__(self, *, project_name, type, children, props, key=''):
        self._model_id = uuid.uuid4().hex.upper()
        self._project_name = project_name
        self._type = type
        self._children = [
            ReactopyaElectronWidget(project_name=ch.get('project_name', self._project_name), type=ch['type'], children=ch.get('children', []), props=ch.get('props', {}), key=ch.get('key', ''))
            for ch in children
        ]
        self._props = props
        self._key = key
        self._javascript_state_changed_handlers = []
        self._tempdir = str(tempfile.mkdtemp(prefix='reactopya_electron_widget_'))
        self._bundle_fname = None
        self._electron_src = None

    def _set_bundle_fname(self, fname):
        self._bundle_fname = fname
    
    def _set_electron_src(self, dirname):
        self._electron_src = dirname

    def show(self):
        widget_spec = self._serialize()
        widget_spec_fname = os.path.join(self._tempdir, 'widget.json')
        with open(widget_spec_fname, 'w') as f:
            simplejson.dump(widget_spec, f, ignore_nan=True)
        self._process = ElectronProcess()
        self._process.onMessage(self._handle_message)
        try:
            self._process.run('show', message_dir=self._tempdir, electron_src=self._electron_src, bundle=self._bundle_fname, widget=widget_spec_fname)
        except:
            raise
        finally:
            self._cleanup()
    
    def _cleanup(self):
        if os.path.exists(self._tempdir):
            shutil.rmtree(self._tempdir)
    
    def set_python_state(self, state, child_indices=[]):
        msg = dict(
            name='setPythonState',
            state=state,
            child_indices=child_indices
        )
        self._process.sendMessage(msg)
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)

    def _serialize(self):
        return dict(
            project_name=self._project_name,
            type=self._type,
            children=[ch._serialize() for ch in self._children],
            props=self._props,
            key=self._key,
            model_id=self._model_id
        )
    
    def _handle_message(self, msg):
        name = msg.get('name')
        if name == 'setJavaScriptState':
            state = msg.get('state')
            child_indices = msg.get('child_indices')
            for handler in self._javascript_state_changed_handlers:
                handler(state, child_indices)

class ElectronProcess:
    def __init__(self):
        self._message_index = 1000000
        self._message_handlers = []
    def run(self, command, message_dir, electron_src, **kwargs):
        self._message_dir = message_dir

        args = []
        for key, val in kwargs.items():
            args.append('--{} {}'.format(key, val))

        shell_cmd = ShellScript('''
        #!/bin/bash
        electron {electron_src} {command} {args} --message_dir {message_dir}
        '''.format(electron_src=electron_src, command=command, args=' '.join(args), message_dir=message_dir))
        shell_cmd.start()
        while True:
            retcode = shell_cmd.wait(0.01)
            if retcode is None:
                self._iterate()
    def _iterate(self):
        messages = take_js_messages(self._message_dir)
        for msg in messages:
            for handler in self._message_handlers:
                handler(msg)
    def sendMessage(self, msg):
        self._message_index = self._message_index + 1
        write_py_message(self._message_dir, self._message_index, msg)
    def onMessage(self, handler):
        self._message_handlers.append(handler)

def write_py_message(dirname, message_index, msg):
    fname = os.path.join(dirname, '{}.py.msg'.format(message_index))
    with open(fname + '.tmp', 'w') as f:
        simplejson.dump(msg, f, ignore_nan=True)
    os.rename(fname + '.tmp', fname)

def take_js_messages(dirname):
    messages = []
    files = os.listdir(dirname)
    files = sorted(files);
    for file in files:
        if file.endswith('.js.msg'):
            fname = os.path.join(dirname, file)
            with open(fname, 'r') as f:
                msg = simplejson.load(f)
            messages.append(msg)
            os.remove(fname)
    return messages