/* Contract Management + Vendor Management (DVDMS / NIC synced, AI/ML for manual work) */

function sourceBadge(src) {
  const map = {
    DVDMS: 'src-dvdms',
    NIC: 'src-nic',
    Tender: 'src-tender',
    Eoffice: 'src-eoffice',
    'AI/ML': 'src-aiml'
  };
  const cls = map[src] || 'src-dvdms';
  return `<span class="src-badge ${cls}">${src}</span>`;
}

function enrichContractForMgmt(c) {
  const awards = typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : [];
  const approvals = typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : [];
  const pos = typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : [];
  const grns = typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA.receipts : [];
  const award = awards.find(a => a.contractId === c.id || a.tenderId === c.tenderId) || null;
  const approval = approvals.find(a => a.id === c.id || a.tenderId === c.tenderId) || null;
  const po = pos.find(p => p.contractId === c.id || p.id === c.poId) || null;
  const grn = grns.find(g => g.poId === (po?.id || c.poId) || g.tenderId === c.tenderId) || null;
  const deliveries = (typeof DELIVERIES !== 'undefined' ? DELIVERIES : []).filter(d => d.po === c.poId || (po && d.po === po.id));

  let lifecycleStage = 'Draft';
  if (c.status === 'Active' && c.pbg === 'Expiring') lifecycleStage = 'Expiry Watch';
  else if (c.status === 'Active') lifecycleStage = 'Active';
  else if (c.pbg === 'Pending' || (award && award.pbgStatus === 'Pending')) lifecycleStage = 'PBG Pending';
  else if (award && award.loaAck === 'Pending') lifecycleStage = 'LOI Issued';
  else if (award && award.loaAck === 'Acknowledged' && award.pbgStatus !== 'Received') lifecycleStage = 'LOI Accepted';
  else if (approval && approval.status === 'Agreement signed') lifecycleStage = 'Signed';
  else if (c.status === 'In Progress' && c.pbg === 'Active') lifecycleStage = 'Signed';
  else if (award && award.checklist?.loa) lifecycleStage = 'LOI Issued';

  const saved = typeof govContractState !== 'undefined' ? govContractState.approvals[c.id] : null;
  const signedGateOk = !!(
    (award?.loaAck === 'Acknowledged' || lifecycleStage === 'Signed' || lifecycleStage === 'Active' || lifecycleStage === 'Expiry Watch') &&
    (c.pbg === 'Active' || c.pbg === 'Expiring' || award?.pbgStatus === 'Received')
  );

  const scoreSeed = (c.id.charCodeAt(c.id.length - 1) % 12) + 78;
  const monitors = (typeof CONTRACT_PERFORMANCE_MONITORS !== 'undefined' ? CONTRACT_PERFORMANCE_MONITORS : []).map(m => ({
    ...m,
    score: Math.min(98, scoreSeed + (m.weight % 7)),
    status: m.id === 'blacklist' ? 'Clear' : (m.id === 'delivery' && String(c.delivery).toLowerCase().includes('awaiting') ? 'Watch' : 'On track')
  }));

  return {
    ...c,
    award,
    approval,
    po,
    grn,
    deliveries,
    lifecycleStage,
    signedGateOk,
    approvalTimestamp: saved?.decidedOn || approval?.signedOn || (lifecycleStage === 'Active' || lifecycleStage === 'Signed' ? c.date : '—'),
    loiNo: award?.loaNo || approval?.noaNo || '—',
    loiDate: award?.loaDate || approval?.noaDate || '—',
    loiAck: award?.loaAck || '—',
    pbgRef: award?.pbgRef || c.pbgAmount || '—',
    agreementNo: approval?.agreementNo || '—',
    monitors,
    terms: {
      sla: 'On-time delivery ≥ 95% · response ≤ 48h',
      deliverySchedule: po?.schedule || c.delivery || 'As per NIT',
      tenure: `${c.startDate || '—'} → ${c.endDate || '—'}`,
      validity: c.endDate || '—',
      paymentTerms: po?.paymentTerms || 'Net 30–45 from GRN',
      pbg: c.pbgAmount || award?.pbgAmount || '5–10% SFMS / e-BG',
      penalties: 'LD auto-calculated from RFP / NIT (weekly % · capped)',
      kpis: 'Quality · Timely delivery · Communication · Packaging',
      sbg: 'As per tender (if applicable)',
      sow: c.title || 'As per tender SOW',
      deliverables: po?.lines ? `${po.lines} line items · ${po.shipTo || 'DVDMS ship-to'}` : c.delivery
    },
    aiOps: buildContractAiOps(c, award, lifecycleStage)
  };
}

function buildContractAiOps(c, award, lifecycleStage) {
  const day60 = lifecycleStage === 'Active' || lifecycleStage === 'Signed' || lifecycleStage === 'Expiry Watch';
  return {
    ld: day60
      ? { status: 'Armed', detail: 'Day-60 intimation scheduled if supply lag vs SLA; LD clause auto-applied from synced T&C.' }
      : { status: 'Not due', detail: 'LD engine arms after contract activation and supply clock start.' },
    slaAlerts: [
      { channel: 'Email', to: c.vendor, when: '02-09-2026 09:00', msg: 'SLA reminder — delivery milestone approaching' },
      { channel: 'SMS', to: 'RM · Contract cell', when: '02-09-2026 09:01', msg: 'Vendor SLA watch on ' + c.id }
    ],
    expiry: {
      endDate: c.endDate,
      alert: c.pbg === 'Expiring' || lifecycleStage === 'Expiry Watch' ? 'Renewal alert raised' : 'Monitoring',
      action: 'AI proposes renew / extend pack for RM confirm'
    },
    scorecard: {
      overall: (c.id.charCodeAt(c.id.length - 1) % 12) + 80,
      note: 'Scorecard fed from contract KPI monitors + DVDMS GRN / QC'
    }
  };
}

function getContractMgmtRows() {
  const rows = filterByCategory(typeof CONTRACTS !== 'undefined' ? CONTRACTS : [])
    .map(enrichContractForMgmt);
  return applyStagePeriodFilter(rows, contractMgmtListState, 'date');
}

function setContractMgmtPage(page) {
  contractMgmtListState.page = Math.max(1, Number(page) || 1);
  renderPage();
}

function lifecycleBadge(stage) {
  const map = {
    'LOI Issued': 'info',
    'LOI Accepted': 'info',
    'PBG Pending': 'warning',
    Draft: 'warning',
    Signed: 'success',
    Active: 'success',
    'Expiry Watch': 'danger'
  };
  return map[stage] || 'info';
}

function renderContractMgmt() {
  const meta = typeof CONTRACT_MGMT_META !== 'undefined' ? CONTRACT_MGMT_META : { sourceNote: '', lastSynced: '—', syncChannels: ['DVDMS'] };
  const rows = getContractMgmtRows();
  const paged = paginateItems(rows, contractMgmtListState.page, 10);
  contractMgmtListState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(contractMgmtListState);
  const signed = rows.filter(r => ['Signed', 'Active', 'Expiry Watch'].includes(r.lifecycleStage)).length;
  const preSign = rows.length - signed;

  return `<div class="contract-mgmt-page">
    <div class="indent-mode-banner">
      <div>
        <strong>Contract Management — synced register</strong>
        <p>${meta.sourceNote}</p>
        <div class="src-badge-row">${(meta.syncChannels || []).map(sourceBadge).join('')}</div>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-cloud-arrow-down"></i> Synced ${meta.lastSynced}</span>
    </div>

    ${renderWorkflowPeriodFilter('contractMgmt', contractMgmtListState)}

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Register</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Signed / Active</span><strong>${signed}</strong></div>
      <div class="budget-pr-chip"><span>Pre-sign (LOI–Draft)</span><strong>${preSign}</strong></div>
      <div class="budget-pr-chip"><span>Period</span><strong>${periodLabel}</strong></div>
    </div>

    <div class="data-table-wrap mt-2">
      <div class="table-header">
        <h3>Contracts — LOI → PBG → Draft → Signed → Active</h3>
        <span class="meta-chip" style="margin:0"><strong>${paged.total}</strong> shown · read-only from DVDMS / NIC</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Vendor</th>
            <th>Category</th>
            <th>Lifecycle</th>
            <th>PBG</th>
            <th>PO (DVDMS)</th>
            <th>Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${paged.items.length ? paged.items.map(r => `
            <tr class="need-row-clickable" role="button" tabindex="0" onclick="openContractMgmtDetail('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openContractMgmtDetail('${r.id}')}">
              <td><strong>${r.id}</strong><div class="table-sub">${r.title}</div></td>
              <td>${r.vendor}<div class="table-sub">${r.division || ''}</div></td>
              <td>${r.category}</td>
              <td><span class="badge badge-${lifecycleBadge(r.lifecycleStage)}">${r.lifecycleStage}</span></td>
              <td><span class="badge badge-${contractPbgBadge(r.pbg)}">${r.pbg}</span></td>
              <td class="cell-nowrap">${r.poId || '—'} ${sourceBadge('DVDMS')}</td>
              <td class="cell-nowrap">${r.value}</td>
              <td><span class="cell-link">Open <i class="fa-solid fa-arrow-right"></i></span></td>
            </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No contracts match filters.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setContractMgmtPage')}
    </div>
  </div>`;
}

function renderContractLifecycleTimeline(r) {
  const steps = [
    { key: 'loi', label: 'LOI issue', done: !!r.loiNo && r.loiNo !== '—' },
    { key: 'ack', label: 'LOI accept', done: r.loiAck === 'Acknowledged' || ['LOI Accepted', 'PBG Pending', 'Signed', 'Active', 'Expiry Watch'].includes(r.lifecycleStage) },
    { key: 'pbg', label: 'PBG submission', done: r.pbg === 'Active' || r.pbg === 'Expiring' || r.award?.pbgStatus === 'Received' },
    { key: 'draft', label: 'Draft (template)', done: !!(r.agreementNo && r.agreementNo !== '—' && r.agreementNo !== 'Draft') || ['Signed', 'Active', 'Expiry Watch'].includes(r.lifecycleStage) || String(r.agreementNo || '').includes('Draft') || String(r.agreementNo || '').includes('AGR') },
    { key: 'sign', label: 'Signed', done: ['Signed', 'Active', 'Expiry Watch'].includes(r.lifecycleStage) },
    { key: 'active', label: 'Active / supply', done: r.lifecycleStage === 'Active' || r.lifecycleStage === 'Expiry Watch' || r.status === 'Active' }
  ];
  return `<div class="cm-timeline">
    ${steps.map((s, i) => `
      <div class="cm-timeline-step ${s.done ? 'is-done' : ''}">
        <span class="cm-timeline-dot">${s.done ? '<i class="fa-solid fa-check"></i>' : (i + 1)}</span>
        <span class="cm-timeline-label">${s.label}</span>
      </div>`).join('<span class="cm-timeline-rail"></span>')}
  </div>`;
}

function openContractMgmtDetail(contractId) {
  const base = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(x => x.id === contractId);
  if (!base) return;
  const r = enrichContractForMgmt(base);
  const t = r.terms;
  const ai = r.aiOps;

  openModal(`${r.id} — Contract Management`, `<div class="kpi-detail need-row-detail cm-detail">
    <p class="need-row-detail-lead">${r.title} · <strong>${r.vendor}</strong> · Tender <strong>${r.tenderId}</strong></p>
    <div class="src-badge-row" style="margin-bottom:0.75rem">${sourceBadge('DVDMS')}${sourceBadge('NIC')}${sourceBadge('Tender')}${sourceBadge('AI/ML')}</div>

    <div class="tender-detail-stats tender-detail-stats--4">
      <div class="tender-stat"><span>Lifecycle</span><strong><span class="badge badge-${lifecycleBadge(r.lifecycleStage)}">${r.lifecycleStage}</span></strong></div>
      <div class="tender-stat"><span>Value</span><strong>${r.value}</strong></div>
      <div class="tender-stat"><span>Approval stamp</span><strong class="cell-date">${r.approvalTimestamp || '—'}</strong></div>
      <div class="tender-stat"><span>Sign gate</span><strong>${r.signedGateOk ? 'LOI+PBG OK' : 'Blocked until LOI accept + PBG'}</strong></div>
    </div>

    <div class="tender-detail-section">
      <h4>1. LOI issue · LOI accept · PBG submission</h4>
      ${renderContractLifecycleTimeline(r)}
      <div class="data-table-wrap" style="margin:0.75rem 0 0">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>LOI / LOA ${sourceBadge('NIC')}</td><td><strong>${r.loiNo}</strong> · ${r.loiDate} · Ack: ${r.loiAck}</td></tr>
            <tr><td>PBG ${sourceBadge('NIC')}</td><td>${r.pbg} · ${r.pbgRef}</td></tr>
            <tr><td>Agreement ${sourceBadge('Eoffice')}</td><td>${r.agreementNo}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>2. Contract preparation draft (standard templates)</h4>
      <div class="data-table-wrap" style="margin-bottom:0">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>Draft template ${sourceBadge('Tender')}</td><td>Standard RC / supply template synced with tender documents for <strong>${r.tenderId}</strong></td></tr>
            <tr><td>Synced sources</td><td>NIT · BOQ · T&amp;C · LOA / LOI pack</td></tr>
            <tr><td>Tender</td><td>${r.tenderId}</td></tr>
            <tr><td>Division</td><td>${r.division || '—'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>3. SLA · Schedule · Tenure · Validity · Payment · PBG · Penalties · KPIs</h4>
      <div class="data-table-wrap" style="margin-bottom:0">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>SLAs</td><td>${t.sla}</td></tr>
            <tr><td>Delivery schedule</td><td>${t.deliverySchedule}</td></tr>
            <tr><td>Tenure</td><td>${t.tenure}</td></tr>
            <tr><td>Validity</td><td>${t.validity}</td></tr>
            <tr><td>Payment terms</td><td>${t.paymentTerms}</td></tr>
            <tr><td>PBG</td><td>${t.pbg}</td></tr>
            <tr><td>Penalties (RFP auto)</td><td>${t.penalties}</td></tr>
            <tr><td>KPIs</td><td>${t.kpis}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>4. SBG · SOW · Deliverables</h4>
      <div class="data-table-wrap" style="margin-bottom:0">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>SBG</td><td>${t.sbg}</td></tr>
            <tr><td>SOW</td><td>${t.sow}</td></tr>
            <tr><td>Deliverables</td><td>${t.deliverables}</td></tr>
            <tr><td>T&amp;C review</td><td>Both parties — tracked post LOI; Eoffice noting</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>Tender-specific documents</h4>
      <p class="report-footnote" style="margin-top:0">All contract documents are keyed to <strong>${r.tenderId}</strong>.</p>
      <div class="data-table-wrap" style="margin-bottom:0">
        <table class="data-table data-table--modal">
          <thead><tr><th>Document</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>LOI / LOA pack</td><td>${r.loiNo !== '—' ? 'On file' : 'Pending'}</td></tr>
            <tr><td>LOI acceptance</td><td>${r.loiAck === 'Acknowledged' ? 'Accepted' : 'Pending'}</td></tr>
            <tr><td>PBG</td><td>${r.pbg === 'Active' || r.pbg === 'Expiring' || r.award?.pbgStatus === 'Received' ? 'Received' : 'Pending'}</td></tr>
            <tr><td>SBG / SOW / Deliverables</td><td>Synced with tender annexures</td></tr>
            <tr><td>Signed agreement</td><td>${['Signed', 'Active', 'Expiry Watch'].includes(r.lifecycleStage) ? 'Executed' : 'Awaiting sign'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>DVDMS supply tracking ${sourceBadge('DVDMS')}</h4>
      <p class="report-footnote" style="margin-top:0">PO raised in DVDMS — supply tracked in Contract Management.</p>
      <div class="data-table-wrap" style="margin-bottom:0.75rem">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>PO</td><td><strong>${r.po?.id || r.poId || '—'}</strong> · ${r.po?.status || r.delivery || '—'}</td></tr>
            <tr><td>Ship-to</td><td>${r.po?.shipTo || '—'}</td></tr>
            <tr><td>Schedule</td><td>${r.po?.schedule || r.delivery}</td></tr>
            <tr><td>GRN</td><td>${r.grn ? `${r.grn.id} · ${r.grn.status} · QA ${r.grn.qaStatus}` : '—'}</td></tr>
            <tr><td>Deliveries</td><td>${r.deliveries.length ? r.deliveries.map(d => d.id + ' (' + d.grn + ')').join(', ') : '—'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tender-detail-section">
      <h4>Performance monitoring (DVDMS-integrated)</h4>
      <div class="cm-perf-grid">
        ${r.monitors.map(m => `
          <div class="cm-perf-card">
            <span>${m.label}</span>
            <strong>${m.score}</strong>
            <em>${m.status}</em>
          </div>`).join('')}
      </div>
    </div>

    <div class="tender-detail-section cm-ai-panel">
      <h4><i class="fa-solid fa-robot"></i> Proposed AI/ML operations</h4>
      <div class="data-table-wrap" style="margin-bottom:0.75rem">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>Liquidated damage</td><td><span class="badge badge-${ai.ld.status === 'Armed' ? 'warning' : 'info'}">${ai.ld.status}</span> ${ai.ld.detail}</td></tr>
            <tr><td>Expiry &amp; renew</td><td>${ai.expiry.endDate} · <strong>${ai.expiry.alert}</strong> — ${ai.expiry.action}</td></tr>
            <tr><td>Scorecard</td><td><strong>${ai.scorecard.overall}</strong> / 100 — ${ai.scorecard.note}</td></tr>
          </tbody>
        </table>
      </div>
      <h4 class="budget-subhead">Automated alerts (authorities &amp; vendors)</h4>
      <ul class="cm-alert-list">
        ${ai.slaAlerts.map(a => `<li><strong>${a.channel}</strong> → ${a.to} · ${a.when}<br><span>${a.msg}</span></li>`).join('')}
      </ul>
    </div>

    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${currentRole === 'gov' ? `<button type="button" class="btn btn-primary" onclick="closeModal();currentWorkflowStep=8;navigateTo('workflow')"><i class="fa-solid fa-stamp"></i> Stage 8 approval gate</button>` : ''}
    </div>
  </div>`, { wide: true, large: true, extraWide: true });
}

const aiEligVendorState = { category: 'all', page: 1 };
const vendorProfileFilterState = { category: 'all' };
const selfOnboardFilterState = { category: 'all', page: 1 };

function parseVendorMgmtScore(row) {
  const raw = String(row?.score ?? row?.confidence ?? '0').replace(/%/g, '').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatVendorMgmtScore(row) {
  if (row?.score == null && row?.confidence == null) return '—';
  return String(parseVendorMgmtScore(row));
}

function getVendorMgmtCategoryOptions(rows) {
  if (typeof getGovStageCategoryOptions === 'function') {
    return getGovStageCategoryOptions(rows || []);
  }
  const cats = [...new Set((rows || []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function applyVendorMgmtCategoryFilter(rows, filterState) {
  let list = Array.isArray(rows) ? rows.slice() : [];
  const cat = filterState?.category;
  if (cat && cat !== 'all') {
    list = list.filter(r => r.category === cat);
  } else if (typeof currentCategory !== 'undefined' && currentCategory && currentCategory !== 'All') {
    list = list.filter(r => r.category === currentCategory);
  }
  return list;
}

function renderVendorMgmtCategoryFilter(selectId, options, filterState) {
  const selected = (!filterState.category || filterState.category === 'all') ? 'All categories' : filterState.category;
  return `<div class="bid-records-category-filter" title="Filter by category">
    <span class="bid-records-category-label">Category</span>
    ${typeof inlineCustomSelectHTML === 'function'
      ? inlineCustomSelectHTML(selectId, options, selected)
      : ''}
  </div>`;
}

function getAiEligVendorCategoryOptions() {
  return getVendorMgmtCategoryOptions(typeof AI_ELIGIBLE_VENDOR_QUEUE !== 'undefined' ? AI_ELIGIBLE_VENDOR_QUEUE : []);
}

function getAiEligibleVendorRows() {
  const seed = typeof AI_ELIGIBLE_VENDOR_QUEUE !== 'undefined' ? AI_ELIGIBLE_VENDOR_QUEUE : [];
  return applyVendorMgmtCategoryFilter(seed, aiEligVendorState)
    .map(r => ({ ...r, score: parseVendorMgmtScore(r) }))
    .sort((a, b) => b.score - a.score);
}

function getVendorMgmtProfileRows() {
  const seed = typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : [];
  return applyVendorMgmtCategoryFilter(seed, vendorProfileFilterState)
    .slice()
    .sort((a, b) => parseVendorMgmtScore(b) - parseVendorMgmtScore(a));
}

function getSelfOnboardRows() {
  const seed = typeof VENDOR_REGISTRATIONS !== 'undefined' ? VENDOR_REGISTRATIONS : [];
  return applyVendorMgmtCategoryFilter(seed, selfOnboardFilterState);
}

function setAiEligVendorCategory(label) {
  aiEligVendorState.category = (!label || label === 'All categories') ? 'all' : label;
  aiEligVendorState.page = 1;
  if (typeof renderPageContent === 'function') renderPageContent();
}

function setAiEligVendorPage(page) {
  aiEligVendorState.page = Math.max(1, Number(page) || 1);
  if (typeof renderPageContent === 'function') renderPageContent();
}

function setVendorProfileCategory(label) {
  vendorProfileFilterState.category = (!label || label === 'All categories') ? 'all' : label;
  if (typeof vendorRegListPage !== 'undefined') vendorRegListPage = 1;
  if (typeof renderPageContent === 'function') renderPageContent();
}

function setSelfOnboardCategory(label) {
  selfOnboardFilterState.category = (!label || label === 'All categories') ? 'all' : label;
  selfOnboardFilterState.page = 1;
  if (typeof renderPageContent === 'function') renderPageContent();
}

function setSelfOnboardPage(page) {
  selfOnboardFilterState.page = Math.max(1, Number(page) || 1);
  if (typeof renderPageContent === 'function') renderPageContent();
}

function bindAiEligVendorCategorySelect() {
  if (typeof bindGovStageCategorySelect !== 'function') return;
  bindGovStageCategorySelect('aiEligVendorCategory', setAiEligVendorCategory);
  bindGovStageCategorySelect('vendorProfileCategory', setVendorProfileCategory);
  bindGovStageCategorySelect('selfOnboardCategory', setSelfOnboardCategory);
}

function renderVendorReg() {
  const profiles = getVendorMgmtProfileRows();
  const paged = paginateItems(profiles, vendorRegListPage, 10);
  vendorRegListPage = paged.page;
  const aiRows = getAiEligibleVendorRows();
  const aiPaged = paginateItems(aiRows, aiEligVendorState.page, 10);
  aiEligVendorState.page = aiPaged.page;
  const regs = getSelfOnboardRows();
  const regsPaged = paginateItems(regs, selfOnboardFilterState.page, 10);
  selfOnboardFilterState.page = regsPaged.page;
  const profileCategoryOptions = getVendorMgmtCategoryOptions(
    typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : []
  );
  const selfCategoryOptions = getVendorMgmtCategoryOptions(
    typeof VENDOR_REGISTRATIONS !== 'undefined' ? VENDOR_REGISTRATIONS : []
  );
  const aiCategoryOptions = getAiEligVendorCategoryOptions();

  return `<div class="vendor-mgmt-page">
    <div class="indent-mode-banner">
      <div>
        <strong>Vendor Management — NIC portal + DVDMS sync</strong>
        <p>One-time registration stays on the MP NIC tender portal (DSC, empanelment fees, annual renew, document verification). This portal shows synced profiles — no duplicate master-data entry. Contract Management data flows here for LOA / PBG / SLA / scorecard.</p>
        <div class="src-badge-row">${sourceBadge('NIC')}${sourceBadge('DVDMS')}${sourceBadge('AI/ML')}</div>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-link"></i> Integrated · no duplicate entry</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Synced profiles</span><strong>${(typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : []).length}</strong></div>
      <div class="budget-pr-chip"><span>Suppliers</span><strong>${(typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : []).filter(p => p.type === 'Supplier').length}</strong></div>
      <div class="budget-pr-chip"><span>Authorised labs</span><strong>${(typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : []).filter(p => p.type === 'Authorised Laboratory').length}</strong></div>
      <div class="budget-pr-chip"><span>AI eligibility queue</span><strong>${(typeof AI_ELIGIBLE_VENDOR_QUEUE !== 'undefined' ? AI_ELIGIBLE_VENDOR_QUEUE : []).length}</strong></div>
    </div>

    <section class="budget-section">
      <div class="budget-section-head">
        <h4><i class="fa-solid fa-robot"></i> AI — identify eligible vendors &amp; market intelligence</h4>
        <p>Proposed AI/ML shortlist. Resource Manager confirms onboard only — no blank registration forms for known NIC vendors.</p>
      </div>
      <div class="data-table-wrap need-table">
        <div class="table-header bid-records-header">
          <h3>AI eligibility shortlist</h3>
          ${renderVendorMgmtCategoryFilter('aiEligVendorCategory', aiCategoryOptions, aiEligVendorState)}
        </div>
        <table class="data-table">
          <thead><tr><th>ID</th><th>Vendor</th><th>Type</th><th>Category</th><th>AI reason</th><th>Score</th><th>Action</th></tr></thead>
          <tbody>
            ${aiPaged.items.length ? aiPaged.items.map(q => `<tr>
              <td><strong>${q.id}</strong></td>
              <td>${q.name}</td>
              <td>${q.type}</td>
              <td>${q.category}</td>
              <td>${q.reason}</td>
              <td><strong>${formatVendorMgmtScore(q)}</strong></td>
              <td><button type="button" class="btn btn-primary vm-table-action-btn" onclick="confirmAiVendorOnboard('${q.id}')">${q.action}</button></td>
            </tr>`).join('') : `<tr class="table-filter-empty-row"><td colspan="7"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No AI-eligible vendors${aiEligVendorState.category !== 'all' ? ` for <strong>${aiEligVendorState.category}</strong>` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setAiEligVendorCategory('All categories')">Clear category filter</button></div></td></tr>`}
          </tbody>
        </table>
        ${aiPaged.items.length ? renderPaginationControls(aiPaged.page, aiPaged.totalPages, aiPaged.total, aiPaged.from, aiPaged.to, 'setAiEligVendorPage') : ''}
      </div>
    </section>

    <div class="data-table-wrap mt-2 need-table">
      <div class="table-header bid-records-header">
        <h3>Vendor profiles (NIC → DVDMS → portal)</h3>
        ${renderVendorMgmtCategoryFilter('vendorProfileCategory', profileCategoryOptions, vendorProfileFilterState)}
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Vendor / NIC code</th>
            <th>Type</th>
            <th>Category</th>
            <th>DSC / Fee</th>
            <th>DVDMS</th>
            <th>Score</th>
            <th>Eligibility</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${paged.items.length ? paged.items.map(v => `
            <tr class="need-row-clickable" onclick="openVendorMgmtDetail('${v.id}')">
              <td><strong>${v.name}</strong><div class="table-sub">${v.id} · ${v.nicVendorCode}</div></td>
              <td>${v.type}</td>
              <td>${v.category}</td>
              <td>${v.dsc}<div class="table-sub">${v.empanelmentFee}</div></td>
              <td><span class="badge badge-${v.dvdmsSync === 'Synced' ? 'success' : 'warning'}">${v.dvdmsSync}</span></td>
              <td><strong>${formatVendorMgmtScore(v)}</strong></td>
              <td>${v.eligibility}</td>
              <td><button type="button" class="btn btn-primary vm-table-action-btn" onclick="event.stopPropagation();openVendorMgmtDetail('${v.id}')">View</button></td>
            </tr>`).join('') : `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No vendor profiles${vendorProfileFilterState.category !== 'all' ? ` for <strong>${vendorProfileFilterState.category}</strong>` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorProfileCategory('All categories')">Clear category filter</button></div></td></tr>`}
        </tbody>
      </table>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorRegListPage') : ''}
    </div>

    <div class="data-table-wrap mt-2 need-table">
      <div class="table-header bid-records-header">
        <h3>Self-onboarding / document validation queue</h3>
        ${renderVendorMgmtCategoryFilter('selfOnboardCategory', selfCategoryOptions, selfOnboardFilterState)}
      </div>
      <table class="data-table">
        <thead><tr><th>Request</th><th>Company</th><th>Category</th><th>KYC</th><th>Docs</th><th>Action</th></tr></thead>
        <tbody>
          ${regsPaged.items.length ? regsPaged.items.map(r => `<tr onclick="openVendorRegEmpanelmentDetail('${r.id}')">
            <td><strong>${r.id}</strong></td><td>${r.name}</td><td>${r.category}</td>
            <td><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></td>
            <td>${r.documents}</td>
            <td><button type="button" class="btn btn-outline vm-table-action-btn" onclick="event.stopPropagation();openVendorRegEmpanelmentDetail('${r.id}')">Validate</button></td>
          </tr>`).join('') : `<tr class="table-filter-empty-row"><td colspan="6"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No self-onboarding requests${selfOnboardFilterState.category !== 'all' ? ` for <strong>${selfOnboardFilterState.category}</strong>` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setSelfOnboardCategory('All categories')">Clear category filter</button></div></td></tr>`}
        </tbody>
      </table>
      ${regsPaged.items.length ? renderPaginationControls(regsPaged.page, regsPaged.totalPages, regsPaged.total, regsPaged.from, regsPaged.to, 'setSelfOnboardPage') : ''}
    </div>
  </div>`;
}

function openVendorMgmtDetail(vendorId) {
  const v = (typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : []).find(x => x.id === vendorId);
  if (!v) return;
  const linked = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).filter(c =>
    String(c.vendor || '').toLowerCase().includes(String(v.name).split(' ')[0].toLowerCase()) ||
    String(c.vendor || '') === v.name
  ).map(enrichContractForMgmt);

  openModal(`${v.name} — Vendor Management`, `<div class="kpi-detail need-row-detail">
    <div class="src-badge-row" style="margin-bottom:0.75rem">${sourceBadge('NIC')}${sourceBadge('DVDMS')}</div>
    <div class="tender-detail-stats tender-detail-stats--4">
      <div class="tender-stat"><span>NIC code</span><strong>${v.nicVendorCode}</strong></div>
      <div class="tender-stat"><span>Type</span><strong>${v.type}</strong></div>
      <div class="tender-stat"><span>Scorecard</span><strong>${v.score}</strong></div>
      <div class="tender-stat"><span>DVDMS</span><strong><span class="badge badge-${v.dvdmsSync === 'Synced' ? 'success' : 'warning'}">${v.dvdmsSync}</span></strong></div>
    </div>
    <div class="tender-detail-section">
      <h4>NIC registration (one-time · MP tender portal)</h4>
      <div class="data-table-wrap">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>Portal vendor ID</td><td><strong>${v.id}</strong></td></tr>
            <tr><td>DSC</td><td>${v.dsc}</td></tr>
            <tr><td>Empanelment fees</td><td>${v.empanelmentFee}</td></tr>
            <tr><td>Annual renew due</td><td>${v.renewDue}</td></tr>
            <tr><td>KYC</td><td><span class="badge badge-${kycBadgeClass(v.kyc)}">${v.kyc}</span></td></tr>
            <tr><td>Eligibility</td><td>${v.eligibility}</td></tr>
            <tr><td>Market intelligence (AI)</td><td>${v.marketIntel}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="tender-detail-section">
      <h4>Contracts flowing from Contract Management</h4>
      ${linked.length ? `<div class="data-table-wrap"><table class="data-table data-table--modal">
        <thead><tr><th>Contract</th><th>Lifecycle</th><th>PBG</th><th>PO</th><th></th></tr></thead>
        <tbody>${linked.map(c => `<tr>
          <td><strong>${c.id}</strong><div class="table-sub">${c.title}</div></td>
          <td><span class="badge badge-${lifecycleBadge(c.lifecycleStage)}">${c.lifecycleStage}</span></td>
          <td>${c.pbg}</td>
          <td>${c.poId || '—'}</td>
          <td><button type="button" class="btn btn-outline btn-sm" onclick="openContractMgmtDetail('${c.id}')">Open</button></td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="report-footnote">No linked contracts in the synced register for this vendor yet.</p>'}
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

function confirmAiVendorOnboard(eligId) {
  const q = (typeof AI_ELIGIBLE_VENDOR_QUEUE !== 'undefined' ? AI_ELIGIBLE_VENDOR_QUEUE : []).find(x => x.id === eligId);
  if (!q) return;
  openModal('AI onboard confirmation', `<div class="sync-success-msg">
    <div class="sync-success-icon"><i class="fa-solid fa-robot"></i></div>
    <h4>Eligible vendor confirmed</h4>
    <p><strong>${q.name}</strong> marked for vendor onboarding portal. Profile remains sourced from NIC / DVDMS — portal will validate documents only.</p>
    <p class="report-footnote">${q.reason}</p>
  </div>`);
}

function renderResourceAimlStrip() {
  const steps = typeof RESOURCE_AIML_PIPELINE !== 'undefined' ? RESOURCE_AIML_PIPELINE : [];
  if (!steps.length) return '';
  return `<section class="budget-section cm-aiml-strip">
    <div class="budget-section-head">
      <h4><i class="fa-solid fa-robot"></i> Proposed AI/ML — former manual demand chain</h4>
      <p>Indents, PR collation, forecast, PO planning and AMC/threshold compute run on DVDMS data. Raise PO / GRN remain DVDMS actions.</p>
    </div>
    <div class="cm-aiml-pipeline">
      ${steps.map(s => `<div class="cm-aiml-step">
        <strong>${s.label}</strong>
        <span>${sourceBadge(s.source.includes('DVDMS') ? 'DVDMS' : 'AI/ML')}${sourceBadge(s.engine === 'AI/ML' ? 'AI/ML' : 'DVDMS')}</span>
        <em>${s.status}</em>
      </div>`).join('')}
    </div>
  </section>`;
}
