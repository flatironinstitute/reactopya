from abc import abstractmethod
from copy import deepcopy
import sys
import numpy as np

class ReactopyaComponent:
    def __init__(self, Widget):
        self._python_state = dict()
        self._python_state_changed_handlers = []
        self._send_custom_message_handlers = []
        self._javascript_state = dict()
        self._quit = False
        self._running_process = False
        self._widget_instance = Widget()
        setattr(self._widget_instance, 'set_state', self.set_state)
        setattr(self._widget_instance, 'set_python_state', self.set_python_state)
        setattr(self._widget_instance, 'get_python_state', self.get_python_state)
        setattr(self._widget_instance, 'get_javascript_state', self.get_javascript_state)
        setattr(self._widget_instance, 'send_message', self.send_custom_message)

    def javascript_state_changed(self, prev_state, new_state):
        self._widget_instance.javascript_state_changed(prev_state, new_state)
    
    def get_data_WIP(self, request, response):
        if hasattr(self._widget_instance, 'get_data'):
            self._widget_instance.get_data_WIP(request, response)
        else:
            raise Exception('Widget has no method: get_data_WIP')
    
    def set_state(self, state):
        self.set_python_state(state)

    def set_python_state(self, state):
        changed_state = dict()
        for key in state:
            changed_state[key] = state[key]
            self._python_state[key] = state[key]
        for handler in self._python_state_changed_handlers:
            handler(changed_state)
        sys.stdout.flush()
    
    def get_javascript_state(self, key):
        return deepcopy(self._javascript_state.get(key))

    def get_python_state(self, key, default_val):
        return deepcopy(self._python_state.get(key, default_val))

    def iterate(self):
        if hasattr(self._widget_instance, 'iterate'):
            self._widget_instance.iterate()

    def on_python_state_changed(self, handler):
        self._python_state_changed_handlers.append(handler)
    
    def on_send_custom_message(self, handler):
        self._send_custom_message_handlers.append(handler)

    def _initial_update(self):
        self.javascript_state_changed(deepcopy2(self._javascript_state), deepcopy2(self._javascript_state))
        sys.stdout.flush()

    def _handle_javascript_state_changed(self, state):
        changed_state = dict()
        for key in state:
            if _different(state[key], self._javascript_state.get(key)):
                changed_state[key] = deepcopy2(state[key])
        if changed_state:
            prev_javascript_state = deepcopy2(self._javascript_state)
            for key in changed_state:
                self._javascript_state[key] = changed_state[key]
            self.javascript_state_changed(prev_javascript_state, deepcopy2(self._javascript_state))
            sys.stdout.flush()
        
    def send_custom_message(self, message):
        for handler in self._send_custom_message_handlers:
            handler(message)
    
    def _handle_custom_message(self, message):
        if hasattr(self._widget_instance, 'on_message'):
            self._widget_instance.on_message(message)
        else:
            raise Exception('Unable to process custom message. No on_message method found in widget.')

def deepcopy2(x):
    if isinstance(x, dict):
        ret = dict()
        for key, val in x.items():
            ret[key] = deepcopy2(val)
        return ret
    elif isinstance(x, list):
        ret = []
        for val in x:
            ret.append(deepcopy2(val))
        return ret
    else:
        return x

def _different(a, b):
    return a is not b