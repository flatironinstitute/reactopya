import setuptools

pkg_name = "{{ project_name }}"

setuptools.setup(
    name=pkg_name,
    version="{{ version }}",
    author="{{ author }}",
    description="{{ description }}",
    packages=setuptools.find_packages(),
    scripts=['bin/{{ project_name }}'],
    include_package_data=True,
    install_requires=[
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
