(() => {
  function parseMarkdownTable(md) {
    const lines = md
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|') && line.endsWith('|'));

    if (lines.length < 3) return { headers: [], rows: [] };

    const splitRow = (row) =>
      row
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim());

    const headers = splitRow(lines[0]);
    const rows = lines.slice(2).map(splitRow).filter((row) => row.length === headers.length);

    return { headers, rows };
  }

  function renderTable(headers, rows) {
    const thead = document.querySelector('#enchantTable thead');
    const tbody = document.querySelector('#enchantTable tbody');
    const statusText = document.getElementById('statusText');
    if (!thead || !tbody) return;

    thead.textContent = '';
    tbody.textContent = '';

    const headTr = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headTr.appendChild(th);
    });
    thead.appendChild(headTr);

    const fragment = document.createDocumentFragment();
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);

    if (statusText) {
      statusText.textContent = `已加载 ${rows.length} 条附魔数据`;
    }
  }

  function renderEmptyState(headers, keyword) {
    renderTable(headers, []);
    const tbody = document.querySelector('#enchantTable tbody');
    const statusText = document.getElementById('statusText');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = Math.max(headers.length, 1);
    td.textContent = `没有找到与“${keyword}”相关的附魔`;
    tr.appendChild(td);
    tbody.appendChild(tr);

    if (statusText) {
      statusText.textContent = '未找到匹配的附魔数据';
    }
  }

  function debounce(fn, delay = 120) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  async function loadEnchantmentSource() {
    if (typeof window.ENCHANTMENTS_MD === 'string' && window.ENCHANTMENTS_MD.trim()) {
      return window.ENCHANTMENTS_MD;
    }

    const response = await fetch('./enchantments.md');
    if (!response.ok) {
      throw new Error('Cannot load enchantments.md');
    }
    return response.text();
  }

  async function initEnchantments() {
    const text = await loadEnchantmentSource();
    const { headers, rows } = parseMarkdownTable(text);

    if (!headers.length || !rows.length) {
      throw new Error('Enchantment data is empty or invalid');
    }

    renderTable(headers, rows);

    const input = document.getElementById('searchInput');
    if (!input) return;

    const updateFilter = debounce(() => {
      const rawKeyword = input.value.trim();
      const keyword = rawKeyword.toLowerCase();
      const filtered = !keyword ? rows : rows.filter((row) => row.join(' ').toLowerCase().includes(keyword));
      if (keyword && !filtered.length) {
        renderEmptyState(headers, rawKeyword);
        return;
      }
      renderTable(headers, filtered);
    });

    input.addEventListener('input', updateFilter);
  }

  initEnchantments().catch(() => {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = '附魔表加载失败，请确认 enchantments-data.js 存在且可访问';
    }
    window.gmcUi?.showToast('附魔表加载失败，请确认 enchantments-data.js 存在');
  });
})();
