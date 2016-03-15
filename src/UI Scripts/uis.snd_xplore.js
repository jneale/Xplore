/* -----------------------------------------------------
                        XPLORE
------------------------------------------------------*/
var snd_xplore = (function () {

  function run(params) {
    // summary:
    //   Run some code and send the results to the reporter
    // params: Object
    //   An instruction object

    var reporter = params.reporter || defaultReporter();

    reporter.start(params);

    if (!params.code) {
      var result = psuedoResult();
      message(result, 'error', 'Expression required.');
      reporter.done(result);
      return;
    }

    if (params.runAt == "server") {
      runServerCode(params);
    } else {
      runClientCode(params);
    }
  }

  function runClientCode(params) {
    // summary:
    //   Run the script in the client and get the results
    // params: Object
    //   An instruction object

    var result = psuedoResult();
    var target = findTarget(params.runAt);

    // spoof ServiceNow's jslog function
    var _jslog = target.jslog;
    target.jslog = function(msg, src) {
      var d = new Date();
      var timestamp =
        ('0' + d.getHours()).substr(-2) + ':' +
        ('0' + d.getMinutes()).substr(-2) + ':' +
        ('0' + d.getSeconds()).substr(-2) + '.' +
        d.getMilliseconds();
      if (src) {
        msg = timestamp + ': [' + src + '] ' + msg;
      } else {
        msg = timestamp + ': ' + msg;
      }
      message(result, 'log', msg);
    };

    var getType = (function () {
      var toStr = Object.prototype.toString;
      return function (o) {
        var type = toStr.call(o).split(' ').pop();
        return type.substr(0, type.length - 1);
      };
    }());

    if (target) {
      try {
        window.user_data = params.user_data;
        var eResult = target.eval(params.code);

        if (params.breadcrumb) {
          eResult = dotwalk(eResult, params.breadcrumb);
        }

        result.type = getType(eResult);
        result.string = '' + eResult;

        if (params.show_props) {
          for (var x in eResult) {
            result.report.push({
              name: x,
              type: getType(eResult[x]),
              string: params.show_strings ? '' + eResult[x] : '[user ignored]'
            });
          }
        }

      } catch (e) {
        message(result, 'error', e);
      }
    }

    target.jslog = _jslog;
    params.reporter.done(result);

    function dotwalk(obj, path) {
      // summary:
      //   Dotwalk a path on an object

      var pathArr = path.split('.');
      var o = obj;
      for (var i = 0; i < pathArr.length; i++) {
        path = pathArr[i];
        if (path.indexOf('()') > 0) {
          o = o[path.substr(0, path.length - 2)]();
        } else {
          o = o[path];
        }
      }
      return o;
    }

    function findTarget(runAt) {
      // summary:
      //   Get the client target window for the code
      // runAt: string
      //   The target window: 'opener' or 'frame_{n}'
      //   Leave empty or set false for the standard window
      // return the target window

      var target;
      if (typeof runAt === 'string' && (runAt == 'opener' || runAt.indexOf('frame_') === 0)) {
        if (!window.opener) {
          message(result, 'error', 'Cannot evaluate in parent; no opener found.');
        } else if (runAt == 'opener') {
          target = window.opener;
        } else {
          var i = parseInt(runAt.split('_')[1], 10);
          target = window.opener.frames.length >= i ? window.opener.frames[i] : false;
          if (!target) {
            message(result, 'error', 'Invalid frame index. Frame ' + i + ' not found.');
          }
        }
      } else {
        target = window;
      }
      return target;
    }
  }

  function runServerCode(params) {
    // summary:
    //   Perform an ajax call to our processor to run the script and get results
    // code: string
    // breadcrumb: array

    $.ajax({
      type: "POST",
      url: "/snd_xplore.do?action=run",
      data: {
        data: JSON.stringify({
          code: params.code,
          user_data: params.user_data,
          breadcrumb: params.breadcrumb,
          scope: $('#scope').val(),
          show_props: params.show_props,
          show_strings: params.show_strings
        })
      },
      dataType: "json"
    })
    .done(function (result) {
      if (!result) {
        result = psuedoResult();
        message(result, 'error', 'The server did not return a result. This is likely because' +
            ' of an uncatchable error. Please check the node logs for the possibility' +
            ' of further information if you are unsure of the cause.');
        enrichWithLogs(result);
      } else {
        params.reporter.done(result);
      }
    })
    .fail(function (xhr) {
      $.ajax({
        type: 'GET',
        url: '/snd_xplore.do?action=logs',
        dataType: 'json'
      })
      .done(function (result) {
        if (xhr.responseText) {
          message(result, '1', xhr.responseText); // 1 = warning
        } else {
          message(result, 'error', 'Request failed.');
        }
        params.reporter.done(result);
      })
      .fail(function () {
        var result = psuedoResult();
        message(result, 'error', 'Server execution failed. The node logs may or may not be helpful.');
        if (xhr.responseText) message(result, '1', xhr.responseText); // 1 = warning
        params.reporter.done(result);
      });
    });
  }

  function psuedoResult() {
    // summary:
    //   Replicate the result object returned by the server

    return {
      type: '',
      string: '',
      report: [],
      messages: []
    };
  }

  function message(result, type, value) {
    // summary:
    //   Write a message to the result object
    // type: string
    // value: string

    result.messages.push({
      t: '' + type,
      v: '' + value
    });
  }

  function defaultReporter() {
    return {
      start: function () {
        // summary:
        //   called when the code evaluation begins

        snd_log('Begin Xplore default reporter.');
      },
      done: function (result) {
        // summary:
        //   called when the code evaluation is complete

        snd_log('Xplore complete.', result);
      }
    };
  }

  return run;

})();

/* -----------------------------------------------------
                        LOG
------------------------------------------------------*/

/**
  summary:
    Ensure that the snd_log function is created. Used to ensures that scripts
    do not break when console isn't available.
  arguments: mixed
    All arguments are printed to the log (when console is available)
**/
if (typeof window.snd_log !== 'function') {
  window.snd_log = (function () {
    if (typeof console == 'object' && typeof console.log == 'function') {
      return function () {
        for (var i = 0; i < arguments.length; i++) console.log(arguments[i]);
      };
    }
    return function () {};
  })();
}

/* -----------------------------------------------------
                        REGEX
------------------------------------------------------*/
snd_xplore.regex = (function () {

  /**
    summary:
      The main function for evaluating the regex call.
    returns: type
  **/
  function testRegex(config) {
    testRegex.fireEvent('start');

    var expression = config.expression;
    var options = config.options;
    var input = config.input;

    if (config.target == 'server') {
      testServerRegex(input, expression, options);
    } else {
      testClientRegex(input, expression, options);
    }
  }

  /**
    summary:
      Display the results on screen
    result: Object
      See resultGenerator()
  **/
  function displayRegexResult(result) {
    var data = {};
    if (result) {
      if (result.error) {
        data.error = result.error;
      } else if (!result.error && !result.matches.length) {
        data.error = 'No match.';
      } else {
          data = processResult(result);
      }
    } else {
      data.error = 'ParseError: No regex result to process.';
    }
    testRegex.fireEvent('done', this, [data]);
  }

  /**
    summary:
      Process a regex result and display it on screen
    result: Object
      An object containing:
      matches: Array [Object]
        Collection of match objects each with an index and length
      groups: Array [String]
        Collection of groups that were matched
      input:
        The original input
  **/
  function processResult(result) {
    var input = result.input,
        ret = {
          matches: [],
          groups: result.groups || []
        };

    function addMatch(text, type) {
      ret.matches.push({
        text: text,
        type: type || ''
      });
    }

    if (result.matches.length) {
      var lastEnd = 0;
      $.each(result.matches, function (i, item) {
        addMatch(input.substr(lastEnd, item.index - lastEnd));
        addMatch(input.substr(item.index, item.length), 'match');
        lastEnd = item.index + item.length;
      });
      addMatch(input.substr(lastEnd));
    }

    return ret;
  }

  /**
    summary:
      Evaluate a regular expression against a string
    input: String
      The string to test with the regex.
    expression: String
      The regular expression as a string
    options: String (Optional)
      The regular exression options, e.g. 'g'
    returns: Object
  **/
  function evalRegex(input, expression, options) {
    var regex,
        matches = [],
        groups = [],
        m,
        loop = options ? options.toString().indexOf('g') >= 0: false;

    if (input && expression) {
      options += '';
      try {
        regex = new RegExp(expression, options);
      } catch (e) {
        return {
          error: '' + e
        };
      }
      while ((m = regex.exec(input))) {
        matches.push({
          index: m.index,
          length: m[0].length
        });
        groups.push(m.slice(1));
        if (!loop) break;
      }
    }
    return {
      matches: matches,
      groups: groups,
      input: input
    };
  }

  function testClientRegex(input, expression, options) {
    try {
      var result = evalRegex(input, expression, options);
      displayRegexResult(result);
    } catch (e) {
      var estr = '' + e;
      var index = estr.indexOf(input);
      if (index >= 0) {
        estr = estr.substr(index + input.length + 4);
      }
      error(estr);
    }
  }

  function error(text) {
    testRegex.fireEvent('done', this, [{error: text}]);
  }

  var testServerRegex = (function () {
    var xhr;
    return function testServerRegex(input, expression, options) {
      if (xhr && xhr.readyState != 4) {
        xhr.abort();
      }
      xhr = $.ajax({
        type: "POST",
        url: "/snd_xplore.do?action=regex",
        data: {
          data: JSON.stringify({
            input: input,
            expression: expression,
            options: options
          })
        },
        dataType: "json"
      }).
      done(function (result) {
        displayRegexResult(result);
      }).
      fail(function (xhr, status) {
        if (status != 'abort') {
          snd_log('Server regex call failed.');
        }
      });
    };
  })();

  var events = {};

  testRegex.addEvent = function (name, fn) {
    if (typeof events[name] !== 'object') {
      events[name] = [];
    }
    events[name].push(fn);
  };

  testRegex.fireEvent = function (name, scope, args) {
    var eventArr = typeof events[name] === 'object' ? events[name] : null;
    if (!eventArr) return;
    for (var i = 0; i < eventArr.length; i++) {
      if (typeof eventArr[i] === 'function') {
        eventArr[i].apply(scope || this, args);
      }
    }
  };

  return testRegex;
})();