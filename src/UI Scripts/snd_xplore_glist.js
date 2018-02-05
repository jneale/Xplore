/**
 * Allow UI Context Menus to open a prebuilt script for admins to use in Xplore.
 *
 * Thanks to Jim Coyne for the original version of this.
 * https://community.servicenow.com/community/develop/blog/2016/06/10/xplore-gliderecord-script-tool
 */
var snd_xplore_list = {};

/**
 * Open the list query in Xplore.
 *
 */
snd_xplore_list.openQuery = function openQuery() {
	var query = ('' + g_list.getFixedQuery()).replace('null', '');
	if (query == '') {
		query = ('' + g_list.getRelatedQuery()).replace('null', '');
	}

	var user_query = '' + g_list.getQuery();
	if (user_query) {
		query = query ? '^' + user_query : user_query;
	}

	var newline = '\n';
	var script = 'function run() {' + newline;
	script += '    var gr = new GlideRecord(\'' + g_list.tableName + '\');' + newline;
	if (query) {
		script += '    gr.addEncodedQuery(\'' + query + '\');' + newline;
	}
	script += '    //gr.orderBy(\'name\');' + newline;
	script += '    //gr.setLimit(100);' + newline;
	script += '    //gr.setWorkflow(false);' + newline;
	script += '    //gr.autoSysFields(false);' + newline;
	script += '    gr.query();' + newline;
	script += '    ' + newline;
	script += '    var log = [];' + newline;
	script += '    while (gr.next()) {' + newline;
	script += '        log.push(gr.getDisplayValue());' + newline;
	script += '        ' + newline;
	script += '    }' + newline;
	script += '    return log;' + newline;
	script += '}' + newline;
	script += 'run();';

	snd_xplore_list.open(script);
};

/**
 * Open the single Record in Xplore.
 *
 */
snd_xplore_list.openRecord = function openRow() {
	var newline = '\n';
	var script = 'var gr = new GlideRecord(\'' + g_list.tableName + '\');' + newline;
	script += 'gr.get(\'' + g_sysId + '\');' + newline;
	script += 'gr;';

	snd_xplore_list.open(script);
};

/**
 * Open a new Xplore window and set the script.
 *
 */
snd_xplore_list.open = function open(script) {
	// open Xplore in a new window
	var win = window.open('/snd_xplore.do');

	// when Xplore has loaded, set the script
	jQuery(win).bind('load', function(){
		win.snd_xplore_editor.setValue(script);
	});
};