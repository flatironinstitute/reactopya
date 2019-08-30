from reactopya import Component


class {{ NewWidget.type }}(Component):
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self.set_python_state(dict(status='running', status_message='Running'))

        self.set_python_state(dict(
            status='error',
            status_message='Not yet implemented'
        ))
