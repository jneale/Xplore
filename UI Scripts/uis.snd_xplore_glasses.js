function snd_xplore_glasses () {
  if (typeof jQuery == 'function') {
    jQuery(document).ready(function () {
      var top = window.top;

      if (typeof top.snd_xplore_loaded != 'undefined') {
        return;
      }
      top.snd_xplore_loaded = true;

      var hasAdmin = (function () {
        var roles;
        if (typeof top.NOW == 'object') {
          roles = top.NOW.user.roles.split(',');
        } else if (typeof window.g_user == 'object' && window.g_user.roles) {
          roles = top.g_user.roles;
        }
        if (!roles) return false;
        for (var i = roles.length - 1; i > -1; i--) {
          if (roles[i] == 'admin') return true;
        }
        return false;
      })();

      var isUI16 = (function () {
        return top.$j('.navpage-header-content').length > 0;
      })();

      var title = "Xplore: the ServiceNow developer toolset.";

      var widgetHtml;

      if (hasAdmin) {
        if (isUI16) {
          widgetHtml = '<div class="navpage-header-content">' +
            '<button data-placement="auto" class="btn btn-icon icon-glasses"' +
            ' title="' + title + '" data-original-title="Xplore" onclick="window.open(\'/snd_xplore.do\', \'_blank\');">' +
              '<span class="sr-only">Xplore</span>' +
            '</button></div>';
          top.$j('#sysparm_search').parents('div.navpage-header-content').first().after(widgetHtml);
        } else {
          widgetHtml = '<span id="snd_xplore_span" ' +
            'style="visibility: visible; display: inline-block; zoom: 1; vertical-align: middle;">' +
              '<span tabindex="0" onclick="window.open(\'/snd_xplore.do\', \'_blank\');"' +
              ' class="icon-glasses sn-tooltip-basic"' +
              ' style="cursor: pointer; font-size: 20px; border: 0;"' +
              ' title="' + title + '"><span class="sr-only">' + title +
              '</span></span></span>';
          top.$j('#nav_header_stripe_decorations_left').append(widgetHtml);
        }
      }
    });
  }
}
snd_xplore_glasses();