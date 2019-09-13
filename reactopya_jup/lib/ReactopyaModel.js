// This file is duplicated between reactopya_jup/lib and reactopya/templates/__project_name___gallery/src/components

class ReactopyaModel {
    constructor(projectName, type) {
        this._projectName = projectName;
        this._type = type;

        this._pythonStateStringified = {};
        this._javaScriptStateStringified = {};
        this._childModels = {};

        this._pythonStateChangedHandlers = [];
        this._javaScriptStateChangedHandlers = [];
        this._childModelAddedHandlers = [];
        this._startHandlers = [];
        this._stopHandlers = [];
        this._running = false;
    }
    projectName() {
        return this._projectName;
    }
    type() {
        return this._type;
    }

    setPythonState(state) {
        if (state._childId) {
            this._childModels[state._childId + ''].setPythonState(state.state);
            return;
        }
        this._setStateHelper(state, this._pythonStateStringified, this._pythonStateChangedHandlers);
    }
    setJavaScriptState(state) {
        this._setStateHelper(state, this._javaScriptStateStringified, this._javaScriptStateChangedHandlers);
    }
    getPythonState() {
        let ret = {};
        for (let key in this._pythonStateStringified) {
            ret[key] = JSON.parse(this._pythonStateStringified[key]);
        }
        return ret;
    }
    getJavaScriptState() {
        let ret = {};
        for (let key in this._javaScriptStateStringified) {
            ret[key] = JSON.parse(this._javaScriptStateStringified[key]);
        }
        return ret;
    }
    addChildModelsFromSerializedChildren(children) {
        for (let i in children) {
            let child = children[i];
            let chmodel = this.addChild(i, child.project_name || this._projectName, child.type, false);
            chmodel.addChildModelsFromSerializedChildren(child.children || []);
        }
    }
    addChild(childId, projectName, type, isDynamic) {
        if (childId in this._childModels) {
            return this._childModels[childId + ''];
        }
        let model = new ReactopyaModel(projectName, type);
        model.onJavaScriptStateChanged((state) => {
            for (let handler of this._javaScriptStateChangedHandlers) {
                handler({
                    _childId: childId,
                    state: state
                });
            }
        });
        model.onChildModelAdded((data) => {
            for (let handler of this._childModelAddedHandlers) {
                handler({
                    _childId: childId,
                    data: data
                });
            }
        });
        model.onStart(() => {
            this.start();
        });
        model.onStop(() => {
            this.stop();
        });
        this._childModels[childId + ''] = model;
        for (let handler of this._childModelAddedHandlers) {
            handler({
                childId: childId,
                projectName: projectName,
                type: type,
                isDynamic: isDynamic
            });
        }
        return model;
    }
    childModel(childId) {
        return this._childModels[childId + ''];
    }
    start() {
        if (this._running)
            return;
        for (let handler of this._startHandlers)
            handler();
    }
    stop() {
        this._running = false;
        for (let handler of this._stopHandlers)
            handler();
    }
    onPythonStateChanged(handler) {
        this._pythonStateChangedHandlers.push(handler);
    }
    onJavaScriptStateChanged(handler) {
        this._javaScriptStateChangedHandlers.push(handler);
    }
    onChildModelAdded(handler) {
        this._childModelAddedHandlers.push(handler);
    }
    onStart(handler) {
        this._startHandlers.push(handler);
    }
    onStop(handler) {
        this._stopHandlers.push(handler);
    }
    _setStateHelper(state, existingStateStringified, handlers) {
        let changedState = {};
        let somethingChanged = false;
        for (let key in state) {
            let val = state[key];
            let valstr = JSON.stringify(val);
            if (valstr !== existingStateStringified[key]) {
                existingStateStringified[key] = valstr;
                changedState[key] = JSON.parse(valstr);
                somethingChanged = true;
            }
        }
        if (somethingChanged) {
            for (let handler of handlers) {
                handler(changedState);
            }
        }
    }
}

module.exports = ReactopyaModel;