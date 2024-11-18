function openInXplore() {
	var newline = '\n';
	var script = 'var gr = new GlideRecord(\'' + g_form.getTableName() + '\');' + newline;
	script += 'gr.get(\'' + g_form.getUniqueValue() + '\');' + newline;
	script += 'gr;';
	snd_xplore_shortcuts.open(script);
}