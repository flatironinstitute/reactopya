import setuptools

pkg_name = "{{ project_name }}_colab"

setuptools.setup(
    name=pkg_name,
    version="{{ version }}",
    author="{{ author }}",
    description="{{ description }}",
    packages=setuptools.find_packages(),
    include_package_data=True,
    scripts=[],
    install_requires=[
        'reactopya',
        'simplejson',
        {% for value in setup_py.install_requires -%}
        '{{ value }}'{%- if not loop.last %},{% endif %}
        {% endfor -%}
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ]
)
