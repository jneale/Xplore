/*
  Controls the SND Xplore UI
*/

// Delay a function, overriding any previous calls for the same id
var delay = (function () {
  var timers = {};
  return function (id, callback, ms) {
    clearTimeout(timers[id]);
    timers[id] = setTimeout(callback, ms);
  };
})();

// get the minutes, seconds and decisecond since a given time, e.g. 01:32.1
function getMinutesSince(startTime) {
  var t = new Date().getTime() - startTime;
  var ds = Math.floor((t/100) % 10);
  var seconds = Math.floor((t/1000) % 60);
  var minutes = Math.floor((t/1000/60) % 60);
  var hours   = Math.floor(t/1000/60/60);
  if (minutes < 10) minutes = '0' + minutes;
  if (seconds < 10) seconds = '0' + seconds;
  if (hours   < 10) hours   = '0' + hours;
  return hours + ':' + minutes + ':' + seconds + '.' + ds;
}

// main UI object
var snd_xplore_ui = {};
snd_xplore_ui.isDirty = function isDirty() {
  // check is editor has been executed/saved
  return snd_xplore_util.isDirty() || snd_xplore_regex_util.isDirty();
};

/*************************************
              XPLORE
**************************************/

var snd_xplore_util = {
  start_time: null,
  end_time: null,
  countup_interval: null,
  node_log_url: '',
  is_dirty: false,
  session_id: null, // for loaded scripts
  isDirty: function () {
    return snd_xplore_util.is_dirty;
  },
  loading: function () {
    $timer = $('#timer');
    $('#xplore_btn')
        .prop('disabled', true)
        .html('Loading... <i class="glyphicon glyphicon-refresh spin"></i>');

    $('#format_btn').hide();
    $('#cancel_btn').prop('disabled', false).text('Cancel').show();
    $('#output_loader').addClass('active');

    snd_xplore_util.start_time = null;
    snd_xplore_util.end_time = null;

    $timer.text('');
    var start = new Date().getTime();
    snd_xplore_util.countup_interval = setInterval(function () {
      $timer.text(getMinutesSince(start));
    }, 100);
  },
  loadingComplete: function (result) {
    if (result) {
      snd_xplore_util.start_time = result.start_time;
      snd_xplore_util.end_time = result.end_time;
      snd_xplore_util.is_dirty = false;
    }
    $('#xplore_btn')
        .html('Run')
        .prop('disabled', false);

    $('#format_btn').show();
    $('#cancel_btn').hide();
    $('#output_loader').removeClass('active');
    // make sure we are on the output tab
    $('#script_output_tab').tab('show');
    // scroll to the top of the output div
    $('#output_tabs_pane').animate({ scrollTop: 0 }, "fast");

    clearInterval(snd_xplore_util.countup_interval);

    // Google Code-Prettify
    window.PR.prettyPrint();
  },
  getCode: function () {
    var code = '';
    if (typeof snd_xplore_editor === 'object') {
      code = snd_xplore_editor.getValue();
    } else {
      code = document.getElementById('snd_xplore').value;
    }
    return code;
  },
  setPreference: function setPreference(name, value) {
    $.ajax({
      type: 'POST',
      url: '/snd_xplore.do?action=setPreference&name=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(value),
      dataType: 'json'
    }).
    done(function (data) {
        snd_log('Saved preference.');
    }).
    fail(function () {
      snd_log('Error: setPreference failed.');
    });
  },
  execute: function (code) {
    // summary:
    //   Gather the data from the client and run Xplore
    var params = {
      debug_mode: $('#debug_mode').is(':checked'),
      target: $('#target').val(),
      scope: $('#scope').val(),
      code: code || snd_xplore_util.getCode(),
      user_data: $('#user_data_input').val(),
      user_data_type: $('#user_data_type_select').val(),
      breadcrumb: snd_xplore_reporter.getBreadcrumb(),
      reporter: snd_xplore_reporter,
      no_quotes: !$('#setting_quotes').is(':checked'),
      show_props: $('#show_props').is(':checked'),
      show_strings: $('#show_strings').is(':checked'),
      html_messages: $('#show_html_messages').is(':checked'),
      fix_gslog: $('#fix_gslog').is(':checked'),
      support_hoisting: $('#support_hoisting').is(':checked'),
      id: window.snd_xplore_session_id, // supplied in snd_xplore_main UI Macro
      loaded_id: snd_xplore_util.session_id // the loaded script
    };

    // allow the user to paste in a URL encoded history block
    if (params.code.indexOf('/snd_xplore.do?item=') === 0) {
      if (snd_script_history_util.parseUrlSearch(params.code)) return;
    }

    snd_xplore(params);
  },
  executeNew: function () {
    snd_xplore_reporter.clearBreadcrumb();
    this.execute();
  },
  demo: function (code, user_data) {
    var $user_data_input;

    snd_xplore_util.toggleEditor(true, function () {

      var confirmed = false;

      if (snd_xplore_editor.getValue()) {
        confirmed = confirm('Do you want to replace the current script?');
        if (!confirmed) return;
      }

      $user_data_input = $('#user_data_input');
      if ($user_data_input.val()) {
        confirmed = confirmed || confirm('Do you want to replace the current user data?');
        if (!confirmed) return;
      }

      $user_data_input.val(user_data);
      if (user_data) {
        $('#user_data_tab').tab('show');
      }

      $('#target').val('server');
      $('#scope').val('global');
      snd_xplore_editor.setValue(code);
      snd_xplore_editor.focus();
    });
  },
  formatString: function () {
    var $user_data_input = $('#user_data_input'),
        $user_data_type = $('#user_data_type_select');
    $.ajax({
      type: "POST",
      url: "/snd_xplore.do?action=formatString&type=" + $user_data_type.val(),
      data: {
        string: $user_data_input.val()
      }
    }).
    done(function (data) {
      $user_data_input.val(data.result);
    }).
    fail(function () {
      snd_log('Error: could not format string.');
    });
  },
  beautify: function () {
    var code = snd_xplore_editor.somethingSelected() ? snd_xplore_editor.getSelection()
                                                     : snd_xplore_editor.getValue().replace(/^\s+/, '');
    var options = {
      indent_size: snd_xplore_editor.getOption('indentUnit')
    };
    if (code) {
      snd_xplore_editor.setValue(js_beautify(code, options));
    }
  },
  toggleEditor: (function () {
    var output_left = 300;
    var state = 1;
    return function (force, callback) {
      var $this = $('#editor_toggle');
      var $editor = $('#editor');
      var $output = $('#output');
      if ((force === true && state === 1) || (force === false && state === 0)) {
        if (typeof callback === 'function') callback();
        return;
      }
      if ($editor.is(":hidden") || force === true) {
        $output.animate({left: $editor.outerWidth()}, 400, function () {
          $editor.fadeIn(400);
          $this.addClass('active');
          state = 1;
          if (typeof callback === 'function') callback();
        });
      } else {
        $editor.fadeOut(400, function () {
          $output.animate({left: 0}, 400, function () {
            output_left = $output.css('left');
            $this.removeClass('active');
            state = 0;
            if (typeof callback === 'function') callback();
          });
        });
      }
    };
  })(),
  cancel: function () {
    // add status=true to get the current status
    $.ajax('/cancel_my_transaction.do?sysparm_output=xml', {
      dataType: 'xml'
    });
    $('#cancel_btn').prop('disabled', true).text('Cancelling...');
  },
   // courtesy of https://stackoverflow.com/questions/2044616/select-a-complete-table-with-javascript-to-be-copied-to-clipboard
  copyElementToClipboard: function copyElementToClipboard(el) {
    var body = document.body, range, sel;
    if (document.createRange && window.getSelection) {
      range = document.createRange();
      sel = window.getSelection();
      sel.removeAllRanges();
      try {
        range.selectNodeContents(el);
        sel.addRange(range);
      } catch (e) {
        range.selectNode(el);
        sel.addRange(range);
      }
      document.execCommand("copy");
    } else if (body.createTextRange) {
      range = body.createTextRange();
      range.moveToElementText(el);
      range.select();
      range.execCommand("Copy");
    }
  },
  copyTextToClipboard: function copyTextToClipboard(text) {
    function fallbackCopyTextToClipboard(text) {
      var textArea = document.createElement("textarea");
      textArea.value = text;

      // Avoid scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        var successful = document.execCommand('copy');
        var msg = successful ? '' : ' failed';
        snd_xplore_util.simpleNotification('Copied to clipboard' + msg);
      } catch (err) {
        snd_xplore_util.simpleNotification('Copy to clipboard failed');
      }

      document.body.removeChild(textArea);
    }

    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
      snd_xplore_util.simpleNotification('Copied to clipboard');
    }, function(err) {
      snd_xplore_util.simpleNotification('Copy to clipboard failed');
    });
  },
  simpleNotification: (function () {
    var simpleNotificationTimeout;
    return function simpleNotification(message) {
      var el = $('#notification');
      $('#notification').text(message);
      el.addClass('in'); // element has 'fade' class
      clearTimeout(simpleNotificationTimeout);
      simpleNotificationTimeout = setTimeout(function () {
        el.removeClass('in');
      }, 3000);
    };
  })()
};

$('.xplore_demo').on('click', 'a', function (e) {
  e.preventDefault();
  $this = $(this);
  var code = [],
      user_data;
  switch ($this.attr('data-demo')) {
    case 'GlideRecord':
      code.push('var gr = new GlideRecord("incident");');
      code.push('//gr.addQuery("");');
      code.push('gr.setLimit(1);');
      code.push('gr.query();');
      code.push('gr.next();');
      code.push('gr');
      break;
    case 'GlideRecord.get':
      code.push('var gr = new GlideRecord("incident");');
      code.push('gr.get("sys_id", "foo");');
      code.push('gr');
      break;
    case 'Array':
      code.push("var a = [];");
      code.push("a.push(['a', 'b', 'c']);");
      code.push("a.push(['x', 'y', 'z']);");
      code.push("a");
      break;
    case 'GlideUser':
      code.push("gs.getUser();");
      break;
    case 'Logging':
      code.push('gs.log("Hello world from gs.log")');
      code.push('gs.print("Hello world from gs.print (not compatible with scopes)")');
      code.push('gs.info("Hello world from gs.info")');
      code.push('gs.warn("Hello world from gs.warn")');
      code.push('gs.error("Hello world from gs.error")');
      code.push('gs.addInfoMessage("Hello world from.gs.addInfoMessage")');
      code.push('gs.addErrorMessage("Hello world from gs.addErrorMessage")');
      break;
    case 'scope':
      code.push("this");
      break;
    case 'user_data':
      code.push('var doc = new XMLDocument(user_data);');
      code.push('doc.toIndentedString();');
      user_data = '<?xml version="1.0" encoding="UTF-8" ?><xml><incident><active>true</active></incident></xml>';
      break;
  }
  if (code) {
    snd_xplore_util.demo(code.join('\n'), user_data);
  }
});


/*************************************
              REGEX
**************************************/

var snd_xplore_regex_util = (function () {
  $intro_panel   = $('#regex_intro_panel');
  $match_panel   = $('#regex_match_panel');
  $group_panel   = $('#regex_group_panel');
  $error_panel   = $('#regex_error_panel');
  $result        = $('#regex_match');
  $result_groups = $('#regex_group');
  function showIntro() {
    $match_panel.hide();
    $group_panel.hide();
    $error_panel.hide();
    $intro_panel.fadeIn();
  }
  function showError(text) {
    $('#regex_error').empty().append(text);
    $intro_panel.hide();
    $match_panel.hide();
    $group_panel.hide();
    $error_panel.fadeIn();
  }
  function showResult(matches, groups) {
    $intro_panel.hide();
    $error_panel.hide();
    $result.empty().append(matches);
    $match_panel.fadeIn();
    if (groups) {
      $result_groups.empty().append(groups);
      $group_panel.fadeIn();
    } else {
      $group_panel.hide();
    }
  }

  function isDirty() {
    return $('#regex').val() || $('#regex_input').val();
  }

  snd_xplore.regex.addEvent('start', function () {
    $('#regex_loading').fadeIn();
  });

  var escapeHtml = (function () {
    var map = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;'
    };
    var replace = function (c) {
      return map[c];
    };
    return function (text) {
      return text.replace(/<|>|&/g, replace);
    };
  })();

  snd_xplore.regex.addEvent('done', function(result) {
    var matchHtml, groupHtml;
    if (result) {
      if (result.error) {
        showError(result.error);
      } else if (result.matches){
        matchHtml = '';
        $.each(result.matches, function (i, item) {
          item.text = escapeHtml(item.text);
          if (item.type == 'match') {
            matchHtml += '<span class="bg-success text-success">' + item.text + '</span>';
          } else {
            matchHtml += item.text;
          }
        });
        groupHtml = '';
        if (result.groups) {
          if (result.groups.join('').length) {
            $.each(result.groups, function (i, item) {
              groupHtml += '<h5 class="text-danger">Match ' + (i + 1) + '</h5>';
              groupHtml += '<ol>';
              $.each(item, function (i, group) {
                groupHtml += '<li>' + escapeHtml(group) + '</li>';
              });
              groupHtml += '</ol>';
            });
          }
        }
        showResult(matchHtml, groupHtml);
      } else {
        showError('No result was given.');
      }
    } else {
      showIntro();
    }
    $('#regex_loading').hide();
  });

  function updateExample() {

  }

  // setup the handler to run the regex when the user edits something
  var run = (function () {
    var cache = '';
    return function () {
      var expression = $('#regex').val();
      var input = $('#regex_input').val();
      var options = $('#regex_options').val();
      var $code = $('#regex_code');

      if (!expression || !input) {
        $code.hide();
        showIntro();
        return;
      }

      if (cache === input + expression + options) {
        return;
      }
      cache = input + expression + options;

      $code.text('/' + expression + '/' + options).show();

      snd_xplore.regex({
        expression: expression,
        input:      input,
        options:    options,
        target:     $('#target').val()
      });
    };
  })();

  return {
    run: run,
    isDirty: isDirty
  };
})();


/*************************************
              TABLES
**************************************/

var snd_xplore_table_util = (function () {

  var api = {
    tables: {},
    current: ''
  };

  function loadTables() {
    $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getTables',
      dataType: 'json'
    }).
    done(function (data) {
      api.tables = data.result;
    }).
    fail(function () {
      snd_log('Error: loadTables failed.');
    });
  }
  api.loadTables = loadTables;

  function getTableHierarchy(table, search_labels) {
    loading(true);
    api.current = table;
    api.term = ((table.indexOf('>') === 0 || table.indexOf('=') === 0) ? table.substr(1) : table).toLowerCase();

    $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getTableHierarchy' +
            '&table=' + table +
            '&search_labels=' + (search_labels ? '1' : '0'),
      dataType: 'json'
    }).
    done(function (data) {
      var result = data.result;
      var $target = $('#table_hierarchy_result').empty();

      if (data.$success === false) {
        $target.append('<div class="alert alert-danger"><strong>' + data.$error + '</strong></div>');
        loading(false);
        return;
      }

      function isMatch(text) {
        return text ? text.toLowerCase().indexOf(api.term) > -1 : false;
      }

      function sortByLabel(dbo) {
        dbo.sort(function (a, b) {
          if (a.label > b.label) return 1;
          if (b.label > a.label) return -1;
          return 0;
        });
      }

      function generateHtml(dbo) {
        var match_label = isMatch(dbo.label),
            match_name  = isMatch(dbo.name),
            text_class = match_label || match_name ? 'primary' : 'muted',
            anchor,
            html;

        if (api.term != '*') {
          html = '<li class="text-' + text_class + '">';
          if (match_label) {
            html += dbo.label.replace(new RegExp('(' + api.term + ')', 'i'), '<span class="bg-success">$1</span>');
          } else {
            html += dbo.label;
          }
        } else {
          html = '<li>' + dbo.label;
        }

        if (match_name) {
          anchor = dbo.name.replace(api.term, '<span class="bg-success">' + api.term + '</span>');
        } else {
          anchor = dbo.name;
        }
        html += ' [<a href="#show" data-show="=' + dbo.name + '" class="text-' + text_class + '">' + anchor + '</a>]';

        html += ' <a href="' + dbo.name + '_list.do" target="_blank" title="Open list"><i class="glyphicon glyphicon-list-alt" /></a>';
        html += ' <a href="' + dbo.name + '.do" target="_blank" title="Open form"><i class="glyphicon glyphicon-open-file" /></a>';
        html += ' <a href="sys_db_object.do?sys_id=' + dbo.sys_id + '" target="_blank" title="Open table definition"><i class="glyphicon glyphicon-cog" /></a>';
        if (dbo.children.length) {
          html += '<ul>';
          sortByLabel(dbo.children);
          $.each(dbo.children, function (i, childDbo) {
            html += generateHtml(childDbo);
          });
          html += '</ul>';
        }
        html += '</li>';
        return html;
      }

      if (result.length) {
        sortByLabel(result);
        $.each(result, function (i, dbo) {
          $target.append('<ul>' + generateHtml(dbo) + '</ul>');
        });
      } else {
        $target.append('<div class="alert alert-danger"><strong>No table information found.</strong></div>');
      }
      loading(false);
    }).
    fail(function () {
      loading(false);
      snd_log('Error: getTableHierarchy failed.');
    });
  }

  function loading(b) {
    if (b) {
      $('#table_hierarchy_loading').show();
      $('#table_hierarchy_result_container').fadeOut();
    } else {
      $('#table_hierarchy_result_container').fadeIn();
      $('#table_hierarchy_loading').hide();
    }
  }
  api.getTableHierarchy = getTableHierarchy;

  return api;

})();


/*************************************
           SCRIPT SEARCH
**************************************/

var snd_script_search_util = (function () {

  var api = {};
  var $list = $('#script_pane_list');
  var $script_pane_404 = $('#script_pane_404');

  function search(value) {
    var elements,
        match,
        nomatch;

    if(value) {

      value = value.toUpperCase();
      elements = $list.find('span.script-name');

      match = elements.filter(function (i, el) {
        return (el.textContent || el.innerText || "").toUpperCase().indexOf(value)>=0;
      });
      match.parent().show();

      nomatch = elements.filter(function (i, el) {
        return (el.textContent || el.innerText || "").toUpperCase().indexOf(value)==-1;
      });
      nomatch.parent().hide();

      if (!match.length) {
        $script_pane_404.show();
      }

    } else {
      $list.find("li").show();
    }
  }

  function loading(b) {
    $('#script_pane_loading').toggle(b);
  }

  api.search = (function () {
    var requested = false;
    var filter;
    return function (value) {
      filter = value;
      if (requested) return;
      loading(true);
      $script_pane_404.hide();
      if (!api.records) {
        requested = true;
        api.loadAll().done(function () {
          requested = false;
          search(filter);
          loading(false);
        });
      } else {
        search(filter);
        loading(false);
      }
    };
  })();

  api.addScript = function (sys_id, replace) {
    loading(true);
    $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getScript&sys_id=' + sys_id,
      dataType: 'json'
    }).
    done(function (data) {
      var result = data.result;
      var old = snd_xplore_editor.getValue();

      if (old) {
        if (replace != '1') {
          if (old.length > 0) old += '\n\n';
        } else if(!confirm('Warning! This will replace your code.')) {
          return;
        } else {
          old = '';
        }
      }

      snd_xplore_editor.setValue(
        old +
        '/*************************************' + '\n' +
        '  ' + result.api_name + '\n' +
        ' *************************************/' + '\n' +
        result.script);
      loading(false);

      // close the pane
      snd_xplore_ui.side_panes.closeAll();
    }).
    fail(function () {
      snd_log('Error: snd_script_search_util.addScript failed.');
      loading(false);
    });
  };

  api.loadAll = function () {
    loading(true);
    return $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getScripts',
      dataType: 'json'
    }).
    done(function (data) {
      api.records = data.result;
      $list.empty();
      $.each(api.records, function (i, item) {
        var scope = item.$sys_scope == 'Global' ? '' : ' (' + item.$sys_scope + ')';
        $list.append($('<li>' +
          '<span class="script-link script-name" data-sys-id="' + item.sys_id + '">' +
          item.name + scope + '</span> ' +
          '<span class="script-link script-replace pull-right" data-sys-id="' + item.sys_id + '" ' +
          'data-replace="1">' +
          'replace</span>' +
          '</li>'));
      });
      loading(false);
    }).
    fail(function () {
      snd_log('Error: snd_script_search_util.loadAll failed.');
      loading(false);
    });
  };

  // handle script search
  $('#script_pane_search')
  .change(function () {
    snd_script_search_util.search($(this).val());
    return false;
  })
  .keyup(function () {
    $(this).change();
  });

  $('#script_pane_list').on('click', 'span.script-link', function (e) {
    var $anchor = $(this);
    if (!$anchor.attr('data-sys-id')) {
      snd_log('Error: script link does not have sys_id attribute');
    } else {
      snd_script_search_util.addScript($anchor.attr('data-sys-id'), $anchor.attr('data-replace'));
    }
  });

  $('#side_controls a[data-pane="script_pane"]').one('click', function () {
    api.loadAll();
  });

  $('#scripts_refresh').click(function () {
    $list.empty();
    api.loadAll().done(function () {
      var search = $('#script_pane_search').val();
      if (search) {
        snd_script_search_util.search(search);
      }
    });
  });

  return api;
})();


/*************************************
           SCRIPT HISTORY
**************************************/

var snd_script_history_util = (function () {
  var api = {};
  var $list = $('#script_history');

  function loading(b) {
    $('#script_history_loading').toggle(b);
  }

  function maxLines(str, max_lines) {
    var result = '';
    var lines = str.split('\n');
    max_lines = max_lines < lines.length ? max_lines : lines.length;
    for (var i = 0; i < max_lines; i++) {
      if (i) result += '\n';
      if (lines[i].length > 80) {
        lines[i] = lines[i].substr(0, 80) + '...';
      }
      result += lines[i];
    }
    if (i < lines.length) result += '\n...';
    return result;
  }

  var escapeHtml = (function () {
    var entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': '&quot;',
      "'": '&#39;',
      "/": '&#x2F;'
    };
    return function (string) {
      return String(string).replace(/[&<>"'/]/g, function (s) {
        return entityMap[s];
      });
    };
  })();

  api.loadScript = function loadScript(options) {
    snd_xplore_util.demo(options.code || '', options.user_data || '');
    if (options.hasOwnProperty('id')) snd_xplore_util.session_id = options.id;
    if (options.hasOwnProperty('user_data_type')) $('#user_data_type_select').val(options.user_data_type);
    if (options.hasOwnProperty('target')) $('#target').val(options.target).trigger('change');
    if (options.hasOwnProperty('scope')) $('#scope').val(options.scope).trigger('change');
    if (options.hasOwnProperty('no_quotes')) $('#setting_quotes').bootstrapToggle(options.no_quotes ? 'off' : 'on');
    if (options.hasOwnProperty('show_props')) $('#show_props').bootstrapToggle(options.show_props ? 'on' : 'off');
    if (options.hasOwnProperty('show_strings')) $('#show_strings').bootstrapToggle(options.show_strings ? 'on' : 'off');
    if (options.hasOwnProperty('show_html_messages')) $('#show_html_messages').bootstrapToggle(options.show_html_messages ? 'on' : 'off');
    if (options.hasOwnProperty('wrap_output_pre')) $('#wrap_output_pre').bootstrapToggle(options.wrap_output_pre ? 'on' : 'off');
    if (options.hasOwnProperty('fix_gslog')) $('#fix_gslog').bootstrapToggle(options.fix_gslog ? 'on' : 'off');
    if (options.hasOwnProperty('support_hoisting')) $('#support_hoisting').bootstrapToggle(options.support_hoisting ? 'on' : 'off');
    if (options.hasOwnProperty('debug_mode')) $('#debug_mode').bootstrapToggle(options.debug_mode ? 'on' : 'off');
  };

  api.loadAll = function () {
    loading(true);
    return $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getScriptHistory',
      dataType: 'json'
    }).
    done(function (data) {
      api.history = data.result;
      api.history_map = {};
      $list.empty();
      $.each(api.history, function (i, item) {
        api.history_map[item.id] = item;
        $list.append(
          $('<div class="list-group-item interactive" data-id="' + item.id + '" data-replace="1">' +
              '<button type="button" class="close" aria-label="Close"><span aria-hidden="true">×</span></button>' +
              '<h5 class="list-group-item-heading">' + item.name + ' (' + item.scope + ')' + '\n' +
                '<a class="small" href="?historic=' + item.id + '" target="_blank">New Tab</a> | ' +
                '<a href="javascript:void(0)" class="small copy-history-link">Copy Link</a>' +
              '</h5> ' +
              '<p class="list-group-item-text"><pre class="prettyprint linenums">' + escapeHtml(maxLines(item.code, 3)) + '</pre>' +
            '</div>'));
      });

      // Google Code-Prettify
      window.PR.prettyPrint();

      loading(false);

    }).
    fail(function () {
      snd_log('Error: snd_script_history_util.loadAll failed.');
      loading(false);
    });
  };

  api.deleteScript = function deleteScript(id) {
    loading(true);
    return $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=deleteScriptHistoryItem&id=' + id,
      dataType: 'json'
    }).
    done(function (data) {
      api.loadAll();
    }).
    fail(function () {
      snd_log('Error: snd_script_history_util.deleteScript failed.');
      loading(false);
    });
  };

  api.fetchScript = function fetchScript(id) {
    loading(true);
    return $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=fetchScriptHistoryItem&id=' + id,
      dataType: 'json'
    }).
    done(function (data) {
      if (data.result) {
        api.loadScript(data.result);
      } else if (data.$error) {
        snd_log(data.$error);
      }
      loading(false);
    }).
    fail(function () {
      snd_log('Error: snd_script_history_util.fetchScript failed.');
      loading(false);
    });
  };

  api.parseUrlSearch = function parseUrlSearch(search) {
    var match, item;

    match = search.match(/historic=([^&]+)/);
    if (match) {
      api.fetchScript(match[1]);
      return true;
    }

    match = search.match(/item=([^&]+)/);
    if (match) {
      try {
        item = JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {
        snd_log('Error: Unable to load script from URL - bad JSON');
      }
      if (item) {
        api.loadScript(item);
      } else {
        snd_xplore_util.simpleNotification('Error: Unable to load script from URL');
      }
      return true;
    }

    return false;
  };

  api.loadFromUrl = function loadFromUrl() {
    api.parseUrlSearch(window.location.search);
  };

  $list.on('click', 'div.list-group-item', function (e) {

    // prevent nested buttons from opening the script
    if ($(e.target).closest('button').length || $(e.target).closest('a').length) return;

    var $this = $(this);
    var item;
    if (!$this.attr('data-id')) {
      snd_log('Error: script link does not have an id attribute');
    } else {
      item = api.history_map[$this.attr('data-id')];
      if (item) {
        api.loadScript(item);
      } else {
        throw new Error('Unable to load empty history item.');
      }
    }
  });

  $list.on('click', 'button.close', function (e) {
    var $anchor = $(this).parent();
    var item;
    if (!confirm('Delete this script?')) return;

    if (!$anchor.attr('data-id')) {
      snd_log('Error: script link does not have an id attribute');
    } else {
      item = api.history_map[$anchor.attr('data-id')];
      if (item) {
        api.deleteScript(item.id);
      } else {
        throw new Error('Unable to delete history item.');
      }
    }
  });

  $list.on('click', 'a.copy-history-link', function (e) {
    var $anchor = $(this).parent().parent();
    var item, str;

    if (!$anchor.attr('data-id')) {
      snd_log('Error: script link does not have an id attribute');
    } else {
      item = api.history_map[$anchor.attr('data-id')];
      if (item) {
        str = JSON.stringify(item, 'target,scope,code,user_data,user_data_type,support_hoisting');
        snd_xplore_util.copyTextToClipboard('/snd_xplore.do?item=' + encodeURIComponent(str));
      } else {
        throw new Error('No item to copy.');
      }
    }
  });

  return api;
})();


/*************************************
            SIDE PANES
**************************************/

(function () {

  window.snd_xplore_ui.side_panes = {
    closeAll: function () {
      $('.side_pane').fadeOut(400);
      $('#side_controls li a[data-pane]').removeClass('active');
    }
  };

  // setup the side pane controls
  $('#side_controls li').on('click', 'a', function () {
    var $target = $(this);
    if (!$target.attr('data-pane')) return;

    $('#side_controls li a').each(function () {
      var $this = $(this);
      var pane = $this.attr('data-pane');
      if (!pane) return;
      var $pane = $('#' + pane);

      if (this === $target.get(0)) {
        var workbenchLeft = $('#side_controls').outerWidth();
        if (!$pane.is(':visible')) {
          //workbenchLeft += $pane.outerWidth();
          //$('#workbench').animate({left: workbenchLeft}, 400, function () {
            $pane.fadeIn(400);
            //resizeUtil.resizeOutputContent();
          //});
        } else {
          $pane.fadeOut(400);//, function () {
            //$('#workbench').animate({left: workbenchLeft}, 400, function () {
              //$('#workbench').css('left', '');
              //resizeUti.resizeOutputContent()
            //});
          //});
        }
        $this.toggleClass('active');
      } else {
        $this.removeClass('active');
        $pane.hide();
      }
    });
  });

  // auto close the data panes when clicked outside
  $(document).click(function(event) {
    if(!$(event.target).closest('.side_pane').length &&
        !$(event.target).closest('#side_controls').length &&
        !$(event.target).hasClass('.side_pane')) {
      snd_xplore_ui.side_panes.closeAll();
    }
  });

})();


snd_xplore_setting_util = (function () {
  var util = {};

  util.PREFERENCE = 'xplore.settings';

  util.getSettings = function getSettings() {
    var settings = {};
    $('.xplore-setting').each(function (i, setting) {
      setting = $(setting);
      settings[setting.attr('id')] = setting.is(':checkbox') ? $(setting).is(':checked') : setting.val();
    });
    return settings;
  };

  util.save = function () {
    var settings = util.getSettings();
    snd_xplore_util.setPreference(util.PREFERENCE, JSON.stringify(settings));
  };

  util.reset = function () {
    snd_xplore_util.setPreference(util.PREFERENCE, '{}');

    $('.xplore-setting').each(function (i, setting) {
      var default_value = snd_xplore_default_settings[setting.id];
      setting = $(setting);
      if (setting.is(':checkbox')) {
        //setting.attr('checked', default_value);
        setting.bootstrapToggle(default_value ? 'on' : 'off');
      } else {
        setting.val(default_value).change();
      }
    });
  };

  return util;
})();


/*************************************
              INIT
**************************************/

$(function () {

  // update the selector for the frames
  (function () {
    var frames,
        target,
        name,
        i;
    if (window.opener) {
      frames = window.opener.frames;
      target = $('#target');
      target.append('<option value="opener">Opener</option>');
      for (i = 0; frames.length > i; i++) {
        try {
          name = frames[i].name;
        } catch (e) {} // ignore cross-origin frame SecurityErrors
        if (!name) continue;
        target.append('<option value="frame_' + i + '">Opener: ' + name + '</option>');
      }
    }
  })();

  // Populate the scope selector
  $(function () {
    var $scope = $('#scope');
    $scope.empty();
    $scope.append($('<option class="text-italic text-muted">Loading</option>'));

    $.ajax({
      type: 'GET',
      url: '/snd_xplore.do?action=getScopes',
      dataType: 'json'
    }).
    done(function (data) {
        $scope.empty();
        $.each(data.result, function (i, item) {
          $scope.append($('<option value="' + item.scope + '">' + item.name + '</option>'));
        });
    }).
    fail(function () {
      snd_log('Error: populateScopes failed.');
    });
  });

  window.snd_xplore_editor = CodeMirror.fromTextArea(document.getElementById("snd_xplore"), {
    lineNumbers: true,
    lineWrapping: true,
    tabSize: parseInt($('#setting_editor_tab_size').val(), 10),
    indentUnit: parseInt($('#setting_editor_tab_size').val(), 10),
    smartIndent: true,
    matchBrackets: true,
    mode: 'javascript',
    keyMap: 'sublime',
    extraKeys: {
      'Ctrl-Enter': function (instance) {
        snd_xplore_util.executeNew();
      },
      'Ctrl-S': function (instance) {
        if ($('#setting_save_shortcut').is(':checked')) {
          snd_xplore_util.executeNew();
        }
      },
      'Ctrl-Alt-F': function (instance) {
        snd_xplore_util.beautify();
      }
    }
  });

  window.snd_xplore_editor.on('change', function () {
    snd_xplore_util.is_dirty = true;
  });

  $('#user_data_input').on('keyup', function () {
    snd_xplore_util.is_dirty = true;
  });

  var sxr = snd_xplore_reporter;
  sxr.initialize();
  sxr.addEvent('start', function () {
    snd_xplore_util.loading();
    disableFilteredLogMenu();
  });
  sxr.addEvent('done', function (result) {
    snd_xplore_util.loadingComplete(result);
    if (snd_xplore_util.start_time && snd_xplore_util.end_time) {
      enableFilteredLogMenu();
    }
  });
  sxr.addEvent('click.interactive-result', snd_xplore_util.execute);
  sxr.addEvent('click.breadcrumb', snd_xplore_util.execute);

  $(document).ready(function () {
    $('#target').select2();

    // The width appears to be set by option values which means it's too narrow
    // so we need to override width to our "max width" here instead.
    $('#scope').select2({width: '350px'});
  });

  // handle the run button clicking
  $('#xplore_btn').click(function () {
    snd_xplore_util.executeNew();
  });

  // handle the cancel button clicking
  $('#cancel_btn').click(function () {
    snd_xplore_util.cancel();
  });

  // handle the format button clicking
  $('#format_btn').click(function () {
    snd_xplore_util.beautify();
  });

  // reload the script history when a user clicks the info tab
  $('#info_pane_tab').click(function () {
    snd_script_history_util.loadAll();
  });

  // Setup property toggles
  var current_theme = $('#setting_theme').val();
  function updateTheme(theme, preview) {
    theme = theme || $('#setting_theme').val();
    $('body').removeClass('xplore-s-' + current_theme).addClass('xplore-s-' + theme);
    snd_xplore_editor.setOption('theme', theme);
    current_theme = theme;
  }
  snd_xplore_editor.setOption('theme', current_theme);

  // select2 only works when visible so we run it when the modal opens
  $('#modal_settings').on('shown.bs.modal', function () {
    $('#setting_theme').select2({
      dropdownParent: $('#modal_settings')
    })
    .on('select2:close', function (e) {
      updateTheme(null, true); // reset the theme from preview
    })
    .on('change', function (e) {
      updateTheme(); // save the theme preference
    })
    .on('select2:open', function () {
      // preview the theme as the user presses up/down
      // register the event once select2 has created the dropdown
      $('.select2-dropdown').keyup(function (e) {
        var key = e.keyCode || e.which;
        if (key == 38 || key == 40) { // up or down key
          updateTheme($('.select2-results__option.select2-results__option--highlighted').text(), true);
        }
      });
    });
  });

  $('#setting_quotes,#show_props,#show_strings').
    bootstrapToggle({
      on: 'Show',
      off: 'Hide',
      size: 'mini',
      onstyle: 'success',
      offstyle: 'danger',
      width: 75
    });
  $('#setting_save_shortcut').
    bootstrapToggle({
      on: 'On',
      off: 'Off',
      onstyle: 'success',
      offstyle: 'danger',
      size: 'mini',
      width: 75
    });
  $('#show_html_messages').
    bootstrapToggle({
      on: 'HTML',
      off: 'Text',
      onstyle: 'success',
      offstyle: 'warning',
      size: 'mini',
      width: 75
    });
  $('#wrap_output_pre').
    bootstrapToggle({
      on: 'Wrap',
      off: 'No wrap',
      onstyle: 'success',
      offstyle: 'warning',
      size: 'mini',
      width: 75
    }).change(function () {
      if (this.checked) {
        $('#script_output').addClass('wrap-pre');
      } else {
        $('#script_output').removeClass('wrap-pre');
      }
    });
  $('#fix_gslog').
    bootstrapToggle({
      on: 'Replace',
      off: 'Ignore',
      onstyle: 'success',
      offstyle: 'warning',
      size: 'mini',
      width: 75
    });
  $('#support_hoisting').
    bootstrapToggle({
      on: 'On',
      off: 'Off',
      onstyle: 'warning',
      offstyle: 'success',
      size: 'mini',
      width: 75
    });
  $('#debug_mode').
    bootstrapToggle({
      on: 'On',
      off: 'Off',
      onstyle: 'success',
      offstyle: 'default',
      size: 'mini',
      width: 75
    });

  $('#setting_editor_width').change(function () {
    var el = $('#setting_editor_width');
    var width = parseInt(el.val() || 40);
    if (width < 10) width = 10;
    if (width > 90) width = 90;
    el.val(width + '%');
    resizeUtil.setEditorWidthFromSettings();
    resizeUtil.resize();
  });

  $('#setting_editor_tab_size').change(function () {
    var el = $('#setting_editor_tab_size');
    var size = parseInt(el.val() || 40);
    snd_xplore_editor.setOption('tabSize', size);
    snd_xplore_editor.setOption('indentUnit', size);
  });

  $('#save_settings').click(function () {
    snd_xplore_setting_util.save();
  });

  $('#reset_settings').click(function () {
    snd_xplore_setting_util.reset();
  });

  // set default to wrapped
  if ($('#wrap_output_pre:checked')) {
    $('#script_output').addClass('wrap-pre');
  }

  // regex input trigger
  $('#regex,#regex_options,#regex_input').on('keyup', function () {
    delay('testRegex', snd_xplore_regex_util.run, 700);
  });

  // table input trigger
  $('#table_hierarchy_form').on('submit', function (e) {
    e.preventDefault();

    var table = $('#table_hierarchy_table').blur().val();
    var search_labels = $('#table_hierarchy_table_do_label').is(':checked');
    //if (!table) return;
    //delay('tableHierarchy', function () {
      snd_xplore_table_util.getTableHierarchy(table, search_labels);
    //}, 700);
  });

  // table hierarchy link trigger
  $('#table_hierarchy_result').on('click', 'a', function (e) {
    var $this = $(this);
    var table;
    table = $this.attr('data-show');
    if (table) {
      e.preventDefault();
      $('#table_hierarchy_table').val(table);
      snd_xplore_table_util.getTableHierarchy(table);
    }
  });

  // setup the editor toggle button
  $('#editor_toggle').on('click', function () {
    snd_xplore_util.toggleEditor();
  });

  // Execute the script again when the breadcrumb is reset
  $('#clearBreadcrumb').on('click', function () {
    snd_xplore_util.executeNew();
  });

  // Dirty form detection
  $(window).bind('beforeunload', function() {
    if (snd_xplore_ui.isDirty()) {
      return 'There are unsaved changes on this page. Do you want to leave?';
    }
  });

  var resizeUtil = {
    setEditorWidthFromSettings: function () {
      var width = parseInt($('#setting_editor_width').val() || 40); // default is 40% width
      if (width > 90) width = 90;
      if (width < 10) width = 10;
      $('#editor').css('width', width + '%');
      $('#output').css('left', width + '%');
    },

    calcEditorRatio: function (store) {
      var ratio = $('#editor').width() / $('#workbench').width();
      if (store) {
        resizeUtil.editorRatio = ratio;
      }
      return ratio;
    },
    editorRatio: 0,

    calcWorkbenchWidth: function (store) {
      var width = $('#workbench').width();
      if (store) {
        resizeUtil.workbenchWidth = width;
      }
      return width;
    },
    workbenchWidth: 0,

    resize: function () {
      // need to see if we are changing the window size or just the editor width
      // we do this by checking if the workbench width has changed
      if (resizeUtil.workbenchWidth != resizeUtil.calcWorkbenchWidth(true)) {
        var newWidth = $('#workbench').width() * resizeUtil.editorRatio;
        var $editor = $('#editor');
        $editor.css('width', newWidth);
        if ($editor.is(':visible')) {
          $('#output').css('left', newWidth);
        }
      }

      resizeUtil.resizeLogPane();
      resizeUtil.resizeOutputContent();
      resizeUtil.resizeUserData();
      resizeUtil.resizeWrapper();
    },

    // facilitate system log frame resizing
    resizeLogPane: function resizeLogPane() {
      var $output_content = $('#output_content');
      var $output_tabs = $('#output_tabs');
      var h = $output_content.height() - $output_tabs.height() - 10;
      $('#log_frame,#node_log_frame').css('height', h);
    },

    // update the output pane so the tabs can stack and be seen
    resizeOutputContent: function resizeOutputContent() {
      $output_tabs_pane.css('top', $('#output_tabs').outerHeight() + 'px');
    },

    resizeUserData: function resizeUserData() {
      var $user_data_pane = $('#user_data_pane');
      var user_data_input = $('#user_data_input').get(0);
      var remaining_space;

      user_data_input.style.height = '';
      remaining_space = $output_tabs_pane.height() - $user_data_pane.height();

      if (remaining_space > 10) {
        user_data_input.style.height = (remaining_space - 10) + 'px';
      }
    },

    // Adjust the "top" attribute of the "wrapper" div accordingly to the header
    resizeWrapper: function resizeWrapper() {
      document.getElementById("wrapper").style.top = document.getElementById("navbar").parentElement.offsetHeight + "px";
    }

  };
  resizeUtil.setEditorWidthFromSettings();
  resizeUtil.calcEditorRatio(true);
  resizeUtil.calcWorkbenchWidth(true);

  // make the code mirror editor resizable
  $('#editor').resizable({
    containment: 'parent',
    handles: {'e': '.ui-resizable-e'},
    minWidth: 100,
    resize: function (e, ui) {
       $('#output').css('left', ui.size.width + 'px');
       resizeUtil.calcEditorRatio(true);
    }
  });

  // set the width of the editor and output so they are pixels instead of percents
  // this is so the editor looks right when the side-pane is shown/hidden
  (function () {
    var $output = $('#output');
    var $editor = $('#editor');
    var editorWidth = $editor.outerWidth();
    $output.css('left', editorWidth);
    $editor.css('width', editorWidth);
  })();

  // Setup the onChange handler for hiding scope select
  // when the target is not the client.
  $('#target').on('change', function () {
    // use parent to capture Select2
    if (this.value == 'server') {
      $('#scope').parent().fadeIn();
    } else {
      $('#scope').parent().fadeOut();
    }
  });

  // make tabs clickable
  $('#output_tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#user_data_format_btn').click(function () {
    snd_xplore_util.formatString();
  });

  var $output_tabs_pane = $('#output_tabs_pane');
  var active_log_frame = '';
  var default_node_log_url = '/ui_page_process.do?name=log_file_browser&max_rows=2000';

  function getQueryDate(date, time) {
    if (time) {
      date = date + '\',\'' + time;
    } else {
      date = date.split(' ').join('\',\'');
    }
    return 'javascript:gs.dateGenerate(\'' + date + '\')';
  }

  function getCreatedQuery(element) {
    if (element.id.indexOf('filtered') === 0 && snd_xplore_util.start_time && snd_xplore_util.end_time) {
      return encodeURIComponent('sys_created_on>=' + getQueryDate(snd_xplore_util.start_time) + '^sys_created_on<=' + getQueryDate(snd_xplore_util.end_time));
    }
    return 'sys_created_onONToday%40javascript%3Ags.daysAgoStart(0)%40javascript%3Ags.daysAgoEnd(0)';
  }

  function enableFilteredLogMenu() {
    $('#filtered_log_menu_header, #filtered_log_menu_divider, #log_menu a[id^="filtered"]').show();
  }

  function disableFilteredLogMenu() {
    $('#filtered_log_menu_header, #filtered_log_menu_divider, #log_menu a[id^="filtered"]').hide();
  }
  disableFilteredLogMenu(); // prevent links when the page loads

  function updateLogFrame(src) {
    $('#log_frame').attr('src', src);
    active_log_frame = 'system';
  }

  $('#system_log_tab,#filtered_system_log_tab').click(function () {
    updateLogFrame('/syslog_list.do?sysparm_view=&sysparm_query=' + getCreatedQuery(this));
  });
  $('#app_log_tab,#filtered_app_log_tab').click(function () {
    updateLogFrame('/syslog_app_scope_list.do?sysparm_view=&sysparm_query=' + getCreatedQuery(this));
  });
  $('#email_log_tab,#filtered_email_log_tab').click(function () {
    updateLogFrame('/sys_email_list.do?sysparm_view=&sysparm_query=' + getCreatedQuery(this));
  });
  $('#event_log_tab,#filtered_event_log_tab').click(function () {
    updateLogFrame('/sysevent_list.do?sysparm_view=&sysparm_query=' + getCreatedQuery(this));
  });
  $('#request_log_tab,#filtered_request_log_tab').click(function () {
    updateLogFrame('/sys_outbound_http_log_list.do?sysparm_view=&sysparm_query=' + getCreatedQuery(this));
  });
  $('#node_log_tab,#filtered_node_log_tab').click(function () {
    var new_url;

    active_log_frame = 'node';
    if (this.id.indexOf('filtered') === 0) {
      new_url = $('#node_log_url').val();
    }

    // we don't want to refresh the iframe if it's the same URL
    if (node_log_url !== new_url) {
      node_log_url = new_url || default_node_log_url;
      $('#node_log_frame').attr('src', node_log_url);
    }
  });
  $('#log_reset').click(function () {
    var $frame = $('#' + active_log_frame + '_log_frame');
    if ($frame.length) {
      $frame.attr('src', $frame.attr('src'));
    }
    $('#' + active_log_frame + '_log_tab').click(); // select the tab
  });

  $('#copy_results').click(function () {
    var show_more_links = $('button.show-more');
    var hidden_rows = $('.data-more');
    show_more_links.hide();
    hidden_rows.attr('data-hidden', function (el) {
      return $(el).hasClass('hidden') ? 'true' : 'false';
    });
    hidden_rows.removeClass('hidden');
    snd_xplore_util.copyElementToClipboard($('#results_table').get(0));
    show_more_links.show();
    hidden_rows.each(function (i, el) {
      el = $(el);
      if (el.attr('data-hidden') == 'true') {
        el.addClass('hidden');
      }
    });
    snd_xplore_util.simpleNotification('Results copied to clipboard');
  });

  resizeUtil.resizeLogPane();
  resizeUtil.resizeOutputContent();
  resizeUtil.resizeUserData();
  resizeUtil.resizeWrapper();

  // resize the view when the window resizes
  $(window).resize(function () {
    resizeUtil.resize();
  });

  // Checkboxes will only be reset with a delay after duplicating a tab in Chrome
  setTimeout(function () {

    // Address Chrome duplicate tab bug which makes checkboxes selected even when they weren't
    $.each(snd_xplore_default_settings, function (name, value) {
      if (typeof value === 'boolean') {
        $('#' + name).bootstrapToggle(value ? 'on' : 'off');
      }
    });

    snd_script_history_util.loadAll();

    snd_xplore_editor.focus();
    $('#window_loader').removeClass('active');

    snd_script_history_util.loadFromUrl();
  }, 10);

});