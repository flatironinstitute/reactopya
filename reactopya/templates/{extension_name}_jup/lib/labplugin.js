var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: '{{ extension_name }}_jup',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
    // TODO: finish this
    //   widgets.registerWidget({
    //       name: '[name-of-widget]',
    //       version: plugin.version,
    //       exports: plugin
    //   });
  },
  autoStart: true
};

