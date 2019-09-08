from reactopya import Component


class {{ NewWidget.type }}(Component):
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self._set_status('running', 'Running {{ NewWidget.type }}')

        self._set_status('finished', 'Finished {{ NewWidget.type }}')
    
    def _set_error(self, error_message):
        self._set_status('error', error_message)
    
    def _set_status(self, status, status_message=''):
        self.set_python_state(dict(status=status, status_message=status_message))
