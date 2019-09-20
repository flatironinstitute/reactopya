import tempfile
import os
import importlib
from .shellscript import ShellScript

def host_widget(serialized_widget, *, port):
    with tempfile.TemporaryDirectory(prefix='reactopya_host_widget') as tmpdir:
        server = Server(serialized_widget=serialized_widget, port=port, tmpdir=tmpdir)
        try:
            server.run()
        except:
            server.cleanup()
            raise
        finally:
            server.cleanup()

class Server:
    def __init__(self, *, serialized_widget, port, tmpdir):
        self._serialized_widget = serialized_widget
        self._port = port
        self._tmpdir = tmpdir
        self._process = None
        self._connections = dict()
        self._connections_dir = os.path.join(self._tmpdir, 'connections')
        self._public_html_dir = os.path.join(self._tmpdir, 'public')
        self._script_process = None
    def run(self):
        os.mkdir(self._connections_dir)
        os.mkdir(self._public_html_dir)
        widget_for_export_html = _deserialize_widget(self._serialized_widget)
        widget_for_export_html.export_snapshot(self._public_html_dir + '/index.html', format='html', use_python_backend_websocket=True)
        thisdir = os.path.dirname(os.path.realpath(__file__))
        self._script_process = ShellScript('''
        #!/bin/bash
        export REACTOPYA_PORT={port}
        export REACTOPYA_PUBLIC_DIR={tmpdir}/public
        export REACTOPYA_CONNECTIONS_DIR={tmpdir}/connections
        {thisdir}/host_widget/dist/bundle.js
        '''.format(thisdir=thisdir, port=self._port, tmpdir=self._tmpdir))
        self._script_process.start()
        while True:
            retcode = self._script_process.wait(0.01)
            if retcode is None:
                self._iterate()
    def cleanup(self):
        if self._script_process:
            self._script_process.kill()
    def _iterate(self):
        to_remove = []
        for name, con in self._connections.items():
            if con.is_running():
                con.iterate()
            else:
                to_remove.append(name)
        for name in to_remove:
            del self._connections[name]

        names = os.listdir(self._connections_dir)
        for name in names:
            if name not in self._connections.keys():
                self._create_connection(name)

    def _create_connection(self, name):
        C = Connection(tmpdir=os.path.join(self._connections_dir, name), serialized_widget=self._serialized_widget)
        C.start()
        self._connections[name] = C

class Connection:
    def __init__(self, *, serialized_widget, tmpdir):
        self._serialized_widget = serialized_widget
        self._tmpdir = tmpdir
        self._status = 'waiting'
        self._widget = None
    def start(self):
        self._status = 'running'
        self._widget = _deserialize_widget(self._serialized_widget)
        self._widget._start_process_mode(self._tmpdir)
    def is_running(self):
        return self._status == 'running'
    def iterate(self):
        if not os.path.exists(self._tmpdir):
            self._status = 'finished'
            return
        try:
            if not self._widget._iterate_process_mode():
                self._status = 'finished'
        except:
            if not os.path.exists(self._tmpdir):
                self._status = 'finished'
                return
            else:
                raise

def _deserialize_widget(serialized_widget, parent_project_name=None):
    if parent_project_name is None:
        parent_project_name = '{{ project_name }}'
    project_name = serialized_widget.get('project_name', parent_project_name)
    type = serialized_widget['type']
    props = serialized_widget.get('props', {})
    children = [
        _deserialize_widget(ch, project_name)
        for ch in serialized_widget.get('children', [])
    ]
    WIDGET = _get_widget_class_from_type(project_name, type)
    widget = WIDGET(*children, **props)
    return widget

def _get_widget_class_from_type(project_name, type):
    mod = importlib.import_module(project_name)
    WIDGET = getattr(mod, type)
    return WIDGET