from abc import abstractmethod
from copy import deepcopy
import sys
import select
import json
import time
import numpy as np

class Component:
    def __init__(self):
        self._python_state = dict()
        self._python_state_changed_handlers = []
        self._javascript_state = dict()
        self._quit = False
        self._running_process = False
        self._jupyter_mode = False

    @abstractmethod
    def javascript_state_changed(self, prev_state, new_state):
        pass

    def set_python_state(self, state):
        changed_state = dict()
        for key in state:
            if _different(state[key], self._python_state.get(key)):
                changed_state[key] = _json_serialize(state[key])
        if changed_state:
            for key in changed_state:
                self._python_state[key] = changed_state[key]
            if self._running_process:
                msg = {"name": "setPythonState", "state": changed_state}
                self._send_message(msg)
            for handler in self._python_state_changed_handlers:
                handler()
    
    def run_process_mode(self):
        self._running_process = True
        self.original_stdout = sys.stdout
        sys.stdout = sys.stderr
        iterate_timeout = 1
        self._initial_update()
        while True:
            self._flush_all()
            stdin_available = select.select([sys.stdin], [], [], iterate_timeout)[0]
            if stdin_available:
                line = sys.stdin.readline()
                try:
                    msg = json.loads(line)
                except:
                    print(line)
                    raise Exception('Error parsing message.')
                self._handle_message(msg)
            else:
                 self.iterate()
            self._flush_all()
            if self._quit:
                break
            time.sleep(0.01)

    def init_jupyter(self, **kwargs):
        self._jupyter_mode = True
        self._initial_update()
    
    def get_javascript_state(self, key):
        return deepcopy(self._javascript_state.get(key))

    def get_python_state(self, key, default_val):
        return deepcopy(self._python_state.get(key, default_val))

    def iterate(self):
        pass

    def on_python_state_changed(self, handler):
        self._python_state_changed_handlers.append(handler)

    def _initial_update(self):
        self.javascript_state_changed(deepcopy(self._javascript_state), deepcopy(self._javascript_state))

    # internal function to handle incoming message (coming from javascript component)
    def _handle_message(self, msg):
        if msg['name'] == 'setJavaScriptState':
            self._handle_javascript_state_changed(msg['state'])
        elif msg['name'] == 'quit':
            self._quit = True
            self._flush_all()
        else:
            print(msg)
            raise Exception('Unexpectected message')

    def _handle_javascript_state_changed(self, state):
        changed_state = dict()
        for key in state:
            if _different(state[key], self._javascript_state.get(key)):
                changed_state[key] = deepcopy(state[key])
        if changed_state:
            prev_javascript_state = deepcopy(self._javascript_state)
            for key in changed_state:
                self._javascript_state[key] = changed_state[key]
            self.javascript_state_changed(prev_javascript_state, deepcopy(self._javascript_state))

    # internal function to send message to javascript component
    def _send_message(self, msg):
        print(json.dumps(msg), file=self.original_stdout)
        self._flush_all()

    def _flush_all(self):
        self.original_stdout.flush()
        sys.stdout.flush()
        sys.stderr.flush()


def _different(a, b):
    return a is not b

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