import ipywidgets as widgets
from traitlets import Unicode, Dict
import json
import simplejson

@widgets.register
class ReactopyaWidget(widgets.DOMWidget):
    """Reactopya Jupyter widget"""
    _view_name = Unicode('ReactopyaWidgetView').tag(sync=True)
    _model_name = Unicode('ReactopyaWidgetModel').tag(sync=True)
    _view_module = Unicode('reactopya_jup').tag(sync=True)
    _model_module = Unicode('reactopya_jup').tag(sync=True)
    _view_module_version = Unicode('^0.3.8').tag(sync=True)
    _model_module_version = Unicode('^0.3.8').tag(sync=True)

    # props
    _component_name = Unicode('').tag(sync=True)
    _props = Dict({}).tag(sync=True)

    def __init__(self, *, component, component_name, props):
        super().__init__()
        self._component_name = component_name
        self._props = props
        self._component = component
        self._component.on_python_state_changed(self._handle_python_state_changed)
        self.observe(self._on_change)
        self.set_trait('_component_name', component_name)
        self.set_trait('_props', props)
        self._component.init_jupyter()
        self.on_msg(self._handle_message)

    def show(self):
        display(self)

    def _handle_message(self, _, content, buffers):
        name = content.get('name', '')
        if name == 'setJavaScriptState':
            state = content['state']
            self._component._handle_javascript_state_changed(state)
        else:
            raise Exception('Unexpected message name: {}'.format(name))

    def _handle_python_state_changed(self, state):
        self.send(dict(
            name='setPythonState',
            state=state
        ))

    def _on_change(self, change):
        # maybe sometime we'll handle the case of changing props
        pass