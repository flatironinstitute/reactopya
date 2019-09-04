from copy import deepcopy
import os

_init_info = dict(
    mode=None,
    store_bundle_in_notebook=False,
    bundle_js=None,
    bundle_fname=None,
    electron_src=None
)

def _get_init_info():
    return deepcopy(_init_info)

def _get_bundle_js():
    fname = _get_bundle_fname()
    with open(fname, 'rb') as f:
        js = f.read().decode('utf-8')
    return js

def _get_bundle_fname():
    dirname = os.path.dirname(os.path.realpath(__file__))
    fname = os.path.join(dirname, 'dist', 'bundle.js')
    return fname

def _get_electron_src():
    dirname = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(dirname, 'electron', 'src')

def init_jupyter(*, store_bundle_in_notebook=False):
    from IPython.display import Javascript, clear_output
    
    js = _get_bundle_js()
    display(Javascript(js))

    if store_bundle_in_notebook:
        print('Initialized {{ project_name }} for Jupyter notebooks and stored bundle in notebook.')
    else:
        clear_output()
        print('Initialized {{ project_name }} for Jupyter notebooks.')
    _init_info['mode'] = 'jupyter'
    _init_info['store_bundle_in_notebook'] = store_bundle_in_notebook

def init_colab(*, store_bundle_in_notebook=False):
    if store_bundle_in_notebook:
        print('Initialized {{ project_name }} for Colab notebooks and storing bundle in notebook.')
    else:
        print('Initialized {{ project_name }} for Colab notebooks.')

    _init_info['mode'] = 'colab'
    _init_info['store_bundle_in_notebook'] = store_bundle_in_notebook
    _init_info['bundle_js'] = _get_bundle_js()

def init_electron():
    _init_info['mode'] = 'electron'
    _init_info['bundle_fname'] = _get_bundle_fname()
    _init_info['electron_src'] = _get_electron_src()