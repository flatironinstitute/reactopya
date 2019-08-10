import setuptools

pkg_name = "reactopya"

setuptools.setup(
    name=pkg_name,
    version="0.2.0",
    author="Jeremy Magland",
    author_email="jmagland@flatironinstitute.org",
    description="",
    packages=setuptools.find_packages(),
    scripts=['bin/reactopya'],
    install_requires=[
        "jinja2"
    ],
    classifiers=(
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    )
)
