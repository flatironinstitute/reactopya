import ReactDOM from 'react-dom';
import React, { Component } from 'react';
// if (!window.React) {
//     window.React = React;
// }
// if (!window.ReactDOM) {
//     window.ReactDOM = ReactDOM;
// }

{% for widget in widgets -%}
import { {{ widget.type }} } from './widgets/index.js';
{% endfor %}

window.reactopya = window.reactopya || {};
window.reactopya.widgets = window.reactopya.widgets || {};
window.reactopya.widgets.{{ project_name }} = {};

let widgetsByType = {};
{% for widget in widgets -%}
widgetsByType['{{ widget.type }}'] = {{ widget.type }};
{% endfor %}


/*
The following is what I needed to do in order to allow
different reactopya projects to work together. Like you
may have child widgets that are actually from different
projects, and therefore are bundled with different React
objects!
*/

// Only needed when child is from a different project
class ChildWrapper extends Component {
    constructor(props) {
        super(props);
        this.divRef = React.createRef();
    }
    _do_render_child() {
        if (this.divRef.current) {
            let child = this.props.reactopya_child;
            // we need to also get the props passed to this wrapper by its parent that we don't see (tricky!)
            let new_props = {};
            for (let key in child.props) {
                new_props[key] = child.props[key];
            }
            for (let key in this.props) {
                if ((key !== 'children') && (key !== 'reactopya_child')) {
                    new_props[key] = this.props[key];
                }
            }
            window.reactopya.widgets[child.project_name][child.type].render(
                this.divRef.current,
                child.children,
                new_props,
                child.key
            );
        }
    }
    render() { 
        setTimeout(() => {
            this._do_render_child();
        },100);
        return (
            <div ref={this.divRef} />
        );
    }
}
 
function _create_element(type, children, props, key, reactopyaModel) {
    children = children || [];
    props = props || {};
    key = key || undefined;
    let Comp = widgetsByType[type];
    let nondynamic_children = [];
    for (let child of children) {
        if (!child.is_dymamic_child) {
            nondynamic_children.push(child);
        }
    }
    return (
        <Comp {...props} reactopyaModel={reactopyaModel}>
            {
                nondynamic_children.map((child, i) => {
                    const childReactopyaModel = reactopyaModel ? reactopyaModel.childModel(i) : null;
                    if (child.project_name === '{{ project_name }}') {
                        return _create_element(child.type, child.children, child.props, child.key, childReactopyaModel)
                    }
                    else {
                        // Not in the same project! built against a different React object!
                        // Need to do it in a trickier way. My brain hurts!
                        // (This is bound to cause problems at some point -- Maybe some smart folks will help out)
                        return <ChildWrapper
                            reactopya_child={child}
                            reactopyaModel={childReactopyaModel}
                        />
                    }
                })
            }
        </Comp>
    );
}

{% for widget in widgets %}
window.reactopya.widgets.{{ project_name }}['{{ widget.type }}'] = {
    render: function(div, children, props, key, reactopyaModel) {
        let X = _create_element('{{ widget.type }}', children, props, key, reactopyaModel);
        ReactDOM.render(X, div);
    }
}
{% endfor %}