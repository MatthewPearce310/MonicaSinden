/* Shared behaviour for all pages. Every part checks that its elements exist,
   so the same file works on Home, How I Can Help and Contact. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------- Colour themes (remembered in the visitor's browser) ----------
     Saved in localStorage, with a one-year cookie as a backup for browsers
     that block storage. js/theme-init.js re-applies it before first paint. */
  var THEME_KEY = 'msk-theme';

  function readSavedTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      if (/^[1-6]$/.test(v || '')) return v;
    } catch (e) {}
    var m = document.cookie.match(/(?:^|;\s*)msk-theme=([1-6])(?:;|$)/);
    return m ? m[1] : null;
  }
  function saveTheme(id) {
    try { localStorage.setItem(THEME_KEY, id); } catch (e) {}
    try { document.cookie = THEME_KEY + '=' + id + '; max-age=31536000; path=/; SameSite=Lax'; } catch (e) {}
  }

  var themeButtons = Array.prototype.slice.call(document.querySelectorAll('.theme-btn'));
  function setTheme(id, remember) {
    root.setAttribute('data-theme', id);
    themeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-theme-id') === id ? 'true' : 'false');
    });
    if (remember) saveTheme(id);
    // browser toolbar colour (phones) follows the theme
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) { var c = getComputedStyle(root).getPropertyValue('--bg').trim(); if (c) tc.setAttribute('content', c); }
  }
  var themeMenu = document.querySelector('[data-theme-menu]');
  var themeToggle = themeMenu && themeMenu.querySelector('.theme-toggle');
  var setThemeMenu = function (open) {
    if (!themeMenu) return;
    themeMenu.classList.toggle('open', open);
    if (themeToggle) themeToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  var calm = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // the new colours spread out from the button that was pressed
  var changeTheme = function (id, from) {
    if (id === root.getAttribute('data-theme')) return;
    if (!calm || !document.startViewTransition || !from) { setTheme(id, true); return; }
    var r = from.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    var vt;
    try { vt = document.startViewTransition(function () { setTheme(id, true); }); }
    catch (e) { root.classList.remove('theme-vt'); setTheme(id, true); return; }
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 850, easing: 'cubic-bezier(.22,.8,.24,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('theme-vt'); }, function () { root.classList.remove('theme-vt'); });
  };
  themeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      changeTheme(b.getAttribute('data-theme-id'), b);
      setThemeMenu(false);
      if (themeToggle && themeToggle.offsetParent !== null) themeToggle.focus();
    });
  });
  if (themeMenu && themeToggle) {
    themeToggle.addEventListener('click', function () { setThemeMenu(!themeMenu.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!themeMenu.contains(e.target)) setThemeMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && themeMenu.classList.contains('open')) { setThemeMenu(false); themeToggle.focus(); }
    });
    // tabbing out of the open list closes it
    themeMenu.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !themeMenu.contains(e.relatedTarget)) setThemeMenu(false);
    });
  }
  setTheme(readSavedTheme() || root.getAttribute('data-theme') || '1', false);

  // Keep other open tabs of the site in step with the visitor's choice
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && /^[1-6]$/.test(e.newValue || '')) setTheme(e.newValue, false);
  });

  /* ---------- Menu (full-screen on phones) ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var toggleText = toggle.querySelector('.nav-toggle-text');
    var lockY = 0;
    var setMenu = function (open) {
      var wasOpen = nav.classList.contains('open');
      if (open && !wasOpen) lockY = window.scrollY;
      if (open) {
        // the full-screen menu starts just below the menu button
        nav.style.setProperty('--nav-pad', Math.max(0, Math.round(toggle.getBoundingClientRect().bottom)) + 'px');
      }
      nav.classList.toggle('open', open);
      root.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (toggleText) toggleText.textContent = open ? 'Close' : 'Menu';
      // keep the reader's place on the page when the menu closes
      if (!open && wasOpen && window.scrollY !== lockY) window.scrollTo({ top: lockY, left: 0, behavior: 'instant' });
    };
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });
    // widening the window to the inline menu closes the phone menu
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 900px)');
      var onWide = function (e) { if (e.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  /* ---------- A soft pill glides to the link you hover, and rests on the current page ---------- */
  var navList = document.querySelector('.nav-list');
  if (navList) {
    var pill = document.createElement('span');
    pill.className = 'nav-ind';
    pill.setAttribute('aria-hidden', 'true');
    navList.insertBefore(pill, navList.firstChild);
    var topLinks = Array.prototype.slice.call(navList.querySelectorAll('.nav-link')).filter(function (a) { return a.parentNode.parentNode === navList; });
    var hovered = null, placed = false;
    var current = function () {
      for (var i = 0; i < topLinks.length; i++) if (topLinks[i].hasAttribute('aria-current')) return topLinks[i];
      return null;
    };
    var place = function (a) {
      var inline = window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
      if (!a || !inline) { pill.style.opacity = '0'; navList.classList.remove('nav-ind-on'); return; }
      var lr = navList.getBoundingClientRect(), r = a.getBoundingClientRect();
      if (!placed) { pill.style.transition = 'none'; }
      pill.style.width = r.width + 'px';
      pill.style.height = r.height + 'px';
      pill.style.transform = 'translate(' + (r.left - lr.left) + 'px,' + (r.top - lr.top) + 'px)';
      pill.style.opacity = hovered || a === current() ? '1' : '0';
      navList.classList.add('nav-ind-on');
      if (!placed) { void pill.offsetWidth; pill.style.transition = ''; placed = true; }
    };
    var rest = function () { hovered = null; place(current()); };
    topLinks.forEach(function (a) {
      var li = a.parentNode;
      li.addEventListener('mouseenter', function () { hovered = a; place(a); });
      li.addEventListener('focusin', function () { hovered = a; place(a); });
    });
    navList.addEventListener('mouseleave', rest);
    navList.addEventListener('focusout', function (e) { if (!e.relatedTarget || !navList.contains(e.relatedTarget)) rest(); });
    if (window.MutationObserver) {
      new MutationObserver(function () { if (!hovered) place(current()); })
        .observe(navList, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
    }
    window.addEventListener('resize', rest);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
    rest();
  }

  /* ---------- Header gains a stronger shadow once the page is scrolled ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Menu highlight while scrolling the home page ----------
     Links carry data-spy="section ids". Pages without those sections
     (How I Can Help, Contact) keep the highlight set in their HTML. */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link[data-spy]'));
  var spied = spyLinks
    .reduce(function (ids, l) { return ids.concat(l.getAttribute('data-spy').split(' ')); }, [])
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (spied.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        spyLinks.forEach(function (l) {
          var ids = l.getAttribute('data-spy').split(' ');
          if (ids.indexOf(entry.target.id) !== -1) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spied.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Home: the opening line lights up word by word as you scroll ---------- */
  var quote = document.querySelector('.statement-quote');
  if (quote) {
    var words = quote.textContent.trim().split(/\s+/);
    quote.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      quote.appendChild(s);
      if (i < words.length - 1) quote.appendChild(document.createTextNode(' '));
    });
    var spans = Array.prototype.slice.call(quote.querySelectorAll('.w'));
    var ticking = false;
    var light = function () {
      ticking = false;
      var r = quote.getBoundingClientRect(), vh = window.innerHeight || 800;
      var p = (vh * 0.92 - r.top) / (vh * 0.42 + r.height);
      var lit = Math.ceil(Math.max(0, Math.min(1, p)) * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle('on', i < lit); });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(light); }
    }, { passive: true });
    window.addEventListener('resize', light);
    light();
  }

  /* ---------- The sprig draws itself once, when it comes into view ---------- */
  var sprigs = Array.prototype.slice.call(document.querySelectorAll('.sprig'));
  if (sprigs.length) {
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          sio.unobserve(entry.target);
        });
      }, { threshold: 0.25 });
      sprigs.forEach(function (el) { sio.observe(el); });
    } else {
      sprigs.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- Breathing guide (How I Can Help) ----------
     Press the circle: it opens for 3 seconds (breathe in) and settles for
     6 seconds (breathe out), and repeats until pressed again. */
  var guide = document.querySelector('[data-breathe]');
  if (guide) {
    var orb = guide.querySelector('.breathe-orb');
    var label = orb.querySelector('span');
    var hint = guide.querySelector('.breathe-hint');
    var running = false, timer = null;
    var phase = function (inhale) {
      orb.style.setProperty('--dur', inhale ? '3s' : '6s');
      orb.style.setProperty('--s', inhale ? '1.14' : '.7');
      label.textContent = inhale ? 'Breathe in' : 'Breathe out';
      timer = setTimeout(function () { phase(!inhale); }, inhale ? 3000 : 6000);
    };
    var stop = function () {
      running = false; clearTimeout(timer);
      orb.setAttribute('aria-pressed', 'false');
      orb.style.setProperty('--dur', '1.4s');
      orb.style.setProperty('--s', '.84');
      label.textContent = 'Begin';
      hint.textContent = 'Press the circle and breathe with it.';
    };
    orb.addEventListener('click', function () {
      if (running) { stop(); return; }
      running = true;
      orb.setAttribute('aria-pressed', 'true');
      hint.textContent = 'Breathe with the circle. Press it again to stop.';
      phase(true);
    });
  }

  /* ---------- Enquiry form (Contact page) ----------
     Opens the visitor's email app with the message filled in.
     Replace ENQUIRY_EMAIL with Monica's address, or swap this handler
     for Formspree / Netlify Forms. */
  var ENQUIRY_EMAIL = 'monicasinden@gmail.com';
  var form = document.getElementById('enquiry-form');
  var status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var name = (d.get('name') || '').toString().trim();
      var email = (d.get('email') || '').toString().trim();
      var message = (d.get('message') || '').toString().trim();
      if (!name || !email || !message) {
        status.textContent = 'Please add your name, email and a short message.';
        return;
      }
      if (ENQUIRY_EMAIL.indexOf('example.com') !== -1) {
        status.textContent = 'This form is not connected to an email address yet.';
        return;
      }
      var phone = (d.get('phone') || '').toString().trim();
      var body = message + '\n\nName: ' + name + '\nEmail: ' + email + (phone ? '\nPhone: ' + phone : '');
      window.location.href = 'mailto:' + ENQUIRY_EMAIL +
        '?subject=' + encodeURIComponent('Website enquiry from ' + name) +
        '&body=' + encodeURIComponent(body);
      status.textContent = 'Your email app should open with your message ready to send.';
    });
  }


  /* ---------- Living details ----------
     Everything below is decoration. It is skipped for visitors who prefer
     reduced motion, and the page reads exactly the same without it. */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame ? function (f) { window.requestAnimationFrame(f); } : function (f) { setTimeout(f, 16); };

  /* a thin line along the bottom of the navbar shows how far down the page you are */
  var setProgress = function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--sp', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : '0');
  };
  window.addEventListener('scroll', setProgress, { passive: true });
  window.addEventListener('resize', setProgress);
  setProgress();

  if (calm) {
    /* big headings are drawn in, and groups of cards arrive one after another.
       Only things below the fold are hidden first, so nothing flashes. */
    var below = function (el) { var r = el.getBoundingClientRect(); return r.top > (window.innerHeight || 800) * 0.92; };
    var targets = [];
    var tag = function (sel, kind, step) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el, i) {
        if (!below(el) || el.closest('.statement')) return;
        el.setAttribute('data-reveal', kind);
        el.style.setProperty('--d', String((step || 0) * (i % 6)));
        targets.push(el);
      });
    };
    tag('main h2', 'rise', 0);
    tag('.trio > article, .modes .mode, .mode', 'fade', 140);
    tag('.chips li, .concerns li, .concern', 'pop', 60);
    tag('.form-panel, .ph-box, .glyph-lg', 'fade', 0);
    if (targets.length && 'IntersectionObserver' in window) {
      // a heading that is fully clipped away counts as invisible to the observer,
      // so headings are watched through the block that holds them
      var watched = [];
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          watched.forEach(function (w) { if (w.watch === entry.target) w.el.classList.add('in'); });
          rio.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.02 });
      targets.forEach(function (el) {
        var watch = el.getAttribute('data-reveal') === 'rise' && el.parentElement ? el.parentElement : el;
        watched.push({ el: el, watch: watch });
        rio.observe(watch);
      });
    } else {
      targets.forEach(function (el) { el.classList.add('in'); });
    }

    /* drifting motes of light inside the large sections */
    var sky = Array.prototype.slice.call(document.querySelectorAll('.hero, .page-hero, .approach, .closing'));
    var mote = function (host, n) {
      var box = document.createElement('div');
      box.className = 'motes paused';
      box.setAttribute('aria-hidden', 'true');
      box.style.setProperty('--h', Math.max(300, host.offsetHeight) + 'px');
      for (var i = 0; i < n; i++) {
        var m = document.createElement('i');
        m.className = 'mote';
        m.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
        m.style.setProperty('--s', (2 + Math.random() * 4).toFixed(1) + 'px');
        m.style.setProperty('--t', (16 + Math.random() * 18).toFixed(1) + 's');
        m.style.setProperty('--w', (-Math.random() * 30).toFixed(1) + 's');
        m.style.setProperty('--dx', (Math.random() * 90 - 45).toFixed(0) + 'px');
        m.style.setProperty('--o', (0.3 + Math.random() * 0.5).toFixed(2));
        box.appendChild(m);
      }
      host.insertBefore(box, host.firstChild);
      return box;
    };
    var boxes = sky.map(function (h) { return mote(h, window.innerWidth < 700 ? 8 : 14); });
    window.addEventListener('resize', function () {
      sky.forEach(function (h, i) { boxes[i].style.setProperty('--h', Math.max(300, h.offsetHeight) + 'px'); });
    });
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { entry.target.classList.toggle('paused', !entry.isIntersecting); });
      });
      boxes.forEach(function (b) { mio.observe(b); });
    } else {
      boxes.forEach(function (b) { b.classList.remove('paused'); });
    }

    /* the soft lights and stones sit at different depths as you scroll */
    var deep = Array.prototype.slice.call(document.querySelectorAll('.hero, .page-hero, .approach, .closing'));
    var parTick = false;
    var depth = function () {
      parTick = false;
      var vh = window.innerHeight || 800;
      deep.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = ((r.top + r.height / 2) - vh / 2) * -0.09;
        el.style.setProperty('--py', Math.max(-70, Math.min(70, off)).toFixed(1) + 'px');
      });
    };
    window.addEventListener('scroll', function () { if (!parTick) { parTick = true; raf(depth); } }, { passive: true });
    window.addEventListener('resize', depth);
    depth();

    if (fine) {
      /* pointer: the lights and portrait lean gently toward it */
      var tx = 0, ty = 0, cx = 0, cy = 0, moving = false;
      var follow = function () {
        cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
        root.style.setProperty('--mx', cx.toFixed(3));
        root.style.setProperty('--my', cy.toFixed(3));
        if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf(follow); else moving = false;
      };
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        tx = (e.clientX / window.innerWidth) * 2 - 1;
        ty = (e.clientY / window.innerHeight) * 2 - 1;
        if (!moving) { moving = true; raf(follow); }
      }, { passive: true });

      /* a light follows the pointer across the evening band */
      var band = document.querySelector('.approach');
      if (band) {
        band.addEventListener('pointermove', function (e) {
          var r = band.getBoundingClientRect();
          band.style.setProperty('--sx', Math.round(e.clientX - r.left) + 'px');
          band.style.setProperty('--sy', Math.round(e.clientY - r.top) + 'px');
        }, { passive: true });
      }

      /* buttons lean toward the pointer */
      Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          btn.style.translate = ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px';
        });
        btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
      });
    }
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
