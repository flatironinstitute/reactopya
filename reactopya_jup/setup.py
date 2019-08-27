import setuptools
import os

pkg_name = "reactopya_jup"

setuptools.setup(
    name=pkg_name,
    version="0.3.8",
    author="Jeremy Magland",
    description="Reactopya JupyterLab extension",
    packages=setuptools.find_packages(),
    scripts=[],
    install_requires=[
        'simplejson'
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ]
)
