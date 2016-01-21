var snd_xplore = (function () {

  /**
    Black list to prevent looking over inaccessible Java stuff.
    The majority of these are fully capitalised properties found on Java Packages
    which would otherwise throw an exception.
    There is no point even adding these to the results list.
    E.g. DB, Y, _XML, M2MMAINTAINORDER
  **/
  var blacklistRegExp = /^[A-Z0-9_$]+$/;

  /**
    Additional elements for the black List not captured by RegExp.
    These property names will be completely ignored.
  **/
  var blacklist = [
    //'i18n_SORTABLE', // Any JavaClass?
    //'fDebugSessionLifetime' // GlideSession
  ];
  var blacklistStr;

  /**
    Red list types must not use toString as they will throw an exception.
    They will still show up in the results though.
  **/
  var redlist = [
    //'GlideElementHierarchicalVariables' // GlideRecord
  ];
  var redlistStr;

  function isInScope() {
    return !('print' in gs);
  }

  /**
    summary:
      Quick way to compile the arrays into string which are easily searchable.
  **/
  function compileLists() {
    // prefix/suffix with comma so exact search can be made ',foo,'
    blacklistStr = ',' + blacklist.join(',') + ',';
    redlistStr = ',' + redlist.join(',') + ',';
  }

  /**
    summary:
      The default reporter.
    description:
      Follow this object format in order to build a custom reporter that
      can be passed into snd_xplore for custom reporting requirements.
  **/
  var print_reporter = {

    // #public: see if we are in scoped app and use appropriate function call
    func: isInScope() ? 'debug' : 'print',

    /**
      summary:
        Called when the main object is evaluated.
      obj: Object
        A result object
    **/
    begin: function (obj) {
      gs[this.func]('Xplore: [' + obj.type + '] : ' + obj.value);
    },

    /**
      summary:
        Called each time a property of the object is evaluated.
      obj: Object
        A result object provided by snd_xplore
    **/
    result: function (obj) {
      gs[this.func]('[' + obj.type + '] ' + obj.name + ' = ' + obj.value);
    },

    /**
      summary:
       Called when snd_xplore has finished running.
    **/
    complete: function () {
      gs[this.func]('Complete.');
    }
  };

  /**
    summary:
      Function for evaluating any object and getting its contents.

    description:
      The snd_xplore function here allows exploratory programming to take place
      in ServiceNow. Simply call snd_xplore(my_obj) in a background script
      and watch all the objects get printed out on screen.

    obj: Mixed
      The object you want to explore!
    reporter: Object optional
      A custom reporter object so you can customise where the output gets sent.
  **/
  function xplore(obj, reporter, options) {

    compileLists();

    // get the default reporter if no reporter has been provided
    if (!reporter) reporter = print_reporter;

    // mix the reporter object to ensure we have the right functions to call
    (function (obj, mixer) {
      for (var x in mixer) {
        if (typeof obj[x] === 'undefined') {
          obj[x] = mixer[x];
        }
      }
    })(reporter, {
      begin: function () {},
      result: function () {},
      complete: function () {}
    });

    // start!
    var target = lookAt(obj, '[Target]', options);
    if (target.string == target.value) target.value = '';
    reporter.begin(target);

    // We may want to evaluate the properties against the blacklist for a Java class
    var isJavaObject = target.type.indexOf('Java') > -1;

    if (obj !== null && obj !== undefined) {

      for (var x in obj) {

        // if we are evaluating a Java class then we need to check the Blacklist
        // so we don't even attempt to look at that property as it will just
        // halt the thread and generate an illegal access exception.
        //if (isJavaObject) {
          if (blacklistStr.indexOf(',' + x + ',') > -1 || (isJavaObject && x.match(blacklistRegExp))) {
            /**reporter.result({
              name: x,
              type: 'blacklisted',
              value: '[unknown]'
            });**/
            continue;
          }
        //}

        // The try/catch is required for things like new GlideDateTime().tableName
        // which can throw a NullPointerException on access.
        try {
          snd_xplore._temp = {
            obj: obj[x],
            x: x,
            options: options
          };

          var o = GlideEvaluator.evaluateString('global.snd_xplore.lookAt(global.snd_xplore._temp.obj, global.snd_xplore._temp.x, global.snd_xplore._temp.options)');
          if (o) {
            if (o.string == o.value) o.value = '';
            reporter.result(o);
          }
          //reporter.result(lookAt(obj[x], x, options));
        } catch (e) {
          reporter.result({
            name: x,
            type: Object.prototype.toString.call(obj[x]),
            value: '[Property access error: ' + e  + ']'
          });
        }
      }
    }

    // we are done!
    reporter.complete();
  }

  /**
    summary:
      The magic method that works out what any object is and even attempts to
      find it's contents.

    description:
      Takes any object and an optional name of that object and returns
      a simple result object containing the details of what was found.

    obj: Object
      Any object that needs to be looked at.
    name: String optional
      The name of the object to populate the result with.

    returns: Object
      An object containing the following properties:
        name: String
          The name of the object if it was provided, otherwise an empty string.
        type: String
          The class name of the object.
        value: String
          The value of the object, if possible. Some objects cannot be evaluated
          due to protection within the ServiceNow Rhino environment.
          Some objects are red listed which means evaluating toString on the object
          fails and generates some kind of warning.
  **/
  function lookAt(obj, name, options) {
    var result = {
      name: name || '',
      type: '',
      value: '',
      string: ''
    };

    if (obj === null || obj === undefined) {
      result.type = '' + obj;
      result.value = ''; //String(obj);
      return result;
    }

    /**
      This is the only 'known' way to find what any type of object is in the
      ServiceNow Rhino environment. It gets the classname, too, which means
      we are able to really see exactly what everything is.
      The result is something like `[Object String]`. The slice removes the
      stuff around `String`.
    **/
    var mainType = Object.prototype.toString.call(obj);
    result.type = mainType.slice(8, -1);
    if (result.type != 'Array') {
      result.value = ''; //Packages.java.lang.String.valueOf(obj); // doesn't work in Geneva
    }

    if (mainType == '[object global]') {
      result.string = '[Global Scope]';
      return result;
    }

    // we cannot read the value of a scope object
    if (options.scope == result.type) {
      result.string = '[' + options.scope + ' Scope]';
      return result;
    }

    // there may be more object exceptions to add here...
    if (redlistStr.indexOf(',' + result.type + ',') > -1) {
      result.string = '[Property type is red-listed]';
      return result;
    }

    // handle native JavaScript objects which we know have a toString
    if (obj instanceof Function ||
        obj instanceof Object ||
        obj instanceof Array ||
        obj instanceof Number ||
        obj instanceof Boolean ||
        obj instanceof String ||
        obj instanceof RegExp) {
      result.string = obj.toString();
      return result;
    }

    // handle Java objects which break when trying to toString
    if (result.type === 'Function' || result.type === 'Object') {
      return result;
    }

    // catch all
    try {
      result.string = String(obj);
    } catch (e) {
      result.string = ''; //'[Property type ' + result.type + ' should be red-listed]';
    }

    return result;
  }

  /**
    summary:
      wrap the lookAt function so it pre compiles the red and black lists.
    see: lookAt
  **/
  xplore.lookAt = function () {
    compileLists();
    return lookAt.apply(this, arguments);
  };

  /**
    summary:
      Manually push a property to the redlist to prevent calling toString on it
    name: String
  **/
  xplore.redlist = function (name) {
    redlist.push('' + name);
  };

  /**
    summary:
      Manually push a property name to the blacklist to completely ignore it
    name: String
  **/
  xplore.blacklist = function (name) {
    blacklist.push('' + name);
  };

  /**
    summary:
      Return the redlist array.
    returns: Array
  **/
  xplore.getRedlist = function () {
    return redlist;
  };
  xplore.redlist_arr = redlist;

  /**
    summary:
      Return the blacklist array.
    returns: Array
  **/
  xplore.getBlacklist = function () {
    return blacklist;
  };
  xplore.blacklist_arr = blacklist;

  /**
    summary:
      Provide a quick way to test any object if it is breaking Xplore
    description:
      Prints all the objects that are being looked at one-by-one.
      The final Info message will be the property that is causing an issue.
  **/
  xplore.test = function (obj) {
    compileLists();
    var obj_arr = []
      for (var x in obj) {
      obj_arr.push(x);
    }
    obj_arr.sort();
    for (var i = 0; i < obj_arr.length; i++) {
      if (!(i % 100)) {
        gs.flushMessages(); // messages can only contain 100 max
      }
      x = obj_arr[i];
      if (blacklistStr.indexOf(',' + x + ',') < 0) {
        gs.addInfoMessage(i + ': ' + x);
        lookAt(obj[x]);
      } else {
        gs.addErrorMessage(i + ': Blacklisted: ' + x);
      }
    }
    gs.addInfoMessage('Xplore test completed successfully.');
  }

  // #public: String
  // version number of this script [Letter and Patch number].[hotfix].[internal version]
  xplore.version = "G1.0.2";

  return xplore;
})();
