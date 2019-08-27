import React from 'react';
import ReactDOM from 'react-dom';

{% for widget in widgets -%}
import { {{ widget.componentName }} } from './widgets/index.js';
{% endfor %}

window.reactopya = window.reactopya || {};
window.reactopya.widgets = window.reactopya.widgets || {};

let componentsByName = {};
{% for widget in widgets -%}
componentsByName['{{ widget.componentName }}'] = {{ widget.componentName }};
{% endfor %}

function _create_element(component_name, props) {
    console.log('--- create element', component_name, props);
    let children = props.children || [];
    let new_props = {};
    for (let key in props) {
        if (key !== 'children') {
            new_props[key] = props[key];
        }
    }
    let Component = componentsByName[component_name];
    return (
        <Component {...new_props}>
            {
                children.map((child) => (
                    _create_element(child.component_name, child.props)
                ))
            }
        </Component>
    );
}

{% for widget in widgets %}
window.reactopya.widgets['{{ widget.componentName }}'] = {
    render: function(div, props) {
        let X = _create_element('{{ widget.componentName }}', props);
        ReactDOM.render(X, div);
    }
}
{% endfor %}
