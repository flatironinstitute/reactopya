import setuptools
import os

with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'reactopya', 'VERSION')) as version_file:
    version = version_file.read().strip()

setuptools.setup(
    name="reactopya",
    version=version,
    author="Jeremy Magland",
    author_email="jmagland@flatironinstitute.org",
    description="",
    packages=setuptools.find_packages(),
    scripts=['bin/reactopya'],
    include_package_data=True,
    install_requires=[
        "jinja2",
        "numpy",
        "simplejson"
    ],
    classifiers=(
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    )
)
