from abc import abstractmethod
from copy import deepcopy
import sys
import select
import json
import time
import numpy as np
import simplejson
# No longer used
# class Component:
#     def __init__(self):
#         self._python_state = dict()
#         self._python_state_changed_handlers = []
#         self._javascript_state = dict()
#         self._quit = False
#         self._running_process = False

#     @abstractmethod
#     def javascript_state_changed(self, prev_state, new_state):
#         pass
    
#     def set_state(self, state):
#         self.set_python_state(state)

#     def set_python_state(self, state):
#         changed_state = dict()
#         for key in state:
#             if _different(state[key], self._python_state.get(key)):
#                 changed_state[key] = _json_serialize(state[key])
#         if changed_state:
#             for key in changed_state:
#                 self._python_state[key] = changed_state[key]
#             for handler in self._python_state_changed_handlers:
#                 handler(changed_state)
    
#     def get_javascript_state(self, key):
#         return deepcopy(self._javascript_state.get(key))

#     def get_python_state(self, key, default_val):
#         return deepcopy(self._python_state.get(key, default_val))

#     def iterate(self):
#         pass

#     def on_python_state_changed(self, handler):
#         self._python_state_changed_handlers.append(handler)

#     def _initial_update(self):
#         self.javascript_state_changed(deepcopy(self._javascript_state), deepcopy(self._javascript_state))

#     def _handle_javascript_state_changed(self, state):
#         changed_state = dict()
#         for key in state:
#             if _different(state[key], self._javascript_state.get(key)):
#                 changed_state[key] = deepcopy(state[key])
#         if changed_state:
#             prev_javascript_state = deepcopy(self._javascript_state)
#             for key in changed_state:
#                 self._javascript_state[key] = changed_state[key]
#             self.javascript_state_changed(prev_javascript_state, deepcopy(self._javascript_state))


# def _different(a, b):
#     return a is not b

# def _listify_ndarray(x):
#     if x.ndim == 1:
#         if np.issubdtype(x.dtype, np.integer):
#             return [int(val) for val in x]
#         else:
#             return [float(val) for val in x]
#     elif x.ndim == 2:
#         ret = []
#         for j in range(x.shape[1]):
#             ret.append(_listify_ndarray(x[:, j]))
#         return ret
#     elif x.ndim == 3:
#         ret = []
#         for j in range(x.shape[2]):
#             ret.append(_listify_ndarray(x[:, :, j]))
#         return ret
#     elif x.ndim == 4:
#         ret = []
#         for j in range(x.shape[3]):
#             ret.append(_listify_ndarray(x[:, :, :, j]))
#         return ret
#     else:
#         raise Exception('Cannot listify ndarray with {} dims.'.format(x.ndim))

# def _json_serialize(x):
#     if isinstance(x, np.ndarray):
#         return _listify_ndarray(x)
#     elif isinstance(x, np.integer):
#         return int(x)
#     elif isinstance(x, np.floating):
#         return float(x)
#     elif type(x) == dict:
#         ret = dict()
#         for key, val in x.items():
#             ret[key] = _json_serialize(val)
#         return ret
#     elif type(x) == list:
#         ret = []
#         for i, val in enumerate(x):
#             ret.append(_json_serialize(val))
#         return ret
#     else:
#         return x