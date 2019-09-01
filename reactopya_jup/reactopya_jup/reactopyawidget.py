import ipywidgets as widgets
from traitlets import Unicode, Dict, List
from ._version import __version__ as version

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
    _type = Unicode('').tag(sync=True)
    _children = Dict([]).tag(sync=True)
    _props = Dict({}).tag(sync=True)
    _key = Unicode('').tag(sync=True)
    _reactopya_jup_version = Unicode('').tag(sync=True)

    def __init__(self, *, type, children, props, key=''):
        super().__init__()
        self._m_type = type
        self._m_children = children
        self._m_props = props
        self._m_key = key
        self._javascript_state_changed_handlers = []
        self.observe(self._on_change)
        self.set_trait('_type', type)
        self.set_trait('_props', props)
        self.set_trait('_children', dict(children=children))
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