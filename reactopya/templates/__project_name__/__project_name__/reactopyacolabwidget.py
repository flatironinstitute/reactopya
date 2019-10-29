import numpy as np
import uuid
from IPython.display import Javascript, clear_output
import ipywidgets
import simplejson
import base64
import sys

class ReactopyaColabWidget:
    def __init__(self, *, project_name, type, initial_children, props, key=''):
        super().__init__()
        # use ._m_ here so we don't get confused with the traitlets!
        self._project_name = project_name
        self._type = type
        self._initial_children = initial_children
        self._children = dict()
        self._child_ids = []
        self._initialized = False
        for child_id, ch in enumerate(initial_children):
            self._children[str(child_id)] = ch
            self._child_ids.append(child_id)
        self._props = props
        self._key = key
        self._javascript_state_changed_handlers = []
        self._custom_message_handlers = []
        self._add_child_handlers = []
        self._bundle_js = None
        self._store_bundle_in_notebook = False
        self._model_id = uuid.uuid4().hex.upper()

    def _set_bundle_js(self, js, store_bundle_in_notebook=False):
        self._bundle_js = js
        self._store_bundle_in_notebook=store_bundle_in_notebook

    def show(self, render=True):
        # does sending this message belong here?
        self._initialize_if_needed()
        if render:
            self._do_render()
        else:
            return self

    def _initialize_if_needed(self):
        if not self._initialized:
            # do we do something here?
            self._initialized = True

    def set_python_state(self, state):
        self._send_message_to_js(dict(
            name='setPythonState',
            state=_json_serialize(state)
        ))
    
    def send_custom_message(self, message):
        self._send_message_to_js(dict(
            name='customMessage',
            message=_json_serialize(message)
        ))
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)
    
    def on_custom_message(self, handler):
        self._custom_message_handlers.append(handler)
    
    def on_add_child(self, handler):
        self._add_child_handlers.append(handler)
    
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
    
    def _do_render(self):
        self._register_callback()
        js_code = '''
        {
            function try_show() {
                if (window.reactopya_bundle_status == 'loaded') {
                    google.colab.kernel.invokeFunction('reactopya.[model_id]', ['show'], {});
                    return;
                }
                else if (window.reactopya_bundle_status == 'loading') {
                    setTimeout(try_show ,1000);
                    return;
                }
                else {
                    window.reactopya_bundle_status = 'loading';
                    google.colab.kernel.invokeFunction('reactopya.[model_id]', ['load_bundle_and_show'], {});
                }
            }
            try_show();
        }
        '''
        js_code = js_code.replace('[model_id]', self._model_id)
        display(Javascript(js_code))
    
    def _register_callback(self):
        from google.colab import output as colab_output  # pylint: disable=import-error
        colab_output.register_callback('reactopya.{}'.format(self._model_id), self._handle_callback)
    
    def _handle_callback(self, command, *, message=None):
        if command == 'handleMessage':
            self._handle_message(message)
        elif command == 'load_bundle_and_show':
            display(Javascript(self._bundle_js))
            if not self._store_bundle_in_notebook:
                clear_output()
            self._handle_callback('show')
        elif command == 'show':
            js_code = '''
            {
                window.reactopya_bundle_status = 'loaded';
                if (!window.reactopya_colab_widget_models)
                    window.reactopya_colab_widget_models = {};
                [js_model_injection]

                let div = document.createElement('div');
                document.querySelector("#output-area").appendChild(div);


                const project_name = '[project_name]';
                const type = '[type]';
                let props = JSON.parse(atob('[props_json_b64]'));
                let key = '[key]';
                let initial_children = JSON.parse(atob('[initial_children_json_b64]'));

                let model0 = window.reactopya_colab_widget_models['[model_id]'];

                window.reactopya.widgets['[project_name]']['[type]'].render(
                    div,
                    initial_children,
                    props,
                    key || undefined,
                    model0
                );
            }
            '''
            children_serialized = [
                ch._serialize()
                for ch in self._children
            ]
            js_code = js_code.replace('[model_id]', self._model_id)
            js_code = js_code.replace('[project_name]', self._project_name)
            js_code = js_code.replace('[type]', self._type)
            js_code = js_code.replace('[props_json_b64]', base64.b64encode(
                simplejson.dumps(self._props, ignore_nan=True).encode('utf-8')).decode())
            js_code = js_code.replace('[initial_children_json_b64]', base64.b64encode(
                simplejson.dumps(self._initial_children, ignore_nan=True).encode('utf-8')).decode())
            js_code = js_code.replace('[key]', self._key)
            js_code = js_code.replace('[js_model_injection]', self._js_model_injection())
            display(Javascript(js_code))
        

    def _js_model_injection(self):
        js_code = '''
        {
            let model = new window.ReactopyaModel();
            model.onJavaScriptStateChanged(function(state) {
                google.colab.kernel.invokeFunction('reactopya.[model_id]', ['handleMessage'], {message: {name: 'setJavaScriptState', state: state}});
            });
            model.onSendCustomMessage(function(message) {
                google.colab.kernel.invokeFunction('reactopya.[model_id]', ['handleMessage'], {message: {name: 'customMessage', message: message}});
            });
            window.reactopya_colab_widget_models['[model_id]'] = model;
        }
        '''
        js_code = js_code.replace('[model_id]', self._model_id)
        for i, ch in enumerate(self._children):
            ch._register_callback()
            js2 = ch._js_model_injection()
            js_code = js_code + '\n' + js2
            self._connect_helper(ch, i)
        return js_code

    def _send_message_to_js(self, msg):
        js_code = '''
        let model0 = window.reactopya_colab_widget_models['[model_id]'];
        let msg = JSON.parse(atob('[msg_json_b64]'));
        if (msg.name == 'setPythonState') {
            model0.setPythonState(msg.state);
        }
        else if (msg.name == 'customMessage') {
            model0.handleCustomMessage(msg.message);
        }
        else {
            console.warn('Unexpected message', msg.name, msg);
        }
        '''
        js_code = js_code.replace('[model_id]', self._model_id)
        js_code = js_code.replace('[msg_json_b64]', base64.b64encode(
            simplejson.dumps(msg, ignore_nan=True).encode('utf-8')).decode())
        display(Javascript(js_code))

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