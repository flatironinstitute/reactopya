# reactopy

A reactopy widget consists of:

* A ReactJS component for rendering on a webpage, notebook, or desktop application
* A Python class for performing required backend computations and data retrieval

Once a reactopy widget is created, it may be deployed in a number of different ways.

## Installation

This repository represents both a Python package and a npm module.

To install the Python package in development mode:

```
pip install -e .
```

To build the npm module:

```
yarn install
yarn build
```

## Usage

See the [reactopy_gallery](https://github.com/flatironinstitute/reactopy_gallery) project for a collection of example widgets. In fact, at the moment, the reactopy_gallery includes this repo as a git submodule.
