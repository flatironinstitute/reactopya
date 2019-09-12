from .reactopyajupyterwidget import ReactopyaJupyterWidget
from ._version import __version__

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'reactopya_jup',
        'require': 'reactopya_jup/extension'
    }]