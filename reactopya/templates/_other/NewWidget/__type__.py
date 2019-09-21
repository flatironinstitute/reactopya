class {{ NewWidget.type }}:
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self._set_status('running', 'Running {{ NewWidget.type }}')

        self._set_status('finished', 'Finished {{ NewWidget.type }}')

    def _set_state(self, **kwargs):
        self.set_state(kwargs)
    
    def _set_error(self, error_message):
        self._set_status('error', error_message)
    
    def _set_status(self, status, status_message=''):
        self._set_state(status=status, status_message=status_message)
