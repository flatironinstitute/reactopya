import setuptools

pkg_name = "{{ extension_name }}_jup"

setuptools.setup(
    name=pkg_name,
    version="{{ version }}",
    author="{{ author }}",
    description="{{ description }}",
    packages=setuptools.find_packages(),
    scripts=[],
    install_requires=['jupyter'],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ]
)
