## Intro to reactopya and ephys-viz

**06 Sep 2019**

The objective of reactopya is to provide a framework for creating interactive
visualizations that are seamlessly deployable in the following ways

* Notebook (JupyterLab, Jupyter Notebook, binder, or Google Colab) 
* Desktop (launch electron apps from python scripts)
* Website

The ephys-viz project is built on this framework and will provide a growing
collection of general purpose interactive widgets for neurophysiology and will
interface with the NWB format. These widgets will include NWB data browsers,
views of electrode layouts, timeseries, place fields, and other experimental
data. See [this
document](https://github.com/flatironinstitute/ephys-viz/blob/master/docs/electrophysiology_data_visualization.md)
for some examples.

The aim is to make it as easy as possible for developers to create new widgets
and improve existing ones. No modification to the underlying code is needed in
order to deploy in any of the above methods.

A reactopya widget comprises three files (plus any other files they depend on)

* [WidgetName].py
* [WidgetName].js
* [WidgetName].json

The .js file uses react and works together with the companion .py file. The
Python code typically handles the file I/O and any necessary computations
(pynwb, numpy, scipy, etc) and the JavaScript uses React together with many
other possible packages (vtk.js, plotly.js, d3, etc). The .json file specifies
which state variables are shared between the two languages. Unlike other
systems, these files are located together in a single directory ensuring
portability and modularity of widgets.

There are a lot more details and the docs are lagging somewhat behind, but you
can already get started by taking a look at
[ephys-viz](https://github.com/flatironinstitute/ephys-viz) and
[reactopya_examples](https://github.com/flatironinstitute/reactopya_examples)
repositories. Installation instructions for Linux and OSX are provided.

But even without installing anything, attached below is a one-file-bundle snapshot of one
widget which was exported using the .export_snapshot() functionality as follows:

```
X = ev.PlaceField(
    nwb_query={
        "path": "sha1://a713cb31d505749f7a15c3ede21a5244a3f5a4d9/bon03.nwb",
        "epochs": [5]
    },
    download_from="spikeforest.public"
)
X.show()
.... wait for rendering, etc

X.export_snapshot('placefield.bon03.nwb.html', format='html')
```

(In this example, the downsample button does not work because it is a snapshot with
the python backend disabled. But that part works in the notebook.)

In addition I have provided a second snapshot demonstrating compatibility with vtk.js.

* [placefield.bon03.nwb.html](https://www.dropbox.com/s/whfkqctum6ebqk8/placefield.bon03.nwb.html?dl=0)

* [quas3_surface.html](https://www.dropbox.com/s/6kcezc1tdg1sw2j/quas3_surface.html?dl=0)

* Folder of other snapshots: [dropbox_folder](https://www.dropbox.com/sh/j1yhalbjocuxhj2/AAAaHOCCHW6YqLjc-6FhxBBca?dl=0)