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
        this.setState({
            status: 'started',
            status_message: 'Starting python backend'
        });
        // Use this.pythonInterface.setState(...) to pass data to the python backend
        this.pythonInterface.setState({
            test: 1
        });
    }
    componentWillUnmount() {
        this.pythonInterface.stop();
    }
    render() {
        return (
            <RespectStatus {...this.state}>
                <div>Render {{ NewWidget.type }} here</div>
            </RespectStatus>
        )
    }
}

class RespectStatus extends Component {
    state = {}
    render() {
        switch (this.props.status) {
            case 'started':
                return <div>Started: {this.props.status_message}</div>
            case 'running':
                return <div>{this.props.status_message}</div>
            case 'error':
                return <div>Error: {this.props.status_message}</div>
            case 'finished':
                return this.props.children;
            default:
                return <div>Unknown status: {this.props.status}</div>
        }
    }
}