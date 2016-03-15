var snd_xplore_reporter = (function () {

  var showMoreButton = '<button class="btn btn-xs btn-warning show-more" ' +
      'data-show-more="false">Show</button>';

  function setDescription(table, result) {
    var type = result.type ? result.type : '[UNKNOWN]';
    table.empty().
    append('<tr><th class="col-md-1">Type</th><td class="col-md-11">' + type +
        '</td></tr>');
    if (!result.string) result.string = "";
    if (result.string.length < 100) {
      table.append('<tr><th class="col-md-1">String</th><td class="col-md-11">' +
          showAsString(lineBreaks(escapeHtml(result.string))) + '</td></tr>');
    } else {
      table.append('<tr><th class="col-md-1">String</th><td class="col-md-11">' +
          showMoreButton + '</td></tr>');
      table.append('<tr class="data-more hidden"><td colspan="2">' +
          '<pre class="prettyPrint lang-js linenums">' + escapeHtml(result.string) +
          '</pre></td></tr>');
    }
  }

  function setResults(table, result) {
    table.prepend('<tr>' +
        '<th class="col-md-3">Name</th>' +
        '<th class="col-md-3">Type</th>' +
        '<th class="col-md-6">String</th></tr>');
    $.each(result, function (i, item) {
      var prop = '<a href="javascript:void(0)" class="interactive">' + item.name + '</a>';
      if (item.type.toLowerCase() === 'function') {
        prop += ' <a href="javascript:void(0)" class="interactive"><span class="hidden">' +
            item.name + '</span>()</a>';
      }
      if (!item.string) item.string = "";
      if (item.string.length < 100 && (item.type.toLowerCase() != 'function' ||
          !item.string.length ||
          item.string.substr(0,8) != 'function')) {
        table.append('<tr class="data-row">' +
          '<td class="col-md-3 prop">' + prop + '</td>' +
          '<td class="col-md-3 type">' + item.type + '</td>' +
          '<td class="classol-md-6 str">' + showAsString(escapeHtml(item.string)) + '</td>' +
        '</tr>');
      } else {
        table.append('<tr class="data-row">' +
          '<td class="col-md-3 prop">' + prop + '</td>' +
          '<td class="col-md-3 type">' + item.type + '</td>' +
          '<td class="col-md-6">' + showMoreButton + '</td>' +
        '</tr>');
        table.append('<tr class="data-more hidden">' +
          '<td colspan="3" class="str"><pre>' + escapeHtml(item.string) + '</pre></td>' +
        '</tr>');
      }
    });
  }

  function displayResults(result, options) {

    displayOutputMessages(result.messages, options.html_messages);

    displayLogs(result.logs);

    setDescription($('#description_table'), result);

    var resultTable = $('#results_table');
    resultTable.empty().append('<tr id="no_props" class="hidden"><td colspan="3">' +
        'No properties to display.</td></tr>');

    result.report.sort(function (a, b) {
      var ai = parseInt(a.name, 10);
      var bi = parseInt(b.name, 10);
      if (ai > bi) return 1;
      if (bi > ai) return -1;
      if (a.name > b.name) return 1;
      if (b.name > a.name) return -1;
      return 0;
    });

    if (result.report.length) {
      setResults(resultTable, result.report);
    } else {
      $('#no_props').removeClass('hidden');
    }

    showTypes();

    $('#result_container').toggleClass('hidden', !(result.type || result.report.length));
  }

  function displayOutputMessages(messages, asHtml) {
    var target = $('#message_table'),
        classMap = {
          'info': 'info',
          'error': 'danger',
          'access': 'warning',
          'log': 'log',
          '-1': 'log',
          '0': 'info',
          '1': 'warning',
          '2': 'danger'
        },
        temp;

    target.empty();
    if (!messages) {
      return;
    }
    for (var i = 0, m; i < messages.length; i++) {
      m = messages[i];
      temp = m.v.toString();
      if (!asHtml) {
        temp = escapeHtml(temp);
      }
      target.append('<tr><td class="' + classMap[m.t] + '">' +
          temp.replace('\n', '<br>') + '</td></tr>');
    }
    $('#message_container').toggleClass('hidden', !i);
  }

  function htmlPre(text) {
    return text.replace(/\n(\s*)/g, function (a, b) {
      return '<br />' + new Array(b.length + 1).join('&nbsp;');
    });
  }

  function displayLogs(logs) {
    var table = $('#log_table');
    var classMap = {
      'Warning': 'warning',
      'Error': 'danger'
    };
    table.empty();
    if (!logs) {
      return;
    }

    table.prepend('<tr>' +
      '<th class="col-md-2">Level</th>' +
      '<th class="col-md-2">Date</th>' +
      '<th class="col-md-6">Value</th>' +
      '<th class="col-md-2">User</th></tr>');

    $.each(logs, function (i, log) {
      var className = classMap[log.level];
      table.append('<tr class="data-row text' + className + '">' +
          '<td class="col-md-2 ' + className + '">' + log.level + '</td>' +
          '<td class="col-md-2 ' + className + '">' + log.created + '</td>' +
          '<td class="col-md-6 ' + className + '">' + htmlPre(escapeHtml(log.message)) + '</td>' +
          '<td class="col-md-2 ' + className + '">' + log.source + '</td>' +
        '</tr>');
    });
    $('#log_container').toggleClass('hidden', !logs.length);
  }

  function showTypes() {
    var target = $('#type_control');
    var show_types = {};
    var show_all = false;

    target.empty();

    // find which checkboxes to display
    $('#results_table tr')
        .find('td.type')
        .each(function () {
          var type = $(this).text();
          if (typeof display_types[type] === 'undefined') {
            display_types[type] = true; // default to being checked
          }
          show_types[type] = display_types[type];
          show_all = true;
        });

    if (show_all) {
      target.append('<label class="checkbox-inline no_indent">' +
        '<input type="checkbox" id="show_all" value="all" checked="checked" />' +
        'All</label>');
    }

    $.each(show_types, function (type) {
      id = '' + type.replace(/\./g, '_');
      target.append('<label class="checkbox-inline no_indent">' +
        '<input type="checkbox" id="show_' + id + '" value="' + type + '" />' +
        type + '</label>');
      $('#show_' + id).prop('checked', display_types[type]);
    });

    updateResultTypes();
    updateResults();
  }

  function updateResultTypes(setAll) {
    var isShowAllChecked = true;
    var checkboxes = $('#type_control input[type=checkbox]');

    if (typeof setAll === 'undefined') {
      checkboxes.each(function (i) {
        if (!i) return; // ignore show_all at 0
        display_types[this.value] = this.checked;
        isShowAllChecked = isShowAllChecked && this.checked;
      });
      $('#show_all').prop('checked', isShowAllChecked);
    } else {
      checkboxes.each(function () {
        $(this).prop('checked', setAll);
        display_types[this.value] = setAll;
      });
    }

    checkboxes.each(function (i) {
      if (!i) return;
      $(this).parent().
        toggleClass('bg-success text-success', display_types[this.value]).
        toggleClass('bg-danger text-danger', !display_types[this.value]);
    });

  }

  function updateResults() {
    var isShowingProps = false;
    $('#results_table tr.data-row').each(function () {

      $this = $(this);
      var value = $this.find('td.type').text();
      $this.toggleClass('hidden', !display_types[value]);

      // show/hide the more info row
      var next = $this.next();
      if (next.hasClass('data-more')) {
        var state = $this.find('button.show-more').attr('data-show-more');
        next.toggleClass('hidden', !(display_types[value] && state != 'false'));
      }

      isShowingProps = isShowingProps || display_types[value];
    });
    $('#no_props').toggleClass('hidden', isShowingProps);
  }

  function showAsString(str) {
    return '&quot;<span class="text-danger">' + str + '</span>&quot;';
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
      return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
      });
    };
  })();

  function lineBreaks(text) {
    return text.toString().trim().replace(/\n/g, '<br />');
  }

  var breadcrumbs = [];
  var display_types = {};
  var events = {};

  function SndXploreReporter() {

    this.addEvent = function (name, fn) {
      if (typeof events[name] !== 'object') {
        events[name] = [];
      }
      events[name].push(fn);
    };

    this.fireEvent = function (name, scope, args) {
      var eventArr = typeof events[name] === 'object' ? events[name] : null;
      if (!eventArr) return;
      for (var i = 0; i < eventArr.length; i++) {
        if (typeof eventArr[i] === 'function') {
          eventArr[i].apply(scope || this, args);
        }
      }
    };

    this.initialize = function () {

      var sxr = this;

      $('#results_table,#description_table').on('click', '.show-more', function () {
        // summary:
        //   Handle the 'Show...' button click for a result

        var $this = $(this);
        var target = $this.parents('tr').next();
        var doHide = $this.attr('data-show-more') != 'false';

        target.toggleClass('hidden', doHide);
        $this.text(doHide ? 'Show' : 'Hide');
        $this.toggleClass('active', !doHide);
        $this.attr('data-show-more', doHide ? 'false' : 'true');

      });

      $('#results_table').on('click', 'a.interactive', function () {
        // summary:
        //   Make property names interactive so we can dive into an object


        var $breadcrumb = $('ul#breadcrumb');
        var pos = breadcrumbs.length - 1;
        var text = $(this).text();

        // make the last breadcrumb active
        if (breadcrumbs.length) {
          $breadcrumb.children().remove(':last');
          $breadcrumb.append('<li><a href="javascript:void(0)" id="breadcrumb_' +
              pos + '">' + breadcrumbs[pos] + '</a></li>');
        }

        // add the new last breadcrumb
        $breadcrumb
            .append('<li>' + text + '</li>')
            .removeClass('hidden');

        breadcrumbs.push(text);

        sxr.fireEvent('click.interactive-result', this);
      });

      $('ul#breadcrumb').on('click', 'a', function () {
        // summary:
        //   add the event handler for clicking on a breadcrumb to remove it

        var $breadcrumb = $('ul#breadcrumb');

        // remove unnecessary breadcrumb elements
        var pos = parseInt(this.id.split('_')[1], 10);
        var removeCount = breadcrumbs.length - 1 - pos;
        if (removeCount) {

          // remove all the nodes, including this one
          $breadcrumb
            .find('li:nth-last-child(-n+' + (removeCount + 1) + '):not(.permanent)')
            .remove();

          // update the breadcrumb array
          breadcrumbs = breadcrumbs.
              slice(0, $breadcrumb.children(':not(.permanent)').size() + 1);

          // re-add this node as a non-anchored breadcrumb
          if (breadcrumbs.length) {
            $breadcrumb.append('<li>' + breadcrumbs[breadcrumbs.length - 1] + '</li>');
          }

          $breadcrumb.toggleClass('hidden', !breadcrumbs.length);
          sxr.fireEvent('click.breadcrumb', this);
        }
      });

      $('#type_control').on('change', 'input[type=checkbox]', function () {
        // summary:
        //   restrict the results based on the type checkboxes that are checked

        if (this.id == 'show_all') {
          updateResultTypes(this.checked);
        } else {
          updateResultTypes();
        }

        updateResults();
      });
    };

    this.start = function (params) {
      this.options = params;
      this.fireEvent('start', null, [params]);
    };

    this.done = function (result) {
      var target = $('#results');
      target.empty();
      displayResults(result, this.options);
      this.fireEvent('done', null, [result]);
    };

    this.getBreadcrumb = function () {
      return breadcrumbs.join('.');
    };

    this.clearBreadcrumb = function () {
      breadcrumbs.length = 0;
      $('ul#breadcrumb').addClass('hidden').find('li:not(.permanent)').remove();
    };

  }

  return new SndXploreReporter();
}());
