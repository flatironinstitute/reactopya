import setuptools

pkg_name = "reactopya"

setuptools.setup(
    name=pkg_name,
    version="0.2.8",
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
