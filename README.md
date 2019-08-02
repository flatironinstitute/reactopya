# reactopya

A reactopy widget consists of:

* A ReactJS component for rendering on a webpage, notebook, or desktop application
* A Python class for performing required backend computations and data retrieval

Once a reactopya widget is created, it may be deployed in a number of different ways.

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

See the [reactopya_gallery](https://github.com/flatironinstitute/reactopya_gallery) project for a collection of example widgets. In fact, at the moment, the reactopya_gallery includes this repo as a git submodule.
