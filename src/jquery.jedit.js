;(function($, window, document, undefined) {

  'use strict';

  var pluginName = 'jedit';

  var defaults = {
    accept: null,
    acceptclass: null,
    cancel: null,
    cancelclass: null,
    placeholder: 'Click to edit...',
    event: 'click',
    type: 'text',
    load: null,
    loadurl: null,
    loadtype: 'GET',
    loaddata: null,
    loadopts: null,
    save: null,
    saveurl: null,
    savetype: 'POST',
    savedata: null,
    saveopts: null,
    rows: null,
    cols: null,
    options: null,
    optionsurl: null,
    classprefix: 'ui-editable'
  };

  var widgetBase = {
    val: function() {
      return $(':input:visible:first', this).val();
    },
    addButtons: function(options) {
      var $controls = $('<div/>')
        .addClass(options.classprefix + '-buttons');
      if (options.accept) {
        $('<button type="submit">')
          .html(options.accept)
          .addClass(options.acceptclass)
          .appendTo($controls);
      }
      if (options.cancel) {
        $('<button type="reset">')
          .html(options.cancel)
          .addClass(options.cancelclass)
          .appendTo($controls);
      }
      $controls.appendTo(this);
    }
  };

  var widgets = {
    text: {
      render: function(value, options) {
        var $elem = $('<input type="text"/>')
          .val(value)
          .appendTo(this)
          .select();
        return $elem;
      }
    },
    textarea: {
      render: function(value, options) {
        var $elem = $('<textarea/>')
          .val(value)
          .appendTo(this);
        if (options.cols) {
          $elem.attr('cols', options.cols);
        }
        if (options.rows) {
          $elem.attr('rows', options.rows);
        }
        return $elem;
      }
    },
    select: {
      render: function(value, options) {
        var $elem = $('<select/>');
        $.each(options.options, function() {
          $('<option/>')
            .val(this.value)
            .text(this.text)
            .appendTo($elem);
        });
        $elem.val(value).appendTo(this);
        if (!options.accept) {
          var $form = $(this);
          $elem.on('change', function(event) {
            $form.trigger('submit');
          });
        }
        return $elem;
      }
    }
  };

  var Plugin = function(element, options) {
    if ('string' === $.type(options)) {
      options = { 'saveurl': options };
    } else if ('function' === $.type(options)) {
      options = { 'save': options };
    }
    this._element = element;
    this._options = $.extend({}, defaults, options, $(element).data());
    this._init();
  };

  Plugin.prototype._init = function() {
    var self = this;
    var opts = this._options;
    self._original = $.trim($(self._element).html());
    self._widget = $.extend({}, widgetBase, widgets[opts.type]);
    if (!self._original) {
      $(self._element).html(opts.placeholder);
    }
    $(self._element).on(opts.event, function(event) {
      if (self._editorPromise && 'pending' === self._editorPromise.state()) {
        return;
      }
      var edit = self.edit.bind(self),
          save = self.save.bind(self);
      self._editorPromise = self.load().then(edit).then(save).done(function(value) {
        self._original = $.trim(value);
      }).fail(function(response) {
        if ($.isPlainObject(response) && response.status) {
          console.log(response.status);
        } else {
          console.log('Error interno', response);
        }
      }).always(function() {
        $(self._element).html(self._original || opts.placeholder).removeClass(opts.classprefix + '-editing');
      });
      $(self._element).addClass(opts.classprefix + '-editing');
    });
    $(self._element).on('changestate', function(event) {
      $.each(self._state, function(state, value) {
        $(self._element).toggleClass(opts.classprefix + '-' + state, value);
      });
    });
    $(this._element).addClass(opts.classprefix
      + ' ' + opts.classprefix + '-' + opts.type
      + ' ' + opts.classprefix + '-' + $(this._element).css('display')
    );
  };

  Plugin.prototype.edit = function(value) {
    var d = $.Deferred();
    var widget = this._widget;
    var form = $('<form>');
    $(form).on('submit', function(event) {
      event.preventDefault();
      d.resolve(widget.val());
    });
    $(form).on('reset', function(event) {
      d.reject('Cancelled by user');
    });
    $(this._element).empty().append(form);
    widget.render.call(form, value, this._options);
    widget.addButtons.call(form, this._options);
    return d.promise();
  };

  Plugin.prototype.load = function() {
    var opts = this._options;
    if (opts.load) {
      return $.when(opts.load.call(this));
    } if (opts.loadurl) {
      var data = {};
      data['id'] = this._element.id;
      return $.ajax($.extend({
        context: this,
        url: opts.loadurl,
        type: opts.loadtype,
        data: $.extend(data, opts.loaddata)
      }, opts.loadopts));
    }
    return $.when(this._original);
  };

  Plugin.prototype.save = function(value) {
    var opts = this._options;
    if (opts.save) {
      return $.when(opts.save.call(this, value));
    } else if (opts.saveurl) {
      var data = {};
      data['id'] = this._element.id;
      data['value'] = value;
      return $.ajax($.extend({
        context: this,
        url: opts.saveurl,
        type: opts.savetype,
        data: $.extend(data, opts.savedata)
      }, opts.saveopts));
    }
    $.error('Either saveurl or save options must be defined');
  };

  var pluginSetup = function(options) {
    $.extend(defaults, options);
  };

  var pluginDefineWidget = function(name, widget) {
    widgets[name] = widget;
  };
  
  var pluginDefineWidgets = function(definitions) {
    $.extend(widgets, definitions);
  };
  
  var pluginHandler = function(options) {
    return this.each(function() {
      if (!$(this).data('plugin_' + pluginName)) {
        $(this).data('plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };

  $[pluginName] = pluginSetup;
  $[pluginName].widget = pluginDefineWidget;
  $[pluginName].widgets = pluginDefineWidgets;
  $.fn[pluginName] = pluginHandler;
  $.fn[pluginName].defaults = defaults;
  $.fn[pluginName].widgets = widgets;

}(jQuery, window, document));
