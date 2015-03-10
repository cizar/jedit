;(function($, undefined) {

  'use strict';

  var pluginName = 'jedit';
  
  var defaults = {
    'accept': null,
    'acceptclass': null,
    'cancel': null,
    'cancelclass': null,
    'placeholder': 'Click to edit...',

    'event': 'click',
    'type': 'text',

    'load': null,
    'loadurl': null,
    'loadtype': 'GET',
    'loaddata': null,
    'loadopts': null,

    'save': null,
    'saveurl': null,
    'savetype': 'POST',
    'savedata': null,
    'saveopts': null,

    'restore': null,

    'rows': null,
    'cols': null,

    'options': null,
    'optionsurl': null,

    'onreset': null,
    'onblur': 'restore'
  };

  var widgetBase = {
    enable: function() {
      $(':input', this).prop('disabled', false);
    },
    disable: function() {
      $(':input', this).prop('disabled', true);
    },
    select: function() {
      $(':input:visible:enabled:first', this).select();
    },
    get: function() {
      return $(':input:visible:first', this).val();
    },
    set: function(value) {
      $(':input:visible:first', this).val(value);
    },
    controls: function(options) {
      var $controls = $('<div class="ui-editable-controls"/>');
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
      render: function(options) {
        var $input = $('<input type="text"/>');
        return $input.appendTo(this);
      }
    },
    textarea: {
      render: function(options) {
        var $textarea = $('<textarea/>');
        if (options.cols) {
          $textarea.attr('cols', options.cols);
        }
        if (options.rows) {
          $textarea.attr('rows', options.rows);
        }
        return $textarea.appendTo(this);
      }
    },
    select: {
      render: function(options) {
        var $select = $('<select/>');
        $.each(options.options, function() {
          $('<option/>')
            .val(this.value)
            .text(this.text)
            .appendTo($select);
        });
        if (!options.accept) {
          var $form = $(this);
          $select.on('change', function(event) {
            $form.trigger('submit');
          });
        }
        return $select.appendTo(this);
      }
    }
  }

  var Plugin = function(element, options) {
    if ('string' === $.type(options)) {
      options = { 'saveurl': options };
    } else if ('function' === $.type(options)) {
      options = { 'save': options };
    }
    this._element = element;
    this._options = $.extend({}, defaults, options, $(element).data());
    this._state = {};
    this._init();
  }

  Plugin.prototype._init = function() {
    this._on(this._element, this._options.event, this.onActivate);
    this._on(this._element, 'state', function(event) {
      $.each(this._state, function(state, value) {
        $(this).toggleClass('ui-editable-' + state, value);
      }.bind(this._element));
    });
    $(this._element).addClass('ui-editable ui-editable-' + this._options.type + ' ui-editable-' + $(this._element).css('display'));
    this._setState(this._getInitialState());
    this._original = $.trim($(this._element).html());
    this._widget = $.extend({}, widgetBase, widgets[this._options.type]);
    if (!this._original) {
      $(this._element).html(this._options.placeholder);
    }
  };

  Plugin.prototype._on = function(element, eventName, eventHandler) {
    $(element).on(eventName, eventHandler.bind(this));
  };

  Plugin.prototype._trigger = function(type, event, data) {
    var fn = this._options[type];
    event = $.Event(event);
    event.type = type;
    event.target = this._element;
    $(this._element).trigger(event, data);
    return !($.isFunction(fn) && fn.call(this._element, event, data) === false || event.isDefaultPrevented());
  };

  Plugin.prototype._setState = function(newState) {
    $.extend(this._state, newState);
    this._trigger('state');
  };

  Plugin.prototype._getInitialState = function() {
    return {
      disabled: false,
      editing: false,
      loading: false,
      restoring: false,
      saving: false
    }
  };

  Plugin.prototype.edit = function() {
    if (this._state.editing) {
      return;
    }

    this._setState({ editing: true });

    var form = this._form = $('<form>');
    this._on(form, 'submit', this.onSubmit);
    this._on(form, 'reset', this.onReset);
    this._on(form, 'keydown', this.onKeydown);
    
    this._widget.render.call(form, this._options);

    this.disable();

    this._widget.controls.call(form, this._options);

    $(this._element).empty().append(form);
    
    this._setState({ loading: true });
    this.load().done(function(value) {
      if (this._state.editing) {
        this.val(value);
        this.enable();
        this.select();
        this._trigger('loaded');
      }
    }).fail(function() {
      if (this._state.editing) {
        alert('Se ha producido un error inesperado, vuelva a intentar más tarde.');
        this.restore();
      }
    }).always(function() {
      this._setState({ loading: false });
    });
  }

  Plugin.prototype.load = function() {
    var d = $.Deferred();

    var opts = this._options;

    if (opts.load) {
      $.when(opts.load.call(this, opts))
        .done(d.resolve.bind(this))
        .fail(d.reject.bind(this));
    } else if (opts.loadurl) {
      var loaddata = {};
      loaddata['id'] = this._element.id;

      var loadAjaxOptions = $.extend({
        context: this,
        url: opts.loadurl,
        type: opts.loadtype,
        data: $.extend(loaddata, opts.loaddata)
      }, opts.loadopts);

      $.ajax(loadAjaxOptions)
        .done(d.resolve.bind(this))
        .fail(d.reject.bind(this));
    } else {
      d.resolveWith(this, [ this._original ]);
    }

    return d.promise();
  };

  Plugin.prototype.save = function() {
    var d = $.Deferred();

    var opts = this._options;
    var value = this.val();

    if (opts.save) {
      $.when(opts.save.call(this, opts, value))
        .done(d.resolve.bind(this))
        .fail(d.reject.bind(this));
    } else {
      var savedata = {};
      savedata['id'] = this._element.id;
      savedata['value'] = value;

      var saveAjaxOptions = $.extend({
        context: this,
        url: opts.saveurl,
        type: opts.savetype,
        data: $.extend(savedata, opts.savedata)
      }, opts.saveopts);

      $.ajax(saveAjaxOptions)
        .done(d.resolve.bind(this))
        .fail(d.reject.bind(this))
    }

    return d.promise();
  };

  Plugin.prototype.restore = function() {
    var d = $.Deferred();
    d.resolveWith(this, [ this._original ]);
    return d.promise();
  };

  // Widget proxy

  Plugin.prototype.enable = function() {
    if (this._state.editing) {
      this._setState({ disabled: false });
      this._widget.enable.call(this._form);
    }
  };

  Plugin.prototype.disable = function() {
    if (this._state.editing) {
      this._setState({ disabled: true });
      this._widget.disable.call(this._form);
    }
  };

  Plugin.prototype.select = function() {
    if (this._state.editing) {
      this._widget.select.call(this._form);
    }
  };

  Plugin.prototype.val = function(value) {
    if (!this._state.editing) {
      return undefined;
    }
    if (!arguments.length) {
      return this._widget.get.call(this._form);
    }
    this._widget.set.call(this._form, value);
  };

  // Event handlers

  Plugin.prototype.onActivate = function(event) {
    this.edit();
  };

  Plugin.prototype.onSubmit = function(event) {
    event.preventDefault();
    this._setState({ saving: true });
    this.save().done(function(html) {
      this._original = $.trim(html);
      $(this._element).html(html || this._options.placeholder);
      this._setState({ saving: false, editing: false });
      this._trigger('saved');
    }).fail(function() {
      alert('Se ha producido un error inesperado, vuelva a intentar más tarde.');
    });
  };

  Plugin.prototype.onReset = function(event) {
    event.preventDefault();
    this._setState({ restoring: true });
    this.restore().done(function(html) {
      $(this._element).html(html || this._options.placeholder);
      this._setState({ restoring: false, editing: false });
      this._trigger('restored');
    });
  };

  Plugin.prototype.onKeydown = function(event) {
    if (event.keyCode === 27) {
      event.preventDefault();
      $(event.delegateTarget).trigger('reset');
    } else if (event.ctrlKey && event.keyCode === 13) {
      event.preventDefault();
      $(event.delegateTarget).trigger('submit');
    }
  };

  var pluginSetup = function(options) {
    $.extend(defaults, options);
  };

  var pluginDefineWidget = function(name, widget) {
    widgets[name] = widget;
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
  $.fn[pluginName] = pluginHandler;
  $.fn[pluginName].defaults = defaults;
  $.fn[pluginName].widgets = widgets;

})(jQuery);
