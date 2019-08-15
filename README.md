# Reactopya

Reactopya is a Python package that enables combining of ReactJS with Python code to create widgets that may seamlessly be deployed to the notebook, the web, or the desktop. See below for more information

## Example usage

This package is used by [ephys-viz](https://github.com/flatironinstitute/ephys-viz)

## Installation

Prerequisites:

* Linux or OS X
* Python >= 3.6
* NodeJS >= 8
* Yarn

```
# After cloning this repo
cd reactopya
pip install .
```

## About Reactopya

I think of a widget as a standalone GUI component that provides a well-defined view into an underlying data structure, and which may also contain a computational element. It is important that a widget is both able to exist on its own and to be used as a building block along with other widgets.

Portability and interoperability are both crucial. We do not want to maintain a separate set of GUI components for the notebook, the desktop, and the web. Rather, our widgets should be defined once by a minimalistic source code definition, and then we need to be able to deploy these in the various contexts (web, notebook, desktop). The deployment of widgets should be completely independent of the implementation and/or definition of their functionalities.

I believe that JavaScript is the best choice for creating  rich, interactive GUI components. In fact, if we want our widgets to display equivalently in the browser, the notebook, and on the desktop, then JavaScript is pretty much our only choice. Nevertheless, from a computational and data management perspective, Python is so much more powerful (think Numpy and the many third party libraries invaluable for data science). Therefore, I believe the solution is to create widget components that pair JavaScript with Python in an intuitive manner. Since there are many different ways that JavaScript and Python can communicate with one another, the challenge is to decide how to structure our JavaScript/Python widgets in a manner that is independent of our choice of how to implement this communication.

One way that JavaScript and Python can coexist is via Jupyter widgets which may be displayed in notebooks. The Jupyter framework handles communication between the client (JavaScript running in the browser) and the server (Python running in a runtime kernel). Jupyter provides a mechanism for developing notebook extensions that may be installed on the machine that runs the Jupyter kernel and notebook server.

While we certainly want our Jupyter/Python widgets to be able to function as Jupyter widgets, we also want to incorporate our widgets within standalone web applications as well as desktop software running on a local machine. This requires a different type of communication between JavaScript and Python. One difference is that in a notebook setting, Python is the control language; that is, we instantiate a widget in Python and pass parameters to that widget within a notebook cell. On the other hand, in a standalone web or desktop application, the primary language is JavaScript, and the component needs to be created by passing widget parameters to a web component in JavaScript. In the context of a web application, an IPython kernel is not necessarily the right choice, partly because we need to support anonymous visitors to the website. For desktop applications, we may want to bypass the client/server infrastructure altogether and allow the JavaScript to call the Python routines directly.

Thus it is crucial that we define our widgets in a sufficiently general way so that we may deploy in these different settings without needing to modify the original source code.

ReactJS is a popular, modern framework for creating JavaScript components that are modular, reusable, and may be fit together like lego pieces. Aside from the modularity advantage there are many other reasons to use React including its performance and the plethora of third party libraries and development tools available. It is a natural choice for our application. The question is, how can we define a React component such that it can also communicate with the Python backend.

We approached this by allowing a companion Python class to be bundled with each React component, and allowing shared access to a subset of the component's state variables. This integrates nicely with React's rendering system since the appearance of a component is supposed to be determined only by its properties (props) and state variables. Whenever one of these is modified, the component is automatically re-rendered by the the Lifecycle system of React.

A Reactopya component comprises the following files

```
ComponentName/
    __init__.py
        Define the Python class to be part of a module
    ComponentName.js
        The ReactJS component
    ComponentName.py
        The companion Python class
    ComponentName.json
        Meta information about the widget:
            Name of the component
            Specifies which state variables are shared between the JavaScript and Python components
            Other information
```

When the JavaScript component is mounted on a web page (or in a desktop application), an instance of the companion Python class is also created on a server, in the IPython kernel, or in a local spawned process (depending on the environment). The framework then facilitates the synchronization of the shared state variables, which represents the inter-language communication.