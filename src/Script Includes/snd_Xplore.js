var snd_Xplore = function () {
  this.prettyPrinter = new snd_Xplore.PrettyPrinter();
  this.default_reporter = 'snd_Xplore.PrintReporter';

  /**
   * {RegExp}
   * Black list to prevent looking over inaccessible Java stuff.
   * The majority of these are fully capitalised properties found on Java Packages
   * which would otherwise throw an exception.
   * There is no point even adding these to the results list.
   * E.g. DB, Y, _XML, M2MMAINTAINORDER
   */
  this.blacklist_regexp = /^[A-Z0-9_$]+$/;
  this.debug = false;
};
snd_Xplore._lists = null;


snd_Xplore.prototype.toString = function () {
  return '[object ' + this.type + ']';
};
snd_Xplore.prototype.type = 'snd_Xplore';

snd_Xplore.prototype.setReporter = function (name) {
  var o = snd_Xplore.dotwalk(typeof window === 'undefined' ? global : window, name);
  if (typeof o !== 'function') throw new Error(name + ' is not a valid reporter class.');
  this.reporter = new o();
  return this.reporter;
};

/**
 * Check if Xplore is being run in a scoped application.
 *
 * @return {Boolean}
 */
snd_Xplore.prototype.isInScope = function () {
  if (typeof window !== 'undefined') return false;
  return !('print' in gs);
};

/**
 * Gets the name of the current scope. e.g. 'global' or 'x_abc_test'
 *
 * @return {string}
 */
snd_Xplore.prototype.getScopeName = function (scope) {
  return scope === global ? 'global' : Object.prototype.toString.call().slice(8, -1);
};

snd_Xplore.prototype.debugMsg = function (msg) {
  if (this.debug) {
    if (typeof window === 'undefined') {
      gs.debug(msg);
    } else {
      jslog(msg);
    }
  }
};

/**
 * summary:
 *
 *
 * description:
 *   The snd_xplore function here allows exploratory programming to take place
 *   in ServiceNow. Simply call new snd_Xplore().xplore(my_obj) in a background
 *   script and watch all the objects get printed out on screen.
 * @summary: Iterate over any object to retrieve its contents.
 *
 * param: obj [Any]
 *   The object you want to explore!
 * param: reporter [String] Optional
 *   The name of the custom reporter object so you can customise where the output gets sent.
 * param: options [Object] Optional
 *   Customise what happens using this options object.
 *   -show_props: [Boolean]
 *     Set false to disable attempting to parse through the objects' properties.
 *     Defaults to true.
 *   -no_quotes: [Boolean]
 *     Set true to prevent quotes from being added to strings.
 *     Defaults to false.
 *   see: lookAt
 */
snd_Xplore.prototype.xplore = function (obj, reporter, options) {
  var is_java_obj,
      target,
      x;

  options = options || {};
  this.prettyPrinter.noQuotes(options.no_quotes);

  if (options.dotwalk) obj = snd_Xplore.dotwalk(obj, options.dotwalk);

  // register the reporter on this object so it works in a scope
  if (reporter || !this.reporter) {
    this.reporter = this.setReporter(reporter || this.default_reporter);
  }
  reporter = this.reporter;

  this.debugMsg('Running xplore in debug mode...');

  target = this.lookAt(obj, '[Target]', options);
  reporter.begin(target);

  this.debugMsg('Exploring object ' + target.name);

  if (options.show_props !== false && obj !== null && obj !== undefined) {
    this.xploreProps(obj, reporter, options);
  }

  reporter.complete();
  this.debugMsg('Xplore complete.');
};

snd_Xplore.prototype.xploreProps = function (obj, reporter, options) {
  var lists = snd_Xplore.getLists(),
      type = Object.prototype.toString.call(obj),
      is_java_obj = type.indexOf('Java') > -1,
      is_string = type == '[object String]',
      int_match = /^[0-9.]+$/,
      result,
      name;

  this.debugMsg('Exploring properties...');

  reporter = reporter || {};
  reporter.result = reporter.result || function () {};

  if (type == '[object Function]' && typeof obj.prototype == 'object') {
    reporter.result(this.lookAt(obj.prototype, 'prototype', options));
  }

  for (name in obj) {

    if (is_string && name.match(int_match)) {
      // this is a letter in a string
      continue;
    }

    this.debugMsg('Looking at ' + name);

    // if we are evaluating a Java class then we need to check the Blacklist
    // so we don't even attempt to look at that property as it will just
    // halt the thread and generate an illegal access exception.
    if (lists.blacklist.indexOf(',' + name + ',') > -1 || (is_java_obj && name.match(this.blacklist_regexp))) {
      this.debugMsg(' - blacklisted');
      continue;
    }

    // hard code this here as it breaks with nullPointerException in scopes
    if (name == 'class' && is_java_obj) {
      this.debugMsg(' - *CLASS*');
      reporter.result({
        name: name,
        type: 'JavaObject',
        string: ''
      });
      continue;
    }

    try {
      result = this.lookAt(obj[name], name, options);
      this.debugMsg(' - ' + result.type);
    } catch (ex) {
      this.debugMsg(' - Exception: ' + ex);
      reporter.result({
        name: name,
        type: '__unknown__',
        string: '[Property access error: ' + ex + ']'
      });
      continue;
    }

    reporter.result(result);

  }
};

/**
  summary:
    The magic method that works out what any object is and even attempts to
    find it's contents.

  description:
    Takes any object and an optional name of that object and returns
    a simple result object containing the details of what was found.

  param: obj [Object]
    Any object that needs to be looked at.
  param: name [String] Optional
    The name of the object to populate the result with.
  param: options [Object] Optional
    An options object.

  returns: Object
    An object containing the following properties:
      -name [String]
        The name of the object if it was provided, otherwise an empty string.
      -type [String]
        The class name of the object.
**/
snd_Xplore.prototype.lookAt = function (obj, name, options) {
  var result = {},
      main_type,
      lists = snd_Xplore.getLists();

  this.prettyPrinter.noQuotes(options.no_quotes);

  result.name = name || undefined;
  result.type = '';
  result.string = null;

  // this covers an independent call to this function - handled by xploreProps
  if (lists.blacklist.indexOf(',' + name + ',') > -1) {
    result.type = '*BLACKLISTED*';
    return result;
  }

  // The try/catch is required for things like new GlideDateTime().tableName
  // which can throw a NullPointerException on access.
  try {

    if (obj === null || obj === undefined) {
      result.type = '' + obj;
      result.string = result.type;
      return result;
    }

    main_type = Object.prototype.toString.call(obj);
    result.type = main_type.slice(8, -1); // get <name> from [Object name]
  } catch (ex) {
    try {
      result.type = main_type = typeof obj;
    } catch (ex2) {
      result.type = '__unknown__';
      result.string = '[Property access error: ' + ex2 + ']';
      return result;
    }
  }

  if (lists.redlist.indexOf(',' + result.type + ',') > -1) {
    result.string = '*REDLIST*';
    return result;
  }

  if (name == 'prototype') {
    result.string = '[object ' + result.type + ']';
    result.type = 'Object';
  } else if (options.show_strings === false) {
    result.string = '*IGNORED*';
  } else {
    result.string = this.prettyPrinter.format(obj);
  }

  return result;
};

snd_Xplore._getPropertyArray = function (name) {
  var result;
  if (typeof window !== 'undefined') {
    result = [];
  } else {
    result = gs.getProperty(name, '').toString();
    result = result ? result.split(',') : [];
  }
  return result;
};

/**
 * Add elements for the black List not captured by RegExp.
 * These property names will be completely ignored.
 *
 * @param {String} item The name of a property name to completely ignore.
 * @arguments Add further item names.
 */
snd_Xplore._blacklist = snd_Xplore._getPropertyArray('snd_xplore.blacklist');
snd_Xplore.blacklist = function (item) {
  if (arguments.length) {
    snd_Xplore._blacklist = snd_Xplore._blacklist.concat(Array.prototype.slice.apply(arguments));
    snd_Xplore._lists = null;
  }
  return snd_Xplore._blacklist;
};

/**
 * Add elements for the red List which must not use toString as they will throw
 * an exception. These property names will still show up in the results.
 *
 * @param {String} item The name of a property name to completely ignore.
 * @arguments Add further item names.
 */
snd_Xplore._redlist = snd_Xplore._getPropertyArray('snd_xplore.redlist');
snd_Xplore.redlist = function (item) {
  if (arguments.length) {
    snd_Xplore._redlist = snd_Xplore._redlist.concat(Array.prototype.slice.apply(arguments));
    snd_Xplore._lists = null;
  }
  return snd_Xplore._redlist;
};

/**
 * Compile the black and red lists into an object.
 *
 * @return {Object}
 *     blacklist {String}
 *     redlist {String}
 */
snd_Xplore.getLists = function () {
  if (snd_Xplore._lists === null) {
    // prefix/suffix with comma so exact search can be made ',foo,'
    snd_Xplore._lists = {
      blacklist: ',' + snd_Xplore._blacklist.join(',') + ',',
      redlist: ',' + snd_Xplore._redlist.join(',') + ','
    };
  }
  return snd_Xplore._lists;
};

/**
 * Navigate down the property chain of a given object.
 *
 * @param {Object} obj The object to navigate.
 * @param {String} path The path to follow, e.g. "child.name". If any property
 *     has a double parentheses, it will be called as a function.
 * @return {Object} The property at the end of the chain.
 * @throws {Error}
 */
snd_Xplore.dotwalk = function (obj, path) {
  // summary:
  //   Dotwalk a path on an object
  var pathArr = path.split('.');
  var o = obj;
  for (var i = 0; i < pathArr.length; i++) {
    path = pathArr[i];
    if (path.indexOf('()') > 0) {
      o = o[path.substr(0, path.length - 2)]();
    } else {
      try {
        o = o[path];
      } catch (ex) {
        throw new Error('Cannot dotwalk with a non-object: ' + pathArr.slice(0, i + 1).join('.'));
      }
    }
  }
  return o;
};

//==============================================================================
// Pretty Printer
//==============================================================================

snd_Xplore.PrettyPrinter = function () {
  this.is_browser = typeof window !== 'undefined';
  this.global = this.is_browser ? window : global;
  this.scope =  (function () { return this; })();
  this.not_str_regex = /^\[[a-zA-Z0-9_$. ]+\]$|^[a-zA-Z0-9.$]+@[a-z0-9]+$/;
};
snd_Xplore.PrettyPrinter.prototype = {

  type: 'PrettyPrinter',

  noQuotes: function (b) {
    this.no_quotes = !!b;
  },

  getClassType: function (obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  },

  'String': function (obj) {
    try {
      obj = obj + '';
    } catch (e) {
      obj = Object.prototype.toString.call(obj);
    }

    // handle object types and memory references
    if (this.no_quotes || obj.match(this.not_str_regex)) {
      return obj;
    }

    return '"' + obj + '"';
  },

  'Boolean': function (obj) {
    return obj ? 'true' : 'false';
  },

  'Function': function (obj) {
    return '' + obj;
  },

  'Number': function (obj) {
    return '' + obj;
  },

  'Array': function (obj) {
    var str = [];
    for (var i = 0; i < obj.length; i++) {
      str.push(this.format(obj[i]));
    }
    return '[' + str.join(', ') + ']';
  },

  'SNRegExp': function (obj) {
    return obj.toString();
  },

  'GlideRecord': function (obj) {
    return [
      'table: ' + obj.getLabel() + ' [' + obj.getTableName() + ']',
      'sys_id: ' + obj.getUniqueValue(),
      'display: ' + obj.getDisplayValue(),
      'query: ' + obj.getEncodedQuery()
    ].join('\n');
  },

  'GlideElement': function (obj, type) {
    if (type.indexOf('GlideElementBoolean') > -1) {
      return obj ? 'true' : 'false';
    }
    if (type.indexOf('GlideElementNumeric') > -1) {
      return '' + obj;
    }
    if (type.indexOf('GlideElementHierarchicalVariables') > -1) {
      return ''; // prevent TypeError: Cannot find default value for object.
    }
    if (type == 'GlideElementReference') {
      return this.GlideElementReference(obj);
    }
    try {
      obj = obj.getValue ? obj.getValue() : '' + obj;
      return this.format(obj);
    } catch (ex) {
      return ex.toString();
    }
  },

  'GlideElementReference': function (obj) {
    var result = '"' + obj + '"';
    if (!obj.nil()) {
      result += ' [';
      if (obj.getReferenceTable) {
        result += obj.getReferenceTable() + ' ';
      }
      result += this.String(obj.getDisplayValue()) + ']';
    }
    return result;
  },

  format: function (obj) {
    var real_type = this.getClassType(obj),
        type = real_type.replace('GlideScoped', 'Glide');

    if (this.is_browser) {
      return type in this ? this[type](obj) : '' + obj;
    }

    if (obj === this.global || type == 'global') {
      return '[global scope]';
    }

    if (obj === this.scope) {
      return '[' + type + ' scope]';
    }

    if (type.indexOf('GlideRecord') > -1) return this.GlideRecord(obj);
    if (type.indexOf('GlideElement') > -1) return this.GlideElement(obj, type);

    // handle native JavaScript objects which we know have a toString
    if (obj instanceof Function ||
        obj instanceof Object ||
        obj instanceof Array ||
        type == 'Number' ||
        type == 'Boolean' ||
        type == 'String' ||
        obj instanceof RegExp) {
      return type in this ? this[type](obj) : this.String(obj);
    }

    // Java objects can have the same type but break when calling toString
    // We would only get here if their instanceof did not match.
    if (type === 'Function' || type === 'Object') {
      return '';
    }

    // catch all
    try {
      return this.String(obj);
    } catch (e) {
      return '[object ' + real_type + ']';
    }
  },

  toString: function () {
    return '[object ' + this.type + ']';
  }

};

//==============================================================================
// Default Print Reporter
//==============================================================================

/**
 * Follow this object format in order to build a custom reporter that
 * can be passed into snd_xplore for custom reporting requirements.
 */
snd_Xplore.PrintReporter = function () {
  this._fn = '';
  if (typeof window !== 'undefined') {
    this._fn = typeof console !== undefined && console.log ? 'console' : 'jslog';
  } else {
    this._fn = 'print' in gs ? 'debug' : 'print';
  }
};
snd_Xplore.PrintReporter.prototype.type = 'PrintReporter';
snd_Xplore.PrintReporter.prototype.toString = function () {
  return '[object ' + this.type + ']';
};

snd_Xplore.PrintReporter.prototype.print = function (str) {
  if (this._fn == 'console') console.log(str);
  else if (this._fn == 'jslog') jslog(str);
  else if (this._fn) gs[this._fn](str);
};

/**
 * Called when the main object is evaluated.
 * @param {Object} obj A result object
 */
snd_Xplore.PrintReporter.prototype.begin = function (result) {
  this.print('Xplore: [' + result.type + '] : ' + result.string);
};

/**
 * Called each time a property of the object is evaluated.
 * @param {Object} result A result object
 */
snd_Xplore.PrintReporter.prototype.result = function (result) {
  this.print('[' + result.type + '] ' + result.name + ' = ' + result.string);
};

/**
 * Called when snd_xplore has finished running.
 */
snd_Xplore.PrintReporter.prototype.complete = function () {
  this.print('Complete.');
};

//==============================================================================
// Object Reporter
//==============================================================================



/**
 * Pushes an array of objects containing two properties describing the message
 * into the response.messages array.
 *
 * Must be run in global scope.
 *
 * @summary Get all the output messages generated in this session, then flush them.
 * @return {Array} An array of objects where each object in the array contains:
 *     type {String} The property type: log, info, error, access
 *     message {String} The message.
 *
**/
snd_Xplore.getOutputMessages = function () {
  var ret = [],
      tmp,
      i;

  if (typeof window !== 'undefined') return ret;

  // access
  tmp = gs.getAccessMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    ret.push({type: 'access', message: tmp[i]});
  }

  // errors
  tmp = gs.getErrorMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    ret.push({type: 'error', message: tmp[i]});
  }

  // info
  tmp = gs.getInfoMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    ret.push({type: 'info', message: tmp[i]});
  }

  // merge gslog workaround for Istanbul onwards
  ret = ret.concat(this._gslogs);

  // gs.print
  tmp = GlideSessionDebug.getOutputMessages().toArray();
  try {
    for (i = 0; i < tmp.length; i++) {
      ret.push({type: 'log', message: ('' + tmp[i].line).replace(' : ', ' ')}); // remove unnecessary colon
    }
  } catch (e) {
    if (tmp.length) {
      ret.unshift({type: 'access', message: '<p>Hey!<p>' +
        '<p>It looks like you\'re using <code>gs.print</code>, <code>gs.info</code>, ' +
        '<code>gs.warn</code> or <code>gs.error</code> in your script.</p>' +
        '<p>Unfortunately ServiceNow have locked down the API and we no longer have access to read ' +
        'those messages. You can see them by going to Logs > Node Logs; the time and thread name ' +
        'should be pre-populated for this thread. Alternatively you can replace those methods with ' +
        '<code>gs.addInfoMessage</code> although I appreciate this doesn\'t work for Script Includes, etc.</p>' +
        '<p>If you have any insight or can help fix this, please get in touch!</p>' +
        '<p>Thanks! James</p>' +
        '<p><small>Original exception: ' + e.toString() + '</small></p>'});
    }
  } finally {
    // remove all the messages we just retrieved
    GlideSessionDebug.clearOutputMessages();
  }

  gs.flushAccessMessages();
  gs.flushMessages();

  return ret;
};


/**
 * Server side method for getting any errors or warning that occured for the
 * user in the last minute or so. Logs are pushed to the main result object.
 *
 * @return {Array} An array of objects containing the properties:
 *     created {Number]
 *     level {String}
 *     message {String}
 *     source {String}
**/
snd_Xplore.getLogs = function () {
  var ret = [],
      level_map,
      gr;

  if (typeof window !== 'undefined') return ret;

  level_map = {
    '-1': 'Debug',
    '0': 'Info',
    '1': 'Warning',
    '2': 'Error'
  };

  gr = new GlideRecord('syslog');
  gr.addQuery('sys_created_on', 'ON', 'Current minute@javascript:gs.minutesAgoStart(0)@javascript:gs.minutesAgoEnd(0)');
  gr.addQuery('sys_created_by', '=', gs.getUserName())
      .addOrCondition('sys_created_by', '=', 'system');
  gr.addQuery('level', 'IN', '1,2');
  gr.orderBy('sys_created_on');
  gr.query();

  while (gr.next()) {
    ret.push({
      created: gr.sys_created_on.getDisplayValue(),
      level: level_map[gr.getValue('level')],
      message: gr.getValue('message'),
      source: gr.getValue('source')
    });
  }

  return ret;
};

/**
 * A reporter to pass to snd_xplore for capturing results so they can be shown
 * in the UI.
 */
snd_Xplore.ObjectReporter = function () {
  this.is_browser = typeof window !== 'undefined';
  this.start_time = this.is_browser ? new Date() : new GlideDateTime().getDisplayValue();
  this.report = {
    // The type of object that is being evaluated
    type: '',
    // the valueOf value of the object being evaluated
    value: '',
    // the string value of the object being evaluated
    string: '',
    // the list of property objects
    results: [],
    // the list of captured messages
    messages: [],
    // a list of logs that occured very recently
    logs: [],
    // self explanatory really!
    status: '',
    // the url to access the node logs
    node_log_url: ''
  };
};
snd_Xplore.ObjectReporter.prototype.type = 'ObjectReporter';
snd_Xplore.ObjectReporter.prototype.toString = function () {
  return '[object ' + this.type + ']';
};

snd_Xplore.ObjectReporter.prototype.getReport = function () {
  return this.report;
};

snd_Xplore.ObjectReporter.prototype.begin = function (obj) {
  this.report.status = 'started';
  this.report.type = obj.type;
  this.report.value = obj.value;
  this.report.string = obj.string;
};

snd_Xplore.ObjectReporter.prototype.result = function (obj) {
  this.report.results.push(obj);
};

snd_Xplore.ObjectReporter.prototype.complete = function () {
  this.report.status = 'finished';
  this.report.node_log_url = this.generateNodeLogUrl();
};

snd_Xplore.ObjectReporter.prototype.generateNodeLogUrl = function () {
  // create the URL for the ui_page to display the log data
  var maxRows = 2000;
  var url = "ui_page_process.do?name=log_file_browser";

  if (this.is_browser) return '';

  url += "&end_time=" + (new GlideDateTime().getDisplayValue());
  url += "&start_time=" + this.start_time;
  url += "&max_rows=" + maxRows;
  url += '&filter_thread=' + this.getThreadName();
  return url;
};
snd_Xplore.ObjectReporter.prototype.getThreadName = function () {
  // this works around the exceptions thrown by calling getName() or using .name
  // Those are totally broken in Jakarta.
  var value = '' + Object.prototype.valueOf.call(GlideWorkerThread.currentThread());
  var m = value.match(/(?:\[)([^,]+)/);
  if (!m) {
    gs.warn('Cannot get current thread name.', 'snd_Xplore');
    return '';
  }
  return m[1];
};

snd_Xplore.getVersion = function () {
  var gr = new GlideRecord('sys_app');
  gr.addQuery('sys_id', '=', '0f6ab99a0f36060094f3c09ce1050ee8');
  gr.setLimit(1);
  gr.query();
  return gr.next() ? gr.getValue('version') : 'Unknown';
};

///////////////////////////////////////////////////////
// Workaround for log statements in Istanbul onwards //
///////////////////////////////////////////////////////

snd_Xplore._gslogs = [];
snd_Xplore._gslogMessage = function (level, msg, source) {
  var time = new Date().toISOString();
  snd_Xplore._gslogs.push({
    type: level,
    message: time + ': ' + msg,
    source: source
  });
};
snd_Xplore.gsprint = function (msg, source) {
  snd_Xplore._gslogMessage('-1', msg, source);
};
snd_Xplore.gslog = function (msg, source) {
  snd_Xplore._gslogMessage('-1', msg, source);
};
snd_Xplore.gsdebug = function (msg, source) {
  snd_Xplore._gslogMessage('-1', msg, source);
};
snd_Xplore.gsinfo = function (msg, source) {
  snd_Xplore._gslogMessage('0', msg, source);
};
snd_Xplore.gswarn = function (msg, source) {
  snd_Xplore._gslogMessage('1', msg, source);
};
snd_Xplore.gserror = function (msg, source) {
  snd_Xplore._gslogMessage('2', msg, source);
};