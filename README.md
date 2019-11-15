# Reactopya

Reactopya is a development tool for creating widgets that combine ReactJS with Python and that may seamlessly be deployed to the notebook, web, or desktop.

## Installation

Prerequisites:

* Linux or OSX
* Python >= 3.6
* NodeJS >= 8
* Yarn

```
pip install --upgrade reactopya
```

Or for a development installation, clone this repo and then

```
cd reactopya
pip install -e .
```

## Reactopya overview

A GUI widget should ideally be a standalone, interactive graphical component that provides a view into an underlying data object. It can also contain some computational functionality. To optimize modularity and usability, the widget should be able to exist on its own and also as a building block in conjunction with other widgets.

Since we do not want to maintain a separate set of GUI components for the notebook, desktop, and web, it is important that the source code for our widgets are independent of the chosen deployment method.

In terms of languages, JavaScript is the probably the best choice for creating rich, interactive GUI components. In fact, if we want our widgets to display equivalently in the browser, notebook, and desktop, then JavaScript is pretty much our only choice. Nevertheless, from a computational and data management perspective, Python is much more powerful (think Numpy and the many third party libraries invaluable for data science). Therefore, our widget components should pair JavaScript with Python in an intuitive manner. Since there are many different ways that JavaScript and Python can communicate with one another, the challenge is to decide how to structure our JavaScript/Python widgets in a manner that is independent of the mechanism for this communication.

One way that JavaScript and Python can coexist is via Jupyter widgets which are displayed in notebooks. The Jupyter framework handles communication between the client (JavaScript running in the browser) and the server (Python running in a runtime kernel). Jupyter provides a mechanism for developing notebook extensions that may be installed on the machine that runs the Jupyter kernel and notebook server.

While we certainly want our Jupyter/Python widgets to be able to function as Jupyter widgets, we also want to incorporate our widgets within standalone web applications as well as desktop software running on a local machine. This requires a different type of communication between JavaScript and Python. One difference is that in a notebook environment, Python is the control language; that is, we instantiate a widget in Python and pass parameters to that widget within a notebook cell. On the other hand, in a standalone web or desktop application, the primary language is JavaScript, and the component needs to be created by passing widget parameters to a web component in JavaScript. In the context of a web application, an IPython kernel is not necessarily the right choice, partly because we need to support anonymous visitors to the website. For desktop applications, we may want to bypass the client/server infrastructure altogether and allow the JavaScript to call the Python routines directly.

Thus it is crucial that we define our widgets in a sufficiently general way so that we may deploy in these different settings without needing to modify the original source code.

ReactJS is a popular, modern framework for creating JavaScript components that are modular, reusable, and may be fit together like lego pieces. Aside from the modularity advantage there are many other reasons to use React including its performance and the plethora of third party libraries and development tools available. It is a natural choice for our application. The question is, how can we define a React component such that it can also communicate with the Python backend.

In Reactopya this is done by bundling a companion Python class with each React component, and allowing shared access to a subset of the component's state variables. This integrates nicely with React's rendering system since the appearance of a component is supposed to be determined only by its properties (props) and state variables. Whenever one of these is modified, the component is automatically re-rendered by the the Lifecycle system of React.

A Reactopya component is defined by the following files (and perhaps others):

```
ComponentName/
    __init__.py
        Include the widget as part of a Python module
    ComponentName.js
        The ReactJS component
    ComponentName.py
        The companion Python class
    ComponentName.json
        Meta information about the widget:
            Name of the component
            Other information
```

When the JavaScript component is mounted on a web page (or in a desktop application), an instance of the companion Python class is also created on a server, in the IPython kernel, or in a local spawned process (depending on the deployment mechanism). The framework then facilitates the synchronization of the shared state variables, which represents the inter-language communication.

## Usage

This package is used by the following WIP reactopya projects that may serve as examples:

* [ephys-viz](https://github.com/flatironinstitute/ephys-viz)
* [ccm_widgets](https://github.com/flatironinstitute/ccm_widgets)
* [kachery_widgets](https://github.com/flatironinstitute/kachery/kachery_widgets)

The easiest way to start a new reactoypa project from scratch is via the following convenience command-line operations:

```bash
> mkdir FirstProject
> cd FirstProject
> reactopya init-project
# answer the questions

> reactopya new-widget
# answer the questions
```

Reactoypa will create the necessary files. The structure of a reactopya project is as follows:

```
reactopya.config.json
package.json
dev_widget.json
widgets/
    [WidgetName]/
        __init__.py
        [WidgetName].py
        [WidgetName].js
        [WidgetName].json
generated/
    ...
```

Here is an example `reactopya.config.json` file:

```json
{
    "project_name": "first-reactopya-project",
    "version": "0.1.0",
    "description": "An example reactoypa project",
    "author": "Jeremy Magland",
    "license": "Apache-2.0",
    "setup_py": {
        "install_requires": [
            "imageio",
            "imageio-ffmpeg"
        ]
    }
}
```

This provides the name, version, description, author, and license information as well as Python package dependencies.

The `package.json` file is optional and contains the JavaScript / NodeJS dependencies. For example:

```json
{
        "name": "first-reactopya-project",
        "dependencies": {
                "@material-ui/core": "^4.2.0",
                "react-icons": "^3.7.0"
        },
        "devDependencies": {}
}
```

The reason that this is a separate file is so that `npm install` or `yarn install` may be used for convenience during development to install the node modules so that the IDE (e.g.,  VS Code) will find the dependencies. It also makes it possible to add node packages in the usual way.

The `dev_widget.json` is also optional and specifies which widget (and props) should be opened when running in development mode (see `reactopya start-dev` below). For example:

```json
{
    "widget": {
        "type": "WidgetName",
        "props": {
            "test_prop": 1
        }
    }
}
```

The `widgets` directory contains the source code defining each of the widgets in the project, with one subdirectory per widget.

The `generated` folder is created by reactopya and contains all of the code needed to deploy the widgets in the various environments. Because this folder is automatically generated by reactopya, it should not be checked in to your revision control system (e.g., git).

## Hosting a widget on a web server

See this project as an example: [https://github.com/magland/webapp](https://github.com/magland/webapp)

