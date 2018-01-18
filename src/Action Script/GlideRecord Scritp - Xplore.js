/**
 * This script add a context menu item to allow opening a prebuilt script for
 * admins from _list.do pages based on the table and query set.
 * 
 * Two things you need to set not indicated here, are the conditon, and menu
 * condition should be gs.hasRole("admin")
 * menu should be list_header
 */
(function u_previewGlideRecordScript(){
	var fixedQuery = ("" + g_list.getFixedQuery()).replace("null", "");
	if (fixedQuery == "") {
		fixedQuery = ("" + g_list.getRelatedQuery()).replace("null", "");
	}
	var query = fixedQuery;
	var listQuery = g_list.getQuery();
	if (listQuery != "") {
		if (query == "") {
			query = listQuery;
		} else {
			query += "^" + listQuery;
		}
	}
	var newLine = "\n";
	var script = "(function() {" + newLine;
	script += "    var gr = new GlideRecord('" + g_list.tableName + "');" + newLine;
	if (query != "") {
		script += "    gr.addEncodedQuery('" + query + "');" + newLine;
	}
	script += "    //gr.setLimit(100);" + newLine;
	script += "    //gr.setWorkflow(false);" + newLine;
	script += "    //gr.autoSysFields(false);" + newLine;
	script += "    gr.query();" + newLine;
	script += "    while (gr.next()) {" + newLine;
	script += "        " + newLine;
	script += "    }" + newLine;
	script += "})();";

	// open the Xplore tool in a new window
	var win = window.open('/snd_xplore.do');

	// when Xplore has loaded, set the script
	jQuery(win).bind('load', function(){
		win.snd_xplore_editor.setValue(script);
	});
})();