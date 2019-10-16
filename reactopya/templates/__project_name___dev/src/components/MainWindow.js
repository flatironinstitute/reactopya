import React, { Component } from 'react';
import * as allWidgets from '../../{{ project_name }}_widgets';
import { Paper, Grid, IconButton } from "@material-ui/core";
import { FaExpandArrowsAlt, FaCompressArrowsAlt } from "react-icons/fa";
import PythonProcess from './PythonProcess';
const ReactopyaModel = require('./ReactopyaModel.js');

export default class MainWindow extends Component {
    constructor(props) {
        super(props);
        this.state = {
            widget: null
        };
    }
    componentDidMount() {
        const { config } = this.props;
        let a = config.dev_widget;
        if (a) {
            let widget = {
                project_name: a.project_name || allWidgets[a.type].reactopyaConfig.project_name,
                type: a.type,
                children: a.children || [],
                props: a.props || (allWidgets[a.type].reactopyaConfig || {}).defaultProps || {}
            };
            
            let model = new ReactopyaModel(widget.project_name, widget.type);
            // do this before making the callback
            model.addChildModelsFromSerializedChildren(widget.children || []);
            let pythonProcess = new PythonProcess(widget.project_name, widget.type, widget.children || [], widget.props || {}, widget.key || '', model);
            widget.pythonProcess = pythonProcess;
            widget.reactopyaModel = model;
            this.setState({
                widget: widget
            });
        }
    }
    render() {
        const { widget } = this.state;
        if (!widget) {
            return <span>No widget.</span>
        }
        let element = _create_element(widget.project_name || '{{ project_name }}', widget.type, widget.children || [], widget.props, widget.key || '', widget.reactopyaModel);
        return (
            <FullBrowser>
                <element.type {...element.props} />
            </FullBrowser>
        );
    }
}

class FullBrowser extends Component {
    constructor(props) {
        super(props);
        this.state = {
            width: null,
            height: null
        };
        this.updateDimensionsScheduled = false;
    }

    async componentDidMount() {
        this.updateDimensions();
        window.addEventListener("resize", this.scheduleUpdateDimensions);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.scheduleUpdateDimensions);
    }

    scheduleUpdateDimensions = () => {
        if (this.updateDimensionsScheduled) return;
        this.updateDimensionsScheduled = true;
        setTimeout(() => {
            this.updateDimensionsScheduled = false;
            this.updateDimensions();
        }, 300);
    }

    async componentDidUpdate(prevProps, prevState) {
        if (!this.state.width) {
            this.updateDimensions();
        }
    }

    updateDimensions() {
        if (!this.container) return;
        let W0 = document.body.clientWidth;
        let H0 = document.body.clientHeight;
        if ((this.state.width !== W0) || (this.state.height !== H0)) {
            this.setState({
                width: W0, // see render()
                height: H0
            });
        }
    }

    render() {
        const elmt = React.Children.only(this.props.children)
        let { width, height } = this.state;
        if (!width) width = 300;
        if (!height) height = 300;
        let new_props = {
            width: width,
            height: height
        };
        for (let key in elmt.props) {
            new_props[key] = elmt.props[key];
        }

        let style0 = { position: 'relative', left: 0, right: 0, top: 0, bottom: 0 };
        return (
            <div
                className="determiningWidth"
                ref={el => (this.container = el)}
                style={style0}
            >
                <elmt.type { ...new_props }  />
            </div>
        );
    }
}

function _create_element(project_name, type, children, props, key, reactopyaModel) {
    let Comp = allWidgets[type];
    return (
        <Comp {...(props)} key={key || undefined} reactopyaModel={reactopyaModel}>
            {
                children.map((child, ii) => (
                    _create_element(child.project_name || project_name, child.type, child.children || [], child.props || {}, ii, reactopyaModel ? reactopyaModel.childModel(ii) : null)
                ))
            }
        </Comp>
    );
}
