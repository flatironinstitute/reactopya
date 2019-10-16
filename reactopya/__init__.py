# from .component import Component
from .shellscript import ShellScript
from ._version import __version__

def reactopya_templates_directory():
    import os
    dirname = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(dirname, 'templates')