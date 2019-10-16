import ipywidgets as widgets
from traitlets import Unicode, Dict, List
from ._version import __version__ as version
import numpy as np
import logging
logger = logging.getLogger('reactopya')

@widgets.register
class ReactopyaJupyterWidget(widgets.DOMWidget):
    """Reactopya Jupyter widget"""
    _view_name = Unicode('ReactopyaJupyterWidgetView').tag(sync=True)
    _model_name = Unicode('ReactopyaJupyterWidgetModel').tag(sync=True)
    _view_module = Unicode('reactopya_jup').tag(sync=True)
    _model_module = Unicode('reactopya_jup').tag(sync=True)
    _view_module_version = Unicode('^{}'.format(version)).tag(sync=True)
    _model_module_version = Unicode('^{}'.format(version)).tag(sync=True)

    # traitlets
    _project_name = Unicode('').tag(sync=True)
    _type = Unicode('').tag(sync=True)
    _initial_children = List([]).tag(sync=True)
    _props = Dict({}).tag(sync=True)
    _key = Unicode('').tag(sync=True)
    _reactopya_jup_version = Unicode('').tag(sync=True)

    def __init__(self, *, project_name, type, initial_children, props, key=''):
        super().__init__()
        # use ._m_ here so we don't get confused with the traitlets!
        self._m_project_name = project_name
        self._m_type = type
        self._m_children = dict()
        self._child_ids = []
        self._initialized = False
        for child_id, ch in enumerate(initial_children):
            self._m_children[str(child_id)] = ch
            self._child_ids.append(child_id)
        self._m_props = props
        self._m_key = key
        self._javascript_state_changed_handlers = []
        self._custom_message_handlers = []
        self._add_child_handlers = []
        self.observe(self._on_change)
        self.set_trait('_project_name', project_name)
        self.set_trait('_type', type)
        self.set_trait('_props', _json_serialize(props))
        self.set_trait('_initial_children', _json_serialize(initial_children))
        self.set_trait('_key', key)
        self.on_msg(self._handle_message)

    def show(self, render=True):
        # does sending this message belong here?
        self._initialize_if_needed()
        if render:
            display(self)
        else:
            return self

    def _initialize_if_needed(self):
        if not self._initialized:
            self.send(dict(
                name='initialize'
            ))            
            self._initialized = True

    def set_python_state(self, state):
        logger.info('ReactopyaJupyterWidget:set_python_state for %s', self._m_type)
        self.send(dict(
            name='setPythonState',
            state=_json_serialize(state)
        ))
    
    def send_custom_message(self, message):
        logger.info('ReactopyaJupyterWidget:set_custom_message for %s', self._m_type)
        self.send(dict(
            name='customMessage',
            message=_json_serialize(message)
        ))
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)
    
    def on_custom_message(self, handler):
        self._custom_message_handlers.append(handler)
    
    def on_add_child(self, handler):
        self._add_child_handlers.append(handler)
    
    def _handle_message(self, _, content, buffers):
        name = content.get('name', '')
        if name == 'setJavaScriptState':
            state = content['state']
            logger.info('ReactopyaJupyterWidget:_handle_message:setJavaScriptState for %s: %s', self._m_type, state)
            for handler in self._javascript_state_changed_handlers:
                handler(state)
        elif name == 'customMessage':
            message = content['message']
            logger.info('ReactopyaJupyterWidget:_handle_message:custom_message for %s: %s', self._m_type, message)
            for handler in self._custom_message_handlers:
                handler(message)
        elif name == 'addChild':
            data = content.get('data')
            logger.info('ReactopyaJupyterWidget:_handle_message:addChild for %s: %s', self._m_type, data)
            for handler in self._add_child_handlers:
                handler(data)
        else:
            raise Exception('Unexpected message name: {}'.format(name))

    def _on_change(self, change):
        # maybe sometime we'll handle the case of changing props
        pass

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