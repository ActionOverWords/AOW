/*!
 * ActionOverWords Index — Cookie Consent Banner
 * ------------------------------------------------------------------------
 * Self-contained, dependency-free (no CDN, no external requests). Include
 * this one file on every page with:
 *     <script src="cookie-consent.js"></script>
 *
 * What it stores: ONE thing, in plain browser localStorage — a JSON object
 * recording whether the visitor has turned on the optional Analytics
 * category. That's it. This deliberately does NOT use the site's shared
 * `window.storage` backend (see aow-index.html) — that's a per-app data
 * store that may not exist once the site moves off its current prototype
 * hosting (see phase2-setup.md), and consent state needs to keep working
 * the same way before and after that move, without ever leaving the visitor's
 * own browser.
 *
 * Public API (available as soon as this file has run):
 *   window.AOWConsent.get('necessary' | 'analytics')  -> boolean
 *   window.AOWConsent.openPreferences()                -> reopens the panel
 *   window.AOWConsent.onChange(fn)                     -> fn(consentObject) on every save/accept
 *
 * There is no Analytics script wired up anywhere on the site today, so the
 * toggle below currently does nothing but record a preference. If/when
 * privacy-friendly analytics is ever added, gate it like this:
 *
 *   if (window.AOWConsent.get('analytics')) { loadAnalytics(); }
 *   window.AOWConsent.onChange(function (c) { if (c.analytics) loadAnalytics(); });
 */
(function () {
  'use strict';

  if (window.AOWConsent) return; // don't double-initialize if included twice

  var STORAGE_KEY = 'aow_cookie_consent';
  var VERSION = 1;
  var listeners = [];
  var els = {};
  var lastFocused = null;

  /* ---------- consent state (plain localStorage only) ---------- */

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.version === VERSION && typeof parsed.analytics === 'boolean') return parsed;
      return null;
    } catch (e) {
      return null; // private browsing, storage disabled, or corrupt value — treat as "no choice yet"
    }
  }

  function writeConsent(analytics) {
    var value = {
      necessary: true,
      analytics: !!analytics,
      version: VERSION,
      updatedAt: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* Storage unavailable — the choice just won't be remembered next visit.
         Nothing on the site is gated on this succeeding, so it's not fatal. */
    }
    listeners.forEach(function (fn) {
      try { fn(value); } catch (e) { /* one bad listener shouldn't break the rest */ }
    });
    return value;
  }

  /* ---------- styles (scoped under .aow-cc; matches the site's brand tokens) ---------- */

  var CSS = ''
    + '.aow-cc{--cc-bg:#FFFFFF;--cc-border:#DFE3E9;--cc-text:#171A21;--cc-muted:#5B6472;--cc-brand:#12836F;--cc-brand-dark:#0C6355;--cc-tint:#E1F3EF;--cc-shadow:0 8px 24px rgba(16,24,40,.16),0 2px 6px rgba(16,24,40,.08);font-family:"Public Sans",system-ui,-apple-system,sans-serif;}'
    + '@media (prefers-color-scheme:dark){.aow-cc{--cc-bg:#1D222B;--cc-border:#2B313C;--cc-text:#E8EAED;--cc-muted:#9CA3AF;--cc-brand:#22A98A;--cc-brand-dark:#1B8570;--cc-tint:#16332E;--cc-shadow:0 8px 24px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.4);}}'
    + 'html[data-theme="dark"] .aow-cc{--cc-bg:#1D222B;--cc-border:#2B313C;--cc-text:#E8EAED;--cc-muted:#9CA3AF;--cc-brand:#22A98A;--cc-brand-dark:#1B8570;--cc-tint:#16332E;--cc-shadow:0 8px 24px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.4);}'
    + 'html[data-theme="light"] .aow-cc{--cc-bg:#FFFFFF;--cc-border:#DFE3E9;--cc-text:#171A21;--cc-muted:#5B6472;--cc-brand:#12836F;--cc-brand-dark:#0C6355;--cc-tint:#E1F3EF;--cc-shadow:0 8px 24px rgba(16,24,40,.16),0 2px 6px rgba(16,24,40,.08);}'
    + '.aow-cc *{box-sizing:border-box;}'
    + '.aow-cc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:999999;margin:0 auto;max-width:720px;background:var(--cc-bg);color:var(--cc-text);border:1px solid var(--cc-border);border-radius:12px;box-shadow:var(--cc-shadow);padding:18px 20px;transform:translateY(140%);visibility:hidden;pointer-events:none;transition:transform .35s ease,visibility 0s linear .35s;}'
    + '.aow-cc-banner.aow-cc-show{transform:translateY(0);visibility:visible;pointer-events:auto;transition:transform .35s ease,visibility 0s linear 0s;}'
    + '.aow-cc-text{margin:0 0 14px;font-size:13.5px;line-height:1.55;color:var(--cc-muted);}'
    + '.aow-cc-text a{color:var(--cc-brand);font-weight:600;text-decoration:none;}'
    + '.aow-cc-text a:hover{text-decoration:underline;}'
    + '.aow-cc-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}'
    + '.aow-cc-actions-end{justify-content:flex-end;margin-top:20px;}'
    + '.aow-cc-btn{font:inherit;font-size:13px;font-weight:700;padding:9px 15px;border-radius:8px;cursor:pointer;border:1px solid transparent;white-space:nowrap;}'
    + '.aow-cc-btn-primary{background:var(--cc-brand);border-color:var(--cc-brand);color:#fff;}'
    + '.aow-cc-btn-primary:hover{background:var(--cc-brand-dark);border-color:var(--cc-brand-dark);}'
    + '.aow-cc-btn-secondary{background:var(--cc-bg);border-color:var(--cc-border);color:var(--cc-text);}'
    + '.aow-cc-btn-secondary:hover{background:var(--cc-tint);}'
    + '.aow-cc-btn-ghost{background:transparent;border-color:transparent;color:var(--cc-muted);text-decoration:underline;padding-left:4px;padding-right:4px;margin-right:auto;}'
    + '.aow-cc-btn-ghost:hover{color:var(--cc-brand);}'
    + '.aow-cc-btn:focus-visible{outline:2px solid var(--cc-brand);outline-offset:2px;}'
    + '.aow-cc-backdrop{position:fixed;inset:0;background:rgba(15,20,28,.55);z-index:1000000;display:none;align-items:center;justify-content:center;padding:20px;overflow-y:auto;}'
    + '.aow-cc-backdrop.aow-cc-show{display:flex;}'
    + '.aow-cc-modal{background:var(--cc-bg);color:var(--cc-text);border-radius:12px;box-shadow:var(--cc-shadow);padding:26px 26px 22px;max-width:480px;width:100%;max-height:calc(100vh - 40px);overflow-y:auto;}'
    + '.aow-cc-modal h2{margin:0 0 6px;font-size:18px;letter-spacing:-.01em;}'
    + '.aow-cc-intro{margin:0 0 18px;font-size:13px;color:var(--cc-muted);line-height:1.55;}'
    + '.aow-cc-row{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;padding:14px 0;border-top:1px solid var(--cc-border);}'
    + '.aow-cc-row-title{font-size:13.5px;font-weight:700;margin:0 0 4px;}'
    + '.aow-cc-row-desc{font-size:12.5px;line-height:1.5;color:var(--cc-muted);margin:0;}'
    + '.aow-cc-locked{flex:none;font-size:11px;font-weight:700;color:var(--cc-muted);background:var(--cc-tint);border-radius:20px;padding:4px 10px;white-space:nowrap;margin-top:2px;}'
    + '.aow-cc-switch{position:relative;flex:none;display:inline-block;width:38px;height:22px;margin-top:2px;}'
    + '.aow-cc-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}'
    + '.aow-cc-slider{position:absolute;inset:0;background:var(--cc-border);border-radius:22px;transition:background .15s ease;pointer-events:none;}'
    + '.aow-cc-slider::before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .15s ease;box-shadow:0 1px 2px rgba(0,0,0,.3);}'
    + '.aow-cc-switch input:checked+.aow-cc-slider{background:var(--cc-brand);}'
    + '.aow-cc-switch input:checked+.aow-cc-slider::before{transform:translateX(16px);}'
    + '.aow-cc-switch input:focus-visible+.aow-cc-slider{outline:2px solid var(--cc-brand);outline-offset:2px;}'
    + '.aow-cc-modal-foot{margin:18px 0 0;padding-top:14px;border-top:1px solid var(--cc-border);font-size:12.5px;}'
    + '.aow-cc-modal-foot a{color:var(--cc-brand);font-weight:600;text-decoration:none;}'
    + '.aow-cc-modal-foot a:hover{text-decoration:underline;}'
    + '@media (max-width:480px){.aow-cc-banner{left:10px;right:10px;bottom:10px;padding:16px;}.aow-cc-actions:not(.aow-cc-actions-end){flex-direction:column;align-items:stretch;}.aow-cc-btn-ghost{margin-right:0;text-align:center;order:3;}}';

  function injectStyle() {
    var style = document.createElement('style');
    style.setAttribute('data-aow-cookie-consent', '');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ---------- markup ---------- */

  function buildDom() {
    var wrap = document.createElement('div');
    wrap.className = 'aow-cc';
    wrap.innerHTML =
      '<div class="aow-cc-banner" id="aowCCBanner" role="region" aria-label="Cookie notice" aria-hidden="true">'
        + '<p class="aow-cc-text">We use only the browser storage that’s strictly necessary to keep you signed in — no ad-tracking, no analytics active today. <a href="cookie-policy.html">Cookie Policy</a></p>'
        + '<div class="aow-cc-actions">'
          + '<button type="button" class="aow-cc-btn aow-cc-btn-ghost" data-aow-cc="manage">Manage preferences</button>'
          + '<button type="button" class="aow-cc-btn aow-cc-btn-secondary" data-aow-cc="necessary">Necessary only</button>'
          + '<button type="button" class="aow-cc-btn aow-cc-btn-primary" data-aow-cc="accept">Accept all</button>'
        + '</div>'
      + '</div>'
      + '<div class="aow-cc-backdrop" id="aowCCBackdrop">'
        + '<div class="aow-cc-modal" role="dialog" aria-modal="true" aria-labelledby="aowCCModalTitle">'
          + '<h2 id="aowCCModalTitle">Cookie preferences</h2>'
          + '<p class="aow-cc-intro">This site doesn’t run advertising or ad-tracking of any kind. Here’s exactly what’s in use.</p>'
          + '<div class="aow-cc-row">'
            + '<div><p class="aow-cc-row-title">Strictly necessary</p><p class="aow-cc-row-desc">Keeps you signed in on this device and keeps the site secure. The site can’t function without this, so it’s always on.</p></div>'
            + '<span class="aow-cc-locked">Always on</span>'
          + '</div>'
          + '<div class="aow-cc-row">'
            + '<div><p class="aow-cc-row-title">Analytics</p><p class="aow-cc-row-desc">Not currently used anywhere on this site. If privacy-friendly analytics is ever added, this is where you’d opt in — nothing loads either way today.</p></div>'
            + '<label class="aow-cc-switch"><input type="checkbox" id="aowCCAnalyticsToggle" aria-describedby="aowCCModalTitle"><span class="aow-cc-slider"></span></label>'
          + '</div>'
          + '<div class="aow-cc-actions aow-cc-actions-end">'
            + '<button type="button" class="aow-cc-btn aow-cc-btn-secondary" data-aow-cc="necessary">Necessary only</button>'
            + '<button type="button" class="aow-cc-btn aow-cc-btn-primary" data-aow-cc="save">Save preferences</button>'
          + '</div>'
          + '<p class="aow-cc-modal-foot"><a href="cookie-policy.html">Read the full Cookie Policy →</a></p>'
        + '</div>'
      + '</div>';
    document.body.appendChild(wrap);
    els.root = wrap;
    els.banner = wrap.querySelector('#aowCCBanner');
    els.backdrop = wrap.querySelector('#aowCCBackdrop');
    els.modal = wrap.querySelector('.aow-cc-modal');
    els.analyticsToggle = wrap.querySelector('#aowCCAnalyticsToggle');
  }

  /* ---------- open/close behavior ---------- */

  function showBanner() {
    els.banner.removeAttribute('aria-hidden');
    requestAnimationFrame(function () {
      els.banner.classList.add('aow-cc-show');
    });
  }
  function hideBanner() {
    els.banner.classList.remove('aow-cc-show');
    els.banner.setAttribute('aria-hidden', 'true');
  }

  function getFocusable(container) {
    var nodes = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes, function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }
  function onModalKeydown(e) {
    if (e.key === 'Escape') { closePreferences(); return; }
    if (e.key === 'Tab') {
      var focusable = getFocusable(els.modal);
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }
  function openPreferences() {
    var current = readConsent();
    els.analyticsToggle.checked = !!(current && current.analytics);
    lastFocused = document.activeElement;
    els.backdrop.classList.add('aow-cc-show');
    els.modal.querySelector('.aow-cc-btn-secondary').focus();
    document.addEventListener('keydown', onModalKeydown, true);
  }
  function closePreferences() {
    els.backdrop.classList.remove('aow-cc-show');
    document.removeEventListener('keydown', onModalKeydown, true);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function handleClick(e) {
    if (e.target === els.backdrop) { closePreferences(); return; }
    var btn = e.target.closest && e.target.closest('[data-aow-cc]');
    if (!btn) return;
    var action = btn.getAttribute('data-aow-cc');
    if (action === 'accept') {
      writeConsent(true);
      hideBanner();
      closePreferences();
    } else if (action === 'necessary') {
      writeConsent(false);
      hideBanner();
      closePreferences();
    } else if (action === 'manage') {
      openPreferences();
    } else if (action === 'save') {
      writeConsent(els.analyticsToggle.checked);
      hideBanner();
      closePreferences();
    }
  }

  /* ---------- boot ---------- */

  function init() {
    injectStyle();
    buildDom();
    els.root.addEventListener('click', handleClick);
    if (!readConsent()) showBanner();
  }

  window.AOWConsent = {
    get: function (category) {
      if (category === 'necessary') return true;
      var c = readConsent();
      return !!(c && c[category]);
    },
    openPreferences: function () {
      if (!els.root) return; // called before the page finished loading
      openPreferences();
    },
    onChange: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
