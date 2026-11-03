/* Runs in the <head> of every page, before anything is painted.
   1. Marks the page as script-enabled (the scroll animations rely on this).
   2. Re-applies the colour theme the visitor chose on an earlier page or visit,
      so there is no flash of the wrong colours.
   Theme storage: localStorage first, then a cookie as backup. Key: "msk-theme". */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var theme = null;
  try { theme = localStorage.getItem('msk-theme'); } catch (e) {}
  if (!/^[1-6]$/.test(theme || '')) {
    var m = document.cookie.match(/(?:^|;\s*)msk-theme=([1-6])(?:;|$)/);
    theme = m ? m[1] : null;
  }
  if (theme) root.setAttribute('data-theme', theme);
})();
