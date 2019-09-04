import setuptools
import os

pkg_name = "reactopya_jup"
with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'reactopya_jup', 'VERSION')) as version_file:
    version = version_file.read().strip()

setuptools.setup(
    name=pkg_name,
    version=version,
    author="Jeremy Magland",
    description="Reactopya JupyterLab extension",
    packages=setuptools.find_packages(),
    include_package_data=True,
    scripts=[],
    install_requires=[
        'simplejson',
        'ipywidgets'
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ]
)
