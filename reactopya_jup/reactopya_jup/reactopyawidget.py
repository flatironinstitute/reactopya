import ipywidgets as widgets
from traitlets import Unicode, Dict, List
from ._version import __version__ as version
import numpy as np

@widgets.register
class ReactopyaWidget(widgets.DOMWidget):
    """Reactopya Jupyter widget"""
    _view_name = Unicode('ReactopyaWidgetView').tag(sync=True)
    _model_name = Unicode('ReactopyaWidgetModel').tag(sync=True)
    _view_module = Unicode('reactopya_jup').tag(sync=True)
    _model_module = Unicode('reactopya_jup').tag(sync=True)
    _view_module_version = Unicode('^{}'.format(version)).tag(sync=True)
    _model_module_version = Unicode('^{}'.format(version)).tag(sync=True)

    # props
    _project_name = Unicode('').tag(sync=True)
    _type = Unicode('').tag(sync=True)
    _children = Dict([]).tag(sync=True)
    _props = Dict({}).tag(sync=True)
    _key = Unicode('').tag(sync=True)
    _reactopya_jup_version = Unicode('').tag(sync=True)

    def __init__(self, *, project_name, type, children, props, key=''):
        super().__init__()
        self._m_project_name = project_name
        self._m_type = type
        self._m_children = children
        self._m_props = props
        self._m_key = key
        self._javascript_state_changed_handlers = []
        self.observe(self._on_change)
        self.set_trait('_project_name', project_name)
        self.set_trait('_type', type)
        self.set_trait('_props', _json_serialize(props))
        self.set_trait('_children', _json_serialize(dict(children=children)))
        self.set_trait('_key', key)
        self.on_msg(self._handle_message)

    def show(self):
        display(self)
    
    def set_python_state(self, state, child_indices=[]):
        self.send(dict(
            name='setPythonState',
            child_indices=child_indices,
            state=state
        ))
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)

    def _handle_message(self, _, content, buffers):
        name = content.get('name', '')
        if name == 'setJavaScriptState':
            state = content['state']
            child_indices = content.get('child_indices', [])
            for handler in self._javascript_state_changed_handlers:
                handler(state, child_indices)
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