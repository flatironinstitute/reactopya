#!/bin/bash

set -ex

mkdir -p {{ project_name }}_jup/dist
cp ../{{ project_name }}_bundle/dist/bundle.js {{ project_name }}_jup/dist/bundle.js
rm -rf dist
python setup.py sdist
twine upload dist/*.tar.gz
