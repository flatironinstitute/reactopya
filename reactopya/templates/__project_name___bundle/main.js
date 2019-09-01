window.testA = 'testB';

import React from 'react';
import ReactDOM from 'react-dom';

{% for widget in widgets -%}
import { {{ widget.type }} } from './widgets/index.js';
{% endfor %}

window.reactopya = window.reactopya || {};
window.reactopya.widgets = window.reactopya.widgets || {};

let widgetsByType = {};
{% for widget in widgets -%}
widgetsByType['{{ widget.type }}'] = {{ widget.type }};
{% endfor %}

function _create_element(type, children, props, key) {
    children = children || [];
    props = props || {};
    key = key || undefined;
    let Comp = widgetsByType[type];
    return (
        <Comp {...props}>
            {
                children.map((child) => {
                    return _create_element(child.type, child.children, child.props, child.key)
                })
            }
        </Comp>
    );
}

{% for widget in widgets %}
window.reactopya.widgets['{{ widget.type }}'] = {
    render: function(div, children, props, key) {
        let X = _create_element('{{ widget.type }}', children, props, key);
        ReactDOM.render(X, div);
    }
}
{% endfor %}
