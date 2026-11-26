(() => {
  const lang = document.documentElement.lang;
  const notice = document.querySelector('#consent');
  const manage = document.querySelector('#manage-cookies');
  const read = name => {
    try {
      return document.cookie.split('; ').find(part => part.startsWith(name + '='))?.slice(name.length + 1);
    } catch { return undefined; }
  };
  const store = (name, value, age = 180 * 86400) => {
    try {
      document.cookie = name + '=' + value + '; Path=/; Max-Age=' + age + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } catch { /* The page remains usable if the browser blocks cookies. */ }
  };
  const url = new URL(location.href);
  const forced = url.searchParams.get('lang');
  if (forced) {
    if (read('ds_choice') === 'yes') store('ds_lang', forced);
    url.searchParams.delete('lang');
    if (location.protocol !== 'file:') history.replaceState(null, '', url.pathname + url.search + url.hash);
  } else if (lang === 'en' && read('ds_choice') === 'yes' && ['fr', 'de'].includes(read('ds_lang')) && (/\/(?:index\.html)?$/.test(location.pathname))) {
    const other = document.querySelector('[data-lang="' + read('ds_lang') + '"]');
    if (other) location.replace(other.href + location.hash);
    return;
  }
  notice.hidden = ['yes', 'no'].includes(read('ds_choice'));
  let returnToSettings = false;
  manage.addEventListener('click', () => {
    returnToSettings = true;
    notice.hidden = false;
    notice.querySelector('button').focus();
  });
  notice.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
    const allowed = button.dataset.consent === 'yes';
    store('ds_choice', allowed ? 'yes' : 'no');
    store('ds_lang', allowed ? lang : '', allowed ? 180 * 86400 : 0);
    notice.hidden = true;
    if (returnToSettings) manage.focus();
    returnToSettings = false;
  }));
  document.querySelectorAll('[data-lang]').forEach(link => link.addEventListener('click', () => {
    if (read('ds_choice') === 'yes') store('ds_lang', link.dataset.lang);
    if (location.hash) {
      const target = new URL(link.href); target.hash = location.hash; link.href = target.href;
    }
  }));
  const toggle = document.querySelector('.mobile-trigger');
  const menu = document.querySelector('#mobile-menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
  const tabs = [...document.querySelectorAll('[role=tab]')];
  function selectTab(next) {
    tabs.forEach(tab => {
      const active = tab === next;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const move = {ArrowLeft:(i+tabs.length-1)%tabs.length, ArrowRight:(i+1)%tabs.length, Home:0, End:tabs.length-1}[event.key];
      if (move === undefined) return;
      event.preventDefault(); selectTab(tabs[move]); tabs[move].focus();
    });
  });
})();

(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const header = document.querySelector('header');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, {passive: true}); onScroll();
  const split = heading => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); return; }
            const word = document.createElement('span');
            word.className = 'w'; word.textContent = part;
            word.style.setProperty('--d', (i++ * 70) + 'ms');
            frag.append(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      });
    };
    walk(heading);
    return i;
  };
  const hero = document.querySelector('.hero, .inner-hero');
  let after = 0;
  if (hero) {
    const title = hero.querySelector('h1');
    if (title) after = split(title) * 70 + 150;
    hero.querySelectorAll('.eyebrow, .lede, .hero-actions, .hero-art, .proof, .terminal-card').forEach(el => {
      el.classList.add('rise');
      const early = el.classList.contains('eyebrow');
      el.style.setProperty('--d', (early ? 0 : after + (el.matches('.hero-art, .proof, .terminal-card') ? 120 : 0)) + 'ms');
    });
    hero.querySelectorAll('.w, .rise').forEach(el => requestAnimationFrame(() => el.classList.add('in')));
  }
  const groups = ['.stack li', '.section-top', '.cards > *', '.editorial-grid > *', '.res-list > *', '.review-table > *',
    '.package-list > *', '.perf-grid > *', '.resource-library > *', '.questions > *', '.report-feature', '.deploy-box', '.contact-in > *',
    'main section:not(.hero):not(.inner-hero) h2', 'main section:not(.hero):not(.inner-hero) > .wrap > .eyebrow'];
  const seen = new Set();
  groups.forEach(selector => document.querySelectorAll(selector).forEach(el => {
    if (seen.has(el) || (hero && hero.contains(el))) return;
    seen.add(el);
    const siblings = [...el.parentElement.children].filter(s => s.matches(selector));
    el.classList.add('rise');
    el.style.setProperty('--d', Math.min(siblings.indexOf(el) * 90, 450) + 'ms');
  }));
  if (!('IntersectionObserver' in window)) { seen.forEach(el => el.classList.add('in')); return; }
  const watch = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in'); watch.unobserve(entry.target); }
  }), {rootMargin: '0px 0px -8% 0px', threshold: 0.12});
  seen.forEach(el => watch.observe(el));
})();
