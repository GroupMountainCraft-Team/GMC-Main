(() => {
  const toastEl = document.getElementById('toast');
  const topNav = document.querySelector('.top-nav');

  function syncNavMetrics() {
    if (!topNav) return;
    const navHeight = Math.ceil(topNav.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
  }

  function showToast(message, duration = 2200) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => {
        toastEl.hidden = true;
      }, 220);
    }, duration);
  }

  async function copyText(text, successText) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successText || '已复制');
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      fallback.setAttribute('readonly', 'readonly');
      fallback.style.position = 'absolute';
      fallback.style.left = '-9999px';
      document.body.appendChild(fallback);
      fallback.select();
      try {
        document.execCommand('copy');
        showToast(successText || '已复制');
      } catch (_) {
        showToast('复制失败，请手动复制');
      } finally {
        document.body.removeChild(fallback);
      }
    }
  }

  window.gmcUi = {
    showToast,
    copyText,
  };

  const revealNodes = document.querySelectorAll('.reveal');
  revealNodes.forEach((node, index) => {
    node.style.setProperty('--reveal-delay', `${Math.min(index * 55, 360)}ms`);
  });

  let observer = null;

  function revealVisibleNodes(forceAll = false) {
    revealNodes.forEach((node) => {
      if (node.classList.contains('in-view')) return;
      const rect = node.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 1.08 && rect.bottom > -80;
      if (forceAll || isVisible) {
        node.classList.add('in-view');
        if (observer) observer.unobserve(node);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            if (observer) observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealNodes.forEach((el) => observer.observe(el));
    requestAnimationFrame(() => revealVisibleNodes());
    window.addEventListener('load', () => revealVisibleNodes());
    setTimeout(() => revealVisibleNodes(), 380);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => revealVisibleNodes(), 120);
    });
  } else {
    revealVisibleNodes(true);
  }

  const mobileToc = document.getElementById('mobile-toc');

  syncNavMetrics();
  window.addEventListener('resize', syncNavMetrics);

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navOffset = topNav ? topNav.offsetHeight + 16 : 16;
      const mobileOffset = mobileToc && getComputedStyle(mobileToc).display !== 'none' ? mobileToc.offsetHeight + 10 : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - navOffset - mobileOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

      if (mobileToc && mobileToc.open) {
        mobileToc.open = false;
      }
    });
  });

  const sectionLinks = Array.from(
    document.querySelectorAll('.toc a[href^="#"], .mobile-toc-links a[href^="#"], .page-nav a[href^="#"]')
  );

  if (sectionLinks.length) {
    const ids = Array.from(
      new Set(
        sectionLinks
          .map((link) => link.getAttribute('href') || '')
          .filter((href) => href.startsWith('#'))
          .map((href) => href.slice(1))
      )
    );

    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);

    const updateActiveSection = () => {
      if (!sections.length) return;
      const navOffset = topNav ? topNav.offsetHeight + 20 : 20;
      const mobileOffset = mobileToc && getComputedStyle(mobileToc).display !== 'none' ? mobileToc.offsetHeight + 10 : 0;
      const probeY = window.scrollY + navOffset + mobileOffset;

      let activeId = sections[0].id;
      sections.forEach((section) => {
        if (section.offsetTop <= probeY) {
          activeId = section.id;
        }
      });

      sectionLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
      });
    };

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
  }

  function ensureBackToTop() {
    if (document.querySelector('.back-to-top')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '返回顶部');
    btn.textContent = '↑';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);
  }

  ensureBackToTop();
  const topBtn = document.querySelector('.back-to-top');

  function handleScrollState() {
    const isScrolled = window.scrollY > 16;
    if (topNav) topNav.classList.toggle('scrolled', isScrolled);
    if (topBtn) topBtn.classList.toggle('visible', window.scrollY > 320);
  }

  window.addEventListener('scroll', handleScrollState, { passive: true });
  handleScrollState();
})();
