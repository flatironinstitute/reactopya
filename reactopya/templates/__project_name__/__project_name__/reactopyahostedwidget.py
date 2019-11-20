import logging
import simplejson
import uuid
import tempfile
import shutil
import os
import time
import sys
import numpy as np
from .reactopya_serialize import reactopya_serialize, reactopya_deserialize

logger = logging.getLogger('reactopya')

class ReactopyaHostedWidget:
    """Reactopya hosted widget"""
    def __init__(self, *, project_name, type, initial_children, props, key=''):
        self._project_name = project_name
        self._type = type
        self._children = dict()
        self._child_ids = []
        for child_id, ch in enumerate(initial_children):
            self._children[str(child_id)] = ReactopyaHostedWidget(
                project_name=ch.get('project_name', self._project_name),
                type=ch['type'],
                initial_children=ch.get('children', []),
                props=ch.get('props', {}),
                key=ch.get('key', '')
            )
            self._child_ids.append(str(child_id))
        self._props = props
        self._key = key
        self._javascript_state_changed_handlers = []
        self._custom_message_handlers = []
        self._add_child_handlers = []
        self._message_index = 100000
        self._snapshot_html = None
        self._session_dir = None
        self._session_id = None
    
    def _set_session_id(self, session_id):
        self._session_id = session_id
    
    def _set_snapshot_html(self, html):
        self._snapshot_html = html

    def _set_session_dir(self, path):
        self._session_dir = path

    def show(self):
        with open(os.path.join(self._session_dir, 'index.html'), 'w') as f:
            f.write(self._snapshot_html)
        
        while True:
            if not os.path.exists(self._session_dir):
                return
            self._iterate()
            time.sleep(0.1)
    
    def set_python_state(self, state):
        msg = dict(
            name='setPythonState',
            state=state
        )
        self._send_message_to_javascript(msg)

    def send_custom_message(self, message):
        msg = dict(
            name='customMessage',
            message=message
        )
        self._send_message_to_javascript(msg)
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)
    
    def on_custom_message(self, handler):
        self._custom_message_handlers.append(handler)
    
    def on_add_child(self, handler):
        self._add_child_handlers.append(handler)

    def _iterate(self):
        sys.stdout.flush()
        sys.stderr.flush()
        messages = take_js_messages(self._session_dir)
        for msg in messages:
            self._handle_message(msg)
    
    def _handle_message(self, msg):
        # handle message from javascript
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
    
    def _send_message_to_javascript(self, msg):
        msg = reactopya_serialize(msg)
        self._message_index = self._message_index + 1
        write_py_message(self._session_dir, self._message_index, msg)


def write_py_message(dirname, message_index, msg):
    fname = os.path.join(dirname, '{}.msg-from-py'.format(message_index))
    with open(fname + '.tmp', 'w') as f:
        simplejson.dump(msg, f, ignore_nan=True)
    os.rename(fname + '.tmp', fname)

def take_js_messages(dirname):
    messages = []
    files = os.listdir(dirname)
    files = sorted(files)
    for file in files:
        if file.endswith('.msg-from-js'):
            fname = os.path.join(dirname, file)
            with open(fname, 'r') as f:
                msg = simplejson.load(f)
            msg = reactopya_deserialize(msg)
            messages.append(msg)
            os.remove(fname)
    return messages