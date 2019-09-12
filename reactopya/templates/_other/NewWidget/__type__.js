import React, { Component } from 'react';
import { PythonInterface } from 'reactopya';
const config = require('./{{ NewWidget.type }}.json');

export default class {{ NewWidget.type }} extends Component {
    static title = '{{ NewWidget.description }}'
    static reactopyaConfig = config
    constructor(props) {
        super(props);
        this.state = {
            // javascript state
            
            // python state
            status: '',
            status_message: ''
        }
    }
    componentDidMount() {
        this.pythonInterface = new PythonInterface(this, config);
        this.pythonInterface.start();
    }
    componentDidUpdate() {
        this.pythonInterface.update();
    }
    componentWillUnmount() {
        this.pythonInterface.stop();
    }
    render() {
        return (
            <React.Fragment>
                <div>{{ NewWidget.type }}</div>
                <RespectStatus {...this.state}>
                    <div>Render {{ NewWidget.type }} here</div>
                </RespectStatus>
            </React.Fragment>
        )
    }
}

class RespectStatus extends Component {
    state = {}
    render() {
        switch (this.props.status) {
            case 'running':
                return <div>Running: {this.props.status_message}</div>
            case 'error':
                return <div>Error: {this.props.status_message}</div>
            case 'finished':
                return this.props.children;
            default:
                return <div>Unknown status: {this.props.status}</div>
        }
    }
}