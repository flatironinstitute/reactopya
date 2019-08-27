var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'jupyter.extensions.reactopya_jup',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
    widgets.registerWidget({
        name: 'reactopya_jup',
        version: plugin.version,
        exports: plugin
    });
  },
  autoStart: true
};

