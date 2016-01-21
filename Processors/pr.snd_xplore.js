/*
  Processor template for quickly generating a stand alone web page
  in ServiceNow. Simply put some well formed HTML in a UI Macro and it
  will be sent to the browser. You can then use the ActionProcessor
  class to have this processor be used as a simple API.

  Created by james@sndeveloper.com 2015
*/
var ui_main = 'snd_xplore_main'; // put your UI Macro name here

/* Boilerplate */
var template = getParam('template');
var action = getParam('action');
var data = getParam('data');

if (!checkRoles()) {
  g_processor.writeOutput('text/plain', 'Error: access restricted.');
}else if (template) {
  HtmlProcessor().sendTemplate(template);
} else if (action) {
  ActionProcessor().process(action, data);
} else {
  HtmlProcessor().
  inject({
    script_version: snd_xplore.version,
    // workarounds for UI Macro XML validation
    AMP: '&',
    LT: '<'
  }).
  sendHtml(ui_main);
}
/* !Boilerplate */

/**
  summary:
    Ensure that we have the necessary roles to run
**/
function checkRoles() {
  return gs.hasRole('admin');
}

function ActionProcessor() {

  /*--- Processor Specific Functions ---*/

  /*
    Write your processing functions here and add corresponding
    switch cases to the process function.
  */

  /**
    summary:
      Get the available scopes
    returns: Array
      Array of ordered scopes, except for global which is the first entry.
  **/
  function getScopes() {
    var gr = new GlideAggregate('sys_scope');
    gr.addQuery('scope', '!=', 'global');
    gr.orderBy('name'); // so we can see name
    gr.orderBy('private');
    gr.groupBy('scope');
    gr.query();
    var scopes = [];
    while (gr.next()) {
      if (gr.scope.toString().indexOf('sn_') === 0) {
        if (gr.getValue('private') != 'false') {
          continue; // easiest way to ignore ServiceNow scopes, Geneva has private flag
        }
      }
      scopes.push({
        name: gr.getValue('name') + ' [' + gr.getValue('scope') + ']',
        scope: gr.getValue('scope')
      });
    }
    scopes.sort(function (a, b) {
      if (a.name > b.name) return 1;
      if (b.name > a.name) return -1;
      return 0;
    });
    scopes.unshift({
      name: 'Global [global]',
      scope: 'global'
    });
    return scopes;
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
        m, a, i,
        loop = options ? options.toString().indexOf('g') >= 0: false;

    if (input && expression) {
      try {
        regex = new RegExp(expression, options);
      } catch (e) {
        return {
          error: ('' + e).split(':').pop()
        };
      }
      while (m = regex.exec(input)) {
        matches.push({
          index: m.index,
          length: m[0].length
        });
        // because groups.concat(m) will add the Array as an object instead of its values
        for (i = 1, a = []; i < m.length; i++) {
           a.push(m[i]);
        }
        groups.push(a);
        if (!loop) break;
      }
    }
    return {
      matches: matches,
      groups: groups,
      input: input
    };
  }

  /**
    summary:
      Get basic details of all the tables in the system
    returns: Object
  **/
  function getTables() {
    var tables = {};
    var gr = new GlideRecord('sys_db_object');
    gr.query();
    while (gr.next()) {
      tables[gr.getValue('name')] = {
        super_class:  gr.getValue('super_class'),
        label:        gr.getValue('label'),
        scope:        gr.getValue('sys_scope'),
        sys_id:       gr.getUniqueValue(),
        name:         gr.getValue('name')
      };
    }
    return tables;
  }

  /*--- End Processor Specific Functions ---*/

  /**
    summary:
      A simple request handler that takes an action and data object.

    action: String
      A keyword that can be used to determine the request.
    data: mixed
      Arbitrary data object for use with processing.
  **/
  function process(action, data) {
    var response;
    var reporter = new snd_XploreReporter();
    try {
      switch (String(action)) {
        /*
          Write your switch code here for requests
          See parseJson for using POST data
        */
        case 'logs':
          reporter.getOutputMessages();
          reporter.getLogs();
          response = responseFactory(true, reporter.getResponse());
          break;
        case 'regex':
          data = parseJson(data);
          response = responseFactory(true, evalRegex(data.input, data.expression, data.options));
          break;
        case 'run':
          var runner = new XploreRunner();
          data = parseJson(data);
          if (!data) {
            gs.addErrorMessage('Invalid HTTP data object.');
            reporter.getOutputMessages();
            response = responseFactory(true, reporter.getResponse());
          } else {
            runner.setReporter(reporter);
            response = runner.run(data);
          }
          break;
        case 'getScopes':
          response = responseFactory(true, getScopes());
          break;
        case 'getTables':
          response = responseFactory(true, getTables());
          break;
        case 'getTableHierarchy':
          data = {
            search_label: getParam('search_labels')
          };
          data.search_label = data.search_label == '1' || data.search_label == 'true';
          response = responseFactory(true, XploreTableHierarchy(getParam('table'), data));
          break;
        default:
          throw 'Invalid request.';
      }
    } catch (e) {
      response = responseFactory(false, e.toString());
    }
    if (!response) response = responseFactory(false, {message: 'Nothing returned.'});
    g_processor.writeOutput('application/json', new JSON().encode(response));
  }

  /**
    summary:
      Create a standardised response object to send back to the client.

    success: Boolean
      Was the request successful
    options: Object
      An object containing your data to return to the client.
      Parameters `success` and `message` are always returned.
      If it is a failure response, options can be a string of the error
      and it will be converted into the message property.
    returns: Object
  **/
  function responseFactory(success, options) {
    if (!success && typeof options == 'string') {
      return {
        success: false,
        message: options
      };
    }
    if (!options) options = {};
    options.success = !!success;
    if (!options.message) options.message = '';
    return options;
  }

  /**
    summary:
      Wrapper function for parsing JSON input.

    description:
      When making HTTP POST calls from a client, you must make sure that
      you pass as multipart encoded params. This is an object with a
      data property containing JSON.stringify(your_object).
      If you try and assign your object directly to the POST body, it will
      not be processed correctly* by ServiceNow. Tested in Fuji.

      * Need to validate this in the client when using $http or $.ajax, etc
        ? data: my_obj
        ? data: JSON.stringify(my_obj)
        works ==> data: {data: JSON.stringify(my_obj)}

      *jQuery: data: { data: JSON.stringify(my_obj)}
      *Angular: params: {data: JSON.stringify(my_obj)}

    data: mixed
    returns: mixed
      assuming data has a data property, returns JSON parse result
      otherwise returns the given parameter

  **/
  var parseJson = (function () {
    var json = new JSON();
    return function (data) {
      if (data && data.data) {
        return json.decode(data.data);
      }
      return json.decode(data);
    };
  })();

  /**
    summary:
      Get a record set.

    table: String
      The table to run the query on.
    query: String
      An encoded query string.
    limit: Number (Optional)
      Provide a limit to restrict the record count - i.e. for a single record lookup.

    returns: GlideRecord
  **/
  function getRecords(table, query, limit) {
    var gr = new GlideRecord(table);
    gr.addEncodedQuery(query);
    if (limit) gr.setLimit(limit);
    gr.query();
    return gr;
  }

  return {
    process: process
  };
}


/*
  You shouldn't need to edit below this.
*/
function HtmlProcessor() {

  this.userVarObj = null;

  /**
    summary:
      Get an UI macro and write the output to the response stream.

    name: String
      The name of the UI Macro that has your HTML
  **/
  function sendTemplate(name) {
    var html = _getMacro(name);
    if (!html) return;
    g_processor.writeOutput('text/html', html);
  }

  /**
    summary:
      Get an UI macro and write the output to the response stream.
      Prefix with a doctype for an HTML webpage template.

    name: String
      The name of the UI Macro that has your HTML
  **/
  function sendHtml(name) {
    var html = _getMacro(name);
    if (!html) return;
    // cannot add doctype anywhere else
    g_processor.writeOutput('text/html', '<!doctype html>' + html);
  }

  /**
    summary:
      Helper function to process a macro.

    name: String
      The name of the macro to get.

    returns: String or false on error.
  **/
  function _getMacro(name) {
    var gr = new GlideRecord('sys_ui_macro');
    gr.addQuery('name', '=', name);
    gr.setLimit(1);
    gr.query();
    if (gr.next()) {
      return setScriptVersions(replaceVars(gr.xml + '', this.userVarObj));
    }
    g_processor.writeOutput('text/plain', 'Missing required UI Macro: ' + name);
    return false;
  }

  /**
    summary:
      Looks for 'variables' in text and replaces them with those in an object
      should they exist.

    str: String
      The string that contains the variables in the format ${variableName}
    varObj: Object (Optional)
      The object containing the key-value pairs for the variables to replace.
      Providing no object will just return the original string.

    returns: String
  **/
  function replaceVars(str, varObj) {
    if (typeof varObj == 'object') {
      str = str.replace(/\$\{\s*(\w+)\s*\}/g, function (m, word) {
        return varObj[word] || m;
      });
    }
    return str;
  }

  /**
    summary:
      Parses HTML for js and css file references and appends a cache time.

    description:
      Processes an HTML string for references to database UI Scripts and
      Stylesheets and automatically gets them and appends their timestamp
      for proper caching.

      This means you can simply write:
        <script src="my_ui_script.jsdbx"></script>
      and this function will convert it to
        <script src="/my_ui_script.jsdbx?ssv=1443571200"></script>

      It does the same to css:
        <link href="/1a156ce10f574a0094f3c09ce1050e70.cssdbx" rel="stylesheet"></link>
      becomes
        <link href="/1a156ce10f574a0094f3c09ce1050e70.cssdbx?ssv=1356048000" rel="stylesheet"></link>

    html: String

    returns: {String}

  **/
  function setScriptVersions(html) {

    // get the updated time of the script
    function getTime(table, key, val) {
      var gr = new GlideRecord(table);
      gr.addQuery(key, '=', val);
      gr.setLimit(1);
      gr.query();
      return gr.next() ? new GlideDateTime(gr.sys_updated_on).getNumericValue() : '';
    }

    // replace a specific part of a string with something else
    function replacePart(str, i, what, len) {
      return str.substr(0, i) + what + str.substr(i + (len || what.length));
    }

    var regexp = /([a-zA-Z0-9_.]*)\.(css|js)dbx/g;

    var dict = {
      'js':  {table: 'sys_ui_script', key: 'name'},
      'css': {table: 'content_css',   key: 'sys_id'}
    };

    var m, t, ref;
    while ((m = regexp.exec(html))) {
      ref = dict[m[2]];
      t = getTime(ref.table, ref.key, m[1]);
      html = replacePart(html, m.index, m[0] + '?ssv=' + t, m[0].length);
    }
    return html;
  }

  /**
    summary:
      Inject some variables into the script generation

    varObj: Object
      A key-value pair object with keys to replace in any output using
      the format '${foo}' to give 'bar'.

    returns: HtmlProcessor
  **/
  function inject(varObj) {
    userVarObj = varObj;
    return this;
  }

  return {
    sendHtml: sendHtml,
    sendTemplate: sendTemplate,
    inject: inject
  };
}

/**
  summary:
    Safe wrapper for getting parameters to prevent false positives
  name: String
    The name of the parameter
**/
function getParam(name) {
  return (g_request.getParameter(name) || '') + '';
}

/**
  summary:
    Container class for running an exploratory programming request.
**/
function XploreRunner() {

  // #private: the current transaction
  var transaction;

  // #protected: the reporter to use
  var reporter;
  this.setReporter = function (obj) {
    reporter = obj;
  };
  this.getReporter  = function () {
    return reporter;
  };

  /**
    summary:
      capture calls to gs.print and enable debug for this session
  **/
  function start() {
    transaction = GlideTransaction.get();
    GlideSessionDebug.enable(transaction);
  }

  /**
    summary:
      stop the debug session for this transaction
  **/
  function stop() {
    if (transaction) GlideSessionDebug.disable(transaction);
  }

  /**
    summary:
      Log the code in syslog if necessary (like background script does)
  **/
  function logRequest(code, scope) {
    if (gs.getProperty('snd_xplore.log_request', 'true') == 'true') {
      gs.log('Xplore Request [' + (scope || 'global') + ']:\n' + code, 'SND Xplore');
    }
  }

  /**
    summary:
      Gets the lines of some text, e.g. code. Useful for showing errors.
    text: String
      The text to pull the lines from.
    at: Number
      The line number to highlight.
    span: Number
      The number of lines to add either side of the target line.
   **/
  function getLines(text, at, span) {
    var lines = text.split('\n');
    var result = [], i;

    function pre(i) {
      return i + 1 + ': ';
    }

    if (lines.length >= at) {
      at--; // account for base 0;
      for (i = (at - span); i < at; i++ ) {
        result.push(pre(i) + lines[i]);
      }
      result.push('=> ' + pre(at) + lines[at]);
      for (i = (at + 1); i <= (at + span) && i < lines.length; i++) {
        result.push(pre(i) + lines[i]);
      }
    }

    return result;
  }

  /**
    summary:
      Attempt to dotwalk a given object's properties.
    obj: Object
      The object to dotwalk.
    path: String
      The property path to walk, in dot notation: foo.bar.tan
    returns: mixed
      The property at the end of the chain.
    throws: Error
  **/
  function dotwalk(obj, path) {
    var pathArr = path.split('.');
    var o = obj;
    try {
      for (var i = 0; i < pathArr.length; i++) {
        path = pathArr[i];
        if (path.indexOf('()') > 0) {
          o = o[path.substr(0, path.length - 2)]();
        } else {
          o = o[path];
        }
      }
    } catch (e) {
      throw 'Unable to navigate breadcrumb: ' + e;
    }
    return o;
  }

  /**
    summary:
      Validate the script to run for any syntax errors.
    returns: true
    throws: string
  **/
  function validateScript(script) {
    var error = GlideSystemUtilScript._getScriptError(script);
    if (error) {
      var e = new SyntaxError(error);
      var m = error.match(/(.+) at line \((\d+)\) column \((\d+)\) problem = (.+)/);
      if (m) {
        e.name = m[4];
        e.lineNumber = m[2];
        e.column = m[3];
      }
      throw e;
    }
    return true;
  }

  /**
    summary:
      Handle an exception to see if there is a line number we can use.
    e: mixed
      The error object
    code: String
      The code that generated the exception.
    returns: Boolean
      True if the error was explainable, false if not.
      This just means that we can forward the error to xplore if we like.
  **/
  function handleException(e, code) {
    var errorStr = 'Exception thrown. ' + e;
    var lines, isUnknown = true;
    if (typeof e.lineNumber === 'string') {
      lines = getLines(code, parseInt(e.lineNumber, 10), 2);
      if (lines.length) {
        errorStr += '<br />' + lines.join('<br />').replace(' ', '&nbsp;');
        isUnknown = false;
      }
    }
    gs.addErrorMessage(errorStr);
    return isUnknown;
  }

  /**
    summary:
      Run Xplore on a script in the global environment
    script: String
      The script to evaluate
    options: Object
      An object of options
  **/
  function runScript(script, options) {
    // try to catch exceptions here - this won't catch all exceptions
    // newlines will affect the exception lineNumber
    script = 'try {' + script + '\n} catch (e) { e; }';
    var result = GlideEvaluator.evaluateString(script);
    if (result !== null && options.breadcrumb) {
      result = dotwalk(result, options.breadcrumb);
    }
    snd_xplore(result, reporter);
  }

  /**
    summary:
      Run Xplore on a script in a scoped environment
    script: String
      The script to evaluate
    options: Object
      An object of options
  **/
  function runScopedScript(script, options) {

    var scopeId = (function (scopeName) {
      if (scopeName == 'global') return '';
      var gr = new GlideRecord('sys_scope');
      gr.addQuery('scope', '=', scopeName);
      gr.setLimit(1);
      gr.query();
      if (gr.next()) {
        return gr.getUniqueValue();
      }
      throw 'Unknown scope [' + scopeName + ']';
    })(options.scope);

    var tryScript = '"try {" + script + "} catch (e) { e; }"';
    var scopedScript = dotwalk.toString() + ';\n';

    scopedScript += 'var gr = new GlideRecord("sys_script_include");\n';
    scopedScript += 'gr.name = "XploreTempScopedScript";\n';
    scopedScript += 'gr.api_name = "' + options.scope + '.XploreTempScopedScript";\n';
    scopedScript += 'gr.sys_scope = "' + scopeId + '";\n';
    scopedScript += 'gr.script = ' + tryScript + ';\n';
    scopedScript += 'try {\n';
    scopedScript += 'var gse = new GlideScopedEvaluator();\n';
    scopedScript += 'var result = gse.evaluateScript(gr, "script");\n';
    if (options.breadcrumb) {
      scopedScript += 'if (result != null) {\nresult = dotwalk(result, "' + options.breadcrumb + '");\n}\n';
    }
    scopedScript += '} catch (e) { result = e; }\n';

    scopedScript += 'var options = {scope: "' + options.scope + '"};\n';
    scopedScript += 'global.snd_xplore(result, reporter, options);\n';

    try {
      validateScript(scopedScript);
    } catch (e) {
      e.name = 'Scoped Script Generation SyntaxError';
      throw handleException(e, scopedScript);
    }

    var gr = new GlideRecord('sys_script_include');
    gr.name = 'XploreTempScopedScriptRunner';
    gr.api_name = gr.name;
    gr.script = scopedScript;
    gr.sys_scope = scopeId;
    var gse = new GlideScopedEvaluator();
    gse.putVariable('reporter', reporter);
    gse.putVariable('script', script);
    gse.evaluateScript(gr, 'script');
  }

  /**
    summary:
      Process a request.
    options: Object
      An object that contains the things we need to process the request.
        code: String
          The code to execute.
        breadcrumb: String
          List of dot separated property names to evaluate on the result.
    returns: Object
      The snd_XploreReporter response object.
  **/
  this.run = function (options) {
    var script = options ? options.code : '';

    function end() {
      reporter.getOutputMessages();
      stop();
      return reporter.getResponse();
    }

    if (!options) {
      gs.addErrorMessage('Xplore processor did not receive a request.');
      return end();
    }

    if (!reporter) {
      throw 'XploreRunner requires an appropriate reporter to be given.';
    }

    start();

    if (!script) {
      gs.addErrorMessage("Expression required.");
      return end();
    }

    try {
      validateScript(script);
      logRequest(script, options.scope);
      global.user_data = options.user_data;

      if (options.scope && options.scope != 'global') {
        runScopedScript(script, options);
      } else {
        runScript(script, options);
      }
    } catch (e) {
      snd_xplore(e, reporter);
    }

    return end();
  };
}

/**
  summary:
    Xplore table helper
**/
function XploreTableHierarchy(table, options) {

  // The maximum number of table extensions we will handle
  var MAX_DEPTH = 25;

  var SEARCH_LABEL =  options ? !!options.search_label : false;
gs.print(SEARCH_LABEL);
  /**
    summary:
      Get the hierarchy of a given table or all the tables.
    description:
      Builds an multi-dimensional array of objects, where each
      object represents a base table. Each object can have children
      and the children can also have children.
      The object also contains details of the table.
    table: String (Optional)
      The table to get the Hierarchy for. Providing no table
      will result in the entire table hierarchy being processed.
    returns: Array
  **/
  function getHierarchy(table) {
    var info,
      hierarchy,
      data = {};

    if (!table) throw 'Invalid table.';

    info = getTableInfo(table, SEARCH_LABEL);
    hierarchy = [];
    hierarchyLookup = {};
    data.names = getSortedKeys(info);

    // loop until we have no more tables to check
    each(Array(MAX_DEPTH), function () {
      var nextNames = []; // process these names on the next iteration
      each(data.names, function (i, name) {
        var dbo = info[name];
        /*dbo.toString = function () {
          return this.super_class + '.' + this.name;
        };*/
        if (!dbo.super_class) {
          // this is a base class
          dbo.children = []; // add a place for the children to go
          hierarchy.push(dbo); // add to our hierarchy
          hierarchyLookup[dbo.sys_id] = dbo;
        } else if (hierarchyLookup[dbo.super_class] !== undefined) {
          // this is an extension and it's parent has already been processed
          dbo.children = []; // children can have children
          hierarchyLookup[dbo.sys_id] = dbo;
          hierarchyLookup[dbo.super_class].children.push(dbo);
        } else {
          // process on next iteration
          nextNames.push(name);
        }
      });
      if (!nextNames.length) return false;
      data.names = nextNames;
    });

    return hierarchy;
  }

  /**
    summary:
      Get table details hierarchy information from sys_db_object.
    table: String (Optional)
      Look for details of all tables in this table's heirarchy.
      Not providing this parameter will return details of all tables.
    returns: Object
      An 2D object where each key is the name of the table and the
      value is an object containing a copy of the sys_db_object data.
  **/
  function getTableInfo(table, searchLabel) {
    var required, matcher;

    matcher = (function (t) {
      var e = t.substr(0,1) === '*';
      var s = t.substr(-1) === '*';
      if (e) t = t.substr(1);
      if (s) t = t.substr(0, t.length - 1);
      if (!s || !e) {
        if (s) t = '^' + t; // starts with
        else if (e) t = t + '$'; // ends with
      }
      return new RegExp(t);
    })(table);

    // if it's a standard table or looking for all tables
    if (table == '**' || table == 'ALL') table = '';


    if (!table || table.match(/^[a-z0-9_]+$/)) {

      if (table && !searchLabel) {
        isValidTable(table);
      }

      required = getDbObject(table);
      if (searchLabel) {
        each(getDbObjectByLabel(table), function (name, obj) {
          if (!required[name] && obj.label.match(matcher)) {
            required[name] = obj;
          }
        });
      }

    } else {

      // match on table is required, so get all tables and match
      required = {};
      eacho(getDbObject(), function (name) {
        if (name.match(matcher)) {
          eacho(getDbObject(name), function (name, obj) {
            required[name] = required[name] || obj;
          });
        }
      });

    }

    return required;
  }

  var getDbObjectByLabel = function (label) {
    var result = {};
    var gr = new GlideRecord('sys_db_object');
    gr.addQuery('label', 'CONTAINS', label);
    gr.query();
    while (gr.next()) {
      result[gr.getValue('name')] = info(gr);
    }
    return result;
  };

  /**
    summary:
      Get an object of objects containing sys_db_object info
    param: table [String]
    returns: Object
  **/
  var getDbObject = (function () {
    var dbo = GlideDBObjectManager.get();
    return function (table) {
      var result = {};
      var gr = new GlideRecord('sys_db_object');
      if (table) {
        gr.addQuery('name', 'IN', dbo.getHierarchy(table).toArray().join(','));
      }
      gr.query();
      while (gr.next()) {
        result[gr.getValue('name')] = info(gr);
      }
      return result;
    };
  })();

  function info(gr) {
    return {
      super_class: gr.getValue('super_class'),
      label: gr.getValue('label'),
      scope: gr.getValue('sys_scope'),
      sys_id: gr.getUniqueValue(),
      name: gr.getValue('name')
    };
  }

  /**
    summary:
      Helper function: loop through arrays
    arr: Array
      The array to loop through.
    fn: Function
      Callback function being given two parameters: index
      and current array item.
      Returning false will cancel the iteration.
  **/
  function each(arr, fn) {
    var len = arr.length;
    for (var i = 0; i < len; i++) {
      if (fn(i, arr[i]) === false) {
        break;
      }
    }
  }

  /**
    summary:
      Helper function: loop through objects
    param: o [Object]
    param: fn [Function]
      Callback function being given two parameters: key and current object property.
      Returning false will cancel the iteration.
  **/
  function eacho(o, fn) {
    for (var k in o) {
      if (fn(k, o[k]) === false) {
        break;
      }
    }
  }

  /**
    summary:
      Helper function: check if a table is valid.
    table: String
    returns: Boolean
  **/
  function isValidTable(table) {
    var gr = new GlideRecord(table);
    if (!gr.isValid()) {
      throw 'Invalid table name: ' + table;
    }
    return true;
  }

  /**
    summary:
      Helper function: get an array of an objects' sorted property names
    obj: Object
    returns: Array
  **/
  function getSortedKeys(obj) {
    var keys = [];
    for (var key in obj) {
      keys.push(key);
    }
    keys.sort();
    return keys;
  }

  return getHierarchy(table);
}
