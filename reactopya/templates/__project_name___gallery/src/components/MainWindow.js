import React, { Component } from 'react';
import * as allWidgets from '../../{{ project_name }}_widgets';
import { Paper, Grid, IconButton } from "@material-ui/core";
import { FaExpandArrowsAlt, FaCompressArrowsAlt } from "react-icons/fa";
import ReactopyaModel from './ReactopyaModel';
import PythonProcess from './PythonProcess';

class LazyLoader extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasBeenVisible: false
        };
        this.unmounted = false;
    }

    async componentDidMount() {
        this.startChecking();
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    componentDidUpdate(prevProps, prevState) {
    }

    startChecking() {
        this.doCheck();
        if (this.state.hasBeenVisible) return;
        if (this.unmounted) return;
        setTimeout(() => {
            this.startChecking();
        }, 1000);
    }

    doCheck() {
        if (this.state.hasBeenVisible) return;
        if (this.isInViewport(this.container)) {
            this.setState({ hasBeenVisible: true });
        }
    }

    isInViewport(elem) {
        if (!elem) return false;
        var bounding = elem.getBoundingClientRect();
        return (
            bounding.top >= 0 &&
            bounding.left >= 0 &&
            bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    render() {
        if (!this.state.hasBeenVisible) {
            return (
                <div className="lazyloader" ref={el => (this.container = el)}></div>
            )
        }
        else {
            return this.props.children;
        }
    }
}

export default class MainWindow extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expandedWidget: null,
            widgets: []
        };
    }
    handleToggleExpand = (widget) => {
        if (this.state.expandedWidget) {
            this.setState({
                expandedWidget: null
            });
        }
        else {
            this.setState({
                expandedWidget: widget
            });
        }
    }
    componentDidMount() {
        const { config } = this.props;
        let widgets = [];
        let gallery_widgets = config.gallery_widgets;
        if (!gallery_widgets) {
            gallery_widgets = [];
            for (let key in allWidgets) {
                gallery_widgets.push({
                    name: key
                });
            }
        }
        for (let a of gallery_widgets) {
            widgets.push({
                project_name: a.project_name || allWidgets[a.type].reactopyaConfig.project_name,
                type: a.type,
                title: a.title || allWidgets[a.type].title || a.type,
                children: a.children || [],
                props: a.props || (allWidgets[a.type].reactopyaConfig || {}).defaultProps || {}
            });
        }
        for (let widget of widgets) {
            let model = new ReactopyaModel(widget.project_name, widget.type);
            // do this before making the callback
            model.addChildModelsFromSerializedChildren(widget.children || []);
            let pythonProcess = new PythonProcess(widget.project_name, widget.type, widget.children || [], widget.props || {}, widget.key || '', model);
            widget.pythonProcess = pythonProcess;
            widget.reactopyaModel = model;
        }
        this.setState({
            widgets: widgets
        });
    }
    render() {
        const { expandedWidget } = this.state;
        const style0 = { overflowX: 'hidden', margin: 10, padding: 20, background: 'lightblue' };
        const style1 = { padding: 20, margin: 10, minHeight: 800, maxHeight: 800, overflowY: 'auto' };
        let widgetsToShow = [];
        if (expandedWidget) {
            widgetsToShow.push(expandedWidget);
        }
        else {
            for (let w of this.state.widgets) {
                widgetsToShow.push(w);
            }
        }
        let item_sizes = {
            xs: 12,
            md: 6,
            xl: 4
        };
        let expandOrCollapseIcon = null;
        if (expandedWidget) {
            item_sizes.xs = item_sizes.md = item_sizes.xl = 12;
            expandOrCollapseIcon = <FaCompressArrowsAlt />
        }
        else {
            expandOrCollapseIcon = <FaExpandArrowsAlt />
        }
        return (
            <div style={style0}>
                <Grid container style={style0}>
                    {
                        widgetsToShow.map((widget, ii) => {
                            let element = _create_element(widget.project_name || '{{ project_name }}', widget.type, widget.children || [], widget.props, widget.key || '', widget.reactopyaModel);
                            return <Grid key={widget.title} item {...item_sizes} key={ii}>
                                <Paper style={style1}>
                                    <Grid container alignItems={'flex-start'} justify={'flex-end'} direction={'row'}>
                                        <IconButton
                                            onClick={() => { this.handleToggleExpand(widget) }}
                                            size={'small'}
                                        >
                                            {expandOrCollapseIcon}
                                        </IconButton>
                                    </Grid>

                                    <hr />
                                    <h2>{widget.title}</h2>
                                    <hr />
                                    <LazyLoader>
                                        {element}
                                    </LazyLoader>
                                </Paper>
                            </Grid>;
                        })
                    }
                </Grid>
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
