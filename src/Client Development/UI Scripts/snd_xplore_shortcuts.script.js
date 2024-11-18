/**
 * Allow UI Context Menus to open a prebuilt script for admins to use in Xplore.
 *
 * Thanks to Jim Coyne for the original version of this.
 * https://community.servicenow.com/community/develop/blog/2016/06/10/xplore-gliderecord-script-tool
 */
var snd_xplore_shortcuts = {};

/**
 * Open the list query in Xplore.
 *
 */
snd_xplore_shortcuts.openQuery = function openQuery() {
    var query = ('' + g_list.getFixedQuery()).replace('null', '');
    if (query == '') {
        query = ('' + g_list.getRelatedQuery()).replace('null', '');
    }

    var user_query = '' + g_list.getQuery();
    if (user_query) {
        query = query ? '^' + user_query : user_query;
    }

    var encoded_query = '';
    if (query) {
        // Ensure single quotes in the query are escaped in the generated script
        query = query.replace(/'/g, '\\\'');
        encoded_query = '  gr.addEncodedQuery(\'' + query + '\');\n';
    }

    var script = [
        'function run() {',
        '  var log = [];',
        '  ',
        '  var gr = new GlideRecord(\'' + g_list.tableName + '\');',
        '  ',
        '  //gr.orderBy(\'name\');',
        '  //gr.setLimit(100);',
        '  //gr.setWorkflow(false);',
        '  //gr.autoSysFields(false);',
        '  gr.query();',
        '  ',
        '  while (gr.next()) {',
        '    log.push(gr.getDisplayValue());',
        '    ',
        '  }',
        '  return log;',
        '}',
        'run();'
	].join('\n');

    snd_xplore_shortcuts.open(script);
};

/**
 * Open the single Record in Xplore.
 *
 */
snd_xplore_shortcuts.openRecord = function openRow() {
    var newline = '\n';
    var script = 'var gr = new GlideRecord(\'' + g_list.tableName + '\');' + newline;
    script += 'gr.get(\'' + g_sysId + '\');' + newline;
    script += 'gr;';

    snd_xplore_shortcuts.open(script);
};

/**
 * Open a new Xplore window and set the script.
 *
 */
snd_xplore_shortcuts.open = function open(script) {
    // open Xplore in a new window
    var win = window.open('/snd_xplore.do');

    // when Xplore has loaded, set the script
    jQuery(win).bind('load', function(){
        win.snd_xplore_editor.setValue(script);
    });
};