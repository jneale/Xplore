function snd_xplore_glasses () {
  if (typeof jQuery === 'function' && typeof top.$j === 'function') {
    jQuery(document).ready(function () {
      var top = window.top;
      var id = 'snd_xplore_glasses_icon';

      if (typeof top.snd_xplore_loaded != 'undefined') {
        return;
      }
      top.snd_xplore_loaded = true;

      // if the user has the icon in the concourse_header UI Macro then exit here
      if (top.$j('#' + id).length) {
        return;
      }

      var hasAdmin = (function () {
        try {
          var roles;
          if (typeof top.NOW == 'object') {
            roles = top.NOW.user.roles.split(',');
          } else if (typeof window.g_user == 'object' && window.g_user.roles) {
            roles = window.g_user.roles;
          }
          if (!roles) return false;
          for (var i = roles.length - 1; i > -1; i--) {
            if (roles[i] == 'admin') return true;
          }
        } catch (e) {
          jslog('Error with snd_xplore_glasses script finding user roles: ' + e);
        }
        return false;
      })();

      var isUI16 = top.$j('.navpage-header-content').length > 0;

      var title = "Xplore: the professional ServiceNow developer toolkit.";

      var widgetHtml;

      if (hasAdmin) {

        // UI16 - Geneva
        if (isUI16) {
          widgetHtml = '<div class="navpage-header-content">' +
            '<button data-placement="auto" id="' + id + '" class="btn btn-icon icon-glasses"' +
            ' title="' + title + '" data-original-title="Xplore" onclick="window.open(\'/snd_xplore.do\', \'_blank\');">' +
              '<span class="sr-only">Xplore</span>' +
            '</button></div>';
          top.$j('#sysparm_search').parents('div.navpage-header-content').first().after(widgetHtml);
        }

        // UI15 - Fuji
        else {
          widgetHtml = '<span id="snd_xplore_span" ' +
            'style="visibility: visible; display: inline-block; zoom: 1; vertical-align: middle;">' +
              '<span tabindex="0" onclick="window.open(\'/snd_xplore.do\', \'_blank\');"' +
              ' id="' + id + '" class="icon-glasses sn-tooltip-basic"' +
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