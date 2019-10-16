import logging
import simplejson
import uuid
import tempfile
import shutil
import os
import numpy as np
from .shellscript import ShellScript

logger = logging.getLogger('reactopya')


class ReactopyaElectronWidget:
    """Reactopya electron widget"""
    def __init__(self, *, project_name, type, initial_children, props, key=''):
        self._project_name = project_name
        self._type = type
        self._children = dict()
        self._child_ids = []
        for child_id, ch in enumerate(initial_children):
            self._children[str(child_id)] = ReactopyaElectronWidget(
                project_name=ch.get('project_name', self._project_name),
                type=ch['type'],
                initial_children=ch.get('children', []),
                props=ch.get('props', {}),
                key=ch.get('key', '')
            )
            self._child_ids.append(str(child_id))
        
        self._model_id = uuid.uuid4().hex.upper()
        self._props = props
        self._key = key
        self._javascript_state_changed_handlers = []
        self._custom_message_handlers = []
        self._add_child_handlers = []
        self._tempdir = str(tempfile.mkdtemp(prefix='reactopya_electron_widget_'))
        self._bundle_fname = None
        self._electron_src = None

    def _set_bundle_fname(self, fname):
        self._bundle_fname = fname
    
    def _set_electron_src(self, dirname):
        self._electron_src = dirname

    def show(self):
        widget_spec = self._serialize(child_id='')
        widget_spec_fname = os.path.join(self._tempdir, 'widget.json')
        with open(widget_spec_fname, 'w') as f:
            simplejson.dump(widget_spec, f, ignore_nan=True)
        self._process = ElectronProcess()
        self._process.onMessage(self._handle_message)
        try:
            self._process.run(
                'show',
                message_dir=self._tempdir,
                electron_src=self._electron_src,
                bundle=self._bundle_fname,
                widget=widget_spec_fname
            )
        except:
            self._cleanup()
            raise
        finally:
            self._cleanup()
    
    def _cleanup(self):
        if os.path.exists(self._tempdir):
            shutil.rmtree(self._tempdir)

    def set_python_state(self, state):
        msg = dict(
            name='setPythonState',
            state=_json_serialize(state)
        )
        self._process.sendMessage(msg)

    def send_custom_message(self, message):
        msg = dict(
            name='customMessage',
            message=_json_serialize(message)
        )
        self._process.sendMessage(msg)
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)
    
    def on_custom_message(self, handler):
        self._custom_message_handlers.append(handler)
    
    def on_add_child(self, handler):
        self._add_child_handlers.append(handler)

    def _serialize(self, *, child_id=''):
        return dict(
            project_name=self._project_name,
            type=self._type,
            children=[self._children[id]._serialize(child_id=id) for id in self._child_ids],
            props=self._props,
            key=self._key,
            child_id=child_id,
            model_id=self._model_id
        )
    
    def _handle_message(self, msg):
        name = msg.get('name', '')
        if name == 'setJavaScriptState':
            state = msg['state']
            for handler in self._javascript_state_changed_handlers:
                handler(state)
        elif name == 'customMessage':
            message = msg['message']
            for handler in self._custom_message_handlers:
                handler(message)
        elif name == 'addChild':
            data = msg.get('data')
            for handler in self._add_child_handlers:
                handler(data)
        else:
            raise Exception('Unexpected message name: {}'.format(name))


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
        electron --no-sandbox {electron_src} --command {command} {args} --message_dir {message_dir}
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

def _listify_ndarray(x):
    if x.ndim == 1:
        if np.issubdtype(x.dtype, np.integer):
            return [int(val) for val in x]
        else:
            return [float(val) for val in x]
    elif x.ndim == 2:
        ret = []
        for j in range(x.shape[1]):
            ret.append(_listify_ndarray(x[:, j]))
        return ret
    elif x.ndim == 3:
        ret = []
        for j in range(x.shape[2]):
            ret.append(_listify_ndarray(x[:, :, j]))
        return ret
    elif x.ndim == 4:
        ret = []
        for j in range(x.shape[3]):
            ret.append(_listify_ndarray(x[:, :, :, j]))
        return ret
    else:
        raise Exception('Cannot listify ndarray with {} dims.'.format(x.ndim))

def _json_serialize(x):
    if isinstance(x, np.ndarray):
        return _listify_ndarray(x)
    elif isinstance(x, np.integer):
        return int(x)
    elif isinstance(x, np.floating):
        return float(x)
    elif type(x) == dict:
        ret = dict()
        for key, val in x.items():
            ret[key] = _json_serialize(val)
        return ret
    elif type(x) == list:
        ret = []
        for i, val in enumerate(x):
            ret.append(_json_serialize(val))
        return ret
    else:
        return x