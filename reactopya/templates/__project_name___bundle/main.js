import React from 'react';
import ReactDOM from 'react-dom';

{% for widget in widgets -%}
import { {{ widget.componentName }} } from './widgets/index.js';
{% endfor %}

window.reactopya = window.reactopya || {};
window.reactopya.widgets = window.reactopya.widgets || {};

{% for widget in widgets %}
window.reactopya.widgets['{{ widget.componentName }}'] = {
    render: function(div, props) {
        ReactDOM.render(
            <{{ widget.componentName }} {...props} />,
            div
        );
    }
}
{% endfor %}
