function snd_xplore_glasses() {

  try {
    load();
  } catch (e) {
    log('Error loading snd_xplore_glasses: ' + e);
    log(e);
  }

  function log(message) {
    /* eslint-disable no-console */
    if (typeof console == "object" && typeof console.log == 'function') {
     console.log(message);
    }
  }

  function load() {
    var top = window.top;
    var title = "Xplore: the professional ServiceNow developer toolkit.";
    var id = 'snd_xplore_glasses_icon';
    var isPolaris = top.NOW && top.NOW.hasOwnProperty('isPolarisWrapper') && top.NOW.isPolarisWrapper;
    var isUI16 = !isPolaris && top.hasOwnProperty('$j') && top.$j('.navpage-header-content').length > 0;

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
      // Deprecated in v4.13
      //injectUI15();
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
       ' aria-describedby="contextual_zone_' + id + '_button" aria-expanded="false">' +
       '<now-icon class="contextual-zone-icon" icon="' + getPolarisIcon() + '" dir="ltr"></now-icon>' +
       '<now-tooltip id="' + id + '-tooltip" aria-label="' + title + '" role="tooltip" dir="ltr" aria-hidden="true"></now-tooltip>' +
      '</span>' +
      '<span></span>'; // this end span is just to make the gap match between icons
      var target = findElement(path, top.window.document);
      if (target) $j(target).prepend(widgetHtml);

      log('Loaded snd_xplore_glasses for Next Experience');
    }

    function getPolarisIcon() {
      var version = top.hasOwnProperty('___NOW_DESIGN_SYSTEM_PACKAGES___') ?
                    top.___NOW_DESIGN_SYSTEM_PACKAGES___['@servicenow/now-icon'] : "";
      if (parseInt(version, 10) >= 22) {
        // version 22 was introduced in Tokyo which includes the glasses icon
        return 'glasses-outline';
      }
      return 'code-edit-outline';
    }

    function injectUI16() {
      var widgetHtml = '<div class="navpage-header-content">' +
          '<button data-placement="auto" id="' + id + '" class="btn btn-icon icon-glasses"' +
          ' title="' + title + '" data-original-title="Xplore" onclick="window.open(\'/snd_xplore.do\', \'_blank\');">' +
            '<span class="sr-only">Xplore</span>' +
          '</button></div>';
      top.$j('#sysparm_search').parents('div.navpage-header-content').first().after(widgetHtml);

      log('Loaded snd_xplore_glasses for UI16');
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

      log('Loaded snd_xplore_glasses for UI15');
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
  }
}

if (typeof jQuery === 'function') {
  jQuery(document).ready(snd_xplore_glasses);
}