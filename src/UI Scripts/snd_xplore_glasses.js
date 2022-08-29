function snd_xplore_glasses () {
  if (typeof jQuery === 'function') {
    jQuery(document).ready(function () {
      var top = window.top;
      var title = "Xplore: the professional ServiceNow developer toolkit.";
      var id = 'snd_xplore_glasses_icon';
      var isPolaris = top.NOW.isPolarisWrapper;
      var isUI16 = !isPolaris && top.$j('.navpage-header-content').length > 0;

      if (typeof top.snd_xplore_loaded != 'undefined') {
        return;
      }
      top.snd_xplore_loaded = true;

      // if the user has the icon in the concourse_header UI Macro then exit here
      if (top.window.document.querySelector('#' + id)) {
        return;
      }

      if (!hasAdmin()) return;

      if (isPolaris) { // >= San Diego
        injectPolaris();
      }
      else if (isUI16) { // >= Geneva
        injectUI16();
      }
      else { // >= Fuji
        injectUI15();
      }

      function injectPolaris() {
        var path = [
          'macroponent-f51912f4c700201072b211d4d8c26010', 'shadowRoot',
          'sn-polaris-layout', 'shadowRoot',
          'sn-polaris-header', 'shadowRoot',
          '.utility-menu'
        ];

        // now-tooltip doesn't seem to work with injection this way, so title is used on the span instead
        var menu = findElement(path, top.window.document);
        var widgetHtml = '<span role="button" tabindex="0" class="contextual-zone-button polaris-enabled" ' +
         ' id="' + id + '" aria-label="' + title + '" onclick="window.open(\'/snd_xplore.do\', \'_blank\');" ' +
         ' title="' + title + '" ' +
         ' aria-describedby="contextual_zone_' + id + '_button" aria-expaneded="false">' +
         '<now-icon class="contextual-zone-icon" icon="Glasses Outline" dir="ltr"></now-icon>' +
         '<now-tooltip id="' + id + '-tooltip" aria-label="' + title + '" role="tooltip" dir="ltr" aria-hidden="true"></now-tooltip>' +
        '</span>';
        var target = findElement(path, top.window.document);
        if (target) $j(target).prepend(widgetHtml);
      }

      function injectUI16() {
        var widgetHtml = '<div class="navpage-header-content">' +
            '<button data-placement="auto" id="' + id + '" class="btn btn-icon icon-glasses"' +
            ' title="' + title + '" data-original-title="Xplore" onclick="window.open(\'/snd_xplore.do\', \'_blank\');">' +
              '<span class="sr-only">Xplore</span>' +
            '</button></div>';
        top.$j('#sysparm_search').parents('div.navpage-header-content').first().after(widgetHtml);
      }

      function injectUI15() {
        var widgetHtml = '<span id="snd_xplore_span" ' +
            'style="visibility: visible; display: inline-block; zoom: 1; vertical-align: middle;">' +
            '<span tabindex="0" onclick="window.open(\'/snd_xplore.do\', \'_blank\');"' +
            ' id="' + id + '" class="icon-glasses sn-tooltip-basic"' +
            ' style="cursor: pointer; font-size: 20px; border: 0;"' +
            ' title="' + title + '"><span class="sr-only">' + title +
            '</span></span></span>';
        top.$j('#nav_header_stripe_decorations_left').append(widgetHtml);
      }

      function findElement(path, el) {
        path.forEach(function (dir, i) {
          if (!el) return;
          el = dir == 'shadowRoot'  ? el.shadowRoot : el.querySelector(dir);
          if (!el) {
            console.log('Xplore glasses could not be injected. Failed finding element ' + i + ' (' + dir + ') for path ' + path.join('/'));
          }
        });
        return el;
      }

      function findObject(path, obj) {
        path.split('.').forEach(function (dir) {
          if (!obj) return;
          obj = obj[dir];
        });
        return obj;
      }

      function hasAdmin() {
        try {
          var roles;
          if (typeof NOW == 'object') {
            roles = findObject('user.roles', NOW);
          }
          if (!roles && typeof top.NOW == 'object') {
            roles = findObject('user.roles', top.NOW);
          }
          if (!roles && typeof window.g_user == 'object' && window.g_user.roles) {
            roles = window.g_user.roles;
          }
          if (!roles) return false;
          if (typeof roles == 'string') roles = roles.split(',');
          for (var i = roles.length - 1; i > -1; i--) {
            if (roles[i] == 'admin') return true;
          }
        } catch (e) {
          jslog('Error with snd_xplore_glasses script finding user roles: ' + e);
        }
        return false;
      }
    });
  }
}
snd_xplore_glasses();