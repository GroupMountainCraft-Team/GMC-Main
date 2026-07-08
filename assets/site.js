(() => {
  const root = document.documentElement;
  const toastEl = document.getElementById('toast');
  const topNav = document.querySelector('.top-nav');
  const mobileToc = document.getElementById('mobile-toc');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let toastHideTimer = 0;
  let toastHiddenTimer = 0;
  let navFrame = 0;
  let sectionFrame = 0;
  let scrollFrame = 0;

  function syncNavMetrics() {
    if (!topNav) return;
    root.style.setProperty('--nav-height', `${Math.ceil(topNav.getBoundingClientRect().height)}px`);
  }

  function queueNavMetricsSync() {
    cancelAnimationFrame(navFrame);
    navFrame = requestAnimationFrame(syncNavMetrics);
  }

  function scrollToY(top) {
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });
  }

  function showToast(message, duration = 2200) {
    if (!toastEl) return;
    clearTimeout(toastHideTimer);
    clearTimeout(toastHiddenTimer);
    toastEl.hidden = false;
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    toastHideTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastHiddenTimer = setTimeout(() => {
        toastEl.hidden = true;
      }, 200);
    }, duration);
  }

  async function copyText(text, successText) {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
      showToast(successText || `已复制：${text}`);
    } catch (_) {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      fallback.setAttribute('readonly', 'readonly');
      fallback.setAttribute('aria-hidden', 'true');
      fallback.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
      document.body.appendChild(fallback);
      fallback.focus();
      fallback.select();
      fallback.setSelectionRange(0, fallback.value.length);
      try {
        const copied = document.execCommand('copy');
        if (!copied) throw new Error('Fallback copy failed');
        showToast(successText || `已复制：${text}`);
      } catch {
        showToast('复制失败，请手动复制');
      } finally {
        fallback.remove();
      }
    }
  }

  function getAnchorTarget(href) {
    if (!href || href.length <= 1) return null;
    try {
      return document.getElementById(decodeURIComponent(href.slice(1)));
    } catch {
      return document.getElementById(href.slice(1));
    }
  }

  function bindCopyAndActionTargets() {
    document.querySelectorAll('[data-copy]').forEach((el) => {
      el.addEventListener('click', () => {
        const value = el.getAttribute('data-copy') || '';
        copyText(value, el.getAttribute('data-copy-label') || `已复制：${value}`);
      });
    });

    document.querySelectorAll('[data-href]').forEach((el) => {
      el.addEventListener('click', () => {
        const href = el.getAttribute('data-href');
        if (!href) return;
        if (el.getAttribute('data-external') === 'true') {
          window.open(href, '_blank', 'noopener');
          return;
        }
        window.location.href = href;
      });
    });

    document.querySelectorAll('.cmd-item').forEach((item) => {
      if (!item.hasAttribute('role')) item.setAttribute('role', 'button');
      if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        item.click();
      });
    });
  }

  function bindAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const target = getAnchorTarget(anchor.getAttribute('href') || '');
        if (!target) return;
        event.preventDefault();
        const navOffset = topNav ? topNav.offsetHeight + 16 : 16;
        const mobileOffset = mobileToc && getComputedStyle(mobileToc).display !== 'none' ? mobileToc.offsetHeight + 10 : 0;
        const y = target.getBoundingClientRect().top + window.scrollY - navOffset - mobileOffset;
        scrollToY(y);
        if (mobileToc?.open) mobileToc.open = false;
      });
    });
  }

  function initReveal() {
    const revealNodes = document.querySelectorAll('.reveal');
    revealNodes.forEach((node, index) => {
      node.style.setProperty('--reveal-delay', `${Math.min(index * 45, 260)}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      revealNodes.forEach((node) => node.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }
    );

    revealNodes.forEach((node) => observer.observe(node));
  }

  function initSectionSpy() {
    const sectionLinks = Array.from(
      document.querySelectorAll('.toc a[href^="#"], .mobile-toc-links a[href^="#"], .page-nav a[href^="#"]')
    );
    if (!sectionLinks.length) return;

    const ids = Array.from(new Set(sectionLinks.map((link) => link.getAttribute('href')?.slice(1)).filter(Boolean)));
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const updateActiveSection = () => {
      const navOffset = topNav ? topNav.offsetHeight + 24 : 24;
      const mobileOffset = mobileToc && getComputedStyle(mobileToc).display !== 'none' ? mobileToc.offsetHeight + 10 : 0;
      const probeY = window.scrollY + navOffset + mobileOffset;
      let activeId = sections[0].id;
      sections.forEach((section) => {
        if (section.offsetTop <= probeY) activeId = section.id;
      });
      sectionLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
      });
    };

    const queueUpdate = () => {
      if (sectionFrame) return;
      sectionFrame = requestAnimationFrame(() => {
        sectionFrame = 0;
        updateActiveSection();
      });
    };

    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate, { passive: true });
    updateActiveSection();
  }

  function ensureBackToTop() {
    if (document.querySelector('.back-to-top')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '返回顶部');
    btn.textContent = '↑';
    btn.addEventListener('click', () => scrollToY(0));
    document.body.appendChild(btn);
  }

  function initScrollState() {
    ensureBackToTop();
    const topBtn = document.querySelector('.back-to-top');
    const update = () => {
      const isScrolled = window.scrollY > 16;
      topNav?.classList.toggle('scrolled', isScrolled);
      topBtn?.classList.toggle('visible', window.scrollY > 320);
    };

    window.addEventListener('scroll', () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        update();
      });
    }, { passive: true });
    update();
  }

  function warmupNavigationPrefetch() {
    const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''))) return;

    const seen = new Set();
    const links = Array.from(document.querySelectorAll('a[href]')).filter((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      try {
        const url = new URL(href, location.href);
        return url.origin === location.origin && url.href !== location.href;
      } catch {
        return false;
      }
    });

    const prefetchUrl = (url) => {
      if (seen.has(url)) return;
      seen.add(url);
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = url;
      hint.as = 'document';
      document.head.appendChild(hint);
    };

    links.forEach((link) => {
      const url = new URL(link.href, location.href).href;
      const trigger = () => prefetchUrl(url);
      link.addEventListener('pointerenter', trigger, { once: true, passive: true });
      link.addEventListener('touchstart', trigger, { once: true, passive: true });
      link.addEventListener('focus', trigger, { once: true, passive: true });
    });

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        links.slice(0, 3).forEach((link) => prefetchUrl(new URL(link.href, location.href).href));
      }, { timeout: 1800 });
    }
  }

  function registerSiteWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }

  window.gmcUi = { showToast, copyText };
  window.copyCmd = (text) => copyText(text, `已复制：${text}`);
  window.copyIP = () => copyText('91gmc.xyz', '服务器 IP 已复制');

  syncNavMetrics();
  window.addEventListener('load', queueNavMetricsSync);
  window.addEventListener('resize', queueNavMetricsSync, { passive: true });
  window.addEventListener('orientationchange', queueNavMetricsSync, { passive: true });

  bindCopyAndActionTargets();
  bindAnchorScroll();
  initReveal();
  initSectionSpy();
  initScrollState();
  warmupNavigationPrefetch();
  registerSiteWorker();
})();
