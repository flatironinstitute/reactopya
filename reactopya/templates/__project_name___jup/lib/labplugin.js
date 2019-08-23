var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'jupyter.extensions.{{ project_name }}_jup',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
    widgets.registerWidget({
        name: '{{ project_name }}_jup',
        version: plugin.version,
        exports: plugin
    });
  },
  autoStart: true
};

