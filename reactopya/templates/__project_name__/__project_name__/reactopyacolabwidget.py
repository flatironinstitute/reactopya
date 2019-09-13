from IPython.display import Javascript, clear_output
import base64
import simplejson
import uuid
from ._version import __version__ as version

class ReactopyaColabWidget:
    """Reactopya Colab widget"""

    def __init__(self, *, project_name, type, children, props, key=''):
        self._model_id = uuid.uuid4().hex.upper()
        self._project_name = project_name
        self._type = type
        self._children = [
            ReactopyaColabWidget(project_name=ch.get('project_name', self._project_name), type=ch['type'], children=ch.get('children', []), props=ch.get('props', {}), key=ch.get('key', ''))
            for ch in children
        ]
        self._props = props
        self._key = key
        self._javascript_state_changed_handlers = []
        self._bundle_js = None
        self._store_bundle_in_notebook = False

    def _set_bundle_js(self, js, store_bundle_in_notebook=False):
        self._bundle_js = js
        self._store_bundle_in_notebook=store_bundle_in_notebook

    def show(self):
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
    
    def set_python_state(self, state, child_indices=[]):
        js_code = '''
            let json_state = atob('[python_state_json_b64]');
            let state = JSON.parse(json_state);
            let json_child_indices = atob('[child_indices_json_b64]');
            let child_indices = JSON.parse(json_child_indices);
            let model = window.reactopya_colab_widget_models['[model_id]'];
            for (let ind of child_indices) {
                model = model.childModel(ind);
            }
            model.setPythonState(state);
        '''
        python_state_json_b64 = base64.b64encode(simplejson.dumps(
            state, ignore_nan=True).encode('utf-8')).decode()
        child_indices_json_b64 = base64.b64encode(simplejson.dumps(
            child_indices, ignore_nan=True).encode('utf-8')).decode()
        js_code = js_code.replace('[model_id]', self._model_id)
        js_code = js_code.replace(
            '[python_state_json_b64]', python_state_json_b64)
        js_code = js_code.replace(
            '[child_indices_json_b64]', child_indices_json_b64)
        display(Javascript(js_code))
    
    def on_javascript_state_changed(self, handler):
        self._javascript_state_changed_handlers.append(handler)
    
    def _register_callback(self):
        from google.colab import output as colab_output  # pylint: disable=import-error
        colab_output.register_callback('reactopya.{}'.format(self._model_id), self._handle_callback)

    def _js_model_injection(self):
        js_code = '''
        {
            let model = new window.JavaScriptPythonStateModelColab();
            model.onJavaScriptStateChanged(function(state, child_indices) {
                google.colab.kernel.invokeFunction('reactopya.[model_id]', ['handleJavaScriptStateChanged'], {state: state});
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
    
    def _connect_helper(self, child, i):
        child.on_javascript_state_changed(lambda state, child_indices: self._handle_callback(command='handleJavaScriptStateChanged', state=state, child_indices=[i] + child_indices))
    
    def _serialize(self):
        return dict(
            project_name=self._project_name,
            type=self._type,
            children=[ch._serialize() for ch in self._children],
            props=self._props,
            key=self._key,
            model_id=self._model_id
        )
    
    def _handle_callback(self, command, *, state=None, child_indices=[]):
        if command == 'handleJavaScriptStateChanged':
            for handler in self._javascript_state_changed_handlers:
                handler(state, child_indices)
        elif command == 'load_bundle_and_show':
            display(Javascript(self._bundle_js))
            if not self._store_bundle_in_notebook:
                clear_output()
            js2 = '''
            {
                class JavaScriptPythonStateModelColab {
                    constructor() {
                        this._pythonStateStringified = {};
                        this._javaScriptStateStringified = {};
                        this._pythonStateChangedHandlers = [];
                        this._javaScriptStateChangedHandlers = [];
                        this._childModels = [];
                    }
                    setPythonState(state) {
                        this._setStateHelper(state, this._pythonStateStringified, this._pythonStateChangedHandlers);
                    }
                    setJavaScriptState(state) {
                        this._setStateHelper(state, this._javaScriptStateStringified, this._javaScriptStateChangedHandlers);
                    }
                    onPythonStateChanged(handler) {
                        this._pythonStateChangedHandlers.push(handler);
                    }
                    onJavaScriptStateChanged(handler) {
                        this._javaScriptStateChangedHandlers.push(handler);
                    }
                    addChildModel(model) {
                        this._childModels.push(model);
                    }
                    childModel(index) {
                        return this._childModels[index];
                    }
                    _setStateHelper(state, existingStateStringified, handlers) {
                        let changedState = {};
                        let somethingChanged = false;
                        for (let key in state) {
                            let val = state[key];
                            let valstr = JSON.stringify(val);
                            if (valstr !== existingStateStringified[key]) {
                                existingStateStringified[key] = valstr;
                                changedState[key] = JSON.parse(valstr);
                                somethingChanged = true;
                            }
                        }
                        if (somethingChanged) {
                            for (let handler of handlers) {
                                handler(changedState);
                            }
                        }
                    }
                }
                window.JavaScriptPythonStateModelColab = JavaScriptPythonStateModelColab;
            }
            '''
            display(Javascript(js2))
            self._handle_callback('show')
        elif command == 'show':
            js_code = '''
            {
                window.reactopya_bundle_status = 'loaded';
                if (!window.reactopya_colab_widget_models)
                    window.reactopya_colab_widget_models = {};
                [js_model_injection]
                let props0 = JSON.parse(atob('[props_json_b64]'));
                let children0 = JSON.parse(atob('[children_json_b64]'));
                let key0 = '[key]';
                let model0 = window.reactopya_colab_widget_models['[model_id]'];
                props0.javaScriptPythonStateModel = model0;
                function set_models_of_children(parent_model, children) {
                    for (let ch0 of children) {
                        ch0.props.javaScriptPythonStateModel = window.reactopya_colab_widget_models[ch0.model_id];
                        parent_model.addChildModel(ch0.props.javaScriptPythonStateModel);
                        set_models_of_children(ch0.props.javaScriptPythonStateModel, ch0.children || []);
                    }
                }
                set_models_of_children(model0, children0);
                {
                    let div = document.createElement('div');
                    document.querySelector("#output-area").appendChild(div);
                    window.reactopya.widgets.[project_name].[type].render(div, children0, props0, key0);
                }
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
            js_code = js_code.replace('[children_json_b64]', base64.b64encode(
                simplejson.dumps(children_serialized, ignore_nan=True).encode('utf-8')).decode())
            js_code = js_code.replace('[key]', self._key)
            js_code = js_code.replace('[js_model_injection]', self._js_model_injection())
            display(Javascript(js_code))
