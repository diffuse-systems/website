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
  const forcedFrench = url.searchParams.get('lang') === 'fr';
  if (forcedFrench) {
    if (read('ds_choice') === 'yes') store('ds_lang', 'fr');
    url.searchParams.delete('lang');
    if (location.protocol !== 'file:') history.replaceState(null, '', url.pathname + url.search + url.hash);
  } else if (lang === 'fr' && read('ds_choice') === 'yes' && read('ds_lang') === 'en' && (/\/(?:index\.html)?$/.test(location.pathname))) {
    const english = document.querySelector('[data-lang="en"]');
    if (english) location.replace(english.href + location.hash);
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
