const _GS_PANEL_ID="db-global-results-panel";let _GS_debounceTimer=null;function _dbClearGlobalPanel(){const e=document.getElementById(_GS_PANEL_ID);e&&e.remove()}function _dbRenderGlobalResult(e){_dbClearGlobalPanel();const t={local:"var(--teal)",regional:"var(--amber)",chakudya:"var(--blue)",combined:"var(--green)"}[e.sourceUsed]||"var(--text-dim)",d={local:"Local DB",regional:"Regional FCT",chakudya:"Chakudya (CNR)",combined:"Combined"}[e.sourceUsed]||e.sourceUsed,n=Math.round(100*(e.confidenceScore??0)),o=e.lastUpdated?`<span style="color:var(--text-dim);font-size:11px">Updated: ${e.lastUpdated}</span>`:"",i=null!=e.fiber?`<div style="font-size:11px;color:var(--text-dim)">Fiber: <b>${e.fiber}g</b></div>`:"",a=null!=e.sugar?`<div style="font-size:11px;color:var(--text-dim)">Sugar: <b>${e.sugar}g</b></div>`:"",r=null!=e.sodium?`<div style="font-size:11px;color:var(--text-dim)">Sodium: <b>${(1e3*e.sodium).toFixed(0)}mg</b></div>`:"",l=document.createElement("div");l.id=_GS_PANEL_ID,l.style.cssText="margin-top:14px",l.innerHTML=`\n    <div class="card" style="border:1px solid ${t}40">\n      <div class="card-header">\n        <div class="card-title" style="color:${t}"> Global Search Result</div>\n        <div class="card-badge" style="color:${t};border-color:${t}40">\n          ${d} · ${n}% match\n        </div>\n      </div>\n      <div class="card-body" style="padding:14px">\n        <div style="font-weight:700;font-size:14px;color:var(--text-bright);margin-bottom:6px">${e.name}</div>\n        <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">${e.cat||""} ${o}</div>\n        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center;margin-bottom:10px">\n          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">\n            <div style="font-size:18px;font-weight:700;color:var(--amber)">${e.kcal??"—"}</div>\n            <div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">kcal</div>\n          </div>\n          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">\n            <div style="font-size:18px;font-weight:700;color:var(--blue)">${e.pro??"—"}</div>\n            <div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">PRO g</div>\n          </div>\n          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">\n            <div style="font-size:18px;font-weight:700;color:var(--teal)">${e.cho??"—"}</div>\n            <div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">CHO g</div>\n          </div>\n          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">\n            <div style="font-size:18px;font-weight:700;color:var(--green)">${e.fat??"—"}</div>\n            <div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">FAT g</div>\n          </div>\n          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">\n            <div style="font-size:18px;font-weight:700;color:var(--text-dim)">${e.kj??"—"}</div>\n            <div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">kJ</div>\n          </div>\n        </div>\n        <div style="display:flex;gap:14px;flex-wrap:wrap">${i}${a}${r}</div>\n        <div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">\n          Values per 100g · Source: ${d} · Confidence: ${n}%\n        </div>\n      </div>\n    </div>`;const s=document.getElementById("db-no-results");if(s?.parentNode)s.parentNode.insertBefore(l,s.nextSibling);else{const e=document.getElementById("db-tbody");e?.parentNode?.parentNode?.parentNode?.appendChild(l)}}function _dbShowGlobalLoading(e){_dbClearGlobalPanel();const t=document.createElement("div");t.id=_GS_PANEL_ID,t.style.cssText="margin-top:14px",t.innerHTML=`\n    <div class="card" style="border:1px solid rgba(100,200,255,.2)">\n      <div class="card-body" style="padding:18px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text-dim)">\n         Searching global databases for "<b style="color:var(--teal)">${e}</b>"…\n        <div style="margin-top:6px;font-size:11px">Chakudya Nutrition Registry (CNR)</div>\n      </div>\n    </div>`;const d=document.getElementById("db-no-results");d?.parentNode&&d.parentNode.insertBefore(t,d.nextSibling)}function _dbGlobalSearchLegacy(e){clearTimeout(_GS_debounceTimer),!e||e.length<2||"undefined"==typeof NTFoodSearch||(_dbShowGlobalLoading(e),_GS_debounceTimer=setTimeout(async()=>{try{const t=await NTFoodSearch.search(e,{enrich:!1});if(!t)return void _dbClearGlobalPanel();if((document.getElementById("db-search")?.value||"").trim().toLowerCase()!==e.toLowerCase())return;_dbRenderGlobalResult(t)}catch(e){_dbClearGlobalPanel()}},600))}

/* ── CNR-powered global search ───────────────────────────────────────────
 * dbRender() calls _dbGlobalSearch(q) when the built-in Malawi food list has
 * no match. It now asks the Chakudya Nutrition Registry (through the Oasis
 * proxy, see js/cnr.js) for typo-tolerant matches and shows a tappable list.
 * If CNR has no match it offers "Did you mean" suggestions, and if CNR is
 * unavailable (or cnr.js isn't loaded) it falls back to the previous
 * single-card lookup, kept above as _dbGlobalSearchLegacy.
 * Values are shown exactly as stored, labelled with their measure
 * (CNR rows are usually "100g", but some are per household measure).
 */
let _cnrSearchSeq = 0;

function _cnrEsc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function _cnrNum(v, digits) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return null;
  return +Number(v).toFixed(digits === undefined ? 1 : digits);
}

function _cnrShow(v, digits) {
  const n = _cnrNum(v, digits);
  return n === null ? '\u2014' : n;
}

function _cnrMountPanel(html) {
  _dbClearGlobalPanel();
  const el = document.createElement('div');
  el.id = _GS_PANEL_ID;
  el.style.cssText = 'margin-top:14px';
  el.innerHTML = html;
  const anchor = document.getElementById('db-no-results');
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  } else {
    const tb = document.getElementById('db-tbody');
    const host = tb && tb.parentNode && tb.parentNode.parentNode && tb.parentNode.parentNode.parentNode;
    if (host) host.appendChild(el);
  }
  return el;
}

function _cnrMeasureLabel(r) {
  const m = r.measure ? String(r.measure).trim() : '';
  return m ? 'Per ' + m : 'Per serving';
}

function _cnrAssumedList(flags) {
  if (!flags) return '';
  return String(flags).split(';').map(function (f) {
    return f.split(':')[0].replace(/_(mg|mcg|g)$/i, '').replace(/_/g, ' ').trim();
  }).filter(Boolean).join(', ');
}

function _cnrDetailHtml(r) {
  const cell = function (val, color, label) {
    return '<div style="background:var(--surface2);border-radius:6px;padding:10px 4px">' +
      '<div style="font-size:18px;font-weight:700;color:' + color + '">' + _cnrEsc(val) + '</div>' +
      '<div style="font-size:11px;color:var(--text-dim);letter-spacing:1px">' + label + '</div></div>';
  };
  const extra = function (label, val, unit) {
    const n = _cnrNum(val, 1);
    return n === null ? '' : '<div style="font-size:11px;color:var(--text-dim)">' + label +
      ': <b>' + n + unit + '</b></div>';
  };
  const micros = [
    ['Calcium', r.calcium_mg, 'mg'], ['Iron', r.iron_mg, 'mg'], ['Zinc', r.zinc_mg, 'mg'],
    ['Magnesium', r.magnesium_mg, 'mg'], ['Potassium', r.potassium_mg, 'mg'],
    ['Vit C', r.vitc_mg, 'mg'], ['Folate', r.folate_mcg, 'mcg'], ['Vit A (RAE)', r.vita_rae_mcg, 'mcg'],
    ['Vit B12', r.vitb12_mcg, 'mcg'], ['Iodine', r.iodine_mcg, 'mcg']
  ].map(function (m) { return extra(m[0], m[1], m[2]); }).join('');
  const assumed = _cnrAssumedList(r.data_quality_flags);
  return '<div style="padding:12px 0 4px">' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center;margin-bottom:10px">' +
      cell(_cnrShow(r.kcal, 0), 'var(--amber)', 'kcal') +
      cell(_cnrShow(r.protein_g), 'var(--blue)', 'PRO g') +
      cell(_cnrShow(r.carbs_g), 'var(--teal)', 'CHO g') +
      cell(_cnrShow(r.fat_g), 'var(--green)', 'FAT g') +
      cell(_cnrShow(r.kj, 0), 'var(--text-dim)', 'kJ') +
    '</div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">' +
      extra('Fibre', r.fiber_g, 'g') + extra('Sugar', r.sugar_total_g, 'g') + extra('Sodium', r.sodium_mg, 'mg') +
    '</div>' +
    (micros ? '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">' + micros + '</div>' : '') +
    '<div style="margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">' +
      _cnrEsc(_cnrMeasureLabel(r)) + ' \u00b7 Source: Chakudya (CNR)' +
      (r.mfct_code ? ' \u00b7 ' + _cnrEsc(r.mfct_code) : '') +
    '</div>' +
    (assumed ? '<div style="margin-top:4px;font-size:11px;color:var(--amber)">Assumed values: ' + _cnrEsc(assumed) + '</div>' : '') +
  '</div>';
}

function _cnrListPanel(query, rows) {
  const items = rows.map(function (r, i) {
    const open = i === 0;
    return '<div style="border-top:1px solid var(--border,rgba(255,255,255,.08))">' +
      '<div data-cnr-i="' + i + '" role="button" tabindex="0" style="cursor:pointer;padding:10px 4px;display:flex;justify-content:space-between;gap:10px;align-items:center">' +
        '<div style="min-width:0">' +
          '<div style="font-weight:700;font-size:13px;color:var(--text-bright)">' + _cnrEsc(r.food_name || r.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-dim)">' + _cnrEsc(r.category || '') +
            (r._match_type === 'fuzzy' ? ' \u00b7 close match' : '') + '</div>' +
        '</div>' +
        '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:right;white-space:nowrap">' +
          _cnrShow(r.kcal, 0) + ' kcal<br>P ' + _cnrShow(r.protein_g) + ' \u00b7 C ' + _cnrShow(r.carbs_g) + ' \u00b7 F ' + _cnrShow(r.fat_g) +
        '</div>' +
      '</div>' +
      '<div data-cnr-detail="' + i + '" style="' + (open ? '' : 'display:none') + '">' + _cnrDetailHtml(r) + '</div>' +
    '</div>';
  }).join('');
  return '<div class="card" style="border:1px solid rgba(100,200,255,.25)">' +
    '<div class="card-header"><div class="card-title" style="color:var(--blue)"> Global Search Results</div>' +
    '<div class="card-badge" style="color:var(--blue);border-color:rgba(100,200,255,.25)">Chakudya (CNR) \u00b7 ' + rows.length + ' match' + (rows.length === 1 ? '' : 'es') + '</div></div>' +
    '<div class="card-body" style="padding:6px 14px 12px">' + items + '</div></div>';
}

function _cnrSuggestPanel(query, suggestions) {
  const chips = suggestions.map(function (s, i) {
    return '<span data-cnr-suggest="' + i + '" role="button" tabindex="0" style="cursor:pointer;display:inline-block;margin:4px 6px 0 0;padding:4px 10px;border-radius:14px;border:1px solid rgba(100,200,255,.35);color:var(--blue);font-size:12px">' + _cnrEsc(s) + '</span>';
  }).join('');
  return '<div class="card" style="border:1px solid rgba(100,200,255,.2)"><div class="card-body" style="padding:14px">' +
    '<div style="font-size:12px;color:var(--text-dim)">No close match for \u201c<b style="color:var(--teal)">' + _cnrEsc(query) + '</b>\u201d. Did you mean:</div>' +
    '<div style="margin-top:6px">' + chips + '</div></div></div>';
}

function _cnrBindPanel(panel, suggestions) {
  const activate = function (target) {
    const sug = target.closest('[data-cnr-suggest]');
    if (sug) {
      const input = document.getElementById('db-search');
      const text = suggestions && suggestions[Number(sug.getAttribute('data-cnr-suggest'))];
      if (input && text) {
        input.value = text;
        if (typeof dbRender === 'function') dbRender();
      }
      return;
    }
    const item = target.closest('[data-cnr-i]');
    if (item) {
      const d = panel.querySelector('[data-cnr-detail="' + item.getAttribute('data-cnr-i') + '"]');
      if (d) d.style.display = d.style.display === 'none' ? '' : 'none';
    }
  };
  panel.addEventListener('click', function (ev) { activate(ev.target); });
  panel.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(ev.target); }
  });
}

function _dbGlobalSearch(e) {
  if (typeof CNR === 'undefined') return _dbGlobalSearchLegacy(e);
  clearTimeout(_GS_debounceTimer);
  if (!e || e.length < 2) return;
  const seq = ++_cnrSearchSeq;
  _dbShowGlobalLoading(e);
  _GS_debounceTimer = setTimeout(async function () {
    try {
      const stillCurrent = function () {
        const box = document.getElementById('db-search');
        return seq === _cnrSearchSeq && (box ? box.value : '').trim().toLowerCase() === e.toLowerCase();
      };
      const rows = await CNR.searchFoods(e, { maxResults: 8 });
      if (!stillCurrent()) return;
      if (rows.length) {
        _cnrBindPanel(_cnrMountPanel(_cnrListPanel(e, rows)));
        return;
      }
      const sugg = (await CNR.autocomplete(e, { maxResults: 5 })).filter(function (s) {
        return s && String(s).toLowerCase() !== e.toLowerCase();
      });
      if (!stillCurrent()) return;
      if (sugg.length) {
        _cnrBindPanel(_cnrMountPanel(_cnrSuggestPanel(e, sugg)), sugg);
        return;
      }
      _dbGlobalSearchLegacy(e); // CNR had nothing: previous single-card lookup
    } catch (err) {
      _dbGlobalSearchLegacy(e);
    }
  }, 450);
}
