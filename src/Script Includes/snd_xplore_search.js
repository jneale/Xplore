/**
  summary:
    Search script and XML fields on tables for a given string.
  description:
    Automatically finds the script and XML fields and performs queries on each
    in order to build up a result set of all the records matching the queried
    search term.
  param: search [String]
    The string to search for, e.g. gs.log
  param: options [Object] Optional
    An object containing configuration options
    - markdown: [Boolean] Format the result as a MarkDown string. Defaults false.
    - case_sensitive: [Boolean] Make searches case sensitive. Default false.
  returns: Array
  e.g.
  [
    {
      'table': '<table name>':
      'count': 1
      'matches': [
        {
          'sys_id': '<record sys_id>',
          'label': '<record label>',
          'fields': [
            {
              'exact': 1,
              'count': 1,
              'name': 'script',
              'value': 'string containing the search term'
            }
          ]
        }
      ],
      'query': 'scriptCONTAINSgs.log'
    }
  ]
  usage:
    snd_xploreSearch('gs.log', {markdown: 1});
**/
function snd_xploreSearch(search, options) {


  function console(msg) {
    //gs.print(msg);
  }

  function getScriptTables() {
    //console('--> getScriptTables');

    var tables = {}, t;

    var gr = new GlideRecord('sys_dictionary');
    gr.addQuery('internal_type', 'CONTAINS', 'script').
      addOrCondition('internal_type', '=', 'xml');
    gr.addQuery('sys_class_name', '!=', 'wf_activity_variable');
    gr.query();

    while (gr.next()) {
      //console(gr.getValue('name') + ' => ' + gr.getValue('element'));

      t = ensure(tables, gr.getValue('name'), []);
      t.push(gr.getValue('element'));
    }

    //console('<-- getScriptTables');
    return tables;
  }

  function ensure(obj, id, def) {
    if (!(id in obj)) obj[id] = def;
    return obj[id];
  }

  function forEach(a, fn) {
    if (a instanceof Array) {
      for (var i = 0; i < a.length; i++) {
        if (fn(a[i], i) === false) return;
      }
    } else {
      for (var x in a) {
        if (fn(a[x], x) === false) return;
      }
    }
  }

  function getMatches(gr, fields) {
    var result = [],
        match,
        temp;

    for (var i = 0; i < fields.length; i++) {

      temp = {
        exact: 1,
        count: 0,
        name: fields[i],
        value: gr.getValue(fields[i])
      };

      if (temp.value && (match = temp.value.match(searchExact))) {

        console('Exact match on ' + gr.sys_class_name + '.' + gr.sys_id + '.' + temp.name);
        temp.count = match.length;
        result.push(temp);

      } else if (searchInexact && temp.value && (match = temp.value.match(searchInexact))) {

        console('Non exact match on ' + gr.sys_class_name + '.' + gr.sys_id + '.' + temp.name);
        temp.exact = 0;
        temp.count = match.length;
        result.push(temp);

      } else {

        console(' ! No match on ' + gr.sys_class_name + '.' + gr.sys_id + '.' + temp.name + ' ! ');
        return false;
      }

    }
    return result;
  }

  function sortByProp(arr, prop) {
    arr.sort(function (a, b) {
      if (a[prop] > b[prop]) return 1;
      if (b[prop] > a[prop]) return -1;
      return 0;
    });
  }

  function escapeForRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  function formatToString(results) {

    function printMatches(table, matches) {
      var str = '', m;
      for (var i = 0; i < matches.length; i++) {
        m = matches[i];
        str += '- #### [' +  m.label + '](' + baseUrl + '/' + table + '.do?sys_id=' + m.sys_id + ')\n';
        str += '  - Created by: ' + m.created_by + ' on ' + m.created_on + '\n';
        str += '  - Updated by: ' + m.updated_by + ' on ' + m.updated_on + '\n';
        str += printFields(m.fields);
        str +='\n';
      }
      return str;
    }

    function printFields(fields) {
      var str = '', temp;
      for (var i = 0; i < fields.length; i++) {
        temp = fields[i];
        str += '  - ' + temp.name + ' (' + temp.count + ' ';
        str += temp.exact ? 'exact' : 'inexact';
        str += temp.count == 1 ? ' match' : ' matches';
        str += ')\n';
        str += extractMatches(temp.value);
      }
      return str;
    }

    function extractMatches(str) {
      var e = new RegExp(searchExtract, 'g' + (options.case_sensitive ? '' : 'i'));
      var m, result = '';
      while ((m = e.exec(str))) {
        result += '    - `' + m[0].trim() + '`\n';
      }
      return result;
    }

    var str = '# Search results for "' + search + '"\n\n';
    forEach(results, function (result) {
      str += '--------------------------------\n';
      str += '# Table: [' + result.label + ' [' + result.table + ']]';
      str += '(' + baseUrl + '/' + result.table + '_list.do?sysparm_query=' + result.query + ')\n';
      str += '### Matching records: ' + result.count + '\n';
      str += '\n';
      str += printMatches(result.table, result.matches);
    });
    return str;
  }

  options = options || {};
  var escapedSearch = escapeForRegex(search);
  var baseUrl = options.base_url || 'https://' + gs.getProperty('instance_name') + '.service-now.com';
  var searchExact = new RegExp(escapedSearch, 'g');
  var searchInexact = options.case_sensitive ? false : new RegExp(escapedSearch, 'gi');
  var searchExtract = '.*' + escapedSearch + '.*';
  var results = [];

  forEach(getScriptTables(), function (fields, table) {
    var gr, q, i, t;

    gr = new GlideRecord(table);

    if (!gr.isValid()) {
      //console('Invalid table: ' + table);
      return;
    }

    q = gr.addQuery(fields[0], 'CONTAINS', search);
    forEach(fields.slice(1), function(field) {
      q.addOrCondition(field, 'CONTAINS', search);
    });

    gr.query();

    //console('Searching... ' + table + ' > ' + fields.join(', '));

    if (gr.hasNext()) {

      t = [];
      i = 0;
      while (gr._next()) {
        i++;
        t.push({
          sys_id: gr.getValue('sys_id'),
          label: gr.getDisplayValue(),
          fields: getMatches(gr, fields),
          created_by: gr.getValue('sys_created_by'),
          created_on: gr.getValue('sys_created_on'),
          updated_by: gr.getValue('sys_updated_by'),
          updated_on: gr.getValue('sys_updated_on')
        });
      }

      // sort the matching records by record label (display value)
      sortByProp(t, 'label');

      results.push({
        table: table,
        label: gr.getLabel(),
        query: gr.getEncodedQuery(),
        matches: t,
        count: i
      });

    } else {

      //console(' ! No matches ! ');

    }

  });

  // sort the final results by table lable
  sortByProp(results, 'label');

  return options.markdown ? formatToString(results) : results;
}

//snd_xploreSearch('utils', {markdown: true, case_sensitive: false});