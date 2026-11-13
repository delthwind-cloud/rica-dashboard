(() => {
'use strict';
const LETTERS = ['R','A','C','I'];
const MEANING = {R:'Responsible 負責執行', A:'Accountable 最終課責', C:'Consulted 事前諮詢', I:'Informed 事後告知'};
const CYCLE = ['', 'R', 'A', 'AR', 'C', 'I'];
const EMBEDDED = `任務,類別,總經理,IT主管,行銷主管,資安工程師,系統管理員,製造部,業務部,外部廠商
ISO 27001 年度稽核準備,資安,A,R,I,R,C,C,I,C
資安政策制定與修訂,資安,A,R,C,C,I,C,C,
帳號權限定期盤點,資安,I,A,,R,R,C,C,
弱點掃描與修補,資安,I,A,,R,C,I,,C
資安事件通報與處理,資安,I,A,,R,R,C,C,C
ERP 功能變更需求,系統,I,A,C,,R,C,C,C
MES 產線資料串接,系統,I,A,,C,R,R,,C
BI 報表維護,系統,I,A,C,,R,C,C,
伺服器與網路維運,系統,,A,,C,R,I,,R
備份與災難復原演練,系統,I,A,,C,R,C,,C
官網改版企劃,行銷,C,C,AR,,C,C,C,R
SEO 與 GA4 成效追蹤,行銷,I,C,AR,,,,C,C
Google Ads 預算與投放,行銷,A,,R,,,,C,R
GEO/AEO 內容優化,行銷,I,C,AR,,,C,C,C
國際品牌推廣活動,行銷,A,I,R,,,C,R,C
新進人員系統帳號開通,行政,,A,,C,R,I,I,`;

const $ = id => document.getElementById(id);
const state = { roles: [], rows: [], cat: '', role: '', q: '', onlyIssue: false, sample: true };

// ---------- CSV ----------
function parseCSV(text) {
  const out = []; let row = [], cur = '', inQ = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cur); cur = ''; if (row.some(c => c.trim() !== '')) out.push(row); row = [];
    } else cur += ch;
  }
  row.push(cur); if (row.some(c => c.trim() !== '')) out.push(row);
  return out;
}
function csvCell(v) { return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function normalize(v) {
  const s = String(v || '').toUpperCase();
  return LETTERS.filter(l => s.includes(l)).sort((a,b)=>'AR'.includes(a)&&'AR'.includes(b)?(a<b?-1:1):0).join('') ;
}
function load(text, isSample) {
  const t = parseCSV(text);
  if (t.length < 2 || t[0].length < 3) throw new Error('CSV 至少需要「任務、類別」兩欄加一個角色欄，以及一列資料');
  state.roles = t[0].slice(2).map(s => s.trim());
  state.rows = t.slice(1).map(r => ({
    task: (r[0] || '').trim(), cat: (r[1] || '').trim() || '未分類',
    v: state.roles.map((_, i) => normalize(r[i + 2]))
  })).filter(r => r.task);
  state.sample = !!isSample;
  state.cat = ''; state.role = ''; state.q = '';
  $('q').value = ''; $('onlyIssue').checked = false; state.onlyIssue = false;
  $('sampleBadge').hidden = !state.sample;
  fillSelects(); render();
}
function toCSV() {
  const lines = [['任務','類別',...state.roles].map(csvCell).join(',')];
  state.rows.forEach(r => lines.push([r.task, r.cat, ...r.v].map(csvCell).join(',')));
  return '﻿' + lines.join('\n') + '\n';
}

// ---------- analysis ----------
function check(r) {
  const nA = r.v.filter(x => x.includes('A')).length;
  const nR = r.v.filter(x => x.includes('R')).length;
  const out = [];
  if (nA === 0) out.push({lv:'bad', msg:'沒有 A（無人最終課責）'});
  if (nA > 1) out.push({lv:'bad', msg:`有 ${nA} 位 A（應只有一位）`});
  if (nR === 0) out.push({lv:'bad', msg:'沒有 R（無人負責執行）'});
  return out;
}
function roleVector(j) {
  const v = {R:0,A:0,C:0,I:0};
  state.rows.forEach(r => LETTERS.forEach(l => { if (r.v[j].includes(l)) v[l]++; }));
  return v;
}

// ---------- tooltip ----------
const tip = $('tip');
function showTip(e, build) {
  tip.textContent = '';
  build(tip);
  tip.style.opacity = 1;
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth - 8) x = e.clientX - w - pad;
  if (y + h > innerHeight - 8) y = e.clientY - h - pad;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tip.style.opacity = 0; }
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

// ---------- render ----------
function fillSelects() {
  const cats = [...new Set(state.rows.map(r => r.cat))];
  const c = $('cat'); c.textContent = '';
  c.append(new Option('全部', ''));
  cats.forEach(x => c.append(new Option(x, x)));
  const r = $('role'); r.textContent = '';
  r.append(new Option('全部', ''));
  state.roles.forEach((x, i) => r.append(new Option(x, String(i))));
}
function visibleRows() {
  return state.rows.filter(r =>
    (!state.cat || r.cat === state.cat) &&
    (!state.q || r.task.toLowerCase().includes(state.q.toLowerCase())) &&
    (!state.onlyIssue || check(r).length)
  );
}
function renderKPIs() {
  const bad = state.rows.filter(r => check(r).length).length;
  const items = [
    [state.rows.length, '任務數'],
    [state.roles.length, '角色數'],
    [state.rows.length - bad, '通過檢查的任務'],
    [bad, '需處理的任務']
  ];
  const k = $('kpis'); k.textContent = '';
  items.forEach(([n, l]) => { const d = el('div', 'kpi'); d.append(el('div', 'n', String(n)), el('div', 'l', l)); k.append(d); });
}
function renderMatrix() {
  const t = $('matrix'); t.textContent = '';
  const focus = state.role === '' ? -1 : Number(state.role);
  const thead = el('thead'), hr = el('tr');
  hr.append(el('th', null, '任務'));
  state.roles.forEach((name, j) => {
    const th = el('th', 'role' + (focus >= 0 && focus !== j ? ' dim' : ''), name);
    th.tabIndex = 0; th.title = '點擊以聚焦／取消聚焦';
    const toggle = () => { state.role = focus === j ? '' : String(j); $('role').value = state.role; renderMatrix(); };
    th.addEventListener('click', toggle);
    th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    hr.append(th);
  });
  hr.append(el('th', null, '檢查'));
  thead.append(hr); t.append(thead);
  const tb = el('tbody');
  const rows = visibleRows();
  if (!rows.length) {
    const tr = el('tr'), td = el('td', 'empty-state', '沒有符合條件的任務'); td.colSpan = state.roles.length + 2; td.style.padding = '24px'; tr.append(td); tb.append(tr);
  }
  let lastCat = null;
  rows.forEach(r => {
    if (r.cat !== lastCat) {
      lastCat = r.cat;
      const tr = el('tr', 'cat'), th = el('th', null, r.cat); th.colSpan = state.roles.length + 2; tr.append(th); tb.append(tr);
    }
    const tr = el('tr');
    tr.append(el('th', null, r.task));
    r.v.forEach((val, j) => {
      const td = el('td', 'c' + (focus >= 0 && focus !== j ? ' dim' : ''));
      const b = el('button', 'cell ' + (val ? (val === 'AR' ? 'AR' : val) : 'empty'), val ? (val === 'AR' ? 'A·R' : val) : '＋');
      b.type = 'button';
      b.setAttribute('aria-label', `${r.task}／${state.roles[j]}：${val || '未指派'}（點擊切換）`);
      b.addEventListener('click', () => {
        const nxt = CYCLE[(CYCLE.indexOf(val) + 1) % CYCLE.length];
        r.v[j] = nxt; state.sample = false; $('sampleBadge').hidden = true; render();
      });
      const tipFn = e => showTip(e, n => {
        n.append(el('b', null, val ? val.split('').map(l => l).join(' + ') : '未指派'), el('br'));
        n.append(el('small', null, `${state.roles[j]}｜${r.task}`));
        if (val) val.split('').forEach(l => { n.append(el('br'), el('small', null, MEANING[l])); });
      });
      b.addEventListener('pointermove', tipFn); b.addEventListener('pointerleave', hideTip);
      b.addEventListener('focus', () => { const rc = b.getBoundingClientRect(); tipFn({clientX: rc.right, clientY: rc.top}); });
      b.addEventListener('blur', hideTip);
      td.append(b); tr.append(td);
    });
    const iss = check(r), st = el('td', 'status ' + (iss.length ? 'bad' : 'ok'));
    st.textContent = iss.length ? '✕ ' + iss[0].msg.replace(/（.*）/, '') : '✓ 正常';
    if (iss.length) st.title = iss.map(i => i.msg).join('；');
    tr.append(st); tb.append(tr);
  });
  t.append(tb);
}
function renderVectors() {
  const vecs = state.roles.map((_, j) => roleVector(j));
  const max = Math.max(1, ...vecs.map(v => v.R + v.A + v.C + v.I));
  const bars = $('bars'); bars.textContent = '';
  state.roles.forEach((name, j) => {
    const v = vecs[j], tot = v.R + v.A + v.C + v.I;
    const row = el('div', 'bar-row'), stack = el('div', 'stack');
    stack.style.width = (tot / max * 100) + '%'; stack.style.minWidth = tot ? '6px' : '0';
    LETTERS.forEach(l => {
      if (!v[l]) return;
      const s = el('div', 'seg ' + l); s.style.flex = String(v[l]);
      s.addEventListener('pointermove', e => showTip(e, n => { n.append(el('b', null, v[l] + ' 項'), el('br'), el('small', null, `${name}｜${MEANING[l]}`)); }));
      s.addEventListener('pointerleave', hideTip);
      stack.append(s);
    });
    const holder = el('div'); holder.append(stack);
    row.append(el('div', 'name', name), holder, el('div', 'tot', tot + ' 項'));
    bars.append(row);
  });
  const t = $('vec'); t.textContent = '';
  const h = el('thead'), hr = el('tr');
  ['角色', 'R', 'A', 'C', 'I', '合計'].forEach(x => hr.append(el('th', null, x)));
  h.append(hr); t.append(h);
  const tb = el('tbody');
  state.roles.forEach((name, j) => {
    const v = vecs[j], tr = el('tr');
    tr.append(el('td', null, name), ...LETTERS.map(l => el('td', null, String(v[l]))), el('td', null, String(v.R + v.A + v.C + v.I)));
    tb.append(tr);
  });
  t.append(tb);
  const ul = $('issues'); ul.textContent = '';
  let n = 0;
  state.rows.forEach(r => check(r).forEach(i => {
    n++;
    const li = el('li'); li.append(el('span', 'ic ' + i.lv, '✕'), el('span', null, `${r.task}：${i.msg}`)); ul.append(li);
  }));
  state.roles.forEach((name, j) => {
    const v = vecs[j];
    if (v.R + v.A + v.C + v.I === 0) { n++; const li = el('li'); li.append(el('span', 'ic warn', '!'), el('span', null, `${name}：未參與任何任務`)); ul.append(li); }
    else if (v.R > state.rows.length * 0.5) { n++; const li = el('li'); li.append(el('span', 'ic warn', '!'), el('span', null, `${name}：擔任 R 的任務超過一半（${v.R}／${state.rows.length}），負荷可能過重`)); ul.append(li); }
  });
  if (!n) { const li = el('li', 'empty-state'); li.append(el('span', 'ic', '✓'), el('span', null, '所有任務都通過檢查')); ul.append(li); }
}
function render() { renderKPIs(); renderMatrix(); renderVectors(); }

// ---------- events ----------
$('q').addEventListener('input', e => { state.q = e.target.value; renderMatrix(); });
$('cat').addEventListener('change', e => { state.cat = e.target.value; renderMatrix(); });
$('role').addEventListener('change', e => { state.role = e.target.value; renderMatrix(); });
$('onlyIssue').addEventListener('change', e => { state.onlyIssue = e.target.checked; renderMatrix(); });
$('btnImport').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { load(await f.text(), false); } catch (err) { alert('匯入失敗：' + err.message); }
  e.target.value = '';
});
$('btnExport').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([toCSV()], {type: 'text/csv;charset=utf-8'}));
  a.download = 'raci.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('btnReset').addEventListener('click', () => init());
$('btnTheme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
});
[['t1','p1'],['t2','p2']].forEach(([t,p]) => $(t).addEventListener('click', () => {
  [['t1','p1'],['t2','p2']].forEach(([a,b]) => { $(a).setAttribute('aria-selected', String(a === t)); $(b).hidden = b !== p; });
}));

async function init() {
  let text = EMBEDDED;
  try { const r = await fetch('data/raci.csv', {cache: 'no-cache'}); if (r.ok) text = await r.text(); } catch (_) {}
  load(text, true);
}
init();
})();
