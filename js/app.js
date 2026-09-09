/* MP Health Procurement - Main Application Logic */

let currentRole = null;
let authUser = null;
let currentPage = 'dashboard';
let currentCategory = 'All';
/** Category filter inside RM Analytics KPI modals (Open Tenders, Pending Approvals, Spend, Vendor Score) */
let govKpiModalCategory = 'All';
let govKpiModalKey = null;
let currentPeriod = 'year';
let analyticsFocusYear = 'all'; // 'all' | FY label e.g. 'FY25-26'
let analyticsSliceType = 'quarter'; // 'quarter' | 'month' — after a FY is selected
let analyticsPeriodFocus = 'all'; // 'all' | 'Q1'..'Q4' | month name
let analyticsCompareMode = 'vendor'; // 'vendor' | 'progress'
let currentWorkflowStep = null;
let alertPanelOpen = false;
let pageStack = [];
let modalHistory = [];
let tenderStatusFilter = 'all'; // 'all' | 'open' | 'evaluation' | 'draft'
let pipelinePage = 1;
const PIPELINE_PAGE_SIZE = 10;
let noticesShownThisSession = false;
let workQueueFilter = 'all';
let activeSlaThreadId = 'SLA-2026-014';

/** Contracts & POs list filters (Year / Quarter / Month) + pagination */
const contractsListState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Resource Manager — Contract Management hub */
const contractMgmtListState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all'
};

/** Vendor Stage 6 — Contract Execution table filters + pagination */
const vendorContractExecState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Delivery & Invoices list filters (Year / Quarter / Month) + pagination */
const deliveryListState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Vendor Stage 8 — Invoice Submission table filters + pagination */
const vendorInvoiceExecState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Vendor Stage 9 — Payment Tracking table filters + pagination */
const vendorPaymentExecState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Vendor Stage 9 — payment records sync banner (Delivery-style) */
const vendorPaymentSyncState = {
  status: 'idle',
  lastSynced: '—',
  fetchCount: 0
};

/** Vendor Stage 7 — Delivery table filters + pagination */
const vendorDeliveryExecState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Vendor Stage 10 — Renewal request table filters + pagination */
const vendorRenewalExecState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all',
  uploadName: null
};

/** Vendor Document Repository — filters + pagination */
const vendorRepositoryState = {
  page: 1,
  stage: 'all',
  docType: 'all',
  q: ''
};

/** Simple list pagination (vendor / shared pages) */
let clarificationsListPage = 1;
let workQueuePage = 1;
let vendorRegListPage = 1;
let vendorMatrixPage = 1;

/** Tender Discovery — Year / Quarter / Month + pagination */
const tendersListState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Vendor dashboard — Tender Details table category filter */
let dashboardTenderCategory = 'all';

/** Bid Submission — Year / Quarter / Month + pagination */
const bidsListState = {
  page: 1,
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  category: 'all'
};

/** Clarifications list — category filter + pagination */
const clarificationsListState = {
  page: 1,
  category: 'all'
};

/** Prototype "today" — used for deadline countdown (DD-MM-YYYY: 03-09-2026) */
const APP_TODAY = '2026-09-03';

const VENDOR_LIFECYCLE_STORAGE_VERSION = 2;
const VENDOR_LIFECYCLE_STORAGE_PREFIX = 'mph_vendor_lifecycle_v1_';

const EMPANELMENT_FEE_AMOUNT = '₹25,000';

const EMPANELMENT_PAYEE = {
  name: 'MPPHSCL Empanelment Fee Account',
  bank: 'State Bank of India',
  account: '3892018475620',
  ifsc: 'SBIN0000456',
  branch: 'Arera Colony, Bhopal',
  remark: 'Empanelment fee — quote GSTIN in remittance'
};

function defaultEmpanelmentState(submitted = false) {
  return {
    amount: EMPANELMENT_FEE_AMOUNT,
    mode: submitted ? 'online' : null,
    status: submitted ? 'submitted' : 'pending',
    source: submitted ? 'synced' : 'manual',
    online: {
      method: 'NEFT',
      utr: submitted ? 'SBIN928471036482' : '',
      paidOn: submitted ? '01-08-2026' : '',
      remitterBank: submitted ? 'HDFC Bank' : ''
    },
    offline: {
      fileName: null,
      uploadedOn: '',
      receiptNo: ''
    }
  };
}

function lockSyncedRegistrationSelects() {
  if (!(currentRole === 'vendor' && currentWorkflowStep === 1 && isVendorRegistrationSynced())) return;
  ['regCategory', 'regDistrict', 'regState'].forEach(id => {
    const wrap = document.querySelector(`.custom-select[data-select-id="${id}"]`);
    if (!wrap) return;
    wrap.classList.add('is-locked');
    wrap.setAttribute('aria-disabled', 'true');
    const trigger = wrap.querySelector('.custom-select-trigger');
    if (trigger) trigger.disabled = true;
  });
}

function ensureEmpanelmentState() {
  if (!vendorStageState.empanelment) {
    vendorStageState.empanelment = defaultEmpanelmentState(
      isVendorRegistrationSynced() || !!vendorStageState.completed?.[1]
    );
  }
  return vendorStageState.empanelment;
}

function isVendorRegistrationSynced() {
  if (vendorStageState.registrationSource === 'synced') return true;
  if (vendorStageState.registrationSource === 'manual') return false;
  return isSeededDemoVendor();
}

/** Pending only when fee / payment proof is absent; otherwise Submitted. */
function isEmpanelmentRecordPresent(e = ensureEmpanelmentState()) {
  if (!e) return false;
  if (e.status === 'submitted') return true;
  if (e.mode === 'online' && e.online?.utr && e.online?.paidOn) return true;
  if (e.mode === 'offline' && e.offline?.fileName) return true;
  return false;
}

function syncEmpanelmentStatusFromPresence() {
  const e = ensureEmpanelmentState();
  e.status = isEmpanelmentRecordPresent(e) ? 'submitted' : 'pending';
  return e;
}

function isEmpanelmentSubmitted() {
  return syncEmpanelmentStatusFromPresence().status === 'submitted';
}

function renderEmpanelmentFeeBlock(canEdit) {
  const e = syncEmpanelmentStatusFromPresence();
  const synced = isVendorRegistrationSynced();
  const submitted = e.status === 'submitted';
  const statusBadge = submitted
    ? '<span class="badge badge-success">Submitted</span>'
    : '<span class="badge badge-warning">Pending</span>';
  const mode = e.mode;
  const lock = !canEdit || submitted || synced;

  const modePicker = lock
    ? `<div class="empanel-mode-readonly"><strong>${
        mode === 'online' ? 'Online (NEFT / RTGS)'
          : mode === 'offline' ? 'Offline (document upload)'
            : synced && !submitted ? 'Not received in system'
              : '—'
      }</strong></div>`
    : `<div class="empanel-mode-cards" role="radiogroup" aria-label="Empanelment payment mode">
        <button type="button" class="empanel-mode-card${mode === 'online' ? ' is-active' : ''}" onclick="setEmpanelmentMode('online')">
          <i class="fa-solid fa-building-columns"></i>
          <strong>Online</strong>
          <span>Pay via NEFT / RTGS</span>
        </button>
        <button type="button" class="empanel-mode-card${mode === 'offline' ? ' is-active' : ''}" onclick="setEmpanelmentMode('offline')">
          <i class="fa-solid fa-file-arrow-up"></i>
          <strong>Offline</strong>
          <span>Upload payment proof</span>
        </button>
      </div>`;

  let summary = '';
  if (submitted && mode === 'online') {
    const o = e.online || {};
    summary = `<div class="empanel-submitted-summary">
      <p><i class="fa-solid fa-circle-check"></i> Online <strong>${escapeHtmlLite(o.method || 'NEFT')}</strong> recorded · UTR <strong>${escapeHtmlLite(o.utr || '—')}</strong> · ${escapeHtmlLite(o.paidOn || '—')}${synced ? ' · Loaded with registration' : ''}</p>
    </div>`;
  } else if (submitted && mode === 'offline') {
    const f = e.offline || {};
    summary = `<div class="empanel-submitted-summary">
      <p><i class="fa-solid fa-circle-check"></i> Offline proof <strong>${escapeHtmlLite(f.fileName || '—')}</strong>${f.receiptNo ? ` · Receipt ${escapeHtmlLite(f.receiptNo)}` : ''} · ${escapeHtmlLite(f.uploadedOn || '—')}</p>
    </div>`;
  } else if (synced && !submitted) {
    summary = `<p class="empanel-panel-lead empanel-panel-lead--hint"><i class="fa-solid fa-circle-info"></i> Empanelment fee is not present in the system yet — status stays <strong>Pending</strong> until the fee record is available.</p>`;
  } else if (!lock && !mode) {
    summary = `<p class="empanel-panel-lead empanel-panel-lead--hint"><i class="fa-solid fa-circle-info"></i> Select Online or Offline — the payment form opens in a modal.</p>`;
  } else if (!lock && mode) {
    summary = `<div class="wf-actions mt-2" style="margin-bottom:0">
      <button type="button" class="btn btn-outline btn-sm" onclick="openEmpanelmentPaymentModal('${mode}')">
        <i class="fa-solid fa-wallet"></i> Open ${mode === 'online' ? 'online' : 'offline'} payment form
      </button>
    </div>`;
  }

  return `<div class="empanel-fee-block">
    <div class="need-section-head">
      <h4><i class="fa-solid fa-indian-rupee-sign"></i> Empanelment fee</h4>
      ${statusBadge}
    </div>
    <div class="form-grid wf-form-grid">
      <div class="form-group"><label>Fee amount</label><input type="text" value="${escapeHtmlLite(e.amount || EMPANELMENT_FEE_AMOUNT)}" readonly></div>
      <div class="form-group"><label>${reqLabel('Payment mode')}</label>${modePicker}</div>
    </div>
    ${summary}
  </div>`;
}

function renderEmpanelmentPaymentModalBody(mode) {
  const e = ensureEmpanelmentState();
  const lock = e.status === 'submitted';

  if (mode === 'online') {
    const o = e.online || {};
    return `<div class="consol-detail-modal empanel-payment-modal">
      <p class="consol-detail-lead">Transfer <strong>${escapeHtmlLite(e.amount)}</strong> via NEFT / RTGS using the bank details below, then enter your UTR and payment date.</p>
      <div class="empanel-panel-head" style="margin-bottom:0.75rem">
        <h5 style="margin:0"><i class="fa-solid fa-building-columns"></i> Online payment — NEFT / RTGS</h5>
        <button type="button" class="btn btn-outline btn-sm" onclick="copyEmpanelmentBankDetails()"><i class="fa-solid fa-copy"></i> Copy bank details</button>
      </div>
      <div class="label-grid empanel-payee">
        <div class="label-item"><span class="label-key">Beneficiary</span><span class="label-val">${EMPANELMENT_PAYEE.name}</span></div>
        <div class="label-item"><span class="label-key">Bank</span><span class="label-val">${EMPANELMENT_PAYEE.bank}</span></div>
        <div class="label-item"><span class="label-key">Account No.</span><span class="label-val">${EMPANELMENT_PAYEE.account}</span></div>
        <div class="label-item"><span class="label-key">IFSC</span><span class="label-val">${EMPANELMENT_PAYEE.ifsc}</span></div>
        <div class="label-item"><span class="label-key">Branch</span><span class="label-val">${EMPANELMENT_PAYEE.branch}</span></div>
        <div class="label-item"><span class="label-key">Amount</span><span class="label-val"><strong>${escapeHtmlLite(e.amount)}</strong></span></div>
      </div>
      <div class="form-grid wf-form-grid mt-2">
        ${customSelectHTML('Transfer method', 'empMethod', ['NEFT', 'RTGS'], o.method || 'NEFT', true)}
        <div class="form-group"><label>${reqLabel('UTR / Reference No.')}</label><input id="empUtr" type="text" placeholder="Bank UTR number" value="${escapeHtmlLite(o.utr || '')}"${lock ? ' readonly' : ''}></div>
        ${datePickerHTML('empPaidOn', o.paidOn || '', reqLabel('Payment date'), lock)}
        <div class="form-group"><label>Remitter bank</label><input id="empRemitter" type="text" placeholder="Your bank name" value="${escapeHtmlLite(o.remitterBank || '')}"${lock ? ' readonly' : ''}></div>
      </div>
      <div class="wf-actions mt-2">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        ${!lock ? `<button type="button" class="btn btn-primary" onclick="confirmEmpanelmentOnline()"><i class="fa-solid fa-check"></i> Confirm online payment</button>` : ''}
      </div>
    </div>`;
  }

  const f = e.offline || {};
  return `<div class="consol-detail-modal empanel-payment-modal">
    <p class="consol-detail-lead">Upload challan / receipt / DD or pay-order scan (PDF, JPG, PNG) to complete offline empanelment fee payment.</p>
    <div class="form-grid wf-form-grid">
      <div class="form-group"><label>Receipt / challan no.</label><input id="empReceiptNo" type="text" placeholder="Optional reference" value="${escapeHtmlLite(f.receiptNo || '')}"${lock ? ' readonly' : ''}></div>
      <div class="form-group" style="grid-column:1/-1">
        <label>${reqLabel('Payment proof')}</label>
        ${lock
          ? `<div class="wf-file-status">${f.fileName ? `<i class="fa-solid fa-file"></i> ${escapeHtmlLite(f.fileName)}` : '—'}</div>`
          : renderInlineUpload({
            id: 'empOfflineFile',
            title: 'Upload payment proof',
            hint: 'Challan / receipt / DD · PDF, JPG, PNG',
            disabled: false,
            fileName: f.fileName || null,
            onChange: 'onEmpanelmentOfflineUpload'
          })}
      </div>
    </div>
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      ${!lock ? `<button type="button" class="btn btn-primary" onclick="submitEmpanelmentOffline()"><i class="fa-solid fa-upload"></i> Upload &amp; submit proof</button>` : ''}
    </div>
  </div>`;
}

function openEmpanelmentPaymentModal(mode) {
  if (isVendorRegistrationSynced() && isEmpanelmentSubmitted()) return;
  const e = ensureEmpanelmentState();
  const m = mode === 'offline' ? 'offline' : mode === 'online' ? 'online' : (e.mode === 'offline' ? 'offline' : 'online');
  e.mode = m;
  persistVendorLifecycle();
  openModal(
    m === 'online' ? 'Online empanelment payment' : 'Offline empanelment payment',
    renderEmpanelmentPaymentModalBody(m),
    { wide: true, large: true, replace: true }
  );
  if (typeof initCustomSelects === 'function') initCustomSelects();
}

function setEmpanelmentMode(mode) {
  if (isVendorRegistrationSynced() && isEmpanelmentSubmitted()) return;
  const e = ensureEmpanelmentState();
  if (e.status === 'submitted') return;
  if (e.mode && e.mode !== mode) {
    e.online = { method: 'NEFT', utr: '', paidOn: '', remitterBank: '' };
    e.offline = { fileName: null, uploadedOn: '', receiptNo: '' };
  }
  e.mode = mode === 'offline' ? 'offline' : 'online';
  e.status = 'pending';
  e.source = 'manual';
  persistVendorLifecycle();
  refreshWorkflowUI();
  openEmpanelmentPaymentModal(e.mode);
}

function copyEmpanelmentBankDetails() {
  const text = [
    `Beneficiary: ${EMPANELMENT_PAYEE.name}`,
    `Bank: ${EMPANELMENT_PAYEE.bank}`,
    `Account: ${EMPANELMENT_PAYEE.account}`,
    `IFSC: ${EMPANELMENT_PAYEE.ifsc}`,
    `Branch: ${EMPANELMENT_PAYEE.branch}`,
    `Amount: ${EMPANELMENT_FEE_AMOUNT}`,
    `Remark: ${EMPANELMENT_PAYEE.remark}`
  ].join('\n');
  const done = () => showWfAlert(`Bank details copied. Use them for NEFT / RTGS transfer of <strong>${EMPANELMENT_FEE_AMOUNT}</strong>.`, 'success');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else {
    done();
  }
}

function confirmEmpanelmentOnline() {
  const e = ensureEmpanelmentState();
  if (e.status === 'submitted') return;
  e.mode = 'online';
  const method = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('empMethod') : 'NEFT';
  const utr = document.getElementById('empUtr')?.value?.trim() || '';
  const paidOn = document.getElementById('empPaidOn')?.value?.trim() || '';
  const remitterBank = document.getElementById('empRemitter')?.value?.trim() || '';
  e.online = { method: method || 'NEFT', utr, paidOn, remitterBank };
  persistVendorLifecycle();
  if (!utr || !paidOn) {
    openModal('Cannot proceed', `<div class="wf-inline-alert wf-inline-alert--error">
      <i class="fa-solid fa-circle-exclamation"></i>
      <div><p>Enter UTR / Reference No. and Payment date to confirm online empanelment payment.</p></div>
    </div>
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary" onclick="openEmpanelmentPaymentModal('online')">Back to payment form</button>
    </div>`, { replace: true });
    return;
  }
  e.offline = { fileName: null, uploadedOn: '', receiptNo: '' };
  e.status = 'submitted';
  e.source = 'manual';
  persistVendorLifecycle();
  closeModal();
  refreshWorkflowUI();
  openModal('Empanelment fee submitted', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Online ${escapeHtmlLite(e.online.method)} payment recorded (UTR <strong>${escapeHtmlLite(utr)}</strong>). You can now save registration details.</p></div>
  </div>`);
}

function onEmpanelmentOfflineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const e = ensureEmpanelmentState();
  const receiptNo = document.getElementById('empReceiptNo')?.value?.trim() || e.offline?.receiptNo || '';
  e.offline = {
    fileName: file.name,
    uploadedOn: e.offline?.uploadedOn || '',
    receiptNo
  };
  openEmpanelmentPaymentModal('offline');
}

function submitEmpanelmentOffline() {
  const e = ensureEmpanelmentState();
  if (e.status === 'submitted') return;
  e.mode = 'offline';
  const receiptNo = document.getElementById('empReceiptNo')?.value?.trim() || e.offline?.receiptNo || '';
  const fileName = e.offline?.fileName || document.getElementById('empOfflineFile')?.files?.[0]?.name || null;
  e.offline = {
    fileName: fileName || e.offline?.fileName || null,
    uploadedOn: e.offline?.uploadedOn || '',
    receiptNo
  };
  persistVendorLifecycle();
  if (!fileName) {
    openModal('Cannot proceed', `<div class="wf-inline-alert wf-inline-alert--error">
      <i class="fa-solid fa-circle-exclamation"></i>
      <div><p>Upload the offline payment proof document before submitting.</p></div>
    </div>
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary" onclick="openEmpanelmentPaymentModal('offline')">Back to payment form</button>
    </div>`, { replace: true });
    return;
  }
  e.offline = {
    fileName,
    uploadedOn: formatDateDMY(APP_TODAY),
    receiptNo
  };
  e.online = { method: 'NEFT', utr: '', paidOn: '', remitterBank: '' };
  e.status = 'submitted';
  e.source = 'manual';
  persistVendorLifecycle();
  closeModal();
  refreshWorkflowUI();
  openModal('Empanelment fee submitted', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Offline proof <strong>${escapeHtmlLite(fileName)}</strong> uploaded. You can now save registration details.</p></div>
  </div>`);
}

function createDefaultVendorStageState(profileType = 'new') {
  const onboardingDone = profileType === 'existing';
  return {
    profileType: onboardingDone ? 'existing' : 'new',
    registrationSource: onboardingDone ? 'synced' : 'manual',
    completed: {
      1: onboardingDone, 2: onboardingDone, 3: onboardingDone,
      4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false
    },
    locked: { 4: false },
    uploads: {
      kyc: [],
      approvalLetter: null,
      technicalDocs: [],
      financialDocs: [],
      pbg: null,
      deliveryProof: null,
      renewalSupport: null
    },
    registration: {
      company: '',
      contactName: '',
      category: '',
      categories: [],
      gstin: '',
      pan: '',
      street: '',
      addressLine2: '',
      city: '',
      district: '',
      state: 'Madhya Pradesh',
      pin: '',
      address: ''
    },
    kyc: {
      holder: '',
      bank: '',
      account: '',
      ifsc: '',
      license: '',
      expiry: ''
    },
    empanelment: defaultEmpanelmentState(onboardingDone),
    approval: onboardingDone
      ? { systemLetter: true, approvedOn: '28-08-2026', letterNo: 'VAL/2026/0123' }
      : { systemLetter: false, approvedOn: '', letterNo: '' },
    bid: {
      tenderId: '',
      tenderTitle: '',
      category: '',
      emdStatus: '',
      deadline: '',
      submitted: false,
      ocrReady: false
    },
    award: onboardingDone ? {
      tenderId: 'TND-2026-MP-0038',
      title: 'Hospital Linen Supply',
      loaStatus: 'Issued',
      loaDate: '29-08-2026',
      pbgDue: '13-09-2026',
      value: '₹85 L',
      acknowledged: false
    } : {
      tenderId: '',
      title: '',
      loaStatus: '',
      loaDate: '',
      pbgDue: '',
      value: '',
      acknowledged: false
    },
    contract: {
      id: '',
      tenderId: '',
      pbgStatus: '',
      pbgAmount: '',
      contractStatus: '',
      pbgSubmitted: false,
      signed: false,
      loiAccepted: false,
      draftReady: false,
      pbgOcr: null,
      contractOcr: null,
      bank: '',
      bgRef: '',
      validUntil: '',
      /** Per-tender LOI / PBG / draft / T&C document packs */
      tenderPacks: {}
    },
    delivery: {
      challan: '',
      vehicle: '',
      dispatchDate: '',
      expectedDate: '',
      coldChain: 'No',
      remarks: '',
      status: '',
      updated: false,
      ocrReady: false,
      fileName: null
    },
    /** Extra delivery rows added via Add / Update modal (persisted) */
    deliveryLocalRows: [],
    invoice: {
      number: '',
      grn: '',
      amount: '',
      status: '',
      submitted: false,
      ocrReady: false,
      fileName: null
    },
    /** Extra invoice rows added via Add / Update modal (persisted) */
    invoiceLocalRows: [],
    payment: {
      status: onboardingDone ? 'Awaiting Processing' : 'Not started',
      timeline: onboardingDone ? 'Within 45 days of invoice acceptance' : '—',
      bank: onboardingDone ? 'HDFC Bank - ****4567' : '—',
      lastUpdate: '—',
      milestones: [
        { label: 'Invoice submitted', done: false },
        { label: 'Three-way match (PO / GRN / Invoice)', done: false },
        { label: 'Finance verification', done: false },
        { label: 'Payment released', done: false }
      ]
    },
    /** Vendor-submitted renewal requests (persisted) */
    renewalRequests: []
  };
}

/** Vendor workflow runtime state (prototype) — mutated per session; persisted in localStorage */
const vendorStageState = createDefaultVendorStageState('new');

function cloneVendorStageState(profileType = 'new') {
  return JSON.parse(JSON.stringify(createDefaultVendorStageState(profileType)));
}

function getVendorLifecycleStorageKey(user = authUser) {
  if (!user) return null;
  const id = user.vendorId || user.email || user.id;
  if (!id) return null;
  return VENDOR_LIFECYCLE_STORAGE_PREFIX + String(id).toLowerCase().trim();
}

function resolveVendorProfileType(user) {
  if (!user) return 'new';
  // "Existing" only after onboarding (Stages 1–3) is completed and saved — not by demo email alone.
  const saved = readVendorLifecycleSnapshot(user);
  if (saved?.completed?.[1] && saved?.completed?.[2] && saved?.completed?.[3]) {
    return 'existing';
  }
  return 'new';
}

function serializeVendorUploadMeta(file) {
  if (!file) return null;
  if (Array.isArray(file)) return file.map(serializeVendorUploadMeta).filter(Boolean);
  return {
    name: file.name || 'document',
    size: Number(file.size) || 0
  };
}

function buildVendorLifecycleSnapshot() {
  return {
    version: VENDOR_LIFECYCLE_STORAGE_VERSION,
    profileType: vendorStageState.profileType || 'new',
    registrationSource: vendorStageState.registrationSource || (vendorStageState.profileType === 'existing' ? 'synced' : 'manual'),
    currentStep: currentWorkflowStep || getVendorActiveStageId(),
    lifecycleComplete: !!vendorLifecycleComplete,
    completed: { ...vendorStageState.completed },
    locked: { ...vendorStageState.locked },
    registration: { ...(vendorStageState.registration || {}) },
    kyc: { ...(vendorStageState.kyc || {}) },
    uploads: {
      kyc: serializeVendorUploadMeta(vendorStageState.uploads.kyc) || [],
      approvalLetter: serializeVendorUploadMeta(vendorStageState.uploads.approvalLetter),
      technicalDocs: serializeVendorUploadMeta(vendorStageState.uploads.technicalDocs) || [],
      financialDocs: serializeVendorUploadMeta(vendorStageState.uploads.financialDocs) || [],
      pbg: serializeVendorUploadMeta(vendorStageState.uploads.pbg),
      deliveryProof: serializeVendorUploadMeta(vendorStageState.uploads.deliveryProof),
      renewalSupport: serializeVendorUploadMeta(vendorStageState.uploads.renewalSupport)
    },
    bid: { ...vendorStageState.bid },
    award: { ...vendorStageState.award },
    empanelment: {
      ...vendorStageState.empanelment,
      online: { ...(vendorStageState.empanelment?.online || {}) },
      offline: { ...(vendorStageState.empanelment?.offline || {}) }
    },
    approval: { ...(vendorStageState.approval || {}) },
    contract: {
      ...vendorStageState.contract,
      pbgOcr: vendorStageState.contract.pbgOcr ? { ...vendorStageState.contract.pbgOcr } : null,
      contractOcr: vendorStageState.contract.contractOcr ? { ...vendorStageState.contract.contractOcr } : null,
      tenderPacks: (() => {
        const packs = vendorStageState.contract.tenderPacks || {};
        const out = {};
        Object.keys(packs).forEach(tid => {
          const p = packs[tid] || {};
          out[tid] = {
            ...p,
            uploads: p.uploads ? { ...p.uploads } : {}
          };
        });
        return out;
      })()
    },
    delivery: { ...vendorStageState.delivery },
    deliveryLocalRows: Array.isArray(vendorStageState.deliveryLocalRows)
      ? vendorStageState.deliveryLocalRows.map(r => ({ ...r }))
      : [],
    invoice: { ...vendorStageState.invoice },
    invoiceLocalRows: Array.isArray(vendorStageState.invoiceLocalRows)
      ? vendorStageState.invoiceLocalRows.map(r => ({ ...r }))
      : [],
    payment: {
      ...vendorStageState.payment,
      milestones: (vendorStageState.payment.milestones || []).map(m => ({ ...m }))
    },
    renewalRequests: (vendorStageState.renewalRequests || []).map(r => ({
      ...r,
      documents: Array.isArray(r.documents) ? r.documents.map(d => ({ ...d })) : []
    })),
    updatedAt: new Date().toISOString()
  };
}

function persistVendorLifecycle() {
  if (currentRole !== 'vendor') return;
  const key = getVendorLifecycleStorageKey();
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(buildVendorLifecycleSnapshot()));
  } catch (err) {
    console.warn('Unable to persist vendor lifecycle progress', err);
  }
}

function readVendorLifecycleSnapshot(user = authUser) {
  const key = getVendorLifecycleStorageKey(user);
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== VENDOR_LIFECYCLE_STORAGE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function applyVendorStageStateObject(next) {
  if (!next) return;
  vendorStageState.profileType = next.profileType || vendorStageState.profileType || 'new';
  vendorStageState.registrationSource = next.registrationSource
    || (next.profileType === 'existing' || isSeededDemoVendor() ? 'synced' : 'manual');
  vendorStageState.completed = { ...vendorStageState.completed, ...(next.completed || {}) };
  vendorStageState.locked = { ...vendorStageState.locked, ...(next.locked || {}) };
  vendorStageState.registration = {
    company: '',
    contactName: '',
    category: '',
    categories: [],
    gstin: '',
    pan: '',
    street: '',
    addressLine2: '',
    city: '',
    district: '',
    state: 'Madhya Pradesh',
    pin: '',
    address: '',
    ...(vendorStageState.registration || {}),
    ...(next.registration || {})
  };
  if (!Array.isArray(vendorStageState.registration.categories)) {
    vendorStageState.registration.categories = normalizeRegCategories(
      vendorStageState.registration.categories || vendorStageState.registration.category
    );
  }
  if (!vendorStageState.registration.category && vendorStageState.registration.categories.length) {
    vendorStageState.registration.category = formatRegCategories(vendorStageState.registration.categories);
  }
  hydrateRegAddressFields(vendorStageState.registration);
  vendorStageState.kyc = {
    holder: '',
    bank: '',
    account: '',
    ifsc: '',
    license: '',
    expiry: '',
    ...(vendorStageState.kyc || {}),
    ...(next.kyc || {})
  };
  vendorStageState.uploads = {
    kyc: Array.isArray(next.uploads?.kyc) ? next.uploads.kyc : [],
    approvalLetter: next.uploads?.approvalLetter || null,
    technicalDocs: Array.isArray(next.uploads?.technicalDocs) ? next.uploads.technicalDocs : [],
    financialDocs: Array.isArray(next.uploads?.financialDocs) ? next.uploads.financialDocs : [],
    pbg: next.uploads?.pbg || null,
    deliveryProof: next.uploads?.deliveryProof || null,
    renewalSupport: next.uploads?.renewalSupport || null
  };
  Object.assign(vendorStageState.bid, next.bid || {});
  Object.assign(vendorStageState.award, next.award || {});
  vendorStageState.approval = {
    systemLetter: false,
    approvedOn: '',
    letterNo: '',
    ...(vendorStageState.approval || {}),
    ...(next.approval || {})
  };
  if (!vendorStageState.empanelment) vendorStageState.empanelment = defaultEmpanelmentState(!!next.completed?.[1]);
  if (next.empanelment) {
    vendorStageState.empanelment = {
      ...defaultEmpanelmentState(false),
      ...next.empanelment,
      online: { ...defaultEmpanelmentState(false).online, ...(next.empanelment.online || {}) },
      offline: { ...defaultEmpanelmentState(false).offline, ...(next.empanelment.offline || {}) }
    };
    syncEmpanelmentStatusFromPresence();
  } else if (
    (vendorStageState.registrationSource === 'synced' || next.completed?.[1])
    && vendorStageState.empanelment.status !== 'submitted'
  ) {
    vendorStageState.empanelment = defaultEmpanelmentState(true);
    vendorStageState.empanelment.source = 'synced';
  }
  Object.assign(vendorStageState.contract, next.contract || {});
  if (next.contract?.tenderPacks && typeof next.contract.tenderPacks === 'object') {
    vendorStageState.contract.tenderPacks = { ...next.contract.tenderPacks };
  } else if (!vendorStageState.contract.tenderPacks) {
    vendorStageState.contract.tenderPacks = {};
  }
  Object.assign(vendorStageState.delivery, next.delivery || {});
  vendorStageState.deliveryLocalRows = Array.isArray(next.deliveryLocalRows)
    ? next.deliveryLocalRows.map(r => ({ ...r }))
    : (Array.isArray(vendorStageState.deliveryLocalRows) ? vendorStageState.deliveryLocalRows : []);
  Object.assign(vendorStageState.invoice, next.invoice || {});
  vendorStageState.invoiceLocalRows = Array.isArray(next.invoiceLocalRows)
    ? next.invoiceLocalRows.map(r => ({ ...r }))
    : (Array.isArray(vendorStageState.invoiceLocalRows) ? vendorStageState.invoiceLocalRows : []);
  Object.assign(vendorStageState.payment, next.payment || {});
  if (Array.isArray(next.payment?.milestones)) {
    vendorStageState.payment.milestones = next.payment.milestones.map(m => ({ ...m }));
  }
  vendorStageState.renewalRequests = Array.isArray(next.renewalRequests)
    ? next.renewalRequests.map(r => ({
      ...r,
      documents: Array.isArray(r.documents) ? r.documents.map(d => ({ ...d })) : []
    }))
    : [];
}

function resetVendorStageState(profileType = 'new') {
  const fresh = cloneVendorStageState(profileType);
  applyVendorStageStateObject(fresh);
  vendorLifecycleComplete = false;
}

function clampVendorWorkflowStep(step) {
  const max = (typeof VENDOR_WORKFLOW !== 'undefined' ? VENDOR_WORKFLOW.length : 10) || 10;
  const n = Math.max(1, Math.min(max, Number(step) || 1));
  return n;
}

/**
 * Restore or initialize vendor Bid-to-Pay progress for this login.
 * - First visit (no cache): always Step 1
 * - Returning with cache: resume saved step
 * - Onboarding (1–3) already done: land on Step 4+ / active progress
 */
function initVendorLifecycleForSession(user) {
  const saved = readVendorLifecycleSnapshot(user);
  if (saved) {
    applyVendorStageStateObject(saved);
    vendorLifecycleComplete = !!saved.lifecycleComplete;
    const progress = getVendorActiveStageId();
    let step = clampVendorWorkflowStep(saved.currentStep || progress);
    const onboardingDone = !!(saved.completed?.[1] && saved.completed?.[2] && saved.completed?.[3]);
    if (onboardingDone && step < 4) step = Math.max(4, progress);
    currentWorkflowStep = step;
    vendorStageState.profileType = onboardingDone ? 'existing' : 'new';
    syncVendorWorkflowStatuses();
    syncVendorProfileFromAuth(user);
    return { resumed: true, step: currentWorkflowStep, profileType: vendorStageState.profileType };
  }

  // First login / signup with no saved progress — always begin at Registration
  resetVendorStageState('new');
  currentWorkflowStep = 1;
  if (isSeededDemoVendor(user)) {
    seedDemoVendorRegistrationDefaults();
  } else if (user) {
    vendorStageState.registrationSource = 'manual';
    vendorStageState.empanelment = defaultEmpanelmentState(false);
    vendorStageState.empanelment.source = 'manual';
    vendorStageState.registration = {
      company: user.organization || '',
      contactName: user.name || '',
      category: '',
      categories: [],
      gstin: '',
      pan: '',
      street: '',
      addressLine2: '',
      city: '',
      district: '',
      state: 'Madhya Pradesh',
      pin: '',
      address: ''
    };
    vendorStageState.kyc = {
      holder: user.organization || '',
      bank: '',
      account: '',
      ifsc: '',
      license: '',
      expiry: ''
    };
  }
  syncVendorWorkflowStatuses();
  syncVendorProfileFromAuth(user);
  persistVendorLifecycle();
  return { resumed: false, step: 1, profileType: 'new' };
}

function clearInMemoryVendorLifecycle() {
  resetVendorStageState('new');
  currentWorkflowStep = null;
  vendorLifecycleComplete = false;
  vendorBidDvdmsState.status = 'idle';
  vendorBidDvdmsState.lastSynced = null;
  vendorBidDvdmsState.rows = [];
  vendorBidDvdmsState.fetchCount = 0;
  vendorBidDvdmsFilterState.year = 'all';
  vendorBidDvdmsFilterState.viewBy = 'quarter';
  vendorBidDvdmsFilterState.period = 'all';
  vendorBidDvdmsFilterState.page = 1;
  vendorBidDvdmsFilterState.category = 'all';
  vendorAwardSyncState.status = 'idle';
  vendorAwardSyncState.lastSynced = null;
  vendorAwardSyncState.rows = [];
  vendorAwardSyncState.fetchCount = 0;
  vendorAwardSyncFilterState.year = 'all';
  vendorAwardSyncFilterState.viewBy = 'quarter';
  vendorAwardSyncFilterState.period = 'all';
  vendorAwardSyncFilterState.page = 1;
  vendorAwardSyncFilterState.category = 'all';
  vendorDeliverySyncState.status = 'idle';
  vendorDeliverySyncState.lastSynced = null;
  vendorDeliverySyncState.rows = [];
  vendorDeliverySyncState.fetchCount = 0;
  vendorDeliverySyncFilterState.year = 'all';
  vendorDeliverySyncFilterState.viewBy = 'quarter';
  vendorDeliverySyncFilterState.period = 'all';
  vendorDeliverySyncFilterState.page = 1;
  vendorDeliverySyncFilterState.category = 'all';
  vendorContractExecState.page = 1;
  vendorContractExecState.year = 'all';
  vendorContractExecState.viewBy = 'quarter';
  vendorContractExecState.period = 'all';
  vendorContractExecState.category = 'all';
  vendorInvoiceExecState.page = 1;
  vendorInvoiceExecState.year = 'all';
  vendorInvoiceExecState.viewBy = 'quarter';
  vendorInvoiceExecState.period = 'all';
  vendorInvoiceExecState.category = 'all';
  vendorPaymentExecState.page = 1;
  vendorPaymentExecState.year = 'all';
  vendorPaymentExecState.viewBy = 'quarter';
  vendorPaymentExecState.period = 'all';
  vendorPaymentExecState.category = 'all';
  vendorRenewalExecState.page = 1;
  vendorRenewalExecState.year = 'all';
  vendorRenewalExecState.viewBy = 'quarter';
  vendorRenewalExecState.period = 'all';
  vendorRenewalExecState.category = 'all';
  if (typeof VENDOR_WORKFLOW !== 'undefined') {
    VENDOR_WORKFLOW.forEach(s => {
      s.status = s.id <= 3 ? 'pending' : 'pending';
    });
  }
}

/** Vendor Profile & KYC page state */
const vendorProfileState = {
  editing: false,
  company: 'MediSupply India Pvt Ltd',
  vendorId: 'VND-MP-000123',
  gstin: '23AABCM1234A1Z5',
  pan: 'AABCM1234A',
  drugLicense: 'DL-MH-2024-0892',
  drugExpiry: '15-03-2027',
  iso: 'Certified',
  isoNote: 'Expires in 22 days',
  bank: 'HDFC Bank - ****4567',
  pendingEdit: null,
  contactName: 'Amit Verma',
  address: 'Plot 12, Industrial Area, Bhopal, MP - 462001',
  verified: true,
  empty: false
};

/** Seeded demo vendor account (keeps sample MediSupply data). */
function isSeededDemoVendor(user = authUser) {
  return !!user && user.id === 'vnd-001';
}

/** New / registered vendor still completing onboarding — show blank application details. */
function isBlankVendorOnboarding(user = authUser) {
  if (currentRole !== 'vendor' || !user || isSeededDemoVendor(user)) return false;
  return !(vendorStageState.completed?.[1] && vendorStageState.completed?.[2] && vendorStageState.completed?.[3]);
}

function syncVendorProfileFromAuth(user = authUser) {
  if (!user || user.role !== 'vendor') return;
  if (isSeededDemoVendor(user)) {
    Object.assign(vendorProfileState, {
      editing: false,
      company: user.organization || 'MediSupply India Pvt Ltd',
      vendorId: user.vendorId || 'VND-MP-000123',
      gstin: '23AABCM1234A1Z5',
      pan: 'AABCM1234A',
      drugLicense: 'DL-MH-2024-0892',
      drugExpiry: '15-03-2027',
      iso: 'Certified',
      isoNote: 'Expires in 22 days',
      bank: 'HDFC Bank - ****4567',
      contactName: user.name || 'Amit Verma',
      address: 'Plot 12, Industrial Area, Near Transport Nagar, Bhopal, Madhya Pradesh - PIN 462001',
      verified: true,
      empty: false,
      pendingEdit: null
    });
    return;
  }

  const reg = vendorStageState.registration || {};
  const kyc = vendorStageState.kyc || {};
  const hasIdentity = !!(reg.company || reg.gstin || vendorStageState.completed?.[1]);
  Object.assign(vendorProfileState, {
    editing: false,
    company: reg.company || user.organization || '',
    vendorId: user.vendorId || '—',
    gstin: reg.gstin || '',
    pan: reg.pan || '',
    drugLicense: kyc.license || '',
    drugExpiry: kyc.expiry || '',
    iso: '',
    isoNote: '',
    bank: kyc.bank ? `${kyc.bank}${kyc.account ? ' - ' + kyc.account : ''}` : '',
    contactName: reg.contactName || user.name || '',
    address: formatRegAddress(reg) || '',
    verified: !!vendorStageState.completed?.[3],
    empty: !hasIdentity,
    pendingEdit: null
  });
}

function formatRegAddress(reg = {}) {
  const line1 = [reg.street, reg.addressLine2].filter(Boolean).join(', ');
  const locality = [reg.city, reg.district].filter(Boolean).join(', ');
  const region = [reg.state, reg.pin ? `PIN ${reg.pin}` : ''].filter(Boolean).join(' - ');
  const composed = [line1, locality, region].filter(Boolean).join(', ');
  return composed || reg.address || '';
}

function hydrateRegAddressFields(reg) {
  if (!reg || typeof reg !== 'object') return reg;
  if (!reg.street && reg.address) {
    reg.street = String(reg.address);
  }
  if (!reg.state) reg.state = 'Madhya Pradesh';
  reg.address = formatRegAddress(reg);
  return reg;
}

function getRegistrationDistricts() {
  return ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Rewa', 'Ujjain', 'Sagar', 'Satna'];
}

function getRegistrationStates() {
  return ['Madhya Pradesh'];
}

function seedDemoVendorRegistrationDefaults() {
  vendorStageState.registrationSource = 'synced';
  vendorStageState.empanelment = defaultEmpanelmentState(true);
  vendorStageState.empanelment.source = 'synced';
  vendorStageState.approval = {
    systemLetter: true,
    approvedOn: '28-08-2026',
    letterNo: 'VAL/2026/0123'
  };
  vendorStageState.registration = {
    company: 'MediSupply India Pvt Ltd',
    contactName: authUser?.name || 'Amit Verma',
    category: 'Drugs, Consumables',
    categories: ['Drugs', 'Consumables'],
    gstin: '23AABCM1234A1Z5',
    pan: 'AABCM1234A',
    street: 'Plot 12, Industrial Area',
    addressLine2: 'Near Transport Nagar',
    city: 'Bhopal',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    pin: '462001',
    address: ''
  };
  hydrateRegAddressFields(vendorStageState.registration);
  vendorStageState.kyc = {
    holder: 'MediSupply India Pvt Ltd',
    bank: 'HDFC Bank',
    account: '****4567',
    ifsc: 'HDFC0001234',
    license: 'DL-MH-2024-0892',
    expiry: '15-03-2027'
  };
  vendorStageState.award = {
    tenderId: 'TND-2026-MP-0038',
    title: 'Hospital Linen Supply',
    loaStatus: 'Issued',
    loaDate: '29-08-2026',
    pbgDue: '13-09-2026',
    value: '₹85 L',
    acknowledged: false
  };
  vendorStageState.payment = {
    status: 'Awaiting Processing',
    timeline: 'Within 45 days of invoice acceptance',
    bank: 'HDFC Bank - ****4567',
    lastUpdate: '—',
    milestones: [
      { label: 'Invoice submitted', done: false },
      { label: 'Three-way match (PO / GRN / Invoice)', done: false },
      { label: 'Finance verification', done: false },
      { label: 'Payment released', done: false }
    ]
  };
}

function normalizeRegCategories(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v || '').trim()).filter(v => v && v !== 'Select category');
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,;|]/).map(s => s.trim()).filter(s => s && s !== 'Select category' && s !== 'Select one or more categories');
  }
  return [];
}

function formatRegCategories(cats) {
  return normalizeRegCategories(cats).join(', ');
}

function getVendorRegFormValues() {
  if (isSeededDemoVendor()) {
    const r = vendorStageState.registration || {};
    const categories = normalizeRegCategories(r.categories?.length ? r.categories : (r.category || 'Drugs, Consumables'));
    return {
      company: r.company || 'MediSupply India Pvt Ltd',
      contactName: r.contactName || authUser?.name || 'Amit Verma',
      category: formatRegCategories(categories) || 'Drugs, Consumables',
      categories,
      gstin: r.gstin || '23AABCM1234A1Z5',
      pan: r.pan || 'AABCM1234A',
      street: r.street || 'Plot 12, Industrial Area',
      addressLine2: r.addressLine2 || 'Near Transport Nagar',
      city: r.city || 'Bhopal',
      district: r.district || 'Bhopal',
      state: r.state || 'Madhya Pradesh',
      pin: r.pin || '462001',
      address: formatRegAddress(r) || 'Plot 12, Industrial Area, Bhopal, Madhya Pradesh - PIN 462001'
    };
  }
  const r = vendorStageState.registration || {};
  const categories = normalizeRegCategories(r.categories?.length ? r.categories : r.category);
  return {
    company: r.company || authUser?.organization || '',
    contactName: r.contactName || authUser?.name || '',
    category: formatRegCategories(categories),
    categories,
    gstin: r.gstin || '',
    pan: r.pan || '',
    street: r.street || '',
    addressLine2: r.addressLine2 || '',
    city: r.city || '',
    district: r.district || '',
    state: r.state || 'Madhya Pradesh',
    pin: r.pin || '',
    address: formatRegAddress(r)
  };
}

function getVendorKycFormValues() {
  if (isSeededDemoVendor()) {
    const k = vendorStageState.kyc || {};
    return {
      holder: k.holder || 'MediSupply India Pvt Ltd',
      bank: k.bank || 'HDFC Bank',
      account: k.account || '****4567',
      ifsc: k.ifsc || 'HDFC0001234',
      license: k.license || 'DL-MH-2024-0892',
      expiry: k.expiry || '15-03-2027'
    };
  }
  const k = vendorStageState.kyc || {};
  const reg = vendorStageState.registration || {};
  return {
    holder: k.holder || reg.company || authUser?.organization || '',
    bank: k.bank || '',
    account: k.account || '',
    ifsc: k.ifsc || '',
    license: k.license || '',
    expiry: k.expiry || ''
  };
}

function renderVendorOnboardingEmptyState(opts = {}) {
  const {
    icon = 'fa-clipboard-list',
    title = 'Complete your registration to get started',
    body = 'Your account is ready. Fill in the details below to begin the Bid-to-Pay lifecycle. Nothing is pre-filled — enter only verified information.',
    steps = [
      'Company & statutory details',
      'Category & product declaration',
      'KYC documents & bank verification'
    ]
  } = opts;
  return `<div class="onboard-empty" role="status">
    <div class="onboard-empty-icon"><i class="fa-solid ${icon}"></i></div>
    <div class="onboard-empty-copy">
      <h4>${title}</h4>
      <p>${body}</p>
      <ul class="onboard-empty-steps">
        ${steps.map((s, i) => `<li><span>${i + 1}</span>${s}</li>`).join('')}
      </ul>
    </div>
  </div>`;
}

/** Vendor Bid Submission (Stage 4) — read-only DVDMS sync */
const vendorBidDvdmsState = {
  status: 'idle', // idle | loading | synced | error
  lastSynced: null,
  rows: [],
  fetchCount: 0
};

const vendorBidDvdmsFilterState = {
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1,
  category: 'all'
};

function cloneVendorBidDvdmsSeedRows() {
  const seed = (typeof VENDOR_BID_DVDMS_API !== 'undefined' && Array.isArray(VENDOR_BID_DVDMS_API.rows))
    ? VENDOR_BID_DVDMS_API.rows
    : [];
  const vendorId = authUser?.vendorId || 'VND-MP-000000';
  return JSON.parse(JSON.stringify(seed)).map(r => ({
    ...r,
    vendorId,
    periodDate: r.periodDate || r.submittedOn || r.deadline || ''
  }));
}

function getVendorBidDvdmsMeta() {
  return {
    status: vendorBidDvdmsState.status === 'synced'
      ? 'Synced'
      : (vendorBidDvdmsState.status === 'error' ? 'Not synced' : (vendorBidDvdmsState.status === 'loading' ? 'Syncing' : 'Not synced')),
    lastSynced: vendorBidDvdmsState.lastSynced || '—'
  };
}

function bidStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('award')) return 'success';
  if (s.includes('evaluat') || s.includes('submitted')) return 'info';
  if (s.includes('draft') || s.includes('pending')) return 'warning';
  if (s.includes('reject') || s.includes('fail')) return 'danger';
  return 'muted';
}

function emdStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid') || s.includes('verified')) return 'success';
  if (s.includes('pending')) return 'warning';
  return 'muted';
}

function applyVendorBidDvdmsFetch({ isRefresh = false } = {}) {
  let rows = cloneVendorBidDvdmsSeedRows();
  vendorBidDvdmsState.fetchCount += 1;
  if (isRefresh && vendorBidDvdmsState.fetchCount > 1 && rows[1]) {
    rows[1].emdStatus = 'Paid';
    if (rows[1].status === 'Draft') rows[1].status = 'Under Evaluation';
    if (rows[1].submittedOn === '—') {
      rows[1].submittedOn = formatDateDMY(APP_TODAY);
      rows[1].periodDate = formatDateDMY(APP_TODAY);
    }
  }
  vendorBidDvdmsState.rows = rows;
  vendorBidDvdmsState.status = 'synced';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  vendorBidDvdmsState.lastSynced =
    `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} IST`;
  if (rows[0]) {
    vendorStageState.bid.tenderId = rows[0].tenderId;
    vendorStageState.bid.tenderTitle = rows[0].title;
    vendorStageState.bid.category = rows[0].category;
    vendorStageState.bid.emdStatus = rows[0].emdAmount ? `${rows[0].emdStatus} — ${rows[0].emdAmount}` : rows[0].emdStatus;
    vendorStageState.bid.deadline = rows[0].deadline;
  }
  vendorBidDvdmsFilterState.page = 1;
  if (rows.length) {
    vendorStageState.bid.submitted = true;
    if (!vendorStageState.completed?.[4]) completeVendorStage(4);
  }
}

function ensureVendorBidDvdmsLoaded() {
  if (vendorBidDvdmsState.status === 'synced' || vendorBidDvdmsState.status === 'loading') return;
  applyVendorBidDvdmsFetch({ isRefresh: false });
}

function getFilteredVendorBidDvdmsRows() {
  let rows = applyStagePeriodFilter(vendorBidDvdmsState.rows || [], vendorBidDvdmsFilterState, 'periodDate');
  const cat = vendorBidDvdmsFilterState.category;
  if (cat && cat !== 'all') {
    rows = rows.filter(r => r.category === cat);
  }
  return rows;
}

function getVendorBidDvdmsCategoryOptions() {
  const cats = [...new Set((vendorBidDvdmsState.rows || []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorBidDvdmsCategory(label) {
  vendorBidDvdmsFilterState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorBidDvdmsFilterState.page = 1;
  refreshWorkflowUI();
}

function bindVendorBidDvdmsCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="bidDvdmsCategory"]');
  if (!wrap || wrap.dataset.bidCatBound) return;
  wrap.dataset.bidCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('bidDvdmsCategory') : '');
    setVendorBidDvdmsCategory(label);
  });
}

function getBidArticleCoverage(bidRow) {
  const category = bidRow?.category || 'Drugs';
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[category] || []) : []);
  const biddedSet = new Set((bidRow?.biddedItems || []).map(n => String(n).trim().toLowerCase()));
  const articles = catalog.map(item => ({
    ...item,
    bidded: biddedSet.has(String(item.name).trim().toLowerCase())
  }));
  const biddedCount = articles.filter(a => a.bidded).length;
  return {
    category,
    articles,
    biddedCount,
    total: articles.length,
    notBiddedCount: Math.max(0, articles.length - biddedCount)
  };
}

function applyArticleCoverageStatusFilter(label) {
  const panel = document.querySelector('#modalBody .bid-article-panel');
  if (!panel) return;
  const yesLabel = (panel.dataset.yesLabel || 'Included').trim();
  const noLabel = (panel.dataset.noLabel || 'Not included').trim();
  const mode = (!label || label === 'All statuses')
    ? 'all'
    : label === noLabel || /^not\b/i.test(label)
      ? 'not'
      : 'yes';
  const rows = [...panel.querySelectorAll('tbody tr.bid-article-row')];
  let visible = 0;
  rows.forEach(tr => {
    const isYes = tr.classList.contains('is-bidded');
    const show = mode === 'all' || (mode === 'yes' && isYes) || (mode === 'not' && !isYes);
    tr.hidden = !show;
    if (show) {
      visible += 1;
      const numCell = tr.querySelector('td');
      if (numCell) numCell.textContent = String(visible);
    }
  });
  const empty = panel.querySelector('.bid-article-filter-empty');
  const tableWrap = panel.querySelector('.bid-article-table-wrap');
  if (empty) {
    empty.hidden = visible > 0;
    const emptyCopy = empty.querySelector('p');
    if (emptyCopy) emptyCopy.textContent = `No articles match the selected ${((panel.dataset.filterLabel || 'status')).toLowerCase()}.`;
  }
  if (tableWrap) tableWrap.hidden = visible === 0;
}

function bindArticleCoverageStatusFilter() {
  const wrap = document.querySelector('#modalBody .custom-select[data-select-id="articleCoverageStatus"]');
  if (!wrap || wrap.dataset.coverageStatusBound) return;
  wrap.dataset.coverageStatusBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('articleCoverageStatus') : '');
    applyArticleCoverageStatusFilter(label);
  });
}

function renderArticleCoverageStatusFilter(opts = {}) {
  const filterLabel = opts.filterLabel || opts.statusHead || 'Status';
  const yesLabel = opts.yesLabel || 'Included';
  const noLabel = opts.noLabel || 'Not included';
  return `<div class="article-coverage-filter" title="Filter by ${escapeHtmlLite(filterLabel)}">
      <span class="article-coverage-filter-label">${escapeHtmlLite(filterLabel)}</span>
      ${inlineCustomSelectHTML('articleCoverageStatus', ['All statuses', yesLabel, noLabel], 'All statuses')}
    </div>`;
}

function renderBidArticleCoveragePanel(bidRow) {
  const cov = getBidArticleCoverage(bidRow);
  if (!cov.articles.length) {
    return `<div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Category articles</div>
      <p class="dvdms-detail-note" style="margin:0.75rem">No master articles found for ${escapeHtmlLite(cov.category)}.</p>
    </div>`;
  }
  const filterOpts = {
    filterLabel: 'Bid Status',
    statusHead: 'Bid status',
    yesLabel: 'Bidded',
    noLabel: 'Not bidded'
  };
  const rows = cov.articles.map((a, idx) => `
    <tr class="${a.bidded ? 'bid-article-row is-bidded' : 'bid-article-row is-not-bidded'}" data-coverage-status="${a.bidded ? 'yes' : 'not'}">
      <td>${idx + 1}</td>
      <td>
        <strong>${escapeHtmlLite(a.name)}</strong>
        <div class="table-sub">${escapeHtmlLite(a.code || '—')} · ${escapeHtmlLite(a.unit || '—')}</div>
      </td>
      <td>${escapeHtmlLite(a.type || '—')}</td>
      <td>
        <span class="badge badge-${a.bidded ? 'success' : 'muted'}">
          <i class="fa-solid fa-${a.bidded ? 'circle-check' : 'circle-minus'}"></i>
          ${a.bidded ? 'Bidded' : 'Not bidded'}
        </span>
      </td>
    </tr>`).join('');

  return `<div class="dvdms-detail-panel bid-article-panel" data-yes-label="Bidded" data-no-label="Not bidded" data-filter-label="Bid Status">
    <div class="dvdms-detail-panel-head">
      ${escapeHtmlLite(cov.category)} articles · bid coverage
      <span class="bid-article-coverage-meta">
        <span class="badge badge-success">${cov.biddedCount} bidded</span>
        <span class="badge badge-muted">${cov.notBiddedCount} not bidded</span>
        <span class="badge badge-info">${cov.total} total</span>
      </span>
    </div>
    <div class="bid-article-toolbar">
      <div class="bid-article-legend">
        <span><i class="fa-solid fa-circle-check"></i> Included in this vendor bid</span>
        <span><i class="fa-solid fa-circle-minus"></i> In category catalogue · not quoted on this bid</span>
      </div>
      ${renderArticleCoverageStatusFilter(filterOpts)}
    </div>
    <div class="data-table-wrap bid-article-table-wrap">
      <table class="data-table data-table--modal bid-article-table">
        <thead>
          <tr><th>#</th><th>Article / Item</th><th>Type</th><th>Bid status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="bid-article-filter-empty" hidden>
      <i class="fa-solid fa-filter"></i>
      <p>No articles match the selected bid status.</p>
    </div>
  </div>`;
}

function renderVendorBidDvdmsTableRows(rows) {
  return rows.map(r => {
    const id = escapeHtmlLite(r.bidId);
    const emdStatus = escapeHtmlLite(r.emdStatus || '—');
    const emdAmount = r.emdAmount ? escapeHtmlLite(r.emdAmount) : '';
    return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorBidDvdmsDetail('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorBidDvdmsDetail('${id}')}" title="View bid details">
      <td class="cell-id"><strong>${id}</strong></td>
      <td class="cell-tender"><strong>${escapeHtmlLite(r.tenderId)}</strong><div class="table-sub">${escapeHtmlLite(r.title || '')}</div></td>
      <td class="cell-category">${escapeHtmlLite(r.category || '—')}</td>
      <td class="cell-emd">
        <span class="status-stack">
          <span class="badge badge-${emdStatusBadgeClass(r.emdStatus)}">${emdStatus}</span>
          ${emdAmount ? `<span class="status-meta">${emdAmount}</span>` : ''}
        </span>
      </td>
      <td class="cell-nowrap">${escapeHtmlLite(r.deadline || '—')}</td>
      <td class="cell-nowrap">${escapeHtmlLite(r.techStatus || '—')}</td>
      <td class="cell-nowrap">${escapeHtmlLite(r.finStatus || '—')}</td>
      <td class="cell-status"><span class="badge badge-${bidStatusBadgeClass(r.status)}">${escapeHtmlLite(r.status || '—')}</span></td>
      <td class="cell-nowrap">${escapeHtmlLite(r.submittedOn || '—')}</td>
    </tr>`;
  }).join('');
}

function renderVendorBidSubmissionStage(canEdit = true) {
  ensureVendorBidDvdmsLoaded();
  const meta = getVendorBidDvdmsMeta();
  const filtered = getFilteredVendorBidDvdmsRows();
  const paged = paginateItems(filtered, vendorBidDvdmsFilterState.page, 10);
  vendorBidDvdmsFilterState.page = paged.page;
  const loading = vendorBidDvdmsState.status === 'loading';
  const refreshDis = loading ? ' disabled' : '';
  const periodLabel = getWfPeriodFilterLabel(vendorBidDvdmsFilterState);
  const categoryOptions = getVendorBidDvdmsCategoryOptions();
  const categorySelected = vendorBidDvdmsFilterState.category === 'all'
    ? 'All categories'
    : vendorBidDvdmsFilterState.category;

  const emptyBlock = !vendorBidDvdmsState.rows.length
    ? renderVendorOnboardingEmptyState({
        icon: 'fa-file-invoice',
        title: 'No bid records yet',
        body: 'No bids were returned for your vendor code. Refresh to pull the latest bid status once tenders are submitted.',
        steps: ['Submit your bid externally', 'Refresh to load bid records', 'Review synced bid status to continue']
      })
    : '';

  const filterEmptyRow = !paged.items.length && vendorBidDvdmsState.rows.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No bid records match <strong>${escapeHtmlLite(periodLabel)}</strong>${vendorBidDvdmsFilterState.category !== 'all' ? ` · ${escapeHtmlLite(vendorBidDvdmsFilterState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorBidDvdmsCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  const tableBlock = `<div class="data-table-wrap bid-dvdms-table-wrap">
        <div class="table-header bid-records-header">
          <h3>Bid records <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-category-filter" title="Filter by category">
            <span class="bid-records-category-label">Category</span>
            ${inlineCustomSelectHTML('bidDvdmsCategory', categoryOptions, categorySelected)}
          </div>
        </div>
        ${renderCompactWfPeriodFilter('vendorBidDvdms', vendorBidDvdmsFilterState)}
        <div class="bid-dvdms-table-scroll">
          <table class="data-table bid-sync-table">
            <thead>
              <tr>
                <th>Bid ID</th>
                <th>Tender</th>
                <th>Category</th>
                <th>EMD</th>
                <th>Deadline</th>
                <th>Technical</th>
                <th>Financial</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>${paged.items.length ? renderVendorBidDvdmsTableRows(paged.items) : filterEmptyRow}</tbody>
          </table>
        </div>
        ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorBidDvdmsPage', { hideInfo: true }) : ''}
      </div>`;

  return `<div class="need-api bid-dvdms-stage">
    <div class="need-api-banner">
      <div class="need-api-banner-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
      <div class="need-api-banner-text">
        <strong>Bid records</strong>
        <p>Bid status, EMD and document flags · Last synced <strong>${escapeHtmlLite(meta.lastSynced)}</strong></p>
      </div>
      <div class="need-api-banner-actions">
        ${renderApiSyncBadge(meta.status === 'Syncing' ? 'Not synced' : meta.status)}
        <button type="button" class="btn btn-outline btn-sm" onclick="refreshVendorBidDvdmsApi()"${refreshDis}>
          <i class="fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}"></i> ${loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
    </div>

    ${emptyBlock}
    ${vendorBidDvdmsState.rows.length ? tableBlock : ''}
  </div>`;
}

function setVendorBidDvdmsPage(page) {
  vendorBidDvdmsFilterState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function refreshVendorBidDvdmsApi() {
  if (vendorBidDvdmsState.status === 'loading') return;
  vendorBidDvdmsState.status = 'loading';
  try {
    refreshWorkflowUI();
  } catch (err) {
    console.warn('Bid UI refresh failed during loading state', err);
  }

  setTimeout(() => {
    try {
      applyVendorBidDvdmsFetch({ isRefresh: true });
      persistVendorLifecycle();
      refreshWorkflowUI();
      openModal('Data refreshed', `
        <div class="sync-success-msg">
          <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h4>Latest bid records are ready</h4>
          <p>Fetched <strong>${vendorBidDvdmsState.rows.length}</strong> bid record(s) for vendor <strong>${escapeHtmlLite(authUser?.vendorId || '—')}</strong>. Use the period filter or click a row for details.</p>
        </div>
      `);
    } catch (err) {
      console.warn('Bid sync failed', err);
      vendorBidDvdmsState.status = 'error';
      refreshWorkflowUI();
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Bid records could not be updated</h4>
          <p>Sync did not complete. Please try Refresh again in a moment.</p>
        </div>
      `);
    }
  }, 650);
}

function confirmVendorBidDvdmsSync() {
  if (!vendorBidDvdmsState.rows.length) {
    showWfAlert('No bid records synced yet. Click Refresh to fetch the latest data.');
    return;
  }
  const primary = vendorBidDvdmsState.rows.find(r => /submitted|evaluat|award/i.test(r.status)) || vendorBidDvdmsState.rows[0];
  vendorStageState.bid.tenderId = primary.tenderId || vendorStageState.bid.tenderId;
  vendorStageState.bid.tenderTitle = primary.title || vendorStageState.bid.tenderTitle;
  vendorStageState.bid.category = primary.category || vendorStageState.bid.category;
  vendorStageState.bid.emdStatus = primary.emdAmount ? `${primary.emdStatus} — ${primary.emdAmount}` : (primary.emdStatus || '');
  vendorStageState.bid.deadline = primary.deadline || '';
  vendorStageState.bid.submitted = true;
  completeVendorStage(4);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert('Bid sync confirmed. You can proceed to Award Notification.', 'success');
}

function openVendorBidDvdmsDetail(bidId) {
  const r = (vendorBidDvdmsState.rows || []).find(x => x.bidId === bidId);
  if (!r) {
    showWfAlert('Bid record not found.');
    return;
  }
  const emdLabel = r.emdAmount ? `${r.emdStatus} · ${r.emdAmount}` : (r.emdStatus || '—');
  const showArticleCoverage = categoryUsesItemWiseDetail(r.category);
  const cov = showArticleCoverage ? getBidArticleCoverage(r) : null;
  const rows = [
    ['Bid ID', r.bidId],
    ['Vendor ID', r.vendorId || authUser?.vendorId || '—'],
    ['Tender ID', r.tenderId],
    ['Title', r.title || '—'],
    ['Category', r.category || '—'],
    ['Bid deadline', r.deadline || '—'],
    ['Submitted on', r.submittedOn || '—'],
    ['Technical pack', r.techStatus || '—'],
    ['Financial pack', r.finStatus || '—'],
    ['EMD', emdLabel]
  ];
  if (cov) {
    rows.push(['Articles bidded', `${cov.biddedCount} of ${cov.total}`]);
  }
  openModal(`${escapeHtmlLite(r.bidId)} — Bid details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Bid details</p>
        <h3>${escapeHtmlLite(r.title || 'Bid record')}</h3>
        <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${bidStatusBadgeClass(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Technical</span><strong>${escapeHtmlLite(r.techStatus || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Financial</span><strong>${escapeHtmlLite(r.finStatus || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>EMD</span><strong>${escapeHtmlLite(emdLabel)}</strong></div>
      <div class="dvdms-detail-stat"><span>Deadline</span><strong>${escapeHtmlLite(r.deadline || '—')}</strong></div>
    </div>
    ${cov ? `<div class="dvdms-detail-stats bid-coverage-stats">
      <div class="dvdms-detail-stat"><span>Category articles</span><strong>${cov.total}</strong></div>
      <div class="dvdms-detail-stat is-bidded"><span>Bidded by vendor</span><strong>${cov.biddedCount}</strong></div>
      <div class="dvdms-detail-stat is-not-bidded"><span>Not bidded</span><strong>${cov.notBiddedCount}</strong></div>
      <div class="dvdms-detail-stat"><span>Coverage</span><strong>${cov.total ? Math.round((cov.biddedCount / cov.total) * 100) : 0}%</strong></div>
    </div>
    ${renderBidArticleCoveragePanel(r)}` : ''}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Bid summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="dvdms-detail-note">${/draft/i.test(r.status)
      ? 'This bid is still in draft. Complete packs and EMD, then refresh here after submission.'
      : /evaluat/i.test(r.status)
        ? 'Your bid is under evaluation. Commercial opening follows technical qualification.'
        : /award/i.test(r.status)
          ? 'This bid has been awarded. Proceed to Award Notification in the Bid-to-Pay lifecycle.'
          : 'Review pack completeness and status for this tender.'}</p>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

/** Vendor Award Notification (Stage 5) — read-only synced award / LOA records */
const vendorAwardSyncState = {
  status: 'idle',
  lastSynced: null,
  rows: [],
  fetchCount: 0
};

const vendorAwardSyncFilterState = {
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1,
  category: 'all'
};

function cloneVendorAwardSyncSeedRows() {
  const seed = (typeof VENDOR_AWARD_SYNC_API !== 'undefined' && Array.isArray(VENDOR_AWARD_SYNC_API.rows))
    ? VENDOR_AWARD_SYNC_API.rows
    : [];
  const vendorId = authUser?.vendorId || 'VND-MP-000000';
  return JSON.parse(JSON.stringify(seed)).map(r => ({
    ...r,
    vendorId,
    periodDate: r.periodDate || r.loaDate || ''
  }));
}

function getVendorAwardSyncMeta() {
  return {
    status: vendorAwardSyncState.status === 'synced'
      ? 'Synced'
      : (vendorAwardSyncState.status === 'error' ? 'Not synced' : (vendorAwardSyncState.status === 'loading' ? 'Syncing' : 'Not synced')),
    lastSynced: vendorAwardSyncState.lastSynced || '—'
  };
}

function awardAckBadgeClass(ack) {
  const s = String(ack || '').toLowerCase();
  if (s.includes('acknowledged')) return 'success';
  if (s.includes('pending')) return 'warning';
  return 'muted';
}

function applyVendorAwardSyncFetch({ isRefresh = false } = {}) {
  let rows = cloneVendorAwardSyncSeedRows();
  vendorAwardSyncState.fetchCount += 1;
  if (isRefresh && vendorAwardSyncState.fetchCount > 1 && rows[0] && rows[0].acknowledgement === 'Pending') {
    // Keep pending so user can still acknowledge; lightly refresh LOA date stamp feel
    rows[0].loaStatus = 'Issued';
  }
  // Reflect in-session acknowledgements
  if (vendorStageState.award?.acknowledged && vendorStageState.award?.tenderId) {
    rows = rows.map(r => {
      if (r.tenderId === vendorStageState.award.tenderId || r.acknowledgement === 'Acknowledged') {
        return { ...r, acknowledgement: r.tenderId === vendorStageState.award.tenderId ? 'Acknowledged' : r.acknowledgement, loaStatus: r.tenderId === vendorStageState.award.tenderId ? 'Acknowledged' : r.loaStatus };
      }
      return r;
    });
  }
  vendorAwardSyncState.rows = rows;
  vendorAwardSyncState.status = 'synced';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  vendorAwardSyncState.lastSynced =
    `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} IST`;
  if (rows[0] && !vendorStageState.award?.tenderId) {
    vendorStageState.award.tenderId = rows[0].tenderId;
    vendorStageState.award.title = rows[0].title;
    vendorStageState.award.loaStatus = rows[0].loaStatus;
    vendorStageState.award.loaDate = rows[0].loaDate;
    vendorStageState.award.pbgDue = rows[0].pbgDue;
    vendorStageState.award.value = rows[0].value;
  }
  vendorAwardSyncFilterState.page = 1;
  if (vendorStageState.award?.acknowledged && !vendorStageState.completed?.[5]) {
    completeVendorStage(5);
  }
}

function ensureVendorAwardSyncLoaded() {
  if (vendorAwardSyncState.status === 'synced' || vendorAwardSyncState.status === 'loading') return;
  applyVendorAwardSyncFetch({ isRefresh: false });
}

function getFilteredVendorAwardSyncRows() {
  let rows = applyStagePeriodFilter(vendorAwardSyncState.rows || [], vendorAwardSyncFilterState, 'periodDate');
  const cat = vendorAwardSyncFilterState.category;
  if (cat && cat !== 'all') {
    rows = rows.filter(r => r.category === cat);
  }
  return rows;
}

function getVendorAwardSyncCategoryOptions() {
  const cats = [...new Set((vendorAwardSyncState.rows || []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorAwardSyncCategory(label) {
  vendorAwardSyncFilterState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorAwardSyncFilterState.page = 1;
  refreshWorkflowUI();
}

function bindVendorAwardSyncCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="awardSyncCategory"]');
  if (!wrap || wrap.dataset.awardCatBound) return;
  wrap.dataset.awardCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('awardSyncCategory') : '');
    setVendorAwardSyncCategory(label);
  });
}

function categoryUsesItemWiseDetail(category) {
  return /^(drugs|consumables|equipment)$/i.test(String(category || '').trim());
}

function categoryUsesItemWiseAwardDetail(category) {
  return categoryUsesItemWiseDetail(category);
}

function resolveLifecycleCoveredItems(row) {
  if (row?.forceEmptyCoverage) return [];
  const direct = row?.coveredItems || row?.awardedItems || row?.biddedItems
    || row?.deliveredItems || row?.invoicedItems || row?.paidItems || row?.renewalItems
    || row?.poItems || row?.grnItems;
  if (Array.isArray(direct) && direct.length) return direct;
  const tenderId = row?.tenderId;
  if (!tenderId) return [];
  const liveAward = (typeof vendorAwardSyncState !== 'undefined' ? (vendorAwardSyncState.rows || []) : [])
    .find(a => a.tenderId === tenderId);
  if (liveAward?.awardedItems?.length) return liveAward.awardedItems;
  const award = (typeof VENDOR_AWARD_SYNC_API !== 'undefined' ? VENDOR_AWARD_SYNC_API.rows : [])
    .find(a => a.tenderId === tenderId);
  if (award?.awardedItems?.length) return award.awardedItems;
  const liveBid = (typeof vendorBidDvdmsState !== 'undefined' ? (vendorBidDvdmsState.rows || []) : [])
    .find(b => b.tenderId === tenderId);
  if (liveBid?.biddedItems?.length) return liveBid.biddedItems;
  const bid = (typeof VENDOR_BID_DVDMS_API !== 'undefined' ? VENDOR_BID_DVDMS_API.rows : [])
    .find(b => b.tenderId === tenderId);
  if (bid?.biddedItems?.length) return bid.biddedItems;
  return [];
}

/** Demo coverage for gov Stage 9–14 modals — prefer synced items, else category catalogue sample. */
function getGovStageCoveredItems(row, opts = {}) {
  if (row?.forceEmptyCoverage) return [];
  const resolved = resolveLifecycleCoveredItems(row);
  if (resolved.length) return resolved;
  if (!categoryUsesItemWiseDetail(row?.category)) return [];
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[row.category] || []) : []);
  if (!catalog.length) return [];
  const take = Math.min(catalog.length, Math.max(2, Number(opts.take) || 5));
  return catalog.slice(0, take).map(i => i.name);
}

function bindGovStageCoverageFilter() {
  setTimeout(() => {
    if (typeof bindArticleCoverageStatusFilter === 'function') bindArticleCoverageStatusFilter();
  }, 0);
}

function getLifecycleArticleCoverage(row) {
  const category = row?.category || 'Drugs';
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[category] || []) : []);
  const coveredSet = new Set(resolveLifecycleCoveredItems(row).map(n => String(n).trim().toLowerCase()));
  const articles = catalog.map(item => ({
    ...item,
    covered: coveredSet.has(String(item.name).trim().toLowerCase())
  }));
  const coveredCount = articles.filter(a => a.covered).length;
  return {
    category,
    articles,
    coveredCount,
    total: articles.length,
    notCoveredCount: Math.max(0, articles.length - coveredCount)
  };
}

function renderLifecycleArticleCoveragePanel(row, opts = {}) {
  const yesLabel = opts.yesLabel || 'Included';
  const noLabel = opts.noLabel || 'Not included';
  const headTitle = opts.headTitle || `${row?.category || 'Category'} articles · coverage`;
  const yesHint = opts.yesHint || 'Included for this record';
  const noHint = opts.noHint || 'In category catalogue · not part of this record';
  const statusHead = opts.statusHead || 'Status';
  const filterLabel = opts.filterLabel || statusHead;
  const cov = getLifecycleArticleCoverage(row);
  if (!cov.articles.length) {
    return `<div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Category articles</div>
      <p class="dvdms-detail-note" style="margin:0.75rem">No master articles found for ${escapeHtmlLite(cov.category)}.</p>
    </div>`;
  }
  const rows = cov.articles.map((a, idx) => `
    <tr class="${a.covered ? 'bid-article-row is-bidded' : 'bid-article-row is-not-bidded'}" data-coverage-status="${a.covered ? 'yes' : 'not'}">
      <td>${idx + 1}</td>
      <td>
        <strong>${escapeHtmlLite(a.name)}</strong>
        <div class="table-sub">${escapeHtmlLite(a.code || '—')} · ${escapeHtmlLite(a.unit || '—')}</div>
      </td>
      <td>${escapeHtmlLite(a.type || '—')}</td>
      <td>
        <span class="badge badge-${a.covered ? 'success' : 'muted'}">
          <i class="fa-solid fa-${a.covered ? 'circle-check' : 'circle-minus'}"></i>
          ${a.covered ? yesLabel : noLabel}
        </span>
      </td>
    </tr>`).join('');

  return `<div class="dvdms-detail-panel bid-article-panel" data-yes-label="${escapeHtmlLite(yesLabel)}" data-no-label="${escapeHtmlLite(noLabel)}" data-filter-label="${escapeHtmlLite(filterLabel)}">
    <div class="dvdms-detail-panel-head">
      ${escapeHtmlLite(headTitle)}
      <span class="bid-article-coverage-meta">
        <span class="badge badge-success">${cov.coveredCount} ${yesLabel.toLowerCase()}</span>
        <span class="badge badge-muted">${cov.notCoveredCount} ${noLabel.toLowerCase()}</span>
        <span class="badge badge-info">${cov.total} total</span>
      </span>
    </div>
    <div class="bid-article-toolbar">
      <div class="bid-article-legend">
        <span><i class="fa-solid fa-circle-check"></i> ${escapeHtmlLite(yesHint)}</span>
        <span><i class="fa-solid fa-circle-minus"></i> ${escapeHtmlLite(noHint)}</span>
      </div>
      ${renderArticleCoverageStatusFilter({ filterLabel, statusHead, yesLabel, noLabel })}
    </div>
    <div class="data-table-wrap bid-article-table-wrap">
      <table class="data-table data-table--modal bid-article-table">
        <thead>
          <tr><th>#</th><th>Article / Item</th><th>Type</th><th>${escapeHtmlLite(statusHead)}</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="bid-article-filter-empty" hidden>
      <i class="fa-solid fa-filter"></i>
      <p>No articles match the selected ${escapeHtmlLite(filterLabel.toLowerCase())}.</p>
    </div>
  </div>`;
}

function renderLifecycleCategoryScopePanel(row, opts = {}) {
  const category = row?.category || '—';
  const stageTitle = opts.stageTitle || `${category} · category-wise detail`;
  const value = row?.value || row?.amount || row?.netPayable || '—';
  const scope = row?.awardScope || row?.categoryScope
    || `This ${category} ${opts.noun || 'record'} is managed at category level. Line-item article coverage does not apply.`;
  return `<div class="dvdms-detail-panel award-category-scope-panel">
    <div class="dvdms-detail-panel-head">${escapeHtmlLite(stageTitle)}</div>
    <div class="award-category-scope-body">
      <div class="award-category-scope-grid">
        <div class="award-category-scope-card">
          <span>Detail type</span>
          <strong>Category-level</strong>
        </div>
        <div class="award-category-scope-card">
          <span>Category</span>
          <strong>${escapeHtmlLite(category)}</strong>
        </div>
        <div class="award-category-scope-card">
          <span>Value</span>
          <strong>${escapeHtmlLite(value)}</strong>
        </div>
        <div class="award-category-scope-card">
          <span>Reference</span>
          <strong>${escapeHtmlLite(row?.tenderId || row?.poId || row?.contractId || row?.id || '—')}</strong>
        </div>
      </div>
      <p class="award-category-scope-note">
        <i class="fa-solid fa-layer-group"></i>
        ${escapeHtmlLite(scope)}
      </p>
    </div>
  </div>`;
}

function renderLifecycleCoverageBlock(row, opts = {}) {
  if (!categoryUsesItemWiseDetail(row?.category)) {
    return renderLifecycleCategoryScopePanel(row, opts);
  }
  const cov = getLifecycleArticleCoverage(row);
  const yesLabel = opts.yesLabel || 'Included';
  return `<div class="dvdms-detail-stats bid-coverage-stats">
      <div class="dvdms-detail-stat"><span>Category articles</span><strong>${cov.total}</strong></div>
      <div class="dvdms-detail-stat is-bidded"><span>${escapeHtmlLite(yesLabel)}</span><strong>${cov.coveredCount}</strong></div>
      <div class="dvdms-detail-stat is-not-bidded"><span>Not ${escapeHtmlLite(yesLabel.toLowerCase())}</span><strong>${cov.notCoveredCount}</strong></div>
      <div class="dvdms-detail-stat"><span>Coverage</span><strong>${cov.total ? Math.round((cov.coveredCount / cov.total) * 100) : 0}%</strong></div>
    </div>
    ${renderLifecycleArticleCoveragePanel(row, opts)}`;
}

function getAwardArticleCoverage(awardRow) {
  const cov = getLifecycleArticleCoverage({ ...awardRow, coveredItems: awardRow?.awardedItems || resolveLifecycleCoveredItems(awardRow) });
  return {
    category: cov.category,
    articles: cov.articles.map(a => ({ ...a, awarded: a.covered })),
    awardedCount: cov.coveredCount,
    total: cov.total,
    notAwardedCount: cov.notCoveredCount
  };
}

function renderAwardArticleCoveragePanel(awardRow) {
  return renderLifecycleArticleCoveragePanel(
    { ...awardRow, coveredItems: awardRow?.awardedItems || resolveLifecycleCoveredItems(awardRow) },
    {
      headTitle: `${awardRow?.category || 'Category'} articles · award coverage`,
      yesLabel: 'Awarded',
      noLabel: 'Not awarded',
      yesHint: 'Line items covered under this LOA / award',
      noHint: 'In category catalogue · not part of this award',
      statusHead: 'Award status',
      filterLabel: 'Award Status'
    }
  );
}

function renderAwardCategoryScopePanel(awardRow) {
  const category = awardRow?.category || '—';
  const scope = awardRow?.awardScope
    || `This ${category} award is issued at category level. Line-item article coverage does not apply.`;
  return `<div class="dvdms-detail-panel award-category-scope-panel">
    <div class="dvdms-detail-panel-head">${escapeHtmlLite(category)} · category-wise award</div>
    <div class="award-category-scope-body">
      <div class="award-category-scope-grid">
        <div class="award-category-scope-card">
          <span>Award type</span>
          <strong>Category-level LOA</strong>
        </div>
        <div class="award-category-scope-card">
          <span>Category</span>
          <strong>${escapeHtmlLite(category)}</strong>
        </div>
        <div class="award-category-scope-card">
          <span>Award value</span>
          <strong>${escapeHtmlLite(awardRow?.value || '—')}</strong>
        </div>
        <div class="award-category-scope-card">
          <span>PBG due</span>
          <strong>${escapeHtmlLite(awardRow?.pbgDue || '—')}</strong>
        </div>
      </div>
      <p class="award-category-scope-note">
        <i class="fa-solid fa-layer-group"></i>
        ${escapeHtmlLite(scope)}
      </p>
    </div>
  </div>`;
}

function loaStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('acknowledged')) return 'success';
  if (s.includes('issued')) return 'info';
  if (s.includes('pending')) return 'warning';
  return 'muted';
}

function renderVendorAwardSyncTableRows(rows) {
  return rows.map(r => {
    const id = escapeHtmlLite(r.awardId);
    return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorAwardSyncDetail('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorAwardSyncDetail('${id}')}" title="View award details">
      <td class="cell-id"><strong>${id}</strong></td>
      <td class="cell-tender"><strong>${escapeHtmlLite(r.tenderId)}</strong><div class="table-sub">${escapeHtmlLite(r.title || '')}</div></td>
      <td class="cell-category">${escapeHtmlLite(r.category || '—')}</td>
      <td class="cell-status"><span class="badge badge-${loaStatusBadgeClass(r.loaStatus)}">${escapeHtmlLite(r.loaStatus || '—')}</span></td>
      <td class="cell-nowrap">${escapeHtmlLite(r.loaDate || '—')}</td>
      <td class="cell-nowrap"><strong>${escapeHtmlLite(r.pbgDue || '—')}</strong></td>
      <td class="cell-award-value"><span class="masked-value" title="Sensitive — masked">${maskSensitiveValue(r.value)}</span></td>
      <td class="cell-status"><span class="badge badge-${awardAckBadgeClass(r.acknowledgement)}">${escapeHtmlLite(r.acknowledgement || '—')}</span></td>
    </tr>`;
  }).join('');
}

function renderVendorAwardNotificationStage(canEdit = true) {
  ensureVendorAwardSyncLoaded();
  const meta = getVendorAwardSyncMeta();
  const filtered = getFilteredVendorAwardSyncRows();
  const paged = paginateItems(filtered, vendorAwardSyncFilterState.page, 10);
  vendorAwardSyncFilterState.page = paged.page;
  const loading = vendorAwardSyncState.status === 'loading';
  const refreshDis = loading ? ' disabled' : '';
  const periodLabel = getWfPeriodFilterLabel(vendorAwardSyncFilterState);
  const categoryOptions = getVendorAwardSyncCategoryOptions();
  const categorySelected = vendorAwardSyncFilterState.category === 'all'
    ? 'All categories'
    : vendorAwardSyncFilterState.category;

  const emptyBlock = !vendorAwardSyncState.rows.length
    ? renderVendorOnboardingEmptyState({
        icon: 'fa-trophy',
        title: 'No award records yet',
        body: 'No awards were returned for your vendor code. Refresh to pull the latest LOA / award status once awards are issued.',
        steps: ['Win / receive an award', 'Refresh to load award records', 'Acknowledge LOA to continue']
      })
    : '';

  const filterEmptyRow = !paged.items.length && vendorAwardSyncState.rows.length
    ? `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No award records match <strong>${escapeHtmlLite(periodLabel)}</strong>${vendorAwardSyncFilterState.category !== 'all' ? ` · ${escapeHtmlLite(vendorAwardSyncFilterState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorAwardSyncCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  const headerBlock = `<div class="table-header bid-records-header">
          <h3>Award records <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-category-filter" title="Filter by category">
            <span class="bid-records-category-label">Category</span>
            ${inlineCustomSelectHTML('awardSyncCategory', categoryOptions, categorySelected)}
          </div>
        </div>`;

  const tableBlock = `<div class="data-table-wrap bid-dvdms-table-wrap award-records-table-wrap">
        ${headerBlock}
        ${renderCompactWfPeriodFilter('vendorAwardSync', vendorAwardSyncFilterState)}
        <div class="bid-dvdms-table-scroll">
          <table class="data-table award-sync-table">
            <thead>
              <tr>
                <th>Award ID</th>
                <th>Tender</th>
                <th>Category</th>
                <th>LOA Status</th>
                <th>LOA Date</th>
                <th>PBG Due</th>
                <th>Award Value</th>
                <th>Acknowledgement</th>
              </tr>
            </thead>
            <tbody>${paged.items.length ? renderVendorAwardSyncTableRows(paged.items) : filterEmptyRow}</tbody>
          </table>
        </div>
        ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorAwardSyncPage', { hideInfo: true }) : ''}
      </div>`;

  return `<div class="need-api bid-dvdms-stage">
    <div class="need-api-banner">
      <div class="need-api-banner-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
      <div class="need-api-banner-text">
        <strong>Award records</strong>
        <p>LOA status, PBG due dates and acknowledgement · Last synced <strong>${escapeHtmlLite(meta.lastSynced)}</strong></p>
      </div>
      <div class="need-api-banner-actions">
        ${renderApiSyncBadge(meta.status === 'Syncing' ? 'Not synced' : meta.status)}
        <button type="button" class="btn btn-outline btn-sm" onclick="refreshVendorAwardSyncApi()"${refreshDis}>
          <i class="fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}"></i> ${loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
    </div>

    ${emptyBlock}
    ${vendorAwardSyncState.rows.length ? tableBlock : ''}
  </div>`;
}

function setVendorAwardSyncPage(page) {
  vendorAwardSyncFilterState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function refreshVendorAwardSyncApi() {
  if (vendorAwardSyncState.status === 'loading') return;
  vendorAwardSyncState.status = 'loading';
  try {
    refreshWorkflowUI();
  } catch (err) {
    console.warn('Award UI refresh failed during loading state', err);
  }

  setTimeout(() => {
    try {
      applyVendorAwardSyncFetch({ isRefresh: true });
      persistVendorLifecycle();
      refreshWorkflowUI();
      openModal('Data refreshed', `
        <div class="sync-success-msg">
          <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h4>Latest award records are ready</h4>
          <p>Fetched <strong>${vendorAwardSyncState.rows.length}</strong> award record(s) for vendor <strong>${escapeHtmlLite(authUser?.vendorId || '—')}</strong>. Use the period filter or click a row for details.</p>
        </div>
      `);
    } catch (err) {
      console.warn('Award sync failed', err);
      vendorAwardSyncState.status = 'error';
      refreshWorkflowUI();
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Award records could not be updated</h4>
          <p>Sync did not complete. Please try Refresh again in a moment.</p>
        </div>
      `);
    }
  }, 650);
}

function acknowledgeVendorAward(awardId) {
  const r = (vendorAwardSyncState.rows || []).find(x => x.awardId === awardId);
  if (!r) {
    showWfAlert('Award record not found.');
    return;
  }
  r.acknowledgement = 'Acknowledged';
  r.loaStatus = 'Acknowledged';
  vendorStageState.award.tenderId = r.tenderId;
  vendorStageState.award.title = r.title;
  vendorStageState.award.loaStatus = 'Acknowledged';
  vendorStageState.award.loaDate = r.loaDate;
  vendorStageState.award.pbgDue = r.pbgDue;
  vendorStageState.award.value = r.value;
  vendorStageState.award.acknowledged = true;
  vendorStageState.contract.pbgStatus = '';
  vendorStageState.contract.contractStatus = '';
  if (!vendorStageState.completed?.[5]) completeVendorStage(5);
  persistVendorLifecycle();
  closeModal();
  refreshWorkflowUI();
  showWfAlert('LOA acknowledged. You can proceed to Contract Execution.', 'success');
}

function confirmVendorAwardSync() {
  if (!vendorAwardSyncState.rows.length) {
    showWfAlert('No award records synced yet. Click Refresh to fetch the latest data.');
    return;
  }
  const ack = vendorAwardSyncState.rows.find(r => /acknowledged/i.test(r.acknowledgement));
  if (!ack && !vendorStageState.award?.acknowledged) {
    showWfAlert('Acknowledge at least one LOA from the award details before continuing.');
    return;
  }
  const primary = ack || vendorAwardSyncState.rows[0];
  vendorStageState.award.tenderId = primary.tenderId;
  vendorStageState.award.title = primary.title;
  vendorStageState.award.loaStatus = primary.loaStatus;
  vendorStageState.award.loaDate = primary.loaDate;
  vendorStageState.award.pbgDue = primary.pbgDue;
  vendorStageState.award.value = primary.value;
  vendorStageState.award.acknowledged = true;
  completeVendorStage(5);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert('Award sync confirmed. You can proceed to Contract Execution.', 'success');
}

function openVendorAwardSyncDetail(awardId) {
  const r = (vendorAwardSyncState.rows || []).find(x => x.awardId === awardId);
  if (!r) {
    showWfAlert('Award record not found.');
    return;
  }
  const ackDone = /acknowledged/i.test(r.acknowledgement) || (vendorStageState.award?.acknowledged && vendorStageState.award?.tenderId === r.tenderId);
  const itemWise = categoryUsesItemWiseAwardDetail(r.category);
  const cov = itemWise ? getAwardArticleCoverage(r) : null;
  const rows = [
    ['Award ID', r.awardId],
    ['Vendor ID', r.vendorId || authUser?.vendorId || '—'],
    ['Tender ID', r.tenderId],
    ['Title', r.title || '—'],
    ['Category', r.category || '—'],
    ['Award detail type', itemWise ? 'Item-wise' : 'Category-wise'],
    ['LOA Status', r.loaStatus || '—'],
    ['LOA Date', r.loaDate || '—'],
    ['PBG Due By', r.pbgDue || '—'],
    ['Award Value', r.value || '—'],
    ['Acknowledgement', ackDone ? 'Acknowledged' : (r.acknowledgement || 'Pending')]
  ];
  if (cov) {
    rows.push(['Articles awarded', `${cov.awardedCount} of ${cov.total}`]);
  }
  openModal(`${escapeHtmlLite(r.awardId)} — Award details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Award details</p>
        <h3>${escapeHtmlLite(r.title || 'Award record')}</h3>
        <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${awardAckBadgeClass(ackDone ? 'Acknowledged' : r.acknowledgement)}">${escapeHtmlLite(ackDone ? 'Acknowledged' : (r.acknowledgement || 'Pending'))}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>LOA Status</span><strong>${escapeHtmlLite(r.loaStatus || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>LOA Date</span><strong>${escapeHtmlLite(r.loaDate || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>PBG Due</span><strong>${escapeHtmlLite(r.pbgDue || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Award Value</span><strong>${escapeHtmlLite(r.value || '—')}</strong></div>
    </div>
    ${cov ? `<div class="dvdms-detail-stats bid-coverage-stats">
      <div class="dvdms-detail-stat"><span>Category articles</span><strong>${cov.total}</strong></div>
      <div class="dvdms-detail-stat is-bidded"><span>Awarded to vendor</span><strong>${cov.awardedCount}</strong></div>
      <div class="dvdms-detail-stat is-not-bidded"><span>Not awarded</span><strong>${cov.notAwardedCount}</strong></div>
      <div class="dvdms-detail-stat"><span>Coverage</span><strong>${cov.total ? Math.round((cov.awardedCount / cov.total) * 100) : 0}%</strong></div>
    </div>
    ${renderAwardArticleCoveragePanel(r)}` : renderAwardCategoryScopePanel(r)}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Award summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="dvdms-detail-note">${ackDone
      ? 'LOA has been acknowledged for this award. Continue to Contract Execution to submit PBG and signed contract.'
      : 'Review award terms and PBG timeline, then acknowledge the LOA to unlock Contract Execution.'}</p>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${!ackDone ? `<button type="button" class="btn btn-primary" onclick="acknowledgeVendorAward('${escapeHtmlLite(r.awardId)}')"><i class="fa-solid fa-check"></i> Acknowledge LOA</button>` : ''}
    </div>
  </div>`, { wide: true, large: true });
}

/** Vendor Delivery (Stage 7) — read-only synced delivery / dispatch records */
const vendorDeliverySyncState = {
  status: 'idle',
  lastSynced: null,
  rows: [],
  fetchCount: 0
};

const vendorDeliverySyncFilterState = {
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1,
  category: 'all'
};

function getVendorDeliverySyncMeta() {
  return {
    status: vendorDeliverySyncState.status === 'synced'
      ? 'Synced'
      : (vendorDeliverySyncState.status === 'error' ? 'Not synced' : (vendorDeliverySyncState.status === 'loading' ? 'Syncing' : 'Not synced')),
    lastSynced: vendorDeliverySyncState.lastSynced || '—'
  };
}

function cloneVendorDeliverySyncRows(seedRows) {
  return (seedRows || []).map(r => ({
    ...r,
    vendorId: r.vendorId || authUser?.vendorId || '—'
  }));
}

/** New / manual vendors with no prior portal delivery history (not demo / not synced registration). */
function isManualVendorWithoutDeliveryHistory(user = authUser) {
  if (currentRole !== 'vendor' || !user || isSeededDemoVendor(user)) return false;
  if (vendorStageState.registrationSource === 'synced') return false;
  if (vendorStageState.registrationSource === 'manual') return true;
  return !!(user.isNewSignup || user.isNewAccount || vendorStageState.profileType === 'new');
}

/**
 * Manual upload UI only when DVDMS sync succeeded with zero rows for a new vendor.
 * Never on API error / failed sync.
 */
function shouldShowManualDeliveryUpload() {
  if (vendorDeliverySyncState.status !== 'synced') return false;
  if ((vendorDeliverySyncState.rows || []).length > 0) return false;
  return isManualVendorWithoutDeliveryHistory();
}

function applyVendorDeliverySyncFetch({ isRefresh = false } = {}) {
  const seed = (typeof VENDOR_DELIVERY_SYNC_API !== 'undefined' && Array.isArray(VENDOR_DELIVERY_SYNC_API.rows))
    ? VENDOR_DELIVERY_SYNC_API.rows
    : [];
  vendorDeliverySyncState.fetchCount += 1;
  let rows = [];
  if (!isManualVendorWithoutDeliveryHistory()) {
    rows = cloneVendorDeliverySyncRows(seed);
    if (isRefresh && vendorDeliverySyncState.fetchCount > 1 && rows[3] && /transit/i.test(rows[3].status || '')) {
      rows = rows.map((r, i) => (i === 3
        ? { ...r, status: 'Delivered', grn: 'Under inspection', deliveryDate: '09-09-2026', expectedDate: '09-09-2026', remarks: 'Facility receipt confirmed; GRN inspection in progress.' }
        : r));
    }
  }
  vendorDeliverySyncState.rows = rows;
  vendorDeliverySyncState.status = 'synced';
  const now = new Date();
  vendorDeliverySyncState.lastSynced =
    `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ` +
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} IST`;
  if (typeof VENDOR_DELIVERY_SYNC_API !== 'undefined' && VENDOR_DELIVERY_SYNC_API.meta) {
    VENDOR_DELIVERY_SYNC_API.meta.status = 'Synced';
    VENDOR_DELIVERY_SYNC_API.meta.lastSynced = vendorDeliverySyncState.lastSynced;
  }
  // Merge vendor-added deliveries (modal updates) without duplicating IDs
  const local = Array.isArray(vendorStageState.deliveryLocalRows) ? vendorStageState.deliveryLocalRows : [];
  if (local.length) {
    const seen = new Set(rows.map(r => r.deliveryId));
    local.forEach(r => {
      if (r?.deliveryId && !seen.has(r.deliveryId)) {
        rows.push({ ...r });
        seen.add(r.deliveryId);
      }
    });
    vendorDeliverySyncState.rows = rows;
  }
  vendorDeliverySyncFilterState.page = 1;
  if (rows.length) {
    vendorStageState.delivery.updated = true;
    if (!vendorStageState.completed?.[7]) completeVendorStage(7);
  }
}

function ensureVendorDeliverySyncLoaded() {
  if (vendorDeliverySyncState.status === 'synced' || vendorDeliverySyncState.status === 'loading') return;
  applyVendorDeliverySyncFetch({ isRefresh: false });
}

function getFilteredVendorDeliverySyncRows() {
  let rows = applyStagePeriodFilter(vendorDeliverySyncState.rows || [], vendorDeliverySyncFilterState, 'periodDate');
  const cat = vendorDeliverySyncFilterState.category;
  if (cat && cat !== 'all') rows = rows.filter(r => r.category === cat);
  return rows;
}

function getVendorDeliverySyncCategoryOptions() {
  const cats = [...new Set((vendorDeliverySyncState.rows || []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorDeliverySyncCategory(label) {
  vendorDeliverySyncFilterState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorDeliverySyncFilterState.page = 1;
  refreshWorkflowUI();
}

function bindVendorDeliverySyncCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="deliverySyncCategory"]');
  if (!wrap || wrap.dataset.delCatBound) return;
  wrap.dataset.delCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('deliverySyncCategory') : '');
    setVendorDeliverySyncCategory(label);
  });
}

function deliveryStatusBadgeClass(status) {
  if (/delivered|accepted|completed/i.test(status || '')) return 'success';
  if (/transit|dispatch|progress|inspection/i.test(status || '')) return 'info';
  if (/pending|hold|delay/i.test(status || '')) return 'warning';
  return 'muted';
}

function renderVendorDeliveryManualUploadStage(canEdit = true) {
  const d = vendorStageState.delivery;
  const uploadDis = !canEdit || d.updated;
  return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>No delivery records were found in the system for your vendor account yet. Upload the delivery status document for the active consignment. Labels below stay visible at all times; values are filled from your upload. Cold Chain Required remains selectable before and after upload.</div>
    </div>
    <div class="ocr-panel mt-2">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-truck"></i> Delivery Details</h4>
        <span class="badge ${d.updated ? 'badge-success' : d.ocrReady ? 'badge-info' : 'badge-muted'}">${d.updated ? 'Saved' : d.ocrReady ? 'Ready — Review &amp; Save' : 'Awaiting upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Delivery Challan No.', d.challan)}
        ${ocrLabel('Dispatch Status', d.status ? `<span class="badge badge-info">${escapeHtmlLite(d.status)}</span>` : '', { html: true })}
        ${ocrLabel('Vehicle / LR No.', d.vehicle)}
        ${ocrLabel('Dispatch Date', d.dispatchDate)}
        ${ocrLabel('Expected Delivery Date', d.expectedDate)}
        ${ocrLabel('Remarks', d.remarks)}
        ${ocrLabel('Uploaded Document', d.fileName || '')}
      </div>
      <div class="ocr-panel-control">
        ${customSelectHTML('Cold Chain Required', 'delColdChain', ['No', 'Yes'], d.coldChain || 'No', true)}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfInlineDelivery',
        title: 'Upload Delivery Status Document',
        hint: 'Delivery challan / dispatch note · PDF / JPG — fills all delivery labels above',
        disabled: uploadDis,
        fileName: d.fileName,
        onChange: 'handleDeliveryInlineUpload'
      })}
    </div>
    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete Bid Submission through Contract Execution (Stages 4–6) to unlock delivery updates.</p></div></div>' : ''}
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary"${!canEdit || !d.ocrReady || d.updated ? ' disabled' : ''} onclick="saveDeliveryOcr()">Save Delivery Details</button>
      <button type="button" class="btn btn-outline" onclick="navigateTo('delivery')">Open Delivery &amp; Invoices</button>
    </div>`;
}

function renderVendorDeliveryStage(canEdit = true) {
  ensureVendorDeliverySyncLoaded();
  if (shouldShowManualDeliveryUpload()) {
    return renderVendorDeliveryManualUploadStage(canEdit);
  }
  return renderVendorDeliverySyncStage(canEdit);
}

function renderVendorDeliverySyncTableRows(rows) {
  return rows.map(r => {
    const id = escapeHtmlLite(r.deliveryId);
    return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorDeliverySyncDetail('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorDeliverySyncDetail('${id}')}" title="View delivery details">
      <td class="cell-id"><strong>${id}</strong><div class="table-sub">${escapeHtmlLite(r.challan || '')}</div></td>
      <td class="cell-tender"><strong>${escapeHtmlLite(r.poId || '—')}</strong><div class="table-sub">${escapeHtmlLite(r.tenderId || '')}</div></td>
      <td class="cell-category">${escapeHtmlLite(r.category || '—')}</td>
      <td class="cell-tender">${escapeHtmlLite(r.items || r.title || '—')}</td>
      <td class="cell-status"><span class="badge badge-${deliveryStatusBadgeClass(r.status)}">${escapeHtmlLite(r.status || '—')}</span></td>
      <td class="cell-nowrap">${escapeHtmlLite(r.deliveryDate || '—')}</td>
    </tr>`;
  }).join('');
}

function renderVendorDeliverySyncStage(canEdit = true) {
  ensureVendorDeliverySyncLoaded();
  const meta = getVendorDeliverySyncMeta();
  const filtered = getFilteredVendorDeliverySyncRows();
  const paged = paginateItems(filtered, vendorDeliverySyncFilterState.page, 10);
  vendorDeliverySyncFilterState.page = paged.page;
  const loading = vendorDeliverySyncState.status === 'loading';
  const refreshDis = loading ? ' disabled' : '';
  const periodLabel = getWfPeriodFilterLabel(vendorDeliverySyncFilterState);
  const categoryOptions = getVendorDeliverySyncCategoryOptions();
  const categorySelected = vendorDeliverySyncFilterState.category === 'all'
    ? 'All categories'
    : vendorDeliverySyncFilterState.category;

  const emptyBlock = !vendorDeliverySyncState.rows.length
    ? renderVendorOnboardingEmptyState({
        icon: 'fa-truck',
        title: 'No delivery records yet',
        body: 'No consignments were returned for your vendor code. Refresh to pull the latest dispatch and GRN status once deliveries are recorded.',
        steps: ['Dispatch against an active PO', 'Refresh to load delivery records', 'Review synced delivery status to continue']
      })
    : '';

  const filterEmptyRow = !paged.items.length && vendorDeliverySyncState.rows.length
    ? `<tr class="table-filter-empty-row"><td colspan="6"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No delivery records match <strong>${escapeHtmlLite(periodLabel)}</strong>${vendorDeliverySyncFilterState.category !== 'all' ? ` · ${escapeHtmlLite(vendorDeliverySyncFilterState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorDeliverySyncCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  const headerBlock = `<div class="table-header bid-records-header">
          <h3>Delivery records <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-header-actions">
            ${vendorDeliverySyncState.rows.length ? `<button type="button" class="btn btn-primary btn-sm" onclick="openVendorDeliveryUpdateModal()">
              <i class="fa-solid fa-plus"></i> Add / Update delivery
            </button>` : ''}
            <div class="bid-records-category-filter" title="Filter by category">
              <span class="bid-records-category-label">Category</span>
              ${inlineCustomSelectHTML('deliverySyncCategory', categoryOptions, categorySelected)}
            </div>
          </div>
        </div>`;

  const tableBlock = `<div class="data-table-wrap bid-dvdms-table-wrap">
        ${headerBlock}
        ${renderCompactWfPeriodFilter('vendorDeliverySync', vendorDeliverySyncFilterState)}
        <div class="bid-dvdms-table-scroll">
          <table class="data-table delivery-sync-table">
            <thead>
              <tr>
                <th>Delivery / Challan</th>
                <th>PO / Tender</th>
                <th>Category</th>
                <th>Items</th>
                <th>Status</th>
                <th>Delivered</th>
              </tr>
            </thead>
            <tbody>${paged.items.length ? renderVendorDeliverySyncTableRows(paged.items) : filterEmptyRow}</tbody>
          </table>
        </div>
        ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorDeliverySyncPage', { hideInfo: true }) : ''}
      </div>`;

  return `<div class="need-api bid-dvdms-stage">
    <div class="need-api-banner">
      <div class="need-api-banner-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
      <div class="need-api-banner-text">
        <strong>Delivery records</strong>
        <p>Challan, PO and delivery status · Last synced <strong>${escapeHtmlLite(meta.lastSynced)}</strong></p>
      </div>
      <div class="need-api-banner-actions">
        ${renderApiSyncBadge(meta.status === 'Syncing' ? 'Not synced' : meta.status)}
        <button type="button" class="btn btn-outline btn-sm" onclick="refreshVendorDeliverySyncApi()"${refreshDis}>
          <i class="fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}"></i> ${loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
    </div>

    ${emptyBlock}
    ${vendorDeliverySyncState.rows.length ? tableBlock : ''}
  </div>`;
}

const DELIVERY_UPDATE_TENDER_PLACEHOLDER = 'Select tender for this delivery…';

const vendorDeliveryUpdateDraft = {
  tenderId: '',
  challan: '',
  vehicle: '',
  dispatchDate: '',
  expectedDate: '',
  remarks: '',
  status: '',
  coldChain: 'No',
  ocrReady: false,
  fileName: null
};

function resetVendorDeliveryUpdateDraft() {
  Object.assign(vendorDeliveryUpdateDraft, {
    tenderId: '',
    challan: '',
    vehicle: '',
    dispatchDate: '',
    expectedDate: '',
    remarks: '',
    status: '',
    coldChain: 'No',
    ocrReady: false,
    fileName: null
  });
}

function getVendorLifecycleTenderChoices() {
  const map = new Map();
  const push = (tenderId, title, category, poId) => {
    if (!tenderId) return;
    const prev = map.get(tenderId) || {};
    map.set(tenderId, {
      tenderId,
      title: title || prev.title || tenderId,
      category: category || prev.category || '—',
      poId: poId || prev.poId || ''
    });
  };
  getVendorContractTenderChoices().forEach(t => push(t.tenderId, t.title, t.category));
  (vendorDeliverySyncState.rows || []).forEach(r => push(r.tenderId, r.title, r.category, r.poId));
  (vendorAwardSyncState.rows || []).forEach(r => push(r.tenderId, r.title, r.category));
  return Array.from(map.values());
}

function getVendorLifecycleTenderSelectOptions(placeholder) {
  return [placeholder, ...getVendorLifecycleTenderChoices().map(t => `${t.tenderId} — ${t.title}`)];
}

function renderVendorDeliveryUpdateModalBody() {
  const d = vendorDeliveryUpdateDraft;
  const options = getVendorLifecycleTenderSelectOptions(DELIVERY_UPDATE_TENDER_PLACEHOLDER);
  const selected = d.tenderId
    ? (options.find(o => o.startsWith(`${d.tenderId} — `)) || DELIVERY_UPDATE_TENDER_PLACEHOLDER)
    : DELIVERY_UPDATE_TENDER_PLACEHOLDER;
  const hasTender = !!d.tenderId;
  return `<div class="dvdms-detail vendor-update-modal">
    <p class="dvdms-detail-note" style="margin-top:0">Select the tender first. Document upload unlocks after tender selection. Saving adds the delivery to your records table.</p>
    <div class="form-group" style="margin-bottom:1rem">
      <label>${reqLabel('Tender')}</label>
      ${inlineCustomSelectHTML('deliveryUpdateTender', options, selected)}
    </div>
    <div class="ocr-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-truck"></i> Delivery Details</h4>
        <span class="badge ${d.ocrReady ? 'badge-info' : 'badge-muted'}">${d.ocrReady ? 'Ready — Review &amp; Save' : 'Awaiting upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Delivery Challan No.', d.challan)}
        ${ocrLabel('Dispatch Status', d.status ? `<span class="badge badge-info">${escapeHtmlLite(d.status)}</span>` : '', { html: true })}
        ${ocrLabel('Vehicle / LR No.', d.vehicle)}
        ${ocrLabel('Dispatch Date', d.dispatchDate)}
        ${ocrLabel('Expected Delivery Date', d.expectedDate)}
        ${ocrLabel('Remarks', d.remarks)}
        ${ocrLabel('Uploaded Document', d.fileName || '')}
      </div>
      <div class="ocr-panel-control">
        ${customSelectHTML('Cold Chain Required', 'deliveryUpdateColdChain', ['No', 'Yes'], d.coldChain || 'No', true)}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfModalDeliveryUpload',
        title: 'Upload Delivery Status Document',
        hint: hasTender
          ? 'Delivery challan / dispatch note · PDF / JPG — fills all delivery labels above'
          : 'Select a tender above to enable upload',
        disabled: !hasTender,
        fileName: d.fileName,
        onChange: 'handleDeliveryUpdateModalUpload'
      })}
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary"${!hasTender || !d.ocrReady ? ' disabled' : ''} onclick="saveVendorDeliveryUpdateModal()">
        <i class="fa-solid fa-check"></i> Save delivery
      </button>
    </div>
  </div>`;
}

function bindVendorDeliveryUpdateTenderSelect() {
  const wrap = document.querySelector('#modalBody .custom-select[data-select-id="deliveryUpdateTender"]');
  if (!wrap || wrap.dataset.deliveryUpdateBound) return;
  wrap.dataset.deliveryUpdateBound = '1';
  wrap.addEventListener('change', () => {
    const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('deliveryUpdateTender') : '';
    const tenderId = (!label || label === DELIVERY_UPDATE_TENDER_PLACEHOLDER)
      ? ''
      : (label.split(' — ')[0] || '').trim();
    vendorDeliveryUpdateDraft.tenderId = tenderId;
    vendorDeliveryUpdateDraft.challan = '';
    vendorDeliveryUpdateDraft.vehicle = '';
    vendorDeliveryUpdateDraft.dispatchDate = '';
    vendorDeliveryUpdateDraft.expectedDate = '';
    vendorDeliveryUpdateDraft.remarks = '';
    vendorDeliveryUpdateDraft.status = '';
    vendorDeliveryUpdateDraft.ocrReady = false;
    vendorDeliveryUpdateDraft.fileName = null;
    openModal('Add / Update delivery', renderVendorDeliveryUpdateModalBody(), { wide: true, large: true, replace: true });
    bindVendorDeliveryUpdateTenderSelect();
  });
}

function openVendorDeliveryUpdateModal() {
  ensureVendorDeliverySyncLoaded();
  if (!(vendorDeliverySyncState.rows || []).length) {
    showWfAlert('Synced delivery records are required before adding updates. Refresh the stage first.');
    return;
  }
  if (!getVendorLifecycleTenderChoices().length) {
    showWfAlert('No tenders are available to link. Complete award / contract selection first.');
    return;
  }
  resetVendorDeliveryUpdateDraft();
  openModal('Add / Update delivery', renderVendorDeliveryUpdateModalBody(), { wide: true, large: true });
  bindVendorDeliveryUpdateTenderSelect();
}

function handleDeliveryUpdateModalUpload(input) {
  if (!vendorDeliveryUpdateDraft.tenderId) {
    showWfAlert('Select a tender before uploading the delivery document.');
    if (input) input.value = '';
    return;
  }
  const file = input?.files?.[0];
  if (!file) return;
  const cold = typeof getCustomSelectValue === 'function'
    ? getCustomSelectValue('deliveryUpdateColdChain')
    : vendorDeliveryUpdateDraft.coldChain;
  const suffix = String(Date.now()).slice(-4);
  simulateOcrDelay(() => {
    Object.assign(vendorDeliveryUpdateDraft, {
      challan: `CHL-2026-${suffix}`,
      vehicle: 'MP-04-AB-2190 / LR-88912',
      dispatchDate: formatDateDMY(APP_TODAY),
      expectedDate: formatDateDMY(APP_TODAY),
      remarks: 'Additional delivery consignment',
      status: 'Dispatched',
      coldChain: cold || 'No',
      ocrReady: true,
      fileName: file.name
    });
    openModal('Add / Update delivery', renderVendorDeliveryUpdateModalBody(), { wide: true, large: true, replace: true });
    bindVendorDeliveryUpdateTenderSelect();
  });
}

function saveVendorDeliveryUpdateModal() {
  const d = vendorDeliveryUpdateDraft;
  if (!d.tenderId) {
    showWfAlert('Select a tender before saving.');
    return;
  }
  if (!d.ocrReady) {
    showWfAlert('Upload a Delivery Status document first so details can be populated.');
    return;
  }
  const cold = typeof getCustomSelectValue === 'function'
    ? getCustomSelectValue('deliveryUpdateColdChain')
    : d.coldChain;
  const choice = getVendorLifecycleTenderChoices().find(t => t.tenderId === d.tenderId) || {};
  const contract = typeof getContractRecordForTender === 'function' ? getContractRecordForTender(d.tenderId) : null;
  const n = (vendorDeliverySyncState.rows || []).length + 1;
  const deliveryId = `DEL-2026-${String(4800 + n).padStart(4, '0')}`;
  const row = {
    deliveryId,
    challan: d.challan || `CHL-2026-${String(4800 + n).padStart(4, '0')}`,
    poId: choice.poId || contract?.poId || `PO-${String(d.tenderId).replace(/^TND-/, '')}`,
    tenderId: d.tenderId,
    title: choice.title || contract?.title || d.tenderId,
    category: choice.category || contract?.category || '—',
    items: d.remarks || choice.title || 'Delivery consignment',
    qty: '—',
    amount: contract?.value || '—',
    vehicle: d.vehicle || '—',
    dispatchDate: d.dispatchDate || formatDateDMY(APP_TODAY),
    expectedDate: d.expectedDate || formatDateDMY(APP_TODAY),
    deliveryDate: formatDateDMY(APP_TODAY),
    status: d.status || 'Dispatched',
    grn: 'Pending',
    coldChain: cold || 'No',
    invoice: '—',
    payment: '—',
    periodDate: formatDateDMY(APP_TODAY),
    remarks: d.remarks || 'Vendor-uploaded delivery update',
    fileName: d.fileName || null,
    source: 'vendor-upload'
  };
  if (!Array.isArray(vendorStageState.deliveryLocalRows)) vendorStageState.deliveryLocalRows = [];
  vendorStageState.deliveryLocalRows.push(row);
  vendorDeliverySyncState.rows = [...(vendorDeliverySyncState.rows || []), row];
  vendorStageState.delivery.updated = true;
  if (!vendorStageState.completed?.[7]) completeVendorStage(7);
  persistVendorLifecycle();
  closeModal();
  refreshWorkflowUI();
  showWfAlert(`Delivery <strong>${escapeHtmlLite(deliveryId)}</strong> added for tender <strong>${escapeHtmlLite(d.tenderId)}</strong>.`, 'success');
}

function setVendorDeliverySyncPage(page) {
  vendorDeliverySyncFilterState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function refreshVendorDeliverySyncApi() {
  if (vendorDeliverySyncState.status === 'loading') return;
  vendorDeliverySyncState.status = 'loading';
  try {
    refreshWorkflowUI();
  } catch (err) {
    console.warn('Delivery UI refresh failed during loading state', err);
  }

  setTimeout(() => {
    try {
      applyVendorDeliverySyncFetch({ isRefresh: true });
      persistVendorLifecycle();
      refreshWorkflowUI();
      openModal('Data refreshed', `
        <div class="sync-success-msg">
          <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h4>Latest delivery records are ready</h4>
          <p>Fetched <strong>${vendorDeliverySyncState.rows.length}</strong> delivery record(s) for vendor <strong>${escapeHtmlLite(authUser?.vendorId || '—')}</strong>. Use the period filter or click a row for details.</p>
        </div>
      `);
    } catch (err) {
      console.warn('Delivery sync failed', err);
      vendorDeliverySyncState.status = 'error';
      refreshWorkflowUI();
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Delivery records could not be updated</h4>
          <p>Sync did not complete. Please try Refresh again in a moment.</p>
        </div>
      `);
    }
  }, 650);
}

function confirmVendorDeliverySync() {
  if (!vendorDeliverySyncState.rows.length) {
    showWfAlert('No delivery records synced yet. Click Refresh to fetch the latest data.');
    return;
  }
  const primary = vendorDeliverySyncState.rows.find(r => /delivered|accepted/i.test(r.status) || r.grn === 'Accepted')
    || vendorDeliverySyncState.rows[0];
  vendorStageState.delivery.challan = primary.challan || primary.deliveryId || '';
  vendorStageState.delivery.vehicle = primary.vehicle || '';
  vendorStageState.delivery.dispatchDate = primary.dispatchDate || '';
  vendorStageState.delivery.expectedDate = primary.expectedDate || primary.deliveryDate || '';
  vendorStageState.delivery.coldChain = primary.coldChain || 'No';
  vendorStageState.delivery.remarks = primary.remarks || '';
  vendorStageState.delivery.status = primary.status || '';
  vendorStageState.delivery.updated = true;
  vendorStageState.delivery.ocrReady = true;
  vendorStageState.delivery.fileName = null;
  completeVendorStage(7);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert('Delivery sync confirmed. You can proceed to Invoice Submission.', 'success');
}

function openVendorDeliverySyncDetail(deliveryId) {
  const r = (vendorDeliverySyncState.rows || []).find(x => x.deliveryId === deliveryId);
  if (!r) {
    showWfAlert('Delivery record not found.');
    return;
  }
  const rows = [
    ['Delivery ID', r.deliveryId],
    ['Challan No.', r.challan || '—'],
    ['Vendor ID', r.vendorId || authUser?.vendorId || '—'],
    ['PO', r.poId || '—'],
    ['Tender', r.tenderId || '—'],
    ['Title', r.title || '—'],
    ['Category', r.category || '—'],
    ['Detail type', categoryUsesItemWiseDetail(r.category) ? 'Item-wise' : 'Category-wise'],
    ['Items', r.items || '—'],
    ['Quantity', r.qty || '—'],
    ['Amount', r.amount || '—'],
    ['Vehicle / LR', r.vehicle || '—'],
    ['Dispatch date', r.dispatchDate || '—'],
    ['Expected delivery', r.expectedDate || '—'],
    ['Delivered on', r.deliveryDate || '—'],
    ['Status', r.status || '—'],
    ['GRN', r.grn || '—'],
    ['Cold chain', r.coldChain || '—'],
    ['Invoice', r.invoice || '—'],
    ['Payment', r.payment || '—'],
    ['Remarks', r.remarks || '—']
  ];
  openModal(`${escapeHtmlLite(r.deliveryId)} — Delivery details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Delivery details</p>
        <h3>${escapeHtmlLite(r.title || r.items || 'Delivery record')}</h3>
        <p>${escapeHtmlLite(r.poId || '—')} · ${escapeHtmlLite(r.tenderId || '—')} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${deliveryStatusBadgeClass(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>GRN</span><strong>${escapeHtmlLite(r.grn || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Cold chain</span><strong>${escapeHtmlLite(r.coldChain || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Dispatch</span><strong>${escapeHtmlLite(r.dispatchDate || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Delivered</span><strong>${escapeHtmlLite(r.deliveryDate || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(r, {
      stageTitle: `${r.category || 'Category'} · category-wise delivery`,
      noun: 'delivery',
      yesLabel: 'Delivered',
      noLabel: 'Not delivered',
      yesHint: 'Articles included in this consignment / GRN',
      noHint: 'In category catalogue · not in this delivery lot',
      statusHead: 'Delivery status',
      filterLabel: 'Delivery Status',
      headTitle: `${r.category || 'Category'} articles · delivery coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Delivery summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="dvdms-detail-note">${/delivered|accepted/i.test(r.status || '') || r.grn === 'Accepted'
      ? 'This consignment is reflected in synced delivery records. You can continue to Invoice Submission.'
      : 'Dispatch is in progress. Refresh later for GRN and receipt updates.'}</p>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

/** Stage 3 — Indent Raised (gov) state */
const govIndentState = {
  mode: null, // null | 'manual' | 'automated'
  saved: true,
  indentId: '',
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1,
  listItems: [], // user-created / automated rows prepended to seed
  manual: {
    facility: 'Gandhi Medical College',
    district: 'Bhopal',
    category: 'Drugs',
    itemName: '',
    quantity: '',
    unit: 'Packs',
    priority: 'High',
    requiredBy: '',
    justification: '',
    raisedBy: 'Store Manager — Bhopal',
    approvingAuthority: 'CMO / Competent Authority',
    remarks: ''
  },
  automated: {
    status: 'idle', // idle | running | ready | failed
    lines: [],
    generatedAt: null
  }
};

/** Custom date picker view state */
let datePickerState = { id: null, viewYear: 2026, viewMonth: 8 };

/** Stage 1 — Need Identification (gov) period filter + table pages */
const govNeedState = {
  year: 'all', viewBy: 'quarter', period: 'all',
  stockPage: 1, patientPage: 1, diseasePage: 1, gapPage: 1
};

/** Stage 2 — Stock Check (gov) period filter + table pages */
const govStockCheckState = {
  year: 'all', viewBy: 'quarter', period: 'all',
  warehousePage: 1, otherPage: 1, openpoPage: 1, redistributePage: 1
};

/** Follow-up is sent by Resource Manager (gov super-admin role) — never to themselves */
const FOLLOW_UP_SENDER = {
  name: 'Resource Manager',
  email: 'gov.admin@mphp.gov.in'
};

const FOLLOW_UP_SENDER_ROLE = 'Resource Manager';

const FOLLOW_UP_ROLE_RECIPIENTS = [
  { role: 'Procurement Officer', email: 'procurement@mphp.gov.in', name: 'Procurement Cell' },
  { role: 'Finance / Budget Officer', email: 'finance@mphp.gov.in', name: 'Finance Wing' },
  { role: 'Stores / Warehouse Manager', email: 'stores@mphp.gov.in', name: 'Central Stores' },
  { role: 'Inspection / Quality Officer', email: 'quality@mphp.gov.in', name: 'QA Cell' },
  { role: 'Tender Evaluation Committee', email: 'tec@mphp.gov.in', name: 'TEC Secretariat' },
  { role: 'District CMO / Administrative Officer', email: 'cmo.bhopal@mphp.gov.in', name: 'CMO Bhopal' },
  { role: 'NHM Programme Officer', email: 'nhm@mphp.gov.in', name: 'NHM Cell' },
  { role: 'Audit / Compliance Officer', email: 'audit@mphp.gov.in', name: 'Audit Cell' },
  { role: 'Indenting Department HOD', email: 'indent.hod@mphp.gov.in', name: 'Indenting HOD' },
  { role: 'System Administrator', email: 'sysadmin@mphp.gov.in', name: 'IT Administrator' }
];

let needFollowUpContext = null;

/** Stage 4 — Demand Consolidation (gov) state */
const govConsolidationState = {
  approved: true,
  district: 'Bhopal',
  status: 'Pending Review',
  clarificationSent: false,
  lastClarificationRef: '',
  category: 'all',
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1
};

/** Stage 5 — PR & Budget Approval (gov) state */
const govBudgetState = {
  verified: false,
  fetchedDocs: {}, // deptId -> [{...}]
  category: 'all',
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  page: 1
};

/** Stage 6 — Tender Preparation (gov) state */
const govTenderPrepState = {
  finalReady: false,
  consensusAck: false,
  draftsPage: 1,
  checkersPage: 1,
  preparedPage: 1,
  category: 'all',
  year: 'all',
  viewBy: 'quarter',
  period: 'all'
};

/** Stage 7–13 gov states (period filters + pagination) */
const govBidEvalState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govContractState = {
  page: 1,
  category: 'all',
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  approvals: {} // contractId -> saved form decision
};
const govAwardState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govPoState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govGrnState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govInvoiceState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govPaymentState = { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' };
const govRenewalState = {
  page: 1,
  category: 'all',
  year: 'all',
  viewBy: 'quarter',
  period: 'all',
  selectedId: null,
  finalizeVendorId: '',
  uploadName: '',
  finalized: {} // renewalId -> { at, by, fileName }
};
/** Once Resource Manager leaves Stage 1 into Stages 2–13, Stage 14 jump is locked until sequential reach. */
let govSequentialCommitted = false;
let govLifecycleComplete = false;
let vendorLifecycleComplete = false;

const GOV_LIFECYCLE_STORAGE_VERSION = 1;
const GOV_LIFECYCLE_STORAGE_PREFIX = 'mph_gov_lifecycle_v1_';

function getGovLifecycleStorageKey(user = authUser) {
  if (!user) return null;
  const id = user.email || user.id;
  if (!id) return null;
  return GOV_LIFECYCLE_STORAGE_PREFIX + String(id).toLowerCase().trim();
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function overwritePlainObject(target, source) {
  if (!target || !source) return;
  Object.keys(target).forEach(k => { delete target[k]; });
  Object.assign(target, clonePlain(source));
}

function getGovActiveStageId() {
  if (govLifecycleComplete) return 14;
  // Early jump to Renewal from Stage 1 — keep 14 as the viewed/active focus without marking 2–13 done
  if (currentWorkflowStep === 14 && !govSequentialCommitted) return 14;
  if (!govIndentState.saved) {
    const step = Number(currentWorkflowStep) || 1;
    // Progress only within Stages 1–3 until indent is saved — ignore future previews (e.g. Award).
    if (step >= 1 && step <= 3) return step;
    return 1;
  }
  if (!govConsolidationState.approved) return 4;
  if (!govBudgetState.verified) return 5;
  if (!govTenderPrepState.finalReady) return 6;
  const step = currentWorkflowStep || 7;
  return Math.min(Math.max(step, 7), 14);
}

/** Step to resume on next open — never a future preview (e.g. clicked Award while still on Indent). */
function getGovResumeStep() {
  if (currentWorkflowStep === 14 && !govSequentialCommitted) return 14;
  const progress = getGovActiveStageId();
  const step = Number(currentWorkflowStep) || progress || 1;
  if (step > progress) return progress;
  return Math.max(1, Math.min(14, step));
}

function syncGovWorkflowStatuses() {
  if (typeof GOV_WORKFLOW === 'undefined') return;
  if (currentRole && currentRole !== 'gov') return;

  // Special case: Stage 1 → 14 jump (sequential path not started)
  if (currentWorkflowStep === 14 && !govSequentialCommitted && !govLifecycleComplete) {
    GOV_WORKFLOW.forEach(s => {
      if (s.id === 1) s.status = 'done';
      else if (s.id === 14) s.status = 'active';
      else s.status = 'pending';
    });
    return;
  }

  const active = getGovActiveStageId();
  GOV_WORKFLOW.forEach(s => {
    if (govLifecycleComplete || s.id < active) s.status = 'done';
    else if (s.id === active) s.status = 'active';
    else s.status = 'pending';
  });
}

function buildGovLifecycleSnapshot() {
  return {
    version: GOV_LIFECYCLE_STORAGE_VERSION,
    currentStep: getGovResumeStep(),
    sequentialCommitted: !!govSequentialCommitted,
    lifecycleComplete: !!govLifecycleComplete,
    indent: clonePlain(govIndentState),
    need: clonePlain(govNeedState),
    stock: clonePlain(govStockCheckState),
    consolidation: clonePlain(govConsolidationState),
    budget: clonePlain(govBudgetState),
    tenderPrep: clonePlain(govTenderPrepState),
    bidEval: clonePlain(govBidEvalState),
    contract: clonePlain(govContractState),
    award: clonePlain(govAwardState),
    po: clonePlain(govPoState),
    grn: clonePlain(govGrnState),
    invoice: clonePlain(govInvoiceState),
    payment: clonePlain(govPaymentState),
    renewal: clonePlain(govRenewalState),
    updatedAt: new Date().toISOString()
  };
}

function persistGovLifecycle() {
  if (currentRole !== 'gov') return;
  const key = getGovLifecycleStorageKey();
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(buildGovLifecycleSnapshot()));
  } catch (err) {
    console.warn('Unable to persist Resource Manager lifecycle progress', err);
  }
}

function readGovLifecycleSnapshot(user = authUser) {
  const key = getGovLifecycleStorageKey(user);
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== GOV_LIFECYCLE_STORAGE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function resetGovLifecycleInMemory() {
  overwritePlainObject(govIndentState, {
    mode: null,
    saved: true,
    indentId: 'IND-LIST',
    year: 'all',
    viewBy: 'quarter',
    period: 'all',
    page: 1,
    listItems: [],
    manual: {
      facility: 'Gandhi Medical College',
      district: 'Bhopal',
      category: 'Drugs',
      itemName: '',
      quantity: '',
      unit: 'Packs',
      priority: 'High',
      requiredBy: '',
      justification: '',
      raisedBy: 'Store Manager — Bhopal',
      approvingAuthority: 'CMO / Competent Authority',
      remarks: ''
    },
    automated: { status: 'idle', lines: [], generatedAt: null }
  });
  overwritePlainObject(govNeedState, {
    year: 'all', viewBy: 'quarter', period: 'all',
    stockPage: 1, patientPage: 1, diseasePage: 1, gapPage: 1
  });
  overwritePlainObject(govStockCheckState, {
    year: 'all', viewBy: 'quarter', period: 'all',
    warehousePage: 1, otherPage: 1, openpoPage: 1, redistributePage: 1
  });
  overwritePlainObject(govConsolidationState, {
    approved: true,
    district: 'Bhopal',
    status: 'Pending Review',
    clarificationSent: false,
    lastClarificationRef: '',
    category: 'all',
    year: 'all',
    viewBy: 'quarter',
    period: 'all',
    page: 1
  });
  overwritePlainObject(govBudgetState, {
    verified: false,
    fetchedDocs: {},
    category: 'all',
    year: 'all',
    viewBy: 'quarter',
    period: 'all',
    page: 1
  });
  overwritePlainObject(govTenderPrepState, {
    finalReady: false,
    consensusAck: false,
    draftsPage: 1,
    checkersPage: 1,
    preparedPage: 1,
    category: 'all',
    year: 'all',
    viewBy: 'quarter',
    period: 'all'
  });
  overwritePlainObject(govBidEvalState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govContractState, {
    page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all', approvals: {}
  });
  overwritePlainObject(govAwardState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govPoState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govGrnState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govInvoiceState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govPaymentState, { page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all' });
  overwritePlainObject(govRenewalState, {
    page: 1, category: 'all', year: 'all', viewBy: 'quarter', period: 'all',
    selectedId: null, finalizeVendorId: '', uploadName: '', finalized: {}
  });
  govSequentialCommitted = false;
  govLifecycleComplete = false;
  currentWorkflowStep = null;
  if (typeof GOV_WORKFLOW !== 'undefined') {
    GOV_WORKFLOW.forEach(s => { s.status = 'pending'; });
  }
}

function applyGovLifecycleSnapshot(saved) {
  if (!saved) return;
  if (saved.indent) overwritePlainObject(govIndentState, saved.indent);
  // Stage 3 is list-only now — always allow progress past Indent Raised.
  govIndentState.saved = true;
  if (!govIndentState.indentId) govIndentState.indentId = 'IND-LIST';
  if (saved.need) overwritePlainObject(govNeedState, saved.need);
  if (saved.stock) overwritePlainObject(govStockCheckState, saved.stock);
  if (saved.consolidation) overwritePlainObject(govConsolidationState, saved.consolidation);
  // Stage 4 is list-only now — always allow progress past Demand Consolidation.
  govConsolidationState.approved = true;
  if (!govConsolidationState.category) govConsolidationState.category = 'all';
  if (saved.budget) overwritePlainObject(govBudgetState, saved.budget);
  if (!govBudgetState.category) govBudgetState.category = 'all';
  if (saved.tenderPrep) overwritePlainObject(govTenderPrepState, saved.tenderPrep);
  if (!govTenderPrepState.category) govTenderPrepState.category = 'all';
  if (saved.bidEval) overwritePlainObject(govBidEvalState, saved.bidEval);
  if (!govBidEvalState.category) govBidEvalState.category = 'all';
  if (saved.contract) overwritePlainObject(govContractState, saved.contract);
  if (!govContractState.category) govContractState.category = 'all';
  if (saved.award) overwritePlainObject(govAwardState, saved.award);
  if (!govAwardState.category) govAwardState.category = 'all';
  if (saved.po) overwritePlainObject(govPoState, saved.po);
  if (!govPoState.category) govPoState.category = 'all';
  if (saved.grn) overwritePlainObject(govGrnState, saved.grn);
  if (!govGrnState.category) govGrnState.category = 'all';
  if (saved.invoice) overwritePlainObject(govInvoiceState, saved.invoice);
  if (!govInvoiceState.category) govInvoiceState.category = 'all';
  if (saved.payment) overwritePlainObject(govPaymentState, saved.payment);
  if (!govPaymentState.category) govPaymentState.category = 'all';
  if (saved.renewal) overwritePlainObject(govRenewalState, saved.renewal);
  if (!govRenewalState.category) govRenewalState.category = 'all';
  govSequentialCommitted = !!saved.sequentialCommitted;
  govLifecycleComplete = !!saved.lifecycleComplete;
  currentWorkflowStep = Math.max(1, Math.min(14, Number(saved.currentStep) || 1));
  syncGovWorkflowStatuses();
  // Never land on a future preview stage after restore (e.g. Award while still on Need/Indent).
  currentWorkflowStep = getGovResumeStep();
  syncGovWorkflowStatuses();
}

/**
 * Restore or initialize Resource Manager procurement lifecycle.
 * Preserves Stage 1 → Stage 14 jump when sequentialCommitted is still false.
 */
function initGovLifecycleForSession(user) {
  const saved = readGovLifecycleSnapshot(user);
  if (saved) {
    applyGovLifecycleSnapshot(saved);
    return { resumed: true, step: currentWorkflowStep };
  }
  resetGovLifecycleInMemory();
  currentWorkflowStep = 1;
  govSequentialCommitted = false;
  govLifecycleComplete = false;
  syncGovWorkflowStatuses();
  persistGovLifecycle();
  return { resumed: false, step: 1 };
}

function maskSensitiveValue(value) {
  if (!value) return '₹ ●●●';
  const raw = String(value).trim();
  const unitMatch = raw.match(/\b(Cr|L|Lakh|Lakhs|Crore|Crores)\b/i);
  const unit = unitMatch ? unitMatch[1] : '';
  return unit ? `₹ ●●● ${unit}` : '₹ ●●●';
}

function reqLabel(text) {
  return `${text} <span class="req-star" title="Required">*</span>`;
}

function showWfAlert(message, type = 'error') {
  const tone = type === 'success' ? 'success' : type === 'info' ? 'info' : 'error';
  const title = tone === 'error' ? 'Cannot proceed' : tone === 'info' ? 'Please wait' : 'Notice';
  const icon = tone === 'error'
    ? 'circle-exclamation'
    : tone === 'info'
      ? 'spinner fa-spin'
      : 'circle-check';
  openModal(
    title,
    `<div class="wf-inline-alert wf-inline-alert--${tone}">
      <i class="fa-solid fa-${icon}"></i>
      <div><p>${message}</p></div>
    </div>`,
    { wide: false }
  );
}

function syncVendorWorkflowStatuses() {
  if (currentRole !== 'vendor') return;
  VENDOR_WORKFLOW.forEach(s => {
    if (vendorStageState.completed[s.id]) s.status = 'done';
    else if (s.id === getVendorActiveStageId()) s.status = 'active';
    else s.status = 'pending';
  });
}

function getVendorActiveStageId() {
  const max = (typeof VENDOR_WORKFLOW !== 'undefined' ? VENDOR_WORKFLOW.length : 10) || 10;
  for (let i = 1; i <= max; i++) {
    if (!vendorStageState.completed[i]) return i;
  }
  return max;
}

function getWorkflowProgressStep() {
  if (currentRole === 'vendor') {
    syncVendorWorkflowStatuses();
    return getVendorActiveStageId();
  }
  if (currentRole === 'gov') {
    syncGovWorkflowStatuses();
    return getGovActiveStageId();
  }
  const steps = getWorkflowSteps();
  const active = steps.find(s => s.status === 'active');
  if (active) return active.id;
  const done = steps.filter(s => s.status === 'done').length;
  return done > 0 ? Math.min(done, steps.length) : 1;
}

function parseISODate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // YYYY-MM-DD (optionally with time)
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Format date as DD-MM-YYYY */
function formatDateDMY(value) {
  const dt = parseISODate(value);
  if (!dt) return value || '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Calendar days from APP_TODAY to deadline (date-only) */
function daysUntilDeadline(deadline) {
  const today = parseISODate(APP_TODAY);
  const end = parseISODate(deadline);
  if (!today || !end) return null;
  const ms = end.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ========== LOGIN ==========
function completeAuthLogin(role, user) {
  currentRole = role;
  authUser = user;
  closeNoticeModal();
  const app = document.getElementById('app');
  app.classList.add('active');
  app.classList.toggle('gov-app', role === 'gov');
  app.classList.toggle('vendor-app', role === 'vendor');

  const sidebar = document.getElementById('sidebar');
  // Shared chrome for RM + Vendor — same sidebar gradient, badges, and accent language
  sidebar.classList.add('vendor-theme');

  pageStack = [];
  let landOnWorkflow = false;
  if (role === 'vendor') {
    resetGovLifecycleInMemory();
    initVendorLifecycleForSession(user);
    // New signups land on Bid-to-Pay Stage 1; unfinished new accounts resume there too
    landOnWorkflow = !!(user?.isNewSignup || (user?.isNewAccount && !vendorStageState.completed?.[1]));
  } else if (role === 'gov') {
    clearInMemoryVendorLifecycle();
    initGovLifecycleForSession(user);
  } else {
    clearInMemoryVendorLifecycle();
    resetGovLifecycleInMemory();
    currentWorkflowStep = null;
  }
  renderSidebar();
  renderTopbar();
  navigateTo(landOnWorkflow ? 'workflow' : 'dashboard', true);
}

function confirmLogout() {
  openModal('Confirm Logout', `
    <div class="logout-confirm">
      <div class="logout-confirm-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
      <p class="logout-confirm-text">Are you sure you want to logout?</p>
      <p class="logout-confirm-hint">You will need to sign in again to access the portal.</p>
      <div class="logout-confirm-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-danger" onclick="logout()">Logout</button>
      </div>
    </div>
  `);
}

function logout() {
  if (currentRole === 'vendor') {
    persistVendorLifecycle();
  }
  if (currentRole === 'gov') {
    persistGovLifecycle();
  }
  currentRole = null;
  authUser = null;
  currentPage = 'dashboard';
  clearInMemoryVendorLifecycle();
  resetGovLifecycleInMemory();
  pageStack = [];
  noticesShownThisSession = false;
  resetGovNoticesForDemo();
  document.getElementById('app').classList.remove('active', 'gov-app', 'vendor-app');
  const authPage = document.getElementById('authPage');
  if (authPage) {
    authPage.classList.remove('is-hidden');
    authPage.style.display = 'flex';
  }
  if (typeof clearAuthSession === 'function') clearAuthSession();
  if (typeof initAuth === 'function') initAuth();
  closeAlertPanel();
  closeNoticeModal();
  closeModal();
  // Show official notices again on the login screen
  requestAnimationFrame(() => {
    setTimeout(() => showGovNoticesOnWebsiteLoad(true), 400);
  });
}

function resetGovNoticesForDemo() {
  if (typeof GOV_NOTICES === 'undefined') return;
  GOV_NOTICES.forEach(n => {
    n.unread = n.id !== 'GN-2026-029';
  });
}

// ========== NAVIGATION ==========
function getVendorNavBadgeInfo(pageId) {
  switch (pageId) {
    case 'workflow': {
      const pending = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(id => !vendorStageState.completed[id]).length;
      return { count: pending, title: `${pending} lifecycle stage(s) still open` };
    }
    case 'registration':
      return { count: 1, title: '1 profile item needs attention (ISO expiry reminder)' };
    case 'tenders': {
      const open = TENDERS.filter(t => t.status === 'Open').length;
      return { count: open, title: `${open} open tender(s) available to review` };
    }
    case 'bids': {
      const active = BIDS.length;
      return { count: active, title: `${active} bid(s) in your bid book` };
    }
    case 'clarifications': {
      const pending = CLARIFICATIONS.filter(c => c.status === 'Pending' || c.status === 'Corrigendum Issued').length;
      const total = CLARIFICATIONS.length;
      return { count: pending || total, title: pending ? `${pending} clarification(s) needing attention` : `${total} clarification(s)` };
    }
    case 'contracts': {
      const n = CONTRACTS.length;
      return { count: n, title: `${n} active contract(s) / PO(s)` };
    }
    case 'delivery': {
      const pendingPay = DELIVERIES.filter(d => d.grn !== 'Accepted' || d.payment === 'Processing' || d.payment === '—').length;
      return { count: pendingPay || DELIVERIES.length, title: `${pendingPay || DELIVERIES.length} delivery / invoice item(s) to track` };
    }
    case 'reports':
      return { count: 2, title: '2 downloadable report packs available' };
    case 'repository': {
      const n = getVendorRepositoryDocs().length;
      return { count: n, title: `${n} document(s) in repository` };
    }
    case 'work-queue': {
      const unread = VENDOR_WORK_QUEUE.filter(a => a.unread).length;
      return { count: unread || VENDOR_WORK_QUEUE.length, title: `${unread} unread alert(s) in work queue` };
    }
    case 'sla-desk': {
      const open = SLA_THREADS.filter(t => t.status !== 'Resolved').length;
      return { count: open, title: `${open} open SLA communication thread(s)` };
    }
    default:
      return { count: 0, title: '' };
  }
}

function getNavBadgeInfo(item) {
  if (currentRole === 'vendor') return getVendorNavBadgeInfo(item.id);
  if (item.id === 'sourcing') {
    const sum = getGovDashboardActionCounts('All').sum;
    return { count: sum, title: `${sum} action items (Open Tenders + Pending Approvals + Payment Delays)` };
  }
  if (item.id === 'workflow') {
    return { count: 0, title: '' };
  }
  if (item.id === 'work-queue') {
    const queue = getWorkQueueSource();
    const unread = queue.filter(a => a.unread).length;
    return { count: unread || queue.length, title: `${unread || queue.length} alert(s) in work queue` };
  }
  if (item.id === 'sla-desk') {
    const open = SLA_THREADS.filter(t => t.status !== 'Resolved').length;
    return { count: open, title: `${open} open SLA thread(s)` };
  }
  if (item.id === 'reports') {
    return { count: 0, title: '' };
  }
  return { count: item.badge || 0, title: item.badge ? `${item.badge} item(s)` : '' };
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const navItems = currentRole === 'gov' ? NAV_GOV : NAV_VENDOR;
  let html = '';
  navItems.forEach(item => {
    if (item.section) {
      html += `<div class="nav-section">${item.section}</div>`;
    } else {
      const info = getNavBadgeInfo(item);
      const badge = info.count > 0
        ? `<span class="nav-badge" title="${info.title}">${info.count}</span>`
        : '';
      html += `<a class="nav-item ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}" onclick="navigateTo('${item.id}')" ${info.title ? `title="${info.title}"` : ''}>
        <span class="nav-icon"><i class="fa-solid ${item.icon}"></i></span>
        <span class="nav-label">${item.label}</span>
        ${badge}
      </a>`;
    }
  });
  nav.innerHTML = html;

  const brandSub = document.getElementById('sidebarBrandSub');
  brandSub.textContent = authUser?.title || (currentRole === 'gov' ? 'Resource Manager' : 'Vendor Portal');
}

function getTenderPageSubtitle() {
  const labels = {
    open: 'Open tenders',
    evaluation: 'Tenders under technical & commercial evaluation',
    draft: 'Draft tenders — preparation in progress',
    all: 'Browse and track procurement opportunities'
  };
  return labels[tenderStatusFilter] || labels.all;
}

function getWorkflowPageSubtitle() {
  ensureWorkflowViewStep();
  const steps = getWorkflowSteps();
  const total = steps.length;
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const step = steps.find(s => s.id === viewId) || steps[0];
  const isCurrent = viewId === progress;
  return { step, total, isCurrent };
}

function updateWorkflowSubtitle() {
  const el = document.getElementById('pageSubtitle');
  if (!el || currentPage !== 'workflow') return;
  const { step, total, isCurrent } = getWorkflowPageSubtitle();
  const currentTag = isCurrent
    ? ' <span class="subtitle-stage-tag">(current stage)</span>'
    : ' <span class="subtitle-stage-tag subtitle-stage-tag--view">(reviewing)</span>';
  el.innerHTML = `${step.name} — Stage <strong>${step.id}</strong> out of ${total} Stage Flow${currentTag}`;
}

function renderTopbar() {
  const title = document.getElementById('pageTitle');
  const subtitle = document.getElementById('pageSubtitle');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const alertBadge = document.getElementById('alertBadge');

  const pageTitles = {
    dashboard: currentRole === 'vendor'
      ? ['My Dashboard', 'Your procurement activity at a glance']
      : ['Analytics Dashboard', 'Real-time procurement insights & KPIs'],
    'work-queue': currentRole === 'gov'
      ? ['Alerts & Work Queue', 'Prioritized government actions — approvals, payments, vendor SLA breaches, and tender pipeline']
      : ['Alerts & Work Queue', 'Prioritized actions by severity, owner, due date and record type'],
    'sla-desk': currentRole === 'gov'
      ? ['SLA Communication', 'Respond to vendor escalations and resolve issues per internal response hierarchy']
      : ['SLA Communication', 'Escalate and resolve issues with government officers as per SLA hierarchy'],
    workflow: currentRole === 'vendor'
      ? ['Bid-to-Pay Lifecycle', '']
      : ['Procurement Lifecycle', 'Need → DVDMS stock/indent → award & contract → PO in DVDMS'],
    'contract-mgmt': ['Contract Management', 'DVDMS / NIC synced register — LOI → PBG → draft → signed → supply · AI/ML for alerts'],
    'vendor-reg': ['Vendor Management', 'NIC registration façade + DVDMS sync — AI eligibility & scorecard (no duplicate master forms)'],
    sourcing: ['Sourcing & Award', 'Evaluation through award — aligns with Stages 7–9'],
    'master-data': ['Master Data & Workflow', 'Categories, items, and workflow configuration'],
    tor: ['TOR Coverage & Red Flags', 'Terms of Reference compliance monitoring'],
    'vendor-matrix': ['Vendor Performance Matrix', 'Weighted scoring and vendor ranking'],
    reports: currentRole === 'vendor'
      ? ['My Reports', 'Bid participation, contract execution & downloadable analytics']
      : ['Reports & Analytics', 'Cross-module procurement intelligence — charts, tables and downloadable PDF/Excel packs'],
    settings: ['Settings & Branding', 'Organization name, logo, and configuration'],
    registration: ['Profile & KYC', 'NIC-synced identity — document validation only'],
    tenders: ['Tender Discovery', getTenderPageSubtitle()],
    bids: ['Bid Submitted', 'Review synced bid records for open and awarded tenders'],
    clarifications: ['Clarifications', 'Pre-bid queries and corrigenda tracking'],
    contracts: currentRole === 'vendor'
      ? ['Contracts & POs', 'Synced from Contract Management — same LOA, PBG, PO facts as RM']
      : ['Contracts & POs', 'Active contracts and purchase orders'],
    delivery: ['Delivery & Invoices', 'Dispatch tracking and invoice management'],
    performance: ['Performance Score', 'Your weighted performance metrics'],
    repository: ['Repository', 'All documents uploaded across your Bid-to-Pay lifecycle']
  };

  const t = pageTitles[currentPage] || ['Dashboard', ''];
  title.textContent = t[0];
  if (currentPage === 'workflow') updateWorkflowSubtitle();
  else subtitle.textContent = t[1];

  if (authUser) {
    userName.textContent = authUser.role === 'vendor'
      ? (authUser.organization || authUser.vendorId || authUser.name)
      : authUser.name;
    userAvatar.textContent = authUser.avatar || (authUser.role === 'gov' ? 'RM' : 'VS');
  } else if (currentRole === 'gov') {
    userName.textContent = 'Resource Manager';
    userAvatar.textContent = 'RM';
  } else {
    userName.textContent = 'VND-MP-000123';
    userAvatar.textContent = 'VS';
  }

  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  const unread = alerts.filter(a => a.unread).length;
  alertBadge.textContent = unread;
  alertBadge.classList.toggle('zero', unread === 0);

  updateBreadcrumb();
  updateBackButton();
  updatePageMeta();
  updateTopbarLayout();
}

function updateTopbarLayout() {
  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.classList.toggle('topbar--root', currentPage === 'dashboard');
}

function updatePageMeta() {
  const el = document.getElementById('pageMeta');
  if (!el) return;

  const meta = getPageMeta();
  el.innerHTML = meta || '';
  el.classList.toggle('hidden', !meta);
}

function getPageMeta() {
  if (currentPage === 'contract-mgmt') {
    const rows = typeof getContractMgmtRows === 'function' ? getContractMgmtRows() : (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []);
    const active = rows.filter(r => r.lifecycleStage === 'Active' || r.status === 'Active').length;
    const pending = rows.filter(r => ['LOI Issued', 'LOI Accepted', 'PBG Pending', 'Draft'].includes(r.lifecycleStage)).length;
    return [
      `<span class="meta-chip accent"><strong>${rows.length}</strong> Synced contracts</span>`,
      `<span class="meta-chip"><strong>${active}</strong> Active</span>`,
      pending ? `<span class="meta-chip warning"><strong>${pending}</strong> Pre-sign</span>` : ''
    ].filter(Boolean).join('');
  }
  if (currentPage === 'vendor-reg') {
    const profiles = filterByCategory(typeof VENDOR_MGMT_PROFILES !== 'undefined' ? VENDOR_MGMT_PROFILES : VENDOR_REGISTRATIONS);
    const pending = profiles.filter(r => r.kyc && r.kyc !== 'Verified').length;
    const chips = [
      `<span class="meta-chip accent"><strong>${profiles.length}</strong> NIC / DVDMS profiles</span>`
    ];
    if (pending > 0) {
      chips.push(`<span class="meta-chip warning"><strong>${pending}</strong> Attention</span>`);
    }
    if (typeof AI_ELIGIBLE_VENDOR_QUEUE !== 'undefined') {
      chips.push(`<span class="meta-chip"><strong>${AI_ELIGIBLE_VENDOR_QUEUE.length}</strong> AI shortlist</span>`);
    }
    return chips.join('');
  }
  if (currentPage === 'sourcing') {
    const actions = getGovDashboardActionCounts(currentCategory === 'All' ? 'All' : currentCategory);
    return `<span class="meta-chip accent"><strong>${actions.sum}</strong> Action items</span>
      <span class="meta-chip"><strong>${actions.open}</strong> Open</span>
      <span class="meta-chip warning"><strong>${actions.pending}</strong> Pending</span>
      <span class="meta-chip danger"><strong>${actions.delays}</strong> Delays</span>`;
  }
  if (currentPage === 'work-queue') {
    const queue = getWorkQueueSource();
    const unread = queue.filter(i => i.unread).length;
    const high = queue.filter(i => i.severity === 'high').length;
    return `<span class="meta-chip accent"><strong>${queue.length}</strong> Total alerts</span>
      <span class="meta-chip warning"><strong>${unread}</strong> Unread</span>
      <span class="meta-chip danger"><strong>${high}</strong> High priority</span>`;
  }
  if (currentPage === 'sla-desk') {
    const open = SLA_THREADS.filter(t => t.status === 'Open').length;
    const progress = SLA_THREADS.filter(t => t.status === 'In Progress').length;
    return `<span class="meta-chip accent"><strong>${SLA_THREADS.length}</strong> Threads</span>
      <span class="meta-chip danger"><strong>${open}</strong> Open</span>
      <span class="meta-chip warning"><strong>${progress}</strong> In progress</span>`;
  }
  if (currentPage === 'tor') {
    const entries = filterByCategory(TOR_ENTRIES);
    const flags = entries.reduce((s, e) => s + e.flags, 0);
    if (flags > 0) {
      return `<span class="meta-chip warning"><strong>${flags}</strong> Red Flags</span>`;
    }
  }
  if (currentPage === 'workflow') {
    const { step, total } = getWorkflowPageSubtitle();
    return `<span class="meta-chip accent"><strong>Stage ${step.id}</strong> of ${total}</span>`;
  }
  return '';
}

function getPageLabel(page) {
  const nav = currentRole === 'gov' ? NAV_GOV : NAV_VENDOR;
  const item = nav.find(n => n.id === page);
  return item ? item.label : 'Dashboard';
}

function updateBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (!el) return;
  const dashLabel = currentRole === 'gov' ? 'Analytics Dashboard' : 'My Dashboard';
  if (currentPage === 'dashboard') {
    el.innerHTML = `<span class="crumb active">${dashLabel}</span>`;
    return;
  }
  el.innerHTML = `
    <span class="crumb link" onclick="navigateTo('dashboard', true)">${dashLabel}</span>
    <i class="fa-solid fa-chevron-right crumb-sep"></i>
    <span class="crumb active">${getPageLabel(currentPage)}</span>`;
}

function updateBackButton() {
  const btn = document.getElementById('btnBack');
  if (!btn) return;
  // Show on every non-dashboard route (same pattern as vendor lifecycle pages)
  const show = currentPage !== 'dashboard';
  btn.classList.toggle('hidden', !show);
  btn.title = show
    ? (pageStack.length ? `Back to ${getPageLabel(pageStack[pageStack.length - 1])}` : 'Back to Dashboard')
    : 'Go back';
}

function goBack() {
  const prev = pageStack.length ? pageStack.pop() : 'dashboard';
  currentPage = prev || 'dashboard';
  if (currentPage === 'dashboard') pageStack = [];
  renderSidebar();
  renderTopbar();
  renderPage();
  closeAlertPanel();
}

function navigateTo(page, arg = {}) {
  const skipHistory = arg === true || arg.skipHistory;
  const opts = arg === true ? {} : arg;
  if (!skipHistory && currentPage !== page) {
    pageStack.push(currentPage);
  }
  if (page === 'dashboard') pageStack = [];
  if (page === 'tenders') {
    if (opts.tenderFilter) tenderStatusFilter = opts.tenderFilter;
    else if (!opts.keepTenderFilter) tenderStatusFilter = 'all';
    tendersListState.page = 1;
  }
  if (page === 'workflow' && currentRole === 'gov') {
    // Resume saved progress — do NOT force Stage 1 or clear Stage 14 jump eligibility.
    ensureWorkflowViewStep();
    syncGovWorkflowStatuses();
    persistGovLifecycle();
  }
  if (page === 'workflow' && currentRole === 'vendor') {
    // Resume from cached step / progress (never force Stage 1 for returning vendors).
    ensureWorkflowViewStep();
    persistVendorLifecycle();
  }
  currentPage = page;
  renderSidebar();
  renderTopbar();
  renderPage();
  closeAlertPanel();
}

// ========== PAGE RENDERING ==========
const PAGES_WITH_CATEGORY = new Set([
  'dashboard', 'vendor-reg', 'contract-mgmt', 'sourcing', 'master-data', 'tor',
  'vendor-matrix', 'reports', 'tenders', 'bids', 'clarifications', 'contracts', 'delivery', 'repository'
]);

function getPageRenderer() {
  const pages = {
    dashboard: renderDashboard,
    workflow: renderWorkflow,
    'contract-mgmt': renderContractMgmt,
    'vendor-reg': renderVendorReg,
    sourcing: renderSourcing,
    'master-data': renderMasterData,
    tor: renderTOR,
    'vendor-matrix': renderVendorMatrix,
    reports: renderReports,
    settings: renderSettings,
    registration: renderRegistration,
    tenders: renderTenders,
    bids: renderBids,
    clarifications: renderClarifications,
    contracts: renderContracts,
    delivery: renderDelivery,
    performance: renderPerformance,
    repository: renderVendorRepository,
    'work-queue': renderWorkQueue,
    'sla-desk': renderSlaDesk
  };
  return pages[currentPage] || renderDashboard;
}

function renderCategoryBarSlot() {
  const slot = document.getElementById('categoryBarSlot');
  if (!slot) return;
  if (!PAGES_WITH_CATEGORY.has(currentPage)) {
    slot.innerHTML = '';
    slot.classList.add('hidden');
    slot.setAttribute('aria-hidden', 'true');
    return;
  }
  slot.innerHTML = categoryBar();
  slot.classList.remove('hidden');
  slot.setAttribute('aria-hidden', 'false');
}

function updateCategoryBarInPlace() {
  const toolbar = document.querySelector('#categoryBarSlot .page-toolbar');
  if (!toolbar) {
    renderCategoryBarSlot();
    return;
  }

  toolbar.querySelectorAll('.cat-tab').forEach(tab => {
    const name = tab.querySelector('.cat-tab-text')?.textContent;
    const isActive = name === currentCategory;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  CATEGORIES.forEach(c => {
    if (c === 'All') return;
    const tab = [...toolbar.querySelectorAll('.cat-tab')].find(t => t.querySelector('.cat-tab-text')?.textContent === c);
    const countEl = tab?.querySelector('.cat-count');
    if (countEl) countEl.textContent = getCategoryItemCount(c);
  });

  const hint = toolbar.querySelector('.toolbar-info');
  if (hint) hint.title = categoryBadgeHint();
}

function finishPageInit() {
  if (currentPage === 'dashboard') {
    setTimeout(() => {
      const period = currentRole === 'gov' ? getAnalyticsChartPeriod() : currentPeriod;
      if (currentRole === 'gov') {
        refreshAllCharts(period, currentCategory);
        updateChartSubtitles();
        syncAnalyticsFilterControls();
      } else { initCategoryChart(currentCategory); }
    }, 100);
  }
  if (currentPage === 'reports') {
    setTimeout(() => {
      if (currentRole === 'vendor') initVendorReportCharts(currentCategory);
      else refreshGovReportsPage();
    }, 100);
  }
  if (currentPage === 'vendor-matrix') {
    setTimeout(() => {
      if (currentRole === 'gov') refreshVendorMatrixPage();
      else initVendorTrendChart(filterByCategory(VENDORS));
    }, 100);
  }
  bindPageEvents();
  initCustomSelects();
  bindAnalyticsFilterControls();
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 1) {
    lockSyncedRegistrationSelects();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 4) {
    bindVendorBidDvdmsCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 5) {
    bindVendorAwardSyncCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 6) {
    bindContractTenderSelectListener();
    bindVendorContractExecCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 7) {
    bindVendorDeliverySyncCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 8) {
    bindVendorInvoiceExecCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 9) {
    bindVendorPaymentExecCategorySelect();
  }
  if (currentPage === 'workflow' && currentRole === 'vendor' && currentWorkflowStep === 10) {
    bindVendorRenewalExecCategorySelect();
  }
  if (currentPage === 'repository' && currentRole === 'vendor') {
    bindVendorRepositoryFilters();
  }
  if (currentPage === 'workflow' && currentRole === 'gov') {
    scheduleStageSlaCheck(currentWorkflowStep);
  }
}

function renderPageContent() {
  document.getElementById('pageContent').innerHTML = getPageRenderer()();
  finishPageInit();
}

function renderPage() {
  renderCategoryBarSlot();
  renderPageContent();
}

function filterByCategory(items, field = 'category') {
  if (currentCategory === 'All') return items;
  return items.filter(item => item[field] === currentCategory);
}

function categoryBadgeHint() {
  if (currentPage === 'tenders' && tenderStatusFilter !== 'all') {
    return `Badge count = ${tenderStatusFilter} tenders in that category (matches the list below)`;
  }
  if (currentPage === 'tenders') {
    return 'Badge count = tenders in that category on this page';
  }
  if (currentPage === 'contracts') {
    return 'Badge count = contracts in that category on this page';
  }
  if (currentPage === 'bids') {
    return 'Badge count = your bids in that category on this page';
  }
  if (currentPage === 'delivery') {
    return 'Badge count = deliveries in that category on this page';
  }
  if (currentPage === 'clarifications') {
    return 'Badge count = clarifications in that category on this page';
  }
  if (currentPage === 'dashboard' || currentPage === 'sourcing') {
    if (currentRole === 'vendor' && currentPage === 'dashboard') {
      return 'Badge count = open + evaluation + draft tenders + active bids + active contracts in that category';
    }
    return 'Badge count = Open Tenders + Pending Approvals + Payment Delays (same as Analytics Dashboard)';
  }
  const hints = {
    dashboard: 'Active tender count per category on this page',
    bids: 'Your bid count per category',
    contracts: 'Active contract count per category'
  };
  return hints[currentPage] || 'Item count per category on this page';
}

function getVendorCategoryBadgeCount(cat) {
  const open = TENDERS.filter(t => t.category === cat && t.status === 'Open').length;
  const evaluation = TENDERS.filter(t => t.category === cat && t.status === 'Evaluation').length;
  const draft = TENDERS.filter(t => t.category === cat && t.status === 'Draft').length;
  const activeBids = BIDS.filter(b => b.category === cat).length;
  const activeContracts = CONTRACTS.filter(c => c.category === cat).length;
  return open + evaluation + draft + activeBids + activeContracts;
}

function filterTendersByStatus(tenders) {
  const statusMap = { open: 'Open', evaluation: 'Evaluation', draft: 'Draft' };
  const status = statusMap[tenderStatusFilter];
  return status ? tenders.filter(t => t.status === status) : tenders;
}

function countTendersByStatus(tenders, status) {
  return tenders.filter(t => t.status === status).length;
}

function categoryBar() {
  const counts = {};
  CATEGORIES.forEach(c => {
    if (c === 'All') counts[c] = null;
    else counts[c] = getCategoryItemCount(c);
  });
  return `<div class="page-toolbar">
    <span class="page-toolbar-label">
      <i class="fa-solid fa-layer-group"></i> Category
      <i class="fa-solid fa-circle-info toolbar-info" title="${categoryBadgeHint()}"></i>
    </span>
    <div class="category-bar" role="tablist" aria-label="Category filter">
      ${CATEGORIES.map(c => `<button type="button" role="tab" aria-selected="${currentCategory === c}" class="cat-tab ${currentCategory === c ? 'active' : ''}" onclick="setCategory('${c}')"><span class="cat-tab-text">${c}</span>${counts[c] !== null ? `<span class="cat-count">${counts[c]}</span>` : ''}</button>`).join('')}
    </div>
  </div>`;
}

function getGovDashboardActionCounts(cat) {
  const tenders = cat === 'All' ? TENDERS : TENDERS.filter(t => t.category === cat);
  const open = tenders.filter(t => t.status === 'Open').length;
  const pendingList = typeof PENDING_APPROVALS !== 'undefined'
    ? (cat === 'All' ? PENDING_APPROVALS : PENDING_APPROVALS.filter(r => r.category === cat))
    : [];
  const delayList = typeof PAYMENT_DELAYS !== 'undefined'
    ? (cat === 'All' ? PAYMENT_DELAYS : PAYMENT_DELAYS.filter(r => r.category === cat))
    : [];
  const pending = pendingList.length || (cat === 'All' ? 8 : Math.max(1, Math.round(8 * (CATEGORY_WEIGHTS[cat] ?? 1))));
  const delays = delayList.length || Math.max(1, Math.round(6 * (CATEGORY_WEIGHTS[cat] ?? 1)));
  return { open, pending, delays, sum: open + pending + delays };
}

function getCategoryItemCount(cat) {
  // Always prefer page-local counts so Contracts/Bids/etc. are not polluted by dashboard totals
  if (currentPage === 'tenders') {
    return filterTendersByStatus(TENDERS.filter(t => t.category === cat)).length;
  }
  if (currentPage === 'contracts') {
    return CONTRACTS.filter(c => c.category === cat).length;
  }
  if (currentPage === 'bids') {
    return BIDS.filter(b => b.category === cat).length;
  }
  if (currentPage === 'delivery') {
    return DELIVERIES.filter(d => d.category === cat).length;
  }
  if (currentPage === 'clarifications') {
    return CLARIFICATIONS.filter(c => c.category === cat).length;
  }
  if (currentPage === 'vendor-reg') {
    return VENDOR_REGISTRATIONS.filter(r => r.category === cat).length;
  }
  if (currentPage === 'sourcing') {
    return getGovDashboardActionCounts(cat).sum;
  }
  if (currentPage === 'tor') {
    return TOR_ENTRIES.filter(t => t.category === cat).length;
  }
  if (currentPage === 'vendor-matrix') {
    return VENDORS.filter(v => v.category === cat).length;
  }
  if (currentPage === 'dashboard') {
    if (currentRole === 'vendor') return getVendorCategoryBadgeCount(cat);
    return getGovDashboardActionCounts(cat).sum;
  }
  if (currentRole === 'vendor') {
    return getVendorCategoryBadgeCount(cat);
  }
  return TENDERS.filter(t => t.category === cat).length;
}

function emptyTableRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="empty-state"><i class="fa-solid fa-inbox"></i> ${msg || `No records found for ${currentCategory} category.`}</td></tr>`;
}

function kycBadgeClass(kyc) {
  if (kyc === 'Verified') return 'success';
  if (kyc === 'Pending') return 'warning';
  return 'info';
}

function tenderBadgeClass(status) {
  if (status === 'Open') return 'success';
  if (status === 'Evaluation') return 'warning';
  if (status === 'Awarded') return 'info';
  if (status === 'Draft') return 'muted';
  return 'muted';
}

function getPerfMetricBarValue(metric, points) {
  const p = Math.max(0, Math.min(100, Number(points) || 0));
  // Bar shows the named measure: high bar = high quality / high cost / high delay / high blacklisting risk.
  if (metric.scoring === 'lowerBetter' || metric.scoring === 'inverse') return 100 - p;
  return p;
}

function getPerfMetricBarBenchmark(metric, benchmark) {
  const b = Math.max(0, Math.min(100, Number(benchmark) || 0));
  if (metric.scoring === 'lowerBetter' || metric.scoring === 'inverse') return 100 - b;
  return b;
}

function renderPerformanceBreakdown(vendor) {
  const BENCHMARK = 85;
  const metrics = PERF_METRICS.map(m => ({
    ...m,
    score: vendor[m.key],
    delta: vendor[m.key] - BENCHMARK,
    barValue: getPerfMetricBarValue(m, vendor[m.key]),
    barBenchmark: getPerfMetricBarBenchmark(m, BENCHMARK)
  }));
  const aboveCount = metrics.filter(m => m.score >= BENCHMARK).length;
  const strongest = metrics.reduce((a, b) => (b.score > a.score ? b : a));

  return `<div class="perf-breakdown">
    <div class="perf-hero">
      <div class="perf-score-ring">
        <svg viewBox="0 0 120 120">
          <circle class="perf-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="perf-ring-fill" cx="60" cy="60" r="52" style="stroke-dashoffset:${326 - (326 * vendor.overall / 100)}"/>
        </svg>
        <div class="perf-score-center">
          <span class="perf-score-num">${vendor.overall}</span>
          <span class="perf-score-label">Overall</span>
        </div>
      </div>
      <div class="perf-hero-info">
        <h3>${vendor.name}</h3>
        <p class="perf-vendor-id"><i class="fa-solid fa-id-badge"></i> ${vendor.id}</p>
        <span class="badge badge-success"><i class="fa-solid fa-certificate"></i> ${vendor.status} Vendor</span>
        <p class="perf-hero-desc">Weighted score across ${metrics.length} evaluation parameters vs platform benchmark of ${BENCHMARK}.</p>
      </div>
    </div>

    <div class="score-compare">
      <div class="score-compare-header">
        <div class="score-compare-title">
          <h3>Performance vs Benchmark</h3>
          <p>Bar shows the measured level for each parameter. Points are what count toward your score (benchmark ${BENCHMARK}).</p>
        </div>
        <div class="score-compare-legend-bar" role="note" aria-label="Chart legend">
          <div class="legend-key">
            <span class="legend-key-icon legend-key-icon--score" aria-hidden="true"></span>
            <span class="legend-key-text">Measured level</span>
          </div>
          <span class="legend-key-sep" aria-hidden="true"></span>
          <div class="legend-key">
            <span class="legend-key-icon legend-key-icon--benchmark" aria-hidden="true"></span>
            <span class="legend-key-text">Benchmark</span>
          </div>
        </div>
      </div>

      <div class="score-compare-summary">
        <div class="score-summary-card">
          <span class="score-summary-icon"><i class="fa-solid fa-arrow-trend-up"></i></span>
          <div>
            <span class="score-summary-value">${aboveCount}<small>/${metrics.length}</small></span>
            <span class="score-summary-label">Metrics above benchmark</span>
          </div>
        </div>
        <div class="score-summary-card highlight">
          <span class="score-summary-icon"><i class="fa-solid fa-trophy"></i></span>
          <div>
            <span class="score-summary-value">${strongest.score}</span>
            <span class="score-summary-label">Top performer · ${strongest.label}</span>
          </div>
        </div>
        <div class="score-summary-card">
          <span class="score-summary-icon"><i class="fa-solid fa-gauge-high"></i></span>
          <div>
            <span class="score-summary-value">${vendor.overall}</span>
            <span class="score-summary-label">Weighted overall score</span>
          </div>
        </div>
      </div>

      <div class="score-compare-table">
        <div class="score-compare-thead">
          <span>Parameter</span>
          <span>Measured level (0–100)</span>
          <span>Points</span>
          <span>vs Benchmark</span>
        </div>
        <div class="score-compare-rows">
        ${metrics.map(m => {
          const deltaClass = m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : 'neutral';
          const deltaText = m.delta > 0 ? `+${m.delta}` : m.delta === 0 ? '0' : String(m.delta);
          const deltaHint = m.delta > 0 ? 'Above standard' : m.delta < 0 ? 'Below standard' : 'Meets standard';
          return `<div class="score-compare-row" style="--metric-color:${m.color}">
            <div class="score-row-label">
              <span class="score-row-icon"><i class="fa-solid ${m.icon}"></i></span>
              <div class="score-row-text">
                <span class="score-row-name">${m.label}</span>
              </div>
            </div>
            <div class="score-row-visual" title="Measured ${m.label}: ${m.barValue}">
              <div class="score-lane-track">
                <div class="score-lane-benchmark" style="left:${m.barBenchmark}%"></div>
                <div class="score-lane-fill" style="width:${m.barValue}%"></div>
              </div>
            </div>
            <div class="score-row-score" title="Points earned">${m.score}</div>
            <div class="score-row-result" title="Points ${m.score} vs benchmark ${BENCHMARK}">
              <span class="score-delta ${deltaClass}">${deltaText}</span>
              <span class="score-delta-hint">${deltaHint}</span>
            </div>
          </div>`;
        }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function paginateItems(items, page, pageSize = PIPELINE_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length)
  };
}

function renderPaginationControls(page, totalPages, total, from, to, handlerName, opts = {}) {
  if (!total) return '';
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return `<div class="table-pagination">
    ${opts.hideInfo ? '<span class="pagination-info"></span>' : `<span class="pagination-info">Showing ${from}–${to} of ${total} · 10 per page</span>`}
    <div class="pagination-controls">
      <button type="button" class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="${handlerName}(${page - 1})" aria-label="Previous page"><i class="fa-solid fa-chevron-left"></i></button>
      ${pages.map(p => p === '…'
        ? `<span class="pagination-ellipsis">…</span>`
        : `<button type="button" class="pagination-btn ${p === page ? 'active' : ''}" onclick="${handlerName}(${p})">${p}</button>`
      ).join('')}
      <button type="button" class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="${handlerName}(${page + 1})" aria-label="Next page"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
  </div>`;
}

function pipelineActionLabel(status) {
  if (status === 'Open') return 'Submit Bid';
  if (status === 'Draft') return 'Preview';
  if (status === 'Awarded') return 'View Award';
  return 'View';
}

function renderTenderPipeline(tenders) {
  const pipelineTenders = tenders.filter(t => ['Open', 'Evaluation', 'Draft', 'Awarded'].includes(t.status));
  const paged = paginateItems(pipelineTenders, pipelinePage);
  return `<div class="data-table-wrap">
      <div class="table-header">
        <h3>Tender Details</h3>
      </div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map((t, i) => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openTenderDetail('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openTenderDetail('${t.id}')}">
            <td>${paged.from + i}</td>
            <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${formatDateDMY(t.deadline)}</td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            <td><button type="button" class="btn btn-outline" style="padding:0.3rem 0.6rem;font-size:0.75rem" onclick="event.stopPropagation();openTenderDetail('${t.id}')">${pipelineActionLabel(t.status)}</button></td>
          </tr>`).join('') : emptyTableRow(7, 'No tenders in pipeline for this category.')}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setPipelinePage', { hideInfo: true })}
    </div>`;
}

function setPipelinePage(page) {
  pipelinePage = page;
  if (currentPage === 'dashboard' && currentRole === 'vendor') {
    renderPageContent();
  }
}

function timeToggle() {
  return `<div class="time-toggle" role="group" aria-label="Time granularity">
    ${['year', 'quarter', 'month'].map(p => `<button type="button" class="time-btn ${currentPeriod === p ? 'active' : ''}" onclick="setPeriod('${p}')">${p.charAt(0).toUpperCase() + p.slice(1)}</button>`).join('')}
  </div>`;
}

function renderAnalyticsFilterBar(options = {}) {
  const { showCompare = true } = options;
  const fyOptions = typeof ANALYTICS_FY_OPTIONS !== 'undefined' ? ANALYTICS_FY_OPTIONS : ['all'];
  const years = fyOptions.filter(y => y !== 'all');
  const yearSelected = analyticsFocusYear !== 'all';
  const quarters = typeof ANALYTICS_QUARTER_OPTIONS !== 'undefined' ? ANALYTICS_QUARTER_OPTIONS : [];
  const months = typeof ANALYTICS_MONTH_OPTIONS !== 'undefined' ? ANALYTICS_MONTH_OPTIONS : [];
  const fyDisplay = fyOptions.map(y => y === 'all' ? 'All 10 years' : y);
  const fySelectedDisplay = analyticsFocusYear === 'all' ? 'All 10 years' : analyticsFocusYear;

  return `<div class="analytics-filter">
    <div class="analytics-filter-intro">
      <div class="analytics-filter-icon"><i class="fa-solid fa-chart-line"></i></div>
      <div>
        <h3>Performance Matrix Explorer</h3>
        <p>Select a <strong>financial year</strong>, choose <strong>quarter</strong> or <strong>month</strong> view, then pick a specific period to filter all charts below.</p>
      </div>
    </div>
    <div class="analytics-filter-controls">
      <div class="analytics-control">
        <span class="analytics-control-label">Focus year</span>
        ${typeof inlineCustomSelectHTML === 'function'
          ? inlineCustomSelectHTML('analyticsFocusYear', fyDisplay, fySelectedDisplay)
          : `<select id="analyticsFocusYear" onchange="setAnalyticsFocusYear(this.value)">${fyDisplay.map(d => `<option>${d}</option>`).join('')}</select>`}
      </div>
      <div class="analytics-control ${yearSelected ? '' : 'analytics-control--muted'}">
        <span class="analytics-control-label">View by ${yearSelected ? '' : '(select a year first)'}</span>
        <div class="analytics-segment ${yearSelected ? '' : 'is-disabled'}" role="group" aria-label="Quarter or month view">
          <button type="button" class="analytics-seg-btn ${analyticsSliceType === 'quarter' ? 'active' : ''}" onclick="setAnalyticsSliceType('quarter')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-table-cells"></i> Quarter</button>
          <button type="button" class="analytics-seg-btn ${analyticsSliceType === 'month' ? 'active' : ''}" onclick="setAnalyticsSliceType('month')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-calendar-days"></i> Month</button>
        </div>
      </div>
      ${showCompare ? `<div class="analytics-control">
        <span class="analytics-control-label">Compare by</span>
        <div class="analytics-segment" role="group" aria-label="Comparison mode">
          <button type="button" class="analytics-seg-btn ${analyticsCompareMode === 'vendor' ? 'active' : ''}" onclick="setAnalyticsCompareMode('vendor')"><i class="fa-solid fa-users"></i> Vendor-wise</button>
          <button type="button" class="analytics-seg-btn ${analyticsCompareMode === 'progress' ? 'active' : ''}" onclick="setAnalyticsCompareMode('progress')"><i class="fa-solid fa-arrow-trend-up"></i> Progress trend</button>
        </div>
      </div>` : ''}
    </div>
    <div class="analytics-fy-chips" role="group" aria-label="Quick year select">
      <button type="button" class="analytics-fy-chip ${analyticsFocusYear === 'all' ? 'active' : ''}" onclick="setAnalyticsFocusYear('all')">All 10 yrs</button>
      ${years.map(y => `<button type="button" class="analytics-fy-chip ${analyticsFocusYear === y ? 'active' : ''}" onclick="setAnalyticsFocusYear('${y}')">${y.replace('FY', '')}</button>`).join('')}
    </div>
    ${yearSelected ? `<div class="analytics-period-row">
      <span class="analytics-control-label">Select ${analyticsSliceType === 'quarter' ? 'quarter' : 'month'} in ${analyticsFocusYear}</span>
      <div class="analytics-fy-chips" role="group" aria-label="Period select">
        <button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === 'all' ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('all')">All</button>
        ${analyticsSliceType === 'quarter'
          ? quarters.map(q => `<button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === q.id ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('${q.id}')" title="${q.range}">${q.label} <em>${q.range}</em></button>`).join('')
          : months.map(m => `<button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === m ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('${m}')">${m}</button>`).join('')}
      </div>
    </div>` : `<p class="analytics-filter-hint"><i class="fa-solid fa-circle-info"></i> All 10 years selected — charts show year-over-year trends. Pick a FY to enable quarter/month filtering.</p>`}
  </div>`;
}

function getAnalyticsContextLabel() {
  const cat = currentCategory === 'All' ? 'All categories' : currentCategory;
  if (analyticsFocusYear === 'all') return `Last 10 FYs · ${cat}`;
  let period = analyticsSliceType === 'month' ? 'Monthly view' : 'Quarterly view';
  if (analyticsPeriodFocus !== 'all') period = analyticsPeriodFocus;
  return `${analyticsFocusYear} · ${period} · ${cat}`;
}

function getChartSubtitle(chartKey) {
  const ctx = getAnalyticsContextLabel();
  const units = {
    spend: '₹ Crore — total procurement outlay',
    procurement: 'tenders — count of tenders published/processed',
    vendorPerf: 'points (0–100) — weighted vendor score',
    savings: '₹ Crore — realized cost savings'
  };
  return `${ctx} · ${units[chartKey] || ''}`;
}

function updateChartSubtitles() {
  document.querySelectorAll('[data-chart-sub]').forEach(el => {
    const key = el.dataset.chartSub;
    if (key) el.textContent = getChartSubtitle(key);
  });
  updateAnalyticsExplorerSubtitle();
}

function getAnalyticsChartPeriod() {
  if (analyticsFocusYear === 'all') return 'year';
  return analyticsSliceType || 'quarter';
}

function isGovAnalyticsPage() {
  return currentRole === 'gov' && (currentPage === 'dashboard' || currentPage === 'vendor-matrix' || currentPage === 'reports');
}

function getReportsPeriodTotals() {
  const period = getAnalyticsChartPeriod();
  const cat = currentCategory;
  const spend = typeof resolveChartSeries === 'function' ? resolveChartSeries('spend', period) : { data: [] };
  const savings = typeof resolveChartSeries === 'function' ? resolveChartSeries('savings', period) : { data: [] };
  const spendData = typeof scaleData === 'function' ? scaleData(spend.data || [], cat) : (spend.data || []);
  const saveData = typeof scaleData === 'function' ? scaleData(savings.data || [], cat) : (savings.data || []);
  const spendTotal = Math.round(spendData.reduce((s, v) => s + (Number(v) || 0), 0) * 10) / 10;
  const saveTotal = Math.round(saveData.reduce((s, v) => s + (Number(v) || 0), 0) * 10) / 10;
  const rate = spendTotal > 0 ? Math.round((saveTotal / spendTotal) * 1000) / 10 : 0;
  return { spendTotal, saveTotal, rate, period };
}

function refreshGovReportsPage() {
  const period = getAnalyticsChartPeriod();
  if (typeof initSpendChart === 'function') initSpendChart(period, currentCategory);
  if (typeof initSavingsChart === 'function') initSavingsChart(period, currentCategory);
  if (typeof initGovReportCharts === 'function') initGovReportCharts(currentCategory);
  updateChartSubtitles();
  syncAnalyticsFilterControls();
  const totals = getReportsPeriodTotals();
  const spendEl = document.getElementById('reportSpendTotal');
  const saveEl = document.getElementById('reportSaveTotal');
  const rateEl = document.getElementById('reportSaveRate');
  const ctxEl = document.getElementById('reportContextLabel');
  if (spendEl) spendEl.textContent = `₹${totals.spendTotal} Cr`;
  if (saveEl) saveEl.textContent = `₹${totals.saveTotal} Cr`;
  if (rateEl) rateEl.textContent = `${totals.rate}%`;
  if (ctxEl) ctxEl.textContent = getAnalyticsContextLabel();
  document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim().split(/\s/)[0];
    const isAll = analyticsPeriodFocus === 'all' && label === 'All';
    const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
    chip.classList.toggle('active', isAll || isMatch);
  });
}

/** Scale factor for vendor scores based on FY / quarter / month explorer selection */
function getAnalyticsScoreFactor() {
  const focus = analyticsFocusYear;
  if (!focus || focus === 'all') return 1;

  const vp = CHART_DATA.vendorPerf;
  if (!vp) return 1;

  const yearIdx = vp.year.labels.indexOf(focus);
  const base = yearIdx >= 0 ? vp.year.data[yearIdx] : 88;
  const latest = vp.year.data[vp.year.data.length - 1];
  let factor = latest ? base / latest : 1;

  const periodData = analyticsSliceType === 'month' ? vp.month : vp.quarter;
  const pf = analyticsPeriodFocus;
  if (pf && pf !== 'all') {
    const pidx = periodData.labels.findIndex(l => l === pf || l.startsWith(pf) || l.includes(pf));
    if (pidx >= 0) {
      const periodVal = periodData.data[pidx];
      const periodAvg = periodData.data.reduce((s, v) => s + v, 0) / periodData.data.length;
      factor *= periodAvg ? periodVal / periodAvg : 1;
    }
  }

  return factor;
}

function computeVendorOverallScore(vendor) {
  const metrics = typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : [];
  if (!metrics.length) return Number(vendor?.overall) || 0;
  const totalW = metrics.reduce((s, m) => s + m.weight, 0) || 100;
  const sum = metrics.reduce((s, m) => s + (Number(vendor?.[m.key]) || 0) * m.weight, 0);
  return Math.round((sum / totalW) * 10) / 10;
}

function adjustVendorScores(vendor, factor) {
  if (factor === 1) return vendor;
  const adj = v => Math.min(100, Math.max(1, Math.round(v * factor * 10) / 10));
  const next = { ...vendor };
  (typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : []).forEach(m => {
    next[m.key] = adj(Number(vendor[m.key]) || 0);
  });
  next.overall = computeVendorOverallScore(next);
  return next;
}

function getAnalyticsAdjustedVendors(vendors) {
  const factor = getAnalyticsScoreFactor();
  return vendors.map(v => adjustVendorScores(v, factor));
}

function refreshDashboardVendorTable() {
  const wrap = document.querySelector('#dashboardVendorTable');
  if (!wrap) return;
  wrap.outerHTML = renderVendorTable({ tableId: 'dashboardVendorTable' });
}

function refreshVendorMatrixPage() {
  const vendors = getAnalyticsAdjustedVendors(filterByCategory(VENDORS));
  if (typeof initVendorTrendChart === 'function') initVendorTrendChart(vendors);
  updateVendorMatrixSubtitle();
  const wrap = document.querySelector('#vendorMatrixTable');
  if (wrap) {
    wrap.outerHTML = renderVendorTable({ showNavButton: false, tableId: 'vendorMatrixTable' });
  }
  syncAnalyticsFilterControls();
  document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim().split(/\s/)[0];
    const isAll = analyticsPeriodFocus === 'all' && label === 'All';
    const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
    chip.classList.toggle('active', isAll || isMatch);
  });
}

function updateVendorMatrixSubtitle() {
  const subtitle = document.getElementById('vendorMatrixChartSubtitle');
  if (subtitle) {
    subtitle.textContent = `${getAnalyticsContextLabel()} · Vendor score comparison (pts 0–100)`;
  }
}

function bindAnalyticsFilterControls() {
  const wrapper = document.querySelector('.custom-select[data-select-id="analyticsFocusYear"]');
  if (wrapper && !wrapper.dataset.analyticsBound) {
    wrapper.dataset.analyticsBound = 'true';
    wrapper.addEventListener('change', e => {
      const display = e.detail?.value || '';
      const year = display === 'All 10 years' ? 'all' : display;
      setAnalyticsFocusYear(year);
    });
  }
}

// ========== DASHBOARD ==========
function renderDashboard() {
  if (currentRole === 'gov') return renderGovDashboard();
  return renderVendorDashboard();
}

function renderGovDashboard() {
  const vendors = filterByCategory(VENDORS);
  const weight = CATEGORY_WEIGHTS[currentCategory];
  const actions = getGovDashboardActionCounts(currentCategory);
  const spend = Math.round(215 * weight * 10) / 10;
  const avgScore = vendors.length
    ? (vendors.reduce((s, v) => s + v.overall, 0) / vendors.length).toFixed(1)
    : '—';
  const compareTitle = analyticsCompareMode === 'vendor' ? 'Vendor-wise Comparison' : 'Tender Progress Trend';
  const compareIcon = analyticsCompareMode === 'vendor' ? 'users' : 'arrow-trend-up';
  const metricAvgs = getCategoryMetricAverages(vendors);

  return `
    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-bolt"></i> Action queue <span class="kpi-section-sum">Tab total = ${actions.sum}</span></div>
      <div class="kpi-grid kpi-grid--actions">
        <div class="kpi-card blue" onclick="openGovKpiDetail('openTenders')">
          <div class="kpi-label">Open Tenders</div>
          <div class="kpi-value">${actions.open}</div>
          <div class="kpi-change up">↑ 12% vs last quarter</div>
        </div>
        <div class="kpi-card orange" onclick="openGovKpiDetail('pendingApprovals')">
          <div class="kpi-label">Pending Approvals</div>
          <div class="kpi-value">${actions.pending}</div>
          <div class="kpi-change down">↓ 3 resolved today</div>
        </div>
        <div class="kpi-card red" onclick="openGovKpiDetail('paymentDelays')">
          <div class="kpi-label">Payment Delays</div>
          <div class="kpi-value">${actions.delays}</div>
          <div class="kpi-change down">↑ 2 new this week</div>
        </div>
      </div>
    </div>

    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-chart-pie"></i> Performance metrics</div>
      <div class="kpi-grid kpi-grid--metrics">
        <div class="kpi-card green" onclick="openGovKpiDetail('procurementSpend')">
          <div class="kpi-label">Procurement Spend</div>
          <div class="kpi-value">₹${spend} Cr</div>
          <div class="kpi-change up">↑ 8.2% YoY</div>
        </div>
        <div class="kpi-card teal" onclick="openGovKpiDetail('avgVendorScore')">
          <div class="kpi-label">Vendor Score</div>
          <div class="kpi-value">${avgScore}</div>
          <div class="kpi-change up">↑ 3.2 pts YoY</div>
        </div>
      </div>
    </div>

    ${renderAnalyticsFilterBar()}

    <div class="chart-grid">
      <div class="chart-card full">
        <div class="chart-header">
          <h3><i class="fa-solid fa-${compareIcon}"></i> ${compareTitle}</h3>
          <span class="chart-subtitle">${getAnalyticsContextLabel()} · ${analyticsCompareMode === 'progress' ? 'Tender pipeline' : 'Vendor score comparison'}</span>
        </div>
        <div class="chart-container chart-container--tall"><canvas id="chartAnalyticsCompare"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-column"></i> Spend Trends (₹ Cr)</h3>
          <span class="chart-subtitle" data-chart-sub="spend">Total procurement spend · unit: ₹ Crore</span>
        </div>
        <div class="chart-container"><canvas id="chartSpend"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-line"></i> Procurement Trends (Tender)</h3>
          <span class="chart-subtitle" data-chart-sub="procurement">Tenders published / processed · unit: count of tenders</span>
        </div>
        <div class="chart-container"><canvas id="chartProcurement"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-star"></i> Vendor Performance Trends</h3>
          <span class="chart-subtitle" data-chart-sub="vendorPerf">Weighted vendor score · unit: points (0–100)</span>
        </div>
        <div class="chart-container"><canvas id="chartVendorPerf"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-piggy-bank"></i> Savings Realization (₹ Cr)</h3>
          <span class="chart-subtitle" data-chart-sub="savings">Cost savings from optimization · unit: ₹ Crore</span>
        </div>
        <div class="chart-container"><canvas id="chartSavings"></canvas></div>
      </div>
      <div class="chart-card full">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-pie"></i> Category Distribution</h3>
          <span class="chart-subtitle">Spend share (% of total) — click a slice for item &amp; district detail</span>
        </div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    <div class="score-weights">
      ${PERF_METRICS.map(m => {
        const avg = metricAvgs[m.key];
        return `<div class="weight-card weight-card--clickable" onclick="openGovKpiDetail('metric:${m.key}')" title="View ${m.label} detail">
          <div class="weight-pct">${avg}</div>
          <div class="weight-label">${m.label}</div>
        </div>`;
      }).join('')}
    </div>
    ${renderVendorTable({ tableId: 'dashboardVendorTable' })}
  `;
}

function renderVendorDashboard() {
  if (isBlankVendorOnboarding()) {
    const org = authUser?.organization || 'your organization';
    return `
      <div class="onboard-hero">
        <div class="onboard-hero-copy">
          <p class="onboard-hero-eyebrow">Welcome to EMMS · Bid-to-Pay</p>
          <h2>Get ${escapeHtmlLite(org)} empanelled</h2>
          <p>Your portal is empty until registration is complete. Start at Stage 1 — no bids, contracts, or scores will appear until you finish onboarding.</p>
          <div class="onboard-hero-actions">
            <button type="button" class="btn btn-primary" onclick="navigateTo('workflow')"><i class="fa-solid fa-play"></i> Start Registration</button>
            <button type="button" class="btn btn-outline" onclick="navigateTo('registration')">View Profile</button>
          </div>
        </div>
        <div class="onboard-hero-panel">
          <div class="onboard-stat"><span>0</span><small>Active bids</small></div>
          <div class="onboard-stat"><span>0</span><small>Contracts</small></div>
          <div class="onboard-stat"><span>—</span><small>Performance</small></div>
        </div>
      </div>
      ${renderVendorOnboardingEmptyState({
        icon: 'fa-route',
        title: 'Nothing to show on the dashboard yet',
        body: 'KPIs, tenders, and performance charts unlock after Vendor Approval (Stage 3). Complete the three onboarding steps first.',
        steps: ['Stage 1 — Registration', 'Stage 2 — KYC verification', 'Stage 3 — Vendor approval']
      })}
    `;
  }

  const tenders = filterByCategory(TENDERS);
  const bids = filterByCategory(BIDS);
  const contracts = filterByCategory(CONTRACTS);
  const openCount = countTendersByStatus(tenders, 'Open');
  const evalCount = countTendersByStatus(tenders, 'Evaluation');
  const draftCount = countTendersByStatus(tenders, 'Draft');
  const draftBids = bids.filter(b => b.status === 'Draft').length;

  return `
    <div class="kpi-grid kpi-grid--vendor">
      <div class="kpi-card green" onclick="navigateTo('tenders', { tenderFilter: 'open' })">
        <div class="kpi-label">Open</div>
        <div class="kpi-value">${openCount}</div>
        <div class="kpi-change">Accepting bids</div>
      </div>
      <div class="kpi-card orange" onclick="navigateTo('tenders', { tenderFilter: 'evaluation' })">
        <div class="kpi-label">Evaluation</div>
        <div class="kpi-value">${evalCount}</div>
        <div class="kpi-change">Under review</div>
      </div>
      <div class="kpi-card slate" onclick="navigateTo('tenders', { tenderFilter: 'draft' })">
        <div class="kpi-label">Draft</div>
        <div class="kpi-value">${draftCount}</div>
        <div class="kpi-change">In preparation</div>
      </div>
      <div class="kpi-card blue" onclick="navigateTo('bids')">
        <div class="kpi-label">Active Bids</div>
        <div class="kpi-value">${bids.length}</div>
        <div class="kpi-change">${draftBids} in draft</div>
      </div>
      <div class="kpi-card teal" onclick="navigateTo('contracts')">
        <div class="kpi-label">Active Contracts</div>
        <div class="kpi-value">${contracts.length}</div>
        <div class="kpi-change kpi-change--truncate">${contracts.length ? contracts.map(c => c.value).join(' · ') : 'No active contracts'}</div>
      </div>
      <div class="kpi-card purple" onclick="navigateTo('performance')">
        <div class="kpi-label">Performance Score</div>
        <div class="kpi-value">90.1</div>
        <div class="kpi-change up">Preferred Vendor</div>
      </div>
    </div>
    ${renderPerformanceBreakdown(VENDORS[0])}
    <div class="chart-grid">
      <div class="chart-card full">
        <div class="chart-header"><h3><i class="fa-solid fa-chart-pie"></i> Category Distribution</h3><span class="chart-subtitle">Spend share (% of total) — click a slice for item &amp; district detail</span></div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    ${renderTenderPipeline(tenders)}
  `;
}

function renderVendorTableRows(vendors) {
  const metrics = typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : [];
  const colSpan = 3 + metrics.length + 2;
  return vendors.length ? vendors.map(v => `<tr onclick="openVendorDetail('${v.id}')">
    <td><strong>${v.id}</strong></td>
    <td>${v.name}</td>
    <td>${v.category}</td>
    ${metrics.map(m => {
      const s = Number(v[m.key]) || 0;
      return `<td><div class="score-bar"><div class="score-track"><div class="score-fill ${s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'}" style="width:${s}%"></div></div><span>${s}</span></div></td>`;
    }).join('')}
    <td><strong>${v.overall}</strong></td>
    <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
  </tr>`).join('') : emptyTableRow(colSpan);
}

function renderVendorTable(options = {}) {
  const { showNavButton = true, tableId = '' } = options;
  const vendors = getAnalyticsAdjustedVendors(filterByCategory(VENDORS));
  const paged = paginateItems(vendors, vendorMatrixPage, 10);
  vendorMatrixPage = paged.page;
  const metrics = typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : [];
  const colSpan = 3 + metrics.length + 2;
  return `<div class="data-table-wrap"${tableId ? ` id="${tableId}"` : ''}>
    <div class="table-header"><h3>Vendor Performance Matrix ${currentCategory !== 'All' ? `— ${currentCategory}` : ''}</h3>${showNavButton ? `<button class="btn btn-outline" onclick="navigateTo('vendor-matrix')">Full Matrix →</button>` : ''}</div>
    <table class="data-table">
      <thead><tr><th>Vendor ID</th><th>Name</th><th>Category</th>${metrics.map(m => `<th>${escapeHtmlLite(m.label)}</th>`).join('')}<th>Overall</th><th>Status</th></tr></thead>
      <tbody>
        ${paged.items.length ? renderVendorTableRows(paged.items) : emptyTableRow(colSpan)}
      </tbody>
    </table>
    ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorMatrixPage')}
  </div>`;
}

function setVendorMatrixPage(page) {
  vendorMatrixPage = Math.max(1, Number(page) || 1);
  renderPageContent();
}

// ========== WORKFLOW ==========
function getWorkflowSteps() {
  return currentRole === 'gov' ? GOV_WORKFLOW : VENDOR_WORKFLOW;
}

function getWorkflowStepClasses(step, viewId) {
  const classes = ['wf-step'];
  if (step.id < viewId) classes.push('done');
  else if (step.id === viewId) classes.push('active');
  else classes.push('pending');
  return classes.join(' ');
}

function wfDotContent(step, viewId) {
  if (step.id < viewId) return '<i class="fa-solid fa-check"></i>';
  return step.id;
}

function getRegistrationCategories() {
  return CATEGORIES.filter(c => c !== 'All');
}

function ensureWorkflowViewStep() {
  const total = getWorkflowSteps().length;
  if (currentRole === 'gov') {
    if (!currentWorkflowStep || currentWorkflowStep < 1 || currentWorkflowStep > total) {
      const saved = readGovLifecycleSnapshot();
      currentWorkflowStep = saved
        ? Math.max(1, Math.min(total, Number(saved.currentStep) || 1))
        : 1;
    }
    syncGovWorkflowStatuses();
    currentWorkflowStep = getGovResumeStep();
    syncGovWorkflowStatuses();
    return;
  }
  if (currentRole === 'vendor') {
    const progress = getWorkflowProgressStep();
    if (!currentWorkflowStep || currentWorkflowStep < 1 || currentWorkflowStep > total) {
      const saved = readVendorLifecycleSnapshot();
      const cachedStep = saved ? clampVendorWorkflowStep(saved.currentStep) : null;
      currentWorkflowStep = cachedStep || progress;
    }
    return;
  }
  const progress = getWorkflowProgressStep();
  if (!currentWorkflowStep || currentWorkflowStep < 1 || currentWorkflowStep > total) {
    currentWorkflowStep = progress;
  }
}

function renderWorkflow() {
  ensureWorkflowViewStep();
  const steps = getWorkflowSteps();
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const total = steps.length;
  const isGov = currentRole === 'gov';

  return `
    <div class="wf-page-header">
      <p class="wf-page-hint">${isGov ? '14 stages · progress is saved automatically · from Stage 1 you may still jump to Renewal (14)' : '10 stages · progress is saved automatically — you resume where you left off'}</p>
    </div>
    <div class="workflow-timeline" role="tablist" aria-label="Procurement lifecycle stages">
      ${steps.map(s => `<div class="${getWorkflowStepClasses(s, viewId)}" data-step="${s.id}" role="tab" aria-selected="${s.id === viewId}" tabindex="0" onclick="selectWorkflowStep(${s.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWorkflowStep(${s.id})}">
        <div class="wf-dot">${wfDotContent(s, viewId)}</div>
        <div class="wf-label" title="${s.name}">${s.name}</div>
      </div>`).join('')}
    </div>
    <div class="wf-detail" id="wfDetail">
      ${renderWorkflowDetailPanel(steps.find(s => s.id === viewId) || steps[0], progress, total)}
    </div>
    ${isGov ? renderGovWorkflowExtras() : ''}
  `;
}

function renderWorkflowViewBanner(step, progress) {
  if (currentRole === 'gov' && step.id === 14) {
    if (!govSequentialCommitted) {
      return `<div class="wf-view-banner wf-view-banner--past">
        <i class="fa-solid fa-bolt"></i>
        <span>Opened <strong>Renewal (Stage 14)</strong> directly from Stage 1. Finalize renewals here, or return to Stage 1 to continue the sequential lifecycle.</span>
        <button type="button" class="btn btn-outline btn-sm" onclick="selectWorkflowStep(1)">Back to Stage 1</button>
      </div>`;
    }
    if (progress < 14 && currentWorkflowStep === 14) {
      return `<div class="wf-view-banner wf-view-banner--past">
        <i class="fa-solid fa-rotate"></i>
        <span>You are on <strong>Stage 14: Renewal</strong> after completing the sequential flow.</span>
      </div>`;
    }
  }
  if (step.id === progress) return '';
  if (step.id < progress) {
    return `<div class="wf-view-banner wf-view-banner--past">
      <i class="fa-solid fa-pen-to-square"></i>
      <span>Reviewing <strong>Stage ${step.id}</strong> — you can update details here. Your current progress is <strong>Stage ${progress}: ${getWorkflowSteps().find(s => s.id === progress)?.name || ''}</strong>.</span>
      <button type="button" class="btn btn-outline btn-sm" onclick="returnToCurrentWorkflowStep()">Return to current stage</button>
    </div>`;
  }
  // Vendor: future stages are actionable once opened (no preview lock)
  if (currentRole === 'vendor') {
    return `<div class="wf-view-banner wf-view-banner--past">
      <i class="fa-solid fa-circle-info"></i>
      <span>Working on <strong>Stage ${step.id}</strong> — complete the actions on this stage to continue. Your saved progress is Stage ${progress}.</span>
      <button type="button" class="btn btn-outline btn-sm" onclick="returnToCurrentWorkflowStep()">Go to saved progress</button>
    </div>`;
  }
  return `<div class="wf-view-banner wf-view-banner--future">
    <i class="fa-solid fa-eye"></i>
    <span>Previewing <strong>Stage ${step.id}</strong> — complete Stages 1–${progress} before proceeding to this stage.</span>
    <button type="button" class="btn btn-outline btn-sm" onclick="returnToCurrentWorkflowStep()">Go to current stage</button>
  </div>`;
}

function isVendorStageActionComplete(stageId) {
  const s = vendorStageState;
  switch (stageId) {
    case 1: return !!s.completed[1];
    case 2: return !!s.completed[2] || (Array.isArray(s.uploads?.kyc) && s.uploads.kyc.length >= 1);
    case 3: return !!s.completed[3] || !!s.uploads?.approvalLetter || hasSystemApprovalLetter();
    case 4: return !!s.completed[4] || !!s.bid.submitted || !!(typeof vendorBidDvdmsState !== 'undefined' && vendorBidDvdmsState.rows?.length);
    case 5: return !!s.completed[5] || !!s.award.acknowledged;
    case 6: return !!s.completed[6];
    case 7: return !!s.completed[7] || !!s.delivery.updated || (!!(typeof vendorDeliverySyncState !== 'undefined' && vendorDeliverySyncState.rows?.length) && !isManualVendorWithoutDeliveryHistory());
    case 8: return !!s.invoice.submitted;
    case 9: return true;
    case 10: return Array.isArray(s.renewalRequests) && s.renewalRequests.some(r => r.source === 'vendor');
    default: return false;
  }
}

function vendorCanAdvanceFrom(stageId) {
  const progress = getVendorActiveStageId();
  if (stageId < progress) return true;
  if (stageId > progress) return false;
  return isVendorStageActionComplete(stageId);
}

function vendorCanEditStage(stepId, progress) {
  // Any stage you open is actionable — do not lock buttons because earlier stages are incomplete.
  // Only lock after irreversible submit within that stage.
  // Delivery / Invoice stay editable so vendors can Add / Update later consignments & invoices.
  if (stepId === 4 && vendorStageState.bid.submitted) return false;
  return true;
}

function renderWorkflowStepNav(step, total) {
  const isLast = step.id >= total;
  const lifecycleDone = currentRole === 'gov' ? govLifecycleComplete : vendorLifecycleComplete;
  const nextDisabled = !isLast && (
    (currentRole === 'vendor' && !vendorCanAdvanceFrom(step.id)) ||
    (currentRole === 'gov' && step.id === 3 && !govIndentState.saved) ||
    (currentRole === 'gov' && step.id === 4 && !govConsolidationState.approved) ||
    (currentRole === 'gov' && step.id === 5 && !govBudgetState.verified) ||
    (currentRole === 'gov' && step.id === 6 && !govTenderPrepState.finalReady)
  );
  let nextTitle = '';
  if (nextDisabled && currentRole === 'vendor' && step.id < total) {
    nextTitle = validateVendorStageFields(step.id) || 'Complete the required actions on this stage before moving ahead';
  } else if (nextDisabled && currentRole === 'gov' && step.id === 3) {
    nextTitle = 'Review Indent List before proceeding';
  } else if (nextDisabled && currentRole === 'gov' && step.id === 4) {
    nextTitle = 'Review Demand List before proceeding';
  } else if (nextDisabled && currentRole === 'gov' && step.id === 5) {
    nextTitle = 'Complete budget verification before proceeding';
  } else if (nextDisabled && currentRole === 'gov' && step.id === 6) {
    nextTitle = 'Prepare final NIT/RFP after division consensus before proceeding';
  }

  const nextBtn = isLast
    ? (lifecycleDone
      ? `<button type="button" class="btn btn-primary" onclick="openLifecycleCompleteSummary()">
          <i class="fa-solid fa-flag-checkered"></i> View completion summary
        </button>`
      : (() => {
          const vendorBlocked = currentRole === 'vendor' && !isVendorStageActionComplete(10);
          const title = vendorBlocked ? 'Submit at least one renewal request before completing the lifecycle.' : '';
          return `<button type="button" class="btn btn-primary" onclick="completeProcurementLifecycle()" ${vendorBlocked ? 'disabled' : ''} title="${title}">
          <i class="fa-solid fa-flag-checkered"></i> Complete lifecycle
        </button>`;
        })())
    : `<button type="button" class="btn btn-outline" onclick="goWorkflowStep(1)" ${nextDisabled ? 'disabled' : ''} title="${nextTitle}">
        Next Stage <i class="fa-solid fa-arrow-right"></i>
      </button>`;

  return `${isLast && lifecycleDone ? renderLifecycleCompleteBanner() : ''}
  <div class="wf-step-nav">
    <button type="button" class="btn btn-outline" onclick="goWorkflowStep(-1)" ${step.id <= 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-arrow-left"></i> Previous Stage
    </button>
    <span class="wf-step-indicator">Stage ${step.id} of ${total}${lifecycleDone && isLast ? ' · Complete' : ''}</span>
    ${nextBtn}
  </div>`;
}

function renderLifecycleCompleteBanner() {
  const label = currentRole === 'gov' ? 'Government procurement lifecycle' : 'Vendor lifecycle';
  return `<div class="wf-lifecycle-complete">
    <div class="wf-lifecycle-complete-icon"><i class="fa-solid fa-circle-check"></i></div>
    <div>
      <strong>${label} completed</strong>
      <p>All stages are finished. Payment and closure records are available for audit. You can review any earlier stage or return to the dashboard.</p>
    </div>
    <button type="button" class="btn btn-outline btn-sm" onclick="navigateTo('dashboard', true)">Go to dashboard</button>
  </div>`;
}

function completeProcurementLifecycle() {
  if (currentRole === 'gov') {
    govLifecycleComplete = true;
    syncGovWorkflowStatuses();
    persistGovLifecycle();
  } else {
    if (!isVendorStageActionComplete(10)) {
      showWfAlert('Submit at least one renewal request before completing the lifecycle.');
      return;
    }
    vendorLifecycleComplete = true;
    const total = getWorkflowSteps().length;
    for (let i = 1; i <= total; i++) vendorStageState.completed[i] = true;
    syncVendorWorkflowStatuses();
    persistVendorLifecycle();
  }
  refreshWorkflowUI();
  openLifecycleCompleteSummary();
}

function openLifecycleCompleteSummary() {
  const isGov = currentRole === 'gov';
  openModal(isGov ? 'Procurement lifecycle complete' : 'Vendor lifecycle complete', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-flag-checkered"></i></div>
      <h4>${isGov ? 'End-to-end procurement cycle closed' : 'Vendor journey completed'}</h4>
      <p>${isGov
        ? 'Need identification through payment is complete. Contract closure and payment records remain available for review and audit.'
        : 'Registration through renewal is complete. You can revisit any stage or return to your dashboard.'}</p>
      <div class="modal-inline-actions" style="justify-content:center;margin-top:1rem">
        <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-list-check"></i> Stay on final stage</button>
        <button type="button" class="btn btn-primary" onclick="closeModal(); navigateTo('dashboard', true);"><i class="fa-solid fa-gauge-high"></i> Go to dashboard</button>
      </div>
    </div>
  `);
}

function renderWorkflowChecklist(step) {
  // Dedicated stage panels replace checklist for government lifecycle
  if (currentRole === 'gov') return '';
  const checklist = VENDOR_STAGE_CHECKLIST[step.id];
  if (!checklist) return '';
  return `<div class="wf-checklist">
    <h4><i class="fa-solid fa-list-check"></i> Stage Checklist</h4>
    <ul>${checklist.map(item => `<li>${item}</li>`).join('')}</ul>
  </div>`;
}

/** Simulated API fetch for Need Identification (Stage 1) */
function getNeedIdentificationData() {
  const base = typeof NEED_IDENTIFICATION_API !== 'undefined' ? NEED_IDENTIFICATION_API : null;
  if (!base) return null;
  // Light category-aware note for prototype; payload shape stays API-like
  const cat = currentCategory;
  return {
    ...base,
    meta: {
      ...base.meta,
      categoryFilter: cat,
      displayNote: cat === 'All'
        ? 'Showing consolidated requirements across all categories'
        : `Filtered view emphasis: ${cat} formulary & related SKUs`
    }
  };
}

function needStatusBadge(status) {
  const map = {
    Adequate: 'success',
    Low: 'warning',
    Critical: 'danger',
    Attention: 'warning',
    Elevated: 'warning',
    High: 'danger',
    Medium: 'info',
    Synced: 'success',
    'Not synced': 'danger',
    Failed: 'danger',
    'Action Required': 'warning',
    Verified: 'success',
    Available: 'success',
    Tracked: 'info',
    'Action Ready': 'warning',
    Surplus: 'success',
    Recommended: 'success',
    Review: 'warning',
    Hold: 'muted',
    'On Track': 'success',
    'At Risk': 'danger',
    'High Confidence': 'success',
    'Medium Confidence': 'info',
    Approved: 'success',
    'Not Approved': 'danger',
    'Under Review': 'warning',
    Partial: 'warning',
    'Pending review': 'warning',
    'In progress': 'info',
    Done: 'success',
    Pending: 'muted',
    Published: 'info',
    'Draft prepared': 'warning',
    'Under checker review': 'warning',
    'Under Evaluation': 'info',
    Awarded: 'success',
    'Consensus uploaded': 'success',
    'Under review': 'warning',
    'Evaluation complete': 'success',
    'Under evaluation': 'info',
    'Technical screening': 'warning',
    'Agreement signed': 'success',
    'NOA issued': 'info',
    'Awaiting L1 lock': 'warning',
    'Clarification sought': 'warning',
    'Not approved': 'danger',
    'Award active': 'success',
    'PBG pending': 'warning',
    'LOA issued': 'info',
    'Awaiting award': 'muted',
    'PO issued': 'success',
    'Delivery scheduled': 'success',
    'Vendor notified': 'info',
    'Draft PO': 'warning',
    'Pending contract': 'warning',
    Notified: 'success',
    'Not sent': 'muted',
    Accepted: 'success',
    'Under inspection': 'info',
    'Partial receipt': 'warning',
    'Awaiting delivery': 'muted',
    'Rejected / held': 'danger',
    Passed: 'success',
    Failed: 'danger',
    Matched: 'success',
    'Under match': 'info',
    Mismatch: 'danger',
    'Awaiting GRN': 'muted',
    Rejected: 'danger',
    'On hold': 'warning',
    Paid: 'success',
    'In process': 'info',
    'Awaiting invoice': 'muted',
    Received: 'success',
    Acknowledged: 'success',
    Cleared: 'success',
    'Not started': 'muted',
    'Not due yet': 'muted',
    Submitted: 'info',
    'Pending Review': 'warning',
    'Clarification Sought': 'warning',
    Routine: 'muted'
  };
  return map[status] || 'info';
}

function renderApiSyncBadge(status) {
  const synced = status === 'Synced';
  return `<span class="badge badge-${synced ? 'success' : 'danger'}">
    <i class="fa-solid ${synced ? 'fa-check-double' : 'fa-triangle-exclamation'}"></i>
    ${synced ? 'Synced' : 'Not synced'}
  </span>`;
}

function getStockCheckData() {
  const base = typeof STOCK_CHECK_API !== 'undefined' ? STOCK_CHECK_API : null;
  if (!base) return null;
  const cat = currentCategory;
  return {
    ...base,
    meta: {
      ...base.meta,
      categoryFilter: cat,
      displayNote: cat === 'All'
        ? 'Verify existing warehouse stock, other locations, approved open POs, and redistributable inventory'
        : `Stock check emphasis: ${cat} SKUs across warehouse, facilities, open POs & redistribution`
    }
  };
}

function renderStockCheckStage(canEdit = true) {
  const data = getStockCheckData();
  if (!data) {
    return `<div class="need-api-empty"><i class="fa-solid fa-plug-circle-xmark"></i><p>Stock information could not be loaded right now. Please try Re-sync from API, or contact support if this continues.</p></div>`;
  }
  const { warehouse, otherLocations, openPos, redistributable } = data;
  const warehouseRows = applyStagePeriodFilter(warehouse.rows || [], govStockCheckState, 'date');
  const otherRows = applyStagePeriodFilter(otherLocations.rows || [], govStockCheckState, 'date');
  const openPoRows = applyStagePeriodFilter(openPos.rows || [], govStockCheckState, 'date');
  const redistributeRows = applyStagePeriodFilter(redistributable.rows || [], govStockCheckState, 'date');
  const warehousePaged = paginateItems(warehouseRows, govStockCheckState.warehousePage, 10);
  const otherPaged = paginateItems(otherRows, govStockCheckState.otherPage, 10);
  const openPoPaged = paginateItems(openPoRows, govStockCheckState.openpoPage, 10);
  const redistributePaged = paginateItems(redistributeRows, govStockCheckState.redistributePage, 10);
  govStockCheckState.warehousePage = warehousePaged.page;
  govStockCheckState.otherPage = otherPaged.page;
  govStockCheckState.openpoPage = openPoPaged.page;
  govStockCheckState.redistributePage = redistributePaged.page;
  const disabled = canEdit ? '' : ' disabled';
  const periodLabel = getWfPeriodFilterLabel(govStockCheckState);
  const blocks = [
    { key: 'warehouse', icon: 'fa-warehouse', color: 'blue', data: warehouse,
      metrics: [
        { label: 'Sites verified', value: warehouse.sites },
        { label: 'SKUs verified', value: warehouse.skusVerified },
        { label: 'Surplus value', value: warehouse.surplusValue },
        { label: 'Deficit SKUs', value: warehouse.deficitSkus }
      ] },
    { key: 'other', icon: 'fa-hospital', color: 'teal', data: otherLocations,
      metrics: [
        { label: 'Surplus facilities', value: otherLocations.facilitiesWithSurplus },
        { label: 'Transferable SKUs', value: otherLocations.transferableSkus },
        { label: 'Est. transfer value', value: otherLocations.estTransferValue },
        { label: 'Lead time', value: otherLocations.leadDays + ' days' }
      ] },
    { key: 'openpo', icon: 'fa-file-invoice', color: 'orange', data: openPos,
      metrics: [
        { label: 'Open POs', value: openPos.openCount },
        { label: 'Pipeline value', value: openPos.pipelineValue },
        { label: 'Arriving ≤7 days', value: openPos.arriving7d },
        { label: 'At risk / delayed', value: openPos.delayed }
      ] },
    { key: 'redistribute', icon: 'fa-shuffle', color: 'red', data: redistributable,
      metrics: [
        { label: 'Candidates', value: redistributable.candidates },
        { label: 'Recommended now', value: redistributable.recommendedNow },
        { label: 'Est. savings', value: redistributable.estSavings },
        { label: 'ML confidence', value: redistributable.confidence }
      ] }
  ];

  return `<div class="need-api stock-check-api">
    ${renderWorkflowPeriodFilter('stock', govStockCheckState)}

    <div class="need-metric-grid">
      ${blocks.map(b => `
        <button type="button" class="need-metric-card need-metric-card--${b.color}" onclick="scrollToStockSection('${b.key}')">
          <div class="need-metric-head">
            <span class="need-metric-icon"><i class="fa-solid ${b.icon}"></i></span>
            <span class="badge badge-${needStatusBadge(b.data.status)}">${b.data.status}</span>
          </div>
          <h4>${b.data.label}</h4>
          <p>${b.data.summary}</p>
          <div class="need-metric-stats">
            ${b.metrics.map(m => `<div><span>${m.label}</span><strong>${m.value}</strong></div>`).join('')}
          </div>
        </button>`).join('')}
    </div>

    <div class="need-section" id="stock-sec-warehouse">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-warehouse"></i> ${warehouse.label} — Item / Facility</h4>
        <span class="meta-chip">Release vs hold recommendation</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Facility</th><th>Item</th><th>On hand</th><th>Usable</th><th>Recommendation</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${warehousePaged.items.length ? warehousePaged.items.map((r, localI) => {
              const i = (warehousePaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openStockCheckRowDetail('warehouse',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openStockCheckRowDetail('warehouse',${i})}">
              <td><strong>${r.facility}</strong></td><td>${r.item}</td>
              <td>${r.onHand}</td><td>${r.usable}</td>
              <td>${r.recommendation}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No warehouse rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(warehousePaged.page, warehousePaged.totalPages, warehousePaged.total, warehousePaged.from, warehousePaged.to, 'setStockWarehousePage')}
    </div>

    <div class="need-section" id="stock-sec-other">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-hospital"></i> ${otherLocations.label} — Facility-wise transfer</h4>
        <span class="meta-chip">Inter-facility redistribution candidates</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>From</th><th>To</th><th>Item</th><th>Qty</th><th>Cover gain</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${otherPaged.items.length ? otherPaged.items.map((r, localI) => {
              const i = (otherPaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openStockCheckRowDetail('other',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openStockCheckRowDetail('other',${i})}">
              <td><strong>${r.from}</strong></td><td>${r.to}</td><td>${r.item}</td>
              <td>${r.qty}</td><td>${r.coverGain}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No transfer rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(otherPaged.page, otherPaged.totalPages, otherPaged.total, otherPaged.from, otherPaged.to, 'setStockOtherPage')}
    </div>

    <div class="need-section" id="stock-sec-openpo">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-file-invoice"></i> ${openPos.label}</h4>
        <span class="meta-chip">Offset fresh indent with in-flight supply</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>PO</th><th>Vendor</th><th>Item</th><th>Facility</th><th>ETA</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${openPoPaged.items.length ? openPoPaged.items.map((r, localI) => {
              const i = (openPoPaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openStockCheckRowDetail('openpo',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openStockCheckRowDetail('openpo',${i})}">
              <td><strong>${r.po}</strong></td><td>${r.vendor}</td><td>${r.item}</td>
              <td>${r.facility}</td><td>${r.eta}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No open PO rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(openPoPaged.page, openPoPaged.totalPages, openPoPaged.total, openPoPaged.from, openPoPaged.to, 'setStockOpenPoPage')}
    </div>

    <div class="need-section" id="stock-sec-redistribute">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-shuffle"></i> ${redistributable.label} — Outcomes</h4>
        <span class="meta-chip">Est. savings ${redistributable.estSavings} · Confidence ${redistributable.confidence}</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Item</th><th>From</th><th>To</th><th>Qty</th><th>Savings</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${redistributePaged.items.length ? redistributePaged.items.map((r, localI) => {
              const i = (redistributePaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openStockCheckRowDetail('redistribute',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openStockCheckRowDetail('redistribute',${i})}">
              <td><strong>${r.item}</strong></td><td>${r.from}</td><td>${r.to}</td>
              <td>${r.qty}</td><td>${r.savings}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No redistributable rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(redistributePaged.page, redistributePaged.totalPages, redistributePaged.total, redistributePaged.from, redistributePaged.to, 'setStockRedistributePage')}
    </div>

    <div class="wf-actions mt-2">
      <button class="btn btn-outline" onclick="refreshStockCheckApi()"${disabled}><i class="fa-solid fa-arrows-rotate"></i> Re-sync from API</button>
    </div>
  </div>`;
}

function scrollToStockSection(key) {
  const map = { warehouse: 'warehouse', other: 'other', openpo: 'openpo', redistribute: 'redistribute' };
  document.getElementById(`stock-sec-${map[key] || key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openStockCheckRowDetail(section, index) {
  const data = getStockCheckData();
  if (!data) return;
  const i = Number(index);
  let title = 'Stock Check Detail';
  let body = '';

  if (section === 'warehouse') {
    const r = applyStagePeriodFilter(data.warehouse.rows || [], govStockCheckState, 'date')[i];
    if (!r) return;
    title = `${r.item} — ${r.facility}`;
    body = `<div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Warehouse verification outcome from <strong>DVDMS</strong>.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>On hand</span><strong>${r.onHand}</strong></div>
        <div class="tender-stat"><span>Usable</span><strong>${r.usable}</strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Status since</span><strong>${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Recommendation</h4>
          ${followUpActionButton('stock', 'warehouse', i)}
        </div>
        <div class="data-table-wrap" style="margin-bottom:0.75rem">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>Facility</td><td><strong>${r.facility}</strong></td></tr>
              <tr><td>Item</td><td>${r.item}</td></tr>
              <tr><td>Reorder</td><td>${r.reorder}</td></tr>
              <tr><td>Status since</td><td><strong>${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span> · ${r.recommendation}</p>
        <p class="report-footnote mt-2"><i class="fa-solid fa-circle-info"></i> Prefer warehouse release / redistribution before raising a fresh indent for this SKU.</p>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>`;
  } else if (section === 'other') {
    const r = applyStagePeriodFilter(data.otherLocations.rows || [], govStockCheckState, 'date')[i];
    if (!r) return;
    title = `Transfer — ${r.item}`;
    body = `<div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Inter-facility redistribution candidate ranked by cover-day gain and surplus margin.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>Qty</span><strong>${r.qty}</strong></div>
        <div class="tender-stat"><span>Cover gain</span><strong>${r.coverGain}</strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Status since</span><strong>${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Recommendation</h4>
          ${followUpActionButton('stock', 'other', i)}
        </div>
        <div class="data-table-wrap" style="margin-bottom:0.75rem">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>From</td><td><strong>${r.from}</strong></td></tr>
              <tr><td>To</td><td><strong>${r.to}</strong></td></tr>
              <tr><td>Item</td><td>${r.item}</td></tr>
              <tr><td>Status since</td><td><strong>${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p>${r.recommendation}</p>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>`;
  } else if (section === 'openpo') {
    const r = applyStagePeriodFilter(data.openPos.rows || [], govStockCheckState, 'date')[i];
    if (!r) return;
    title = `${r.po} — ${r.item}`;
    body = `<div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Approved open PO that can offset fresh procurement demand.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>Qty</span><strong>${r.qty}</strong></div>
        <div class="tender-stat"><span>ETA</span><strong>${r.eta}</strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Status since</span><strong>${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Recommendation</h4>
          ${followUpActionButton('stock', 'openpo', i)}
        </div>
        <div class="data-table-wrap" style="margin-bottom:0.75rem">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>PO</td><td><strong>${r.po}</strong></td></tr>
              <tr><td>Vendor</td><td>${r.vendor}</td></tr>
              <tr><td>Facility</td><td>${r.facility}</td></tr>
              <tr><td>Status since</td><td><strong>${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p>${r.recommendation}</p>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>`;
  } else if (section === 'redistribute') {
    const r = applyStagePeriodFilter(data.redistributable.rows || [], govStockCheckState, 'date')[i];
    if (!r) return;
    title = `Redistribute — ${r.item}`;
    body = `<div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Allocation proposal to fulfill demand without new tender.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>Qty</span><strong>${r.qty}</strong></div>
        <div class="tender-stat"><span>Savings</span><strong>${r.savings}</strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Status since</span><strong class="cell-date">${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Outcome</h4>
          ${followUpActionButton('stock', 'redistribute', i)}
        </div>
        <div class="data-table-wrap" style="margin-bottom:0.75rem">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>From</td><td><strong>${r.from}</strong></td></tr>
              <tr><td>To</td><td><strong>${r.to}</strong></td></tr>
              <tr><td>Item</td><td>${r.item}</td></tr>
              <tr><td>Status since</td><td><strong class="cell-date">${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p>${r.recommendation}</p>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        ${followUpActionButton('stock', 'redistribute', i)}
      </div>
    </div>`;
  } else {
    return;
  }

  openModal(title, body, { wide: true });
}

function refreshStockCheckApi() {
  const btn = document.querySelector('.stock-check-api .need-api-banner-actions .btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing…';
  }
  setTimeout(() => {
    // Prototype: occasional sync failure so users can see the "Not synced" error state
    const failed = Math.random() < 0.28;
    if (typeof STOCK_CHECK_API !== 'undefined') {
      if (failed) {
        STOCK_CHECK_API.meta.status = 'Not synced';
      } else {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        STOCK_CHECK_API.meta.lastSynced =
          `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} IST`;
        STOCK_CHECK_API.meta.status = 'Synced';
      }
    }
    refreshWorkflowUI();
    if (failed) {
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Stock status could not be updated</h4>
          <p>We could not refresh warehouse stock, other locations, open purchase orders, or redistribution suggestions right now. The banner shows <strong>Not synced</strong>. Please try again in a moment.</p>
        </div>
      `);
      return;
    }
    openModal('Data refreshed', `
      <div class="sync-success-msg">
        <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h4>Latest stock status is updated successfully</h4>
        <p>Warehouse stock, other facility locations, open purchase orders, and redistribution suggestions have been updated so you can verify availability before raising a new indent.</p>
      </div>
    `);
  }, 650);
}

function setIndentMode(mode) {
  if (mode !== 'manual' && mode !== 'automated') return;
  govIndentState.mode = mode;
  if (mode === 'manual') {
    refreshWorkflowUI();
    openManualIndentModal(true);
    return;
  }
  if (mode === 'automated' && govIndentState.automated.status === 'idle') {
    govIndentState.automated.status = 'idle';
  }
  refreshWorkflowUI();
}

function buildAutomatedIndentLines() {
  const need = typeof NEED_IDENTIFICATION_API !== 'undefined' ? NEED_IDENTIFICATION_API : null;
  const stock = typeof STOCK_CHECK_API !== 'undefined' ? STOCK_CHECK_API : null;
  const lines = [];
  const today = typeof formatDateDMY === 'function' ? formatDateDMY(APP_TODAY) : '03-09-2026';

  (need?.gapAnalysis?.rows || []).forEach((r, i) => {
    if (!/fresh|tender|rate contract|top-up/i.test(r.action || '')) return;
    lines.push({
      id: `IND-AUTO-${String(i + 1).padStart(2, '0')}`,
      item: r.item,
      quantity: r.gap,
      unit: 'Packs',
      source: 'Need Identification · Gap Analysis',
      reason: r.action,
      facility: 'Bhopal Division (consolidated)',
      district: 'Bhopal',
      category: currentCategory === 'All' ? 'Drugs' : currentCategory,
      priority: /fresh tender/i.test(r.action) ? 'High' : 'Medium',
      status: 'Submitted',
      date: r.date || today,
      requiredBy: today,
      raisedBy: 'System — AI/ML indent',
      approvingAuthority: 'CMO / Competent Authority',
      justification: `Gap residual: ${r.action}`,
      remarks: ''
    });
  });

  (stock?.warehouse?.rows || []).forEach((r, i) => {
    if (r.status !== 'Low' && r.status !== 'Critical') return;
    lines.push({
      id: `IND-STK-${String(i + 1).padStart(2, '0')}`,
      item: r.item,
      quantity: r.reorder,
      unit: 'Packs',
      source: 'Stock Check · Warehouse',
      reason: r.recommendation,
      facility: r.facility,
      district: 'Bhopal',
      category: currentCategory === 'All' ? 'Drugs' : currentCategory,
      priority: r.status === 'Critical' ? 'Critical' : 'High',
      status: 'Under review',
      date: r.date || today,
      requiredBy: today,
      raisedBy: 'System — AI/ML indent',
      approvingAuthority: 'CMO / Competent Authority',
      justification: r.recommendation,
      remarks: ''
    });
  });

  if (!lines.length) {
    lines.push(
      { id: 'IND-AUTO-01', item: 'Paracetamol 500mg Tab', quantity: '6.3 L packs', unit: 'Packs', source: 'Automated', reason: 'Fresh tender', facility: 'Bhopal Division (consolidated)', district: 'Bhopal', category: 'Drugs', priority: 'High', status: 'Submitted', date: today, requiredBy: '20-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Gap residual after stock netting.', remarks: '' },
      { id: 'IND-AUTO-02', item: 'IV Normal Saline 500ml', quantity: '1.3 L units', unit: 'Units', source: 'Automated', reason: 'Fresh tender', facility: 'Bhopal Division (consolidated)', district: 'Bhopal', category: 'Drugs', priority: 'High', status: 'Submitted', date: today, requiredBy: '18-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Gap residual after stock netting.', remarks: '' }
    );
  }
  return lines;
}

function runAutomatedIndentProcess() {
  govIndentState.mode = 'automated';
  govIndentState.saved = false;
  govIndentState.automated.status = 'running';
  refreshWorkflowUI();

  setTimeout(() => {
    const lines = buildAutomatedIndentLines();
    govIndentState.automated.lines = lines;
    govIndentState.automated.status = 'ready';
    govIndentState.automated.generatedAt = formatDateDMY(APP_TODAY) + ' ' +
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    govIndentState.saved = true;
    govIndentState.indentId = govIndentState.indentId || `IND-AUTO-${APP_TODAY.replace(/-/g, '').slice(2)}`;
    lines.forEach(l => {
      if (!govIndentState.listItems.some(x => x.id === l.id)) {
        govIndentState.listItems.unshift({ ...l, source: l.source || 'Automated' });
      }
    });
    syncGovWorkflowStatuses();
    persistGovLifecycle();
    refreshWorkflowUI();
    openModal('Automated indent ready', `
      <div class="sync-success-msg">
        <div class="sync-success-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <h4>Indent lines prepared from prior stages</h4>
        <p>The model proposed <strong>${lines.length}</strong> indent line(s). They are now in the Indent List — open any row for details / follow-up.</p>
      </div>
    `);
  }, 900);
}

function getIndentListRows() {
  const seed = typeof INDENT_LIST_SEED !== 'undefined' ? INDENT_LIST_SEED : [];
  const extra = govIndentState.listItems || [];
  const seen = new Set();
  const rows = [];
  [...extra, ...seed].forEach(r => {
    if (!r?.id || seen.has(r.id)) return;
    seen.add(r.id);
    rows.push(r);
  });
  return applyStagePeriodFilter(rows, govIndentState, 'date');
}

function getIndentRowById(id) {
  return getIndentListRows().find(r => r.id === id)
    || (govIndentState.listItems || []).find(r => r.id === id)
    || (typeof INDENT_LIST_SEED !== 'undefined' ? INDENT_LIST_SEED.find(r => r.id === id) : null);
}

function datePickerHTML(id, value, labelHtml, disabled = false) {
  const shown = value || 'Select date';
  return `<div class="form-group">
    <label>${labelHtml}</label>
    <div class="date-picker" data-datepicker-id="${id}">
      <button type="button" class="date-picker-trigger" id="${id}Trigger" ${disabled ? 'disabled' : ''} onclick="toggleDatePicker('${id}')">
        <i class="fa-solid fa-calendar-days"></i>
        <span class="date-picker-value${value ? '' : ' is-placeholder'}" id="${id}Value">${shown}</span>
        <i class="fa-solid fa-chevron-down"></i>
      </button>
      <input type="hidden" id="${id}" value="${value || ''}">
      <div class="date-picker-panel" id="${id}Panel" hidden></div>
    </div>
  </div>`;
}

function positionDatePickerPanel(id) {
  const trigger = document.getElementById(`${id}Trigger`);
  const panel = document.getElementById(`${id}Panel`);
  if (!trigger || !panel) return;
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, 280);
  let left = rect.left;
  if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
  let top = rect.bottom + 6;
  panel.style.position = 'fixed';
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.width = `${width}px`;
  panel.style.zIndex = '10060';
  requestAnimationFrame(() => {
    const h = panel.offsetHeight || 280;
    if (top + h > window.innerHeight - 12) {
      panel.style.top = `${Math.max(12, rect.top - h - 6)}px`;
    }
  });
}

function toggleDatePicker(id) {
  const panel = document.getElementById(`${id}Panel`);
  if (!panel) return;
  const opening = panel.hasAttribute('hidden');
  document.querySelectorAll('.date-picker-panel').forEach(p => p.setAttribute('hidden', ''));
  if (!opening) return;
  const current = document.getElementById(id)?.value || '';
  let y = 2026, m = 8;
  if (/^\d{2}-\d{2}-\d{4}$/.test(current)) {
    const parts = current.split('-').map(Number);
    y = parts[2];
    m = parts[1] - 1;
  } else if (APP_TODAY) {
    const dt = parseISODate(APP_TODAY);
    if (dt) { y = dt.getFullYear(); m = dt.getMonth(); }
  }
  datePickerState = { id, viewYear: y, viewMonth: m };
  renderDatePickerPanel(id);
  panel.removeAttribute('hidden');
  positionDatePickerPanel(id);
}

function shiftDatePickerMonth(delta, ev) {
  if (ev) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (_) { /* ignore */ }
  }
  if (!datePickerState.id) return;
  let { viewYear: y, viewMonth: m } = datePickerState;
  m += delta;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  datePickerState.viewYear = y;
  datePickerState.viewMonth = m;
  renderDatePickerPanel(datePickerState.id);
  positionDatePickerPanel(datePickerState.id);
}

function renderDatePickerPanel(id) {
  const panel = document.getElementById(`${id}Panel`);
  if (!panel) return;
  const y = datePickerState.viewYear;
  const m = datePickerState.viewMonth;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const selected = document.getElementById(id)?.value || '';
  const dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += `<span class="date-picker-day is-empty"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const val = `${String(d).padStart(2, '0')}-${String(m + 1).padStart(2, '0')}-${y}`;
    const isSel = val === selected;
    cells += `<button type="button" class="date-picker-day${isSel ? ' is-selected' : ''}" onclick="selectDatePickerDay('${id}','${val}')">${d}</button>`;
  }
  panel.innerHTML = `
    <div class="date-picker-head">
      <button type="button" class="date-picker-nav" onclick="shiftDatePickerMonth(-1, event)" aria-label="Previous month"><i class="fa-solid fa-chevron-left"></i></button>
      <strong>${monthNames[m]} ${y}</strong>
      <button type="button" class="date-picker-nav" onclick="shiftDatePickerMonth(1, event)" aria-label="Next month"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="date-picker-dow">${dow.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="date-picker-grid">${cells}</div>
  `;
  // Keep month navigation from bubbling as an "outside" click after the panel re-renders
  if (!panel.dataset.navBound) {
    panel.dataset.navBound = '1';
    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.addEventListener('mousedown', (e) => e.stopPropagation());
  }
}

function selectDatePickerDay(id, value) {
  const input = document.getElementById(id);
  const label = document.getElementById(`${id}Value`);
  if (input) input.value = value;
  if (label) {
    label.textContent = value;
    label.classList.remove('is-placeholder');
  }
  document.getElementById(`${id}Panel`)?.setAttribute('hidden', '');
}

function isDatePickerInteraction(e) {
  if (e.target?.closest?.('.date-picker') || e.target?.closest?.('.date-picker-panel')) return true;
  // Month arrows re-render the panel mid-click (target detaches). Use composedPath so we don't treat it as outside.
  if (typeof e.composedPath === 'function') {
    return e.composedPath().some((n) =>
      n && n.classList && (
        n.classList.contains('date-picker') ||
        n.classList.contains('date-picker-panel') ||
        n.classList.contains('date-picker-nav') ||
        n.classList.contains('date-picker-day') ||
        n.classList.contains('date-picker-head')
      )
    );
  }
  return false;
}

document.addEventListener('click', (e) => {
  if (isDatePickerInteraction(e)) return;
  document.querySelectorAll('.date-picker-panel').forEach(p => p.setAttribute('hidden', ''));
});

function renderManualIndentFormFields(canEdit = true) {
  const disabled = canEdit ? '' : ' disabled';
  const m = govIndentState.manual;
  const catOptions = (typeof CATEGORIES !== 'undefined' ? CATEGORIES.filter(c => c !== 'All') : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others']);
  return `<div class="form-grid wf-form-grid indent-form-grid">
    <div class="form-group"><label>${reqLabel('Facility / Store')}</label><input id="indentFacility" type="text" value="${m.facility}" placeholder="e.g. Gandhi Medical College"${disabled ? ' readonly' : ''}></div>
    ${customSelectHTML('District', 'indentDistrict', ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Rewa'], m.district, true)}
    ${customSelectHTML('Category', 'indentCategory', catOptions, m.category || 'Drugs', true)}
    <div class="form-group"><label>${reqLabel('Item / SKU name')}</label><input id="indentItem" type="text" value="${m.itemName}" placeholder="e.g. Paracetamol 500mg Tab"${disabled ? ' readonly' : ''}></div>
    <div class="form-group"><label>${reqLabel('Quantity')}</label><input id="indentQty" type="text" value="${m.quantity}" placeholder="e.g. 6.3 L"${disabled ? ' readonly' : ''}></div>
    ${customSelectHTML('Unit', 'indentUnit', ['Packs', 'Units', 'Vials', 'Pairs', 'Kits', 'Bottles'], m.unit, true)}
    ${customSelectHTML('Priority', 'indentPriority', ['Critical', 'High', 'Medium', 'Routine'], m.priority, true)}
    ${datePickerHTML('indentRequiredBy', m.requiredBy, reqLabel('Required by (DD-MM-YYYY)'), !canEdit)}
    <div class="form-group"><label>${reqLabel('Raised by')}</label><input id="indentRaisedBy" type="text" value="${m.raisedBy}"${disabled ? ' readonly' : ''}></div>
    <div class="form-group"><label>${reqLabel('Approving authority')}</label><input id="indentAuthority" type="text" value="${m.approvingAuthority}"${disabled ? ' readonly' : ''}></div>
    <div class="form-group full"><label>${reqLabel('Justification (why stock / open PO cannot meet need)')}</label>
      <textarea id="indentJustification" rows="3" placeholder="State stock search outcome, open PO status, and clinical / programme urgency…"${disabled ? ' readonly' : ''}>${m.justification}</textarea>
    </div>
    <div class="form-group full"><label>Remarks (optional)</label>
      <textarea id="indentRemarks" rows="2" placeholder="Additional notes for CMO / consolidation cell…"${disabled ? ' readonly' : ''}>${m.remarks}</textarea>
    </div>
  </div>`;
}

function openManualIndentModal(canEdit = true) {
  const disabled = canEdit ? '' : ' disabled';
  openModal('Manual Indent — Form IND-01', `
    <div class="indent-modal-form">
      <p class="consol-detail-lead" style="margin-top:0">Raise indent only when stock / open PO cannot meet requirement. Fields marked * are mandatory.</p>
      ${renderManualIndentFormFields(canEdit)}
      <div class="follow-up-actions" style="margin-top:1rem">
        <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
        <div class="follow-up-actions-right">
          <button type="button" class="btn btn-primary" onclick="saveManualIndent()"${disabled}><i class="fa-solid fa-floppy-disk"></i> Save indent</button>
        </div>
      </div>
    </div>
  `, { wide: true, large: true });
  initCustomSelects();
}

function captureManualIndentForm() {
  const m = govIndentState.manual;
  m.facility = document.getElementById('indentFacility')?.value?.trim() || m.facility;
  m.district = (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('indentDistrict') : null) || m.district;
  m.category = (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('indentCategory') : null) || m.category;
  m.itemName = document.getElementById('indentItem')?.value?.trim() || '';
  m.quantity = document.getElementById('indentQty')?.value?.trim() || '';
  m.unit = (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('indentUnit') : null) || m.unit;
  m.priority = (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('indentPriority') : null) || m.priority;
  m.requiredBy = document.getElementById('indentRequiredBy')?.value?.trim() || '';
  m.justification = document.getElementById('indentJustification')?.value?.trim() || '';
  m.raisedBy = document.getElementById('indentRaisedBy')?.value?.trim() || m.raisedBy;
  m.approvingAuthority = document.getElementById('indentAuthority')?.value?.trim() || m.approvingAuthority;
  m.remarks = document.getElementById('indentRemarks')?.value?.trim() || '';
}

function saveManualIndent() {
  captureManualIndentForm();
  const m = govIndentState.manual;
  if (!m.facility || !m.district || !m.category || !m.itemName || !m.quantity || !m.unit || !m.priority || !m.requiredBy || !m.justification || !m.raisedBy || !m.approvingAuthority) {
    showWfAlert('Please fill all mandatory fields marked with * before saving the indent.');
    return;
  }
  const id = `IND-MP-${APP_TODAY.replace(/-/g, '').slice(2)}-${String(Math.floor(Math.random() * 90) + 10)}`;
  govIndentState.mode = 'manual';
  govIndentState.saved = true;
  govIndentState.indentId = id;
  govIndentState.listItems.unshift({
    id,
    item: m.itemName,
    quantity: m.quantity,
    unit: m.unit,
    facility: m.facility,
    district: m.district,
    category: m.category,
    priority: m.priority,
    status: 'Submitted',
    source: 'Manual',
    date: formatDateDMY(APP_TODAY),
    requiredBy: m.requiredBy,
    raisedBy: m.raisedBy,
    approvingAuthority: m.approvingAuthority,
    justification: m.justification,
    remarks: m.remarks || ''
  });
  syncGovWorkflowStatuses();
  persistGovLifecycle();
  closeModal();
  refreshWorkflowUI();
  setTimeout(() => {
    openModal('Indent saved', `
      <div class="sync-success-msg">
        <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h4>Manual indent saved successfully</h4>
        <p>Indent <strong>${id}</strong> for <strong>${m.itemName}</strong> is now in the Indent List.</p>
      </div>
    `);
  }, 80);
}

function openIndentRowDetail(indentId) {
  const r = getIndentRowById(indentId);
  if (!r) {
    showWfAlert('Indent record not found.');
    return;
  }
  openModal(`${r.id} — ${r.item}`, `
    <div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Store indent details for review and follow-up.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>Quantity</span><strong>${r.quantity}</strong></div>
        <div class="tender-stat"><span>Priority</span><strong><span class="badge badge-${needStatusBadge(r.priority)}">${r.priority}</span></strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Status since</span><strong>${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Indent details</h4>
          <button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('indent','row','${r.id}')">
            <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
          </button>
        </div>
        <div class="data-table-wrap">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>Indent ID</td><td><strong>${r.id}</strong></td></tr>
              <tr><td>Item</td><td>${r.item}</td></tr>
              <tr><td>Facility</td><td>${r.facility}</td></tr>
              <tr><td>District</td><td>${r.district || '—'}</td></tr>
              <tr><td>Category</td><td>${r.category || '—'}</td></tr>
              <tr><td>Source</td><td>${r.source || '—'}</td></tr>
              <tr><td>Required by</td><td>${r.requiredBy || '—'}</td></tr>
              <tr><td>Raised by</td><td>${r.raisedBy || '—'}</td></tr>
              <tr><td>Approving authority</td><td>${r.approvingAuthority || '—'}</td></tr>
              <tr><td>Justification</td><td>${r.justification || r.reason || '—'}</td></tr>
              <tr><td>Remarks</td><td>${r.remarks || '—'}</td></tr>
              <tr><td>Status since</td><td><strong>${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>
  `, { wide: true });
}

function renderIndentRaisedStage(canEdit = true) {
  // Stage 3 is list-only — seed / synced indents satisfy progress without manual/auto raise UI.
  if (!govIndentState.saved) {
    govIndentState.saved = true;
    if (!govIndentState.indentId) govIndentState.indentId = 'IND-LIST';
  }
  const rows = getIndentListRows();
  const periodLabel = getWfPeriodFilterLabel(govIndentState);
  const indentPaged = paginateItems(rows, govIndentState.page, 10);
  govIndentState.page = indentPaged.page;

  return `<div class="indent-stage">
    ${renderWorkflowPeriodFilter('indent', govIndentState)}

    <div class="need-section" style="margin-top:1rem">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-list"></i> Indent List</h4>
        <span class="meta-chip">${periodLabel}</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Indent ID</th><th>Item</th><th>Qty</th><th>Facility</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${indentPaged.items.length ? indentPaged.items.map(r => `
              <tr class="need-row-clickable" role="button" tabindex="0" onclick="openIndentRowDetail('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openIndentRowDetail('${r.id}')}">
                <td><strong>${r.id}</strong></td>
                <td>${r.item}</td>
                <td>${r.quantity}</td>
                <td>${r.facility}</td>
                <td><span class="badge badge-${needStatusBadge(r.priority)}">${r.priority}</span></td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No indents for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(indentPaged.page, indentPaged.totalPages, indentPaged.total, indentPaged.from, indentPaged.to, 'setIndentListPage')}
    </div>
  </div>`;
}

function getConsolidationEstimatedValueRange() {
  if (currentCategory === 'Drugs') return { low: '₹14.6 Cr', high: '₹17.8 Cr', mid: '₹16.2 Cr' };
  if (currentCategory === 'Equipment') return { low: '₹8.4 Cr', high: '₹11.2 Cr', mid: '₹9.6 Cr' };
  if (currentCategory === 'Services') return { low: '₹3.1 Cr', high: '₹4.5 Cr', mid: '₹3.8 Cr' };
  if (currentCategory === 'Consumables') return { low: '₹2.2 Cr', high: '₹3.4 Cr', mid: '₹2.8 Cr' };
  if (currentCategory === 'Others') return { low: '₹0.9 Cr', high: '₹1.6 Cr', mid: '₹1.2 Cr' };
  return { low: '₹16.8 Cr', high: '₹21.5 Cr', mid: '₹18.6 Cr' };
}

function getDemandApprovalRows() {
  const seed = typeof DEMAND_APPROVAL_LIST !== 'undefined' ? DEMAND_APPROVAL_LIST : [];
  const cat = govConsolidationState.category;
  let rows = (!cat || cat === 'all')
    ? seed
    : seed.filter(r => r.category === cat);
  return applyStagePeriodFilter(rows, govConsolidationState, 'date');
}

function getGovDemandListCategoryOptions() {
  const seed = typeof DEMAND_APPROVAL_LIST !== 'undefined' ? DEMAND_APPROVAL_LIST : [];
  const cats = [...new Set(seed.map(r => r.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  const merged = [...new Set([...fixed, ...cats])];
  return ['All categories', ...merged];
}

function setGovDemandListCategory(label) {
  govConsolidationState.category = (!label || label === 'All categories') ? 'all' : label;
  govConsolidationState.page = 1;
  refreshWorkflowUI();
}

function bindGovDemandListCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="demandListCategory"]');
  if (!wrap || wrap.dataset.demandCatBound) return;
  wrap.dataset.demandCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('demandListCategory') : '');
    setGovDemandListCategory(label);
  });
}

function openDemandApprovalDetail(demandId) {
  const seed = typeof DEMAND_APPROVAL_LIST !== 'undefined' ? DEMAND_APPROVAL_LIST : [];
  const r = seed.find(x => x.id === demandId);
  if (!r) {
    showWfAlert('Demand record not found.');
    return;
  }
  openModal(`${r.id} — Demand Approval`, `
    <div class="kpi-detail need-row-detail">
      <p class="need-row-detail-lead">Consolidated demand package for district review and approval.</p>
      <div class="tender-detail-stats tender-detail-stats--4">
        <div class="tender-stat"><span>Items</span><strong>${r.items}</strong></div>
        <div class="tender-stat"><span>Facilities</span><strong>${r.facilities}</strong></div>
        <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="tender-stat"><span>Date</span><strong>${r.date || '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <div class="tender-detail-section-head">
          <h4>Demand details</h4>
          <button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('consol','demand','${r.id}')">
            <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
          </button>
        </div>
        <div class="data-table-wrap">
          <table class="data-table data-table--modal">
            <tbody>
              <tr><td>Demand ID</td><td><strong>${r.id}</strong></td></tr>
              <tr><td>District</td><td>${r.district}</td></tr>
              <tr><td>Category</td><td>${r.category}</td></tr>
              <tr><td>Line items</td><td>${r.items}</td></tr>
              <tr><td>Facilities</td><td>${r.facilities}</td></tr>
              <tr><td>Estimated value</td><td>${r.valueLow} – ${r.valueHigh}</td></tr>
              <tr><td>Linked indent</td><td>${r.indentRef || '—'}</td></tr>
              <tr><td>Notes</td><td>${r.notes || '—'}</td></tr>
              <tr><td>Date</td><td><strong>${r.date || '—'}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" class="btn btn-primary" onclick="openStageFollowUpModal('consol','demand','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true });
}

function renderDemandConsolidationStage(canEdit = true) {
  // Stage 4 is list-only — demand rows satisfy progress without approval UI.
  if (!govConsolidationState.approved) {
    govConsolidationState.approved = true;
  }
  const st = govConsolidationState;
  const demandRows = getDemandApprovalRows();
  const demandPaged = paginateItems(demandRows, st.page, 10);
  st.page = demandPaged.page;
  const periodLabel = getWfPeriodFilterLabel(st);
  const categoryOptions = getGovDemandListCategoryOptions();
  const categorySelected = st.category === 'all' ? 'All categories' : st.category;

  const filterEmptyRow = !demandPaged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No demand records match <strong>${escapeHtmlLite(periodLabel)}</strong>${st.category !== 'all' ? ` · ${escapeHtmlLite(st.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setGovDemandListCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="consolidation-stage">
    <div class="data-table-wrap need-table">
      <div class="table-header bid-records-header">
        <h3>Demand List <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
        <div class="bid-records-category-filter" title="Filter by category">
          <span class="bid-records-category-label">Category</span>
          ${inlineCustomSelectHTML('demandListCategory', categoryOptions, categorySelected)}
        </div>
      </div>
      ${renderCompactWfPeriodFilter('consol', st)}
      <div class="data-table-scroll">
        <table class="data-table">
          <thead><tr><th>Demand ID</th><th>District</th><th>Category</th><th>Items</th><th>Facilities</th><th>Est. value</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${demandPaged.items.length ? demandPaged.items.map(r => `
              <tr class="need-row-clickable" role="button" tabindex="0" onclick="openDemandApprovalDetail('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDemandApprovalDetail('${r.id}')}">
                <td><strong>${r.id}</strong></td>
                <td>${r.district}</td>
                <td>${r.category}</td>
                <td>${r.items}</td>
                <td>${r.facilities}</td>
                <td>${r.valueLow} – ${r.valueHigh}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
      </div>
      ${demandPaged.items.length ? renderPaginationControls(demandPaged.page, demandPaged.totalPages, demandPaged.total, demandPaged.from, demandPaged.to, 'setDemandApprovalPage') : ''}
    </div>
  </div>`;
}

function openOptimizationSourceDetail(source) {
  const stock = typeof STOCK_CHECK_API !== 'undefined' ? STOCK_CHECK_API : null;

  const wrap = (title, lead, statsHtml, tableHtml) => {
    openModal(title, `
      <div class="consol-detail-modal">
        <p class="consol-detail-lead">${lead}</p>
        <div class="consol-detail-stats">${statsHtml}</div>
        <div class="consol-detail-table-wrap">${tableHtml}</div>
        <div class="modal-inline-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        </div>
      </div>
    `, { wide: true, large: true, extraWide: true });
  };

  const stat = (label, value) => `<div class="consol-detail-stat"><span>${label}</span><strong>${value}</strong></div>`;

  if (source === 'warehouse') {
    const rows = stock?.warehouse?.rows || [];
    wrap(
      'Warehouse Stock — Optimization Detail',
      'Central / regional warehouse on-hand that can offset fresh procurement for the consolidated district demand.',
      `${stat('SKUs considered', '12')}${stat('Surplus value', '₹0.85 Cr – ₹1.05 Cr')}${stat('Action', 'Stock transfer')}`,
      `<table class="data-table consol-detail-table">
        <thead><tr><th>Facility / Warehouse</th><th>Item</th><th>On hand</th><th>Usable</th><th>Recommendation</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><strong>${r.facility}</strong></td>
            <td>${r.item}</td>
            <td>${r.onHand}</td>
            <td>${r.usable}</td>
            <td class="consol-detail-note">${r.recommendation}</td>
            <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`
    );
    return;
  }

  if (source === 'other') {
    const rows = stock?.otherLocations?.rows || [];
    wrap(
      'Other Locations — District-wise Detail',
      'Inter-facility surplus available for redistribution across districts before raising fresh procurement.',
      `${stat('Transfer candidates', '8')}${stat('Est. value', '₹0.55 Cr – ₹0.70 Cr')}${stat('Lead time', '2–5 days')}`,
      `<table class="data-table consol-detail-table">
        <thead><tr><th>From (district / facility)</th><th>To</th><th>Item</th><th>Qty</th><th>Cover gain</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><strong>${r.from}</strong></td>
            <td>${r.to}</td>
            <td>${r.item}</td>
            <td>${r.qty}</td>
            <td>${r.coverGain}</td>
            <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`
    );
    return;
  }

  if (source === 'openpo') {
    const rows = stock?.openPos?.rows || [];
    wrap(
      'Open POs — Pipeline Detail',
      'Approved open purchase orders that can be netted against consolidated demand to avoid duplicate procurement.',
      `${stat('Open POs', '5')}${stat('Pipeline value', '₹0.32 Cr – ₹0.45 Cr')}${stat('Arriving ≤7 days', '2')}`,
      `<table class="data-table consol-detail-table">
        <thead><tr><th>PO</th><th>Vendor</th><th>Item</th><th>Facility</th><th>ETA</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><strong>${r.po}</strong></td>
            <td>${r.vendor}</td>
            <td class="consol-detail-note">${r.item}</td>
            <td>${r.facility}</td>
            <td>${r.eta}</td>
            <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`
    );
    return;
  }

  if (source === 'redistribute') {
    const rows = (stock?.redistributable?.rows || []).slice(0, 3);
    wrap(
      'Redistributable Inventory — Detail',
      'Ranked surplus that can fulfill consolidated demand without a new tender.',
      `${stat('Candidates', '3')}${stat('Est. savings', '₹1.8 Cr – ₹2.4 Cr')}${stat('Confidence', '87%')}`,
      `<table class="data-table consol-detail-table">
        <thead><tr><th>Item</th><th>From</th><th>To</th><th>Qty</th><th>Savings</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td><strong>${r.item}</strong></td>
            <td>${r.from}</td>
            <td>${r.to}</td>
            <td>${r.qty}</td>
            <td>${r.savings}</td>
            <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`
    );
  }
}

function approveConsolidatedDemand() {
  const status = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('consolStatus') : govConsolidationState.status;
  const district = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('consolDistrict') : govConsolidationState.district;
  govConsolidationState.district = district || govConsolidationState.district;
  govConsolidationState.status = 'Approved';
  govConsolidationState.approved = true;
  syncGovWorkflowStatuses();
  persistGovLifecycle();
  refreshWorkflowUI();
  openModal('Demand approved', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
      <h4>Consolidated demand approved</h4>
      <p>District <strong>${govConsolidationState.district}</strong> consolidation is approved. You may now proceed to <strong>PR &amp; Budget Approval</strong>.</p>
    </div>
  `);
}

function openConsolidationClarificationForm() {
  const district = typeof getCustomSelectValue === 'function'
    ? (getCustomSelectValue('consolDistrict') || govConsolidationState.district)
    : govConsolidationState.district;
  openModal('Request Clarification — Form CLR-01', `
    <div class="clarification-form-modal">
      <div class="doc-letter-head" style="margin-bottom:0.85rem">
        <strong>MP Health Procurement Solution</strong><br>
        Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh
      </div>
      <p class="need-row-detail-lead">Official clarification request from consolidating authority to lower formation (Store / Facility / Indenting officer). All fields marked * are mandatory.</p>
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>${reqLabel('From (Authority)')}</label><input id="clrFrom" type="text" value="Stock Manager / Consolidation Cell — ${district}"></div>
        <div class="form-group"><label>${reqLabel('To (Lower authority)')}</label>
          <select id="clrTo" class="form-native-select">
            <option>Store Manager — Facility</option>
            <option>Indenting Officer</option>
            <option>CMO Office (District)</option>
            <option>Warehouse In-charge</option>
          </select>
        </div>
        <div class="form-group"><label>${reqLabel('Reference Indent / DEM No.')}</label><input id="clrRef" type="text" value="${govIndentState.indentId || 'DEM-MP-2026-334'}" placeholder="e.g. IND-MP-260903-001"></div>
        <div class="form-group"><label>${reqLabel('Subject')}</label><input id="clrSubject" type="text" placeholder="e.g. Clarification on quantity / facility stock certificate"></div>
        <div class="form-group full"><label>${reqLabel('Clarification sought')}</label>
          <textarea id="clrBody" rows="4" placeholder="State the specific points requiring clarification (quantity mismatch, stock certificate, duplicate indent, priority justification, etc.)"></textarea>
        </div>
        ${datePickerHTML('clrDue', '', reqLabel('Response due by (DD-MM-YYYY)'), false)}
        <div class="form-group"><label>Priority</label>
          <select id="clrPriority" class="form-native-select">
            <option>Routine</option>
            <option selected>Urgent</option>
            <option>Immediate</option>
          </select>
        </div>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" class="btn btn-primary" onclick="submitConsolidationClarification()"><i class="fa-solid fa-paper-plane"></i> Issue clarification</button>
      </div>
    </div>
  `, { wide: true, large: true });
}

function submitConsolidationClarification() {
  const subject = document.getElementById('clrSubject')?.value?.trim();
  const body = document.getElementById('clrBody')?.value?.trim();
  const due = document.getElementById('clrDue')?.value?.trim();
  const ref = document.getElementById('clrRef')?.value?.trim();
  const from = document.getElementById('clrFrom')?.value?.trim();
  if (!subject || !body || !due || !ref || !from) {
    showWfAlert('Please fill all mandatory fields marked with * before issuing the clarification.');
    return;
  }
  const clrId = `CLR-MP-${APP_TODAY.replace(/-/g, '').slice(2)}-${String(Math.floor(Math.random() * 90) + 10)}`;
  govConsolidationState.clarificationSent = true;
  govConsolidationState.lastClarificationRef = clrId;
  govConsolidationState.status = 'Clarification Sought';
  govConsolidationState.approved = false;
  refreshWorkflowUI();
  openModal('Clarification issued', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-envelope-circle-check"></i></div>
      <h4>Clarification sent to lower authority</h4>
      <p>Reference <strong>${clrId}</strong> has been recorded against <strong>${ref}</strong>. Consolidation remains pending until the response is received and demand is re-approved.</p>
    </div>
  `);
}

function openConsolidationDocuments() {
  const value = getConsolidationEstimatedValueRange();
  const district = (typeof getCustomSelectValue === 'function' && getCustomSelectValue('consolDistrict'))
    || govConsolidationState.district
    || 'Bhopal';
  const cat = currentCategory === 'All' ? 'All categories' : currentCategory;
  openModal('Consolidation Document Pack', `
    <div class="doc-modal doc-letter consolidation-doc">
      <div class="doc-letter-head">
        <strong>MP Health Procurement Solution</strong><br>
        Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh<br>
        <span style="font-size:0.8rem;opacity:0.85">Stock Consolidation Cell · Official Record</span>
      </div>
      <p class="doc-letter-ref">Doc No: CONSOL/${district.toUpperCase().slice(0, 3)}/2026/0${govConsolidationState.approved ? '92' : '41'} &nbsp;|&nbsp; Date: ${formatDateDMY(APP_TODAY)} &nbsp;|&nbsp; Category: ${cat}</p>
      <h3 style="margin:0.75rem 0 0.5rem;font-size:1.05rem;color:var(--primary)">Demand Consolidation Report</h3>
      <p><strong>Subject:</strong> District-wise consolidated demand after stock optimization — ${district} Division</p>
      <p>This report summarises consolidated indent requirements after duplicate check and netting of warehouse stock, inter-facility surplus, approved open POs, and redistributable inventory.</p>

      <table class="data-table data-table--modal" style="margin:1rem 0">
        <tbody>
          <tr><td>District / Division</td><td><strong>${district}</strong></td></tr>
          <tr><td>Line items consolidated</td><td><strong>47</strong> across 12 facilities</td></tr>
          <tr><td>Estimated value (range)</td><td><strong>${value.low} – ${value.high}</strong> (midpoint ${value.mid})</td></tr>
          <tr><td>Fulfillable from existing stock</td><td><strong>28 items</strong></td></tr>
          <tr><td>Est. savings from optimization</td><td><strong>₹1.8 Cr – ₹2.4 Cr</strong></td></tr>
          <tr><td>Fresh procurement residual</td><td><strong>19 items</strong></td></tr>
          <tr><td>Status</td><td><strong>${govConsolidationState.approved ? 'Approved' : govConsolidationState.status}</strong></td></tr>
        </tbody>
      </table>

      <h4 style="margin:1rem 0 0.45rem;font-size:0.92rem">Optimization summary</h4>
      <table class="data-table data-table--modal">
        <thead><tr><th>Source</th><th>Items</th><th>Est. value</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Warehouse Stock</td><td>12</td><td>₹0.85 Cr – ₹1.05 Cr</td><td>Issue stock transfer</td></tr>
          <tr><td>Other Locations</td><td>8</td><td>₹0.55 Cr – ₹0.70 Cr</td><td>Inter-facility redistribute</td></tr>
          <tr><td>Open POs</td><td>5</td><td>₹0.32 Cr – ₹0.45 Cr</td><td>Expedite / net against gap</td></tr>
          <tr><td>Redistributable</td><td>3</td><td>₹0.12 Cr – ₹0.18 Cr</td><td>Auto-allocate surplus</td></tr>
        </tbody>
      </table>

      <p style="margin-top:1rem;font-size:0.88rem;color:#334155"><strong>Certification:</strong> Certified that duplicate demand has been checked, stock optimization applied, and residual requirement is recommended for PR &amp; budget sanction under applicable GFR / DoPHFW procurement guidelines.</p>
      <p class="doc-letter-sign">— Stock Manager / Consolidation Cell<br>MP Health Procurement · ${district}</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Download</button>
      </div>
    </div>
  `, { wide: true, large: true });
}

function getPrBudgetData() {
  return typeof PR_BUDGET_APPROVAL_API !== 'undefined' ? PR_BUDGET_APPROVAL_API : null;
}

function getPrBudgetListRows() {
  const data = getPrBudgetData();
  const cat = govBudgetState.category;
  let depts = (data?.departments || []).map(d => ({
    ...d,
    date: (d.decisionDate && d.decisionDate !== '—')
      ? d.decisionDate
      : (d.documents?.[0]?.uploadedOn || d.decisionDate || '')
  }));
  if (cat && cat !== 'all') {
    depts = depts.filter(d => d.category === cat);
  }
  return applyStagePeriodFilter(depts, govBudgetState, 'date');
}

function getPrBudgetCategoryOptions() {
  const data = getPrBudgetData();
  const cats = [...new Set((data?.departments || []).map(d => d.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return ['All categories', ...new Set([...fixed, ...cats])];
}

function setPrBudgetCategory(label) {
  govBudgetState.category = (!label || label === 'All categories') ? 'all' : label;
  govBudgetState.page = 1;
  refreshWorkflowUI();
}

function bindPrBudgetCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="prBudgetCategory"]');
  if (!wrap || wrap.dataset.prBudgetCatBound) return;
  wrap.dataset.prBudgetCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('prBudgetCategory') : '');
    setPrBudgetCategory(label);
  });
}

function renderPrBudgetApprovalStage(canEdit = true) {
  const data = getPrBudgetData();
  if (!data) {
    return `<div class="need-api-empty"><i class="fa-solid fa-plug-circle-xmark"></i><p>PR &amp; budget data could not be loaded. Please try again.</p></div>`;
  }
  const { meta } = data;
  const disabled = canEdit ? '' : ' disabled';
  const listRows = getPrBudgetListRows();
  const budgetPaged = paginateItems(listRows, govBudgetState.page, 10);
  govBudgetState.page = budgetPaged.page;
  const periodLabel = getWfPeriodFilterLabel(govBudgetState);
  const categoryOptions = getPrBudgetCategoryOptions();
  const categorySelected = govBudgetState.category === 'all' ? 'All categories' : govBudgetState.category;
  const approvedCount = listRows.filter(d => d.status === 'Approved').length;
  const blockedCount = listRows.filter(d => d.status === 'Not Approved').length;
  const reviewCount = listRows.filter(d => d.status === 'Under Review' || d.status === 'Partial').length;

  const filterEmptyRow = !budgetPaged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No PR &amp; budget records match <strong>${escapeHtmlLite(periodLabel)}</strong>${govBudgetState.category !== 'all' ? ` · ${escapeHtmlLite(govBudgetState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setPrBudgetCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="budget-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Resource Manager — Budget verification</strong>
        <p>Review each department’s budget decision and reasons, and open supporting documents as needed. This screen is for verification only — department work happens separately.</p>
      </div>
      ${govBudgetState.verified
        ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Verification complete</span>`
        : `<span class="badge badge-warning"><i class="fa-solid fa-lock"></i> Verification required</span>`}
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>PR Number</span><strong>${meta.prNumber}</strong></div>
      <div class="budget-pr-chip"><span>District</span><strong>${meta.district}</strong></div>
      <div class="budget-pr-chip"><span>Category</span><strong>${govBudgetState.category === 'all' ? meta.category : govBudgetState.category}</strong></div>
      <div class="budget-pr-chip"><span>Estimated value</span><strong>${meta.estimatedRange}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${meta.lastSynced}</strong></div>
    </div>

    <section class="budget-section">
      <div class="budget-dept-stats">
        <div class="budget-dept-stat"><span>Departments</span><strong>${listRows.length}</strong></div>
        <div class="budget-dept-stat"><span>Approved</span><strong>${approvedCount}</strong></div>
        <div class="budget-dept-stat"><span>Not approved</span><strong>${blockedCount}</strong></div>
        <div class="budget-dept-stat"><span>Review / partial</span><strong>${reviewCount}</strong></div>
      </div>
      <div class="data-table-wrap need-table" style="margin-top:0.85rem">
        <div class="table-header bid-records-header">
          <h3>PR &amp; Budget List <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-category-filter" title="Filter by category">
            <span class="bid-records-category-label">Category</span>
            ${inlineCustomSelectHTML('prBudgetCategory', categoryOptions, categorySelected)}
          </div>
        </div>
        ${renderCompactWfPeriodFilter('budget', govBudgetState)}
        <div class="data-table-scroll">
          <table class="data-table">
            <thead><tr><th>Department</th><th>Budget head</th><th>Scheme</th><th>Allocated</th><th>Requested</th><th>Available</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${budgetPaged.items.length ? budgetPaged.items.map(d => `
                <tr class="need-row-clickable" role="button" tabindex="0" onclick="openDepartmentBudgetDetail('${d.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDepartmentBudgetDetail('${d.id}')}">
                  <td><strong>${d.shortName}</strong><div class="table-sub">${d.name}</div></td>
                  <td>${d.budgetHead}</td>
                  <td>${d.scheme}</td>
                  <td>${d.allocated}</td>
                  <td>${d.requested}</td>
                  <td>${d.available}</td>
                  <td><span class="badge badge-${needStatusBadge(d.status)}">${d.status}</span></td>
                  <td class="cell-date">${d.date || '—'}</td>
                </tr>
              `).join('') : filterEmptyRow}
            </tbody>
          </table>
        </div>
        ${budgetPaged.items.length ? renderPaginationControls(budgetPaged.page, budgetPaged.totalPages, budgetPaged.total, budgetPaged.from, budgetPaged.to, 'setPrBudgetListPage') : ''}
      </div>
    </section>

    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary" onclick="confirmBudgetVerification()"${disabled || govBudgetState.verified ? ' disabled' : ''}>
        <i class="fa-solid fa-clipboard-check"></i> ${govBudgetState.verified ? 'Budget Verification Confirmed' : 'Confirm Budget Verification'}
      </button>
      <button type="button" class="btn btn-outline" onclick="openBudgetDocumentsPack()"><i class="fa-solid fa-file-lines"></i> View PR Summary Document</button>
    </div>
  </div>`;
}

function openDepartmentBudgetDetail(deptId) {
  const data = getPrBudgetData();
  const dept = data?.departments?.find(d => d.id === deptId);
  if (!dept) return;
  const fetched = govBudgetState.fetchedDocs[deptId] || [];
  const note = dept.ocrExtract;
  const followUpBtn = `<button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('budget','dept','${dept.id}')">
            <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
          </button>`;

  openModal(`${dept.name} — Budget Detail`, `
    <div class="budget-dept-detail consol-detail-modal">
      <div class="tender-detail-section-head" style="margin:0 0 0.85rem">
        <h4 style="margin:0">Department budget detail</h4>
        ${followUpBtn}
      </div>
      <div class="consol-detail-stats">
        <div class="consol-detail-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(dept.status)}">${dept.status}</span></strong></div>
        <div class="consol-detail-stat"><span>Budget head</span><strong>${dept.budgetHead}</strong></div>
        <div class="consol-detail-stat"><span>Scheme</span><strong>${dept.scheme}</strong></div>
        <div class="consol-detail-stat"><span>Decision by</span><strong>${dept.decisionBy}</strong></div>
      </div>

      <div class="budget-reason-box status-${dept.status.toLowerCase().replace(/\s+/g, '-')}">
        <h4><i class="fa-solid fa-stamp"></i> Reason for ${dept.status === 'Approved' ? 'approval' : dept.status === 'Not Approved' ? 'non-approval' : 'current status'}</h4>
        <p>${dept.reason}</p>
        <div class="budget-reason-meta">
          <span>Based on: <strong>${dept.reasonSource}</strong></span>
          <span>Date: <strong>${dept.decisionDate}</strong></span>
        </div>
      </div>

      <div class="budget-figures-row">
        <div><span>Allocated</span><strong>${dept.allocated}</strong></div>
        <div><span>Requested</span><strong>${dept.requested}</strong></div>
        <div><span>Available</span><strong>${dept.available}</strong></div>
      </div>

      <h4 class="budget-subhead">Work done by this section</h4>
      <ul class="budget-section-work">${dept.sectionWork.map(w => `<li>${w}</li>`).join('')}</ul>

      ${note ? `
        <div class="budget-ocr-panel">
          <div class="budget-ocr-head">
            <h4><i class="fa-solid fa-file-signature"></i> Decision note summary</h4>
            <span class="badge badge-info">Readability ${note.confidence}</span>
          </div>
          <p class="budget-ocr-source">From document: <strong>${note.sourceDoc}</strong></p>
          <div class="label-grid">
            ${note.fields.map(f => `<div class="label-item"><span class="label-key">${f.label}</span><span class="label-val">${f.value}</span></div>`).join('')}
          </div>
          <div class="budget-ocr-raw">
            <span>What the note says</span>
            <p>${note.rawText}</p>
          </div>
        </div>
      ` : `
        <div class="budget-ocr-empty"><i class="fa-solid fa-file-circle-check"></i> Decision is recorded on a typed / PDF sanction. No scanned handwritten note for this department.</div>
      `}

      <h4 class="budget-subhead">Department documents</h4>
      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table">
          <thead><tr><th>Document</th><th>Type</th><th>Uploaded by</th><th>Date</th><th>Reading status</th></tr></thead>
          <tbody>
            ${dept.documents.map(doc => `<tr>
              <td><strong>${doc.name}</strong></td>
              <td>${doc.kind}</td>
              <td>${doc.uploadedBy}</td>
              <td>${doc.uploadedOn}</td>
              <td>${doc.ocr ? '<span class="badge badge-info">Note summarised</span>' : '<span class="badge badge-muted">As uploaded</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="budget-api-fetch">
        <p><i class="fa-solid fa-folder-open"></i> Get the latest documents submitted by this department for the budget decision.</p>
        <button type="button" class="btn btn-primary" onclick="fetchDepartmentBudgetDocuments('${dept.id}')">
          <i class="fa-solid fa-download"></i> Get documents
        </button>
        ${fetched.length ? `
          <div class="budget-fetched-list">
            <strong>Documents available:</strong>
            <ul>${fetched.map(f => `<li><i class="fa-solid fa-file"></i> ${f.name}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>

      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        ${note ? `<button type="button" class="btn btn-outline" onclick="openBudgetOcrDocument('${dept.id}')"><i class="fa-solid fa-magnifying-glass"></i> View scanned note</button>` : ''}
        <button type="button" class="btn btn-primary" onclick="openStageFollowUpModal('budget','dept','${dept.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
}

function fetchDepartmentBudgetDocuments(deptId) {
  const data = getPrBudgetData();
  const dept = data?.departments?.find(d => d.id === deptId);
  if (!dept) return;
  govBudgetState.fetchedDocs[deptId] = dept.documents.map(d => ({
    name: d.name,
    ref: d.id,
    kind: d.kind
  }));
  openModal('Documents ready', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-folder-open"></i></div>
      <h4>Documents retrieved</h4>
      <p><strong>${dept.documents.length}</strong> document(s) from <strong>${dept.name}</strong> are ready for review.</p>
      <ul class="budget-fetched-simple">
        ${dept.documents.map(d => `<li>${d.name}</li>`).join('')}
      </ul>
      <div class="modal-inline-actions" style="justify-content:center;margin-top:1rem">
        <button type="button" class="btn btn-primary" onclick="openDepartmentBudgetDetail('${deptId}')">Back to department detail</button>
      </div>
    </div>
  `);
}

function openBudgetOcrDocument(deptId) {
  const dept = getPrBudgetData()?.departments?.find(d => d.id === deptId);
  const note = dept?.ocrExtract;
  if (!note) return;
  openModal('Scanned decision note', `
    <div class="doc-letter consolidation-doc">
      <div class="doc-letter-head">
        <strong>MP Health Procurement Solution</strong><br>
        Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh<br>
        <span style="font-size:0.8rem;opacity:0.85">Scanned department note — for Resource Manager review</span>
      </div>
      <p class="doc-letter-ref">Document: ${note.sourceDoc} &nbsp;|&nbsp; Readability: ${note.confidence} &nbsp;|&nbsp; Department: ${dept.name}</p>
      <div class="budget-ocr-scan-preview">
        <div class="budget-ocr-scan-label"><i class="fa-solid fa-image"></i> Scanned note (preview)</div>
        <div class="budget-ocr-scan-body">
          <em>“${note.rawText}”</em>
          <span>— as written on the uploaded note</span>
        </div>
      </div>
      <h4 style="margin:1rem 0 0.5rem;font-size:0.95rem;color:var(--primary)">Key points from the note</h4>
      <table class="data-table consol-detail-table">
        <thead><tr><th>Particular</th><th>Value</th></tr></thead>
        <tbody>
          ${note.fields.map(f => `<tr><td><strong>${f.label}</strong></td><td>${f.value}</td></tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:1rem;font-size:0.85rem;color:#475569">Use these points to understand why the department approved or did not approve the budget.</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>
  `, { wide: true, large: true });
}

function confirmBudgetVerification() {
  const data = getPrBudgetData();
  const blocked = (data?.departments || []).filter(d => d.status === 'Not Approved');
  govBudgetState.verified = true;
  syncGovWorkflowStatuses();
  persistGovLifecycle();
  refreshWorkflowUI();
  openModal('Budget verification confirmed', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-clipboard-check"></i></div>
      <h4>PR &amp; budget verification recorded</h4>
      <p>Resource Manager has verified section checklist and department budget positions for <strong>${data?.meta?.prNumber || 'this PR'}</strong>.</p>
      ${blocked.length
        ? `<p class="budget-verify-note"><i class="fa-solid fa-triangle-exclamation"></i> Note: <strong>${blocked.map(d => d.shortName).join(', ')}</strong> remain not approved — revise / reallocate before tender preparation if required.</p>`
        : '<p>All reviewed departments are clear to proceed toward tender preparation.</p>'}
      <p>You may now proceed to <strong>Tender Preparation</strong>.</p>
    </div>
  `);
}

function openBudgetDocumentsPack() {
  const data = getPrBudgetData();
  if (!data) return;
  const { meta, departments } = data;
  openModal('PR & Budget Summary Document', `
    <div class="doc-letter consolidation-doc">
      <div class="doc-letter-head">
        <strong>MP Health Procurement Solution</strong><br>
        Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh<br>
        <span style="font-size:0.8rem;opacity:0.85">Resource Manager · PR &amp; Budget Verification Record</span>
      </div>
      <p class="doc-letter-ref">PR: ${meta.prNumber} &nbsp;|&nbsp; Date: ${formatDateDMY(APP_TODAY)} &nbsp;|&nbsp; District: ${meta.district}</p>
      <h3 style="margin:0.75rem 0 0.5rem;font-size:1.05rem;color:var(--primary)">Purchase Requisition &amp; Budget Approval Summary</h3>
      <p>Estimated procurement value <strong>${meta.estimatedRange}</strong>. Department-wise sanction status is summarised below from notes and files submitted by each department.</p>
      <table class="data-table consol-detail-table" style="margin-top:1rem">
        <thead><tr><th>Department</th><th>Budget head</th><th>Requested</th><th>Status</th><th>Decision date</th></tr></thead>
        <tbody>
          ${departments.map(d => `<tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.budgetHead}</td>
            <td>${d.requested}</td>
            <td><span class="badge badge-${needStatusBadge(d.status)}">${d.status}</span></td>
            <td>${d.decisionDate}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:1rem;font-size:0.88rem;color:#334155"><strong>Certification:</strong> Resource Manager has reviewed section ownership, department reasons, and supporting documents for this purchase requisition.</p>
      <p class="doc-letter-sign">— Resource Manager<br>MP Health Procurement</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Download</button>
      </div>
    </div>
  `, { wide: true, large: true });
}

function getTenderPreparationData() {
  return typeof TENDER_PREPARATION_DATA !== 'undefined' ? TENDER_PREPARATION_DATA : null;
}

function getTenderPrepRows() {
  const data = getTenderPreparationData();
  if (!data) return [];
  let rows = data.tenders.slice();
  const cat = govTenderPrepState.category;
  if (cat && cat !== 'all') {
    rows = rows.filter(t => t.category === cat);
  } else if (currentCategory && currentCategory !== 'All') {
    rows = rows.filter(t => t.category === currentCategory);
  }
  return applyStagePeriodFilter(rows, govTenderPrepState, 'preparedOn');
}

function getTenderPrepCategoryOptions() {
  const data = getTenderPreparationData();
  const cats = [...new Set((data?.tenders || []).map(t => t.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return ['All categories', ...new Set([...fixed, ...cats])];
}

function setTenderPrepCategory(label) {
  govTenderPrepState.category = (!label || label === 'All categories') ? 'all' : label;
  govTenderPrepState.draftsPage = 1;
  govTenderPrepState.preparedPage = 1;
  refreshWorkflowUI();
}

function bindTenderPrepCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="tenderPrepCategory"]');
  if (!wrap || wrap.dataset.tenderPrepCatBound) return;
  wrap.dataset.tenderPrepCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('tenderPrepCategory') : '');
    setTenderPrepCategory(label);
  });
}

function getTenderPrepById(tenderId) {
  return getTenderPrepRows().find(t => t.id === tenderId)
    || getTenderPreparationData()?.tenders?.find(t => t.id === tenderId)
    || null;
}

function setTenderPrepPreparedPage(page) {
  govTenderPrepState.preparedPage = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('tenderPrepPreparedTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setTenderPrepDraftsPage(page) {
  govTenderPrepState.draftsPage = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('tenderPrepDraftsTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setTenderPrepCheckersPage(page) {
  govTenderPrepState.checkersPage = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('tenderPrepCheckersTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setNeedTablePage(section, page) {
  const key = { stock: 'stockPage', patient: 'patientPage', disease: 'diseasePage', gap: 'gapPage' }[section];
  if (!key) return;
  govNeedState[key] = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById(`need-sec-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function setNeedStockPage(page) { setNeedTablePage('stock', page); }
function setNeedPatientPage(page) { setNeedTablePage('patient', page); }
function setNeedDiseasePage(page) { setNeedTablePage('disease', page); }
function setNeedGapPage(page) { setNeedTablePage('gap', page); }

function setStockTablePage(section, page) {
  const key = {
    warehouse: 'warehousePage', other: 'otherPage', openpo: 'openpoPage', redistribute: 'redistributePage'
  }[section];
  if (!key) return;
  govStockCheckState[key] = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById(`stock-sec-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function setStockWarehousePage(page) { setStockTablePage('warehouse', page); }
function setStockOtherPage(page) { setStockTablePage('other', page); }
function setStockOpenPoPage(page) { setStockTablePage('openpo', page); }
function setStockRedistributePage(page) { setStockTablePage('redistribute', page); }

function setIndentListPage(page) {
  govIndentState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function setDemandApprovalPage(page) {
  govConsolidationState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function setPrBudgetListPage(page) {
  govBudgetState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function getNeedSectionRows(section) {
  const data = getNeedIdentificationData();
  if (!data) return [];
  const raw = section === 'stock' ? data.stockLevels.rows
    : section === 'patient' ? data.patientLoad.rows
      : section === 'disease' ? data.diseaseBurden.rows
        : section === 'gap' ? data.gapAnalysis.rows
          : [];
  return applyStagePeriodFilter(raw || [], govNeedState, 'date');
}

function renderTenderPreparationStage(canEdit = true) {
  const data = getTenderPreparationData();
  if (!data) {
    return `<div class="need-api-empty"><i class="fa-solid fa-file-circle-xmark"></i><p>Tender preparation data could not be loaded. Please try again.</p></div>`;
  }
  const { meta, checkers } = data;
  const rows = getTenderPrepRows();
  const disabled = canEdit ? '' : ' disabled';
  const consensusCount = checkers.filter(c => c.status === 'Consensus uploaded').length;
  const draftsPaged = paginateItems(rows, govTenderPrepState.draftsPage, 10);
  const checkersPaged = paginateItems(checkers, govTenderPrepState.checkersPage, 10);
  const paged = paginateItems(rows, govTenderPrepState.preparedPage, 10);
  govTenderPrepState.draftsPage = draftsPaged.page;
  govTenderPrepState.checkersPage = checkersPaged.page;
  govTenderPrepState.preparedPage = paged.page;
  const periodLabel = getWfPeriodFilterLabel(govTenderPrepState);
  const categoryOptions = getTenderPrepCategoryOptions();
  const categorySelected = govTenderPrepState.category === 'all' ? 'All categories' : govTenderPrepState.category;

  const draftsEmpty = !draftsPaged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No tender drafts match <strong>${escapeHtmlLite(periodLabel)}</strong>${govTenderPrepState.category !== 'all' ? ` · ${escapeHtmlLite(govTenderPrepState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setTenderPrepCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Tender preparation — auto draft &amp; division check</strong>
        <p>The system prepares the NIT/RFP draft from earlier stage data. Division checkers review the details, upload consensus, and then the final NIT/RFP is issued.</p>
      </div>
      ${govTenderPrepState.finalReady
        ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Final NIT ready</span>`
        : `<span class="badge badge-warning"><i class="fa-solid fa-file-pen"></i> Draft under check</span>`}
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Current draft</span><strong>${meta.draftId}</strong></div>
      <div class="budget-pr-chip"><span>Linked PR</span><strong>${meta.linkedPr}</strong></div>
      <div class="budget-pr-chip"><span>Prepared on</span><strong>${meta.preparedOn}</strong></div>
      <div class="budget-pr-chip"><span>Evaluation</span><strong>${meta.evaluationMethod}</strong></div>
      <div class="budget-pr-chip"><span>Checker consensus</span><strong>${consensusCount}/${checkers.length}</strong></div>
    </div>

    <section class="budget-section" id="tenderPrepDraftsTable">
      <div class="data-table-wrap need-table">
        <div class="table-header bid-records-header">
          <h3>Auto-prepared drafts — tender wise <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-category-filter" title="Filter by category">
            <span class="bid-records-category-label">Category</span>
            ${inlineCustomSelectHTML('tenderPrepCategory', categoryOptions, categorySelected)}
          </div>
        </div>
        ${renderCompactWfPeriodFilter('tender', govTenderPrepState)}
        <p class="consol-detail-lead" style="margin:0.65rem 0">Each row is one tender draft. Click a row to open scope, BOQ, eligibility, EMD, timelines and other draft details.</p>
        <div class="data-table-scroll">
          <table class="data-table consol-detail-table tender-prep-table">
            <thead>
              <tr>
                <th>Tender ID</th>
                <th>Title</th>
                <th>Division</th>
                <th>Category</th>
                <th>BOQ lines</th>
                <th>Est. value</th>
                <th>Draft status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${draftsPaged.items.length ? draftsPaged.items.map(t => `
                <tr class="tender-prep-row" onclick="openTenderDraftDetail('${t.id}')" title="View draft details">
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.division}</td>
                  <td>${t.category}</td>
                  <td>${t.boqLines}</td>
                  <td class="cell-nowrap">${t.value}</td>
                  <td><span class="badge badge-${needStatusBadge(t.status)}">${t.status}</span></td>
                  <td class="cell-date">${t.preparedOn || '—'}</td>
                </tr>
              `).join('') : draftsEmpty}
            </tbody>
          </table>
        </div>
        ${draftsPaged.items.length ? renderPaginationControls(draftsPaged.page, draftsPaged.totalPages, draftsPaged.total, draftsPaged.from, draftsPaged.to, 'setTenderPrepDraftsPage') : ''}
      </div>
    </section>

    <section class="budget-section" id="tenderPrepCheckersTable">
      <div class="budget-section-head">
        <h4><i class="fa-solid fa-users"></i> Division checkers — consensus</h4>
        <p>Each division reviews the draft and uploads concurrence. Click a row for full checker details.</p>
      </div>
      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table tender-checker-table">
          <thead><tr><th>Division</th><th>Officer</th><th>Status</th><th>Remark</th><th>Uploaded on</th></tr></thead>
          <tbody>
            ${checkersPaged.items.length ? checkersPaged.items.map(c => `
              <tr class="tender-prep-row" onclick="openTenderCheckerDetail('${c.id}')" title="View checker details">
                <td><strong>${c.division}</strong></td>
                <td>${c.officer}</td>
                <td><span class="badge badge-${needStatusBadge(c.status)}">${c.status}</span></td>
                <td class="consol-detail-note">${c.remark}</td>
                <td class="cell-date">${c.uploadedOn}</td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:1.25rem">No checkers found.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(checkersPaged.page, checkersPaged.totalPages, checkersPaged.total, checkersPaged.from, checkersPaged.to, 'setTenderPrepCheckersPage')}
    </section>

    <section class="budget-section" id="tenderPrepPreparedTable">
      <div class="budget-section-head">
        <h4><i class="fa-solid fa-table"></i> Tenders prepared — status by category &amp; division</h4>
        <p>Counts across Drugs, Equipment and other categories. Click a row for full tender details. Showing 10 per page.</p>
      </div>
      ${renderCategoryCountStrip(rows)}
      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Tender ID</th>
              <th>Title</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Status</th>
              <th>Est. value</th>
              <th>Prepared on</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(t => `
              <tr class="tender-prep-row" onclick="openTenderPrepRowDetail('${t.id}')" title="View tender details">
                <td><strong>${t.id}</strong></td>
                <td>${t.title}</td>
                <td>${t.state}<br><span class="cell-sub">${t.division}</span></td>
                <td>${t.category}</td>
                <td><span class="badge badge-${needStatusBadge(t.status)}">${t.status}</span></td>
                <td class="cell-nowrap">${t.value}</td>
                <td class="cell-date">${t.preparedOn || '—'}</td>
              </tr>
            `).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:1.25rem">No tenders for the selected category.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setTenderPrepPreparedPage')}
    </section>

    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary" onclick="confirmFinalNitRfp()"${disabled || govTenderPrepState.finalReady ? ' disabled' : ''}>
        <i class="fa-solid fa-file-circle-check"></i> ${govTenderPrepState.finalReady ? 'Final NIT / RFP Prepared' : 'Prepare Final NIT / RFP'}
      </button>
      <button type="button" class="btn btn-outline" onclick="openTenderDraftDetail('TND-2026-MP-DRAFT')"><i class="fa-solid fa-eye"></i> View current draft</button>
    </div>
  </div>`;
}

function getTenderDraftBoqItems(t) {
  if (Array.isArray(t?.boqItems) && t.boqItems.length) return t.boqItems;
  if (!categoryUsesItemWiseDetail(t?.category)) return [];
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[t.category] || []) : []);
  const take = Math.min(catalog.length, Math.max(3, Math.min(Number(t.boqLines) || 5, 8)));
  return catalog.slice(0, take).map(i => i.name);
}

function openTenderDraftDetail(tenderId) {
  const t = getTenderPrepById(tenderId);
  if (!t) return;
  const data = getTenderPreparationData();
  const boqItems = getTenderDraftBoqItems(t);
  const coverageRow = { ...t, coveredItems: boqItems };
  openModal(`${escapeHtmlLite(t.id)} — Tender draft`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Auto-prepared tender draft</p>
          <h3>${escapeHtmlLite(t.title)}</h3>
          <p>Draft / NIT: ${escapeHtmlLite(t.nitNo)} · PR: ${escapeHtmlLite(t.linkedPr || data?.meta?.linkedPr || '—')}</p>
        </div>
        <span class="badge badge-${needStatusBadge(t.status)}">${escapeHtmlLite(t.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(t.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>EMD</span><strong>${escapeHtmlLite(t.emd)}</strong></div>
        <div class="dvdms-detail-stat"><span>BOQ lines</span><strong>${escapeHtmlLite(String(t.boqLines))}</strong></div>
        <div class="dvdms-detail-stat"><span>Method</span><strong>${escapeHtmlLite(t.method)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'In BOQ',
        noLabel: 'Not in BOQ',
        yesHint: 'Line items included in this tender draft BOQ',
        noHint: 'In category catalogue · not on this draft BOQ',
        statusHead: 'BOQ status',
        filterLabel: 'BOQ Status',
        headTitle: `${t.category} articles · draft BOQ`,
        stageTitle: `${t.category} · category-wise draft`,
        noun: 'draft'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Draft summary</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Scope</th><td>${escapeHtmlLite(t.scope)}</td></tr>
            <tr><th scope="row">Eligibility</th><td>${escapeHtmlLite(t.eligibility)}</td></tr>
            <tr><th scope="row">Bid deadline</th><td>${escapeHtmlLite(t.bidDeadline)}</td></tr>
            <tr><th scope="row">Bid opening</th><td>${escapeHtmlLite(t.bidOpening)}</td></tr>
            <tr><th scope="row">Delivery period</th><td>${escapeHtmlLite(t.deliveryPeriod)}</td></tr>
            <tr><th scope="row">Prepared on</th><td>${escapeHtmlLite(t.preparedOn || '—')}</td></tr>
            <tr><th scope="row">Division checkers</th><td>${escapeHtmlLite(String(t.checkersDone))} consensus received</td></tr>
            <tr><th scope="row">Built from</th><td>${escapeHtmlLite(data?.meta?.sourceStages || 'Prior procurement stages')}</td></tr>
            <tr><th scope="row">Category / Division</th><td>${escapeHtmlLite(t.category)} · ${escapeHtmlLite(t.state)} (${escapeHtmlLite(t.division)})</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Download</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('tender','draft','${t.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  setTimeout(() => {
    if (typeof bindArticleCoverageStatusFilter === 'function') bindArticleCoverageStatusFilter();
  }, 0);
}

function openTenderCheckerDetail(checkerId) {
  const checker = getTenderPreparationData()?.checkers?.find(c => c.id === checkerId);
  if (!checker) return;
  openModal(`${checker.division} — Checker details`, `
    <div class="consol-detail-modal">
      <p class="consol-detail-lead">Consensus review by <strong>${checker.officer}</strong> on draft <strong>${checker.linkedDraft}</strong>.</p>
      <div class="consol-detail-stats" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="consol-detail-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(checker.status)}">${checker.status}</span></strong></div>
        <div class="consol-detail-stat"><span>Decision</span><strong>${checker.decision}</strong></div>
        <div class="consol-detail-stat"><span>Uploaded on</span><strong>${checker.uploadedOn}</strong></div>
      </div>

      <div class="budget-reason-box status-${checker.status.toLowerCase().replace(/\s+/g, '-')}">
        <h4><i class="fa-solid fa-comment-dots"></i> Summary remark</h4>
        <p>${checker.remark}</p>
      </div>

      <h4 class="budget-subhead">Detailed observation</h4>
      <p style="margin:0 0 1rem;font-size:0.92rem;line-height:1.5;color:#0f172a">${checker.detail}</p>

      <h4 class="budget-subhead">Sections reviewed</h4>
      <ul class="budget-section-work">${(checker.reviewed || []).map(r => `<li>${r}</li>`).join('')}</ul>

      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table">
          <tbody>
            <tr><td>Division</td><td><strong>${checker.division}</strong></td></tr>
            <tr><td>Officer</td><td><strong>${checker.officer}</strong></td></tr>
            <tr><td>Linked draft</td><td><strong>${checker.linkedDraft}</strong></td></tr>
            <tr><td>Consensus document</td><td><strong>${checker.document}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      </div>
    </div>
  `, { wide: true, large: true });
}

function openTenderPrepRowDetail(tenderId) {
  const t = getTenderPrepById(tenderId);
  if (!t) return;
  const boqItems = getTenderDraftBoqItems(t);
  const coverageRow = { ...t, coveredItems: boqItems };
  openModal(`${escapeHtmlLite(t.id)} — Tender details`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Tender preparation</p>
          <h3>${escapeHtmlLite(t.title)}</h3>
          <p>${escapeHtmlLite(t.category)} · ${escapeHtmlLite(t.state)} (${escapeHtmlLite(t.division)} Division)</p>
        </div>
        <span class="badge badge-${needStatusBadge(t.status)}">${escapeHtmlLite(t.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(t.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>EMD</span><strong>${escapeHtmlLite(t.emd)}</strong></div>
        <div class="dvdms-detail-stat"><span>BOQ lines</span><strong>${escapeHtmlLite(String(t.boqLines))}</strong></div>
        <div class="dvdms-detail-stat"><span>Method</span><strong>${escapeHtmlLite(t.method)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'In BOQ',
        noLabel: 'Not in BOQ',
        yesHint: 'Line items included in this tender BOQ',
        noHint: 'In category catalogue · not on this tender BOQ',
        statusHead: 'BOQ status',
        filterLabel: 'BOQ Status',
        headTitle: `${t.category} articles · tender BOQ`,
        stageTitle: `${t.category} · category-wise tender`,
        noun: 'tender'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Tender summary</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">NIT / Draft No.</th><td>${escapeHtmlLite(t.nitNo)}</td></tr>
            <tr><th scope="row">Linked PR</th><td>${escapeHtmlLite(t.linkedPr || '—')}</td></tr>
            <tr><th scope="row">Prepared on</th><td>${escapeHtmlLite(t.preparedOn || '—')}</td></tr>
            <tr><th scope="row">Scope</th><td>${escapeHtmlLite(t.scope)}</td></tr>
            <tr><th scope="row">Eligibility</th><td>${escapeHtmlLite(t.eligibility)}</td></tr>
            <tr><th scope="row">Bid deadline</th><td>${escapeHtmlLite(t.bidDeadline)}</td></tr>
            <tr><th scope="row">Bid opening</th><td>${escapeHtmlLite(t.bidOpening)}</td></tr>
            <tr><th scope="row">Delivery period</th><td>${escapeHtmlLite(t.deliveryPeriod)}</td></tr>
            <tr><th scope="row">Division checkers</th><td>${escapeHtmlLite(String(t.checkersDone))} consensus received</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="openTenderDraftDetail('${t.id}')"><i class="fa-solid fa-file-lines"></i> Open full draft</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('tender','row','${t.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  setTimeout(() => {
    if (typeof bindArticleCoverageStatusFilter === 'function') bindArticleCoverageStatusFilter();
  }, 0);
}

function confirmFinalNitRfp() {
  const data = getTenderPreparationData();
  const pending = (data?.checkers || []).filter(c => c.status !== 'Consensus uploaded');
  govTenderPrepState.finalReady = true;
  govTenderPrepState.consensusAck = true;
  syncGovWorkflowStatuses();
  persistGovLifecycle();
  refreshWorkflowUI();
  openModal('Final NIT / RFP prepared', `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-file-circle-check"></i></div>
      <h4>Final tender document is ready</h4>
      <p>Draft <strong>${data?.meta?.draftId || ''}</strong> has been finalised as NIT/RFP after division checker review. You may proceed to <strong>Bid Evaluation</strong>.</p>
      ${pending.length
        ? `<p class="budget-verify-note"><i class="fa-solid fa-triangle-exclamation"></i> Note: ${pending.map(c => c.division).join(', ')} were still pending at confirmation — follow up if needed before publication.</p>`
        : ''}
    </div>
  `);
}

function filterCategoryRows(rows) {
  if (!rows) return [];
  if (currentCategory && currentCategory !== 'All') return rows.filter(r => r.category === currentCategory);
  return rows.slice();
}

function renderCategoryCountStrip(rows) {
  const order = ['Drugs', 'Equipment', 'Consumables', 'Services', 'Others'];
  const byCategory = {};
  rows.forEach(t => {
    if (!t?.category) return;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  const cats = [
    ...order.filter(c => byCategory[c] != null),
    ...Object.keys(byCategory).filter(c => !order.includes(c))
  ];
  return `<div class="cat-count-strip" role="group" aria-label="Category counts">
    <span class="cat-count-item cat-count-item--total"><em>Total</em><strong>${rows.length}</strong></span>
    ${cats.map(cat => `<span class="cat-count-item"><em>${cat}</em><strong>${byCategory[cat]}</strong></span>`).join('')}
  </div>`;
}

function getGovStageCategoryOptions(rows) {
  const cats = [...new Set((rows || []).map(r => r.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return ['All categories', ...new Set([...fixed, ...cats])];
}

function applyGovStageCategoryFilter(rows, filterState) {
  let list = Array.isArray(rows) ? rows.slice() : [];
  const cat = filterState?.category;
  if (cat && cat !== 'all') {
    list = list.filter(r => r.category === cat);
  } else if (typeof currentCategory !== 'undefined' && currentCategory && currentCategory !== 'All') {
    list = list.filter(r => r.category === currentCategory);
  }
  return list;
}

function renderGovStageListHeader({ title, stageKey, filterState, selectId, categoryOptions, lead }) {
  const periodLabel = getWfPeriodFilterLabel(filterState);
  const categorySelected = (!filterState.category || filterState.category === 'all') ? 'All categories' : filterState.category;
  return `<div class="table-header bid-records-header">
      <h3>${title} <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      <div class="bid-records-category-filter" title="Filter by category">
        <span class="bid-records-category-label">Category</span>
        ${inlineCustomSelectHTML(selectId, categoryOptions, categorySelected)}
      </div>
    </div>
    ${renderCompactWfPeriodFilter(stageKey, filterState)}
    ${lead ? `<p class="consol-detail-lead" style="margin:0.65rem 0">${lead}</p>` : ''}`;
}

function bindGovStageCategorySelect(selectId, onChange) {
  const wrap = document.querySelector(`.custom-select[data-select-id="${selectId}"]`);
  if (!wrap || wrap.dataset.stageCatBound) return;
  wrap.dataset.stageCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue(selectId) : '');
    onChange(label);
  });
}

function renderProcessSteps(steps) {
  return `<div class="tender-prep-steps">
    ${steps.map(s => `
      <article class="tender-prep-step status-${s.status.toLowerCase().replace(/\s+/g, '-')}">
        <span class="tender-prep-step-num">${s.id}</span>
        <div>
          <div class="budget-check-title-row">
            <strong>${s.title}</strong>
            <span class="badge badge-${needStatusBadge(s.status)}">${s.status}</span>
          </div>
          <p>${s.detail}</p>
        </div>
      </article>
    `).join('')}
  </div>`;
}

function markGovStageDone(fromId, toId) {
  if (typeof GOV_WORKFLOW === 'undefined') return;
  const from = GOV_WORKFLOW.find(s => s.id === fromId);
  const to = GOV_WORKFLOW.find(s => s.id === toId);
  if (from) from.status = 'done';
  if (to && to.status === 'pending') to.status = 'active';
}


/** Parse DD-MM-YYYY or YYYY-MM-DD into FY / quarter / month for stage filters */
function getStageDateParts(dateStr) {
  if (!dateStr || dateStr === '—') return null;
  const raw = String(dateStr).trim();
  let mm;
  let yyyy;
  // Accept "DD-MM-YYYY" or "DD-MM-YYYY 17:00 IST"
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmy) {
    mm = Number(dmy[2]);
    yyyy = Number(dmy[3]);
  } else {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    yyyy = Number(m[1]);
    mm = Number(m[2]);
  }
  if (!mm || !yyyy) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarter = mm <= 3 ? 'Q1' : mm <= 6 ? 'Q2' : mm <= 9 ? 'Q3' : 'Q4';
  const fyStart = mm >= 4 ? yyyy : yyyy - 1;
  const fy = `FY${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
  return { fy, quarter, month: months[mm - 1], yyyy, mm };
}

function applyStagePeriodFilter(rows, filterState, dateField) {
  return rows.filter(r => {
    if (filterState.year === 'all') return true;
    const parts = getStageDateParts(r[dateField]);
    if (!parts) return false;
    if (parts.fy !== filterState.year) return false;
    if (filterState.period === 'all') return true;
    if (filterState.viewBy === 'quarter') return parts.quarter === filterState.period;
    return parts.month === filterState.period;
  });
}

function renderWorkflowPeriodFilter(stageKey, filterState) {
  const fyOptions = typeof ANALYTICS_FY_OPTIONS !== 'undefined' ? ANALYTICS_FY_OPTIONS : ['all'];
  const years = fyOptions.filter(y => y !== 'all');
  const quarters = typeof ANALYTICS_QUARTER_OPTIONS !== 'undefined' ? ANALYTICS_QUARTER_OPTIONS : [];
  const months = typeof ANALYTICS_MONTH_OPTIONS !== 'undefined' ? ANALYTICS_MONTH_OPTIONS : [];
  const yearSelected = filterState.year !== 'all';
  const fyLabel = filterState.year === 'all' ? 'All years' : filterState.year;

  return `<div class="wf-period-filter">
    <div class="wf-period-filter-head">
      <strong><i class="fa-solid fa-filter"></i> Filter by period</strong>
      <span>Choose a financial year, then filter by quarter or month.</span>
    </div>
    <div class="analytics-filter-controls">
      <div class="analytics-control">
        <span class="analytics-control-label">Focus year</span>
        <div class="wf-period-year-label">${fyLabel}</div>
      </div>
      <div class="analytics-control ${yearSelected ? '' : 'analytics-control--muted'}">
        <span class="analytics-control-label">View by ${yearSelected ? '' : '(select a year first)'}</span>
        <div class="analytics-segment ${yearSelected ? '' : 'is-disabled'}" role="group">
          <button type="button" class="analytics-seg-btn ${filterState.viewBy === 'quarter' ? 'active' : ''}" onclick="setWfStagePeriodView('${stageKey}','quarter')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-table-cells"></i> Quarter</button>
          <button type="button" class="analytics-seg-btn ${filterState.viewBy === 'month' ? 'active' : ''}" onclick="setWfStagePeriodView('${stageKey}','month')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-calendar-days"></i> Month</button>
        </div>
      </div>
    </div>
    <div class="analytics-fy-chips" role="group" aria-label="Year select">
      <button type="button" class="analytics-fy-chip ${filterState.year === 'all' ? 'active' : ''}" onclick="setWfStagePeriodYear('${stageKey}','all')">All years</button>
      ${years.map(y => `<button type="button" class="analytics-fy-chip ${filterState.year === y ? 'active' : ''}" onclick="setWfStagePeriodYear('${stageKey}','${y}')">${y.replace('FY', '')}</button>`).join('')}
    </div>
    ${yearSelected ? `<div class="analytics-period-row">
      <span class="analytics-control-label">Select ${filterState.viewBy === 'quarter' ? 'quarter' : 'month'} in ${filterState.year}</span>
      <div class="analytics-fy-chips" role="group">
        <button type="button" class="analytics-fy-chip ${filterState.period === 'all' ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','all')">All</button>
        ${filterState.viewBy === 'quarter'
          ? quarters.map(q => `<button type="button" class="analytics-fy-chip ${filterState.period === q.id ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','${q.id}')" title="${q.range}">${q.label} <em>${q.range}</em></button>`).join('')
          : months.map(m => `<button type="button" class="analytics-fy-chip ${filterState.period === m ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','${m}')">${m}</button>`).join('')}
      </div>
    </div>` : `<p class="analytics-filter-hint"><i class="fa-solid fa-circle-info"></i> All years selected. Pick a financial year to filter by quarter or month.</p>`}
  </div>`;
}

/** Compact year / quarter / month chips for Bid-to-Pay table headers (no large filter card). */
function renderCompactWfPeriodFilter(stageKey, filterState) {
  const fyOptions = typeof ANALYTICS_FY_OPTIONS !== 'undefined' ? ANALYTICS_FY_OPTIONS : ['all'];
  const years = fyOptions.filter(y => y !== 'all');
  const quarters = typeof ANALYTICS_QUARTER_OPTIONS !== 'undefined' ? ANALYTICS_QUARTER_OPTIONS : [];
  const months = typeof ANALYTICS_MONTH_OPTIONS !== 'undefined' ? ANALYTICS_MONTH_OPTIONS : [];
  const yearSelected = filterState.year !== 'all';

  return `<div class="wf-period-filter wf-period-filter--compact" aria-label="Period filter">
    <div class="wf-period-compact-row">
      <div class="analytics-fy-chips" role="group" aria-label="Year select">
        <button type="button" class="analytics-fy-chip ${filterState.year === 'all' ? 'active' : ''}" onclick="setWfStagePeriodYear('${stageKey}','all')">All years</button>
        ${years.map(y => `<button type="button" class="analytics-fy-chip ${filterState.year === y ? 'active' : ''}" onclick="setWfStagePeriodYear('${stageKey}','${y}')">${y.replace('FY', '')}</button>`).join('')}
      </div>
      <div class="analytics-segment ${yearSelected ? '' : 'is-disabled'}" role="group" aria-label="View by">
        <button type="button" class="analytics-seg-btn ${filterState.viewBy === 'quarter' ? 'active' : ''}" onclick="setWfStagePeriodView('${stageKey}','quarter')" ${yearSelected ? '' : 'disabled'} title="Quarter"><i class="fa-solid fa-table-cells"></i> Qtr</button>
        <button type="button" class="analytics-seg-btn ${filterState.viewBy === 'month' ? 'active' : ''}" onclick="setWfStagePeriodView('${stageKey}','month')" ${yearSelected ? '' : 'disabled'} title="Month"><i class="fa-solid fa-calendar-days"></i> Mo</button>
      </div>
    </div>
    ${yearSelected ? `<div class="analytics-fy-chips wf-period-compact-sub" role="group">
      <button type="button" class="analytics-fy-chip ${filterState.period === 'all' ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','all')">All</button>
      ${filterState.viewBy === 'quarter'
        ? quarters.map(q => `<button type="button" class="analytics-fy-chip ${filterState.period === q.id ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','${q.id}')" title="${q.range}">${q.label}</button>`).join('')
        : months.map(m => `<button type="button" class="analytics-fy-chip ${filterState.period === m ? 'active' : ''}" onclick="setWfStagePeriodFocus('${stageKey}','${m}')">${m}</button>`).join('')}
    </div>` : ''}
  </div>`;
}

function getWfStageFilterState(stageKey) {
  if (stageKey === 'need') return govNeedState;
  if (stageKey === 'stock') return govStockCheckState;
  if (stageKey === 'indent') return govIndentState;
  if (stageKey === 'consol') return govConsolidationState;
  if (stageKey === 'budget') return govBudgetState;
  if (stageKey === 'tender') return govTenderPrepState;
  if (stageKey === 'bid') return govBidEvalState;
  if (stageKey === 'contract') return govContractState;
  if (stageKey === 'award') return govAwardState;
  if (stageKey === 'po') return govPoState;
  if (stageKey === 'grn') return govGrnState;
  if (stageKey === 'invoice') return govInvoiceState;
  if (stageKey === 'payment') return govPaymentState;
  if (stageKey === 'renewal') return govRenewalState;
  if (stageKey === 'contractsList') return contractsListState;
  if (stageKey === 'contractMgmt') return contractMgmtListState;
  if (stageKey === 'deliveryList') return deliveryListState;
  if (stageKey === 'tendersList') return tendersListState;
  if (stageKey === 'bidsList') return bidsListState;
  if (stageKey === 'vendorContract') return vendorContractExecState;
  if (stageKey === 'vendorInvoice') return vendorInvoiceExecState;
  if (stageKey === 'vendorPayment') return vendorPaymentExecState;
  if (stageKey === 'vendorDelivery') return vendorDeliveryExecState;
  if (stageKey === 'vendorRenewal') return vendorRenewalExecState;
  if (stageKey === 'vendorBidDvdms') return vendorBidDvdmsFilterState;
  if (stageKey === 'vendorAwardSync') return vendorAwardSyncFilterState;
  if (stageKey === 'vendorDeliverySync') return vendorDeliverySyncFilterState;
  return govAwardState;
}

function resetWfStageTablePages(st) {
  if (!st) return;
  st.page = 1;
  if (st.preparedPage != null) st.preparedPage = 1;
  if (st.draftsPage != null) st.draftsPage = 1;
  if (st.checkersPage != null) st.checkersPage = 1;
  if (st.stockPage != null) st.stockPage = 1;
  if (st.patientPage != null) st.patientPage = 1;
  if (st.diseasePage != null) st.diseasePage = 1;
  if (st.gapPage != null) st.gapPage = 1;
  if (st.warehousePage != null) st.warehousePage = 1;
  if (st.otherPage != null) st.otherPage = 1;
  if (st.openpoPage != null) st.openpoPage = 1;
  if (st.redistributePage != null) st.redistributePage = 1;
}

function setWfStagePeriodYear(stageKey, year) {
  const st = getWfStageFilterState(stageKey);
  st.year = year;
  st.period = 'all';
  resetWfStageTablePages(st);
  if (year === 'all') st.viewBy = 'quarter';
  if (stageKey === 'contractsList' || stageKey === 'contractMgmt' || stageKey === 'deliveryList' || stageKey === 'tendersList' || stageKey === 'bidsList') {
    renderPage();
    return;
  }
  if (stageKey === 'vendorContract' || stageKey === 'vendorInvoice' || stageKey === 'vendorPayment' || stageKey === 'vendorDelivery' || stageKey === 'vendorRenewal' || stageKey === 'vendorBidDvdms' || stageKey === 'vendorAwardSync') {
    refreshWorkflowUI();
    return;
  }
  refreshWorkflowUI();
}

function setWfStagePeriodView(stageKey, viewBy) {
  const st = getWfStageFilterState(stageKey);
  if (st.year === 'all') return;
  st.viewBy = viewBy;
  st.period = 'all';
  resetWfStageTablePages(st);
  if (stageKey === 'contractsList' || stageKey === 'contractMgmt' || stageKey === 'deliveryList' || stageKey === 'tendersList' || stageKey === 'bidsList') {
    renderPage();
    return;
  }
  if (stageKey === 'vendorContract' || stageKey === 'vendorInvoice' || stageKey === 'vendorPayment' || stageKey === 'vendorDelivery' || stageKey === 'vendorRenewal' || stageKey === 'vendorBidDvdms' || stageKey === 'vendorAwardSync') {
    refreshWorkflowUI();
    return;
  }
  refreshWorkflowUI();
}

function setWfStagePeriodFocus(stageKey, period) {
  const st = getWfStageFilterState(stageKey);
  st.period = period;
  resetWfStageTablePages(st);
  if (stageKey === 'contractsList' || stageKey === 'contractMgmt' || stageKey === 'deliveryList' || stageKey === 'tendersList' || stageKey === 'bidsList') {
    renderPage();
    return;
  }
  if (stageKey === 'vendorContract' || stageKey === 'vendorInvoice' || stageKey === 'vendorPayment' || stageKey === 'vendorDelivery' || stageKey === 'vendorRenewal' || stageKey === 'vendorBidDvdms' || stageKey === 'vendorAwardSync') {
    refreshWorkflowUI();
    return;
  }
  refreshWorkflowUI();
}

function getWfPeriodFilterLabel(filterState) {
  if (filterState.year === 'all') return 'All years';
  if (filterState.period === 'all') return `${filterState.year} · All ${filterState.viewBy === 'month' ? 'months' : 'quarters'}`;
  return `${filterState.year} · ${filterState.period}`;
}

/* ========== Stage 7 Bid Evaluation ========== */
function getBidEvalItemNames(evalRow) {
  if (Array.isArray(evalRow?.evaluatedItems) && evalRow.evaluatedItems.length) {
    return evalRow.evaluatedItems;
  }
  if (!categoryUsesItemWiseDetail(evalRow?.category)) return [];
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[evalRow.category] || []) : []);
  const take = /complete/i.test(evalRow?.status || '') ? 4 : 2;
  return catalog.slice(0, take).map(i => i.name);
}

function getBidEvaluationBaseRows() {
  const seed = typeof BID_EVALUATION_DATA !== 'undefined' ? BID_EVALUATION_DATA.evaluations : [];
  const cat = govBidEvalState.category;
  let rows = seed.slice();
  if (cat && cat !== 'all') {
    rows = rows.filter(r => r.category === cat);
  } else if (currentCategory && currentCategory !== 'All') {
    rows = rows.filter(r => r.category === currentCategory);
  }
  return applyStagePeriodFilter(rows, govBidEvalState, 'evalDate');
}

function getBidEvaluationRows() {
  return getBidEvaluationBaseRows().flatMap(r => {
    const items = getBidEvalItemNames(r);
    if (!items.length) {
      return [{ ...r, item: '—', rowKey: r.id, coveredItems: r.evaluatedItems || [] }];
    }
    return items.map((itemName, idx) => ({
      ...r,
      item: itemName,
      rowKey: `${r.id}__${idx}`,
      coveredItems: r.evaluatedItems || items
    }));
  });
}

function getBidEvalCategoryOptions() {
  const seed = typeof BID_EVALUATION_DATA !== 'undefined' ? BID_EVALUATION_DATA.evaluations : [];
  const cats = [...new Set(seed.map(r => r.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return ['All categories', ...new Set([...fixed, ...cats])];
}

function setBidEvalCategory(label) {
  govBidEvalState.category = (!label || label === 'All categories') ? 'all' : label;
  govBidEvalState.page = 1;
  refreshWorkflowUI();
}

function bindBidEvalCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="bidEvalCategory"]');
  if (!wrap || wrap.dataset.bidEvalCatBound) return;
  wrap.dataset.bidEvalCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('bidEvalCategory') : '');
    setBidEvalCategory(label);
  });
}

function setBidEvalPage(page) {
  govBidEvalState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('bidEvalTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBidEvaluationStage(canEdit = true) {
  const data = typeof BID_EVALUATION_DATA !== 'undefined' ? BID_EVALUATION_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Bid evaluation data could not be loaded.</p></div>`;
  const baseRows = getBidEvaluationBaseRows();
  const rows = getBidEvaluationRows();
  const paged = paginateItems(rows, govBidEvalState.page, 10);
  govBidEvalState.page = paged.page;
  const complete = baseRows.filter(r => r.status === 'Evaluation complete').length;
  const periodLabel = getWfPeriodFilterLabel(govBidEvalState);
  const categoryOptions = getBidEvalCategoryOptions();
  const categorySelected = govBidEvalState.category === 'all' ? 'All categories' : govBidEvalState.category;

  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="10"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No evaluations match <strong>${escapeHtmlLite(periodLabel)}</strong>${govBidEvalState.category !== 'all' ? ` · ${escapeHtmlLite(govBidEvalState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setBidEvalCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Bid evaluation — system-assisted review</strong>
        <p>Bid documents are screened and a custom evaluation sheet is prepared for each tender. The committee then records technical and financial outcomes (L1 / QCBS).</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Process</span><strong>${data.meta.process}</strong></div>
      <div class="budget-pr-chip"><span>Sheet format</span><strong>${data.meta.sheetFormat}</strong></div>
      <div class="budget-pr-chip"><span>Committee</span><strong>${data.meta.committee}</strong></div>
      <div class="budget-pr-chip"><span>Complete</span><strong>${complete} / ${baseRows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="bidEvalTable">
      <div class="data-table-wrap need-table">
        <div class="table-header bid-records-header">
          <h3>Bids evaluated — status by category &amp; division <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
          <div class="bid-records-category-filter" title="Filter by category">
            <span class="bid-records-category-label">Category</span>
            ${inlineCustomSelectHTML('bidEvalCategory', categoryOptions, categorySelected)}
          </div>
        </div>
        ${renderCompactWfPeriodFilter('bid', govBidEvalState)}
        <p class="consol-detail-lead" style="margin:0.65rem 0">Item-wise view for Drugs / Equipment / Consumables. Click a row for the evaluation sheet and article coverage.</p>
        <div class="data-table-scroll">
          <table class="data-table consol-detail-table tender-prep-table">
            <thead>
              <tr>
                <th>Eval ID</th>
                <th>Tender</th>
                <th>State / Division</th>
                <th>Category</th>
                <th>Item</th>
                <th>Method</th>
                <th>Status</th>
                <th>L1 / H1</th>
                <th>Bids</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${paged.items.length ? paged.items.map(r => {
                const itemEnc = encodeURIComponent(r.item || '');
                return `
                <tr class="tender-prep-row" onclick="openBidEvaluationDetail('${r.id}', decodeURIComponent('${itemEnc}'))" title="View evaluation details">
                  <td><strong>${r.id}</strong></td>
                  <td>${r.title}<br><span class="cell-sub">${r.tenderId}</span></td>
                  <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                  <td>${r.category}</td>
                  <td>${escapeHtmlLite(r.item || '—')}</td>
                  <td>${r.method}</td>
                  <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                  <td>${r.l1Vendor}</td>
                  <td>${r.bidsReceived}</td>
                  <td class="cell-date">${r.evalDate && r.evalDate !== '—' ? r.evalDate : '—'}</td>
                </tr>`;
              }).join('') : filterEmptyRow}
            </tbody>
          </table>
        </div>
        ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setBidEvalPage') : ''}
      </div>
    </section>
  </div>`;
}

function openBidEvaluationDetail(evalId, focusItem) {
  const r = (typeof BID_EVALUATION_DATA !== 'undefined' ? BID_EVALUATION_DATA.evaluations : []).find(e => e.id === evalId);
  if (!r) return;
  const statusSince = (r.evalDate && r.evalDate !== '—') ? r.evalDate : '—';
  const itemNames = getBidEvalItemNames(r);
  const coverageRow = {
    ...r,
    coveredItems: r.evaluatedItems || itemNames
  };
  const itemHint = focusItem && focusItem !== '—'
    ? `<p class="dvdms-detail-note" style="margin-top:0">Opened from item <strong>${escapeHtmlLite(focusItem)}</strong>.</p>`
    : '';
  openModal(`${r.id} — Bid evaluation`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Bid evaluation</p>
          <h3>${escapeHtmlLite(r.title)}</h3>
          <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category)} · ${escapeHtmlLite(r.state)} (${escapeHtmlLite(r.division)})</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      ${itemHint}
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Method</span><strong>${escapeHtmlLite(r.method)}</strong></div>
        <div class="dvdms-detail-stat"><span>Sheet No.</span><strong>${escapeHtmlLite(r.sheetNo)}</strong></div>
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(r.l1Value)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(statusSince)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'Evaluated',
        noLabel: 'Not evaluated',
        yesHint: 'Line items included in this evaluation sheet',
        noHint: 'In category catalogue · not scored on this evaluation',
        statusHead: 'Eval status',
        filterLabel: 'Eval Status',
        headTitle: `${r.category} articles · evaluation coverage`,
        stageTitle: `${r.category} · category-wise evaluation`,
        noun: 'evaluation'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Evaluation summary</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Tender ID</th><td>${escapeHtmlLite(r.tenderId)}</td></tr>
            <tr><th scope="row">Bids received</th><td>${escapeHtmlLite(String(r.bidsReceived))}</td></tr>
            <tr><th scope="row">Technically qualified</th><td>${escapeHtmlLite(String(r.techQualified))}</td></tr>
            <tr><th scope="row">Technical score / stage</th><td>${escapeHtmlLite(r.techScore)}</td></tr>
            <tr><th scope="row">Financial outcome</th><td>${escapeHtmlLite(r.finScore)}</td></tr>
            <tr><th scope="row">Recommended L1 / H1</th><td>${escapeHtmlLite(r.l1Vendor)}</td></tr>
            <tr><th scope="row">Remarks</th><td>${escapeHtmlLite(r.remarks)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Bidder comparison</div>
        <table class="dvdms-detail-table">
          <thead><tr><th>Bidder</th><th>Technical</th><th>Rank</th><th>Quote</th></tr></thead>
          <tbody>
            ${(r.bidders || []).map(b => `<tr>
              <td><strong>${escapeHtmlLite(b.name)}</strong></td>
              <td>${escapeHtmlLite(b.tech)}</td>
              <td>${escapeHtmlLite(b.rank)}</td>
              <td>${escapeHtmlLite(b.quote)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('bid','eval','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  setTimeout(() => {
    if (typeof bindArticleCoverageStatusFilter === 'function') bindArticleCoverageStatusFilter();
  }, 0);
}

/* ========== Stage 8 Contract Approval ========== */
function getContractStatusDate(r) {
  if (!r) return '—';
  if (r.signedOn && r.signedOn !== '—') return r.signedOn;
  if (r.noaDate && r.noaDate !== '—') return r.noaDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getContractApprovalRows() {
  const seed = typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : [];
  const rows = applyGovStageCategoryFilter(seed, govContractState)
    .map(r => ({ ...r, date: getContractStatusDate(r) }));
  return applyStagePeriodFilter(rows, govContractState, 'date');
}

function setContractApprovalCategory(label) {
  govContractState.category = (!label || label === 'All categories') ? 'all' : label;
  govContractState.page = 1;
  refreshWorkflowUI();
}

function setContractApprovalPage(page) {
  govContractState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('contractApprovalTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderContractApprovalStage(canEdit = true) {
  const data = typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Contract approval data could not be loaded.</p></div>`;
  const rows = getContractApprovalRows();
  const paged = paginateItems(rows, govContractState.page, 10);
  govContractState.page = paged.page;
  const signed = rows.filter(r => r.status === 'Agreement signed').length;
  const periodLabel = getWfPeriodFilterLabel(govContractState);
  const categoryOptions = getGovStageCategoryOptions(typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No contracts match <strong>${escapeHtmlLite(periodLabel)}</strong>${govContractState.category !== 'all' ? ` · ${escapeHtmlLite(govContractState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setContractApprovalCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Contract approval — synced LOI / PBG / T&amp;C gate</strong>
        <p>${data.meta.note} Open each row for timestamped Approve / Clarify / Reject over DVDMS–NIC–tender synced fields (no term re-entry forms).</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Policy gate</span><strong>${data.meta.gate}</strong></div>
      <div class="budget-pr-chip"><span>Agreements signed</span><strong>${signed} / ${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="contractApprovalTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Contract approvals — synced register',
          stageKey: 'contract',
          filterState: govContractState,
          selectId: 'contractApprovalCategory',
          categoryOptions,
          lead: 'Open a tender to record a <strong>timestamped decision</strong> on pre-filled synced data. Full lifecycle lives under <strong>Contract Management</strong>.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Tender</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>L1 bidder</th>
              <th>Status</th>
              <th class="th-value">Est. value</th>
              <th class="th-date">Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => {
              const saved = govContractState.approvals[r.id];
              const actionLabel = saved?.decision === 'Approved' || r.status === 'Agreement signed'
                ? 'View decision'
                : 'Open approval gate';
              return `
              <tr class="tender-prep-row" onclick="openContractApprovalDetail('${r.id}')" title="Open timestamped approval gate">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.tenderId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${r.l1Vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td class="cell-nowrap">${r.value}</td>
                <td class="cell-date">${r.date || '—'}</td>
                <td><span class="cell-link">${actionLabel} <i class="fa-solid fa-arrow-right"></i></span></td>
              </tr>`;
            }).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setContractApprovalPage') : ''}
      </div>
    </section>
  </div>`;
}

function getContractApprovalFormDefaults(r) {
  const saved = govContractState.approvals[r.id] || {};
  const alreadySigned = r.status === 'Agreement signed';
  return {
    decision: saved.decision || (alreadySigned ? 'Approved' : 'Pending review'),
    authority: saved.authority || (authUser?.name || 'Dr. Rajesh Sharma') + ' — Resource Manager',
    designation: saved.designation || 'Competent Authority / Contract Approving Officer',
    office: saved.office || `DoPHFW · ${r.division} Division, Madhya Pradesh`,
    sanctionRef: saved.sanctionRef || `SAN/MP/${r.category.slice(0, 3).toUpperCase()}/2026/${r.id.slice(-3)}`,
    contractPeriod: saved.contractPeriod || '24 months from agreement date',
    deliveryTerms: saved.deliveryTerms || 'As per NIT / rate-contract schedule',
    pbgRequired: saved.pbgRequired || 'Yes — 5% to 10% of contract value (SFMS / e-BG)',
    ldClause: saved.ldClause || 'Liquidated damages as per GFR / NIT for delayed supply',
    priceFall: saved.priceFall || 'Yes — price fall clause applicable',
    remarks: saved.remarks || r.remarks || '',
    checks: saved.checks || {
      evalDone: alreadySigned || r.status !== 'Awaiting L1 lock',
      l1Confirmed: alreadySigned || (r.l1Vendor && !String(r.l1Vendor).includes('Pending')),
      budgetOk: alreadySigned || r.financeStatus === 'Cleared',
      legalOk: alreadySigned || r.legalStatus === 'Cleared',
      noaOk: alreadySigned || !!(r.noaNo && r.noaNo !== '—'),
      draftOk: alreadySigned || !!(r.agreementNo && r.agreementNo !== '—'),
      gfrOk: alreadySigned,
      conflictOk: alreadySigned
    },
    decidedOn: saved.decidedOn || (alreadySigned ? r.signedOn : ''),
    readonly: alreadySigned || saved.decision === 'Approved' || saved.decision === 'Rejected'
  };
}

function openContractApprovalDetail(contractId) {
  const r = (typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : []).find(c => c.id === contractId);
  if (!r) return;
  const f = getContractApprovalFormDefaults(r);
  const locked = f.readonly;
  const statusSince = getContractStatusDate(r);
  const award = (typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : []).find(a => a.contractId === r.id || a.tenderId === r.tenderId);
  const loiAck = award?.loaAck || '—';
  const pbgOk = award?.pbgStatus === 'Received' || r.status === 'Agreement signed';
  const gateOk = (loiAck === 'Acknowledged' || r.status === 'Agreement signed') && (pbgOk || r.status === 'Agreement signed');
  const followUpBtn = `<button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('contract','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>`;

  openModal(`${r.id} — Timestamped approval gate`, `
    <div class="consol-detail-modal ca-form-modal">
      <div class="tender-detail-section-head" style="margin:0 0 0.75rem">
        <p class="consol-detail-lead" style="margin:0">${r.title} · ${r.category} · ${r.state} (${r.division})</p>
        ${followUpBtn}
      </div>
      <div class="src-badge-row" style="margin-bottom:0.75rem">
        <span class="src-badge src-dvdms">DVDMS</span>
        <span class="src-badge src-nic">NIC</span>
        <span class="src-badge src-tender">Tender</span>
        <span class="src-badge src-eoffice">Eoffice</span>
      </div>
      <div class="consol-detail-stats" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        <div class="consol-detail-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="consol-detail-stat"><span>L1 bidder</span><strong>${r.l1Vendor}</strong></div>
        <div class="consol-detail-stat"><span>LOI / NOA</span><strong class="cell-nowrap">${r.noaNo}</strong></div>
        <div class="consol-detail-stat"><span>Est. value</span><strong class="cell-nowrap">${r.value}</strong></div>
        <div class="consol-detail-stat"><span>Status since</span><strong class="cell-date">${statusSince}</strong></div>
      </div>

      <div class="ca-policy-note">
        <i class="fa-solid fa-scale-balanced"></i>
        <div>
          <strong>Execution gate — signed post LOI acceptance and PBG receive</strong>
          <p>Terms below are synced from NIC / DVDMS / tender templates. Record Approve / Clarify / Reject with timestamp only. Do not re-key master T&amp;C here.</p>
        </div>
      </div>

      <h4 class="budget-subhead">1. Synced award &amp; agreement summary</h4>
      <div class="consol-detail-table-wrap" style="margin-bottom:1rem">
        <table class="data-table consol-detail-table">
          <tbody>
            <tr><td>Tender ID</td><td><strong>${r.tenderId}</strong></td></tr>
            <tr><td>Contract ID</td><td><strong>${r.id}</strong></td></tr>
            <tr><td>LOI / NOA</td><td><strong class="cell-nowrap">${r.noaNo}</strong> · ${r.noaDate && r.noaDate !== '—' ? r.noaDate : '—'}</td></tr>
            <tr><td>LOI acknowledgement</td><td>${loiAck}</td></tr>
            <tr><td>PBG status</td><td>${award?.pbgStatus || '—'} · ${award?.pbgRef || '—'}</td></tr>
            <tr><td>Sign gate</td><td><strong>${gateOk ? 'Ready — LOI accept + PBG receive' : 'Blocked until LOI accept + PBG receive'}</strong></td></tr>
            <tr><td>Agreement No.</td><td><strong>${r.agreementNo}</strong></td></tr>
            <tr><td>Legal / Finance</td><td><span class="badge badge-${needStatusBadge(r.legalStatus)}">${r.legalStatus}</span> · <span class="badge badge-${needStatusBadge(r.financeStatus)}">${r.financeStatus}</span></td></tr>
            <tr><td>Period / delivery / PBG / LD</td><td>${f.contractPeriod} · ${f.deliveryTerms} · ${f.pbgRequired} · ${f.ldClause}</td></tr>
            <tr><td>Price fall</td><td>${f.priceFall}</td></tr>
            <tr><td>Sanction ref (synced)</td><td>${f.sanctionRef}</td></tr>
            <tr><td>Signed / decision stamp</td><td><strong class="cell-date">${f.decidedOn || r.signedOn || '—'}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <h4 class="budget-subhead">2. Decision (timestamped)</h4>
      <div class="form-grid wf-form-grid ca-form-grid">
        <div class="form-group"><label>Approving authority</label>
          <input id="caAuthority" type="text" value="${f.authority}" readonly>
        </div>
        <div class="form-group"><label>Designation</label>
          <input id="caDesignation" type="text" value="${f.designation}" readonly>
        </div>
        <div class="form-group"><label>Office / Division</label>
          <input id="caOffice" type="text" value="${f.office}" readonly>
        </div>
        <div class="form-group"><label>Sanction / budget reference</label>
          <input id="caSanction" type="text" value="${f.sanctionRef}" readonly>
        </div>
        <input type="hidden" id="caPeriod" value="${f.contractPeriod}">
        <input type="hidden" id="caDelivery" value="${f.deliveryTerms}">
        <input type="hidden" id="caPbg" value="${f.pbgRequired}">
        <input type="hidden" id="caLd" value="${f.ldClause}">
        <input type="hidden" id="caPriceFall" value="${f.priceFall}">
        ${['evalDone','l1Confirmed','budgetOk','legalOk','noaOk','draftOk','gfrOk','conflictOk'].map(id =>
          `<input type="hidden" id="caChk_${id}" ${f.checks[id] ? 'checked' : ''} data-checked="${f.checks[id] ? '1' : '0'}">`
        ).join('')}
        ${locked
          ? `<div class="form-group"><label>Decision</label><input type="text" value="${f.decision}" readonly></div>
             <div class="form-group"><label>Decision timestamp</label><input type="text" value="${f.decidedOn || '—'}" readonly></div>`
          : customSelectHTML('Decision', 'caDecision', ['Pending review', 'Approved', 'Seek clarification', 'Rejected'], f.decision === 'Pending review' ? 'Pending review' : f.decision, true)}
        <div class="form-group full"><label>${reqLabel('Remarks / conditions')}</label>
          <textarea id="caRemarks" rows="3" placeholder="Optional conditions for the decision…" ${locked ? 'readonly' : ''}>${f.remarks}</textarea>
        </div>
      </div>

      ${locked ? `
        <div class="ca-decision-banner ca-decision-banner--${(f.decision || '').toLowerCase().replace(/\s+/g, '-')}">
          <i class="fa-solid fa-${f.decision === 'Approved' ? 'circle-check' : f.decision === 'Rejected' ? 'circle-xmark' : 'circle-info'}"></i>
          <div>
            <strong>Decision recorded: ${f.decision}</strong>
            <p>Timestamp locked. Synced T&amp;C remain available in Contract Management.</p>
          </div>
        </div>
        <div class="modal-inline-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back to list</button>
          <button type="button" class="btn btn-primary" onclick="navigateTo('contract-mgmt')"><i class="fa-solid fa-file-signature"></i> Contract Management</button>
        </div>
      ` : `
        <div class="modal-inline-actions ca-form-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
          <button type="button" class="btn btn-outline" onclick="submitContractApprovalForm('${r.id}','clarify')"><i class="fa-solid fa-envelope-open-text"></i> Seek clarification</button>
          <button type="button" class="btn btn-outline ca-btn-reject" onclick="submitContractApprovalForm('${r.id}','reject')"><i class="fa-solid fa-ban"></i> Reject</button>
          <button type="button" class="btn btn-primary" onclick="submitContractApprovalForm('${r.id}','approve')"><i class="fa-solid fa-stamp"></i> Approve with timestamp</button>
        </div>
      `}
    </div>
  `, { wide: true, large: true, extraWide: true });
  if (typeof initCustomSelects === 'function') initCustomSelects();
}

function captureContractApprovalForm(contractId) {
  const readChk = (id) => {
    const el = document.getElementById('caChk_' + id);
    if (!el) return true;
    if (el.type === 'hidden') return el.dataset.checked === '1' || el.value === '1';
    return !!el.checked;
  };
  const checks = {
    evalDone: readChk('evalDone'),
    l1Confirmed: readChk('l1Confirmed'),
    budgetOk: readChk('budgetOk'),
    legalOk: readChk('legalOk'),
    noaOk: readChk('noaOk'),
    draftOk: readChk('draftOk'),
    gfrOk: readChk('gfrOk'),
    conflictOk: readChk('conflictOk')
  };
  return {
    authority: document.getElementById('caAuthority')?.value?.trim() || '',
    designation: document.getElementById('caDesignation')?.value?.trim() || '',
    office: document.getElementById('caOffice')?.value?.trim() || '',
    sanctionRef: document.getElementById('caSanction')?.value?.trim() || '',
    contractPeriod: document.getElementById('caPeriod')?.value?.trim() || '',
    deliveryTerms: document.getElementById('caDelivery')?.value?.trim() || '',
    pbgRequired: document.getElementById('caPbg')?.value?.trim() || '',
    ldClause: document.getElementById('caLd')?.value?.trim() || '',
    priceFall: document.getElementById('caPriceFall')?.value?.trim() || '',
    remarks: document.getElementById('caRemarks')?.value?.trim() || '',
    checks
  };
}

function submitContractApprovalForm(contractId, action) {
  const r = (typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : []).find(c => c.id === contractId);
  if (!r) return;
  if (r.status === 'Awaiting L1 lock') {
    showWfAlert('L1 is not yet locked for this tender. Complete bid evaluation before contract approval.');
    return;
  }

  const form = captureContractApprovalForm(contractId);
  if (!form.authority || !form.designation || !form.sanctionRef) {
    showWfAlert('Approving authority, designation and sanction reference must be present on the synced record.');
    return;
  }
  if (!form.remarks) {
    form.remarks = action === 'approve' ? 'Approved on synced DVDMS/NIC/tender terms.' : 'Decision recorded.';
  }

  if (action === 'approve') {
    const award = (typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : []).find(a => a.contractId === contractId || a.tenderId === r.tenderId);
    const loiAck = award?.loaAck;
    const pbgOk = award?.pbgStatus === 'Received' || r.status === 'Agreement signed';
    if (loiAck && loiAck !== 'Acknowledged' && loiAck !== '—') {
      showWfAlert('Contract cannot be signed until LOI / LOA is acknowledged by the vendor.');
      return;
    }
    if (award && !pbgOk && award.pbgStatus === 'Pending') {
      showWfAlert('Contract cannot be signed until PBG is received (post LOI acceptance).');
      return;
    }
    const missing = Object.entries(form.checks).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      showWfAlert('Synced pre-conditions are incomplete for this award. Review Contract Management before approving.');
      return;
    }
    if (r.legalStatus === 'Not started' || r.financeStatus === 'Not started') {
      showWfAlert('Legal and finance clearance should be at least under review before final contract approval.');
      return;
    }
  }

  const today = typeof formatDateDMY === 'function' ? formatDateDMY(APP_TODAY) : '03-09-2026';
  let decision = 'Pending review';
  if (action === 'approve') {
    decision = 'Approved';
    r.status = 'Agreement signed';
    r.legalStatus = 'Cleared';
    r.financeStatus = 'Cleared';
    r.signedOn = today;
    if (!r.agreementNo || r.agreementNo === '—' || String(r.agreementNo).startsWith('Draft')) {
      r.agreementNo = `AGR/MP/2026/${contractId.slice(-3)}`;
    }
  } else if (action === 'clarify') {
    decision = 'Seek clarification';
    r.status = 'Clarification sought';
  } else if (action === 'reject') {
    decision = 'Rejected';
    r.status = 'Not approved';
  }

  govContractState.approvals[contractId] = {
    ...form,
    decision,
    decidedOn: today
  };

  refreshWorkflowUI();
  closeModal();

  const titles = {
    approve: 'Contract approved',
    clarify: 'Clarification sought',
    reject: 'Contract not approved'
  };
  const messages = {
    approve: `Timestamped approval recorded. Contract <strong>${contractId}</strong> for <strong>${r.title}</strong> is approved. Agreement No. <strong>${r.agreementNo}</strong>. Purchase Order may proceed in DVDMS after award activation.`,
    clarify: `Clarification has been recorded for <strong>${contractId}</strong> against synced contract terms.`,
    reject: `Rejection recorded for <strong>${contractId}</strong>. Status set to <strong>Not approved</strong>.`
  };

  openModal(titles[action], `
    <div class="sync-success-msg">
      <div class="sync-success-icon"><i class="fa-solid fa-${action === 'approve' ? 'file-signature' : action === 'clarify' ? 'envelope-open-text' : 'ban'}"></i></div>
      <h4>${titles[action]}</h4>
      <p>${messages[action]}</p>
      <p class="report-footnote" style="margin-top:0.75rem"><i class="fa-solid fa-user-tie"></i> Authority: <strong>${form.authority}</strong> · ${form.designation}</p>
    </div>
  `);
}

/* ========== Stage 9 Award ========== */
function getAwardStatusDate(r) {
  if (!r) return '—';
  if (r.loaDate && r.loaDate !== '—') return r.loaDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getAwardStageRows() {
  const seed = typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : [];
  const rows = applyGovStageCategoryFilter(seed, govAwardState)
    .map(r => ({ ...r, date: getAwardStatusDate(r) }));
  return applyStagePeriodFilter(rows, govAwardState, 'date');
}

function setAwardStageCategory(label) {
  govAwardState.category = (!label || label === 'All categories') ? 'all' : label;
  govAwardState.page = 1;
  refreshWorkflowUI();
}

function setAwardStagePage(page) {
  govAwardState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('awardStageTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAwardStage(canEdit = true) {
  const data = typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Award data could not be loaded.</p></div>`;
  const rows = getAwardStageRows();
  const paged = paginateItems(rows, govAwardState.page, 10);
  govAwardState.page = paged.page;
  const active = rows.filter(r => r.status === 'Award active').length;
  const pbgPending = rows.filter(r => r.pbgStatus === 'Pending').length;
  const periodLabel = getWfPeriodFilterLabel(govAwardState);
  const categoryOptions = getGovStageCategoryOptions(typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No awards match <strong>${escapeHtmlLite(periodLabel)}</strong>${govAwardState.category !== 'all' ? ` · ${escapeHtmlLite(govAwardState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setAwardStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Award — LOA, PBG &amp; checklist</strong>
        <p>${data.meta.note}</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Awards active</span><strong>${active}</strong></div>
      <div class="budget-pr-chip"><span>PBG pending</span><strong>${pbgPending}</strong></div>
      <div class="budget-pr-chip"><span>Shown</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="awardStageTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Tenders awarded — status by category &amp; division',
          stageKey: 'award',
          filterState: govAwardState,
          selectId: 'awardStageCategory',
          categoryOptions,
          lead: 'Click a row for LOA details, PBG collection status and checklist progress.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Award</th>
              <th>Tender</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>PBG</th>
              <th>Est. value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row" onclick="openAwardStageDetail('${r.id}')" title="View award details">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.tenderId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${r.vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td><span class="badge badge-${needStatusBadge(r.pbgStatus)}">${r.pbgStatus}</span></td>
                <td class="cell-nowrap">${r.value}</td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setAwardStagePage') : ''}
      </div>
    </section>
  </div>`;
}

function openAwardStageDetail(awardId) {
  const data = typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA : null;
  const r = data?.awards?.find(a => a.id === awardId);
  if (!r) return;
  const statusSince = getAwardStatusDate(r);
  const awaiting = /awaiting/i.test(String(r.status || ''));
  const coveredItems = awaiting ? [] : getGovStageCoveredItems(r, { take: 6 });
  const coverageRow = { ...r, coveredItems, forceEmptyCoverage: awaiting };
  const checks = data.checklistTemplate.map(item => {
    const done = !!(r.checklist && r.checklist[item.id]);
    return `<article class="budget-check-item ${done ? 'is-done' : 'is-open'}">
      <div class="budget-check-icon"><i class="fa-solid ${done ? 'fa-circle-check' : 'fa-circle'}"></i></div>
      <div class="budget-check-body">
        <div class="budget-check-title-row">
          <strong>${item.title}</strong>
          <span class="badge badge-${done ? 'success' : 'muted'}">${done ? 'Done' : 'Pending'}</span>
        </div>
        <p>${item.detail}</p>
      </div>
    </article>`;
  }).join('');

  openModal(`${escapeHtmlLite(r.id)} — Award details`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Award details</p>
          <h3>${escapeHtmlLite(r.title)}</h3>
          <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category)} · ${escapeHtmlLite(r.state)} (${escapeHtmlLite(r.division)})</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Vendor</span><strong>${escapeHtmlLite(r.vendor)}</strong></div>
        <div class="dvdms-detail-stat"><span>PBG</span><strong>${escapeHtmlLite(r.pbgStatus)}</strong></div>
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(r.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(statusSince)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'Awarded',
        noLabel: 'Not awarded',
        yesHint: 'Line items covered under this LOA / award',
        noHint: awaiting
          ? 'Catalogue articles · award not issued yet'
          : 'In category catalogue · not part of this award',
        statusHead: 'Award status',
        filterLabel: 'Award Status',
        headTitle: `${r.category} articles · award coverage`,
        stageTitle: `${r.category} · category-wise award`,
        noun: 'award'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">LOA details</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Tender ID</th><td>${escapeHtmlLite(r.tenderId)}</td></tr>
            <tr><th scope="row">LOA No.</th><td>${escapeHtmlLite(r.loaNo)}</td></tr>
            <tr><th scope="row">LOA date</th><td>${escapeHtmlLite(r.loaDate && r.loaDate !== '—' ? r.loaDate : '—')}</td></tr>
            <tr><th scope="row">LOA acknowledgement</th><td>${escapeHtmlLite(r.loaAck)}</td></tr>
            <tr><th scope="row">Contract ID</th><td>${escapeHtmlLite(r.contractId)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">PBG collection</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">PBG status</th><td>${escapeHtmlLite(r.pbgStatus)}</td></tr>
            <tr><th scope="row">PBG amount (range)</th><td>${escapeHtmlLite(r.pbgAmount)}</td></tr>
            <tr><th scope="row">Due by</th><td>${escapeHtmlLite(r.pbgDue && r.pbgDue !== '—' ? r.pbgDue : '—')}</td></tr>
            <tr><th scope="row">BG / SFMS reference</th><td>${escapeHtmlLite(r.pbgRef)}</td></tr>
          </tbody>
        </table>
      </div>
      <h4 class="budget-subhead">Award checklist for this tender</h4>
      <div class="budget-checklist">${checks}</div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('award','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  bindGovStageCoverageFilter();
}

/* ========== Stage 10 Purchase Order ========== */
function getPoStatusDate(r) {
  if (!r) return '—';
  if (r.poDate && r.poDate !== '—') return r.poDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getPurchaseOrderRows() {
  const seed = typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : [];
  const rows = applyGovStageCategoryFilter(seed, govPoState)
    .map(r => ({ ...r, date: getPoStatusDate(r) }));
  return applyStagePeriodFilter(rows, govPoState, 'date');
}

function setPoStageCategory(label) {
  govPoState.category = (!label || label === 'All categories') ? 'all' : label;
  govPoState.page = 1;
  refreshWorkflowUI();
}

function setPurchaseOrderPage(page) {
  govPoState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('purchaseOrderTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPurchaseOrderStage(canEdit = true) {
  const data = typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Purchase order data could not be loaded.</p></div>`;
  const rows = getPurchaseOrderRows();
  const paged = paginateItems(rows, govPoState.page, 10);
  govPoState.page = paged.page;
  const issued = rows.filter(r => r.status === 'PO issued' || r.status === 'Delivery scheduled' || r.status === 'Vendor notified').length;
  const draft = rows.filter(r => r.status === 'Draft PO' || r.status === 'Pending contract').length;
  const awaiting = rows.filter(r => r.status === 'Awaiting award').length;
  const periodLabel = getWfPeriodFilterLabel(govPoState);
  const categoryOptions = getGovStageCategoryOptions(typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No purchase orders match <strong>${escapeHtmlLite(periodLabel)}</strong>${govPoState.category !== 'all' ? ` · ${escapeHtmlLite(govPoState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setPoStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Purchase order — raised in DVDMS</strong>
        <p>${data.meta.note}</p>
      </div>
      <div class="indent-mode-banner-actions" style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;justify-content:flex-end">
        <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
        <button type="button" class="btn btn-primary btn-sm" onclick="openGeneratePurchaseOrderForm()" title="Generate PO from tender, bidder and template">
          <i class="fa-solid fa-file-circle-plus"></i> Generate Purchase Order
        </button>
      </div>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>POs awarded / active</span><strong>${issued}</strong></div>
      <div class="budget-pr-chip"><span>Draft / pending</span><strong>${draft}</strong></div>
      <div class="budget-pr-chip"><span>Awaiting award</span><strong>${awaiting}</strong></div>
      <div class="budget-pr-chip"><span>Shown</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="purchaseOrderTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Purchase orders — status by category &amp; division',
          stageKey: 'po',
          filterState: govPoState,
          selectId: 'poStageCategory',
          categoryOptions,
          lead: 'State-wise / division-wise view of awarded POs. Click a row for delivery schedule, terms and vendor notification details.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>PO ID</th>
              <th>Tender</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Vendor notified</th>
              <th>Est. value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row" onclick="openPurchaseOrderDetail('${r.id}')" title="View purchase order details">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.tenderId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${r.vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td><span class="badge badge-${needStatusBadge(r.vendorNotified)}">${r.vendorNotified}</span></td>
                <td class="cell-nowrap">${r.value}</td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setPurchaseOrderPage') : ''}
      </div>
    </section>
  </div>`;
}

function openPurchaseOrderDetail(poId) {
  const r = (typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : []).find(o => o.id === poId);
  if (!r) return;
  const statusSince = getPoStatusDate(r);
  const deliveryWindow = (r.deliveryStart && r.deliveryStart !== '—' && r.deliveryEnd && r.deliveryEnd !== '—')
    ? `${r.deliveryStart} – ${r.deliveryEnd}`
    : '—';
  const awaiting = /awaiting/i.test(String(r.status || ''));
  const coveredItems = awaiting ? [] : getGovStageCoveredItems(r, { take: Math.min(8, Number(r.lines) || 5) });
  const coverageRow = { ...r, coveredItems, forceEmptyCoverage: awaiting };
  const canGenerate = r.status === 'Draft PO' || r.status === 'Pending contract';
  openModal(`${escapeHtmlLite(r.id)} — Purchase order`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Purchase order</p>
          <h3>${escapeHtmlLite(r.title)}</h3>
          <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category)} · ${escapeHtmlLite(r.state)} (${escapeHtmlLite(r.division)})</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Vendor</span><strong>${escapeHtmlLite(r.vendor)}</strong></div>
        <div class="dvdms-detail-stat"><span>Vendor notified</span><strong>${escapeHtmlLite(r.vendorNotified)}</strong></div>
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(r.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(statusSince)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'On PO',
        noLabel: 'Not on PO',
        yesHint: 'Line items included on this purchase order',
        noHint: awaiting
          ? 'Catalogue articles · PO not generated yet'
          : 'In category catalogue · not on this PO',
        statusHead: 'PO status',
        filterLabel: 'PO Status',
        headTitle: `${r.category} articles · PO coverage`,
        stageTitle: `${r.category} · category-wise PO`,
        noun: 'purchase order'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">PO &amp; contract linkage</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Award ID</th><td>${escapeHtmlLite(r.awardId)}</td></tr>
            <tr><th scope="row">Contract ID</th><td>${escapeHtmlLite(r.contractId)}</td></tr>
            <tr><th scope="row">PO date</th><td>${escapeHtmlLite(r.poDate && r.poDate !== '—' ? r.poDate : '—')}</td></tr>
            <tr><th scope="row">Acknowledgement</th><td>${escapeHtmlLite(r.ackStatus)}</td></tr>
            <tr><th scope="row">Line items</th><td>${escapeHtmlLite(String(r.lines))}</td></tr>
            ${r.templateLabel ? `<tr><th scope="row">PO template used</th><td>${escapeHtmlLite(r.templateLabel)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Delivery schedule &amp; terms</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Ship to</th><td>${escapeHtmlLite(r.shipTo)}</td></tr>
            <tr><th scope="row">Delivery window</th><td>${escapeHtmlLite(deliveryWindow)}</td></tr>
            <tr><th scope="row">Schedule</th><td>${escapeHtmlLite(r.schedule)}</td></tr>
            <tr><th scope="row">Payment terms</th><td>${escapeHtmlLite(r.paymentTerms)}</td></tr>
            <tr><th scope="row">Contract terms</th><td>${escapeHtmlLite(r.terms)}</td></tr>
            <tr><th scope="row">Remarks</th><td>${escapeHtmlLite(r.remarks)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        ${canGenerate ? `
        <button type="button" class="btn btn-outline" onclick="openGeneratePurchaseOrderForm('${r.id}')">
          <i class="fa-solid fa-file-circle-plus"></i> Generate Purchase Order
        </button>` : ''}
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('po','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  bindGovStageCoverageFilter();
}

function getPoTemplatesList() {
  return (typeof PO_TEMPLATES !== 'undefined' && PO_TEMPLATES.length)
    ? PO_TEMPLATES
    : [{ id: '1', label: 'Template 1 — MPPHCL Standard Purchase Order', hint: 'Standard MPPHCL PO layout.' }];
}

function getEligiblePoGenerateRows() {
  const allow = new Set(['Draft PO', 'Pending contract']);
  return (typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : [])
    .filter(r => allow.has(r.status));
}

function fillGenPoFormFields(r) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  const setDate = (id, val) => {
    const v = (val && val !== '—') ? val : '';
    const input = document.getElementById(id);
    const label = document.getElementById(`${id}Value`);
    if (input) input.value = v;
    if (label) {
      label.textContent = v || 'Select date';
      label.classList.toggle('is-placeholder', !v);
    }
  };
  if (!r) {
    ['genPoTenderId', 'genPoTitle', 'genPoCategory', 'genPoDivision', 'genPoAwardId', 'genPoContractId',
      'genPoVendor', 'genPoValue', 'genPoLines', 'genPoPayment', 'genPoShipTo', 'genPoTerms', 'genPoRemarks'
    ].forEach(id => set(id, ''));
    setDate('genPoDeliveryStart', '');
    setDate('genPoDeliveryEnd', '');
    return;
  }
  set('genPoTenderId', r.tenderId);
  set('genPoTitle', r.title);
  set('genPoCategory', r.category);
  set('genPoDivision', `${r.state || 'Madhya Pradesh'} · ${r.division || '—'}`);
  set('genPoAwardId', r.awardId);
  set('genPoContractId', r.contractId && r.contractId !== '—' ? r.contractId : '—');
  set('genPoVendor', r.vendor);
  set('genPoValue', r.value);
  set('genPoLines', String(r.lines ?? '—'));
  set('genPoPayment', r.paymentTerms || '—');
  set('genPoShipTo', r.shipTo || '—');
  set('genPoTerms', r.terms || '—');
  setDate('genPoDeliveryStart', r.deliveryStart);
  setDate('genPoDeliveryEnd', r.deliveryEnd);
  set('genPoRemarks', r.remarks || '');
}

const GEN_PO_SOURCE_PLACEHOLDER = 'Select draft / pending PO…';
const GEN_PO_TEMPLATE_PLACEHOLDER = 'Select PO template…';

function genPoSourceLabel(r) {
  return `${r.id} — ${r.title} (${r.vendor})`;
}

function resolveGenPoFromSelect() {
  const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('genPoSource') : '';
  if (!label || label === GEN_PO_SOURCE_PLACEHOLDER) return null;
  const id = (label.split(' — ')[0] || '').trim();
  return getEligiblePoGenerateRows().find(o => o.id === id) || null;
}

function resolveGenPoTemplateFromSelect() {
  const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('genPoTemplate') : '';
  if (!label || label === GEN_PO_TEMPLATE_PLACEHOLDER) return null;
  return getPoTemplatesList().find(t => t.label === label) || null;
}

function onGenPoSourceChange() {
  fillGenPoFormFields(resolveGenPoFromSelect());
}

function onGenPoTemplateChange() {
  const t = resolveGenPoTemplateFromSelect();
  const hint = document.getElementById('genPoTemplateHint');
  if (hint) hint.textContent = t?.hint || '';
}

function bindGenPoSelectListeners() {
  const source = document.querySelector('.custom-select[data-select-id="genPoSource"]');
  const template = document.querySelector('.custom-select[data-select-id="genPoTemplate"]');
  source?.addEventListener('change', onGenPoSourceChange);
  template?.addEventListener('change', onGenPoTemplateChange);
}

function openGeneratePurchaseOrderForm(preselectId) {
  if (currentRole !== 'gov') return;
  const eligible = getEligiblePoGenerateRows();
  if (!eligible.length) {
    showWfAlert('No draft or pending-contract purchase orders are available to generate right now.');
    return;
  }
  const preselected = preselectId ? eligible.find(r => r.id === preselectId) : null;
  const templates = getPoTemplatesList();
  const sourceLabels = eligible.map(genPoSourceLabel);
  const templateLabels = templates.map(t => t.label);
  const sourceSelected = preselected ? genPoSourceLabel(preselected) : GEN_PO_SOURCE_PLACEHOLDER;
  const sourceSelect = customSelectHTML('Draft / pending PO', 'genPoSource', sourceLabels, sourceSelected, true)
    .replace('class="form-group"', 'class="form-group full"');
  const templateSelect = customSelectHTML('PO template', 'genPoTemplate', templateLabels, GEN_PO_TEMPLATE_PLACEHOLDER, true)
    .replace('class="form-group"', 'class="form-group full"');

  openModal('Generate Purchase Order', `
    <div class="indent-modal-form kpi-detail">
      <p class="consol-detail-lead" style="margin-top:0">
        Select a draft PO linked to an executed contract, review tender &amp; bidder details, choose a PO template
        (same family vendors use when downloading POs for <strong>Active</strong> + <strong>Delivery Completed</strong> contracts), then issue the PO.
      </p>

      <h4 class="budget-subhead">1. Source PO / contract</h4>
      <div class="form-grid wf-form-grid">
        ${sourceSelect}
      </div>

      <h4 class="budget-subhead">2. Tender details</h4>
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>Tender / RC No.</label><input id="genPoTenderId" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Award ID</label><input id="genPoAwardId" type="text" readonly placeholder="—"></div>
        <div class="form-group full"><label>Tender / item title</label><input id="genPoTitle" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Category</label><input id="genPoCategory" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>State / Division</label><input id="genPoDivision" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Contract / LOA No.</label><input id="genPoContractId" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Est. value</label><input id="genPoValue" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Line items</label><input id="genPoLines" type="text" readonly placeholder="—"></div>
      </div>

      <h4 class="budget-subhead">3. Bidder / vendor details</h4>
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>Selected bidder (L1)</label><input id="genPoVendor" type="text" readonly placeholder="—"></div>
        <div class="form-group"><label>Payment terms</label><input id="genPoPayment" type="text" readonly placeholder="—"></div>
        <div class="form-group full"><label>Ship to / Consignee</label><input id="genPoShipTo" type="text" readonly placeholder="—"></div>
        <div class="form-group full"><label>Contract terms</label><input id="genPoTerms" type="text" readonly placeholder="—"></div>
      </div>

      <h4 class="budget-subhead">4. PO template &amp; delivery</h4>
      <div class="form-grid wf-form-grid">
        ${templateSelect}
        <p id="genPoTemplateHint" class="download-confirm-hint form-group full" style="margin:0"></p>
        ${datePickerHTML('genPoDeliveryStart', '', 'Delivery start')}
        ${datePickerHTML('genPoDeliveryEnd', '', 'Delivery end')}
        <div class="form-group full"><label>Remarks</label>
          <textarea id="genPoRemarks" rows="2" placeholder="Any conditions before vendor notification…"></textarea>
        </div>
      </div>

      <div class="modal-inline-actions" style="margin-top:1rem">
        <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
        <button type="button" class="btn btn-primary" onclick="submitGeneratePurchaseOrder()">
          <i class="fa-solid fa-file-signature"></i> Issue Purchase Order
        </button>
      </div>
    </div>
  `, { wide: true, large: true });

  if (typeof initCustomSelects === 'function') initCustomSelects();
  bindGenPoSelectListeners();
  fillGenPoFormFields(preselected || null);
}

function submitGeneratePurchaseOrder() {
  const r = resolveGenPoFromSelect();
  const template = resolveGenPoTemplateFromSelect();
  if (!r) {
    showWfAlert('Please select a draft / pending purchase order first.');
    return;
  }
  if (!template) {
    showWfAlert('Please select a PO template before issuing.');
    return;
  }
  if (!r.contractId || r.contractId === '—') {
    showWfAlert('Contract / LOA is not linked yet. Complete contract execution before issuing this PO.');
    return;
  }

  const templateId = template.id;
  const today = formatDateDMY(APP_TODAY);
  const deliveryStart = document.getElementById('genPoDeliveryStart')?.value?.trim() || today;
  const deliveryEnd = document.getElementById('genPoDeliveryEnd')?.value?.trim() || r.deliveryEnd || '—';
  const remarks = document.getElementById('genPoRemarks')?.value?.trim() || r.remarks || '';

  r.status = 'PO issued';
  r.vendorNotified = 'Notified';
  r.ackStatus = 'Sent';
  r.poDate = today;
  r.date = today;
  r.deliveryStart = deliveryStart;
  r.deliveryEnd = deliveryEnd && deliveryEnd !== '—' ? deliveryEnd : deliveryStart;
  r.schedule = r.schedule && r.schedule !== '—' ? r.schedule : 'As per issued PO delivery window';
  r.remarks = remarks
    ? `${remarks} · Issued on ${today} using ${template.label}.`
    : `Issued on ${today} using ${template.label}.`;
  r.templateId = templateId;
  r.templateLabel = template.label;

  if (typeof PURCHASE_ORDER_DATA !== 'undefined' && PURCHASE_ORDER_DATA.meta) {
    PURCHASE_ORDER_DATA.meta.lastUpdated = `${today} (demo)`;
  }

  try { persistGovLifecycle?.(); } catch (_) { /* optional */ }
  closeModal();
  refreshWorkflowUI();
  setTimeout(() => {
    openModal('Purchase Order issued', `
      <div class="sync-success-msg">
        <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h4>PO generated successfully</h4>
        <p>
          <strong>${escapeHtmlLite(r.id)}</strong> issued for
          <strong>${escapeHtmlLite(r.title)}</strong> · bidder
          <strong>${escapeHtmlLite(r.vendor)}</strong>.
        </p>
        <p style="margin-top:0.5rem">
          Template: <strong>${escapeHtmlLite(r.templateLabel)}</strong><br>
          Vendor notification: <strong>Notified</strong> (demo) · Tender <strong>${escapeHtmlLite(r.tenderId)}</strong>
        </p>
      </div>
      <div class="modal-inline-actions" style="margin-top:1rem;justify-content:center">
        <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-primary" onclick="openPurchaseOrderDetail('${r.id}')">
          <i class="fa-solid fa-eye"></i> View PO details
        </button>
      </div>
    `);
  }, 80);
}

/* ========== Stage 11 GRN & Inspection ========== */
function getGrnStatusDate(r) {
  if (!r) return '—';
  if (r.grnDate && r.grnDate !== '—') return r.grnDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getGrnInspectionRows() {
  const seed = typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA.receipts : [];
  const rows = applyGovStageCategoryFilter(seed, govGrnState)
    .map(r => ({ ...r, date: getGrnStatusDate(r) }));
  return applyStagePeriodFilter(rows, govGrnState, 'date');
}

function setGrnStageCategory(label) {
  govGrnState.category = (!label || label === 'All categories') ? 'all' : label;
  govGrnState.page = 1;
  refreshWorkflowUI();
}

function setGrnInspectionPage(page) {
  govGrnState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('grnInspectionTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderGrnInspectionStage(canEdit = true) {
  const data = typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>GRN &amp; inspection data could not be loaded.</p></div>`;
  const rows = getGrnInspectionRows();
  const paged = paginateItems(rows, govGrnState.page, 10);
  govGrnState.page = paged.page;
  const accepted = rows.filter(r => r.status === 'Accepted').length;
  const inQa = rows.filter(r => r.status === 'Under inspection' || r.status === 'Partial receipt').length;
  const awaiting = rows.filter(r => r.status === 'Awaiting delivery').length;
  const periodLabel = getWfPeriodFilterLabel(govGrnState);
  const categoryOptions = getGovStageCategoryOptions(typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA.receipts : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No GRNs match <strong>${escapeHtmlLite(periodLabel)}</strong>${govGrnState.category !== 'all' ? ` · ${escapeHtmlLite(govGrnState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setGrnStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>GRN &amp; inspection — receipt, QA &amp; acceptance</strong>
        <p>${data.meta.note}</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Accepted</span><strong>${accepted}</strong></div>
      <div class="budget-pr-chip"><span>Under inspection</span><strong>${inQa}</strong></div>
      <div class="budget-pr-chip"><span>Awaiting delivery</span><strong>${awaiting}</strong></div>
      <div class="budget-pr-chip"><span>Shown</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="grnInspectionTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'GRNs — status by category &amp; division',
          stageKey: 'grn',
          filterState: govGrnState,
          selectId: 'grnStageCategory',
          categoryOptions,
          lead: 'State-wise / division-wise goods receipts. Click a row for QA, batch and acceptance details.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>GRN ID</th>
              <th>Tender / PO</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>QA</th>
              <th>Est. value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row" onclick="openGrnInspectionDetail('${r.id}')" title="View GRN details">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.poId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${r.vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td><span class="badge badge-${needStatusBadge(r.qaStatus)}">${r.qaStatus}</span></td>
                <td class="cell-nowrap">${r.value}</td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setGrnInspectionPage') : ''}
      </div>
    </section>
  </div>`;
}

function openGrnInspectionDetail(grnId) {
  const r = (typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA.receipts : []).find(g => g.id === grnId);
  if (!r) return;
  const statusSince = getGrnStatusDate(r);
  const awaiting = /awaiting/i.test(String(r.status || ''));
  const rejected = /reject/i.test(String(r.status || ''));
  const coveredItems = (awaiting || rejected) ? [] : getGovStageCoveredItems(r, { take: 5 });
  const coverageRow = { ...r, coveredItems, forceEmptyCoverage: awaiting || rejected };
  openModal(`${escapeHtmlLite(r.id)} — GRN & inspection`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · GRN &amp; inspection</p>
          <h3>${escapeHtmlLite(r.title)}</h3>
          <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category)} · ${escapeHtmlLite(r.state)} (${escapeHtmlLite(r.division)})</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Vendor</span><strong>${escapeHtmlLite(r.vendor)}</strong></div>
        <div class="dvdms-detail-stat"><span>QA</span><strong>${escapeHtmlLite(r.qaStatus)}</strong></div>
        <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(r.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(statusSince)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'Received',
        noLabel: 'Not received',
        yesHint: rejected
          ? 'No articles accepted — GRN rejected / held'
          : 'Articles included in this GRN / inspection lot',
        noHint: awaiting
          ? 'Catalogue articles · delivery / GRN not started'
          : rejected
            ? 'Catalogue articles · lot not accepted'
            : 'In category catalogue · not on this GRN',
        statusHead: 'GRN status',
        filterLabel: 'GRN Status',
        headTitle: `${r.category} articles · GRN coverage`,
        stageTitle: `${r.category} · category-wise GRN`,
        noun: 'GRN'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Receipt &amp; quantities</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">PO ID</th><td>${escapeHtmlLite(r.poId)}</td></tr>
            <tr><th scope="row">Tender ID</th><td>${escapeHtmlLite(r.tenderId)}</td></tr>
            <tr><th scope="row">GRN date</th><td>${escapeHtmlLite(r.grnDate && r.grnDate !== '—' ? r.grnDate : '—')}</td></tr>
            <tr><th scope="row">Ordered</th><td>${escapeHtmlLite(r.qtyOrdered)}</td></tr>
            <tr><th scope="row">Received</th><td>${escapeHtmlLite(r.qtyReceived)}</td></tr>
            <tr><th scope="row">Accepted</th><td>${escapeHtmlLite(r.qtyAccepted)}</td></tr>
            <tr><th scope="row">Rejected</th><td>${escapeHtmlLite(r.qtyRejected)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Batch verification &amp; acceptance</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">Batch / serial</th><td>${escapeHtmlLite(r.batchNo)}</td></tr>
            <tr><th scope="row">Expiry</th><td>${escapeHtmlLite(r.expiry)}</td></tr>
            <tr><th scope="row">Inspector</th><td>${escapeHtmlLite(r.inspector)}</td></tr>
            <tr><th scope="row">Acceptance certificate</th><td>${escapeHtmlLite(r.acceptanceCert)}</td></tr>
            <tr><th scope="row">Remarks</th><td>${escapeHtmlLite(r.remarks)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('grn','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  bindGovStageCoverageFilter();
}

/* ========== Stage 12 Invoice Matching ========== */
function getInvoiceStatusDate(r) {
  if (!r) return '—';
  if (r.invoiceDate && r.invoiceDate !== '—') return r.invoiceDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getInvoiceMatchingRows() {
  const seed = typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA.invoices : [];
  const rows = applyGovStageCategoryFilter(seed, govInvoiceState)
    .map(r => ({ ...r, date: getInvoiceStatusDate(r) }));
  return applyStagePeriodFilter(rows, govInvoiceState, 'date');
}

function setInvoiceStageCategory(label) {
  govInvoiceState.category = (!label || label === 'All categories') ? 'all' : label;
  govInvoiceState.page = 1;
  refreshWorkflowUI();
}

function setInvoiceMatchingPage(page) {
  govInvoiceState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('invoiceMatchingTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderInvoiceMatchingStage(canEdit = true) {
  const data = typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Invoice matching data could not be loaded.</p></div>`;
  const rows = getInvoiceMatchingRows();
  const paged = paginateItems(rows, govInvoiceState.page, 10);
  govInvoiceState.page = paged.page;
  const matched = rows.filter(r => r.status === 'Matched').length;
  const issues = rows.filter(r => r.status === 'Mismatch' || r.status === 'Rejected' || r.status === 'Under match').length;
  const awaiting = rows.filter(r => r.status === 'Awaiting GRN').length;
  const periodLabel = getWfPeriodFilterLabel(govInvoiceState);
  const categoryOptions = getGovStageCategoryOptions(typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA.invoices : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="9"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No invoices match <strong>${escapeHtmlLite(periodLabel)}</strong>${govInvoiceState.category !== 'all' ? ` · ${escapeHtmlLite(govInvoiceState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setInvoiceStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Invoice matching — PO, GRN &amp; invoice</strong>
        <p>${data.meta.note}</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Matched</span><strong>${matched}</strong></div>
      <div class="budget-pr-chip"><span>Issues / in review</span><strong>${issues}</strong></div>
      <div class="budget-pr-chip"><span>Awaiting GRN</span><strong>${awaiting}</strong></div>
      <div class="budget-pr-chip"><span>Shown</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="invoiceMatchingTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Invoices generated — status by category &amp; division',
          stageKey: 'invoice',
          filterState: govInvoiceState,
          selectId: 'invoiceStageCategory',
          categoryOptions,
          lead: 'State-wise invoice status across categories. Click a row for three-way match details.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Tender / PO</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Match</th>
              <th>Est. value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row" onclick="openInvoiceMatchingDetail('${r.id}')" title="View invoice match details">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.poId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${r.vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td>${r.matchScore}</td>
                <td class="cell-nowrap">${r.value}</td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setInvoiceMatchingPage') : ''}
      </div>
    </section>
  </div>`;
}

function openInvoiceMatchingDetail(invId) {
  const r = (typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA.invoices : []).find(i => i.id === invId);
  if (!r) return;
  const statusSince = getInvoiceStatusDate(r);
  const awaiting = /awaiting/i.test(String(r.status || ''));
  const rejected = /reject/i.test(String(r.status || ''));
  const coveredItems = (awaiting || rejected) ? [] : getGovStageCoveredItems(r, { take: 5 });
  const coverageRow = { ...r, coveredItems, forceEmptyCoverage: awaiting || rejected };
  openModal(`${escapeHtmlLite(r.id)} — Invoice matching`, `
    <div class="dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">MPPHSCL · Invoice matching</p>
          <h3>${escapeHtmlLite(r.title)}</h3>
          <p>${escapeHtmlLite(r.tenderId)} · ${escapeHtmlLite(r.category)} · ${escapeHtmlLite(r.state)} (${escapeHtmlLite(r.division)})</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Match score</span><strong>${escapeHtmlLite(r.matchScore)}</strong></div>
        <div class="dvdms-detail-stat"><span>Finance</span><strong>${escapeHtmlLite(r.financeStatus)}</strong></div>
        <div class="dvdms-detail-stat"><span>Invoice value</span><strong>${escapeHtmlLite(r.value)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(statusSince)}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        yesLabel: 'Invoiced',
        noLabel: 'Not invoiced',
        yesHint: rejected
          ? 'No articles invoiced — invoice rejected / held'
          : 'Articles covered on this tax invoice / three-way match',
        noHint: awaiting
          ? 'Catalogue articles · waiting for GRN / invoice'
          : rejected
            ? 'Catalogue articles · invoice not cleared'
            : 'In category catalogue · not on this invoice',
        statusHead: 'Invoice status',
        filterLabel: 'Invoice Status',
        headTitle: `${r.category} articles · invoice coverage`,
        stageTitle: `${r.category} · category-wise invoice`,
        noun: 'invoice'
      })}
      <div class="dvdms-detail-panel">
        <div class="dvdms-detail-panel-head">Three-way match summary</div>
        <table class="dvdms-detail-table">
          <tbody>
            <tr><th scope="row">PO ID</th><td>${escapeHtmlLite(r.poId)}</td></tr>
            <tr><th scope="row">GRN ID</th><td>${escapeHtmlLite(r.grnId)}</td></tr>
            <tr><th scope="row">Tender ID</th><td>${escapeHtmlLite(r.tenderId)}</td></tr>
            <tr><th scope="row">Vendor</th><td>${escapeHtmlLite(r.vendor)}</td></tr>
            <tr><th scope="row">Invoice date</th><td>${escapeHtmlLite(r.invoiceDate && r.invoiceDate !== '—' ? r.invoiceDate : '—')}</td></tr>
            <tr><th scope="row">Tax invoice No.</th><td>${escapeHtmlLite(r.taxInvoice)}</td></tr>
            <tr><th scope="row">PO value</th><td>${escapeHtmlLite(r.poValue)}</td></tr>
            <tr><th scope="row">GRN value</th><td>${escapeHtmlLite(r.grnValue)}</td></tr>
            <tr><th scope="row">Deductions / LD</th><td>${escapeHtmlLite(r.deductions)}</td></tr>
            <tr><th scope="row">Remarks</th><td>${escapeHtmlLite(r.remarks)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
        <button type="button" class="btn btn-outline" onclick="openStageFollowUpModal('invoice','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  bindGovStageCoverageFilter();
}

/* ========== Stage 13 Payment ========== */
function getPaymentStatusDate(r) {
  if (!r) return '—';
  if (r.paymentDate && r.paymentDate !== '—') return r.paymentDate;
  if (r.date && r.date !== '—') return r.date;
  return '—';
}

function getPaymentItemNames(r) {
  if (Array.isArray(r?.paidItems) && r.paidItems.length) {
    return r.paidItems;
  }
  if (!categoryUsesItemWiseDetail(r?.category)) return [];
  const catalog = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[r.category] || []) : []);
  const take = /^paid$/i.test(String(r?.status || '')) ? 4 : 2;
  return catalog.slice(0, take).map(i => i.name);
}

function getPaymentStageBaseRows() {
  const seed = typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : [];
  const rows = applyGovStageCategoryFilter(seed, govPaymentState)
    .map(r => ({ ...r, date: getPaymentStatusDate(r) }));
  return applyStagePeriodFilter(rows, govPaymentState, 'date');
}

function getPaymentStageRows() {
  return getPaymentStageBaseRows().flatMap(r => {
    const items = getPaymentItemNames(r);
    if (!items.length) {
      return [{ ...r, item: '—', rowKey: r.id, coveredItems: r.paidItems || [] }];
    }
    return items.map((itemName, idx) => ({
      ...r,
      item: itemName,
      rowKey: `${r.id}__${idx}`,
      coveredItems: r.paidItems || items
    }));
  });
}

function setPaymentStageCategory(label) {
  govPaymentState.category = (!label || label === 'All categories') ? 'all' : label;
  govPaymentState.page = 1;
  refreshWorkflowUI();
}

function setPaymentStagePage(page) {
  govPaymentState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('paymentStageTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPaymentStage(canEdit = true) {
  const data = typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Payment data could not be loaded.</p></div>`;
  const baseRows = getPaymentStageBaseRows();
  const rows = getPaymentStageRows();
  const paged = paginateItems(rows, govPaymentState.page, 10);
  govPaymentState.page = paged.page;
  const paid = baseRows.filter(r => r.status === 'Paid').length;
  const inProcess = baseRows.filter(r => r.status === 'In process' || r.status === 'Approved').length;
  const held = baseRows.filter(r => r.status === 'On hold' || r.status === 'Rejected').length;
  const periodLabel = getWfPeriodFilterLabel(govPaymentState);
  const categoryOptions = getGovStageCategoryOptions(typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="10"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No payments match <strong>${escapeHtmlLite(periodLabel)}</strong>${govPaymentState.category !== 'all' ? ` · ${escapeHtmlLite(govPaymentState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setPaymentStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Payment — release within contract terms</strong>
        <p>${data.meta.note}</p>
      </div>
      <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Paid</span><strong>${paid}</strong></div>
      <div class="budget-pr-chip"><span>In process</span><strong>${inProcess}</strong></div>
      <div class="budget-pr-chip"><span>On hold / rejected</span><strong>${held}</strong></div>
      <div class="budget-pr-chip"><span>Shown</span><strong>${baseRows.length}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="paymentStageTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Payments generated — status by category &amp; division',
          stageKey: 'payment',
          filterState: govPaymentState,
          selectId: 'paymentStageCategory',
          categoryOptions,
          lead: 'Item-wise view for Drugs / Equipment / Consumables. Click a row for LD, UTR and article payment coverage.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Payment</th>
              <th>Tender / Invoice</th>
              <th>State / Division</th>
              <th>Category</th>
              <th>Item</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Net payable</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => {
              const itemEnc = encodeURIComponent(r.item || '');
              return `
              <tr class="tender-prep-row" onclick="openPaymentStageDetail('${r.id}', decodeURIComponent('${itemEnc}'))" title="View payment details">
                <td><strong>${r.id}</strong></td>
                <td>${r.title}<br><span class="cell-sub">${r.invoiceId}</span></td>
                <td>${r.state}<br><span class="cell-sub">${r.division}</span></td>
                <td>${r.category}</td>
                <td>${escapeHtmlLite(r.item || '—')}</td>
                <td>${r.vendor}</td>
                <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
                <td>${r.mode}</td>
                <td class="cell-nowrap">${r.netPayable}</td>
                <td class="cell-date">${r.date || '—'}</td>
              </tr>`;
            }).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setPaymentStagePage') : ''}
      </div>
    </section>
  </div>`;
}

function openPaymentStageDetail(payId, focusItem) {
  const r = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).find(p => p.id === payId);
  if (!r) return;
  const statusSince = getPaymentStatusDate(r);
  const isRejected = /reject/i.test(String(r.status || ''));
  const rejectionReason = r.rejectionReason || (isRejected ? r.remarks : '');
  const itemNames = getPaymentItemNames(r);
  const coverageRow = getPaymentCoverageSourceRow({
    ...r,
    coveredItems: r.paidItems || itemNames
  });
  const itemHint = focusItem && focusItem !== '—'
    ? `<p class="dvdms-detail-note" style="margin-top:0">Opened from item <strong>${escapeHtmlLite(focusItem)}</strong>.</p>`
    : '';
  openModal(`${r.id} — Payment`, `
    <div class="consol-detail-modal dvdms-detail">
      <div class="tender-detail-section-head" style="margin:0 0 0.75rem">
        <p class="consol-detail-lead" style="margin:0">${r.title} · ${r.category} · ${r.state} (${r.division})</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('payment','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
      ${isRejected && rejectionReason ? renderRejectionReasonBanner(rejectionReason) : ''}
      ${itemHint}
      <div class="consol-detail-stats" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        <div class="consol-detail-stat"><span>Status</span><strong><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></strong></div>
        <div class="consol-detail-stat"><span>Vendor</span><strong>${r.vendor}</strong></div>
        <div class="consol-detail-stat"><span>Net payable</span><strong class="cell-nowrap">${r.netPayable}</strong></div>
        <div class="consol-detail-stat"><span>Payment date</span><strong class="cell-date">${r.paymentDate && r.paymentDate !== '—' ? r.paymentDate : '—'}</strong></div>
        <div class="consol-detail-stat"><span>Status since</span><strong class="cell-date">${statusSince}</strong></div>
      </div>
      ${renderLifecycleCoverageBlock(coverageRow, {
        stageTitle: `${r.category || 'Category'} · category-wise payment`,
        noun: 'payment',
        yesLabel: 'Paid',
        noLabel: 'Not paid',
        yesHint: isRejected
          ? 'No articles were paid — this payment was rejected'
          : 'Articles covered under this payment release',
        noHint: isRejected
          ? 'Catalogue articles · payment not released for this record'
          : 'In category catalogue · not part of this payment',
        statusHead: 'Payment status',
        filterLabel: 'Payment Status',
        headTitle: `${r.category || 'Category'} articles · payment coverage`
      })}
      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table">
          <tbody>
            <tr><td>Invoice ID</td><td><strong>${r.invoiceId}</strong></td></tr>
            <tr><td>PO ID</td><td><strong>${r.poId}</strong></td></tr>
            <tr><td>Tender ID</td><td><strong>${r.tenderId}</strong></td></tr>
            <tr><td>Gross amount</td><td><strong class="cell-nowrap">${r.gross}</strong></td></tr>
            <tr><td>LD / deductions</td><td><strong>${r.ld}</strong></td></tr>
            <tr><td>Mode</td><td><strong>${r.mode}</strong></td></tr>
            <tr><td>UTR / reference</td><td><strong class="cell-nowrap">${r.utr}</strong></td></tr>
            <tr><td>Due date</td><td><strong class="cell-date">${r.dueDate && r.dueDate !== '—' ? r.dueDate : '—'}</strong></td></tr>
            <tr><td>Status since</td><td><strong class="cell-date">${statusSince}</strong></td></tr>
            <tr><td>Remarks</td><td>${r.remarks}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" class="btn btn-primary" onclick="openStageFollowUpModal('payment','row','${r.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
  setTimeout(() => {
    if (typeof bindArticleCoverageStatusFilter === 'function') bindArticleCoverageStatusFilter();
  }, 0);
}

/* ========== Stage 14 Renewal ========== */
function getRenewalRows() {
  const base = typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA.renewals : [];
  // Include vendor-raised requests from the active vendor session (prototype bridge to Stage 14)
  const vendorRaised = (typeof vendorStageState !== 'undefined' && Array.isArray(vendorStageState.renewalRequests))
    ? vendorStageState.renewalRequests.map(r => ({ ...r, documents: (r.documents || []).map(d => ({ ...d })) }))
    : [];
  const baseIds = new Set(base.map(r => r.id));
  const merged = [...vendorRaised.filter(r => !baseIds.has(r.id)), ...base];
  const filtered = applyGovStageCategoryFilter(merged, govRenewalState);
  return applyStagePeriodFilter(filtered, govRenewalState, 'renewalDate');
}

function setRenewalStageCategory(label) {
  govRenewalState.category = (!label || label === 'All categories') ? 'all' : label;
  govRenewalState.page = 1;
  refreshWorkflowUI();
}

function setRenewalStagePage(page) {
  govRenewalState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
  document.getElementById('renewalStageTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renewalStatusBadge(status) {
  if (status === 'Finalized') return 'success';
  if (status === 'Under review') return 'warning';
  if (status === 'Pending finalization') return 'info';
  return needStatusBadge(status);
}

function renewalTypeBadge(type) {
  if (type === 'Fresh renewal') return 'info';
  if (type === 'Extra quality order') return 'warning';
  return 'muted';
}

function renderRenewalStage(canEdit = true) {
  const data = typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA : null;
  if (!data) return `<div class="need-api-empty"><p>Renewal data could not be loaded.</p></div>`;

  const rows = getRenewalRows().map(r => {
    const fin = govRenewalState.finalized[r.id];
    return fin ? { ...r, status: 'Finalized', _finalized: fin } : r;
  });
  const paged = paginateItems(rows, govRenewalState.page, 10);
  govRenewalState.page = paged.page;
  const pending = rows.filter(r => r.status !== 'Finalized').length;
  const finalized = rows.filter(r => r.status === 'Finalized').length;
  const fresh = rows.filter(r => r.renewalType === 'Fresh renewal').length;
  const eqo = rows.filter(r => r.renewalType === 'Extra quality order').length;
  const periodLabel = getWfPeriodFilterLabel(govRenewalState);
  const categoryOptions = getGovStageCategoryOptions(typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA.renewals : []);
  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="8"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No renewals match <strong>${escapeHtmlLite(periodLabel)}</strong>${govRenewalState.category !== 'all' ? ` · ${escapeHtmlLite(govRenewalState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setRenewalStageCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="tender-prep-stage renewal-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Renewal — vendor contracts &amp; quality orders</strong>
        <p>${data.meta.note}</p>
      </div>
      <div class="indent-mode-banner-actions" style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;justify-content:flex-end">
        <span class="badge badge-info"><i class="fa-solid fa-calendar-days"></i> ${periodLabel}</span>
        <button type="button" class="btn btn-primary btn-sm" onclick="openFinalizeRenewalModal(${canEdit ? 'true' : 'false'})">
          <i class="fa-solid fa-stamp"></i> Renewal
        </button>
      </div>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Pending</span><strong>${pending}</strong></div>
      <div class="budget-pr-chip"><span>Finalized</span><strong>${finalized}</strong></div>
      <div class="budget-pr-chip"><span>Fresh renewal</span><strong>${fresh}</strong></div>
      <div class="budget-pr-chip"><span>Extra quality order</span><strong>${eqo}</strong></div>
      <div class="budget-pr-chip"><span>Last updated</span><strong>${data.meta.lastUpdated}</strong></div>
    </div>

    <section class="budget-section" id="renewalStageTable">
      <div class="data-table-wrap need-table">
        ${renderGovStageListHeader({
          title: 'Renewal list — all vendors',
          stageKey: 'renewal',
          filterState: govRenewalState,
          selectId: 'renewalStageCategory',
          categoryOptions,
          lead: 'Click a row to view vendor details and downloadable documents.'
        })}
        <div class="data-table-scroll">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Renewal ID</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Period</th>
              <th>Type</th>
              <th>Status</th>
              <th>Value</th>
              <th>Docs</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row" onclick="openRenewalStageDetail('${r.id}')" title="View renewal details">
                <td><strong>${r.id}</strong></td>
                <td>${r.vendorName}<br><span class="cell-sub">${r.vendorId}</span></td>
                <td>${r.category}</td>
                <td>${r.renewalFrom} → ${r.renewalTo}</td>
                <td><span class="badge badge-${renewalTypeBadge(r.renewalType)}">${r.renewalType}</span></td>
                <td><span class="badge badge-${renewalStatusBadge(r.status)}">${r.status}</span></td>
                <td>${r.value}</td>
                <td>${(r.documents || []).length}</td>
              </tr>
            `).join('') : filterEmptyRow}
          </tbody>
        </table>
        </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setRenewalStagePage') : ''}
      </div>
    </section>
  </div>`;
}

function getRenewalRowById(renId) {
  const base = (typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA.renewals : []).find(x => x.id === renId);
  if (!base) return null;
  const fin = govRenewalState.finalized[renId];
  return fin ? { ...base, status: 'Finalized', _finalized: fin } : { ...base };
}

function renderRenewalDetailModalBody(r) {
  const fin = r._finalized || govRenewalState.finalized[r.id];
  const docs = r.documents || [];
  const coveredItems = getGovStageCoveredItems(r, { take: 5 });
  const coverageRow = { ...r, coveredItems };
  return `<div class="dvdms-detail renewal-detail-modal">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Renewal request</p>
        <h3>${escapeHtmlLite(r.remarks || r.vendorName || 'Renewal')}</h3>
        <p>${escapeHtmlLite(r.contractId || '—')} · ${escapeHtmlLite(r.tenderId || '—')} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${renewalStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Vendor ID</span><strong>${escapeHtmlLite(r.vendorId)}</strong></div>
      <div class="dvdms-detail-stat"><span>GSTIN</span><strong>${escapeHtmlLite(r.gstin)}</strong></div>
      <div class="dvdms-detail-stat"><span>Contract</span><strong>${escapeHtmlLite(r.contractId)}</strong></div>
      <div class="dvdms-detail-stat"><span>Value</span><strong>${escapeHtmlLite(r.value)}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(coverageRow, {
      stageTitle: `${r.category || 'Category'} · category-wise renewal`,
      noun: 'renewal',
      yesLabel: 'Covered',
      noLabel: 'Not covered',
      yesHint: 'Articles proposed under this renewal scope',
      noHint: 'In category catalogue · outside this renewal request',
      statusHead: 'Renewal status',
      filterLabel: 'Renewal Status',
      headTitle: `${r.category || 'Category'} articles · renewal coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Renewal summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          <tr><th scope="row">Contact</th><td>${escapeHtmlLite(r.contact)}</td></tr>
          <tr><th scope="row">Renewal from</th><td>${escapeHtmlLite(r.renewalFrom)}</td></tr>
          <tr><th scope="row">Renewal to</th><td>${escapeHtmlLite(r.renewalTo)}</td></tr>
          <tr><th scope="row">Renewal status type</th><td>${escapeHtmlLite(r.renewalType)}</td></tr>
          <tr><th scope="row">Workflow status</th><td>${escapeHtmlLite(r.status)}</td></tr>
          <tr><th scope="row">Recorded on</th><td>${escapeHtmlLite(r.renewalDate)}</td></tr>
          ${fin ? `<tr><th scope="row">Finalized</th><td>${escapeHtmlLite(fin.at)} by ${escapeHtmlLite(fin.by)}${fin.fileName ? ` · file: ${escapeHtmlLite(fin.fileName)}` : ''}</td></tr>` : ''}
        </tbody>
      </table>
    </div>
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head"><i class="fa-solid fa-paperclip"></i> Attached documents</div>
      <p class="dvdms-detail-note" style="margin:0.65rem 0.75rem 0">Download fresh tender, addendum, corrigendum or related PDFs for this renewal.</p>
      <div class="data-table-wrap bid-article-table-wrap" style="max-height:14rem;margin:0.75rem">
        <table class="data-table data-table--modal">
          <thead><tr><th>Document</th><th>Type</th><th>Action</th></tr></thead>
          <tbody>
            ${docs.length ? docs.map(d => `
              <tr>
                <td><strong>${escapeHtmlLite(d.name)}</strong><div class="table-sub">${escapeHtmlLite(d.file)}</div></td>
                <td><span class="badge badge-muted">${escapeHtmlLite(d.type)}</span></td>
                <td>
                  <button type="button" class="btn btn-outline btn-sm" onclick="downloadRenewalDocument('${r.id}','${d.id}')">
                    <i class="fa-solid fa-file-pdf"></i> Download PDF
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="3" style="text-align:center;color:#64748b">No documents attached.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function openRenewalStageDetail(renId) {
  const r = getRenewalRowById(renId);
  if (!r) {
    showWfAlert('Renewal record not found.');
    return;
  }
  govRenewalState.selectedId = renId;
  openModal(`${escapeHtmlLite(r.id)} — ${escapeHtmlLite(r.vendorName)}`, renderRenewalDetailModalBody(r), {
    wide: true,
    large: true,
    extraWide: true
  });
  bindGovStageCoverageFilter();
}

function renderFinalizeRenewalModalBody(canEdit = true) {
  const rows = getRenewalRows().map(r => {
    const fin = govRenewalState.finalized[r.id];
    return fin ? { ...r, status: 'Finalized' } : r;
  });
  const pendingVendors = rows.filter(r => r.status !== 'Finalized');
  const vendorOptions = pendingVendors.length
    ? pendingVendors.map(r => `${r.vendorId} — ${r.vendorName}`)
    : ['No pending vendors'];
  const selectedOpt = (() => {
    if (govRenewalState.finalizeVendorId && vendorOptions.includes(govRenewalState.finalizeVendorId)) {
      return govRenewalState.finalizeVendorId;
    }
    return pendingVendors[0] ? `${pendingVendors[0].vendorId} — ${pendingVendors[0].vendorName}` : vendorOptions[0];
  })();
  govRenewalState.finalizeVendorId = selectedOpt;

  return `<div class="consol-detail-modal renewal-finalize-modal">
    <p class="consol-detail-lead">Select a vendor from the pending list, optionally upload a supporting document, and finalize the renewal decision.</p>
    <div class="form-grid wf-form-grid">
      ${customSelectHTML('Vendor for finalization', 'renewalFinalizeVendor', vendorOptions, selectedOpt, true)}
      <div class="form-group">
        <label>Supporting document (optional)</label>
        ${renderInlineUpload({
          id: 'renewalFinalizeUpload',
          title: 'Upload PDF / image',
          hint: 'Fresh tender, addendum, corrigendum or approval note · PDF, JPG, PNG',
          disabled: !canEdit || !pendingVendors.length,
          fileName: govRenewalState.uploadName || null,
          onChange: 'onRenewalFinalizeUpload'
        })}
      </div>
    </div>
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary"${(!canEdit || !pendingVendors.length) ? ' disabled' : ''} onclick="finalizeGovRenewal()">
        <i class="fa-solid fa-check-double"></i> Finalize renewal
      </button>
    </div>
  </div>`;
}

function openFinalizeRenewalModal(canEdit = true) {
  const editable = canEdit === true || canEdit === 'true';
  openModal('Finalize renewal', renderFinalizeRenewalModalBody(editable), { wide: true, large: true, replace: true });
  initCustomSelects();
}

function onRenewalFinalizeUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  govRenewalState.uploadName = file.name;
  openFinalizeRenewalModal(true);
}

function finalizeGovRenewal() {
  const wrap = document.querySelector('[data-select-id="renewalFinalizeVendor"]');
  const label = wrap?.querySelector('.custom-select-value')?.textContent?.trim()
    || govRenewalState.finalizeVendorId;
  if (!label || label === 'No pending vendors') {
    showWfAlert('No pending vendors available to finalize.');
    return;
  }
  const vendorId = label.split(' — ')[0];
  const rows = getRenewalRows();
  const row = rows.find(r => r.vendorId === vendorId && r.status !== 'Finalized' && !govRenewalState.finalized[r.id]);
  if (!row) {
    showWfAlert('Selected vendor renewal is already finalized or not found.');
    return;
  }
  govRenewalState.finalized[row.id] = {
    at: formatDateDMY(APP_TODAY) + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    by: authUser?.name || 'Resource Manager',
    fileName: govRenewalState.uploadName || null
  };
  govRenewalState.uploadName = '';
  govRenewalState.selectedId = row.id;
  closeModal();
  refreshWorkflowUI();
  showWfAlert(`Renewal ${row.id} for ${row.vendorName} has been finalized.`, 'success');
}

function downloadRenewalDocument(renId, docId) {
  const r = (typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA.renewals : []).find(x => x.id === renId);
  const doc = r?.documents?.find(d => d.id === docId);
  if (!r || !doc) {
    showWfAlert('Document not found.');
    return;
  }
  const filename = (doc.file && /\.pdf$/i.test(doc.file)) ? doc.file : `${doc.file || doc.id}.pdf`;
  confirmDocumentDownload({
    title: 'Confirm document download',
    docLabel: doc.name || 'Renewal document',
    formatLabel: 'PDF',
    fileHint: filename,
    execute: () => {
      const fin = r._finalized || govRenewalState.finalized[r.id];
      const lines = [
        'MP Health Procurement — Stage 14 Renewal',
        'Department of Public Health & Medical Education, Madhya Pradesh',
        '',
        doc.name,
        `Document type: ${doc.type}`,
        `File name: ${doc.file}`,
        '',
        '— Renewal record —',
        `Renewal ID: ${r.id}`,
        `Vendor: ${r.vendorName} (${r.vendorId})`,
        `GSTIN: ${r.gstin}`,
        `Category: ${r.category}`,
        `Contract: ${r.contractId}`,
        `Contract value: ${r.value}`,
        `Contact: ${r.contact}`,
        '',
        '— Period & status —',
        `Renewal from: ${r.renewalFrom}`,
        `Renewal to: ${r.renewalTo}`,
        `Recorded on: ${r.renewalDate}`,
        `Renewal type: ${r.renewalType}`,
        `Workflow status: ${r.status}`,
        fin ? `Finalized on: ${fin.at} by ${fin.by}` : 'Finalized on: —',
        '',
        '— Remarks —',
        r.remarks || '—',
        '',
        `Generated: ${formatDateDMY(APP_TODAY)} · Demo document for procurement portal`
      ];
      downloadBlobFile(buildSimplePdfBlob(lines), filename);
    }
  });
}

function escapePdfText(str) {
  return String(str ?? '')
    .replace(/₹/g, 'Rs ')
    .replace(/[·•]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function buildSimplePdfBlob(lines) {
  const safe = (lines || []).map(l => escapePdfText(String(l).slice(0, 108)));
  const linesPerPage = 46;
  const pages = [];
  for (let i = 0; i < Math.max(safe.length, 1); i += linesPerPage) {
    pages.push(safe.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push(['(No data)']);

  const objs = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageObjNums = [];
  const contentObjNums = [];
  let nextId = 3;
  pages.forEach(() => {
    pageObjNums.push(nextId++);
    contentObjNums.push(nextId++);
  });
  const fontId = nextId;

  const kids = pageObjNums.map(n => `${n} 0 R`).join(' ');
  objs.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((pageLines, pi) => {
    const pageId = pageObjNums[pi];
    const contentId = contentObjNums[pi];
    const contentParts = ['BT', '/F1 10 Tf', '40 800 Td', '15 TL'];
    pageLines.forEach((line, i) => {
      if (i === 0) contentParts.push(`(${line}) Tj`);
      else contentParts.push(`T* (${line}) Tj`);
    });
    contentParts.push('ET');
    const stream = contentParts.join('\n');
    objs.push(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`);
    objs.push(`${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  });
  objs.push(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach(o => {
    offsets.push(pdf.length);
    pdf += o;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/** Pending download action awaiting user confirmation (download only vs download + email). */
let pendingDocumentDownload = null;

function getRegisteredDownloadEmail() {
  if (authUser?.email) return authUser.email;
  return currentRole === 'vendor' ? 'vendor@medisupply.in' : 'gov.admin@mphp.gov.in';
}

/**
 * System-wide download gate.
 * @param {{ title?: string, docLabel: string, formatLabel?: string, fileHint?: string, execute: (mode:'download'|'email') => void }} opts
 */
function confirmDocumentDownload(opts = {}) {
  const docLabel = opts.docLabel || 'Document';
  const formatLabel = opts.formatLabel || 'File';
  const fileHint = opts.fileHint || '';
  const email = getRegisteredDownloadEmail();
  pendingDocumentDownload = {
    execute: typeof opts.execute === 'function' ? opts.execute : null,
    docLabel,
    formatLabel
  };
  openModal(opts.title || 'Confirm download', `
    <div class="download-confirm">
      <div class="wf-inline-alert wf-inline-alert--info">
        <i class="fa-solid fa-cloud-arrow-down"></i>
        <div>
          <p><strong>${escapeHtmlLite(docLabel)}</strong>${formatLabel ? ` · ${escapeHtmlLite(formatLabel)}` : ''}</p>
          ${fileHint ? `<p class="download-confirm-hint">${escapeHtmlLite(fileHint)}</p>` : ''}
        </div>
      </div>
      <div class="download-confirm-email">
        <span class="download-confirm-email-label">Registered email</span>
        <strong>${escapeHtmlLite(email)}</strong>
      </div>
      <p class="download-confirm-lead">Choose how you want to receive this document.</p>
      <div class="modal-inline-actions download-confirm-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Cancel</button>
        <button type="button" class="btn btn-outline" onclick="completeDocumentDownload('download')">
          <i class="fa-solid fa-download"></i> Download only
        </button>
        <button type="button" class="btn btn-primary" onclick="completeDocumentDownload('email')">
          <i class="fa-solid fa-envelope"></i> Download &amp; email
        </button>
      </div>
    </div>
  `, { wide: true });
}

function completeDocumentDownload(mode) {
  const pending = pendingDocumentDownload;
  pendingDocumentDownload = null;
  closeModal();
  if (!pending?.execute) return;

  const email = getRegisteredDownloadEmail();
  const showSuccess = () => {
    if (mode === 'email') {
      showWfAlert(`${pending.docLabel} downloaded and sent to <strong>${email}</strong>.`, 'success');
    } else {
      showWfAlert(`${pending.docLabel} downloaded successfully.`, 'success');
    }
  };

  const runExecute = () => {
    try {
      const result = pending.execute(mode === 'email' ? 'email' : 'download');
      if (result && typeof result.then === 'function') {
        return Promise.resolve(result)
          .then(() => showSuccess())
          .catch(() => {
            showWfAlert('Download could not be completed. Please try again.');
          });
      }
      showSuccess();
    } catch (err) {
      showWfAlert('Download could not be completed. Please try again.');
    }
  };

  // Paint "Please wait" first, then start heavy PDF work (otherwise success appears before download).
  showWfAlert(`Generating <strong>${escapeHtmlLite(pending.docLabel)}</strong>… Please wait.`, 'info');
  requestAnimationFrame(() => {
    setTimeout(runExecute, 60);
  });
}

function escapeHtmlLite(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function renderNeedIdentificationStage(canEdit = true) {
  const data = getNeedIdentificationData();
  if (!data) {
    return `<div class="need-api-empty"><i class="fa-solid fa-plug-circle-xmark"></i><p>Need assessment data could not be loaded right now. Please try Re-sync from API, or contact support if this continues.</p></div>`;
  }
  const { stockLevels, patientLoad, diseaseBurden, gapAnalysis } = data;
  const disabled = canEdit ? '' : ' disabled';
  const blocks = [
    { key: 'stock', icon: 'fa-boxes-stacked', color: 'blue', data: stockLevels,
      metrics: [
        { label: 'Fill rate', value: stockLevels.overallFillRate },
        { label: 'Critical SKUs', value: stockLevels.criticalSkus },
        { label: 'Below reorder', value: stockLevels.belowReorder },
        { label: 'Days of cover', value: stockLevels.daysOfCover }
      ] },
    { key: 'patient', icon: 'fa-user-injured', color: 'teal', data: patientLoad,
      metrics: [
        { label: 'OPD / month', value: patientLoad.opdMonthly },
        { label: 'IPD occupancy', value: patientLoad.ipdOccupancy },
        { label: 'YoY growth', value: patientLoad.growthYoY },
        { label: 'High-load sites', value: patientLoad.highLoadFacilities }
      ] },
    { key: 'disease', icon: 'fa-virus', color: 'orange', data: diseaseBurden,
      metrics: [
        { label: 'Top conditions', value: diseaseBurden.topConditions },
        { label: 'Seasonal alert', value: diseaseBurden.seasonalAlert },
        { label: 'Programme SKUs', value: diseaseBurden.programmeSkus },
        { label: 'Risk score', value: diseaseBurden.riskScore }
      ] },
    { key: 'gap', icon: 'fa-chart-gantt', color: 'red', data: gapAnalysis,
      metrics: [
        { label: 'Net gap value', value: gapAnalysis.netGapValue },
        { label: 'Line items', value: gapAnalysis.lineItems },
        { label: 'Fulfill from stock', value: gapAnalysis.fulfillFromStock },
        { label: 'Fresh procurement', value: gapAnalysis.freshProcurement }
      ] }
  ];

  const periodLabel = getWfPeriodFilterLabel(govNeedState);
  const stockRows = getNeedSectionRows('stock');
  const patientRows = getNeedSectionRows('patient');
  const diseaseRows = getNeedSectionRows('disease');
  const gapRows = getNeedSectionRows('gap');
  const stockPaged = paginateItems(stockRows, govNeedState.stockPage, 10);
  const patientPaged = paginateItems(patientRows, govNeedState.patientPage, 10);
  const diseasePaged = paginateItems(diseaseRows, govNeedState.diseasePage, 10);
  const gapPaged = paginateItems(gapRows, govNeedState.gapPage, 10);
  govNeedState.stockPage = stockPaged.page;
  govNeedState.patientPage = patientPaged.page;
  govNeedState.diseasePage = diseasePaged.page;
  govNeedState.gapPage = gapPaged.page;

  return `<div class="need-api">
    ${renderWorkflowPeriodFilter('need', govNeedState)}

    <div class="need-metric-grid">
      ${blocks.map(b => `
        <button type="button" class="need-metric-card need-metric-card--${b.color}" onclick="scrollToNeedSection('${b.key}')">
          <div class="need-metric-head">
            <span class="need-metric-icon"><i class="fa-solid ${b.icon}"></i></span>
            <span class="badge badge-${needStatusBadge(b.data.status)}">${b.data.status}</span>
          </div>
          <h4>${b.data.label}</h4>
          <p>${b.data.summary}</p>
          <div class="need-metric-stats">
            ${b.metrics.map(m => `<div><span>${m.label}</span><strong>${m.value}</strong></div>`).join('')}
          </div>
        </button>`).join('')}
    </div>

    <div class="need-section" id="need-sec-stock">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-boxes-stacked"></i> ${stockLevels.label}</h4>
        <span class="meta-chip">Facility stock vs reorder point</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Facility</th><th>SKU / Item</th><th>On hand</th><th>Reorder point</th><th>Cover (days)</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${stockPaged.items.length ? stockPaged.items.map((r, localI) => {
              const i = (stockPaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openNeedRowDetail('stock',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openNeedRowDetail('stock',${i})}">
              <td><strong>${r.facility}</strong></td><td>${r.sku}</td>
              <td>${r.onHand.toLocaleString('en-IN')}</td><td>${r.reorder.toLocaleString('en-IN')}</td>
              <td>${r.coverDays}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No stock rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(stockPaged.page, stockPaged.totalPages, stockPaged.total, stockPaged.from, stockPaged.to, 'setNeedStockPage')}
    </div>

    <div class="need-section" id="need-sec-patient">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-user-injured"></i> ${patientLoad.label}</h4>
        <span class="meta-chip">OPD / IPD load by facility</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Facility</th><th>Type</th><th>OPD (month)</th><th>IPD bed occ.</th><th>Trend</th><th>Date</th></tr></thead>
          <tbody>
            ${patientPaged.items.length ? patientPaged.items.map((r, localI) => {
              const i = (patientPaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openNeedRowDetail('patient',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openNeedRowDetail('patient',${i})}">
              <td><strong>${r.facility}</strong></td><td>${r.category}</td>
              <td>${r.opd.toLocaleString('en-IN')}</td><td>${r.ipdBedOcc}</td><td>${r.trend}</td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="6" style="text-align:center;color:#64748b">No patient-load rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(patientPaged.page, patientPaged.totalPages, patientPaged.total, patientPaged.from, patientPaged.to, 'setNeedPatientPage')}
    </div>

    <div class="need-section" id="need-sec-disease">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-virus"></i> ${diseaseBurden.label}</h4>
        <span class="meta-chip">Programme-driven demand signals</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Condition / Programme</th><th>Cases</th><th>Trend</th><th>SKU focus</th><th>Priority</th><th>Date</th></tr></thead>
          <tbody>
            ${diseasePaged.items.length ? diseasePaged.items.map((r, localI) => {
              const i = (diseasePaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openNeedRowDetail('disease',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openNeedRowDetail('disease',${i})}">
              <td><strong>${r.condition}</strong></td><td>${r.cases}</td><td>${r.trend}</td>
              <td>${r.skuFocus}</td>
              <td><span class="badge badge-${needStatusBadge(r.priority)}">${r.priority}</span></td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="6" style="text-align:center;color:#64748b">No disease-burden rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(diseasePaged.page, diseasePaged.totalPages, diseasePaged.total, diseasePaged.from, diseasePaged.to, 'setNeedDiseasePage')}
    </div>

    <div class="need-section" id="need-sec-gap">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-chart-gantt"></i> ${gapAnalysis.label}</h4>
        <span class="meta-chip">Net requirement after stock &amp; open PO · Est. savings ${gapAnalysis.estimatedSavings}</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Item</th><th>Required</th><th>Available</th><th>Open PO</th><th>Gap</th><th>Recommended action</th><th>Date</th></tr></thead>
          <tbody>
            ${gapPaged.items.length ? gapPaged.items.map((r, localI) => {
              const i = (gapPaged.page - 1) * 10 + localI;
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openNeedRowDetail('gap',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openNeedRowDetail('gap',${i})}">
              <td><strong>${r.item}</strong></td><td>${r.required}</td><td>${r.available}</td>
              <td>${r.openPo}</td><td><strong>${r.gap}</strong></td><td>${r.action}</td>
              <td class="cell-date">${r.date || '—'}</td>
            </tr>`;
            }).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b">No gap-analysis rows for ${periodLabel}.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(gapPaged.page, gapPaged.totalPages, gapPaged.total, gapPaged.from, gapPaged.to, 'setNeedGapPage')}
    </div>

    <div class="wf-actions mt-2">
      <button class="btn btn-outline" onclick="refreshNeedIdentificationApi()"${disabled}><i class="fa-solid fa-arrows-rotate"></i> Re-sync from API</button>
    </div>
  </div>`;
}

function scrollToNeedSection(key) {
  document.getElementById(`need-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getFollowUpRecipients() {
  const fromAuth = (typeof AUTH_ROLE_OPTIONS !== 'undefined' ? AUTH_ROLE_OPTIONS : [])
    .filter(role => role !== 'Vendor / Bidder' && role !== FOLLOW_UP_SENDER_ROLE);
  const mapped = FOLLOW_UP_ROLE_RECIPIENTS.filter(r =>
    r.role !== FOLLOW_UP_SENDER_ROLE && fromAuth.includes(r.role)
  );
  const missing = fromAuth.filter(role => !mapped.some(r => r.role === role));
  return [
    ...mapped,
    ...missing.map(role => ({
      role,
      email: `${role.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@mphp.gov.in`,
      name: role
    }))
  ];
}

function escapeFollowUpHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function followUpActionButton(stage, section, index) {
  if (currentRole !== 'gov') return '';
  return `<button type="button" class="btn btn-primary btn-sm" onclick="openStageFollowUpModal('${stage}','${section}',${index})">
            <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
          </button>`;
}

function resolveFollowUpRowContext(stage, section, index) {
  const i = Number(index);
  if (stage === 'need') {
    if (section === 'stock') {
      const r = getNeedSectionRows('stock')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.sku,
        regardingMeta: `${r.facility} · ${r.status}`,
        status: r.status,
        date: r.date || '—',
        subject: `Follow-up: ${r.sku} @ ${r.facility}`,
        contextLines: [
          ['Source', 'Need Identification · Stock Levels'],
          ['Facility', r.facility],
          ['SKU / Item', r.sku],
          ['Status', r.status],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'patient') {
      const r = getNeedSectionRows('patient')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.facility,
        regardingMeta: `${r.category} · Patient Load`,
        status: r.trend,
        date: r.date || '—',
        subject: `Follow-up: Patient Load — ${r.facility}`,
        contextLines: [
          ['Source', 'Need Identification · Patient Load'],
          ['Facility', r.facility],
          ['Type', r.category],
          ['OPD (month)', String(r.opd.toLocaleString ? r.opd.toLocaleString('en-IN') : r.opd)],
          ['IPD bed occ.', r.ipdBedOcc],
          ['Trend', r.trend],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'disease') {
      const r = getNeedSectionRows('disease')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.condition,
        regardingMeta: `${r.priority} · Disease Burden`,
        status: r.priority,
        date: r.date || '—',
        subject: `Follow-up: Disease Burden — ${r.condition}`,
        contextLines: [
          ['Source', 'Need Identification · Disease Burden'],
          ['Condition', r.condition],
          ['Cases', r.cases],
          ['Trend', r.trend],
          ['SKU focus', r.skuFocus],
          ['Priority', r.priority],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'gap') {
      const r = getNeedSectionRows('gap')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.item,
        regardingMeta: `${r.action} · Gap Analysis`,
        status: r.action,
        date: r.date || '—',
        subject: `Follow-up: Gap Analysis — ${r.item}`,
        contextLines: [
          ['Source', 'Need Identification · Gap Analysis'],
          ['Item', r.item],
          ['Required', r.required],
          ['Available', r.available],
          ['Open PO', r.openPo],
          ['Gap', r.gap],
          ['Action', r.action],
          ['Status since', r.date || '—']
        ]
      };
    }
  }
  if (stage === 'stock') {
    const data = getStockCheckData();
    if (!data) return null;
    if (section === 'warehouse') {
      const r = applyStagePeriodFilter(data.warehouse.rows || [], govStockCheckState, 'date')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.item,
        regardingMeta: `${r.facility} · ${r.status}`,
        status: r.status,
        date: r.date || '—',
        subject: `Follow-up: Warehouse — ${r.item} @ ${r.facility}`,
        contextLines: [
          ['Source', 'Stock Check · Warehouse Stock'],
          ['Facility', r.facility],
          ['Item', r.item],
          ['On hand', r.onHand],
          ['Usable', r.usable],
          ['Status', r.status],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'other') {
      const r = applyStagePeriodFilter(data.otherLocations.rows || [], govStockCheckState, 'date')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.item,
        regardingMeta: `${r.from} → ${r.to} · ${r.status}`,
        status: r.status,
        date: r.date || '—',
        subject: `Follow-up: Transfer — ${r.item}`,
        contextLines: [
          ['Source', 'Stock Check · Other Locations'],
          ['From', r.from],
          ['To', r.to],
          ['Item', r.item],
          ['Qty', r.qty],
          ['Status', r.status],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'openpo') {
      const r = applyStagePeriodFilter(data.openPos.rows || [], govStockCheckState, 'date')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.po,
        regardingMeta: `${r.item} · ${r.status}`,
        status: r.status,
        date: r.date || '—',
        subject: `Follow-up: Open PO — ${r.po}`,
        contextLines: [
          ['Source', 'Stock Check · Approved Open POs'],
          ['PO', r.po],
          ['Vendor', r.vendor],
          ['Item', r.item],
          ['Facility', r.facility],
          ['ETA', r.eta],
          ['Status', r.status],
          ['Status since', r.date || '—']
        ]
      };
    }
    if (section === 'redistribute') {
      const r = applyStagePeriodFilter(data.redistributable.rows || [], govStockCheckState, 'date')[i];
      if (!r) return null;
      return {
        stage, section, index: i,
        regardingTitle: r.item,
        regardingMeta: `${r.from} → ${r.to} · ${r.status}`,
        status: r.status,
        date: r.date || '—',
        subject: `Follow-up: Redistribute — ${r.item}`,
        contextLines: [
          ['Source', 'Stock Check · Redistributable Inventory'],
          ['From', r.from],
          ['To', r.to],
          ['Item', r.item],
          ['Qty', r.qty],
          ['Savings', r.savings],
          ['Status', r.status],
          ['Status since', r.date || '—']
        ]
      };
    }
  }
  if (stage === 'indent' && section === 'row') {
    const r = getIndentRowById(String(index));
    if (!r) return null;
    return {
      stage, section, index: r.id,
      regardingTitle: r.item,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date: r.date || '—',
      subject: `Follow-up: Indent ${r.id} — ${r.item}`,
      contextLines: [
        ['Source', 'Indent Raised · Indent List'],
        ['Indent ID', r.id],
        ['Item', r.item],
        ['Facility', r.facility || '—'],
        ['Quantity', r.quantity || '—'],
        ['Priority', r.priority || '—'],
        ['Status', r.status || '—'],
        ['Required by', r.requiredBy || '—'],
        ['Status since', r.date || '—']
      ]
    };
  }
  if (stage === 'consol' && section === 'demand') {
    const seed = typeof DEMAND_APPROVAL_LIST !== 'undefined' ? DEMAND_APPROVAL_LIST : [];
    const r = seed.find(x => x.id === String(index));
    if (!r) return null;
    return {
      stage, section, index: r.id,
      regardingTitle: r.id,
      regardingMeta: `${r.district} · ${r.status}`,
      status: r.status,
      date: r.date || '—',
      subject: `Follow-up: Demand ${r.id} — ${r.district}`,
      contextLines: [
        ['Source', 'Demand Consolidation · Demand List'],
        ['Demand ID', r.id],
        ['District', r.district],
        ['Category', r.category],
        ['Items', String(r.items)],
        ['Facilities', String(r.facilities)],
        ['Estimated value', `${r.valueLow} – ${r.valueHigh}`],
        ['Status', r.status],
        ['Date', r.date || '—']
      ]
    };
  }
  if (stage === 'budget' && section === 'dept') {
    const data = getPrBudgetData();
    const r = data?.departments?.find(d => d.id === String(index));
    if (!r) return null;
    const date = (r.decisionDate && r.decisionDate !== '—')
      ? r.decisionDate
      : (r.documents?.[0]?.uploadedOn || r.decisionDate || '—');
    return {
      stage, section, index: r.id,
      regardingTitle: r.name,
      regardingMeta: `${r.shortName} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Budget — ${r.shortName} (${r.status})`,
      contextLines: [
        ['Source', 'PR & Budget Approval · PR & Budget List'],
        ['Department', r.name],
        ['Budget head', r.budgetHead],
        ['Scheme', r.scheme],
        ['Allocated', r.allocated],
        ['Requested', r.requested],
        ['Available', r.available],
        ['Status', r.status],
        ['Decision by', r.decisionBy || '—'],
        ['Date', date]
      ]
    };
  }
  if (stage === 'tender' && (section === 'draft' || section === 'row')) {
    const t = getTenderPrepById(String(index));
    if (!t) return null;
    return {
      stage, section, index: t.id,
      regardingTitle: t.title,
      regardingMeta: `${t.id} · ${t.status}`,
      status: t.status,
      date: t.preparedOn || '—',
      subject: `Follow-up: Tender ${t.id} — ${t.title}`,
      contextLines: [
        ['Source', section === 'draft' ? 'Tender Preparation · Auto-prepared drafts' : 'Tender Preparation · Status by category & division'],
        ['Tender ID', t.id],
        ['Title', t.title],
        ['Division', t.division],
        ['Category', t.category],
        ['Status', t.status],
        ['Est. value', t.value],
        ['Status since', t.preparedOn || '—']
      ]
    };
  }
  if (stage === 'bid' && section === 'eval') {
    const r = (typeof BID_EVALUATION_DATA !== 'undefined' ? BID_EVALUATION_DATA.evaluations : []).find(e => e.id === String(index));
    if (!r) return null;
    const date = (r.evalDate && r.evalDate !== '—') ? r.evalDate : '—';
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Bid evaluation ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Bid Evaluation · Bids evaluated'],
        ['Eval ID', r.id],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Status', r.status],
        ['Method', r.method],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'contract' && section === 'row') {
    const r = (typeof CONTRACT_APPROVAL_DATA !== 'undefined' ? CONTRACT_APPROVAL_DATA.contracts : []).find(c => c.id === String(index));
    if (!r) return null;
    const date = getContractStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Contract ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Contract Approval · Contract approvals'],
        ['Contract ID', r.id],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['L1 bidder', r.l1Vendor],
        ['Status', r.status],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'award' && section === 'row') {
    const r = (typeof AWARD_STAGE_DATA !== 'undefined' ? AWARD_STAGE_DATA.awards : []).find(a => a.id === String(index));
    if (!r) return null;
    const date = getAwardStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Award ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Award · Tenders awarded'],
        ['Award ID', r.id],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Vendor', r.vendor],
        ['Status', r.status],
        ['PBG', r.pbgStatus],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'po' && section === 'row') {
    const r = (typeof PURCHASE_ORDER_DATA !== 'undefined' ? PURCHASE_ORDER_DATA.orders : []).find(o => o.id === String(index));
    if (!r) return null;
    const date = getPoStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Purchase order ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Purchase Order · Purchase orders'],
        ['PO ID', r.id],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Vendor', r.vendor],
        ['Status', r.status],
        ['Vendor notified', r.vendorNotified],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'grn' && section === 'row') {
    const r = (typeof GRN_INSPECTION_DATA !== 'undefined' ? GRN_INSPECTION_DATA.receipts : []).find(g => g.id === String(index));
    if (!r) return null;
    const date = getGrnStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: GRN ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'GRN & Inspection · GRNs'],
        ['GRN ID', r.id],
        ['PO ID', r.poId],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Vendor', r.vendor],
        ['Status', r.status],
        ['QA', r.qaStatus],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'invoice' && section === 'row') {
    const r = (typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA.invoices : []).find(i => i.id === String(index));
    if (!r) return null;
    const date = getInvoiceStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Invoice ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Invoice Matching · Invoices generated'],
        ['Invoice ID', r.id],
        ['PO ID', r.poId],
        ['GRN ID', r.grnId],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Vendor', r.vendor],
        ['Status', r.status],
        ['Match score', r.matchScore],
        ['Status since', date]
      ]
    };
  }
  if (stage === 'payment' && section === 'row') {
    const r = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).find(p => p.id === String(index));
    if (!r) return null;
    const date = getPaymentStatusDate(r);
    return {
      stage, section, index: r.id,
      regardingTitle: r.title,
      regardingMeta: `${r.id} · ${r.status}`,
      status: r.status,
      date,
      subject: `Follow-up: Payment ${r.id} — ${r.title}`,
      contextLines: [
        ['Source', 'Payment · Payments generated'],
        ['Payment ID', r.id],
        ['Invoice ID', r.invoiceId],
        ['PO ID', r.poId],
        ['Tender ID', r.tenderId],
        ['Title', r.title],
        ['Division', r.division],
        ['Category', r.category],
        ['Vendor', r.vendor],
        ['Status', r.status],
        ['Net payable', r.netPayable],
        ['Status since', date]
      ]
    };
  }
  return null;
}

function openNeedFollowUpModal(section, index) {
  openStageFollowUpModal('need', section, index);
}

function openStageFollowUpModal(stage, section, index) {
  if (currentRole !== 'gov') return;
  const ctx = resolveFollowUpRowContext(stage, section, index);
  if (!ctx) return;

  needFollowUpContext = {
    ...ctx,
    selected: [],
    pendingMessage: ''
  };

  const body = `<div class="kpi-detail need-row-detail follow-up-form">
    <div class="follow-up-summary" aria-label="Follow-up context">
      <div class="follow-up-summary-item">
        <span>From</span>
        <strong>${escapeFollowUpHtml(FOLLOW_UP_SENDER.name)}</strong>
        <em>${escapeFollowUpHtml(FOLLOW_UP_SENDER.email)}</em>
      </div>
      <div class="follow-up-summary-item">
        <span>Regarding</span>
        <strong title="${escapeFollowUpHtml(ctx.regardingTitle)}">${escapeFollowUpHtml(ctx.regardingTitle)}</strong>
        <em>${escapeFollowUpHtml(ctx.regardingMeta)}</em>
      </div>
    </div>

    <div class="follow-up-field">
      <label for="followUpSearch">
        <span>To</span>
        <span class="follow-up-field-hint" id="followUpSelectedCount">Search roles to add</span>
      </label>
      <div class="follow-up-picker" id="followUpPicker">
        <div class="follow-up-chips" id="followUpChips" aria-live="polite"></div>
        <div class="follow-up-search-wrap">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" id="followUpSearch" class="follow-up-search" placeholder="Type a role name (e.g. Finance, Stores, CMO)…" autocomplete="off" aria-autocomplete="list" aria-controls="followUpSuggestions" aria-expanded="false">
        </div>
        <div class="follow-up-suggestions" id="followUpSuggestions" role="listbox" aria-label="Matching roles"></div>
      </div>
      <div class="follow-up-quick" id="followUpQuick" aria-label="Suggested roles"></div>
    </div>

    <div class="follow-up-field">
      <label for="followUpMessage">
        <span>Message</span>
        <span class="follow-up-field-hint">Required</span>
      </label>
      <textarea id="followUpMessage" class="follow-up-message" rows="5" placeholder="Write a clear follow-up note for the selected roles…"></textarea>
    </div>

    <div class="follow-up-actions">
      <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div class="follow-up-actions-right">
        <button type="button" class="btn btn-primary" id="followUpSendBtn" onclick="submitNeedFollowUp()" disabled>
          <i class="fa-solid fa-paper-plane"></i> Send follow-up
        </button>
      </div>
    </div>
  </div>`;

  openModal('Take Follow-up', body, { wide: true });
  initFollowUpRecipientPicker();
  updateFollowUpSendState();
}

function updateFollowUpSendState() {
  const btn = document.getElementById('followUpSendBtn');
  const msg = document.getElementById('followUpMessage');
  if (!btn || !msg) return;
  btn.disabled = !msg.value.trim();
}

function initFollowUpRecipientPicker() {
  const picker = document.getElementById('followUpPicker');
  const search = document.getElementById('followUpSearch');
  if (!picker || !search) return;

  const openPicker = () => {
    picker.classList.add('is-open');
    search.setAttribute('aria-expanded', 'true');
    renderFollowUpSuggestions(search.value);
  };
  const closePicker = () => {
    picker.classList.remove('is-open');
    search.setAttribute('aria-expanded', 'false');
  };

  search.addEventListener('focus', openPicker);
  search.addEventListener('click', openPicker);
  search.addEventListener('input', () => {
    openPicker();
    renderFollowUpSuggestions(search.value);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePicker();
      search.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = getFollowUpSuggestionMatches(search.value)[0];
      if (first) addFollowUpRecipient(first.role);
    }
  });

  const message = document.getElementById('followUpMessage');
  message?.addEventListener('input', updateFollowUpSendState);
  message?.addEventListener('change', updateFollowUpSendState);

  document.addEventListener('click', function followUpOutside(e) {
    if (!document.getElementById('followUpPicker')) {
      document.removeEventListener('click', followUpOutside);
      return;
    }
    if (!picker.contains(e.target) && !e.target.closest?.('.follow-up-quick')) closePicker();
  });

  renderFollowUpChips();
  renderFollowUpQuickPicks();
  renderFollowUpSuggestions('');
}

function getFollowUpSuggestionMatches(query) {
  if (!needFollowUpContext) return [];
  const selectedRoles = new Set((needFollowUpContext.selected || []).map(r => r.role));
  const q = String(query || '').trim().toLowerCase();
  return getFollowUpRecipients().filter(r => {
    if (selectedRoles.has(r.role)) return false;
    if (!q) return true;
    return r.role.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      String(r.name || '').toLowerCase().includes(q);
  });
}

function renderFollowUpChips() {
  const chips = document.getElementById('followUpChips');
  const count = document.getElementById('followUpSelectedCount');
  if (!chips || !needFollowUpContext) return;
  const selected = needFollowUpContext.selected || [];
  chips.innerHTML = selected.map(r => `
    <span class="follow-up-chip" title="${escapeFollowUpHtml(r.email)}">
      <span>${escapeFollowUpHtml(r.role)}</span>
      <button type="button" onclick="removeFollowUpRecipient('${escapeFollowUpHtml(r.role).replace(/'/g, "\\'")}')" aria-label="Remove ${escapeFollowUpHtml(r.role)}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
  if (count) {
    count.textContent = selected.length
      ? `${selected.length} selected`
      : 'Search roles to add';
  }
  renderFollowUpQuickPicks();
}

function renderFollowUpQuickPicks() {
  const wrap = document.getElementById('followUpQuick');
  if (!wrap || !needFollowUpContext) return;
  const preferred = [
    'Procurement Officer',
    'Finance / Budget Officer',
    'Stores / Warehouse Manager',
    'District CMO / Administrative Officer'
  ];
  const selectedRoles = new Set((needFollowUpContext.selected || []).map(r => r.role));
  const picks = getFollowUpRecipients()
    .filter(r => preferred.includes(r.role) && !selectedRoles.has(r.role))
    .slice(0, 4);
  if (!picks.length) {
    wrap.innerHTML = '';
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  wrap.innerHTML = `
    <span class="follow-up-quick-label">Quick add</span>
    <div class="follow-up-quick-list">
      ${picks.map(r => `
        <button type="button" class="follow-up-quick-btn" onclick="addFollowUpRecipient('${escapeFollowUpHtml(r.role).replace(/'/g, "\\'")}')">
          ${escapeFollowUpHtml(r.role)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderFollowUpSuggestions(query) {
  const list = document.getElementById('followUpSuggestions');
  if (!list || !needFollowUpContext) return;
  const q = String(query || '').trim();
  const matches = getFollowUpSuggestionMatches(query);

  if (!q) {
    list.innerHTML = `<div class="follow-up-empty">
      <strong>Type to find a role</strong>
      <span>Search scales cleanly as more account roles are added. Use Quick add for common recipients.</span>
    </div>`;
    return;
  }

  if (!matches.length) {
    list.innerHTML = `<div class="follow-up-empty">No roles match “${escapeFollowUpHtml(q)}”.</div>`;
    return;
  }

  list.innerHTML = matches.map(r => `
    <button type="button" class="follow-up-suggestion" role="option" onclick="addFollowUpRecipient('${escapeFollowUpHtml(r.role).replace(/'/g, "\\'")}')">
      <span>
        <strong>${escapeFollowUpHtml(r.role)}</strong>
        <em>${escapeFollowUpHtml(r.email)}</em>
      </span>
      <span class="follow-up-suggestion-add">Add</span>
    </button>
  `).join('');
}

function addFollowUpRecipient(role) {
  if (!needFollowUpContext) return;
  const rec = getFollowUpRecipients().find(r => r.role === role);
  if (!rec) return;
  if ((needFollowUpContext.selected || []).some(r => r.role === role)) return;
  needFollowUpContext.selected.push({ ...rec });
  const search = document.getElementById('followUpSearch');
  if (search) search.value = '';
  renderFollowUpChips();
  renderFollowUpSuggestions('');
  document.getElementById('followUpPicker')?.classList.add('is-open');
  search?.focus();
}

function removeFollowUpRecipient(role) {
  if (!needFollowUpContext) return;
  needFollowUpContext.selected = (needFollowUpContext.selected || []).filter(r => r.role !== role);
  renderFollowUpChips();
  renderFollowUpSuggestions(document.getElementById('followUpSearch')?.value || '');
}

function submitNeedFollowUp() {
  const recipients = needFollowUpContext?.selected || [];
  const message = document.getElementById('followUpMessage')?.value.trim() || '';
  if (!recipients.length) {
    showWfAlert('Please add at least one recipient role.');
    document.getElementById('followUpSearch')?.focus();
    return;
  }
  if (!message) {
    showWfAlert('Please enter a follow-up message.');
    document.getElementById('followUpMessage')?.focus();
    updateFollowUpSendState();
    return;
  }

  needFollowUpContext.pendingMessage = message;
  openFollowUpConfirmModal();
}

function openFollowUpConfirmModal() {
  const recipients = needFollowUpContext?.selected || [];
  if (!recipients.length || !needFollowUpContext?.pendingMessage) return;

  const body = `<div class="follow-up-confirm">
    <p class="follow-up-confirm-lead">
      Send this follow-up from <strong>${escapeFollowUpHtml(FOLLOW_UP_SENDER.name)}</strong>
      (<strong>${escapeFollowUpHtml(FOLLOW_UP_SENDER.email)}</strong>) to
      <strong>${recipients.length}</strong> recipient${recipients.length === 1 ? '' : 's'}?
    </p>
    <ul class="follow-up-confirm-list">
      ${recipients.map(r => `
        <li>
          <strong>${escapeFollowUpHtml(r.role)}</strong>
          <span>${escapeFollowUpHtml(r.name || r.role)} · ${escapeFollowUpHtml(r.email)}</span>
        </li>
      `).join('')}
    </ul>
    <div class="follow-up-actions">
      <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-xmark"></i> Cancel</button>
      <div class="follow-up-actions-right">
        <button type="button" class="btn btn-primary" onclick="confirmNeedFollowUpSend()">
          <i class="fa-solid fa-paper-plane"></i> Confirm &amp; send
        </button>
      </div>
    </div>
  </div>`;

  openModal('Confirm follow-up', body, { wide: true });
}

function confirmNeedFollowUpSend() {
  const recipients = needFollowUpContext?.selected || [];
  const message = needFollowUpContext?.pendingMessage || '';
  const ctx = needFollowUpContext || {};
  if (!recipients.length || !message) {
    showWfAlert('Follow-up details are incomplete.');
    return;
  }

  const subject = ctx.subject || 'MP Health Procurement — Follow-up';
  const detailLines = (ctx.contextLines || [
    ['Status', ctx.status || '—'],
    ['Status since', ctx.date || '—']
  ]).map(([label, value]) => `${label}: ${value}`);
  const bodyLines = [
    `Dear Colleague,`,
    ``,
    message,
    ``,
    `---`,
    `Context`,
    ...detailLines,
    ``,
    `Sent by: ${FOLLOW_UP_SENDER.name} <${FOLLOW_UP_SENDER.email}>`,
    `MP Health Procurement Portal`
  ];
  const mailto = `mailto:${recipients.map(r => encodeURIComponent(r.email)).join(',')}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyLines.join('\n'))}`;

  try {
    const mailLink = document.createElement('a');
    mailLink.href = mailto;
    mailLink.target = '_blank';
    mailLink.rel = 'noopener';
    document.body.appendChild(mailLink);
    mailLink.click();
    mailLink.remove();
  } catch (_) {
    /* Prototype: continue with success even if mail client is unavailable */
  }

  openFollowUpSuccessModal(recipients);
}

function openFollowUpSuccessModal(recipients) {
  const list = (recipients || []).map(r => `
    <li>
      <strong>${escapeFollowUpHtml(r.role)}</strong>
      <span>${escapeFollowUpHtml(r.name || r.role)} · ${escapeFollowUpHtml(r.email)}</span>
    </li>
  `).join('');

  const body = `<div class="follow-up-success">
    <div class="follow-up-success-icon"><i class="fa-solid fa-circle-check"></i></div>
    <p class="follow-up-success-text">Email sent successfully</p>
    <p class="follow-up-success-hint">
      From <strong>${escapeFollowUpHtml(FOLLOW_UP_SENDER.name)}</strong>
      (${escapeFollowUpHtml(FOLLOW_UP_SENDER.email)})
    </p>
    <ul class="follow-up-confirm-list" style="text-align:left">
      ${list}
    </ul>
    <div class="logout-confirm-actions">
      <button type="button" class="btn btn-primary" onclick="finishFollowUpSuccess()">
        <i class="fa-solid fa-check"></i> Done
      </button>
    </div>
  </div>`;

  openModal('Email sent', body, { wide: true, replace: true });
  showWfAlert(`Follow-up email sent to ${recipients.length} recipient(s).`, 'success');
}

function finishFollowUpSuccess() {
  needFollowUpContext = null;
  // Leave success -> leave follow-up form -> return to Assessment detail
  modalGoBack();
  modalGoBack();
}

function openNeedRowDetail(section, index) {
  const data = getNeedIdentificationData();
  if (!data) return;
  const i = Number(index);
  let title = 'Need Identification Detail';
  let body = '';

  const needDetailRows = (rows) => rows.map(([k, v]) =>
    `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(String(v))}</td></tr>`
  ).join('');

  if (section === 'stock') {
    const r = getNeedSectionRows('stock')[i];
    if (!r) return;
    const shortfall = Math.max(0, r.reorder - r.onHand);
    const fillPct = r.reorder ? Math.round((r.onHand / r.reorder) * 100) : 0;
    const nextStep = r.status === 'Critical' || r.status === 'Low'
      ? 'Prioritize indent / redistribution before fresh tender'
      : 'Monitor consumption; no immediate action';
    title = `${escapeHtmlLite(r.sku)} — Stock detail`;
    body = `<div class="dvdms-detail need-dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">DVDMS · Need identification</p>
          <h3>${escapeHtmlLite(r.sku)}</h3>
          <p>${escapeHtmlLite(r.facility)} · Stock vs reorder</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>On hand</span><strong>${r.onHand.toLocaleString('en-IN')}</strong></div>
        <div class="dvdms-detail-stat"><span>Reorder point</span><strong>${r.reorder.toLocaleString('en-IN')}</strong></div>
        <div class="dvdms-detail-stat"><span>Days of cover</span><strong>${escapeHtmlLite(String(r.coverDays))}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(r.date || '—')}</strong></div>
      </div>
      <div class="dvdms-detail-panel need-detail-panel">
        <div class="dvdms-detail-panel-head">
          <span>Assessment</span>
          ${followUpActionButton('need', 'stock', i)}
        </div>
        <table class="dvdms-detail-table">
          <tbody>
            ${needDetailRows([
              ['Facility', r.facility],
              ['SKU / Item', r.sku],
              ['Fill vs reorder', `${fillPct}%`],
              ['Shortfall to reorder', `${shortfall.toLocaleString('en-IN')} units`],
              ['Recommended next step', nextStep]
            ])}
          </tbody>
        </table>
      </div>
      <p class="dvdms-detail-note">Stock position synced from DVDMS. Prefer redistribution before fresh tender when status is Critical or Low.</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    </div>`;
  } else if (section === 'patient') {
    const r = getNeedSectionRows('patient')[i];
    if (!r) return;
    title = `Patient Load — ${escapeHtmlLite(r.facility)}`;
    body = `<div class="dvdms-detail need-dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">DVDMS · Need identification</p>
          <h3>${escapeHtmlLite(r.facility)}</h3>
          <p>${escapeHtmlLite(r.category)} · OPD / IPD load</p>
        </div>
        <span class="badge badge-info">${escapeHtmlLite(r.trend || '—')}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Facility type</span><strong>${escapeHtmlLite(r.category)}</strong></div>
        <div class="dvdms-detail-stat"><span>OPD (month)</span><strong>${r.opd.toLocaleString('en-IN')}</strong></div>
        <div class="dvdms-detail-stat"><span>IPD bed occ.</span><strong>${escapeHtmlLite(String(r.ipdBedOcc))}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(r.date || '—')}</strong></div>
      </div>
      <div class="dvdms-detail-panel need-detail-panel">
        <div class="dvdms-detail-panel-head">
          <span>Demand implication</span>
          ${followUpActionButton('need', 'patient', i)}
        </div>
        <table class="dvdms-detail-table">
          <tbody>
            ${needDetailRows([
              ['Facility', r.facility],
              ['Trend', r.trend],
              ['Status since', r.date || '—'],
              ['Planning note', 'Higher OPD and bed occupancy increase formulary burn-rate for antipyretics, IV fluids, and antibiotics.']
            ])}
          </tbody>
        </table>
      </div>
      <p class="dvdms-detail-note">Use this load signal when consolidating district demand in Stage 4.</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    </div>`;
  } else if (section === 'disease') {
    const r = getNeedSectionRows('disease')[i];
    if (!r) return;
    title = `Disease Burden — ${escapeHtmlLite(r.condition)}`;
    body = `<div class="dvdms-detail need-dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">DVDMS · Need identification</p>
          <h3>${escapeHtmlLite(r.condition)}</h3>
          <p>Programme demand · ${escapeHtmlLite(r.skuFocus || 'Formulary focus')}</p>
        </div>
        <span class="badge badge-${needStatusBadge(r.priority)}">${escapeHtmlLite(r.priority)}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Cases</span><strong>${escapeHtmlLite(String(r.cases))}</strong></div>
        <div class="dvdms-detail-stat"><span>Trend</span><strong>${escapeHtmlLite(r.trend)}</strong></div>
        <div class="dvdms-detail-stat"><span>Priority</span><strong>${escapeHtmlLite(r.priority)}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(r.date || '—')}</strong></div>
      </div>
      <div class="dvdms-detail-panel need-detail-panel">
        <div class="dvdms-detail-panel-head">
          <span>Procurement focus</span>
          ${followUpActionButton('need', 'disease', i)}
        </div>
        <table class="dvdms-detail-table">
          <tbody>
            ${needDetailRows([
              ['Condition', r.condition],
              ['SKU focus', r.skuFocus],
              ['Priority', r.priority],
              ['Recommended next step', 'Ensure buffer stock and open-PO coverage; flag in Gap Analysis before indent raise.']
            ])}
          </tbody>
        </table>
      </div>
      <p class="dvdms-detail-note">Programme-driven demand signal for formulary planning, synced from DVDMS.</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    </div>`;
  } else if (section === 'gap') {
    const r = getNeedSectionRows('gap')[i];
    if (!r) return;
    title = `Gap Analysis — ${escapeHtmlLite(r.item)}`;
    body = `<div class="dvdms-detail need-dvdms-detail">
      <div class="dvdms-detail-banner">
        <div>
          <p class="dvdms-detail-eyebrow">DVDMS · Need identification</p>
          <h3>${escapeHtmlLite(r.item)}</h3>
          <p>Net requirement after stock and open PO</p>
        </div>
        <span class="badge badge-info">${escapeHtmlLite(r.action || 'Review')}</span>
      </div>
      <div class="dvdms-detail-stats">
        <div class="dvdms-detail-stat"><span>Required</span><strong>${escapeHtmlLite(String(r.required))}</strong></div>
        <div class="dvdms-detail-stat"><span>Available</span><strong>${escapeHtmlLite(String(r.available))}</strong></div>
        <div class="dvdms-detail-stat"><span>Gap</span><strong>${escapeHtmlLite(String(r.gap))}</strong></div>
        <div class="dvdms-detail-stat"><span>Status since</span><strong>${escapeHtmlLite(r.date || '—')}</strong></div>
      </div>
      <div class="dvdms-detail-panel need-detail-panel">
        <div class="dvdms-detail-panel-head">
          <span>Recommended action</span>
          ${followUpActionButton('need', 'gap', i)}
        </div>
        <table class="dvdms-detail-table">
          <tbody>
            ${needDetailRows([
              ['Item', r.item],
              ['Open PO', r.openPo],
              ['Action', r.action],
              ['Status since', r.date || '—']
            ])}
          </tbody>
        </table>
      </div>
      <p class="dvdms-detail-note">Prefer redistribution / open-PO utilization before raising a fresh tender for the residual gap.</p>
      <div class="modal-inline-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
    </div>`;
  } else {
    return;
  }

  openModal(title, body, { wide: true, large: true });
}

function openGovWorkflowSectionModal(section) {
  if (section === 'demand') {
    const rows = [
      { source: 'Central warehouse', items: 12, value: '₹0.95 Cr', action: 'Issue stock transfer' },
      { source: 'Other facilities', items: 8, value: '₹0.62 Cr', action: 'Inter-facility redistribute' },
      { source: 'Approved open POs', items: 5, value: '₹0.38 Cr', action: 'Expedite delivery' },
      { source: 'Redistributable surplus', items: 3, value: '₹0.15 Cr', action: 'Reallocate to deficit sites' }
    ];
    openModal('Demand Optimization', `
      <div class="kpi-detail">
        <p class="need-row-detail-lead">Fulfill demand from existing stock and open POs before fresh procurement. Estimated savings <strong>₹2.1 Cr</strong>.</p>
        <div class="tender-detail-stats tender-detail-stats--4">
          <div class="tender-stat"><span>Optimizable items</span><strong>28</strong></div>
          <div class="tender-stat"><span>Warehouse</span><strong>12</strong></div>
          <div class="tender-stat"><span>Other locations</span><strong>8</strong></div>
          <div class="tender-stat"><span>Open POs</span><strong>5</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Optimization sources</h4>
          <div class="data-table-wrap">
            <table class="data-table data-table--modal">
              <thead><tr><th>Source</th><th>Items</th><th>Est. value</th><th>Next action</th></tr></thead>
              <tbody>
                ${rows.map(r => `<tr><td><strong>${r.source}</strong></td><td>${r.items}</td><td>${r.value}</td><td>${r.action}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-inline-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
          <button type="button" class="btn btn-primary" onclick="selectWorkflowStep(4); closeModal();">Go to Demand Consolidation</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (section === 'contract') {
    const pending = [
      { id: 'CNT-2026-0089', tender: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', status: 'Pending execution', owner: 'Contract Manager', due: '05-09-2026' },
      { id: 'CNT-2026-0095', tender: 'TND-2026-MP-0061', title: 'HMIS Software Upgrade', status: 'Legal review', owner: 'Legal Cell', due: '08-09-2026' },
      { id: 'CNT-2025-0234', tender: 'TND-2025-MP-0198', title: 'Essential Medicines RC', status: 'PBG renewal', owner: 'Finance Wing', due: '12-09-2026' }
    ];
    openModal('Contract Gate', `
      <div class="kpi-detail">
        <p class="need-row-detail-lead">Policy gate: <strong>contract approval and execution must precede PO generation</strong>. ${pending.length} contracts require action.</p>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Pending contracts</span><strong>3</strong></div>
          <div class="tender-stat"><span>Policy stage</span><strong>Stage 8</strong></div>
          <div class="tender-stat"><span>Status</span><strong><span class="badge badge-warning">Action Required</span></strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Contracts awaiting clearance</h4>
          <div class="data-table-wrap">
            <table class="data-table data-table--modal">
              <thead><tr><th>Contract</th><th>Tender</th><th>Title</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead>
              <tbody>
                ${pending.map(c => `<tr>
                  <td><strong>${c.id}</strong></td><td>${c.tender}</td><td>${c.title}</td>
                  <td><span class="badge badge-warning">${c.status}</span></td>
                  <td>${c.owner}</td><td>${c.due}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-inline-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
          <button type="button" class="btn btn-primary" onclick="selectWorkflowStep(8); closeModal();">Go to Contract Approval</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (section === 'eval') {
    const members = [
      { role: 'Procurement', name: 'Dr. Sharma', status: 'Chair' },
      { role: 'Stores', name: 'Store Manager — Bhopal', status: 'Member' },
      { role: 'Finance', name: 'GM Finance', status: 'Member' },
      { role: 'Quality', name: 'Biomedical / QC Lead', status: 'Member' },
      { role: 'Evaluation', name: 'Technical Committee', status: 'Scoring' }
    ];
    const tenders = (typeof TENDERS !== 'undefined' ? TENDERS : []).filter(t => t.status === 'Evaluation');
    openModal('Evaluation Committee', `
      <div class="kpi-detail">
        <p class="need-row-detail-lead">Technical + financial evaluation using L1 / QCBS. Committee spans Procurement, Stores, Finance, Quality, and Evaluation roles.</p>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Tenders in evaluation</span><strong>${tenders.length || 2}</strong></div>
          <div class="tender-stat"><span>Method</span><strong>L1 / QCBS</strong></div>
          <div class="tender-stat"><span>Status</span><strong><span class="badge badge-info">In Progress</span></strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Committee composition</h4>
          <div class="data-table-wrap">
            <table class="data-table data-table--modal">
              <thead><tr><th>Role</th><th>Officer</th><th>Assignment</th></tr></thead>
              <tbody>
                ${members.map(m => `<tr><td><strong>${m.role}</strong></td><td>${m.name}</td><td>${m.status}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-section">
          <h4>Tenders under evaluation</h4>
          <div class="data-table-wrap">
            <table class="data-table data-table--modal">
              <thead><tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Bids</th><th>Deadline</th></tr></thead>
              <tbody>
                ${(tenders.length ? tenders : [
                  { id: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', category: 'Drugs', bids: 8, deadline: '2026-09-15' },
                  { id: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', category: 'Others', bids: 3, deadline: '2026-09-12' }
                ]).map(t => `<tr>
                  <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td>
                  <td>${t.bids}</td><td>${formatDateDMY(t.deadline)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-inline-actions">
          <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
          <button type="button" class="btn btn-primary" onclick="selectWorkflowStep(7); closeModal();">Go to Bid Evaluation</button>
        </div>
      </div>
    `, { wide: true, large: true });
  }
}

function refreshNeedIdentificationApi() {
  const btn = document.querySelector('.need-api:not(.stock-check-api) .need-api-banner-actions .btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing…';
  }
  setTimeout(() => {
    const failed = Math.random() < 0.28;
    if (typeof NEED_IDENTIFICATION_API !== 'undefined') {
      if (failed) {
        NEED_IDENTIFICATION_API.meta.status = 'Not synced';
      } else {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        NEED_IDENTIFICATION_API.meta.lastSynced =
          `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} IST`;
        NEED_IDENTIFICATION_API.meta.status = 'Synced';
      }
    }
    refreshWorkflowUI();
    if (failed) {
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Need assessment could not be updated</h4>
          <p>We could not refresh stock levels, patient load, disease burden, or gap analysis right now. The banner shows <strong>Not synced</strong>. Please try again in a moment.</p>
        </div>
      `);
      return;
    }
    openModal('Data refreshed', `
      <div class="sync-success-msg">
        <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <h4>Latest need assessment is ready</h4>
        <p>Stock levels, patient load, disease burden, and gap analysis have been updated with the newest information from connected systems. You can review the tables below and continue with planning.</p>
      </div>
    `);
  }, 650);
}

function renderWorkflowDetailPanel(step, progress, total) {
  const canEdit = currentRole === 'vendor'
    ? vendorCanEditStage(step.id, progress)
    : (step.id <= progress || step.id === 14);
  const showStatusBadge = step.id !== 14;
  let badgeKind;
  let badgeLabel;
  if (currentRole === 'vendor') {
    const stageDone = !!vendorStageState.completed[step.id] || isVendorStageActionComplete(step.id);
    if (stageDone && step.id < progress) {
      badgeKind = 'success';
      badgeLabel = 'Completed';
    } else if (step.id === currentWorkflowStep || step.id === progress) {
      badgeKind = 'info';
      badgeLabel = stageDone ? 'Completed' : 'In Progress';
    } else if (stageDone) {
      badgeKind = 'success';
      badgeLabel = 'Completed';
    } else {
      badgeKind = 'muted';
      badgeLabel = 'Upcoming';
    }
  } else {
    badgeKind = step.id < progress ? 'success' : step.id === progress ? 'info' : 'muted';
    badgeLabel = step.id < progress ? 'Completed' : step.id === progress ? 'In Progress' : 'Upcoming';
  }
  return `
    ${renderWorkflowViewBanner(step, progress)}
    <div class="wf-detail-header">
      <div>
        <span class="wf-stage-badge">Stage ${step.id}</span>
        <h3>${currentRole === 'gov' && step.id === 1 ? 'Identify the needs'
          : currentRole === 'gov' && step.id === 2 ? 'Check Stock Details'
          : currentRole === 'gov' && step.id === 3 ? 'Raised Indent Details'
          : currentRole === 'gov' && step.id === 4 ? 'Consolidation Demand Details'
          : currentRole === 'gov' && step.id === 5 ? 'PR & Budget Details'
          : currentRole === 'gov' && step.id === 6 ? 'Prepared Tender Details'
          : currentRole === 'gov' && step.id === 7 ? 'Evaluated Bid Details'
          : step.name}</h3>
        ${step.desc ? `<p>${step.desc}</p>` : ''}
      </div>
      ${showStatusBadge ? `<span class="badge badge-${badgeKind}">${badgeLabel}</span>` : ''}
    </div>
    ${renderWorkflowChecklist(step)}
    ${renderWorkflowDetail(step, canEdit)}
    ${renderWorkflowStepNav(step, total)}
  `;
}

function renderWorkflowDetail(step, canEdit = true) {
  const catNote = currentCategory !== 'All' ? ` — ${currentCategory} category` : '';
  const disabled = canEdit ? '' : ' disabled';
  const readonly = canEdit ? '' : ' readonly';

  if (currentRole === 'gov' && step.id === 1) {
    return renderNeedIdentificationStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 2) {
    return renderStockCheckStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 3) {
    return renderIndentRaisedStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 4) {
    return renderDemandConsolidationStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 5) {
    return renderPrBudgetApprovalStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 6) {
    return renderTenderPreparationStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 7) {
    return renderBidEvaluationStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 8) {
    return renderContractApprovalStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 9) {
    return renderAwardStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 10) {
    return renderPurchaseOrderStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 11) {
    return renderGrnInspectionStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 12) {
    return renderInvoiceMatchingStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 13) {
    return renderPaymentStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 14) {
    return renderRenewalStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 1) {
    const regCategories = getRegistrationCategories();
    const values = getVendorRegFormValues();
    const synced = isVendorRegistrationSynced();
    const blank = !synced && !isSeededDemoVendor() && !vendorStageState.completed?.[1];
    const selectedCategories = normalizeRegCategories(values.categories || values.category)
      .filter(c => regCategories.includes(c));
    const districts = getRegistrationDistricts();
    const districtOptions = blank && !values.district ? ['Select district', ...districts] : districts;
    const districtSelected = values.district && districts.includes(values.district)
      ? values.district
      : (blank ? 'Select district' : (districts[0] || 'Bhopal'));
    const fieldLock = (!canEdit || synced) ? ' readonly' : '';
    const note = synced
      ? 'Registration details including empanelment fee were loaded from the system. <strong>Pending</strong> appears only when a required record is missing; otherwise status is <strong>Submitted</strong>.'
      : 'New vendors enter company, registered address and empanelment fee here. Complete Online / Offline fee payment so status moves from <strong>Pending</strong> to <strong>Submitted</strong>, then save. You may select <strong>more than one category</strong>.';
    return `${blank ? renderVendorOnboardingEmptyState() : ''}
    <div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>${note}</div>
    </div>
    <div class="form-grid wf-form-grid">
      <div class="form-group"><label>${reqLabel('Company Name')}</label><input id="wf-reg-company" type="text" placeholder="Enter registered company / firm name" value="${escapeHtmlLite(values.company)}"${fieldLock}></div>
      <div class="form-group"><label>${reqLabel('Authorized Signatory')}</label><input id="wf-reg-contact" type="text" placeholder="Full name of authorized person" value="${escapeHtmlLite(values.contactName)}"${fieldLock}></div>
      ${customMultiSelectHTML('Category', 'regCategory', regCategories, selectedCategories, true, 'Select one or more categories')}
      <div class="form-group"><label>${reqLabel('GSTIN')}</label><input id="wf-reg-gstin" type="text" placeholder="e.g. 23AABCM1234A1Z5" value="${escapeHtmlLite(values.gstin)}"${fieldLock}></div>
      <div class="form-group"><label>${reqLabel('PAN')}</label><input id="wf-reg-pan" type="text" placeholder="e.g. AABCM1234A" value="${escapeHtmlLite(values.pan)}"${fieldLock}></div>
      <div class="form-group full"><label class="wf-section-label">Registered Address</label></div>
      <div class="form-group full"><label>${reqLabel('Address Line 1')}</label><input id="wf-reg-street" type="text" placeholder="Plot / building / street" value="${escapeHtmlLite(values.street)}"${fieldLock}></div>
      <div class="form-group full"><label>Address Line 2</label><input id="wf-reg-line2" type="text" placeholder="Area / landmark (optional)" value="${escapeHtmlLite(values.addressLine2)}"${fieldLock}></div>
      <div class="form-group"><label>${reqLabel('City')}</label><input id="wf-reg-city" type="text" placeholder="e.g. Bhopal" value="${escapeHtmlLite(values.city)}"${fieldLock}></div>
      ${customSelectHTML('District', 'regDistrict', districtOptions, districtSelected, true)}
      ${customSelectHTML('State', 'regState', getRegistrationStates(), values.state || 'Madhya Pradesh', true)}
      <div class="form-group"><label>${reqLabel('PIN Code')}</label><input id="wf-reg-pin" type="text" inputmode="numeric" maxlength="6" placeholder="e.g. 462001" value="${escapeHtmlLite(values.pin)}"${fieldLock}></div>
    </div>
    ${renderEmpanelmentFeeBlock(canEdit && !synced)}
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled} onclick="saveWorkflowStage(1)">${synced ? 'Confirm Registration Details' : 'Save Registration Details'}</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 2) {
    const kycDocs = vendorStageState.uploads.kyc;
    const kycDone = kycDocs.length >= 1;
    const values = getVendorKycFormValues();
    const blank = isBlankVendorOnboarding() && !kycDone;
    return `<div class="kyc-form">
      ${blank ? renderVendorOnboardingEmptyState({
        icon: 'fa-file-shield',
        title: 'KYC details are empty',
        body: 'Provide bank and license information, then upload your KYC document pack. Fields stay blank until you enter verified details.',
        steps: ['Bank account details', 'Drug / trade license', 'Upload KYC documents']
      }) : ''}
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>${reqLabel('Account Holder Name')}</label><input id="wf-kyc-holder" type="text" placeholder="As per bank records" value="${escapeHtmlLite(values.holder)}"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Bank Name')}</label><input id="wf-kyc-bank" type="text" placeholder="e.g. State Bank of India" value="${escapeHtmlLite(values.bank)}"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Account Number')}</label><input id="wf-kyc-acct" type="text" placeholder="Enter account number" value="${escapeHtmlLite(values.account)}"${readonly}></div>
        <div class="form-group"><label>${reqLabel('IFSC Code')}</label><input id="wf-kyc-ifsc" type="text" placeholder="e.g. SBIN0001234" value="${escapeHtmlLite(values.ifsc)}"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Drug / Trade License No.')}</label><input id="wf-kyc-license" type="text" placeholder="Enter license number" value="${escapeHtmlLite(values.license)}"${readonly}></div>
        ${datePickerHTML('wf-kyc-expiry', values.expiry || '', reqLabel('License Expiry'), !canEdit)}
        <div class="form-group"><label>KYC Status</label><span class="badge ${kycDone ? 'badge-success' : 'badge-warning'}">${kycDone ? 'Documents Uploaded' : 'Pending Documents'}</span></div>
        <div class="form-group"><label>Uploaded Documents</label><span class="wf-upload-count">${kycDocs.length ? kycDocs.map(d => escapeHtmlLite(d.name)).join(', ') : 'None yet'}</span></div>
      </div>
      <div class="wf-doc-hint"><i class="fa-solid fa-circle-info"></i> Upload your KYC document pack (bank proof, PAN, address / signatory ID, and license as applicable). Confirm upload to unlock the next stage.</div>
      <div class="wf-actions mt-2">
        <button class="btn btn-primary"${disabled} onclick="openKycDocumentForm()">Update KYC Document Form</button>
        <button class="btn btn-outline" onclick="openWorkflowDocument('kyc-checklist')">KYC Checklist (PDF)</button>
      </div>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 3) {
    const letter = vendorStageState.uploads.approvalLetter;
    const systemLetter = hasSystemApprovalLetter();
    const approved = !!vendorStageState.completed[3] || !!letter || systemLetter || isSeededDemoVendor();
    const vendorCode = authUser?.vendorId || '—';
    const categoryLabel = vendorStageState.registration?.category
      || formatRegCategories(vendorStageState.registration?.categories)
      || (isSeededDemoVendor() ? 'Drugs, Consumables' : '—');
    const approvedOn = systemLetter || isSeededDemoVendor()
      ? (vendorStageState.approval?.approvedOn || '28-08-2026')
      : (letter ? formatDateDMY(APP_TODAY) : '');
    const letterStatus = renderApprovalLetterFileStatus(letter, systemLetter);
    const uploadBtn = renderApprovalLetterActionButtons(canEdit, systemLetter, disabled);

    if (!approved && isBlankVendorOnboarding()) {
      return `${renderVendorOnboardingEmptyState({
        icon: 'fa-hourglass-half',
        title: 'Vendor approval pending',
        body: 'No approval record yet. After registration and KYC are submitted, the Vendor Registry reviews your file. Your vendor code activates once approved.',
        steps: ['Submit registration & KYC', 'Await Vendor Registry review', 'Upload approval letter when issued']
      })}
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>Vendor Code</label><input type="text" value="${escapeHtmlLite(vendorCode)}" readonly></div>
        <div class="form-group"><label>Approval Status</label><span class="badge badge-warning">Pending Review</span></div>
        <div class="form-group"><label>Approved On</label><input type="text" value="—" readonly></div>
        <div class="form-group"><label>Approving Authority</label><input type="text" value="—" readonly></div>
        <div class="form-group full"><label>Linked Categories</label><input type="text" value="${escapeHtmlLite(categoryLabel)}" readonly></div>
        <div class="form-group full"><label>${reqLabel('Approval Letter')}</label>
          ${letterStatus}
        </div>
      </div>
      <div class="wf-actions mt-2 approval-letter-actions">
        <button type="button" class="btn btn-outline" onclick="navigateTo('registration')">Open Full Profile</button>
        ${uploadBtn}
      </div>`;
    }
    return `<div class="form-grid wf-form-grid">
      <div class="form-group"><label>${reqLabel('Vendor Code')}</label><input type="text" value="${escapeHtmlLite(vendorCode)}" readonly></div>
      <div class="form-group"><label>Approval Status</label><span class="badge badge-success">Approved</span></div>
      ${datePickerHTML('wf-approval-on', approvedOn, reqLabel('Approved On'), true)}
      <div class="form-group"><label>${reqLabel('Approving Authority')}</label><input type="text" value="Vendor Registry, MP Health" readonly></div>
      <div class="form-group full"><label>${reqLabel('Linked Categories')}</label><input type="text" value="${escapeHtmlLite(categoryLabel)}" readonly></div>
      <div class="form-group full"><label>${reqLabel('Approval Letter')}</label>
        ${letterStatus}
      </div>
    </div>
    <div class="wf-actions mt-2 approval-letter-actions">
      <button type="button" class="btn btn-outline" onclick="navigateTo('registration')">Open Full Profile</button>
      ${uploadBtn}
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 4) {
    return renderVendorBidSubmissionStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 5) {
    return renderVendorAwardNotificationStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 6) {
    return renderVendorContractExecutionStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 7) {
    return renderVendorDeliveryStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 8) {
    return renderVendorInvoiceStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 9) {
    return renderVendorPaymentStage(canEdit);
  }

  if (currentRole === 'vendor' && step.id === 10) {
    return renderVendorRenewalStage(canEdit);
  }

  const stageActions = canEdit
    ? `<button class="btn btn-primary" onclick="saveWorkflowStage(${step.id})">Save Stage Details</button>`
    : '';
  // No Stage Guide / Audit Trail / Full Lifecycle Guide on any workflow stage
  return stageActions ? `<div class="wf-actions">${stageActions}</div>` : '';
}

function completeVendorStage(id) {
  // Completing a later stage implies earlier stages are done for progress tracking
  for (let i = 1; i < id; i++) {
    if (!vendorStageState.completed[i]) vendorStageState.completed[i] = true;
  }
  vendorStageState.completed[id] = true;
  if (id >= 3) vendorStageState.profileType = 'existing';
  syncVendorWorkflowStatuses();
  persistVendorLifecycle();
}

function validateVendorStageFields(stageId) {
  if (stageId === 1) {
    const company = document.getElementById('wf-reg-company')?.value?.trim();
    const contactName = document.getElementById('wf-reg-contact')?.value?.trim();
    const gstin = document.getElementById('wf-reg-gstin')?.value?.trim();
    const pan = document.getElementById('wf-reg-pan')?.value?.trim();
    const street = document.getElementById('wf-reg-street')?.value?.trim();
    const city = document.getElementById('wf-reg-city')?.value?.trim();
    const district = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regDistrict') : '';
    const state = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regState') : '';
    const pin = document.getElementById('wf-reg-pin')?.value?.trim();
    const categories = typeof getCustomMultiSelectValues === 'function'
      ? getCustomMultiSelectValues('regCategory')
      : normalizeRegCategories(typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regCategory') : '');
    const pinOk = /^\d{6}$/.test(pin || '');
    if (!company || !contactName || !gstin || !pan || !street || !city || !district || district === 'Select district' || !state || !pinOk || !categories.length) {
      return 'Please fill all mandatory fields marked with * (including Address Line 1, City, District, State, and a 6-digit PIN Code) before proceeding.';
    }
    if (!isVendorRegistrationSynced()) {
      ensureEmpanelmentState();
      if (!isEmpanelmentSubmitted()) {
        return 'Complete Empanelment fee payment (Online or Offline) so status is Submitted before saving registration details.';
      }
    } else if (!isEmpanelmentSubmitted()) {
      return 'Empanelment fee is still Pending in the system. Registration cannot be confirmed until the fee record is present.';
    }
  }
  if (stageId === 2) {
    if (!vendorStageState.uploads.kyc.length) {
      return 'Upload at least one KYC document via “Update KYC Document Form”, then click Confirm Upload before moving to the next stage.';
    }
  }
  if (stageId === 3) {
    if (hasSystemApprovalLetter()) return '';
    if (!vendorStageState.uploads.approvalLetter) {
      return 'Please upload the Approval Letter using “Upload Approval Letter” before moving to Bid Submitted.';
    }
  }
  if (stageId === 4) {
    if (!vendorStageState.bid.submitted && !vendorStageState.completed?.[4] && !(vendorBidDvdmsState.rows || []).length) {
      return 'Refresh bid details so synced bid records appear before moving to Award Notification.';
    }
  }
  if (stageId === 5) {
    if (!vendorStageState.completed?.[5]) {
      const hasRowAck = (vendorAwardSyncState.rows || []).some(r => /acknowledged/i.test(r.acknowledgement));
      if (!vendorStageState.award.acknowledged && !hasRowAck) {
        return 'Open an award row and acknowledge the LOA before moving to Contract Execution.';
      }
    }
  }
  if (stageId === 6) {
    if (!vendorStageState.completed?.[6]) {
      if (!vendorStageState.contract.tenderId) {
        return 'Select a tender from the dropdown so documents are uploaded against the correct tender.';
      }
      if (!vendorStageState.contract.loiAccepted && !ensureVendorContractPack(vendorStageState.contract.tenderId).loiAccepted) {
        return 'Accept LOI for the selected tender before submitting PBG and contract documents.';
      }
      if (!vendorStageState.contract.pbgSubmitted) {
        return 'Upload the PBG document for the selected tender, then click Submit contract pack.';
      }
      if (!vendorStageState.contract.signed) {
        return 'Upload the signed contract for the selected tender, then click Submit contract pack.';
      }
      return 'Click “Submit contract pack” below the uploads to finish Contract Execution.';
    }
  }
  if (stageId === 7) {
    if (vendorStageState.delivery.updated || vendorStageState.completed?.[7]) return null;
    if (shouldShowManualDeliveryUpload() || isManualVendorWithoutDeliveryHistory()) {
      return 'Upload the Delivery Status document, review the details, set Cold Chain Required, then click Save Delivery Details to unlock the next stage.';
    }
    if (!(vendorDeliverySyncState.rows || []).length) {
      return 'Refresh delivery records so synced consignments appear before moving to Invoice Submission.';
    }
  }
  if (stageId === 8) {
    if (vendorStageState.invoice.submitted || vendorStageState.completed?.[8]) return null;
    if (shouldShowManualInvoiceUpload() || isManualVendorWithoutDeliveryHistory()) {
      return 'Attach Delivery Proof, review invoice details, then click Save Invoice Details to open Payment Tracking.';
    }
    if (!getVendorInvoiceBaseRows().length) {
      return 'Invoice records will appear here once available. Use Add / Update invoice after the first synced invoice is listed.';
    }
  }
  if (stageId === 10) {
    if (!isVendorStageActionComplete(10)) {
      return 'Submit at least one renewal request before completing this stage.';
    }
  }
  return null;
}

function saveWorkflowStage(id) {
  if (currentRole === 'vendor') {
    if (id === 1) {
      const msg = validateVendorStageFields(1);
      if (msg) { showWfAlert(msg); return; }
      const categories = typeof getCustomMultiSelectValues === 'function'
        ? getCustomMultiSelectValues('regCategory')
        : normalizeRegCategories(typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regCategory') : '');
      const registration = {
        company: document.getElementById('wf-reg-company')?.value?.trim() || '',
        contactName: document.getElementById('wf-reg-contact')?.value?.trim() || '',
        categories,
        category: formatRegCategories(categories),
        gstin: document.getElementById('wf-reg-gstin')?.value?.trim() || '',
        pan: document.getElementById('wf-reg-pan')?.value?.trim() || '',
        street: document.getElementById('wf-reg-street')?.value?.trim() || '',
        addressLine2: document.getElementById('wf-reg-line2')?.value?.trim() || '',
        city: document.getElementById('wf-reg-city')?.value?.trim() || '',
        district: (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regDistrict') : '') || '',
        state: (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regState') : '') || 'Madhya Pradesh',
        pin: document.getElementById('wf-reg-pin')?.value?.trim() || '',
        address: ''
      };
      registration.address = formatRegAddress(registration);
      vendorStageState.registration = registration;
      syncVendorProfileFromAuth();
      completeVendorStage(1);
    }
    if (id === 2) {
      vendorStageState.kyc = {
        holder: document.getElementById('wf-kyc-holder')?.value?.trim() || '',
        bank: document.getElementById('wf-kyc-bank')?.value?.trim() || '',
        account: document.getElementById('wf-kyc-acct')?.value?.trim() || '',
        ifsc: document.getElementById('wf-kyc-ifsc')?.value?.trim() || '',
        license: document.getElementById('wf-kyc-license')?.value?.trim() || '',
        expiry: document.getElementById('wf-kyc-expiry')?.value?.trim() || ''
      };
      syncVendorProfileFromAuth();
      if (vendorStageState.uploads.kyc.length >= 1) completeVendorStage(2);
    }
    persistVendorLifecycle();
    openDrillDown('workflow', `Stage ${id} Saved`, `Your changes for Stage ${id}: ${getWorkflowSteps().find(s => s.id === id)?.name || ''} have been saved.`);
    refreshWorkflowUI();
    return;
  }
  openDrillDown('workflow', `Stage ${id} Saved`, `Your changes for Stage ${id}: ${getWorkflowSteps().find(s => s.id === id)?.name || ''} have been saved. You can return to any previous stage at any time to update details before final submission.`);
}

function renderUploadModalBody({ lead, acceptNote, inputId, requiredDocs }) {
  const docs = requiredDocs?.length
    ? `<ul class="upload-req-list">${requiredDocs.map(d => `<li><i class="fa-solid fa-file-circle-check"></i> ${d}</li>`).join('')}</ul>`
    : '';
  return `<div class="upload-modal">
    <p class="upload-modal-lead">${lead}</p>
    ${docs}
    <div class="upload-dropzone" onclick="document.getElementById('${inputId}').click()">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <strong>Click to select file(s)</strong>
      <span>${acceptNote || 'PDF, JPG, PNG · Max 10 MB each'}</span>
      <input type="file" id="${inputId}" class="upload-file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
    </div>
    <div id="${inputId}-list" class="upload-file-list"></div>
    <div class="upload-modal-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary" id="${inputId}-confirm">Confirm Upload</button>
    </div>
  </div>`;
}

function renderInlineUpload({ id, title, hint, disabled, fileName, onChange }) {
  return `<div class="inline-upload${disabled ? ' is-disabled' : ''}">
    <div class="inline-upload-head">
      <strong>${title}</strong>
      ${fileName ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> ${fileName}</span>` : '<span class="badge badge-muted">No file</span>'}
    </div>
    <label class="inline-upload-zone" for="${id}">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <span class="inline-upload-title">${fileName ? 'Replace file' : 'Click to upload'}</span>
      <span class="inline-upload-hint">${hint}</span>
      <input type="file" id="${id}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ${disabled ? 'disabled' : ''} onchange="${onChange}(this)" />
    </label>
  </div>`;
}

/** Always-visible field label (empty until document upload fills value) */
function ocrLabel(label, value, opts = {}) {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
  const display = hasValue
    ? (opts.html ? value : value)
    : '<span class="ocr-pending">Awaiting document</span>';
  return `<div class="label-item${hasValue ? ' is-filled' : ' is-pending'}">
    <span class="label-key">${label}</span>
    <span class="label-val">${display}</span>
  </div>`;
}

function simulateOcrDelay(cb) {
  setTimeout(() => {
    cb();
    refreshWorkflowUI();
  }, 350);
}

function bindUploadModal(inputId, onConfirm) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(`${inputId}-list`);
  const confirmBtn = document.getElementById(`${inputId}-confirm`);
  if (!input || !confirmBtn) return;

  const refreshList = () => {
    const files = Array.from(input.files || []);
    list.innerHTML = files.length
      ? files.map(f => `<div class="upload-file-item"><i class="fa-solid fa-file"></i> ${f.name} <span>(${Math.max(1, Math.round(f.size / 1024))} KB)</span></div>`).join('')
      : '<p class="text-muted">No files selected yet.</p>';
  };

  input.addEventListener('change', refreshList);
  refreshList();

  confirmBtn.onclick = () => {
    const files = Array.from(input.files || []);
    if (!files.length) {
      showWfAlert('Please select at least one file to upload.');
      return;
    }
    const mapped = files.map(f => ({ name: f.name, size: f.size }));
    closeModal();
    onConfirm(mapped);
    refreshWorkflowUI();
  };
}

function openKycDocumentForm() {
  openModal('KYC Document Form', renderUploadModalBody({
    lead: 'Upload your KYC document pack. Recommended documents are listed below — confirm upload to proceed.',
    acceptNote: 'PDF preferred · Max 10 MB per file · You may select one or more files',
    inputId: 'wfUploadKyc',
    requiredDocs: [
      'Cancelled cheque / bank account proof',
      'PAN card of entity / authorized signatory',
      'Address proof & authorized signatory photo ID',
      'Drug / trade license (category-specific)'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadKyc', (files) => {
    const existing = Array.isArray(vendorStageState.uploads.kyc) ? [...vendorStageState.uploads.kyc] : [];
    const names = new Set(existing.map(f => f.name));
    files.forEach(f => {
      if (!names.has(f.name)) {
        existing.push(f);
        names.add(f.name);
      }
    });
    vendorStageState.uploads.kyc = existing;
    vendorStageState.kyc = {
      holder: document.getElementById('wf-kyc-holder')?.value?.trim() || vendorStageState.kyc?.holder || '',
      bank: document.getElementById('wf-kyc-bank')?.value?.trim() || vendorStageState.kyc?.bank || '',
      account: document.getElementById('wf-kyc-acct')?.value?.trim() || vendorStageState.kyc?.account || '',
      ifsc: document.getElementById('wf-kyc-ifsc')?.value?.trim() || vendorStageState.kyc?.ifsc || '',
      license: document.getElementById('wf-kyc-license')?.value?.trim() || vendorStageState.kyc?.license || '',
      expiry: document.getElementById('wf-kyc-expiry')?.value?.trim() || vendorStageState.kyc?.expiry || ''
    };
    syncVendorProfileFromAuth();
    completeVendorStage(2);
    persistVendorLifecycle();
    showWfAlert(`${files.length} KYC document(s) uploaded. Stage 2 is complete — you can move to the next stage.`, 'success');
  });
}

function openApprovalLetterUpload() {
  if (hasSystemApprovalLetter()) {
    showWfAlert('Approval letter is already available from the system. Use “Show uploaded Approval Letter” to view it.');
    return;
  }
  openModal('Upload Approval Letter', renderUploadModalBody({
    lead: 'Upload the vendor approval / code assignment letter issued by the department.',
    acceptNote: 'PDF only preferred · Max 10 MB',
    inputId: 'wfUploadApproval',
    requiredDocs: ['Signed Vendor Approval / Code Assignment Letter']
  }), { wide: true });
  const input = document.getElementById('wfUploadApproval');
  if (input) input.removeAttribute('multiple');
  bindUploadModal('wfUploadApproval', (files) => {
    vendorStageState.uploads.approvalLetter = files[0];
    completeVendorStage(3);
    persistVendorLifecycle();
    showWfAlert('Approval letter uploaded successfully. You can move to the next stage.', 'success');
  });
}

function hasSystemApprovalLetter() {
  return isVendorRegistrationSynced() || !!vendorStageState.approval?.systemLetter;
}

function renderApprovalLetterFileStatus(letter, systemLetter = hasSystemApprovalLetter()) {
  if (systemLetter) {
    return `<div class="wf-file-status approval-letter-file">
      <span class="approval-letter-file-meta"><i class="fa-solid fa-file-pdf"></i> Vendor Approval Letter</span>
      <span class="badge badge-success">On file</span>
    </div>`;
  }
  if (letter) {
    return `<div class="wf-file-status approval-letter-file">
      <span class="approval-letter-file-meta"><i class="fa-solid fa-file-pdf"></i> ${escapeHtmlLite(letter.name)}</span>
      <span class="badge badge-success">Uploaded</span>
    </div>`;
  }
  return `<div class="wf-file-status"><span class="text-muted">No approval letter uploaded yet</span></div>`;
}

function renderApprovalLetterActionButtons(canEdit, systemLetter = hasSystemApprovalLetter(), disabledAttr = '') {
  if (systemLetter) {
    return `<button type="button" class="btn btn-primary" disabled title="Approval letter is already available from the system">Upload Approval Letter</button>
      <button type="button" class="btn-link approval-letter-show-link" onclick="openSystemApprovalLetterModal()">
        <i class="fa-solid fa-eye"></i> Show uploaded Approval Letter
      </button>`;
  }
  return `<button type="button" class="btn btn-primary"${canEdit ? disabledAttr : ' disabled'} onclick="openApprovalLetterUpload()">Upload Approval Letter</button>`;
}

function getVendorApprovalLetterContext() {
  const r = vendorStageState.registration || {};
  const categories = formatRegCategories(r.categories?.length ? r.categories : r.category)
    || (isSeededDemoVendor() ? 'Drugs, Consumables' : '—');
  return {
    vendorCode: authUser?.vendorId || 'VND-MP-PENDING',
    company: r.company || authUser?.organization || '—',
    contactName: r.contactName || authUser?.name || '—',
    gstin: r.gstin || '—',
    pan: r.pan || '—',
    categories,
    address: formatRegAddress(r) || '—',
    approvedOn: vendorStageState.approval?.approvedOn || '28-08-2026',
    authority: 'Vendor Registry, Department of Public Health & Family Welfare / MPPHSCL',
    letterNo: vendorStageState.approval?.letterNo || `VAL/${new Date().getFullYear()}/${String(authUser?.vendorId || '000').slice(-4) || '0142'}`
  };
}

function renderSystemApprovalLetterDocument() {
  const ctx = getVendorApprovalLetterContext();
  return `<div class="approval-letter-modal">
    <div class="approval-letter-toolbar">
      <div>
        <strong>Official approval letter</strong>
        <span>Generated from the system vendor-approval template</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
    <div class="approval-letter-sheet" id="vendorApprovalLetterSheet">
      <header class="approval-letter-head">
        <div>
          <p class="approval-letter-brand">MPPHSCL</p>
          <p class="approval-letter-brand-sub">Madhya Pradesh Public Health Services Corporation Limited</p>
          <p class="approval-letter-office">First Floor, MP Oil Fed Premises, 01 Arera Hills, Bhopal 462011 (M.P.)</p>
        </div>
        <div class="approval-letter-docmeta">
          <span class="badge badge-info">System template</span>
          <p>Letter No. <strong>${escapeHtmlLite(ctx.letterNo)}</strong></p>
          <p>Date <strong>${escapeHtmlLite(ctx.approvedOn)}</strong></p>
        </div>
      </header>
      <h2 class="approval-letter-title">Vendor Empanelment / Code Assignment — Approval Letter</h2>
      <p class="approval-letter-to">To,<br><strong>${escapeHtmlLite(ctx.company)}</strong><br>${escapeHtmlLite(ctx.address)}</p>
      <p class="approval-letter-subject"><strong>Subject:</strong> Approval of vendor registration and assignment of Vendor Code <strong>${escapeHtmlLite(ctx.vendorCode)}</strong></p>
      <p>Madam / Sir,</p>
      <p>With reference to your online registration and KYC submission, the Vendor Registry has examined the particulars furnished by your organisation. After due verification, your firm is hereby <strong>approved</strong> for participation in procurement processes under MPPHSCL for the linked categories stated below.</p>
      <div class="approval-letter-facts">
        <div><span>Vendor Code</span><strong>${escapeHtmlLite(ctx.vendorCode)}</strong></div>
        <div><span>Authorised Signatory</span><strong>${escapeHtmlLite(ctx.contactName)}</strong></div>
        <div><span>GSTIN</span><strong>${escapeHtmlLite(ctx.gstin)}</strong></div>
        <div><span>PAN</span><strong>${escapeHtmlLite(ctx.pan)}</strong></div>
        <div class="is-wide"><span>Approved Categories</span><strong>${escapeHtmlLite(ctx.categories)}</strong></div>
        <div class="is-wide"><span>Approving Authority</span><strong>${escapeHtmlLite(ctx.authority)}</strong></div>
      </div>
      <p>This approval letter is system-generated from the official vendor approval template and may be produced as documentary evidence for Bid-to-Pay lifecycle stages. The vendor shall continue to comply with empanelment conditions, licence validity, and contractual obligations as applicable.</p>
      <p>Yours faithfully,</p>
      <div class="approval-letter-sign">
        <strong>Vendor Registry</strong>
        <span>MPPHSCL / DoPHFW</span>
        <span>Digitally issued · ${escapeHtmlLite(ctx.approvedOn)}</span>
      </div>
      <footer class="approval-letter-foot">
        This is a computer-generated approval letter from the procurement system template. Verify vendor code against the live register before award / contract execution.
      </footer>
    </div>
  </div>`;
}

function openSystemApprovalLetterModal() {
  if (!hasSystemApprovalLetter()) {
    showWfAlert('No system approval letter is on file. Please upload the approval letter issued by the department.');
    return;
  }
  if (!vendorStageState.completed?.[3]) {
    completeVendorStage(3);
    persistVendorLifecycle();
  }
  openModal('Approval Letter', renderSystemApprovalLetterDocument(), { wide: true, large: true });
}

function openTechDocUpload() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked. Technical documents cannot be changed.');
    return;
  }
  if (!vendorStageState.bid.tenderId) {
    showWfAlert('Select the tender first (combobox at the top), then upload technical documents.');
    return;
  }
  openModal('Upload Technical Documents', renderUploadModalBody({
    lead: `Upload technical bid documents for <strong>${escapeHtmlLite(vendorStageState.bid.tenderId)}</strong> — ${escapeHtmlLite(vendorStageState.bid.tenderTitle || 'selected tender')} as mandated in the RFP.`,
    inputId: 'wfUploadTech',
    requiredDocs: [
      'Technical compliance sheet / bid form',
      'Product specifications & catalogues',
      'Quality certifications (ISO / CDSCO / BIS as applicable)',
      'Past performance / experience certificates'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadTech', (files) => {
    vendorStageState.uploads.technicalDocs = files;
    persistVendorLifecycle();
    showWfAlert('Technical documents uploaded for the selected tender.', 'success');
  });
}

function openFinDocUpload() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked. Financial documents cannot be changed.');
    return;
  }
  if (!vendorStageState.bid.tenderId) {
    showWfAlert('Select the tender first (combobox at the top), then upload financial documents.');
    return;
  }
  openModal('Upload Financial Documents', renderUploadModalBody({
    lead: `Upload financial / commercial bid documents for <strong>${escapeHtmlLite(vendorStageState.bid.tenderId)}</strong>. EMD for this tender: <strong>${escapeHtmlLite(vendorStageState.bid.emdStatus || 'as per NIT')}</strong>.`,
    inputId: 'wfUploadFin',
    requiredDocs: [
      'Price bid / BoQ (as per RFP format)',
      'EMD / Bid security instrument proof',
      'Turnover / audited financial statements (if required)',
      'GST / tax declarations'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadFin', (files) => {
    vendorStageState.uploads.financialDocs = files;
    persistVendorLifecycle();
    showWfAlert('Financial documents uploaded for the selected tender.', 'success');
  });
}

const BID_TENDER_PLACEHOLDER = 'Select open tender for this bid…';

function estimateBidEmdAmount(category) {
  if (category === 'Drugs') return '₹3,20,000';
  if (category === 'Equipment') return '₹2,50,000';
  if (category === 'Consumables') return '₹1,50,000';
  return '₹1,00,000';
}

function getVendorBidTenderSelectOptions() {
  const list = (typeof TENDERS !== 'undefined' ? TENDERS : [])
    .filter(t => t.status === 'Open' || t.status === 'Evaluation');
  const labels = list.map(t => `${t.id} — ${t.title}`);
  const currentId = vendorStageState.bid?.tenderId;
  if (currentId && !labels.some(l => l.startsWith(currentId + ' —'))) {
    const t = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(x => x.id === currentId);
    labels.unshift(t ? `${t.id} — ${t.title}` : `${currentId} — ${vendorStageState.bid.tenderTitle || currentId}`);
  }
  return labels;
}

function resolveBidTenderFromSelect() {
  const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('bidTenderRef') : '';
  if (!label || label === BID_TENDER_PLACEHOLDER) return null;
  const id = (label.split(' — ')[0] || '').trim();
  return (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === id) || null;
}

function applyVendorBidTenderSelection(tenderId) {
  const t = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(x => x.id === tenderId);
  if (!t) return false;
  const bidRow = typeof getBidForTender === 'function' ? getBidForTender(t.id) : null;
  const emdAmt = estimateBidEmdAmount(t.category);
  const emdPaid = bidRow?.emd === 'Paid';
  vendorStageState.bid.tenderId = t.id;
  vendorStageState.bid.tenderTitle = t.title;
  vendorStageState.bid.category = t.category;
  vendorStageState.bid.emdStatus = emdPaid ? `Paid — ${emdAmt}` : `Pending — ${emdAmt}`;
  vendorStageState.bid.deadline = `${formatDateDMY(t.deadline)} 17:00 IST`;
  vendorStageState.bid.ocrReady = true;
  return true;
}

function onBidTenderSelectChange() {
  if (vendorStageState.bid.submitted) return;
  const t = resolveBidTenderFromSelect();
  if (!t) {
    vendorStageState.bid.tenderId = '';
    vendorStageState.bid.tenderTitle = '';
    vendorStageState.bid.category = '';
    vendorStageState.bid.emdStatus = '';
    vendorStageState.bid.deadline = '';
    vendorStageState.bid.ocrReady = false;
  } else {
    applyVendorBidTenderSelection(t.id);
  }
  persistVendorLifecycle();
  refreshWorkflowUI();
}

function bindBidTenderSelectListener() {
  const wrap = document.querySelector('.custom-select[data-select-id="bidTenderRef"]');
  if (!wrap || wrap.dataset.bidBound) return;
  wrap.dataset.bidBound = '1';
  wrap.addEventListener('change', onBidTenderSelectChange);
}

function openBidSubmissionGuide() {
  const emdLine = vendorStageState.bid.emdStatus
    ? `EMD / bid security (${escapeHtmlLite(vendorStageState.bid.emdStatus)})`
    : 'EMD / bid security (amount as per selected tender NIT)';
  const tenderLine = vendorStageState.bid.tenderId
    ? `Selected tender: <strong>${escapeHtmlLite(vendorStageState.bid.tenderId)}</strong> — ${escapeHtmlLite(vendorStageState.bid.tenderTitle || '')}`
    : 'Select a tender from the combobox on Bid Submission before uploading documents.';
  openModal('Bid Submission Guide — RFP Mandatory Documents', `
    <div class="doc-modal">
      <p class="doc-modal-lead">${tenderLine}</p>
      <h4 class="upload-section-title">Technical Bid (mandatory)</h4>
      <ul class="doc-checklist">
        <li><i class="fa-solid fa-check"></i> Signed technical bid form &amp; compliance matrix</li>
        <li><i class="fa-solid fa-check"></i> Product specifications matching tender schedule</li>
        <li><i class="fa-solid fa-check"></i> Valid manufacturing / import / drug license</li>
        <li><i class="fa-solid fa-check"></i> Quality certificates &amp; test reports (as listed in RFP)</li>
        <li><i class="fa-solid fa-check"></i> Experience / past supply certificates</li>
      </ul>
      <h4 class="upload-section-title">Financial Bid (mandatory)</h4>
      <ul class="doc-checklist">
        <li><i class="fa-solid fa-check"></i> Price schedule / BoQ in prescribed format</li>
        <li><i class="fa-solid fa-check"></i> ${emdLine}</li>
        <li><i class="fa-solid fa-check"></i> Commercial terms acceptance letter</li>
        <li><i class="fa-solid fa-check"></i> GSTIN &amp; PAN declarations</li>
      </ul>
      <div class="resource-note mt-2"><i class="fa-solid fa-triangle-exclamation"></i> Incomplete technical or financial packs may lead to bid rejection. Select the tender, upload both packs, then submit before the deadline.</div>
    </div>
  `, { wide: true });
}

function submitVendorBid() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked.');
    return;
  }
  if (!vendorStageState.bid.tenderId) {
    showWfAlert('Select which tender this bid belongs to before submitting.');
    return;
  }
  if (!vendorStageState.uploads.technicalDocs.length) {
    showWfAlert('Upload Technical Documents before submitting the bid. See Bid Submission Guide for the RFP checklist.');
    return;
  }
  if (!vendorStageState.uploads.financialDocs.length) {
    showWfAlert('Upload Financial Documents before submitting the bid. See Bid Submission Guide for the RFP checklist.');
    return;
  }
  vendorStageState.bid.submitted = true;
  vendorStageState.locked[4] = true;
  applyVendorBidTenderSelection(vendorStageState.bid.tenderId);
  completeVendorStage(4);
  showWfAlert(`Bid submitted successfully for <strong>${escapeHtmlLite(vendorStageState.bid.tenderId)}</strong>. Details are now locked.`, 'success');
  refreshWorkflowUI();
}

function acknowledgeLoa() {
  const pending = (vendorAwardSyncState.rows || []).find(r => !/acknowledged/i.test(r.acknowledgement));
  if (pending) {
    acknowledgeVendorAward(pending.awardId);
    return;
  }
  const already = (vendorAwardSyncState.rows || []).find(r => /acknowledged/i.test(r.acknowledgement));
  if (already) {
    vendorStageState.award.acknowledged = true;
    if (!vendorStageState.completed?.[5]) completeVendorStage(5);
    persistVendorLifecycle();
    showWfAlert('LOA already acknowledged. You can proceed to Contract Execution.', 'success');
    refreshWorkflowUI();
    return;
  }
  vendorStageState.award.acknowledged = true;
  vendorStageState.contract.pbgStatus = '';
  vendorStageState.contract.contractStatus = '';
  if (!vendorStageState.completed?.[5]) completeVendorStage(5);
  persistVendorLifecycle();
  showWfAlert('LOA acknowledged. You can proceed to Contract Execution.', 'success');
  refreshWorkflowUI();
}

const CONTRACT_TENDER_PLACEHOLDER = 'Select tender for this contract pack…';

function emptyVendorContractTenderPack() {
  return {
    loiIssued: false,
    loiAccepted: false,
    pbgSubmitted: false,
    draftReady: false,
    signed: false,
    id: '',
    pbgStatus: '',
    pbgAmount: '',
    bank: '',
    bgRef: '',
    validUntil: '',
    contractStatus: '',
    pbgOcr: null,
    contractOcr: null,
    uploads: {
      loiAccept: null,
      pbg: null,
      signedContract: null,
      sbg: null,
      sow: null,
      deliverables: null,
      draftReview: null
    }
  };
}

function ensureVendorContractPack(tenderId) {
  if (!tenderId) return emptyVendorContractTenderPack();
  if (!vendorStageState.contract.tenderPacks) vendorStageState.contract.tenderPacks = {};
  if (!vendorStageState.contract.tenderPacks[tenderId]) {
    vendorStageState.contract.tenderPacks[tenderId] = emptyVendorContractTenderPack();
  }
  const pack = vendorStageState.contract.tenderPacks[tenderId];
  if (!pack.uploads) pack.uploads = emptyVendorContractTenderPack().uploads;
  return pack;
}

function getVendorContractTenderChoices() {
  const map = new Map();
  const push = (tenderId, title, category) => {
    if (!tenderId || map.has(tenderId)) return;
    map.set(tenderId, { tenderId, title: title || tenderId, category: category || '—' });
  };

  (vendorAwardSyncState.rows || []).forEach(r => push(r.tenderId, r.title, r.category));
  if (typeof VENDOR_AWARD_SYNC_API !== 'undefined') {
    (VENDOR_AWARD_SYNC_API.rows || []).forEach(r => push(r.tenderId, r.title, r.category));
  }
  if (vendorStageState.award?.tenderId) {
    push(vendorStageState.award.tenderId, vendorStageState.award.title, '');
  }
  (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).forEach(c => {
    if (isSeededDemoVendor()) {
      if (/medisupply/i.test(c.vendor || '')) push(c.tenderId, c.title, c.category);
      return;
    }
    const org = String(authUser?.organization || authUser?.name || '').toLowerCase();
    if (org && String(c.vendor || '').toLowerCase().includes(org.split(/\s+/)[0] || org)) {
      push(c.tenderId, c.title, c.category);
    }
  });

  return Array.from(map.values());
}

function getVendorContractTenderSelectOptions() {
  const labels = getVendorContractTenderChoices().map(t => `${t.tenderId} — ${t.title}`);
  const currentId = vendorStageState.contract?.tenderId;
  if (currentId && !labels.some(l => l.startsWith(currentId + ' —'))) {
    const t = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(x => x.id === currentId);
    const c = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(x => x.tenderId === currentId);
    labels.unshift(t ? `${t.id} — ${t.title}` : (c ? `${c.tenderId} — ${c.title}` : `${currentId} — Selected tender`));
  }
  return [CONTRACT_TENDER_PLACEHOLDER, ...labels];
}

function resolveContractTenderFromSelect() {
  const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('contractTenderRef') : '';
  if (!label || label === CONTRACT_TENDER_PLACEHOLDER) return null;
  const id = (label.split(' — ')[0] || '').trim();
  return id || null;
}

function getContractRecordForTender(tenderId) {
  if (!tenderId) return null;
  return (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(c => c.tenderId === tenderId) || null;
}

function getAwardRecordForTender(tenderId) {
  if (!tenderId) return null;
  const live = (vendorAwardSyncState.rows || []).find(r => r.tenderId === tenderId);
  if (live) return live;
  if (typeof VENDOR_AWARD_SYNC_API !== 'undefined') {
    return (VENDOR_AWARD_SYNC_API.rows || []).find(r => r.tenderId === tenderId) || null;
  }
  return null;
}

function calcRfpPenaltyLine(contract, tender) {
  const value = contract?.value || '';
  const cat = contract?.category || tender?.category || '';
  const weekly = cat === 'Drugs' ? '0.5%' : cat === 'Equipment' ? '0.75%' : '0.5%';
  const cap = cat === 'Equipment' ? '10%' : '5%';
  return `${weekly} of contract value per week of delay · capped at ${cap}${value ? ` of ${value}` : ''} (auto-calculated from RFP / NIT)`;
}

function getVendorContractSyncedPack(tenderId) {
  const contract = getContractRecordForTender(tenderId);
  const award = getAwardRecordForTender(tenderId);
  const tender = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === tenderId) || null;
  const enriched = contract && typeof enrichContractForMgmt === 'function' ? enrichContractForMgmt(contract) : null;
  const terms = enriched?.terms || {
    sla: 'On-time delivery ≥ 95% · response ≤ 48h',
    deliverySchedule: contract?.delivery || tender?.deliveryPeriod || 'As per NIT schedule',
    tenure: contract ? `${contract.startDate || '—'} → ${contract.endDate || '—'}` : 'As per LOA / rate contract',
    validity: contract?.endDate || 'As per LOA',
    paymentTerms: 'Net 30–45 days from GRN acceptance',
    pbg: contract?.pbgAmount || award?.value ? '5% of award value via SFMS / e-BG' : '5–10% of contract value',
    penalties: calcRfpPenaltyLine(contract, tender),
    kpis: 'Quality pass rate · On-time delivery · Cold-chain compliance · Query response time',
    sbg: 'Security Bank Guarantee as per tender (if applicable)',
    sow: tender?.scope || contract?.title || 'Scope of work as per tender documents',
    deliverables: tender?.boqLines ? `${tender.boqLines} BOQ lines · as per delivery schedule` : (contract?.delivery || 'As per SOW / PO schedule')
  };
  terms.penalties = calcRfpPenaltyLine(contract, tender);

  const pack = ensureVendorContractPack(tenderId);
  const loiIssued = !!(award || enriched?.loiNo && enriched.loiNo !== '—' || vendorStageState.award?.acknowledged);
  const loiAccepted = !!(pack.loiAccepted || /acknowledged/i.test(award?.acknowledgement || '') || vendorStageState.award?.acknowledged && vendorStageState.award?.tenderId === tenderId || enriched?.loiAck === 'Acknowledged');
  const draftTemplate = `Standard ${contract?.category || tender?.category || 'Supply'} RC / agreement template · synced with ${tenderId} tender documents (NIT, BOQ, T&C)`;

  return {
    tenderId,
    tender,
    contract,
    award,
    enriched,
    terms,
    loiNo: enriched?.loiNo || (award ? `LOA/${tenderId}` : '—'),
    loiDate: enriched?.loiDate || award?.loaDate || vendorStageState.award?.loaDate || '—',
    loiIssued,
    loiAccepted,
    draftTemplate,
    draftReady: !!(pack.draftReady || pack.uploads?.draftReview || loiAccepted),
    pack,
    value: contract?.value || award?.value || vendorStageState.award?.value || '—',
    pbgDue: award?.pbgDue || vendorStageState.award?.pbgDue || '—'
  };
}

function syncVendorContractStateFromPack(tenderId) {
  const pack = ensureVendorContractPack(tenderId);
  const c = vendorStageState.contract;
  c.tenderId = tenderId;
  c.id = pack.id || c.id;
  c.pbgSubmitted = !!pack.pbgSubmitted;
  c.signed = !!pack.signed;
  c.loiAccepted = !!pack.loiAccepted;
  c.draftReady = !!pack.draftReady;
  c.pbgStatus = pack.pbgStatus || '';
  c.pbgAmount = pack.pbgAmount || '';
  c.bank = pack.bank || '';
  c.bgRef = pack.bgRef || '';
  c.validUntil = pack.validUntil || '';
  c.contractStatus = pack.contractStatus || '';
  c.pbgOcr = pack.pbgOcr || null;
  c.contractOcr = pack.contractOcr || null;
  vendorStageState.uploads.pbg = pack.uploads?.pbg || null;
}

function onContractTenderSelectChange() {
  if (vendorStageState.completed?.[6] && vendorStageState.contract.signed) {
    /* allow switching to review other tender packs */
  }
  const tenderId = resolveContractTenderFromSelect();
  if (!tenderId) {
    vendorStageState.contract.tenderId = '';
    persistVendorLifecycle();
    refreshWorkflowUI();
    return;
  }
  ensureVendorContractPack(tenderId);
  const synced = getVendorContractSyncedPack(tenderId);
  const pack = synced.pack;
  if (synced.loiIssued) pack.loiIssued = true;
  if (synced.loiAccepted) pack.loiAccepted = true;
  if (!pack.id && synced.contract?.id) pack.id = synced.contract.id;
  if (!pack.pbgAmount && synced.contract?.pbgAmount) pack.pbgAmount = synced.contract.pbgAmount;
  syncVendorContractStateFromPack(tenderId);
  persistVendorLifecycle();
  refreshWorkflowUI();
}

function bindContractTenderSelectListener() {
  const wrap = document.querySelector('.custom-select[data-select-id="contractTenderRef"]');
  if (!wrap || wrap.dataset.contractBound) return;
  wrap.dataset.contractBound = '1';
  wrap.addEventListener('change', onContractTenderSelectChange);
}

function renderVendorContractLifecycleStrip(synced) {
  const pack = synced.pack;
  const steps = [
    { key: 'loi', label: 'LOI issue', done: !!synced.loiIssued || !!pack.loiIssued },
    { key: 'ack', label: 'LOI accept', done: !!synced.loiAccepted || !!pack.loiAccepted },
    { key: 'pbg', label: 'PBG submission', done: !!pack.pbgSubmitted },
    { key: 'draft', label: 'Draft (template)', done: !!pack.draftReady || !!pack.uploads?.draftReview || !!synced.draftReady },
    { key: 'sign', label: 'Signed', done: !!pack.signed }
  ];
  const doneCount = steps.filter(s => s.done).length;
  return `<div class="vendor-cm-progress">
    <div class="vendor-cm-progress-meta">
      <span>Lifecycle progress</span>
      <strong>${doneCount} / ${steps.length}</strong>
    </div>
    <div class="cm-timeline vendor-cm-timeline">
      ${steps.map((s, i) => `
        <div class="cm-timeline-step ${s.done ? 'is-done' : ''}">
          <span class="cm-timeline-dot">${s.done ? '<i class="fa-solid fa-check"></i>' : (i + 1)}</span>
          <span class="cm-timeline-label">${s.label}</span>
        </div>`).join('<span class="cm-timeline-rail"></span>')}
    </div>
  </div>`;
}

function renderVendorContractExecutionStage(canEdit = true) {
  const options = getVendorContractTenderSelectOptions();
  const selectedId = vendorStageState.contract.tenderId || '';
  const selectedLabel = selectedId
    ? (options.find(o => o.startsWith(selectedId + ' —')) || `${selectedId} — Selected tender`)
    : CONTRACT_TENDER_PLACEHOLDER;
  const hasTender = !!selectedId;
  const synced = hasTender ? getVendorContractSyncedPack(selectedId) : null;
  const pack = synced?.pack || emptyVendorContractTenderPack();
  const uploadDis = !canEdit || !hasTender;
  const pbgReady = !!pack.pbgSubmitted;
  const signedReady = !!pack.signed;
  const loiOk = !!(synced?.loiAccepted || pack.loiAccepted);
  const t = synced?.terms;
  const stageSubmitted = !!vendorStageState.completed?.[6];
  const canSubmitPack = canEdit && hasTender && loiOk && pbgReady && signedReady && !stageSubmitted;
  const statusLabel = stageSubmitted ? 'Submitted' : signedReady ? 'Ready to submit' : pbgReady ? 'PBG submitted' : loiOk ? 'LOI accepted' : (hasTender ? 'In progress' : 'Select tender');
  const statusBadge = stageSubmitted ? 'badge-success' : signedReady ? 'badge-info' : pbgReady ? 'badge-info' : loiOk ? 'badge-warning' : (hasTender ? 'badge-info' : 'badge-muted');
  const titleLine = hasTender
    ? (synced?.contract?.title || synced?.award?.title || selectedLabel.split(' — ').slice(1).join(' — ') || selectedId)
    : 'Choose a tender to begin contract execution';

  const workPanels = hasTender ? `
  <div class="vendor-cm-work">
    <div class="ocr-panel vendor-cm-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-envelope-open-text"></i> 1. LOI · PBG · Contract draft</h4>
        <span class="badge ${statusBadge}">${statusLabel}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Tender ID', selectedId)}
        ${ocrLabel('Contract ID', pack.id || synced.contract?.id || '')}
        ${ocrLabel('LOI / LOA No.', synced.loiNo !== '—' ? synced.loiNo : '')}
        ${ocrLabel('LOI Date', synced.loiDate !== '—' ? synced.loiDate : '')}
        ${ocrLabel('LOI Status', `<span class="badge badge-${loiOk ? 'success' : synced.loiIssued ? 'info' : 'muted'}">${loiOk ? 'Accepted' : synced.loiIssued ? 'Issued — accept pending' : 'Not issued'}</span>`, { html: true })}
        ${ocrLabel('PBG Due', synced.pbgDue !== '—' ? synced.pbgDue : '')}
        ${ocrLabel('Draft template', synced.draftTemplate)}
        ${ocrLabel('Award / Contract value', synced.value !== '—' ? synced.value : '')}
        ${ocrLabel('PBG Status', pack.pbgStatus ? `<span class="badge ${pbgReady ? 'badge-success' : 'badge-warning'}">${escapeHtmlLite(pack.pbgStatus)}</span>` : '', { html: true })}
        ${ocrLabel('PBG Amount', pack.pbgAmount)}
        ${ocrLabel('Issuing Bank', pack.bank)}
        ${ocrLabel('BG / SFMS Reference', pack.bgRef)}
        ${ocrLabel('PBG Valid Until', pack.validUntil)}
        ${ocrLabel('Contract Status', pack.contractStatus ? `<span class="badge ${signedReady ? 'badge-success' : 'badge-info'}">${escapeHtmlLite(pack.contractStatus)}</span>` : '', { html: true })}
      </div>
      <div class="wf-actions vendor-cm-actions">
        <button type="button" class="btn btn-outline"${!canEdit || loiOk ? ' disabled' : ''} onclick="acceptVendorContractLoi()">
          <i class="fa-solid fa-check"></i> ${loiOk ? 'LOI Accepted' : 'Accept LOI'}
        </button>
        <button type="button" class="btn btn-outline"${!canEdit || !loiOk ? ' disabled' : ''} onclick="markVendorContractDraftReviewed()">
          <i class="fa-solid fa-file-lines"></i> ${pack.draftReady || pack.uploads?.draftReview ? 'Draft reviewed' : 'Confirm draft template sync'}
        </button>
      </div>
    </div>

    <div class="vendor-cm-split">
      <div class="ocr-panel vendor-cm-panel">
        <div class="ocr-panel-head">
          <h4><i class="fa-solid fa-sliders"></i> 2. SLA · Schedule · Terms</h4>
          <span class="badge badge-info">RFP synced</span>
        </div>
        <div class="label-grid">
          ${ocrLabel('SLAs', t.sla)}
          ${ocrLabel('Delivery schedule', t.deliverySchedule)}
          ${ocrLabel('Tenure', t.tenure)}
          ${ocrLabel('Validity', t.validity)}
          ${ocrLabel('Payment terms', t.paymentTerms)}
          ${ocrLabel('PBG requirement', t.pbg)}
          ${ocrLabel('Penalties (RFP auto)', t.penalties)}
          ${ocrLabel('KPIs', t.kpis)}
        </div>
      </div>

      <div class="ocr-panel vendor-cm-panel">
        <div class="ocr-panel-head">
          <h4><i class="fa-solid fa-clipboard-list"></i> 3. SBG · SOW · Deliverables</h4>
          <span class="badge badge-info">Tender-linked</span>
        </div>
        <div class="label-grid label-grid--stack">
          ${ocrLabel('SBG', t.sbg)}
          ${ocrLabel('SOW', t.sow)}
          ${ocrLabel('Deliverables', t.deliverables)}
          ${ocrLabel('Linked tender docs', 'NIT · BOQ · T&amp;C · LOA pack for ' + escapeHtmlLite(selectedId), { html: true })}
        </div>
      </div>
    </div>

    <div class="ocr-panel vendor-cm-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-cloud-arrow-up"></i> 4. Tender-specific document uploads</h4>
        <span class="badge ${signedReady && pbgReady ? 'badge-success' : 'badge-muted'}">${escapeHtmlLite(selectedId)}</span>
      </div>
      <p class="report-footnote vendor-cm-upload-note">Files attach only to <strong>${escapeHtmlLite(selectedId)}</strong>. Switch tender (top right) to work another pack.</p>
      <div class="inline-upload-grid inline-upload-grid--3">
        ${renderInlineUpload({
          id: 'wfInlineLoiAccept',
          title: '1. LOI acceptance proof',
          hint: 'Ack copy / portal confirmation · PDF / JPG',
          disabled: uploadDis || stageSubmitted || (loiOk && !!pack.uploads?.loiAccept),
          fileName: pack.uploads?.loiAccept?.name,
          onChange: 'handleContractLoiAcceptUpload'
        })}
        ${renderInlineUpload({
          id: 'wfInlinePbg',
          title: '2. PBG document',
          hint: 'SFMS / e-BG · fills PBG fields above',
          disabled: uploadDis || stageSubmitted || !loiOk || pbgReady,
          fileName: pack.uploads?.pbg?.name,
          onChange: 'handlePbgInlineUpload'
        })}
        ${renderInlineUpload({
          id: 'wfInlineSbg',
          title: '3. SBG document',
          hint: 'Security BG if required by tender',
          disabled: uploadDis || stageSubmitted || !loiOk,
          fileName: pack.uploads?.sbg?.name,
          onChange: 'handleContractSbgUpload'
        })}
        ${renderInlineUpload({
          id: 'wfInlineSow',
          title: '4. SOW / scope confirmation',
          hint: 'Signed SOW annexure · PDF',
          disabled: uploadDis || stageSubmitted || !loiOk,
          fileName: pack.uploads?.sow?.name,
          onChange: 'handleContractSowUpload'
        })}
        ${renderInlineUpload({
          id: 'wfInlineDeliverables',
          title: '5. Deliverables / schedule',
          hint: 'Delivery plan vs tender schedule',
          disabled: uploadDis || stageSubmitted || !loiOk,
          fileName: pack.uploads?.deliverables?.name,
          onChange: 'handleContractDeliverablesUpload'
        })}
        ${renderInlineUpload({
          id: 'wfInlineContract',
          title: '6. Signed contract',
          hint: 'Executed agreement · after PBG',
          disabled: uploadDis || stageSubmitted || !pbgReady || signedReady,
          fileName: pack.uploads?.signedContract?.name || pack.contractOcr?.fileName,
          onChange: 'handleContractInlineUpload'
        })}
      </div>
      <div class="vendor-cm-submit-bar">
        <div class="vendor-cm-submit-copy">
          <strong>${stageSubmitted ? 'Contract pack submitted' : (canSubmitPack ? 'Ready to submit' : 'Complete required uploads')}</strong>
          <p>${stageSubmitted
            ? `Pack for <strong>${escapeHtmlLite(selectedId)}</strong> is submitted. You can move to Delivery.`
            : (canSubmitPack
              ? `LOI, PBG and signed contract are ready for <strong>${escapeHtmlLite(selectedId)}</strong>. Submit to unlock the next stage.`
              : 'Upload PBG and the signed contract (after LOI accept), then submit this tender pack.')}</p>
        </div>
        <button type="button" class="btn btn-primary btn-lg vendor-cm-submit-btn" onclick="submitVendorContractPack()"${!canSubmitPack && !stageSubmitted ? ' disabled' : ''}${stageSubmitted ? ' disabled' : ''}>
          <i class="fa-solid fa-${stageSubmitted ? 'circle-check' : 'paper-plane'}"></i>
          ${stageSubmitted ? 'Submitted' : 'Submit contract pack'}
        </button>
      </div>
    </div>
  </div>` : `
  <div class="vendor-cm-empty">
    <div class="vendor-cm-empty-icon"><i class="fa-solid fa-file-signature"></i></div>
    <h3>Select a tender to continue</h3>
    <p>Use the tender dropdown at the <strong>top right</strong> to load LOI, draft template, SLA / penalties, and upload documents for that tender only.</p>
    <ol>
      <li>Pick tender reference (top right)</li>
      <li>Accept LOI and confirm draft sync</li>
      <li>Upload PBG, SBG, SOW, deliverables &amp; signed contract</li>
    </ol>
  </div>`;

  return `<div class="vendor-cm-stage">
    <div class="vendor-cm-hero">
      <div class="vendor-cm-hero-copy">
        <p class="vendor-cm-eyebrow">Stage 6 · Contract execution</p>
        <h3>${escapeHtmlLite(titleLine)}</h3>
        <p>Work LOI → PBG → draft → signed for one tender at a time. Register of all contracts stays at the bottom for reference.</p>
      </div>
      <aside class="vendor-cm-hero-select" aria-label="Tender selection">
        <div class="vendor-cm-hero-select-head">
          <span><i class="fa-solid fa-list-check"></i> Select tender</span>
          <span class="badge ${statusBadge}">${hasTender ? escapeHtmlLite(selectedId) : 'Required'}</span>
        </div>
        ${customSelectHTML('Tender reference', 'contractTenderRef', options, selectedLabel, true)}
        ${hasTender ? `<p class="vendor-cm-hero-hint"><i class="fa-solid fa-link"></i> Active pack · ${escapeHtmlLite(selectedId)}</p>` : `<p class="vendor-cm-hero-hint"><i class="fa-solid fa-arrow-pointer"></i> Required before uploads</p>`}
      </aside>
    </div>

    ${hasTender ? renderVendorContractLifecycleStrip(synced) : ''}

    ${workPanels}

    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete Award Notification (Stage 5) to unlock contract uploads.</p></div></div>' : ''}

    ${renderVendorContractExecTable({ selectedTenderId: selectedId })}
  </div>`;
}

function acceptVendorContractLoi() {
  const tenderId = vendorStageState.contract.tenderId || resolveContractTenderFromSelect();
  if (!tenderId) {
    showWfAlert('Select a tender before accepting LOI.');
    return;
  }
  const pack = ensureVendorContractPack(tenderId);
  pack.loiIssued = true;
  pack.loiAccepted = true;
  pack.draftReady = true;
  if (!pack.uploads.loiAccept) {
    pack.uploads.loiAccept = { name: `LOI-Ack-${tenderId}.pdf`, size: 0 };
  }
  syncVendorContractStateFromPack(tenderId);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert(`LOI accepted for <strong>${escapeHtmlLite(tenderId)}</strong>. Submit PBG and tender-specific documents.`, 'success');
}

function markVendorContractDraftReviewed() {
  const tenderId = vendorStageState.contract.tenderId;
  if (!tenderId) {
    showWfAlert('Select a tender first.');
    return;
  }
  const pack = ensureVendorContractPack(tenderId);
  if (!pack.loiAccepted) {
    showWfAlert('Accept LOI before confirming the draft template.');
    return;
  }
  pack.draftReady = true;
  pack.uploads.draftReview = { name: `Draft-Review-${tenderId}.pdf`, size: 0 };
  syncVendorContractStateFromPack(tenderId);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert('Draft template confirmed as synced with tender documents.', 'success');
}

function handleContractLoiAcceptUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId;
  if (!tenderId) {
    showWfAlert('Select a tender before uploading documents.');
    return;
  }
  simulateOcrDelay(() => {
    const pack = ensureVendorContractPack(tenderId);
    pack.uploads.loiAccept = { name: file.name, size: file.size };
    pack.loiIssued = true;
    pack.loiAccepted = true;
    pack.draftReady = true;
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`LOI acceptance saved for <strong>${escapeHtmlLite(tenderId)}</strong>.`, 'success');
  });
}

function handleContractSbgUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId;
  if (!tenderId) {
    showWfAlert('Select a tender before uploading documents.');
    return;
  }
  simulateOcrDelay(() => {
    const pack = ensureVendorContractPack(tenderId);
    pack.uploads.sbg = { name: file.name, size: file.size };
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`SBG document attached to <strong>${escapeHtmlLite(tenderId)}</strong>.`, 'success');
  });
}

function handleContractSowUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId;
  if (!tenderId) {
    showWfAlert('Select a tender before uploading documents.');
    return;
  }
  simulateOcrDelay(() => {
    const pack = ensureVendorContractPack(tenderId);
    pack.uploads.sow = { name: file.name, size: file.size };
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`SOW confirmation attached to <strong>${escapeHtmlLite(tenderId)}</strong>.`, 'success');
  });
}

function handleContractDeliverablesUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId;
  if (!tenderId) {
    showWfAlert('Select a tender before uploading documents.');
    return;
  }
  simulateOcrDelay(() => {
    const pack = ensureVendorContractPack(tenderId);
    pack.uploads.deliverables = { name: file.name, size: file.size };
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`Deliverables / schedule document attached to <strong>${escapeHtmlLite(tenderId)}</strong>.`, 'success');
  });
}

function handlePbgInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId || resolveContractTenderFromSelect();
  if (!tenderId) {
    showWfAlert('Select a tender before uploading the PBG.');
    return;
  }
  const pack = ensureVendorContractPack(tenderId);
  if (!pack.loiAccepted && !getVendorContractSyncedPack(tenderId).loiAccepted) {
    showWfAlert('Accept LOI for this tender before submitting PBG.');
    return;
  }
  const synced = getVendorContractSyncedPack(tenderId);
  simulateOcrDelay(() => {
    const contractId = synced.contract?.id || `CNT-${tenderId.replace(/^TND-/, '')}`;
    const pbgAmt = synced.contract?.pbgAmount || synced.terms?.pbg || '5% of contract value';
    pack.uploads.pbg = { name: file.name, size: file.size };
    pack.pbgSubmitted = true;
    pack.id = contractId;
    pack.pbgAmount = pbgAmt;
    pack.bank = 'HDFC Bank';
    pack.bgRef = `BG-HDFC-2026-${String(tenderId).slice(-4)}`;
    pack.validUntil = synced.contract?.endDate || '28-08-2027';
    pack.pbgStatus = 'Submitted — Under Verification';
    pack.contractStatus = 'Ready for Signed Contract Upload';
    pack.pbgOcr = { fileName: file.name };
    pack.loiAccepted = true;
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`PBG processed for <strong>${escapeHtmlLite(tenderId)}</strong>. Review details, then upload the signed contract.`, 'success');
  });
}

function handleContractInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const tenderId = vendorStageState.contract.tenderId || resolveContractTenderFromSelect();
  if (!tenderId) {
    showWfAlert('Select a tender before uploading the signed contract.');
    return;
  }
  const pack = ensureVendorContractPack(tenderId);
  if (!pack.pbgSubmitted) {
    showWfAlert('Upload and process the PBG document for this tender first.');
    return;
  }
  simulateOcrDelay(() => {
    pack.uploads.signedContract = { name: file.name, size: file.size };
    pack.signed = true;
    pack.contractStatus = 'Ready to submit';
    pack.contractOcr = { fileName: file.name };
    pack.draftReady = true;
    syncVendorContractStateFromPack(tenderId);
    persistVendorLifecycle();
    showWfAlert(`Signed contract processed for <strong>${escapeHtmlLite(tenderId)}</strong>. Click <strong>Submit contract pack</strong> to continue.`, 'success');
  });
}

function submitVendorContractPack() {
  const tenderId = vendorStageState.contract.tenderId || resolveContractTenderFromSelect();
  if (!tenderId) {
    showWfAlert('Select a tender before submitting the contract pack.');
    return;
  }
  if (vendorStageState.completed?.[6]) {
    showWfAlert('This contract pack is already submitted.', 'success');
    return;
  }
  const pack = ensureVendorContractPack(tenderId);
  const synced = getVendorContractSyncedPack(tenderId);
  const loiOk = !!(pack.loiAccepted || synced.loiAccepted);
  if (!loiOk) {
    showWfAlert('Accept LOI for this tender before submitting.');
    return;
  }
  if (!pack.pbgSubmitted) {
    showWfAlert('Upload the PBG document before submitting the contract pack.');
    return;
  }
  if (!pack.signed) {
    showWfAlert('Upload the signed contract before submitting the contract pack.');
    return;
  }
  pack.contractStatus = 'Submitted';
  syncVendorContractStateFromPack(tenderId);
  completeVendorStage(6);
  persistVendorLifecycle();
  refreshWorkflowUI();
  showWfAlert(`Contract pack submitted for <strong>${escapeHtmlLite(tenderId)}</strong>. You may proceed to Delivery.`, 'success');
}

function handleDeliveryInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const cold = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('delColdChain') : vendorStageState.delivery.coldChain;
  simulateOcrDelay(() => {
    vendorStageState.delivery = {
      ...vendorStageState.delivery,
      challan: 'CHL-2026-0456',
      vehicle: 'MP-04-AB-2190 / LR-88912',
      dispatchDate: '03-09-2026',
      expectedDate: '06-09-2026',
      remarks: 'Hospital Linen — Batch 3',
      status: 'Dispatched',
      coldChain: cold || 'No',
      ocrReady: true,
      updated: false,
      fileName: file.name
    };
    persistVendorLifecycle();
    showWfAlert('Delivery status document processed. Review the details, set Cold Chain if needed, then Save.', 'success');
  });
}

function saveDeliveryOcr() {
  const d = vendorStageState.delivery;
  if (!d.ocrReady) {
    showWfAlert('Upload a Delivery Status document first so details can be populated.');
    return;
  }
  const cold = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('delColdChain') : d.coldChain;
  d.coldChain = cold || 'No';
  d.updated = true;
  completeVendorStage(7);
  persistVendorLifecycle();
  showWfAlert('Delivery details saved. You may proceed to Invoice Submission.', 'success');
  refreshWorkflowUI();
}

function handleInvoiceProofInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  simulateOcrDelay(() => {
    vendorStageState.uploads.deliveryProof = { name: file.name, size: file.size };
    vendorStageState.invoice = {
      ...vendorStageState.invoice,
      number: 'INV-0892',
      grn: 'GRN-2026-0311',
      amount: '4,25,000',
      status: 'Ready — Confirm to Save',
      submitted: false,
      ocrReady: true,
      fileName: file.name
    };
    showWfAlert('Delivery proof processed. Review invoice details, then Save.', 'success');
  });
}

function saveInvoiceOcr() {
  const inv = vendorStageState.invoice;
  if (!inv.ocrReady) {
    showWfAlert('Attach Delivery Proof first so invoice details can be populated.');
    return;
  }
  inv.submitted = true;
  inv.status = 'Submitted';
  vendorStageState.payment.milestones[0].done = true;
  vendorStageState.payment.status = 'Under Verification';
  vendorStageState.payment.lastUpdate = formatDateDMY(APP_TODAY);
  completeVendorStage(8);
  persistVendorLifecycle();
  showWfAlert('Invoice details saved. Payment Tracking is now available.', 'success');
  refreshWorkflowUI();
}

function refreshPaymentStatus() {
  refreshVendorPaymentSyncApi();
}

function openWorkflowDocument(docId) {
  if (docId === 'audit-trail') {
    openAuditTrailModal();
    return;
  }
  if (docId === 'compliance-matrix') {
    openVendorResourceModal('compliance-matrix');
    return;
  }
  if (docId === 'bid-submission-guide') {
    openBidSubmissionGuide();
    return;
  }
  if (docId.startsWith('stage-') && docId.endsWith('-guide')) {
    const stageId = parseInt(docId.replace('stage-', '').replace('-guide', ''), 10);
    openLifecycleGuideModal(stageId);
    return;
  }
  if (docId === 'kyc-checklist') {
    openModal('KYC Verification Checklist', renderKycChecklistModal(), { wide: true });
    return;
  }
  if (docId === 'vendor-code-letter') {
    openModal('Vendor Code Assignment Letter', renderVendorCodeLetterModal(), { wide: true });
    return;
  }
  if (docId === 'consolidation-report') {
    openConsolidationDocuments();
    return;
  }
  openLifecycleGuideModal();
}

function openModal(title, bodyHtml, options = {}) {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay?.querySelector('.modal');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const backBtn = document.getElementById('modalBackBtn');

  const alreadyOpen = overlay?.classList.contains('open');
  if (alreadyOpen && !options.fromBack && !options.replace) {
    modalHistory.push({
      title: titleEl?.textContent || '',
      body: bodyEl?.innerHTML || '',
      wide: !!modal?.classList.contains('modal--wide'),
      large: !!modal?.classList.contains('modal--lg'),
      extraWide: !!modal?.classList.contains('modal--xl'),
      fullBleed: !!modal?.classList.contains('modal--xxl')
    });
  }
  if (!alreadyOpen && !options.fromBack) {
    modalHistory = [];
  }

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) {
    bodyEl.innerHTML = bodyHtml;
    // History restore serializes data-bound; clear so selects re-init with fresh listeners.
    bodyEl.querySelectorAll('.custom-select').forEach(el => {
      delete el.dataset.bound;
      delete el.dataset.reportCatBound;
    });
  }
  modal?.classList.toggle('modal--wide', !!options.wide);
  modal?.classList.toggle('modal--lg', !!options.large);
  modal?.classList.toggle('modal--xl', !!options.extraWide);
  modal?.classList.toggle('modal--xxl', !!options.fullBleed);
  overlay?.classList.add('open');
  backBtn?.classList.toggle('hidden', modalHistory.length === 0);

  if (options.highlightStage) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`guide-stage-${options.highlightStage}`);
      el?.classList.add('guide-stage--highlight');
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  if (typeof initCustomSelects === 'function') initCustomSelects();
  bindArticleCoverageStatusFilter();
  if (typeof bindVendorDeliveryUpdateTenderSelect === 'function') bindVendorDeliveryUpdateTenderSelect();
  if (typeof bindVendorInvoiceUpdateTenderSelect === 'function') bindVendorInvoiceUpdateTenderSelect();
  if (typeof bindVendorReportDetailCategorySelect === 'function') bindVendorReportDetailCategorySelect();
}

function modalGoBack() {
  const prev = modalHistory.pop();
  if (!prev) {
    closeModal();
    return;
  }
  openModal(prev.title, prev.body, {
    wide: prev.wide,
    large: prev.large,
    extraWide: prev.extraWide,
    fullBleed: prev.fullBleed,
    fromBack: true,
    replace: true
  });
}

function getAuditTrailEntries() {
  return currentRole === 'gov' ? AUDIT_TRAIL_GOV : AUDIT_TRAIL_VENDOR;
}

function getStageTips() {
  return currentRole === 'gov' ? GOV_STAGE_TIPS : VENDOR_STAGE_TIPS;
}

function renderLifecycleGuideContent(highlightStage) {
  const steps = getWorkflowSteps();
  const checklist = currentRole === 'gov' ? GOV_STAGE_CHECKLIST : VENDOR_STAGE_CHECKLIST;
  const tips = getStageTips();
  const isGov = currentRole === 'gov';
  const progress = getWorkflowProgressStep();

  return `<div class="guide-modal">
    <div class="guide-modal-intro">
      <div class="guide-modal-intro-icon"><i class="fa-solid fa-book-open"></i></div>
      <div>
        <p class="guide-modal-lead">${isGov ? 'Government procurement lifecycle — 14 stages from need identification to renewal.' : 'Vendor / Bidder lifecycle — 10 stages from registration to renewal.'}</p>
        <p class="guide-modal-meta">GFR 2017 compliant · Click any stage below for checklist and guidance · Your current progress: <strong>Stage ${progress}</strong></p>
      </div>
    </div>
    <div class="guide-modal-stages">
      ${steps.map(s => {
        const items = checklist[s.id] || [];
        const tip = tips[s.id];
        const statusLabel = s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Upcoming';
        const statusClass = s.status === 'done' ? 'badge-success' : s.status === 'active' ? 'badge-info' : 'badge-muted';
        const highlight = s.id === highlightStage ? ' guide-stage--highlight' : '';
        return `<article class="guide-stage${highlight}" id="guide-stage-${s.id}">
          <div class="guide-stage-head">
            <span class="guide-stage-num">Stage ${s.id}</span>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </div>
          <h3 class="guide-stage-title">${s.name}</h3>
          <p class="guide-stage-desc">${s.desc}</p>
          ${items.length ? `<ul class="guide-stage-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
          ${tip ? `<div class="guide-stage-tip"><i class="fa-solid fa-lightbulb"></i> ${tip}</div>` : ''}
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function openLifecycleGuideModal(highlightStage) {
  const isGov = currentRole === 'gov';
  const title = isGov ? 'Government Procurement Lifecycle Guide' : 'Vendor Lifecycle Guide';
  openModal(title, renderLifecycleGuideContent(highlightStage), { wide: true, large: true, highlightStage });
}

let auditTrailFilter = 'all';

function renderAuditTrailModalBody() {
  const entries = getAuditTrailEntries();
  const step = currentWorkflowStep || getWorkflowProgressStep();
  const stepName = getWorkflowSteps().find(s => s.id === step)?.name || '';
  const filtered = auditTrailFilter === 'current'
    ? entries.filter(e => e.stageId === step)
    : entries;
  const successCount = filtered.filter(e => e.status === 'Success').length;
  const pendingCount = filtered.filter(e => e.status === 'Pending').length;

  return `<div class="audit-modal">
    <div class="audit-modal-summary">
      <div class="audit-stat"><span class="audit-stat-value">${filtered.length}</span><span class="audit-stat-label">Entries</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${successCount}</span><span class="audit-stat-label">Successful</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${pendingCount}</span><span class="audit-stat-label">Pending</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${step}</span><span class="audit-stat-label">Viewing Stage</span></div>
    </div>
    <div class="audit-filters">
      <button type="button" class="audit-filter${auditTrailFilter === 'all' ? ' active' : ''}" onclick="setAuditTrailFilter('all')">All Activity</button>
      <button type="button" class="audit-filter${auditTrailFilter === 'current' ? ' active' : ''}" onclick="setAuditTrailFilter('current')">Stage ${step}: ${stepName}</button>
    </div>
    <div class="audit-table-wrap">
      <table class="data-table audit-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Stage</th>
            <th>User</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(e => `<tr class="audit-row audit-row--${e.status.toLowerCase()}">
            <td class="audit-time">${e.time}</td>
            <td><strong>${e.action}</strong><div class="audit-detail">${e.detail}</div></td>
            <td><span class="audit-stage-chip">Stage ${e.stageId}</span> ${e.stage}</td>
            <td><div class="audit-user">${e.userName}</div><div class="audit-detail">${e.user}</div></td>
            <td><code class="audit-ref">${e.ref}</code></td>
            <td><span class="badge badge-${e.status === 'Success' ? 'success' : e.status === 'Pending' ? 'warning' : 'info'}">${e.status}</span></td>
          </tr>`).join('') : `<tr><td colspan="6" class="audit-empty">No audit entries for this filter.</td></tr>`}
        </tbody>
      </table>
    </div>
    <p class="audit-footer"><i class="fa-solid fa-shield-halved"></i> All actions are logged with user ID, timestamp, and reference for GFR 2017 compliance and dispute resolution.</p>
  </div>`;
}

function openAuditTrailModal() {
  auditTrailFilter = 'all';
  openModal('Audit Trail', renderAuditTrailModalBody(), { wide: true, large: true });
}

function setAuditTrailFilter(filter) {
  auditTrailFilter = filter;
  const body = document.getElementById('modalBody');
  if (body && document.getElementById('modalTitle')?.textContent === 'Audit Trail') {
    body.innerHTML = renderAuditTrailModalBody();
  }
}

function renderVendorResourceModal(key) {
  const info = VENDOR_RESOURCE_DETAILS[key];
  if (!info) return '<p>Resource not found.</p>';

  const statsHtml = info.stats.map(s => `<div class="resource-stat"><span class="resource-stat-label">${s.label}</span><span class="resource-stat-value">${s.value}</span></div>`).join('');
  const stepsHtml = info.steps ? `<ol class="resource-steps">${info.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : '';
  const rowsHtml = info.rows ? `<div class="resource-matrix-wrap mt-2"><table class="data-table resource-matrix"><thead><tr><th>Requirement</th><th>Your Response</th><th>Status</th></tr></thead><tbody>${info.rows.map(r => `<tr><td>${r.req}</td><td>${r.response}</td><td><span class="badge badge-${r.status === 'Compliant' ? 'success' : 'warning'}">${r.status}</span></td></tr>`).join('')}</tbody></table></div>` : '';

  return `<div class="resource-modal">
    <div class="resource-modal-header">
      <div class="resource-modal-icon"><i class="fa-solid ${info.icon}"></i></div>
      <div>
        <span class="badge ${info.statusClass}">${info.status}</span>
        <p class="resource-modal-summary">${info.summary}</p>
      </div>
    </div>
    <div class="resource-stats">${statsHtml}</div>
    ${stepsHtml}
    ${rowsHtml}
    <div class="resource-note"><i class="fa-solid fa-circle-info"></i> ${info.note}</div>
  </div>`;
}

function openVendorResourceModal(key) {
  const info = VENDOR_RESOURCE_DETAILS[key];
  if (!info) return;
  openModal(info.title, renderVendorResourceModal(key), { wide: true });
}

function renderKycChecklistModal() {
  const items = VENDOR_STAGE_CHECKLIST[2] || [];
  return `<div class="doc-modal">
    <p class="doc-modal-lead">Required documents for KYC and bank verification (Stage 2).</p>
    <ul class="doc-checklist">${items.map(i => `<li><i class="fa-solid fa-check"></i> ${i}</li>`).join('')}</ul>
    <div class="resource-note mt-2"><i class="fa-solid fa-clock"></i> Respond to verification queries within 48 hours to avoid registration delays.</div>
  </div>`;
}

function renderVendorCodeLetterModal() {
  return `<div class="doc-modal doc-letter">
    <div class="doc-letter-head">
      <strong>MP Health Procurement Solution</strong><br>
      Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh
    </div>
    <p class="doc-letter-ref">Ref: VND-CODE/2026/0129 &nbsp;|&nbsp; Date: 28 Aug 2026</p>
    <p><strong>To,</strong><br>MediSupply India Pvt Ltd<br>Plot 12, Industrial Area, Bhopal, MP - 462001</p>
    <p><strong>Subject: Vendor Code Assignment</strong></p>
    <p>We are pleased to inform you that your registration and KYC verification have been completed successfully. Your unique vendor code for all future transactions on the MP Health Procurement portal is:</p>
    <div class="doc-letter-code">VND-MP-000123</div>
    <p>Please quote this code in all bids, contracts, invoices, and correspondence. Linked categories: <strong>Drugs, Consumables</strong>.</p>
    <p class="doc-letter-sign">— Authorized Signatory<br>Vendor Registry, MP Health Procurement</p>
  </div>`;
}

function renderGovWorkflowExtras() {
  return `<div class="cards-grid">
    <div class="info-card info-card--interactive" role="button" tabindex="0" onclick="openGovWorkflowSectionModal('demand')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openGovWorkflowSectionModal('demand')}">
      <h4><i class="fa-solid fa-boxes-stacked"></i> Demand Optimization</h4><p>Fulfill from existing stock before fresh procurement</p>
      <div class="card-meta"><span>28 items optimizable</span><span class="badge badge-success">₹2.1 Cr saved</span></div>
    </div>
    <div class="info-card info-card--interactive" role="button" tabindex="0" onclick="openGovWorkflowSectionModal('contract')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openGovWorkflowSectionModal('contract')}">
      <h4><i class="fa-solid fa-file-contract"></i> Contract Gate</h4><p>Contract approval and execution before PO</p>
      <div class="card-meta"><span>3 pending contracts</span><span class="badge badge-warning">Action Required</span></div>
    </div>
    <div class="info-card info-card--interactive" role="button" tabindex="0" onclick="openGovWorkflowSectionModal('eval')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openGovWorkflowSectionModal('eval')}">
      <h4><i class="fa-solid fa-scale-balanced"></i> Evaluation Committee</h4><p>Procurement, Stores, Finance, Quality, Evaluation roles</p>
      <div class="card-meta"><span>2 tenders in evaluation</span><span class="badge badge-info">In Progress</span></div>
    </div>
  </div>`;
}

function renderVendorWorkflowExtras() {
  return '';
}

function selectWorkflowStep(id) {
  const steps = getWorkflowSteps();
  const step = steps.find(s => s.id === id);
  if (!step) return;

  if (currentRole === 'gov') {
    const from = currentWorkflowStep;
    // From Stage 1, Resource Manager may jump directly to Stage 14 (Renewal).
    // After entering Stages 2–13, Stage 14 is only reachable sequentially (from 13 or already on 14).
    if (id === 14 && from !== 14) {
      const allowedJump = from === 1 && !govSequentialCommitted;
      const allowedSequential = from === 13 || govLifecycleComplete;
      if (!allowedJump && !allowedSequential) {
        showWfAlert('Once you proceed past Stage 1 into the sequential lifecycle (Stage 2 onwards), you cannot jump directly to Renewal (Stage 14). Complete Stages 2–13 in order to reach Renewal sequentially.');
        return;
      }
    }
    if (id >= 2 && id <= 13) {
      govSequentialCommitted = true;
    }
  }

  if (currentRole === 'gov' && id > 3 && currentWorkflowStep === 3 && !govIndentState.saved) {
    showWfAlert('Please review the Indent List before proceeding to the next stage.');
    return;
  }
  if (currentRole === 'gov' && id > 4 && currentWorkflowStep === 4 && !govConsolidationState.approved) {
    showWfAlert('Please review the Demand List before proceeding to the next stage.');
    return;
  }
  if (currentRole === 'gov' && id > 5 && currentWorkflowStep === 5 && !govBudgetState.verified) {
    showWfAlert('Please complete budget verification before proceeding to the next stage.');
    return;
  }
  if (currentRole === 'gov' && id > 6 && currentWorkflowStep === 6 && !govTenderPrepState.finalReady) {
    showWfAlert('Please prepare the final NIT/RFP after division consensus before proceeding to the next stage.');
    return;
  }
  currentWorkflowStep = id;
  if (currentRole === 'vendor') persistVendorLifecycle();
  if (currentRole === 'gov') {
    syncGovWorkflowStatuses();
    persistGovLifecycle();
  }
  refreshWorkflowUI();
  document.getElementById('wfDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function goWorkflowStep(delta) {
  const next = currentWorkflowStep + delta;
  const total = getWorkflowSteps().length;
  if (next < 1 || next > total) return;

  if (currentRole === 'vendor' && delta > 0) {
    const err = validateVendorStageFields(currentWorkflowStep);
    if (err && currentWorkflowStep >= getVendorActiveStageId()) {
      showWfAlert(err);
      return;
    }
    if (!vendorCanAdvanceFrom(currentWorkflowStep)) {
      showWfAlert(err || 'Complete the required actions on this stage before moving to the next stage.');
      return;
    }
  }

  if (currentRole === 'gov' && delta > 0 && currentWorkflowStep === 3 && !govIndentState.saved) {
    showWfAlert('Please review the Indent List before proceeding to the next stage.');
    return;
  }

  if (currentRole === 'gov' && delta > 0 && currentWorkflowStep === 4 && !govConsolidationState.approved) {
    showWfAlert('Please review the Demand List before proceeding to the next stage.');
    return;
  }

  if (currentRole === 'gov' && delta > 0 && currentWorkflowStep === 5 && !govBudgetState.verified) {
    showWfAlert('Please complete budget verification before proceeding to the next stage.');
    return;
  }

  if (currentRole === 'gov' && delta > 0 && currentWorkflowStep === 6 && !govTenderPrepState.finalReady) {
    showWfAlert('Please prepare the final NIT/RFP after division consensus before proceeding to the next stage.');
    return;
  }

  selectWorkflowStep(next);
}

function returnToCurrentWorkflowStep() {
  selectWorkflowStep(getWorkflowProgressStep());
}

function refreshWorkflowUI() {
  const steps = getWorkflowSteps();
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const total = steps.length;
  const step = steps.find(s => s.id === viewId) || steps[0];

  document.querySelectorAll('.wf-step').forEach(el => {
    const id = parseInt(el.dataset.step, 10);
    const s = steps.find(x => x.id === id);
    if (!s) return;
    el.className = getWorkflowStepClasses(s, viewId);
    el.setAttribute('aria-selected', id === viewId);
    const dot = el.querySelector('.wf-dot');
    if (dot) dot.innerHTML = wfDotContent(s, viewId);
  });

  const detail = document.getElementById('wfDetail');
  if (detail) {
    detail.innerHTML = renderWorkflowDetailPanel(step, progress, total);
    initCustomSelects();
    if (currentRole === 'vendor' && step.id === 1) lockSyncedRegistrationSelects();
    if (currentRole === 'vendor' && step.id === 4) bindVendorBidDvdmsCategorySelect();
    if (currentRole === 'gov' && step.id === 4) bindGovDemandListCategorySelect();
    if (currentRole === 'gov' && step.id === 5) bindPrBudgetCategorySelect();
    if (currentRole === 'gov' && step.id === 6) bindTenderPrepCategorySelect();
    if (currentRole === 'gov' && step.id === 7) bindBidEvalCategorySelect();
    if (currentRole === 'gov' && step.id === 8) bindGovStageCategorySelect('contractApprovalCategory', setContractApprovalCategory);
    if (currentRole === 'gov' && step.id === 9) bindGovStageCategorySelect('awardStageCategory', setAwardStageCategory);
    if (currentRole === 'gov' && step.id === 10) bindGovStageCategorySelect('poStageCategory', setPoStageCategory);
    if (currentRole === 'gov' && step.id === 11) bindGovStageCategorySelect('grnStageCategory', setGrnStageCategory);
    if (currentRole === 'gov' && step.id === 12) bindGovStageCategorySelect('invoiceStageCategory', setInvoiceStageCategory);
    if (currentRole === 'gov' && step.id === 13) bindGovStageCategorySelect('paymentStageCategory', setPaymentStageCategory);
    if (currentRole === 'gov' && step.id === 14) bindGovStageCategorySelect('renewalStageCategory', setRenewalStageCategory);
    if (currentRole === 'vendor' && step.id === 5) bindVendorAwardSyncCategorySelect();
    if (currentRole === 'vendor' && step.id === 6) {
      bindContractTenderSelectListener();
      bindVendorContractExecCategorySelect();
    }
    if (currentRole === 'vendor' && step.id === 7) {
      if (!shouldShowManualDeliveryUpload()) bindVendorDeliverySyncCategorySelect();
    }
    if (currentRole === 'vendor' && step.id === 8) bindVendorInvoiceExecCategorySelect();
    if (currentRole === 'vendor' && step.id === 9) bindVendorPaymentExecCategorySelect();
    if (currentRole === 'vendor' && step.id === 10) bindVendorRenewalExecCategorySelect();
  }
  updateWorkflowSubtitle();
  updatePageMeta();
  if (currentRole === 'gov') scheduleStageSlaCheck(viewId);
}

// ========== OTHER PAGES ==========
function renderVendorReg() {
  const regs = filterByCategory(VENDOR_REGISTRATIONS);
  const paged = paginateItems(regs, vendorRegListPage, 10);
  vendorRegListPage = paged.page;
  return `<div class="data-table-wrap">
      <div class="table-header">
        <h3>Registration Requests</h3>
      </div>
      <table class="data-table">
        <thead><tr><th>Request ID</th><th>Company Name</th><th>Category</th><th>Empanelment Fee</th><th>KYC Status</th><th>Documents</th><th>Submitted</th><th>Action</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(r => {
            const fee = r.empanelment || { amount: EMPANELMENT_FEE_AMOUNT, mode: 'Online', status: r.kyc === 'Verified' ? 'Submitted' : 'Pending' };
            const feeBadge = fee.status === 'Submitted' || fee.status === 'Verified' ? 'success' : 'warning';
            return `<tr onclick="openVendorRegEmpanelmentDetail('${r.id}')">
            <td><strong>${r.id}</strong></td><td>${r.name}</td><td>${r.category}</td>
            <td><span class="badge badge-${feeBadge}">${fee.mode || '—'} · ${fee.status || 'Pending'}</span><div class="table-sub">${fee.amount || EMPANELMENT_FEE_AMOUNT}</div></td>
            <td><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></td>
            <td>${r.documents}</td><td>${r.submitted}</td>
            <td><button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.75rem" onclick="event.stopPropagation();openVendorRegEmpanelmentDetail('${r.id}')">Review</button></td>
          </tr>`;
          }).join('') : emptyTableRow(8)}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorRegListPage')}
    </div>`;
}

function setVendorRegListPage(page) {
  vendorRegListPage = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function openVendorRegEmpanelmentDetail(regId) {
  const r = (typeof VENDOR_REGISTRATIONS !== 'undefined' ? VENDOR_REGISTRATIONS : []).find(x => x.id === regId);
  if (!r) return;
  const fee = r.empanelment || {
    amount: EMPANELMENT_FEE_AMOUNT,
    mode: r.kyc === 'Verified' ? 'Online' : 'Offline',
    status: r.kyc === 'Verified' ? 'Submitted' : 'Pending',
    utr: r.kyc === 'Verified' ? 'SBIN928471036482' : '—',
    proof: r.kyc === 'Verified' ? '—' : 'Challan pending upload'
  };
  openModal(`${r.name} — Registration review`, `<div class="kpi-detail">
    <div class="tender-detail-stats tender-detail-stats--4">
      <div class="tender-stat"><span>Request</span><strong>${r.id}</strong></div>
      <div class="tender-stat"><span>Category</span><strong>${r.category}</strong></div>
      <div class="tender-stat"><span>KYC</span><strong><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></strong></div>
      <div class="tender-stat"><span>Submitted</span><strong>${formatDateDMY(r.submitted)}</strong></div>
    </div>
    <div class="tender-detail-section">
      <h4>Empanelment fee</h4>
      <div class="data-table-wrap" style="margin-bottom:0.75rem">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>Amount</td><td><strong>${fee.amount || EMPANELMENT_FEE_AMOUNT}</strong></td></tr>
            <tr><td>Mode</td><td>${fee.mode || '—'}</td></tr>
            <tr><td>Status</td><td><span class="badge badge-${(fee.status === 'Submitted' || fee.status === 'Verified') ? 'success' : 'warning'}">${fee.status || 'Pending'}</span></td></tr>
            <tr><td>UTR / Proof</td><td>${fee.utr || fee.proof || '—'}</td></tr>
            <tr><td>Documents</td><td>${r.documents}</td></tr>
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Verify empanelment fee before completing KYC / vendor approval.</p>
    </div>
  </div>`, { wide: true });
}

function getLinkedItemsForTender(tender) {
  if (!tender || typeof CATEGORY_ITEM_TYPES === 'undefined') return [];
  const items = CATEGORY_ITEM_TYPES[tender.category] || [];
  const title = (tender.title || '').toLowerCase();
  const matched = items.filter(i => {
    const name = (i.name || '').toLowerCase();
    const tokens = name.split(/[\s&/]+/).filter(w => w.length > 3);
    return tokens.some(tok => title.includes(tok)) || title.includes(name.split(' ')[0].toLowerCase());
  });
  if (matched.length) return matched;
  const byValue = items.filter(i => i.spend === tender.value);
  return byValue.length ? byValue : items.slice(0, Math.min(4, items.length));
}

function getTenderScopeItemNames(tender) {
  const fromLifecycle = resolveLifecycleCoveredItems({
    tenderId: tender?.id,
    category: tender?.category,
    coveredItems: tender?.coveredItems || tender?.scopeItems
  });
  if (fromLifecycle.length) return fromLifecycle;
  return getLinkedItemsForTender(tender).map(i => i.name);
}

function getBidForTender(tenderId) {
  return typeof BIDS !== 'undefined' ? BIDS.find(b => b.tenderId === tenderId) : null;
}

function openTenderDetail(tenderId) {
  const t = TENDERS.find(x => x.id === tenderId);
  if (!t) {
    openModal(tenderId, '<p>Tender record not found.</p>');
    return;
  }

  const isOpen = t.status === 'Open';
  const daysLeft = daysUntilDeadline(t.deadline);
  const emdEstimate = t.category === 'Drugs' ? '₹3,20,000' : t.category === 'Equipment' ? '₹2,50,000' : '₹1,00,000';
  const scopeNames = getTenderScopeItemNames(t);
  const bid = getBidForTender(t.id);
  const clarifs = typeof CLARIFICATIONS !== 'undefined'
    ? CLARIFICATIONS.filter(c => c.tenderId === t.id)
    : [];
  const itemWise = categoryUsesItemWiseDetail(t.category);
  const coverageRow = {
    category: t.category,
    tenderId: t.id,
    value: t.value,
    coveredItems: scopeNames,
    categoryScope: `This ${t.category} tender is managed at category level. Line-item article schedules are not published for Services / Others packages.`
  };

  const deadlineLabel = !isOpen
    ? 'Not open for bidding'
    : daysLeft === null
      ? '—'
      : daysLeft > 0
        ? `${daysLeft} day(s) remaining`
        : daysLeft === 0
          ? 'Due today'
          : 'Deadline passed';

  const techStatus = bid?.technical || (t.status === 'Evaluation' ? 'Under review' : (isOpen ? 'Open' : '—'));
  const finStatus = bid?.financial || (isOpen ? 'Sealed' : '—');

  const rows = [
    ['Tender ID', t.id],
    ['Title', t.title || '—'],
    ['Category', t.category || '—'],
    ['Detail type', itemWise ? 'Item-wise' : 'Category-wise'],
    ['Est. value', t.value || '—'],
    ['Bids received', String(t.bids ?? '—')],
    ['Bid deadline', formatDateDMY(t.deadline)],
    ['Status', t.status || '—'],
    ['Technical', techStatus],
    ['Commercial', finStatus],
    ['Indicative EMD', emdEstimate]
  ];
  if (itemWise) {
    const cov = getLifecycleArticleCoverage(coverageRow);
    rows.push(['Articles in scope', `${cov.coveredCount} of ${cov.total}`]);
  }

  openModal(`${escapeHtmlLite(t.id)} — Tender details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Tender details</p>
        <h3>${escapeHtmlLite(t.title || 'Tender')}</h3>
        <p>${escapeHtmlLite(t.id)} · ${escapeHtmlLite(t.category || '—')}</p>
      </div>
      <span class="badge badge-${tenderBadgeClass(t.status)}">${escapeHtmlLite(t.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Est. value</span><strong>${escapeHtmlLite(t.value || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Bids</span><strong>${escapeHtmlLite(String(t.bids ?? '—'))}</strong></div>
      <div class="dvdms-detail-stat"><span>Deadline</span><strong>${escapeHtmlLite(formatDateDMY(t.deadline))}</strong></div>
      <div class="dvdms-detail-stat"><span>Countdown</span><strong>${escapeHtmlLite(deadlineLabel)}</strong></div>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Technical</span><strong>${escapeHtmlLite(techStatus)}</strong></div>
      <div class="dvdms-detail-stat"><span>Commercial</span><strong>${escapeHtmlLite(finStatus)}</strong></div>
      <div class="dvdms-detail-stat"><span>EMD (indicative)</span><strong>${escapeHtmlLite(emdEstimate)}</strong></div>
      <div class="dvdms-detail-stat"><span>Category</span><strong>${escapeHtmlLite(t.category || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(coverageRow, {
      stageTitle: `${t.category || 'Category'} · category-wise tender`,
      noun: 'tender',
      yesLabel: 'In scope',
      noLabel: 'Not in scope',
      yesHint: 'Articles covered under this tender schedule',
      noHint: 'In category catalogue · not part of this tender',
      statusHead: 'Tender scope',
      filterLabel: 'Tender Status',
      headTitle: `${t.category || 'Category'} articles · tender coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Tender summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Key requirements</div>
      <ul class="tender-req-list" style="margin:0.85rem 1rem 1rem;padding-left:1.1rem">
        <li>Valid GSTIN, PAN, and category licenses</li>
        <li>Technical compliance matrix mapped to NIT/RFP</li>
        <li>Sealed commercial bid (opened only after technical qualification)</li>
        <li>EMD approximately <strong>${escapeHtmlLite(emdEstimate)}</strong> (as per NIT)</li>
      </ul>
    </div>
    ${clarifs.length ? `<div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Clarifications</div>
      <div class="data-table-wrap bid-article-table-wrap" style="max-height:12rem">
        <table class="data-table data-table--modal">
          <thead><tr><th>#</th><th>Query</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            ${clarifs.map((c, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtmlLite(c.id)}</strong></td>
              <td>${escapeHtmlLite(c.subject)}</td>
              <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${escapeHtmlLite(c.status)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
    <p class="dvdms-detail-note">${isOpen
      ? 'This tender is open for bidding. Review article scope, eligibility and EMD before submitting your pack.'
      : t.status === 'Evaluation'
        ? 'Bidding is closed. Technical / commercial evaluation is in progress.'
        : t.status === 'Awarded'
          ? 'This tender has been awarded. Check Award Notification / Contracts for LOA and execution status.'
          : 'Review tender requirements and timelines before proceeding.'}</p>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

function renderSourcing() {
  const actions = getGovDashboardActionCounts(currentCategory === 'All' ? 'All' : currentCategory);
  const openTenders = filterListByCategory(TENDERS).filter(t => t.status === 'Open');
  const evalTenders = filterListByCategory(TENDERS).filter(t => t.status === 'Evaluation');
  const pending = filterListByCategory(PENDING_APPROVALS);
  const delays = filterListByCategory(PAYMENT_DELAYS);
  const catLabel = currentCategory === 'All' ? 'All categories' : currentCategory;

  return `
    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-bolt"></i> Same action queue as Analytics · ${catLabel} <span class="kpi-section-sum">Tab total = ${actions.sum}</span></div>
      <div class="kpi-grid kpi-grid--actions">
        <div class="kpi-card blue" onclick="document.getElementById('sourcingOpenTenders')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Open Tenders</div>
          <div class="kpi-value">${actions.open}</div>
          <div class="kpi-change">Accepting bids</div>
        </div>
        <div class="kpi-card orange" onclick="document.getElementById('sourcingPending')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Pending Approvals</div>
          <div class="kpi-value">${actions.pending}</div>
          <div class="kpi-change">Awaiting sanction</div>
        </div>
        <div class="kpi-card red" onclick="document.getElementById('sourcingDelays')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Payment Delays</div>
          <div class="kpi-value">${actions.delays}</div>
          <div class="kpi-change">Invoice holds</div>
        </div>
      </div>
    </div>

    <div class="data-table-wrap" id="sourcingOpenTenders">
      <div class="table-header"><h3>Open Tenders — ${catLabel} (${openTenders.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>
          ${openTenders.length ? openTenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')" style="cursor:pointer">
            <td>${i + 1}</td>
            <td><strong>${t.id}</strong></td>
            <td>${t.title}</td>
            <td>${t.category}</td>
            <td>${t.value}</td>
            <td>${t.bids}</td>
            <td>${formatDateDMY(t.deadline)}</td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
          </tr>`).join('') : emptyTableRow(8, 'No open tenders for this category.')}
        </tbody>
      </table>
    </div>

    ${evalTenders.length ? `<div class="data-table-wrap mt-2">
      <div class="table-header"><h3>Under Evaluation — ${catLabel} (${evalTenders.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Evaluation</th><th>Commercial</th><th>Status</th></tr></thead>
        <tbody>
          ${evalTenders.map((t, i) => {
            const bid = getBidForTender(t.id);
            return `<tr onclick="openTenderDetail('${t.id}')" style="cursor:pointer">
              <td>${i + 1}</td>
              <td><strong>${t.id}</strong></td>
              <td>${t.title}</td>
              <td>${t.category}</td>
              <td>${t.value}</td>
              <td>${t.bids}</td>
              <td><span class="badge badge-warning">${bid?.status === 'Under Evaluation' || t.status === 'Evaluation' ? 'In Progress' : '—'}</span></td>
              <td><span class="badge badge-muted"><i class="fa-solid fa-lock"></i> ${bid?.financial || 'Sealed'}</span></td>
              <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="data-table-wrap mt-2" id="sourcingPending">
      <div class="table-header"><h3>Pending Approvals — ${catLabel} (${pending.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>PR ID</th><th>Title</th><th>Category</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
        <tbody>
          ${pending.length ? pending.map((r, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${r.id}</strong></td>
            <td>${r.title}</td>
            <td>${r.category}</td>
            <td><span class="badge badge-warning">${r.stage}</span></td>
            <td>${r.amount}</td>
            <td>${r.age}</td>
            <td>${r.owner}</td>
          </tr>`).join('') : emptyTableRow(8, 'No pending approvals for this category.')}
        </tbody>
      </table>
    </div>

    <div class="data-table-wrap mt-2" id="sourcingDelays">
      <div class="table-header"><h3>Payment Delays — ${catLabel} (${delays.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Invoice</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
        <tbody>
          ${delays.length ? delays.map((r, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${r.id}</strong></td>
            <td>${r.vendor}</td>
            <td>${r.category}</td>
            <td>${r.amount}</td>
            <td><span class="badge badge-danger">${r.daysOverdue}d</span></td>
            <td>${r.reason}</td>
            <td>${r.contractId}</td>
          </tr>`).join('') : emptyTableRow(8, 'No payment delays for this category.')}
        </tbody>
      </table>
    </div>

    <div class="wf-detail mt-2">
      <h3>Weighted Vendor Recommendation</h3>
      <p>Selected vendor receives explainable weighted score. Blacklisted/expired/non-compliant bidders auto-blocked. Score weights match Analytics Vendor Performance Matrix.</p>
      <div class="score-weights">${SCORE_WEIGHTS.map(w => `<div class="weight-card"><div class="weight-pct">${w.weight}%</div><div class="weight-label">${w.label}</div></div>`).join('')}</div>
    </div>`;
}

function renderMasterData() {
  const cats = currentCategory === 'All'
    ? CATEGORIES.filter(c => c !== 'All')
    : [currentCategory];
  return `<div class="cards-grid">
      ${cats.map(c => `<div class="info-card ${currentCategory === c ? 'cat-highlight' : ''}"><h4>${c}</h4><p>Master items, specifications, and formulary lists</p><div class="card-meta"><span>Active items</span><span>${MASTER_DATA_COUNTS[c]}</span></div></div>`).join('')}
    </div>
    <div class="wf-detail"><h3>Workflow Configuration</h3><p>Assign operational tasks to Procurement, Stores, Finance, Quality, and Evaluation roles${currentCategory !== 'All' ? ` for <strong>${currentCategory}</strong>` : ''}.</p></div>`;
}

function renderTOR() {
  const entries = filterByCategory(TOR_ENTRIES);
  const flagCount = entries.reduce((s, e) => s + e.flags, 0);
  return `${flagCount > 0 ? `<div class="sticky-banner"><span class="banner-icon"><i class="fa-solid fa-flag"></i></span><div><strong>${flagCount} Red Flag${flagCount !== 1 ? 's' : ''}</strong> detected in active TOR documents${currentCategory !== 'All' ? ` for ${currentCategory}` : ''}. Review required before tender publication.</div></div>` : ''}
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>TOR Reference</th><th>Tender</th><th>Category</th><th>Coverage</th><th>Red Flags</th><th>Status</th></tr></thead>
        <tbody>
          ${entries.length ? entries.map(e => `<tr>
            <td>${e.id}</td><td>${e.tenderId}</td><td>${e.category}</td><td>${e.coverage}</td>
            <td><span class="badge badge-${e.flags ? 'warning' : 'success'}">${e.flags ? e.flags + ' flags' : 'Clear'}</span></td>
            <td><span class="badge badge-${e.status === 'Approved' ? 'success' : e.status === 'Blocked' ? 'danger' : 'warning'}">${e.status}</span></td>
          </tr>`).join('') : emptyTableRow(6)}
        </tbody>
      </table>
    </div>`;
}

function renderVendorMatrix() {
  return `${renderAnalyticsFilterBar({ showCompare: false })}
    <div class="chart-card mb-2">
      <div class="chart-header">
        <h3>Vendor Comparison</h3>
        <span class="chart-subtitle" id="vendorMatrixChartSubtitle">${getAnalyticsContextLabel()} · Vendor score comparison (pts 0–100)</span>
      </div>
      <div class="chart-container"><canvas id="chartVendorTrend"></canvas></div>
    </div>
    ${renderVendorTable({ showNavButton: false, tableId: 'vendorMatrixTable' })}`;
}

function renderReports() {
  if (currentRole === 'vendor') return renderVendorReports();
  return renderGovReports();
}

function getGovReportDataset(category = currentCategory) {
  const filter = (items, field = 'category') => (category === 'All' ? items : items.filter(i => i[field] === category));
  const workQueue = getWorkQueueSource();
  const filteredQueue = category === 'All'
    ? workQueue
    : workQueue.filter(w => `${w.title} ${w.detail}`.toLowerCase().includes(category.toLowerCase()));

  const workflowDone = GOV_WORKFLOW.filter(s => s.status === 'done').length;
  const workflowActive = GOV_WORKFLOW.filter(s => s.status === 'active').length;
  const workflowPending = GOV_WORKFLOW.filter(s => s.status === 'pending').length;

  return {
    category,
    workflow: GOV_WORKFLOW,
    workflowDone,
    workflowActive,
    workflowPending,
    tenders: filter(TENDERS),
    registrations: filter(VENDOR_REGISTRATIONS),
    pendingApprovals: filter(PENDING_APPROVALS),
    paymentDelays: filter(PAYMENT_DELAYS),
    workQueue: filteredQueue,
    slaThreads: SLA_THREADS,
    vendors: filter(VENDORS),
    totals: getReportsPeriodTotals(),
    actions: getGovDashboardActionCounts(category === 'All' ? 'All' : category),
    districtSpend: typeof DISTRICT_SPEND !== 'undefined' ? DISTRICT_SPEND : []
  };
}

function renderGovReports() {
  const ds = getGovReportDataset();
  const ctx = getAnalyticsContextLabel();
  const openTenders = ds.tenders.filter(t => t.status === 'Open').length;
  const evalTenders = ds.tenders.filter(t => t.status === 'Evaluation').length;
  const pendingKyc = ds.registrations.filter(r => r.kyc === 'Pending' || r.kyc === 'In Review').length;
  const openSla = ds.slaThreads.filter(t => t.status !== 'Resolved').length;
  const unreadAlerts = ds.workQueue.filter(w => w.unread).length;
  const avgVendorScore = ds.vendors.length
    ? Math.round(ds.vendors.reduce((s, v) => s + v.overall, 0) / ds.vendors.length * 10) / 10
    : 0;

  return `<div class="gov-reports vendor-reports">
    <div class="report-toolbar">
      <div>
        <p class="report-toolbar-lead">Resource Manager analytics · <strong>${ds.category === 'All' ? 'All categories' : ds.category}</strong></p>
        <p class="report-toolbar-meta">Generated ${formatDateDMY(APP_TODAY)} · ${ctx} · DoPHFW, GoMP</p>
      </div>
      <div class="report-toolbar-actions">
        <button type="button" class="btn btn-outline" onclick="downloadGovReportPack('excel')"><i class="fa-solid fa-file-excel"></i> Excel Pack</button>
        <button type="button" class="btn btn-primary" onclick="downloadGovReportPack('pdf')"><i class="fa-solid fa-file-pdf"></i> PDF Pack</button>
      </div>
    </div>

    ${renderAnalyticsFilterBar({ showCompare: false })}

    <div class="report-insight-strip">
      <div class="report-insight-card">
        <span class="report-insight-label">Procurement spend</span>
        <strong id="reportSpendTotal">₹${ds.totals.spendTotal} Cr</strong>
        <p>Total value of POs &amp; contracts in the selected period</p>
      </div>
      <div class="report-insight-card report-insight-card--green">
        <span class="report-insight-label">Savings realized</span>
        <strong id="reportSaveTotal">₹${ds.totals.saveTotal} Cr</strong>
        <p>Budgeted cost minus actual contract value</p>
      </div>
      <div class="report-insight-card">
        <span class="report-insight-label">Action items</span>
        <strong>${ds.actions.sum}</strong>
        <p>Open tenders + pending approvals + payment delays</p>
      </div>
      <div class="report-insight-card report-insight-card--muted">
        <span class="report-insight-label">Active filter</span>
        <strong id="reportContextLabel" class="report-insight-filter">${ctx}</strong>
        <p>Period applies to spend &amp; savings charts below</p>
      </div>
    </div>

    <div class="kpi-grid kpi-grid--vendor mb-2">
      <div class="kpi-card blue"><div class="kpi-label">Lifecycle Progress</div><div class="kpi-value">${ds.workflowDone}/13</div><div class="kpi-change">Stages completed</div></div>
      <div class="kpi-card teal"><div class="kpi-label">Open Tenders</div><div class="kpi-value">${openTenders}</div><div class="kpi-change">Under eval: ${evalTenders}</div></div>
      <div class="kpi-card orange"><div class="kpi-label">Vendor Onboarding</div><div class="kpi-value">${ds.registrations.length}</div><div class="kpi-change">KYC pending: ${pendingKyc}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Operations</div><div class="kpi-value">${unreadAlerts}</div><div class="kpi-change">Unread alerts · SLA open: ${openSla}</div></div>
    </div>

    <!-- Report 01: Procurement Lifecycle & Financial Analytics -->
    <section class="report-section" id="reportGovLifecycle">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 01</span>
          <h3>Procurement Lifecycle &amp; Financial Analytics</h3>
          <p>Combines Analytics Dashboard and Need Identification to Pay — spend, savings, workflow stage status, and district-wise outlay.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('lifecycle','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('lifecycle','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fa-solid fa-chart-column"></i> Spend Trends (Procurement)</h3>
            <span class="chart-subtitle" data-chart-sub="spend">${getChartSubtitle('spend')}</span>
          </div>
          <p class="chart-help">Unit: <strong>₹ Crore</strong> — money spent through awarded tenders / purchase orders.</p>
          <div class="chart-container"><canvas id="chartSpend"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fa-solid fa-piggy-bank"></i> Savings Realization (₹ Cr)</h3>
            <span class="chart-subtitle" data-chart-sub="savings">${getChartSubtitle('savings')}</span>
          </div>
          <p class="chart-help">Unit: <strong>₹ Crore</strong> — savings vs estimate through rate contracts and L1 competition.</p>
          <div class="chart-container"><canvas id="chartSavings"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3><i class="fa-solid fa-arrows-rotate"></i> Procurement Lifecycle Stage Status</h3></div>
          <p class="chart-help">13-stage Need Identification to Pay workflow — completed, active, and pending stages.</p>
          <div class="chart-container chart-container--tall"><canvas id="chartGovWorkflow"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovWorkflow">
          <thead><tr><th>Stage</th><th>Step</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.workflow.map(s => `<tr>
              <td><strong>${s.id}</strong></td>
              <td>${s.name}</td>
              <td>${s.desc}</td>
              <td><span class="badge badge-${s.status === 'done' ? 'success' : s.status === 'active' ? 'warning' : 'muted'}">${s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Pending'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblDistrictSpend">
          <thead><tr><th>District</th><th>Facility</th><th>Drugs (₹ Cr)</th><th>Equipment</th><th>Services</th><th>Consumables</th><th>Others</th></tr></thead>
          <tbody>
            ${ds.districtSpend.length ? ds.districtSpend.map(d => `<tr>
              <td><strong>${d.district}</strong></td><td>${d.facility}</td>
              <td>${d.drugs}</td><td>${d.equipment}</td><td>${d.services}</td><td>${d.consumables}</td><td>${d.others}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Savings rate for selected period: <strong id="reportSaveRate">${ds.totals.rate}%</strong> · Workflow: <strong>${ds.workflowActive}</strong> active, <strong>${ds.workflowPending}</strong> pending</p>
    </section>

    <!-- Report 02: Vendor Onboarding & Sourcing -->
    <section class="report-section" id="reportGovSourcing">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 02</span>
          <h3>Vendor Onboarding &amp; Sourcing Pipeline</h3>
          <p>Combines Vendor Registration and Sourcing &amp; Award — KYC queue, tender pipeline, pending sanctions, and payment delays.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('sourcing','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('sourcing','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header"><h3>Tender Pipeline by Status</h3></div>
          <div class="chart-container"><canvas id="chartGovTenderPipeline"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><h3>Pending Approvals by Stage</h3></div>
          <div class="chart-container"><canvas id="chartGovApprovalStages"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3>Payment Delays by Days Overdue</h3></div>
          <div class="chart-container chart-container--tall"><canvas id="chartGovPaymentDelays"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovRegistrations">
          <thead><tr><th>Registration ID</th><th>Vendor</th><th>Category</th><th>KYC</th><th>Documents</th><th>Submitted</th></tr></thead>
          <tbody>
            ${ds.registrations.length ? ds.registrations.map(r => `<tr>
              <td><strong>${r.id}</strong></td><td>${r.name}</td><td>${r.category}</td>
              <td><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></td>
              <td>${r.documents}</td><td>${formatDateDMY(r.submitted)}</td>
            </tr>`).join('') : emptyTableRow(6)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovTenders">
          <thead><tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.tenders.length ? ds.tenders.map(t => `<tr>
              <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${t.value}</td>
              <td>${t.bids}</td><td>${formatDateDMY(t.deadline)}</td>
              <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovApprovals">
          <thead><tr><th>PR ID</th><th>Title</th><th>Category</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
          <tbody>
            ${ds.pendingApprovals.length ? ds.pendingApprovals.map(a => `<tr>
              <td><strong>${a.id}</strong></td><td>${a.title}</td><td>${a.category}</td><td>${a.stage}</td>
              <td>${a.amount}</td><td>${a.age}</td><td>${a.owner}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovPaymentDelays">
          <thead><tr><th>Invoice</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Days Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
          <tbody>
            ${ds.paymentDelays.length ? ds.paymentDelays.map(p => `<tr>
              <td><strong>${p.id}</strong></td><td>${p.vendor}</td><td>${p.category}</td><td>${p.amount}</td>
              <td><span class="badge badge-danger">${p.daysOverdue} days</span></td><td>${p.reason}</td><td>${p.contractId}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Sourcing action queue: <strong>${ds.actions.open}</strong> open tenders · <strong>${ds.actions.pending}</strong> pending approvals · <strong>${ds.actions.delays}</strong> payment delays</p>
    </section>

    <!-- Report 03: Operations & Performance -->
    <section class="report-section" id="reportGovOperations">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 03</span>
          <h3>Operations, SLA &amp; Vendor Performance</h3>
          <p>Combines Alerts &amp; Work Queue, SLA Communication, and Vendor Performance Matrix — escalations, alerts, and vendor scorecard.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('operations','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('operations','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header"><h3>Work Queue by Category</h3></div>
          <div class="chart-container"><canvas id="chartGovWorkQueue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><h3>SLA Thread Status</h3></div>
          <div class="chart-container"><canvas id="chartGovSlaStatus"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3>Vendor Performance Score Comparison</h3></div>
          <p class="chart-help">Weighted overall score (0–100) across registered vendors in the selected category filter.</p>
          <div class="chart-container chart-container--tall"><canvas id="chartGovVendorScores"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovWorkQueue">
          <thead><tr><th>Alert</th><th>Category</th><th>Severity</th><th>Owner</th><th>Timeline</th><th>Detail</th></tr></thead>
          <tbody>
            ${ds.workQueue.length ? ds.workQueue.map(w => `<tr>
              <td><strong>${w.title}</strong></td><td>${w.category}</td>
              <td><span class="badge badge-${w.severity === 'high' ? 'danger' : w.severity === 'medium' ? 'warning' : 'info'}">${w.severity}</span></td>
              <td>${w.owner}</td><td>${w.timeline}</td><td>${w.detail}</td>
            </tr>`).join('') : emptyTableRow(6)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovSlaThreads">
          <thead><tr><th>Thread ID</th><th>Subject</th><th>Contract</th><th>Level</th><th>Priority</th><th>Status</th><th>Last Update</th></tr></thead>
          <tbody>
            ${ds.slaThreads.map(t => `<tr>
              <td><strong>${t.id}</strong></td><td>${t.subject}</td><td>${t.contractId}</td>
              <td>L${t.level}</td>
              <td><span class="badge badge-${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'info'}">${t.priority}</span></td>
              <td><span class="badge badge-${t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'danger' : 'warning'}">${t.status}</span></td>
              <td>${t.lastUpdate}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovVendors">
          <thead><tr><th>Vendor ID</th><th>Name</th><th>Category</th>${PERF_METRICS.map(m => `<th>${m.label}</th>`).join('')}<th>Overall</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.vendors.length ? ds.vendors.map(v => `<tr>
              <td><strong>${v.id}</strong></td><td>${v.name}</td><td>${v.category}</td>
              ${PERF_METRICS.map(m => `<td>${v[m.key] ?? '—'}</td>`).join('')}
              <td><strong>${v.overall}</strong></td>
              <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
            </tr>`).join('') : emptyTableRow(3 + PERF_METRICS.length + 2)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Average vendor score in filter: <strong>${avgVendorScore}</strong> · Open SLA threads: <strong>${openSla}</strong> · Unread alerts: <strong>${unreadAlerts}</strong></p>
    </section>
  </div>`;
}

function getVendorReportDataset(category = currentCategory) {
  const tenders = category === 'All' ? TENDERS : TENDERS.filter(t => t.category === category);
  const bids = category === 'All' ? BIDS : BIDS.filter(b => b.category === category);
  const clarifications = category === 'All' ? CLARIFICATIONS : CLARIFICATIONS.filter(c => c.category === category);
  const contracts = category === 'All' ? CONTRACTS : CONTRACTS.filter(c => c.category === category);
  const deliveries = category === 'All' ? DELIVERIES : DELIVERIES.filter(d => d.category === category);
  const vendor = VENDORS[0];

  const stageProgress = [
    { stage: 1, name: 'Registration', status: vendorStageState.completed[1] ? 'Completed' : 'Pending' },
    { stage: 2, name: 'KYC Verification', status: vendorStageState.completed[2] ? 'Completed' : 'Pending' },
    { stage: 3, name: 'Vendor Approval', status: vendorStageState.completed[3] ? 'Completed' : 'Pending' },
    { stage: 4, name: 'Bid Submitted', status: vendorStageState.completed[4] ? 'Completed' : 'In Progress' },
    { stage: 5, name: 'Award Notification', status: vendorStageState.completed[5] ? 'Completed' : 'Upcoming' },
    { stage: 6, name: 'Contract Execution', status: vendorStageState.completed[6] ? 'Completed' : 'Upcoming' },
    { stage: 7, name: 'Delivery', status: vendorStageState.completed[7] ? 'Completed' : 'Upcoming' },
    { stage: 8, name: 'Invoice Submission', status: vendorStageState.completed[8] ? 'Completed' : 'Upcoming' },
    { stage: 9, name: 'Payment Tracking', status: vendorStageState.completed[9] ? 'Completed' : 'Upcoming' },
    { stage: 10, name: 'Renewal', status: vendorStageState.completed[10] ? 'Completed' : (vendorStageState.completed[9] || isVendorStageActionComplete(10) ? 'In Progress' : 'Upcoming') }
  ];

  return { tenders, bids, clarifications, contracts, deliveries, vendor, stageProgress, category };
}

function renderVendorReports() {
  const ds = getVendorReportDataset();
  const openTenders = ds.tenders.filter(t => t.status === 'Open').length;
  const submittedBids = ds.bids.filter(b => b.status !== 'Draft').length;
  const draftBids = ds.bids.filter(b => b.status === 'Draft').length;
  const activeContracts = ds.contracts.length;
  const paidDeliveries = ds.deliveries.filter(d => d.payment === 'Paid').length;
  const completedStages = ds.stageProgress.filter(s => s.status === 'Completed').length;

  return `<div class="vendor-reports">
    <div class="report-toolbar">
      <div>
        <p class="report-toolbar-lead">Vendor analytics for <strong>${ds.vendor?.name || 'MediSupply India Pvt Ltd'}</strong> · ${ds.category === 'All' ? 'All categories' : ds.category}</p>
        <p class="report-toolbar-meta">Generated ${formatDateDMY(APP_TODAY)} · VND-MP-000123</p>
      </div>
    </div>

    <div class="kpi-grid kpi-grid--vendor mb-2">
      <div class="kpi-card blue" role="button" tabindex="0" onclick="openVendorReportKpiDetail('tenders')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorReportKpiDetail('tenders')}" title="View tender details">
        <div class="kpi-label">Tenders Visible</div>
        <div class="kpi-value">${ds.tenders.length}</div>
        <div class="kpi-change">Open: ${openTenders}</div>
      </div>
      <div class="kpi-card teal" role="button" tabindex="0" onclick="openVendorReportKpiDetail('bids')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorReportKpiDetail('bids')}" title="View bid details">
        <div class="kpi-label">Bids Submitted</div>
        <div class="kpi-value">${submittedBids}</div>
        <div class="kpi-change">Draft: ${draftBids}</div>
      </div>
      <div class="kpi-card orange" role="button" tabindex="0" onclick="openVendorReportKpiDetail('contracts')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorReportKpiDetail('contracts')}" title="View contract details">
        <div class="kpi-label">Active Contracts</div>
        <div class="kpi-value">${activeContracts}</div>
        <div class="kpi-change">Deliveries: ${ds.deliveries.length}</div>
      </div>
      <div class="kpi-card green" role="button" tabindex="0" onclick="openVendorReportKpiDetail('lifecycle')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorReportKpiDetail('lifecycle')}" title="View lifecycle progress">
        <div class="kpi-label">Lifecycle Progress</div>
        <div class="kpi-value">${completedStages}/10</div>
        <div class="kpi-change up">Stages completed</div>
      </div>
    </div>

    <!-- Report 1: Bid Participation -->
    <section class="report-section" id="reportBidParticipation">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 01</span>
          <h3>Bid Participation &amp; Clarifications</h3>
          <p>Combines Tender Discovery, Bid Submission, and Clarifications across your bidder lifecycle.</p>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Tender Pipeline by Status</h3>
            ${vendorWidgetDownloadBtns('tender-pipeline')}
          </div>
          <p class="chart-help">Click a bar to view tenders in that status.</p>
          <div class="chart-container"><canvas id="chartVendorTenderStatus"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Bid Status Mix</h3>
            ${vendorWidgetDownloadBtns('bid-mix')}
          </div>
          <p class="chart-help">Click a segment to view bids in that status.</p>
          <div class="chart-container"><canvas id="chartVendorBidMix"></canvas></div>
        </div>
      </div>
      <div class="report-table-block">
        <div class="table-header">
          <h3>Bid submissions</h3>
          ${vendorWidgetDownloadBtns('bids')}
        </div>
        <div class="data-table-wrap report-table-wrap">
          <table class="data-table" id="tblBidParticipation">
            <thead>
              <tr><th>Tender</th><th>Category</th><th>Technical</th><th>Financial</th><th>EMD</th><th>Deadline</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${ds.bids.length ? ds.bids.map(b => `<tr>
                <td><strong>${b.tenderId}</strong></td>
                <td>${b.category}</td>
                <td>${b.technical}</td>
                <td>${b.financial}</td>
                <td>${b.emd}</td>
                <td>${formatDateDMY(b.deadline)}</td>
                <td><span class="badge badge-${b.status === 'Draft' ? 'warning' : 'info'}">${b.status}</span></td>
              </tr>`).join('') : emptyTableRow(7)}
            </tbody>
          </table>
        </div>
      </div>
      <div class="report-table-block">
        <div class="table-header">
          <h3>Clarification queries</h3>
          ${vendorWidgetDownloadBtns('clarifications')}
        </div>
        <div class="data-table-wrap report-table-wrap">
          <table class="data-table" id="tblClarifications">
            <thead><tr><th>Query ID</th><th>Tender</th><th>Category</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              ${ds.clarifications.length ? ds.clarifications.map(c => `<tr>
                <td>${c.id}</td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.subject}</td>
                <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${c.status}</span></td>
              </tr>`).join('') : emptyTableRow(5)}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Report 2: Execution -->
    <section class="report-section" id="reportExecution">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 02</span>
          <h3>Contract Execution &amp; Delivery Performance</h3>
          <p>Combines Contracts &amp; POs, Delivery &amp; Invoices, and payment outcomes.</p>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card full">
          <div class="chart-header">
            <h3>Delivery &amp; Payment Outcomes</h3>
            ${vendorWidgetDownloadBtns('delivery-pay')}
          </div>
          <div class="chart-container"><canvas id="chartVendorDeliveryPay"></canvas></div>
        </div>
      </div>
      <div class="report-table-block">
        <div class="table-header">
          <h3>Contracts &amp; POs</h3>
          ${vendorWidgetDownloadBtns('contracts')}
        </div>
        <div class="data-table-wrap report-table-wrap">
          <table class="data-table" id="tblContracts">
            <thead><tr><th>Contract ID</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th></tr></thead>
            <tbody>
              ${ds.contracts.length ? ds.contracts.map(c => `<tr>
                <td><strong>${c.id}</strong></td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.value}</td>
                <td>${c.pbg}</td><td>${c.delivery}</td>
                <td><span class="badge badge-${c.status === 'In Progress' ? 'warning' : 'success'}">${c.status}</span></td>
              </tr>`).join('') : emptyTableRow(7)}
            </tbody>
          </table>
        </div>
      </div>
      <div class="report-table-block">
        <div class="table-header">
          <h3>Deliveries &amp; invoices</h3>
          ${vendorWidgetDownloadBtns('deliveries')}
        </div>
        <div class="data-table-wrap report-table-wrap">
          <table class="data-table" id="tblDeliveries">
            <thead><tr><th>Delivery Challan ID</th><th>PO</th><th>Category</th><th>Items</th><th>GRN</th><th>Invoice</th><th>Payment</th></tr></thead>
            <tbody>
              ${ds.deliveries.length ? ds.deliveries.map(d => `<tr>
                <td><strong>${d.id}</strong></td><td>${d.po}</td><td>${d.category}</td><td>${d.items}</td>
                <td>${d.grn}</td><td>${d.invoice}</td><td>${d.payment}</td>
              </tr>`).join('') : emptyTableRow(7)}
            </tbody>
          </table>
        </div>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Paid deliveries in filter: <strong>${paidDeliveries}</strong> · Overall vendor score: <strong>${ds.vendor?.overall || 90.1}</strong></p>
    </section>
  </div>`;
}

/** Pagination state for My Reports detail modals */
let vendorReportDetailPage = 1;
let vendorReportDetailCtx = { type: 'kpi', key: 'tenders', filter: null, category: 'all' };

function openVendorReportKpiDetail(kind) {
  vendorReportDetailPage = 1;
  vendorReportDetailCtx = { type: 'kpi', key: kind, filter: null, category: 'all' };
  renderVendorReportDetailModal();
}

function openVendorReportChartDetail(chartKey, status) {
  if (!status || status === 'No bids') return;
  vendorReportDetailPage = 1;
  vendorReportDetailCtx = { type: 'chart', key: chartKey, filter: status, category: 'all' };
  renderVendorReportDetailModal();
}

function setVendorReportDetailPage(page) {
  vendorReportDetailPage = Math.max(1, Number(page) || 1);
  renderVendorReportDetailModal(true);
}

function setVendorReportDetailCategory(label) {
  vendorReportDetailCtx.category = (!label || label === 'All categories') ? 'all' : label;
  vendorReportDetailPage = 1;
  renderVendorReportDetailModal(true);
}

function bindVendorReportDetailCategorySelect() {
  const wrap = document.querySelector('#modalBody .custom-select[data-select-id="vendorReportDetailCategory"]');
  if (!wrap || wrap.dataset.reportCatBound) return;
  wrap.dataset.reportCatBound = '1';
  wrap.addEventListener('change', () => {
    const label = typeof getCustomSelectValue === 'function'
      ? getCustomSelectValue('vendorReportDetailCategory')
      : '';
    setVendorReportDetailCategory(label);
  });
}

function getVendorReportDetailCategoryOptions(list) {
  const cats = [...new Set((list || []).map(r => r.category).filter(Boolean))];
  const fixed = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  const merged = [...new Set([...fixed, ...cats])];
  return ['All categories', ...merged];
}

function applyVendorReportDetailCategory(list) {
  const cat = vendorReportDetailCtx.category;
  if (!cat || cat === 'all') return list || [];
  return (list || []).filter(r => r.category === cat);
}

function renderVendorReportDetailCategoryFilter(sourceList) {
  const options = getVendorReportDetailCategoryOptions(sourceList);
  const selected = vendorReportDetailCtx.category === 'all'
    ? 'All categories'
    : vendorReportDetailCtx.category;
  return `<div class="vendor-report-detail-filter" title="Filter by category">
    <span class="vendor-report-detail-filter-label">Category</span>
    ${inlineCustomSelectHTML('vendorReportDetailCategory', options, selected)}
  </div>`;
}

function renderVendorReportDetailModal(replace = false) {
  const ds = getVendorReportDataset();
  const { type, key, filter } = vendorReportDetailCtx;
  let title = 'Details';
  let lead = '';
  let thead = '';
  let rows = [];
  let colCount = 1;
  let sourceForCategory = [];
  let showCategoryFilter = false;

  if (key === 'tenders' || (type === 'chart' && key === 'tender')) {
    sourceForCategory = ds.tenders;
    showCategoryFilter = true;
    let list = filter ? ds.tenders.filter(t => t.status === filter) : ds.tenders.slice();
    list = applyVendorReportDetailCategory(list);
    title = filter ? `Tenders — ${filter}` : 'Tenders Visible';
    lead = `${list.length} tender(s)${vendorReportDetailCtx.category !== 'all' ? ` in ${vendorReportDetailCtx.category}` : (ds.category !== 'All' ? ` in ${ds.category}` : '')}. Click a row for tender discovery details.`;
    thead = '<tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr>';
    colCount = 7;
    rows = list.map(t => ({
      id: t.id,
      html: `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openTenderDetail('${t.id}')">
        <td class="cell-id"><strong>${escapeHtmlLite(t.id)}</strong></td>
        <td class="cell-title">${escapeHtmlLite(t.title || '—')}</td>
        <td>${escapeHtmlLite(t.category || '—')}</td>
        <td class="cell-nowrap">${escapeHtmlLite(t.value || '—')}</td>
        <td>${t.bids ?? '—'}</td>
        <td class="cell-date">${formatDateDMY(t.deadline)}</td>
        <td class="cell-status"><span class="badge badge-${tenderBadgeClass(t.status)}">${escapeHtmlLite(t.status || '—')}</span></td>
      </tr>`
    }));
  } else if (key === 'bids' || (type === 'chart' && key === 'bid')) {
    sourceForCategory = ds.bids;
    showCategoryFilter = true;
    let list = filter ? ds.bids.filter(b => b.status === filter) : ds.bids.slice();
    list = applyVendorReportDetailCategory(list);
    title = filter ? `Bids — ${filter}` : 'Bid submissions';
    lead = filter
      ? `${list.length} bid(s) with status “${filter}”. Click a row for bid details.`
      : `${list.filter(b => b.status !== 'Draft').length} submitted · ${list.filter(b => b.status === 'Draft').length} draft. Click a row for bid details.`;
    thead = '<tr><th>Tender</th><th>Category</th><th>Technical</th><th>Financial</th><th>EMD</th><th>Deadline</th><th>Status</th></tr>';
    colCount = 7;
    rows = list.map(b => {
      const tid = escapeHtmlLite(b.tenderId);
      return {
        id: b.tenderId,
        html: `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openBidDetail('${tid}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openBidDetail('${tid}')}" title="View bid details">
        <td class="cell-id"><strong>${tid}</strong></td>
        <td>${escapeHtmlLite(b.category || '—')}</td>
        <td>${escapeHtmlLite(b.technical || '—')}</td>
        <td>${escapeHtmlLite(b.financial || '—')}</td>
        <td>${escapeHtmlLite(b.emd || '—')}</td>
        <td class="cell-date">${formatDateDMY(b.deadline)}</td>
        <td class="cell-status"><span class="badge badge-${b.status === 'Draft' ? 'warning' : b.status === 'Awarded' ? 'success' : 'info'}">${escapeHtmlLite(b.status || '—')}</span></td>
      </tr>`
      };
    });
  } else if (key === 'contracts') {
    sourceForCategory = ds.contracts;
    showCategoryFilter = true;
    const list = applyVendorReportDetailCategory(ds.contracts);
    const deliveryCount = applyVendorReportDetailCategory(ds.deliveries).length;
    title = 'Active Contracts & Deliveries';
    lead = `${list.length} contract(s) · ${deliveryCount} delivery record(s)${vendorReportDetailCtx.category !== 'all' ? ` in ${vendorReportDetailCtx.category}` : ''}. Click a row for contract details.`;
    thead = '<tr><th>Contract</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th><th>Date</th></tr>';
    colCount = 8;
    rows = list.map(c => ({
      id: c.id,
      html: `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openContractsPoDetail('${escapeHtmlLite(c.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openContractsPoDetail('${escapeHtmlLite(c.id)}')}" title="View contract details">
        <td class="cell-id"><strong>${escapeHtmlLite(c.id)}</strong></td>
        <td class="cell-title">${escapeHtmlLite(c.tenderId || '—')}${c.title ? `<div class="table-sub">${escapeHtmlLite(c.title)}</div>` : ''}</td>
        <td>${escapeHtmlLite(c.category || '—')}</td>
        <td class="cell-nowrap">${escapeHtmlLite(c.value || '—')}</td>
        <td><span class="badge badge-${contractPbgBadge(c.pbg)}">${escapeHtmlLite(c.pbg || '—')}</span></td>
        <td>${escapeHtmlLite(c.delivery || '—')}</td>
        <td class="cell-status"><span class="badge badge-${contractStatusBadge(c.status)}">${escapeHtmlLite(c.status || '—')}</span></td>
        <td class="cell-date">${escapeHtmlLite(c.date || '—')}</td>
      </tr>`
    }));
  } else if (key === 'lifecycle') {
    title = 'Lifecycle Progress';
    lead = 'Bid-to-Pay stage completion for your vendor account.';
    thead = '<tr><th>Stage</th><th>Name</th><th>Status</th></tr>';
    colCount = 3;
    rows = ds.stageProgress.map(s => ({
      id: String(s.stage),
      html: `<tr>
        <td><strong>${s.stage}</strong></td><td>${escapeHtmlLite(s.name)}</td>
        <td class="cell-status"><span class="badge badge-${s.status === 'Completed' ? 'success' : s.status === 'In Progress' ? 'info' : 'muted'}">${escapeHtmlLite(s.status)}</span></td>
      </tr>`
    }));
  } else {
    return;
  }

  const paged = paginateItems(rows, vendorReportDetailPage, 10);
  vendorReportDetailPage = paged.page;

  openModal(title, `<div class="kpi-detail need-row-detail vendor-report-detail-modal">
    <div class="vendor-report-detail-table" style="margin-bottom:0.75rem">
      <div class="vendor-report-detail-bar">
        <p class="vendor-report-detail-bar-lead">${lead}</p>
        ${showCategoryFilter ? renderVendorReportDetailCategoryFilter(sourceForCategory) : ''}
      </div>
      <div class="data-table-wrap kpi-detail-table kpi-detail-table--scroll">
        <table class="data-table data-table--modal data-table--vendor-report">
          <thead>${thead}</thead>
          <tbody>
            ${paged.items.length
              ? paged.items.map(r => r.html).join('')
              : `<tr><td colspan="${colCount}" style="text-align:center;color:#64748b;padding:1.25rem">No records for this selection.</td></tr>`}
          </tbody>
        </table>
        ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorReportDetailPage', { hideInfo: true }) : ''}
      </div>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true, extraWide: true, replace: !!replace });
  bindVendorReportDetailCategorySelect();
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(r => r.map(csvEscape).join(','))
  ];
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function vendorWidgetDownloadBtns(widgetId) {
  return `<div class="report-widget-actions">
    <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorWidget('${widgetId}','excel')" title="Download Excel"><i class="fa-solid fa-file-excel"></i> Excel</button>
    <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorWidget('${widgetId}','pdf')" title="Download PDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
  </div>`;
}

function countByField(items, getter) {
  const map = {};
  (items || []).forEach(item => {
    const key = getter(item) || '—';
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function buildVendorWidgetSheet(widgetId) {
  const ds = getVendorReportDataset();
  const vendorName = ds.vendor?.name || 'MediSupply India Pvt Ltd';

  if (widgetId === 'tender-pipeline') {
    const byStatus = countByField(ds.tenders, t => t.status);
    const labels = Object.keys(byStatus);
    return {
      id: widgetId,
      title: 'Tender Pipeline by Status',
      fileSlug: 'Tender_Pipeline',
      headers: ['Status', 'Count'],
      rows: labels.length ? labels.map(l => [l, byStatus[l]]) : [],
      detailHeaders: ['Tender ID', 'Title', 'Category', 'Value', 'Bids', 'Deadline', 'Status'],
      detailRows: ds.tenders.map(t => [t.id, t.title, t.category, t.value, t.bids ?? '', formatDateDMY(t.deadline), t.status]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'bid-mix') {
    const byStatus = countByField(ds.bids, b => b.status);
    const labels = Object.keys(byStatus);
    return {
      id: widgetId,
      title: 'Bid Status Mix',
      fileSlug: 'Bid_Status_Mix',
      headers: ['Status', 'Count'],
      rows: labels.length ? labels.map(l => [l, byStatus[l]]) : [],
      detailHeaders: ['Tender', 'Category', 'Technical', 'Financial', 'EMD', 'Deadline', 'Status'],
      detailRows: ds.bids.map(b => [b.tenderId, b.category, b.technical, b.financial, b.emd, formatDateDMY(b.deadline), b.status]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'bids') {
    return {
      id: widgetId,
      title: 'Bid submissions',
      fileSlug: 'Bid_Submissions',
      headers: ['Tender', 'Category', 'Technical', 'Financial', 'EMD', 'Deadline', 'Status'],
      rows: ds.bids.map(b => [b.tenderId, b.category, b.technical, b.financial, b.emd, formatDateDMY(b.deadline), b.status]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'clarifications') {
    return {
      id: widgetId,
      title: 'Clarification queries',
      fileSlug: 'Clarification_Queries',
      headers: ['Query ID', 'Tender', 'Category', 'Subject', 'Status'],
      rows: ds.clarifications.map(c => [c.id, c.tenderId, c.category, c.subject, c.status]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'delivery-pay') {
    const deliveries = ds.deliveries;
    const rows = [
      ['GRN Accepted', deliveries.filter(d => d.grn === 'Accepted').length],
      ['GRN Pending', deliveries.filter(d => d.grn !== 'Accepted').length],
      ['Payment Paid', deliveries.filter(d => d.payment === 'Paid').length],
      ['Payment Processing', deliveries.filter(d => d.payment === 'Processing').length],
      ['Payment Pending', deliveries.filter(d => d.payment === '—' || !d.payment || (d.payment !== 'Paid' && d.payment !== 'Processing')).length]
    ];
    return {
      id: widgetId,
      title: 'Delivery & Payment Outcomes',
      fileSlug: 'Delivery_Payment_Outcomes',
      headers: ['Metric', 'Count'],
      rows,
      detailHeaders: ['Delivery Challan ID', 'PO', 'Category', 'Items', 'GRN', 'Invoice', 'Payment'],
      detailRows: deliveries.map(d => [d.id, d.po, d.category, d.items, d.grn, d.invoice, d.payment]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'contracts') {
    return {
      id: widgetId,
      title: 'Contracts & POs',
      fileSlug: 'Contracts_POs',
      headers: ['Contract ID', 'Tender', 'Category', 'Value', 'PBG', 'Delivery', 'Status'],
      rows: ds.contracts.map(c => [c.id, c.tenderId, c.category, c.value, c.pbg, c.delivery, c.status]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  if (widgetId === 'deliveries') {
    return {
      id: widgetId,
      title: 'Deliveries & invoices',
      fileSlug: 'Deliveries_Invoices',
      headers: ['Delivery Challan ID', 'PO', 'Category', 'Items', 'GRN', 'Invoice', 'Payment'],
      rows: ds.deliveries.map(d => [d.id, d.po, d.category, d.items, d.grn, d.invoice, d.payment]),
      meta: `${vendorName} · Category: ${ds.category}`
    };
  }
  return buildVendorWidgetSheet('bids');
}

function buildVendorReportTables(kind) {
  if (kind === 'bid') {
    return {
      title: 'Bid Participation & Clarifications',
      sheets: [
        buildVendorWidgetSheet('tender-pipeline'),
        buildVendorWidgetSheet('bid-mix'),
        buildVendorWidgetSheet('bids'),
        buildVendorWidgetSheet('clarifications')
      ].map(s => ({ name: s.fileSlug, headers: s.headers, rows: s.rows, title: s.title }))
    };
  }
  if (kind === 'execution') {
    return {
      title: 'Contract Execution & Delivery Performance',
      sheets: [
        buildVendorWidgetSheet('delivery-pay'),
        buildVendorWidgetSheet('contracts'),
        buildVendorWidgetSheet('deliveries')
      ].map(s => ({ name: s.fileSlug, headers: s.headers, rows: s.rows, title: s.title }))
    };
  }
  return buildVendorReportTables('bid');
}

function vendorSheetToPdfLines(sheet) {
  const lines = [
    'MP Health Procurement',
    sheet.title,
    sheet.meta || '',
    `Generated: ${formatDateDMY(APP_TODAY)}`,
    '',
    sheet.headers.join(' | ')
  ];
  if (!sheet.rows.length) {
    lines.push('(No records)');
  } else {
    sheet.rows.forEach(r => lines.push(r.map(c => String(c ?? '')).join(' | ')));
  }
  if (sheet.detailHeaders && sheet.detailRows?.length) {
    lines.push('');
    lines.push('Underlying records');
    lines.push(sheet.detailHeaders.join(' | '));
    sheet.detailRows.forEach(r => lines.push(r.map(c => String(c ?? '')).join(' | ')));
  }
  return lines.filter((l, i) => !(i > 0 && l === '' && lines[i - 1] === ''));
}

function performVendorWidgetDownload(widgetId, format) {
  const sheet = buildVendorWidgetSheet(widgetId);
  const stamp = APP_TODAY.replace(/-/g, '');
  const base = `MPHP_${sheet.fileSlug}_${stamp}`;
  if (format === 'excel') {
    downloadCsv(`${base}.csv`, sheet.headers, sheet.rows);
    if (sheet.detailHeaders && sheet.detailRows?.length) {
      setTimeout(() => {
        downloadCsv(`${base}_details.csv`, sheet.detailHeaders, sheet.detailRows);
      }, 220);
    }
    return;
  }
  downloadBlobFile(buildSimplePdfBlob(vendorSheetToPdfLines(sheet)), `${base}.pdf`);
}

function downloadVendorWidget(widgetId, format) {
  const sheet = buildVendorWidgetSheet(widgetId);
  confirmDocumentDownload({
    title: 'Confirm download',
    docLabel: sheet.title,
    formatLabel: format === 'excel' ? 'Excel (CSV)' : 'PDF',
    fileHint: format === 'excel'
      ? (sheet.detailRows?.length
        ? `Summary + ${sheet.detailRows.length} detail row(s) as CSV`
        : `${sheet.rows.length} row(s) as Excel-compatible CSV`)
      : `PDF with ${sheet.title} data only`,
    execute: () => performVendorWidgetDownload(widgetId, format)
  });
}

function performVendorReportDownload(kind, format) {
  const pack = buildVendorReportTables(kind);
  const stamp = APP_TODAY.replace(/-/g, '');
  if (format === 'excel') {
    pack.sheets.forEach((sheet, i) => {
      setTimeout(() => {
        downloadCsv(`MPHP_${kind}_${sheet.name}_${stamp}.csv`, sheet.headers, sheet.rows);
      }, i * 200);
    });
    return;
  }
  const lines = [
    'MP Health Procurement',
    pack.title,
    `Generated: ${formatDateDMY(APP_TODAY)}`,
    ''
  ];
  pack.sheets.forEach(sheet => {
    lines.push(sheet.title || sheet.name);
    lines.push(sheet.headers.join(' | '));
    if (!sheet.rows.length) lines.push('(No records)');
    else sheet.rows.forEach(r => lines.push(r.map(c => String(c ?? '')).join(' | ')));
    lines.push('');
  });
  downloadBlobFile(buildSimplePdfBlob(lines), `MPHP_${kind}_pack_${stamp}.pdf`);
}

function downloadVendorReport(kind, format) {
  const pack = buildVendorReportTables(kind);
  confirmDocumentDownload({
    title: 'Confirm report download',
    docLabel: pack.title,
    formatLabel: format === 'excel' ? 'Excel (CSV)' : 'PDF',
    fileHint: format === 'excel'
      ? `${pack.sheets.length} sheet(s) as Excel-compatible CSV`
      : 'PDF report with this section data only',
    execute: () => performVendorReportDownload(kind, format)
  });
}

function downloadVendorReportPack(format) {
  confirmDocumentDownload({
    title: 'Confirm report pack download',
    docLabel: 'Vendor analytics pack (Bid + Execution)',
    formatLabel: format === 'excel' ? 'Excel (CSV)' : 'PDF',
    fileHint: 'Includes Bid Participation and Contract Execution widgets',
    execute: () => {
      ['bid', 'execution'].forEach((kind, i) => {
        setTimeout(() => performVendorReportDownload(kind, format), i * (format === 'excel' ? 500 : 350));
      });
    }
  });
}

function buildGovReportTables(kind) {
  const ds = getGovReportDataset();
  if (kind === 'lifecycle') {
    return {
      title: 'Procurement Lifecycle & Financial Analytics',
      sheets: [
        {
          name: 'Workflow_Stages',
          headers: ['Stage', 'Step', 'Description', 'Status'],
          rows: ds.workflow.map(s => [s.id, s.name, s.desc, s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Pending'])
        },
        {
          name: 'District_Spend',
          headers: ['District', 'Facility', 'Drugs (Cr)', 'Equipment', 'Services', 'Consumables', 'Others'],
          rows: ds.districtSpend.map(d => [d.district, d.facility, d.drugs, d.equipment, d.services, d.consumables, d.others])
        }
      ]
    };
  }
  if (kind === 'sourcing') {
    return {
      title: 'Vendor Onboarding & Sourcing Pipeline',
      sheets: [
        {
          name: 'Vendor_Registrations',
          headers: ['Registration ID', 'Vendor', 'Category', 'KYC', 'Documents', 'Submitted'],
          rows: ds.registrations.map(r => [r.id, r.name, r.category, r.kyc, r.documents, formatDateDMY(r.submitted)])
        },
        {
          name: 'Tenders',
          headers: ['Tender ID', 'Title', 'Category', 'Value', 'Bids', 'Deadline', 'Status'],
          rows: ds.tenders.map(t => [t.id, t.title, t.category, t.value, t.bids, formatDateDMY(t.deadline), t.status])
        },
        {
          name: 'Pending_Approvals',
          headers: ['PR ID', 'Title', 'Category', 'Stage', 'Amount', 'Age', 'Owner'],
          rows: ds.pendingApprovals.map(a => [a.id, a.title, a.category, a.stage, a.amount, a.age, a.owner])
        },
        {
          name: 'Payment_Delays',
          headers: ['Invoice', 'Vendor', 'Category', 'Amount', 'Days Overdue', 'Reason', 'Contract'],
          rows: ds.paymentDelays.map(p => [p.id, p.vendor, p.category, p.amount, p.daysOverdue, p.reason, p.contractId])
        }
      ]
    };
  }
  if (kind === 'operations') {
    return {
      title: 'Operations, SLA & Vendor Performance',
      sheets: [
        {
          name: 'Work_Queue',
          headers: ['Alert', 'Category', 'Severity', 'Owner', 'Timeline', 'Detail'],
          rows: ds.workQueue.map(w => [w.title, w.category, w.severity, w.owner, w.timeline, w.detail])
        },
        {
          name: 'SLA_Threads',
          headers: ['Thread ID', 'Subject', 'Contract', 'Level', 'Priority', 'Status', 'Last Update'],
          rows: ds.slaThreads.map(t => [t.id, t.subject, t.contractId, `L${t.level}`, t.priority, t.status, t.lastUpdate])
        },
        {
          name: 'Vendor_Performance',
          headers: ['Vendor ID', 'Name', 'Category', ...PERF_METRICS.map(m => m.label), 'Overall', 'Status'],
          rows: ds.vendors.map(v => [v.id, v.name, v.category, ...PERF_METRICS.map(m => v[m.key]), v.overall, v.status])
        }
      ]
    };
  }
  return buildGovReportTables('lifecycle');
}

function performGovReportDownload(kind, format) {
  const pack = buildGovReportTables(kind);
  const stamp = APP_TODAY.replace(/-/g, '');
  if (format === 'excel') {
    pack.sheets.forEach((sheet, i) => {
      setTimeout(() => {
        downloadCsv(`MPHP_GOV_${kind}_${sheet.name}_${stamp}.csv`, sheet.headers, sheet.rows);
      }, i * 200);
    });
    return;
  }
  openGovReportPdf(pack);
}

function downloadGovReport(kind, format) {
  const pack = buildGovReportTables(kind);
  confirmDocumentDownload({
    title: 'Confirm report download',
    docLabel: pack.title,
    formatLabel: format === 'excel' ? 'Excel (CSV)' : 'PDF',
    fileHint: format === 'excel'
      ? `${pack.sheets.length} sheet(s) as Excel-compatible CSV`
      : 'Printable PDF report window',
    execute: () => performGovReportDownload(kind, format)
  });
}

function downloadGovReportPack(format) {
  confirmDocumentDownload({
    title: 'Confirm report pack download',
    docLabel: 'Government analytics pack (Lifecycle + Sourcing + Operations)',
    formatLabel: format === 'excel' ? 'Excel (CSV)' : 'PDF',
    fileHint: 'Includes all three report sections',
    execute: () => {
      ['lifecycle', 'sourcing', 'operations'].forEach((kind, i) => {
        setTimeout(() => performGovReportDownload(kind, format), i * (format === 'excel' ? 600 : 400));
      });
    }
  });
}

function openGovReportPdf(pack) {
  const ds = getGovReportDataset();
  const tablesHtml = pack.sheets.map(sheet => `
    <h3 style="margin:18px 0 8px;font-size:14px;color:#003D5D">${sheet.name.replace(/_/g, ' ')}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>${sheet.headers.map(h => `<th style="border:1px solid #cbd5e1;background:#f1f5f9;padding:6px 8px;text-align:left">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sheet.rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 8px">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${sheet.headers.length}" style="padding:8px;color:#64748b">No records</td></tr>`}
      </tbody>
    </table>
  `).join('');

  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) {
    showWfAlert('Please allow pop-ups to download the PDF report.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${pack.title}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:24px;margin:0}
      h1{font-size:20px;margin:0 0 4px}
      .meta{color:#64748b;font-size:12px;margin-bottom:16px}
      .actions{margin:16px 0 20px}
      .actions button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#003D5D;color:#fff;cursor:pointer;font-weight:600}
      @media print{.actions{display:none} body{padding:0}}
    </style>
  </head><body>
    <h1>MP Health Procurement — ${pack.title}</h1>
    <div class="meta">Resource Manager · Category: ${ds.category} · Period: ${getAnalyticsContextLabel()} · Generated: ${formatDateDMY(APP_TODAY)}</div>
    <div class="actions"><button onclick="window.print()">Download / Print PDF</button></div>
    ${tablesHtml}
    <script>setTimeout(function(){ window.print(); }, 350);<\/script>
  </body></html>`);
  win.document.close();
}

function openVendorReportPdf(pack) {
  const ds = getVendorReportDataset();
  const stamp = APP_TODAY.replace(/-/g, '');
  const lines = [
    'MP Health Procurement',
    pack.title,
    `Vendor: ${ds.vendor?.name || 'MediSupply India Pvt Ltd'}`,
    `Category: ${ds.category} · Generated: ${formatDateDMY(APP_TODAY)}`,
    ''
  ];
  (pack.sheets || []).forEach(sheet => {
    lines.push(sheet.title || sheet.name);
    lines.push((sheet.headers || []).join(' | '));
    if (!sheet.rows?.length) lines.push('(No records)');
    else sheet.rows.forEach(r => lines.push(r.map(c => String(c ?? '')).join(' | ')));
    lines.push('');
  });
  downloadBlobFile(buildSimplePdfBlob(lines), `MPHP_${(pack.title || 'report').replace(/\s+/g, '_')}_${stamp}.pdf`);
}

function renderSettings() {
  const cfg = getSlaSettings();
  const stageRows = (typeof GOV_WORKFLOW !== 'undefined' ? GOV_WORKFLOW : []).map(s => {
    const d = (cfg.stages && cfg.stages[s.id]) || (typeof SLA_STAGE_DEFAULTS !== 'undefined' ? SLA_STAGE_DEFAULTS[s.id] : {}) || {};
    return `<tr>
      <td><strong>Stage ${s.id}</strong><div class="sla-settings-stage-name">${s.name}</div></td>
      <td><input class="sla-stage-days" data-stage="${s.id}" type="number" min="1" max="365" value="${d.slaDays || 30}"></td>
      <td><input class="sla-stage-warn" data-stage="${s.id}" type="number" min="5" max="50" value="${d.warningPct || 20}"></td>
      <td class="sla-settings-owners">${d.owners || '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="wf-detail settings-page">
    <h3>Branding & Configuration</h3>
    <div class="form-grid mt-2">
      <div class="form-group"><label>Organization Name</label><input type="text" value="MP Health Procurement"></div>
      <div class="form-group"><label>Solution Branding</label><input type="text" value="MP Health Procurement Solution"></div>
      <div class="form-group full"><label>Logo</label><input type="file" accept="image/*"></div>
      <div class="form-group"><label>Primary Color</label><input type="color" value="#003D5D"></div>
      <div class="form-group"><label>Accent Color</label><input type="color" value="#00bfa5"></div>
    </div>
    <div class="wf-actions mt-2"><button type="button" class="btn btn-primary" onclick="saveBrandingNotice()">Save Configuration</button></div>

    <div class="sla-settings-block mt-2">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-clock"></i> SLA &amp; Expiry Alerts</h4>
        <span class="meta-chip">Prototype clock: ${formatDateDMY(APP_TODAY)}</span>
      </div>
      <p class="sla-settings-lead">Per-stage dwell-time SLAs drive automatic popup alerts. Items in the last <strong>warning %</strong> of the SLA show amber; items past SLA show red. Near-expiry and tender renewal use the windows below.</p>
      <div class="form-grid">
        <div class="form-group"><label>Notify Email</label>
          <label class="sla-check"><input id="slaNotifyEmail" type="checkbox"${cfg.notify.email ? ' checked' : ''}> Enable email escalation</label>
        </div>
        <div class="form-group"><label>Notify WhatsApp</label>
          <label class="sla-check"><input id="slaNotifyWhatsApp" type="checkbox"${cfg.notify.whatsapp ? ' checked' : ''}> Enable WhatsApp escalation</label>
        </div>
        <div class="form-group"><label>Near-expiry window (days)</label>
          <input id="slaNearExpiryDays" type="number" min="1" max="180" value="${cfg.notify.nearExpiryDays}">
        </div>
        <div class="form-group"><label>Tender renewal warn (days)</label>
          <input id="slaRenewalWarnDays" type="number" min="1" max="180" value="${cfg.notify.renewalWarnDays}">
        </div>
      </div>
      <div class="data-table-wrap need-table mt-2">
        <table class="data-table">
          <thead><tr><th>Stage</th><th>SLA days</th><th>Warning %</th><th>Default owners</th></tr></thead>
          <tbody>${stageRows}</tbody>
        </table>
      </div>
      <div class="wf-actions mt-2">
        <button type="button" class="btn btn-primary" onclick="saveSlaSettingsFromForm()"><i class="fa-solid fa-floppy-disk"></i> Save SLA settings</button>
        <button type="button" class="btn btn-outline" onclick="previewExpirySlaModal()"><i class="fa-solid fa-bell"></i> Preview expiry / renewal alerts</button>
        <button type="button" class="btn btn-outline" onclick="resetSlaSettings()">Reset defaults</button>
      </div>
      ${slaNotifyLog.length ? `<div class="sla-notify-log mt-2"><h5>Recent notifications</h5>
        <ul>${slaNotifyLog.slice(0, 8).map(n => `<li><strong>${n.at}</strong> · ${n.channels.join(' + ')} · ${n.summary}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  </div>`;
}

function saveBrandingNotice() {
  openModal('Configuration saved', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Branding preferences saved for this session (prototype).</p></div>
  </div>`);
}

function renderRegistration() {
  syncVendorProfileFromAuth();
  const p = vendorProfileState;
  const editing = p.editing;

  if (p.empty || isBlankVendorOnboarding()) {
    return `<div class="profile-kyc">
      ${renderVendorOnboardingEmptyState({
        icon: 'fa-id-badge',
        title: 'Profile not established yet',
        body: 'Statutory identity, licenses, and bank details will appear here after you complete Bid-to-Pay registration. Only your signup name and organization are known so far.',
        steps: ['Complete Stage 1 registration', 'Upload KYC documents', 'Receive vendor approval']
      })}
      <div class="profile-readonly-grid profile-readonly-grid--empty">
        <div class="profile-field">
          <span class="profile-field-label">Full Name</span>
          <strong>${escapeHtmlLite(p.contactName || authUser?.name || '—')}</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Organization</span>
          <strong>${escapeHtmlLite(p.company || authUser?.organization || '—')}</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Vendor ID</span>
          <strong>${escapeHtmlLite(p.vendorId || '—')}</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Work Email</span>
          <strong>${escapeHtmlLite(authUser?.email || '—')}</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">GSTIN</span>
          <strong class="text-muted">Not provided</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">PAN</span>
          <strong class="text-muted">Not provided</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Drug License</span>
          <strong class="text-muted">Not provided</strong>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Bank Account</span>
          <strong class="text-muted">Not verified</strong>
        </div>
        <div class="profile-field full">
          <span class="profile-field-label">Registered Address</span>
          <strong class="text-muted">Not provided</strong>
        </div>
      </div>
      <div class="wf-actions mt-2">
        <button class="btn btn-primary" onclick="navigateTo('workflow')"><i class="fa-solid fa-clipboard-list"></i> Go to Registration</button>
      </div>
    </div>`;
  }

  return `<div class="profile-kyc">
    <div class="indent-mode-banner" style="margin-bottom:1rem">
      <div>
        <strong>NIC registration façade</strong>
        <p>One-time registration remains on the MP NIC tender portal (DSC required, empanelment fees, annual renew). Identity below is synced — edit only via document upload / validation, not blank master forms.</p>
        ${typeof sourceBadge === 'function' ? `<div class="src-badge-row">${sourceBadge('NIC')}${sourceBadge('DVDMS')}</div>` : ''}
      </div>
    </div>
    <div class="profile-kyc-header">
      <div>
        <h3>Vendor Profile — ${escapeHtmlLite(p.vendorId)}</h3>
        <p>Core identity fields are locked (NIC / DVDMS). Edit only Drug License, ISO 13485, or Bank Account via document upload and confirmation.</p>
      </div>
      <span class="badge ${p.verified ? 'badge-success' : 'badge-warning'}">${p.verified ? 'Verified Profile' : 'Pending Verification'}</span>
    </div>
    <div class="profile-readonly-grid">
      <div class="profile-field is-locked">
        <span class="profile-field-label">Company Name</span>
        <strong>${escapeHtmlLite(p.company || '—')}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">Authorized Signatory</span>
        <strong>${escapeHtmlLite(p.contactName || '—')}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">Vendor ID</span>
        <strong>${escapeHtmlLite(p.vendorId)}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">GSTIN</span>
        <strong>${escapeHtmlLite(p.gstin || '—')}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">PAN</span>
        <strong>${escapeHtmlLite(p.pan || '—')}</strong>
      </div>
      <div class="profile-field ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">Drug License ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${escapeHtmlLite(p.drugLicense || '—')}</strong>
        <small class="profile-field-meta" style="color:var(--danger)">${p.drugExpiry ? `Expires: ${escapeHtmlLite(p.drugExpiry)}` : ''}</small>
      </div>
      <div class="profile-field ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">ISO 13485 ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${escapeHtmlLite(p.iso || '—')}</strong>
        <small class="profile-field-meta" style="color:var(--warning)">${escapeHtmlLite(p.isoNote || '')}</small>
      </div>
      <div class="profile-field full ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">Bank Account (Verified) ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${escapeHtmlLite(p.bank || '—')}</strong>
      </div>
    </div>
    ${editing ? `
    <div class="profile-edit-panel">
      <h4><i class="fa-solid fa-file-arrow-up"></i> Upload document to update editable fields</h4>
      <p>Select which field to update, upload the source document, review the extracted details, then confirm.</p>
      <div class="profile-edit-actions">
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('drug')">Upload Drug License</button>
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('iso')">Upload ISO 13485 Certificate</button>
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('bank')">Upload Bank Proof</button>
      </div>
    </div>` : ''}
    <div class="wf-actions mt-2">
      ${editing
        ? `<button class="btn btn-outline" onclick="cancelProfileEdit()">Cancel Edit</button>`
        : `<button class="btn btn-primary" onclick="enableProfileEdit()"><i class="fa-solid fa-pen"></i> Edit</button>`}
    </div>
  </div>`;
}

function enableProfileEdit() {
  vendorProfileState.editing = true;
  renderPageContent();
}

function cancelProfileEdit() {
  vendorProfileState.editing = false;
  vendorProfileState.pendingEdit = null;
  renderPageContent();
}

function startProfileFieldUpload(field) {
  const meta = {
    drug: {
      title: 'Upload Drug License',
      lead: 'Upload a clear scan of the drug / trade license. License number and expiry will be captured from the document.',
      preview: { drugLicense: 'DL-MH-2024-1102', drugExpiry: '20-06-2028' }
    },
    iso: {
      title: 'Upload ISO 13485 Certificate',
      lead: 'Upload the ISO 13485 certificate. Certification status and validity will be captured from the document.',
      preview: { iso: 'Certified — Renewed', isoNote: 'Valid until 15-08-2027' }
    },
    bank: {
      title: 'Upload Bank Account Proof',
      lead: 'Upload cancelled cheque or bank letter. Account details will be captured from the document.',
      preview: { bank: 'HDFC Bank - ****7891 (Verified)' }
    }
  }[field];
  if (!meta) return;

  openModal(meta.title, `
    <div class="upload-modal">
      <p class="upload-modal-lead">${meta.lead}</p>
      <div class="upload-dropzone" onclick="document.getElementById('profileUploadInput').click()">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <strong>Click to select document</strong>
        <span>PDF, JPG, PNG · Max 10 MB</span>
        <input type="file" id="profileUploadInput" class="upload-file-input" accept=".pdf,.jpg,.jpeg,.png" />
      </div>
      <div id="profileUploadList" class="upload-file-list"></div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="runProfileOcr('${field}')">Extract details</button>
      </div>
    </div>
  `, { wide: true });

  vendorProfileState.pendingEdit = { field, preview: meta.preview };
  const input = document.getElementById('profileUploadInput');
  const list = document.getElementById('profileUploadList');
  input?.addEventListener('change', () => {
    const f = input.files?.[0];
    list.innerHTML = f ? `<div class="upload-file-item"><i class="fa-solid fa-file"></i> ${f.name}</div>` : '';
  });
}

function runProfileOcr(field) {
  const file = document.getElementById('profileUploadInput')?.files?.[0];
  if (!file) {
    showWfAlert('Please select a document to upload before extracting details.');
    return;
  }
  const pending = vendorProfileState.pendingEdit;
  if (!pending || pending.field !== field) return;

  const rows = Object.entries(pending.preview).map(([k, v]) => {
    const labels = {
      drugLicense: 'Drug License',
      drugExpiry: 'License Expiry',
      iso: 'ISO 13485',
      isoNote: 'Validity',
      bank: 'Bank Account'
    };
    return `<tr><td>${labels[k] || k}</td><td><strong>${v}</strong></td></tr>`;
  }).join('');

  openModal('Confirm extracted information', `
    <div class="upload-modal">
      <p class="upload-modal-lead">Review the information extracted from <strong>${file.name}</strong>. Confirm to update your profile.</p>
      <div class="award-table-wrap">
        <table class="data-table award-table">
          <thead><tr><th>Field</th><th>Extracted Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="confirmProfileOcrSave()">Confirm &amp; Save</button>
      </div>
    </div>
  `, { wide: true });
}

function confirmProfileOcrSave() {
  const pending = vendorProfileState.pendingEdit;
  if (!pending?.preview) return;
  Object.assign(vendorProfileState, pending.preview);
  vendorProfileState.pendingEdit = null;
  vendorProfileState.editing = false;
  closeModal();
  showWfAlert('Profile updated successfully from the confirmed document.', 'success');
  renderPageContent();
}

function renderTenders() {
  let tenders = filterByCategory(TENDERS);
  tenders = filterTendersByStatus(tenders);
  tenders = applyStagePeriodFilter(tenders, tendersListState, 'deadline');
  const emptyLabel = tenderStatusFilter === 'all' ? 'tenders' : `${tenderStatusFilter} tenders`;
  const paged = paginateItems(tenders, tendersListState.page, 10);
  tendersListState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(tendersListState);
  return `<div class="tenders-page">
    <div class="data-table-wrap bid-dvdms-table-wrap">
      <div class="table-header">
        <h3>Tenders <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      </div>
      ${renderCompactWfPeriodFilter('tendersList', tendersListState)}
      <div class="cards-grid" style="padding:1rem">
        ${paged.items.length ? paged.items.map(t => `<div class="info-card info-card--interactive" role="button" tabindex="0" onclick="openTenderDetail('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openTenderDetail('${t.id}')}">
          <h4>${t.id}</h4><p>${t.title}</p>
          <div class="card-meta"><span>${t.category} · ${t.value}</span><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></div>
          <div class="card-meta"><span>Deadline: ${formatDateDMY(t.deadline)}</span></div>
        </div>`).join('') : `<div class="empty-state-card"><i class="fa-solid fa-inbox"></i><p>No ${emptyLabel} found${currentCategory !== 'All' ? ' for ' + currentCategory : ''} for the selected period.</p></div>`}
      </div>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setTendersListPage', { hideInfo: true })}
    </div>
  </div>`;
}

function setTendersListPage(page) {
  tendersListState.page = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function renderBids() {
  let bids = filterByCategory(BIDS);
  bids = applyStagePeriodFilter(bids, bidsListState, 'deadline');
  const paged = paginateItems(bids, bidsListState.page, 10);
  bidsListState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(bidsListState);
  return `<div class="bids-page">
    <div class="data-table-wrap bid-dvdms-table-wrap">
      <div class="table-header">
        <h3>Bid Submitted <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      </div>
      ${renderCompactWfPeriodFilter('bidsList', bidsListState)}
      <table class="data-table">
        <thead><tr><th>Tender</th><th>Category</th><th>Technical</th><th>Financial</th><th>EMD</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(b => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openBidDetail('${b.tenderId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openBidDetail('${b.tenderId}')}" title="View bid details">
            <td><strong>${b.tenderId}</strong></td><td>${b.category}</td>
            <td><span class="badge badge-${b.technical === 'Complete' || b.technical === 'Submitted' ? 'success' : 'warning'}">${b.technical}</span></td>
            <td><span class="badge badge-${b.financial === 'Sealed' ? 'muted' : 'success'}">${b.financial === 'Sealed' ? '<i class="fa-solid fa-lock"></i> Sealed' : b.financial}</span></td>
            <td><span class="badge badge-${b.emd === 'Paid' ? 'success' : 'warning'}">${b.emd}</span></td>
            <td>${formatDateDMY(b.deadline)}</td>
            <td><span class="badge badge-${b.status === 'Draft' ? 'warning' : b.status === 'Awarded' ? 'success' : 'info'}">${b.status}</span></td>
          </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:1.25rem">No bids match the selected category and period.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setBidsListPage', { hideInfo: true })}
    </div>
  </div>`;
}

function setBidsListPage(page) {
  bidsListState.page = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function bidStatusBadge(status) {
  if (status === 'Draft') return 'warning';
  if (status === 'Awarded') return 'success';
  return 'info';
}

function resolveBidListCoverageRow(bid, tender) {
  const dvdms = (typeof vendorBidDvdmsState !== 'undefined' ? (vendorBidDvdmsState.rows || []) : [])
    .find(r => r.tenderId === bid.tenderId)
    || (typeof VENDOR_BID_DVDMS_API !== 'undefined' ? (VENDOR_BID_DVDMS_API.rows || []) : [])
      .find(r => r.tenderId === bid.tenderId);
  let coveredItems = resolveLifecycleCoveredItems({
    tenderId: bid.tenderId,
    category: bid.category,
    biddedItems: bid.biddedItems || dvdms?.biddedItems,
    coveredItems: bid.coveredItems || dvdms?.biddedItems
  });
  if (!coveredItems.length && categoryUsesItemWiseDetail(bid.category) && tender) {
    coveredItems = getTenderScopeItemNames(tender);
  }
  return {
    ...bid,
    bidId: dvdms?.bidId || bid.tenderId,
    title: dvdms?.title || tender?.title || 'Bid submission',
    value: tender?.value || dvdms?.value || '—',
    biddedItems: coveredItems,
    coveredItems,
    categoryScope: `This ${bid.category} bid is managed at category level. Line-item article schedules are not published for Services / Others packages.`
  };
}

function openBidDetail(tenderId) {
  const b = (typeof BIDS !== 'undefined' ? BIDS : []).find(x => x.tenderId === tenderId);
  if (!b) {
    showWfAlert('Bid record not found.');
    return;
  }
  const tender = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === b.tenderId);
  const row = resolveBidListCoverageRow(b, tender);
  const title = row.title || 'Bid submission';
  const daysLeft = daysUntilDeadline(b.deadline);
  const deadlineHint = daysLeft == null
    ? '—'
    : daysLeft > 0
      ? `${daysLeft} day(s) remaining`
      : daysLeft === 0
        ? 'Due today'
        : 'Deadline passed';
  const clarifCount = (typeof CLARIFICATIONS !== 'undefined' ? CLARIFICATIONS : []).filter(c => c.tenderId === b.tenderId).length;
  const itemWise = categoryUsesItemWiseDetail(b.category);
  const cov = itemWise ? getBidArticleCoverage(row) : null;
  const summaryRows = [
    ['Tender ID', b.tenderId],
    ['Title', title],
    ['Category', b.category || '—'],
    ['Detail type', itemWise ? 'Item-wise' : 'Category-wise'],
    ['Est. value', row.value || '—'],
    ['Bid deadline', `${formatDateDMY(b.deadline)}${deadlineHint && deadlineHint !== '—' ? ` · ${deadlineHint}` : ''}`],
    ['Linked clarifications', String(clarifCount)],
    ['Technical pack', b.technical === 'Submitted' || b.technical === 'Complete' ? 'Uploaded' : b.technical || '—'],
    ['Financial pack', b.financial === 'Submitted' ? 'Submitted' : b.financial === 'Sealed' ? 'Sealed until technical qualification' : (b.financial || '—')],
    ['EMD', b.emd === 'Paid' ? 'Paid and verified' : 'Pending payment / proof']
  ];
  if (cov) {
    summaryRows.push(['Articles bidded', `${cov.biddedCount} of ${cov.total}`]);
  }

  openModal(`${escapeHtmlLite(b.tenderId)} — Bid details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Bid details</p>
        <h3>${escapeHtmlLite(title)}</h3>
        <p>${escapeHtmlLite(b.tenderId)} · ${escapeHtmlLite(b.category || '—')}</p>
      </div>
      <span class="badge badge-${bidStatusBadge(b.status)}">${escapeHtmlLite(b.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Technical</span><strong>${escapeHtmlLite(b.technical || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Financial</span><strong>${escapeHtmlLite(b.financial || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>EMD</span><strong>${escapeHtmlLite(b.emd || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Deadline</span><strong>${escapeHtmlLite(deadlineHint)}</strong></div>
    </div>
    ${cov ? `<div class="dvdms-detail-stats bid-coverage-stats">
      <div class="dvdms-detail-stat"><span>Category articles</span><strong>${cov.total}</strong></div>
      <div class="dvdms-detail-stat is-bidded"><span>Bidded by vendor</span><strong>${cov.biddedCount}</strong></div>
      <div class="dvdms-detail-stat is-not-bidded"><span>Not bidded</span><strong>${cov.notBiddedCount}</strong></div>
      <div class="dvdms-detail-stat"><span>Coverage</span><strong>${cov.total ? Math.round((cov.biddedCount / cov.total) * 100) : 0}%</strong></div>
    </div>
    ${renderBidArticleCoveragePanel(row)}` : renderLifecycleCoverageBlock(row, {
      stageTitle: `${b.category || 'Category'} · category-wise bid`,
      noun: 'bid',
      yesLabel: 'In bid',
      noLabel: 'Not in bid',
      yesHint: 'Articles covered under this bid',
      noHint: 'In category catalogue · not quoted on this bid',
      statusHead: 'Bid scope',
      filterLabel: 'Bid Status',
      headTitle: `${b.category || 'Category'} · category coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Bid summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${summaryRows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="dvdms-detail-note">${b.status === 'Draft'
      ? 'Complete technical and financial packs and settle EMD before the deadline to submit this bid.'
      : b.status === 'Under Evaluation'
        ? 'Your bid is under evaluation. Commercial opening follows technical qualification.'
        : b.status === 'Awarded'
          ? 'This bid has been awarded. Proceed to award acknowledgement and contract execution in the Bid-to-Pay lifecycle.'
          : 'Review pack completeness and portal status for this tender.'}</p>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${tender ? `<button type="button" class="btn btn-primary" onclick="openTenderDetail('${b.tenderId}')"><i class="fa-solid fa-magnifying-glass"></i> View tender</button>` : ''}
    </div>
  </div>`, { wide: true, large: true });
}

function renderClarifications() {
  const items = filterByCategory(CLARIFICATIONS);
  const paged = paginateItems(items, clarificationsListState.page, 10);
  clarificationsListState.page = paged.page;
  return `<div class="data-table-wrap bid-dvdms-table-wrap">
      <div class="table-header">
        <h3>Clarifications</h3>
      </div>
      <table class="data-table">
        <thead><tr><th>Query ID</th><th>Tender</th><th>Category</th><th>Subject</th><th>Status</th><th>Response</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(c => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openClarificationDetail('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openClarificationDetail('${c.id}')}" title="View clarification details">
            <td><strong>${c.id}</strong></td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.subject}</td>
            <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${c.status}</span></td>
            <td>${c.response === 'View' ? '<span class="link-like">View</span>' : c.response}</td>
          </tr>`).join('') : emptyTableRow(6)}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setClarificationsListPage', { hideInfo: true })}
    </div>`;
}

function setClarificationsListPage(page) {
  clarificationsListState.page = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function getClarificationResponseText(c) {
  if (!c || c.response === '—' || c.status === 'Pending') {
    return 'No department response has been published yet. Monitor this query for updates before the bid deadline.';
  }
  if (c.status === 'Corrigendum Issued') {
    return `A corrigendum has been issued for “${c.subject}” under ${c.tenderId}. Download the latest corrigendum from Tender Discovery and update your bid pack if required.`;
  }
  return `Department response for “${c.subject}” (${c.tenderId}): the query has been answered. Review the published clarification note and align your technical / commercial bid accordingly.`;
}

function openClarificationDetail(queryId) {
  const c = (typeof CLARIFICATIONS !== 'undefined' ? CLARIFICATIONS : []).find(x => x.id === queryId);
  if (!c) {
    showWfAlert('Clarification record not found.');
    return;
  }
  const tender = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === c.tenderId);
  const responseBody = getClarificationResponseText(c);
  const statusBadge = c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info';
  const itemWise = categoryUsesItemWiseDetail(c.category);
  let coveredItems = resolveLifecycleCoveredItems({
    tenderId: c.tenderId,
    category: c.category,
    coveredItems: c.coveredItems || c.affectedItems
  });
  if (!coveredItems.length && tender) {
    coveredItems = getTenderScopeItemNames(tender);
  }
  const coverageRow = {
    category: c.category,
    tenderId: c.tenderId,
    value: tender?.value || '—',
    coveredItems,
    categoryScope: `This ${c.category} clarification is tracked at category level. Line-item article schedules are not published for Services / Others packages.`
  };
  const cov = itemWise ? getLifecycleArticleCoverage(coverageRow) : null;

  openModal(`${escapeHtmlLite(c.id)} — Clarification`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Clarification</p>
        <h3>${escapeHtmlLite(c.subject || 'Clarification query')}</h3>
        <p>${escapeHtmlLite(c.tenderId)} · ${escapeHtmlLite(c.category || '—')}</p>
      </div>
      <span class="badge badge-${statusBadge}">${escapeHtmlLite(c.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Query ID</span><strong>${escapeHtmlLite(c.id)}</strong></div>
      <div class="dvdms-detail-stat"><span>Tender</span><strong>${escapeHtmlLite(c.tenderId)}</strong></div>
      <div class="dvdms-detail-stat"><span>Category</span><strong>${escapeHtmlLite(c.category || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Response</span><strong>${escapeHtmlLite(c.response === 'View' ? 'Available' : (c.response || '—'))}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(coverageRow, {
      stageTitle: `${c.category || 'Category'} · category-wise clarification`,
      noun: 'clarification',
      yesLabel: 'In scope',
      noLabel: 'Not in scope',
      yesHint: 'Articles affected by this clarification / corrigendum',
      noHint: 'In category catalogue · not referenced by this query',
      statusHead: 'Clarification scope',
      filterLabel: 'Clarification Status',
      headTitle: `${c.category || 'Category'} articles · coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Query details</div>
      <table class="dvdms-detail-table">
        <tbody>
          <tr><th scope="row">Query ID</th><td>${escapeHtmlLite(c.id)}</td></tr>
          <tr><th scope="row">Tender</th><td>${escapeHtmlLite(c.tenderId)}${tender ? ` · ${escapeHtmlLite(tender.title)}` : ''}</td></tr>
          <tr><th scope="row">Category</th><td>${escapeHtmlLite(c.category || '—')}</td></tr>
          <tr><th scope="row">Detail type</th><td>${itemWise ? 'Item-wise' : 'Category-wise'}</td></tr>
          ${cov ? `<tr><th scope="row">Articles in scope</th><td>${cov.coveredCount} of ${cov.total}</td></tr>` : ''}
          <tr><th scope="row">Subject</th><td>${escapeHtmlLite(c.subject || '—')}</td></tr>
          <tr><th scope="row">Workflow status</th><td><span class="badge badge-${statusBadge}">${escapeHtmlLite(c.status || '—')}</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Department response</div>
      <p class="dvdms-detail-note" style="margin:0.85rem 1rem 1rem">${escapeHtmlLite(responseBody)}</p>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${tender ? `<button type="button" class="btn btn-primary" onclick="openTenderDetail('${c.tenderId}')"><i class="fa-solid fa-magnifying-glass"></i> Open tender</button>` : ''}
    </div>
  </div>`, { wide: true, large: true });
}

function getContractsListRows() {
  let rows = filterByCategory(typeof CONTRACTS !== 'undefined' ? CONTRACTS : []);
  return applyStagePeriodFilter(rows, contractsListState, 'date');
}

function setContractsListPage(page) {
  contractsListState.page = Math.max(1, Number(page) || 1);
  renderPage();
}

function getVendorContractExecRows() {
  let rows = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).slice();
  const cat = vendorContractExecState.category;
  if (cat && cat !== 'all') {
    rows = rows.filter(r => r.category === cat);
  }
  return applyStagePeriodFilter(rows, vendorContractExecState, 'date');
}

function getVendorContractExecCategoryOptions() {
  const cats = [...new Set((typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorContractExecCategory(label) {
  vendorContractExecState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorContractExecState.page = 1;
  refreshWorkflowUI();
}

function bindVendorContractExecCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="contractExecCategory"]');
  if (!wrap || wrap.dataset.contractCatBound) return;
  wrap.dataset.contractCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('contractExecCategory') : '');
    setVendorContractExecCategory(label);
  });
}

function setVendorContractExecPage(page) {
  vendorContractExecState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

/** Seed/system invoice rows for this vendor (empty for new/manual with no portal history). */
function getVendorInvoiceSeedRows() {
  if (isManualVendorWithoutDeliveryHistory()) return [];
  return (typeof INVOICE_MATCHING_DATA !== 'undefined' ? INVOICE_MATCHING_DATA.invoices : []).map(r => ({ ...r }));
}

/** Seed + vendor-uploaded invoice rows (deduped by id). */
function getVendorInvoiceBaseRows() {
  const rows = getVendorInvoiceSeedRows();
  const seen = new Set(rows.map(r => r.id));
  const local = Array.isArray(vendorStageState.invoiceLocalRows) ? vendorStageState.invoiceLocalRows : [];
  local.forEach(r => {
    if (r?.id && !seen.has(r.id)) {
      rows.push({ ...r });
      seen.add(r.id);
    }
  });
  return rows;
}

/**
 * Manual invoice upload only when system returned no invoices for a new/manual vendor.
 * Never treat this as an API/error fallback for existing synced vendors.
 */
function shouldShowManualInvoiceUpload() {
  return isManualVendorWithoutDeliveryHistory() && !getVendorInvoiceBaseRows().length;
}

function getVendorInvoiceExecRows() {
  let rows = getVendorInvoiceBaseRows().map(r => ({ ...r, date: getInvoiceStatusDate(r) }));
  const cat = vendorInvoiceExecState.category;
  if (cat && cat !== 'all') rows = rows.filter(r => r.category === cat);
  return applyStagePeriodFilter(rows, vendorInvoiceExecState, 'date');
}

function getVendorInvoiceCategoryOptions() {
  const cats = [...new Set(getVendorInvoiceBaseRows().map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorInvoiceExecCategory(label) {
  vendorInvoiceExecState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorInvoiceExecState.page = 1;
  refreshWorkflowUI();
}

function bindVendorInvoiceExecCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="invoiceExecCategory"]');
  if (!wrap || wrap.dataset.invCatBound) return;
  wrap.dataset.invCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('invoiceExecCategory') : '');
    setVendorInvoiceExecCategory(label);
  });
}

function renderVendorInvoiceManualUploadStage(canEdit = true) {
  const inv = vendorStageState.invoice;
  const uploadDis = !canEdit || inv.submitted;
  return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>No invoice records were found in the system for your vendor account yet. Attach delivery proof for the active invoice. Invoice labels below stay visible; Invoice Number, GRN, Amount, and Status are filled from the uploaded document.</div>
    </div>
    <div class="ocr-panel mt-2">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-file-invoice"></i> Invoice Details</h4>
        <span class="badge ${inv.submitted ? 'badge-success' : inv.ocrReady ? 'badge-info' : 'badge-muted'}">${inv.submitted ? 'Submitted' : inv.ocrReady ? 'Ready — Review &amp; Save' : 'Awaiting upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Invoice Number', inv.number)}
        ${ocrLabel('GRN Reference', inv.grn)}
        ${ocrLabel('Invoice Amount (₹)', inv.amount)}
        ${ocrLabel('Invoice Status', inv.status ? `<span class="badge ${inv.submitted ? 'badge-success' : 'badge-info'}">${inv.status}</span>` : '', { html: true })}
        ${ocrLabel('Delivery Proof Document', inv.fileName || vendorStageState.uploads.deliveryProof?.name || '')}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfInlineInvoiceProof',
        title: 'Attach Delivery Proof',
        hint: 'Signed challan / GRN / acceptance proof · PDF / JPG — fills all invoice labels above',
        disabled: uploadDis,
        fileName: inv.fileName || vendorStageState.uploads.deliveryProof?.name,
        onChange: 'handleInvoiceProofInlineUpload'
      })}
    </div>
    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete earlier stages (especially Delivery) before submitting an invoice.</p></div></div>' : ''}
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-primary"${!canEdit || !inv.ocrReady || inv.submitted ? ' disabled' : ''} onclick="saveInvoiceOcr()">Save Invoice Details</button>
    </div>`;
}

function renderVendorInvoiceStage(canEdit = true) {
  if (shouldShowManualInvoiceUpload()) {
    return renderVendorInvoiceManualUploadStage(canEdit);
  }
  return renderVendorInvoiceExecTable(canEdit);
}

function setVendorInvoiceExecPage(page) {
  vendorInvoiceExecState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function renderVendorInvoiceExecTable(canEdit = true) {
  const rows = getVendorInvoiceExecRows();
  const baseRows = getVendorInvoiceBaseRows();
  const paged = paginateItems(rows, vendorInvoiceExecState.page, 10);
  vendorInvoiceExecState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(vendorInvoiceExecState);
  const categoryOptions = getVendorInvoiceCategoryOptions();
  const categorySelected = vendorInvoiceExecState.category === 'all'
    ? 'All categories'
    : vendorInvoiceExecState.category;

  const emptyBlock = !baseRows.length
    ? renderVendorOnboardingEmptyState({
        icon: 'fa-file-invoice',
        title: 'No invoice records yet',
        body: 'No invoices were returned for your vendor code. Once invoice matching records are available, they will appear here for review.',
        steps: ['Complete delivery / GRN for an active PO', 'Refresh invoice records when available', 'Use Add / Update to submit additional invoices']
      })
    : '';

  const filterEmptyRow = !paged.items.length && baseRows.length
    ? `<tr class="table-filter-empty-row"><td colspan="7"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No invoices match <strong>${escapeHtmlLite(periodLabel)}</strong>${vendorInvoiceExecState.category !== 'all' ? ` · ${escapeHtmlLite(vendorInvoiceExecState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorInvoiceExecCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  return `<div class="vendor-invoice-exec-table">
    <div class="table-header bid-records-header vendor-invoice-stage-head">
      <h3>Invoice submissions <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      <div class="bid-records-header-actions">
        ${baseRows.length ? `<button type="button" class="btn btn-primary btn-sm" onclick="openVendorInvoiceUpdateModal()">
          <i class="fa-solid fa-plus"></i> Add / Update invoice
        </button>` : ''}
        <div class="bid-records-category-filter" title="Filter by category">
          <span class="bid-records-category-label">Category</span>
          ${inlineCustomSelectHTML('invoiceExecCategory', categoryOptions, categorySelected)}
        </div>
      </div>
    </div>
    ${emptyBlock}
    ${baseRows.length ? `<div class="data-table-wrap mt-2">
      ${renderCompactWfPeriodFilter('vendorInvoice', vendorInvoiceExecState)}
      <table class="data-table">
        <thead><tr><th>Invoice</th><th>PO / Tender</th><th>Category</th><th>GRN</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(r => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorInvoiceDetail('${escapeHtmlLite(r.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorInvoiceDetail('${escapeHtmlLite(r.id)}')}" title="View invoice details">
            <td><strong>${escapeHtmlLite(r.id)}</strong></td>
            <td>${escapeHtmlLite(r.poId || '—')}<div class="table-sub">${escapeHtmlLite(r.tenderId || '')}</div></td>
            <td>${escapeHtmlLite(r.category || '—')}</td>
            <td>${escapeHtmlLite(r.grnId || '—')}</td>
            <td><span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span></td>
            <td class="cell-nowrap">${escapeHtmlLite(r.value || '—')}</td>
            <td class="cell-date">${escapeHtmlLite(r.date || '—')}</td>
          </tr>`).join('') : filterEmptyRow}
        </tbody>
      </table>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorInvoiceExecPage', { hideInfo: true }) : ''}
    </div>` : ''}
  </div>`;
}

const INVOICE_UPDATE_TENDER_PLACEHOLDER = 'Select tender for this invoice…';

const vendorInvoiceUpdateDraft = {
  tenderId: '',
  number: '',
  grn: '',
  amount: '',
  status: '',
  ocrReady: false,
  fileName: null
};

function resetVendorInvoiceUpdateDraft() {
  Object.assign(vendorInvoiceUpdateDraft, {
    tenderId: '',
    number: '',
    grn: '',
    amount: '',
    status: '',
    ocrReady: false,
    fileName: null
  });
}

function renderVendorInvoiceUpdateModalBody() {
  const d = vendorInvoiceUpdateDraft;
  const options = getVendorLifecycleTenderSelectOptions(INVOICE_UPDATE_TENDER_PLACEHOLDER);
  const selected = d.tenderId
    ? (options.find(o => o.startsWith(`${d.tenderId} — `)) || INVOICE_UPDATE_TENDER_PLACEHOLDER)
    : INVOICE_UPDATE_TENDER_PLACEHOLDER;
  const hasTender = !!d.tenderId;
  return `<div class="dvdms-detail vendor-update-modal">
    <p class="dvdms-detail-note" style="margin-top:0">Select the tender first. Delivery-proof upload unlocks after tender selection. Saving adds the invoice to your submissions table.</p>
    <div class="form-group" style="margin-bottom:1rem">
      <label>${reqLabel('Tender')}</label>
      ${inlineCustomSelectHTML('invoiceUpdateTender', options, selected)}
    </div>
    <div class="ocr-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-file-invoice"></i> Invoice Details</h4>
        <span class="badge ${d.ocrReady ? 'badge-info' : 'badge-muted'}">${d.ocrReady ? 'Ready — Review &amp; Save' : 'Awaiting upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Invoice Number', d.number)}
        ${ocrLabel('GRN Reference', d.grn)}
        ${ocrLabel('Invoice Amount (₹)', d.amount)}
        ${ocrLabel('Invoice Status', d.status ? `<span class="badge badge-info">${escapeHtmlLite(d.status)}</span>` : '', { html: true })}
        ${ocrLabel('Delivery Proof Document', d.fileName || '')}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfModalInvoiceUpload',
        title: 'Attach Delivery Proof',
        hint: hasTender
          ? 'Signed challan / GRN / acceptance proof · PDF / JPG — fills all invoice labels above'
          : 'Select a tender above to enable upload',
        disabled: !hasTender,
        fileName: d.fileName,
        onChange: 'handleInvoiceUpdateModalUpload'
      })}
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary"${!hasTender || !d.ocrReady ? ' disabled' : ''} onclick="saveVendorInvoiceUpdateModal()">
        <i class="fa-solid fa-check"></i> Save invoice
      </button>
    </div>
  </div>`;
}

function bindVendorInvoiceUpdateTenderSelect() {
  const wrap = document.querySelector('#modalBody .custom-select[data-select-id="invoiceUpdateTender"]');
  if (!wrap || wrap.dataset.invoiceUpdateBound) return;
  wrap.dataset.invoiceUpdateBound = '1';
  wrap.addEventListener('change', () => {
    const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('invoiceUpdateTender') : '';
    const tenderId = (!label || label === INVOICE_UPDATE_TENDER_PLACEHOLDER)
      ? ''
      : (label.split(' — ')[0] || '').trim();
    vendorInvoiceUpdateDraft.tenderId = tenderId;
    vendorInvoiceUpdateDraft.number = '';
    vendorInvoiceUpdateDraft.grn = '';
    vendorInvoiceUpdateDraft.amount = '';
    vendorInvoiceUpdateDraft.status = '';
    vendorInvoiceUpdateDraft.ocrReady = false;
    vendorInvoiceUpdateDraft.fileName = null;
    openModal('Add / Update invoice', renderVendorInvoiceUpdateModalBody(), { wide: true, large: true, replace: true });
  });
}

function openVendorInvoiceUpdateModal() {
  if (!getVendorInvoiceBaseRows().length) {
    showWfAlert('Synced invoice records are required before adding updates.');
    return;
  }
  if (!getVendorLifecycleTenderChoices().length) {
    showWfAlert('No tenders are available to link. Complete award / contract selection first.');
    return;
  }
  resetVendorInvoiceUpdateDraft();
  openModal('Add / Update invoice', renderVendorInvoiceUpdateModalBody(), { wide: true, large: true });
}

function handleInvoiceUpdateModalUpload(input) {
  if (!vendorInvoiceUpdateDraft.tenderId) {
    showWfAlert('Select a tender before attaching delivery proof.');
    if (input) input.value = '';
    return;
  }
  const file = input?.files?.[0];
  if (!file) return;
  const suffix = String(Date.now()).slice(-4);
  simulateOcrDelay(() => {
    Object.assign(vendorInvoiceUpdateDraft, {
      number: `INV-2026-${suffix}`,
      grn: `GRN-2026-${suffix}`,
      amount: '4,25,000',
      status: 'Ready — Confirm to Save',
      ocrReady: true,
      fileName: file.name
    });
    openModal('Add / Update invoice', renderVendorInvoiceUpdateModalBody(), { wide: true, large: true, replace: true });
  });
}

function saveVendorInvoiceUpdateModal() {
  const d = vendorInvoiceUpdateDraft;
  if (!d.tenderId) {
    showWfAlert('Select a tender before saving.');
    return;
  }
  if (!d.ocrReady) {
    showWfAlert('Attach Delivery Proof first so invoice details can be populated.');
    return;
  }
  const choice = getVendorLifecycleTenderChoices().find(t => t.tenderId === d.tenderId) || {};
  const contract = typeof getContractRecordForTender === 'function' ? getContractRecordForTender(d.tenderId) : null;
  const delivery = (vendorDeliverySyncState.rows || []).find(r => r.tenderId === d.tenderId);
  const n = getVendorInvoiceBaseRows().length + 1;
  const invId = d.number || `INV-2026-${String(9000 + n).padStart(4, '0')}`;
  const row = {
    id: invId,
    poId: choice.poId || delivery?.poId || contract?.poId || `PO-${String(d.tenderId).replace(/^TND-/, '')}`,
    grnId: d.grn || delivery?.grn || '—',
    tenderId: d.tenderId,
    title: choice.title || contract?.title || d.tenderId,
    state: 'Madhya Pradesh',
    division: contract?.division || '—',
    category: choice.category || contract?.category || '—',
    status: 'Under match',
    vendor: authUser?.organization || authUser?.name || '—',
    invoiceDate: formatDateDMY(APP_TODAY),
    date: formatDateDMY(APP_TODAY),
    value: d.amount ? `₹${d.amount}` : (contract?.value || '—'),
    poValue: contract?.value || '—',
    grnValue: d.grn || '—',
    matchScore: '—',
    taxInvoice: invId,
    deductions: '—',
    financeStatus: 'On hold',
    remarks: 'Vendor-uploaded invoice update',
    fileName: d.fileName || null,
    source: 'vendor-upload'
  };
  if (!Array.isArray(vendorStageState.invoiceLocalRows)) vendorStageState.invoiceLocalRows = [];
  vendorStageState.invoiceLocalRows.push(row);
  vendorStageState.invoice = {
    ...vendorStageState.invoice,
    number: invId,
    grn: row.grnId,
    amount: d.amount || '',
    status: 'Submitted',
    submitted: true,
    ocrReady: true,
    fileName: d.fileName
  };
  vendorStageState.payment.milestones[0].done = true;
  vendorStageState.payment.status = 'Under Verification';
  vendorStageState.payment.lastUpdate = formatDateDMY(APP_TODAY);
  if (!vendorStageState.completed?.[8]) completeVendorStage(8);
  persistVendorLifecycle();
  closeModal();
  refreshWorkflowUI();
  showWfAlert(`Invoice <strong>${escapeHtmlLite(invId)}</strong> added for tender <strong>${escapeHtmlLite(d.tenderId)}</strong>.`, 'success');
}

function openVendorInvoiceDetail(invId) {
  const r = getVendorInvoiceBaseRows().find(i => i.id === invId);
  if (!r) return;
  const statusSince = getInvoiceStatusDate(r);
  const rows = [
    ['Invoice ID', r.id],
    ['Tax invoice ref', r.taxInvoice || '—'],
    ['PO', r.poId || '—'],
    ['GRN', r.grnId || '—'],
    ['Tender', r.tenderId || '—'],
    ['Title', r.title || '—'],
    ['Vendor', r.vendor || '—'],
    ['Category', r.category || '—'],
    ['Detail type', categoryUsesItemWiseDetail(r.category) ? 'Item-wise' : 'Category-wise'],
    ['Division', r.division || '—'],
    ['PO value', r.poValue || '—'],
    ['GRN value', r.grnValue || '—'],
    ['Deductions', r.deductions || '—'],
    ['Finance status', r.financeStatus || r.status || '—']
  ];
  openModal(`${escapeHtmlLite(r.id)} — Invoice details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Invoice details</p>
        <h3>${escapeHtmlLite(r.title || 'Invoice')}</h3>
        <p>${escapeHtmlLite(r.poId || '—')} · ${escapeHtmlLite(r.tenderId || '—')} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Status</span><strong>${escapeHtmlLite(r.status || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Match</span><strong>${escapeHtmlLite(r.matchScore || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Amount</span><strong>${escapeHtmlLite(r.value || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Invoice date</span><strong>${escapeHtmlLite(statusSince || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(r, {
      stageTitle: `${r.category || 'Category'} · category-wise invoice`,
      noun: 'invoice',
      yesLabel: 'Invoiced',
      noLabel: 'Not invoiced',
      yesHint: 'Articles covered on this tax invoice / GRN match',
      noHint: 'In category catalogue · not billed on this invoice',
      statusHead: 'Invoice status',
      filterLabel: 'Invoice Status',
      headTitle: `${r.category || 'Category'} articles · invoice coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Invoice &amp; GRN summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${r.remarks ? `<p class="dvdms-detail-note">${escapeHtmlLite(r.remarks)}</p>` : ''}
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

function resolveLinkedBidId(tenderId) {
  if (!tenderId) return '';
  const pools = [];
  if (typeof vendorBidDvdmsState !== 'undefined') pools.push(...(vendorBidDvdmsState.rows || []));
  if (typeof VENDOR_BID_DVDMS_API !== 'undefined') pools.push(...(VENDOR_BID_DVDMS_API.rows || []));
  if (typeof vendorAwardSyncState !== 'undefined') pools.push(...(vendorAwardSyncState.rows || []));
  if (typeof VENDOR_AWARD_SYNC_API !== 'undefined') pools.push(...(VENDOR_AWARD_SYNC_API.rows || []));
  const hit = pools.find(r => r?.tenderId === tenderId && r?.bidId);
  if (hit?.bidId) return hit.bidId;
  const m = String(tenderId).match(/(\d{4})$/);
  return m ? `BID-2026-${m[1]}` : '';
}

function enrichVendorPaymentRow(r) {
  return {
    ...r,
    bidId: r.bidId || resolveLinkedBidId(r.tenderId),
    date: getPaymentStatusDate(r)
  };
}

function getVendorPaymentSyncMeta() {
  return {
    status: vendorPaymentSyncState.status === 'synced'
      ? 'Synced'
      : (vendorPaymentSyncState.status === 'error' ? 'Not synced' : (vendorPaymentSyncState.status === 'loading' ? 'Syncing' : 'Not synced')),
    lastSynced: vendorPaymentSyncState.lastSynced || '—'
  };
}

function applyVendorPaymentSyncFetch({ isRefresh = false } = {}) {
  vendorPaymentSyncState.fetchCount += 1;
  vendorPaymentSyncState.status = 'synced';
  const now = new Date();
  vendorPaymentSyncState.lastSynced =
    `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ` +
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} IST`;
  if (isRefresh && typeof PAYMENT_STAGE_DATA !== 'undefined') {
    const rows = PAYMENT_STAGE_DATA.payments || [];
    const idx = rows.findIndex(r => /in process/i.test(r.status || ''));
    if (idx >= 0 && vendorPaymentSyncState.fetchCount > 1) {
      rows[idx] = {
        ...rows[idx],
        status: 'Approved',
        mode: rows[idx].mode && rows[idx].mode !== '—' ? rows[idx].mode : 'PFMS',
        remarks: 'Treasury cleared after refresh — awaiting final release.'
      };
    }
  }
  vendorStageState.payment.lastUpdate = formatDateDMY(APP_TODAY);
  if (!vendorStageState.completed?.[9] && vendorStageState.invoice.submitted) {
    completeVendorStage(9);
  }
}

function ensureVendorPaymentSyncLoaded() {
  if (vendorPaymentSyncState.status === 'synced' || vendorPaymentSyncState.status === 'loading') return;
  applyVendorPaymentSyncFetch({ isRefresh: false });
}

function refreshVendorPaymentSyncApi() {
  if (vendorPaymentSyncState.status === 'loading') return;
  vendorPaymentSyncState.status = 'loading';
  try {
    refreshWorkflowUI();
  } catch (err) {
    console.warn('Payment UI refresh failed during loading state', err);
  }
  setTimeout(() => {
    try {
      applyVendorPaymentSyncFetch({ isRefresh: true });
      persistVendorLifecycle();
      refreshWorkflowUI();
      const count = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).length;
      openModal('Data refreshed', `
        <div class="sync-success-msg">
          <div class="sync-success-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h4>Latest payment records are ready</h4>
          <p>Fetched <strong>${count}</strong> payment record(s) for vendor <strong>${escapeHtmlLite(authUser?.vendorId || '—')}</strong>. Open a row to see tender, bid, invoice and payment status.</p>
        </div>
      `);
    } catch (err) {
      console.warn('Payment sync failed', err);
      vendorPaymentSyncState.status = 'error';
      refreshWorkflowUI();
      openModal('Sync unsuccessful', `
        <div class="sync-success-msg sync-error-msg">
          <div class="sync-success-icon sync-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h4>Payment records could not be updated</h4>
          <p>Sync did not complete. Please try Refresh again in a moment.</p>
        </div>
      `);
    }
  }, 650);
}

function getVendorPaymentExecRows() {
  let rows = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : [])
    .map(enrichVendorPaymentRow);
  const cat = vendorPaymentExecState.category;
  if (cat && cat !== 'all') rows = rows.filter(r => r.category === cat);
  return applyStagePeriodFilter(rows, vendorPaymentExecState, 'date');
}

function getVendorPaymentCategoryOptions() {
  const cats = [...new Set((typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).map(r => r.category).filter(Boolean))];
  return ['All categories', ...cats];
}

function setVendorPaymentExecCategory(label) {
  vendorPaymentExecState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorPaymentExecState.page = 1;
  refreshWorkflowUI();
}

function bindVendorPaymentExecCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="paymentExecCategory"]');
  if (!wrap || wrap.dataset.payCatBound) return;
  wrap.dataset.payCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('paymentExecCategory') : '');
    setVendorPaymentExecCategory(label);
  });
}

function setVendorPaymentExecPage(page) {
  vendorPaymentExecState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function renderVendorPaymentStage(canEdit = true) {
  ensureVendorPaymentSyncLoaded();
  return `${renderVendorPaymentExecTable(canEdit)}
    ${renderVendorActivePaymentProgress()}`;
}

function getActiveVendorPaymentFocus() {
  const rows = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : [])
    .map(enrichVendorPaymentRow);
  if (!rows.length) return null;
  const invNo = vendorStageState.invoice?.number;
  if (invNo) {
    const byInv = rows.find(r => String(r.invoiceId || '') === String(invNo));
    if (byInv) return byInv;
  }
  const localInv = (vendorStageState.invoiceLocalRows || [])[0];
  if (localInv?.id) {
    const byLocal = rows.find(r => r.invoiceId === localInv.id);
    if (byLocal) return byLocal;
  }
  const pipeline = rows.find(r => /in process|approved|under verification|finance|on hold/i.test(r.status || ''));
  if (pipeline) return pipeline;
  const paid = rows.find(r => /^paid$/i.test(r.status || ''));
  if (paid) return paid;
  return rows[0];
}

function renderVendorActivePaymentProgress() {
  const p = vendorStageState.payment;
  const inv = vendorStageState.invoice;
  if (inv.submitted) {
    p.milestones[0].done = true;
    if (p.status === 'Awaiting Processing' || p.status === 'Not started') {
      p.status = 'Under Verification';
    }
    if (p.lastUpdate === '—') p.lastUpdate = formatDateDMY(APP_TODAY);
  }
  const focus = getActiveVendorPaymentFocus();
  const status = focus?.status || p.status || '—';
  const tenderId = focus?.tenderId || vendorStageState.contract?.tenderId || vendorStageState.award?.tenderId || '—';
  const bidId = focus?.bidId || resolveLinkedBidId(tenderId) || '—';
  const title = focus?.title || vendorStageState.award?.title || vendorStageState.contract?.tenderId || '—';
  const invoiceId = focus?.invoiceId || inv.number || '—';
  const poId = focus?.poId || '—';
  const category = focus?.category || '—';
  const netPayable = focus?.netPayable || inv.amount || '—';
  const mode = focus?.mode || '—';
  const paymentId = focus?.id || '—';
  const utr = focus?.utr || '—';
  const subtitle = tenderId !== '—'
    ? `Tracking payment for tender <strong>${escapeHtmlLite(tenderId)}</strong> · bid <strong>${escapeHtmlLite(bidId)}</strong>`
    : 'Submit an invoice to start tender-linked payment tracking';

  return `<div class="payment-track mt-2">
    <div class="payment-track-header">
      <div>
        <h4>Active payment progress</h4>
        <p>${subtitle}</p>
      </div>
      <span class="badge badge-${needStatusBadge(status)}">${escapeHtmlLite(status)}</span>
    </div>
    <div class="payment-summary-grid payment-summary-grid--detail">
      <div class="payment-summary-card">
        <span class="payment-summary-label">Payment ID</span>
        <strong>${escapeHtmlLite(paymentId)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Tender</span>
        <strong>${escapeHtmlLite(tenderId)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Bid</span>
        <strong>${escapeHtmlLite(bidId)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Title</span>
        <strong>${escapeHtmlLite(title)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Invoice</span>
        <strong>${escapeHtmlLite(invoiceId)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">PO</span>
        <strong>${escapeHtmlLite(poId)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Category</span>
        <strong>${escapeHtmlLite(category)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Net payable</span>
        <strong>${escapeHtmlLite(netPayable)}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Mode / UTR</span>
        <strong>${escapeHtmlLite(mode)}${utr && utr !== '—' ? ` · ${escapeHtmlLite(utr)}` : ''}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Bank Account</span>
        <strong>${escapeHtmlLite(p.bank || '—')}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Expected Timeline</span>
        <strong>${escapeHtmlLite(p.timeline || '—')}</strong>
      </div>
      <div class="payment-summary-card">
        <span class="payment-summary-label">Last Update</span>
        <strong>${escapeHtmlLite(focus?.date || p.lastUpdate || '—')}</strong>
      </div>
    </div>
    ${focus?.id ? `<div class="payment-track-actions">
      <button type="button" class="btn btn-outline btn-sm" onclick="openVendorPaymentDetail('${escapeHtmlLite(focus.id)}')">
        <i class="fa-solid fa-eye"></i> View full payment details
      </button>
    </div>` : ''}
  </div>`;
}

function renderVendorPaymentExecTable(canEdit = true) {
  ensureVendorPaymentSyncLoaded();
  const meta = getVendorPaymentSyncMeta();
  const rows = getVendorPaymentExecRows();
  const allCount = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).length;
  const paged = paginateItems(rows, vendorPaymentExecState.page, 10);
  vendorPaymentExecState.page = paged.page;
  const loading = vendorPaymentSyncState.status === 'loading';
  const refreshDis = loading ? ' disabled' : '';
  const periodLabel = getWfPeriodFilterLabel(vendorPaymentExecState);
  const categoryOptions = getVendorPaymentCategoryOptions();
  const categorySelected = vendorPaymentExecState.category === 'all'
    ? 'All categories'
    : vendorPaymentExecState.category;

  const emptyBlock = !allCount
    ? renderVendorOnboardingEmptyState({
        icon: 'fa-indian-rupee-sign',
        title: 'No payment records yet',
        body: 'No payment advice records were returned for your vendor code. Refresh to pull the latest payment status once invoices enter finance processing.',
        steps: ['Submit invoice with GRN reference', 'Refresh to load payment records', 'Open a row for tender / bid / payment detail']
      })
    : '';

  const filterEmptyRow = !paged.items.length
    ? `<tr class="table-filter-empty-row"><td colspan="7"><div class="table-filter-empty"><i class="fa-solid fa-filter"></i><p>No payments match <strong>${escapeHtmlLite(periodLabel)}</strong>${vendorPaymentExecState.category !== 'all' ? ` · ${escapeHtmlLite(vendorPaymentExecState.category)}` : ''}.</p><button type="button" class="btn btn-outline btn-sm" onclick="setVendorPaymentExecCategory('All categories')">Clear category filter</button></div></td></tr>`
    : '';

  const tableBlock = allCount ? `<div class="data-table-wrap bid-dvdms-table-wrap mt-2">
      <div class="table-header bid-records-header">
        <h3>Payment records <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
        <div class="bid-records-category-filter" title="Filter by category">
          <span class="bid-records-category-label">Category</span>
          ${inlineCustomSelectHTML('paymentExecCategory', categoryOptions, categorySelected)}
        </div>
      </div>
      ${renderCompactWfPeriodFilter('vendorPayment', vendorPaymentExecState)}
      <div class="bid-dvdms-table-scroll">
        <table class="data-table payment-sync-table">
          <thead>
            <tr>
              <th>Payment</th>
              <th>Tender / Bid</th>
              <th>Invoice / PO</th>
              <th>Category</th>
              <th>Status</th>
              <th>Net payable</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => {
              const id = escapeHtmlLite(r.id);
              return `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorPaymentDetail('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorPaymentDetail('${id}')}" title="View payment details">
              <td class="cell-id"><strong>${id}</strong><div class="table-sub">${escapeHtmlLite(r.title || '')}</div></td>
              <td class="cell-tender"><strong>${escapeHtmlLite(r.tenderId || '—')}</strong><div class="table-sub">${escapeHtmlLite(r.bidId || '—')}</div></td>
              <td><strong>${escapeHtmlLite(r.invoiceId || '—')}</strong><div class="table-sub">${escapeHtmlLite(r.poId || '')}</div></td>
              <td>${escapeHtmlLite(r.category || '—')}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span></td>
              <td class="cell-nowrap">${escapeHtmlLite(r.netPayable || '—')}</td>
              <td class="cell-date">${escapeHtmlLite(r.date || '—')}</td>
            </tr>`;
            }).join('') : filterEmptyRow}
          </tbody>
        </table>
      </div>
      ${paged.items.length ? renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorPaymentExecPage', { hideInfo: true }) : ''}
    </div>` : '';

  return `<div class="need-api bid-dvdms-stage vendor-payment-stage">
    <div class="need-api-banner">
      <div class="need-api-banner-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
      <div class="need-api-banner-text">
        <strong>Payment records</strong>
        <p>Tender, bid, invoice and payment status · Last synced <strong>${escapeHtmlLite(meta.lastSynced)}</strong></p>
      </div>
      <div class="need-api-banner-actions">
        ${renderApiSyncBadge(meta.status === 'Syncing' ? 'Not synced' : meta.status)}
        <button type="button" class="btn btn-outline btn-sm" onclick="refreshVendorPaymentSyncApi()"${refreshDis}>
          <i class="fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}"></i> ${loading ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
    </div>
    ${emptyBlock}
    ${tableBlock}
  </div>`;
}

function renderRejectionReasonBanner(reason) {
  const text = String(reason || '').trim();
  if (!text || text === '—') return '';
  return `<div class="dvdms-detail-rejection" role="status">
    <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>
    <div>
      <strong>Rejection reason</strong>
      <p>${escapeHtmlLite(text)}</p>
    </div>
  </div>`;
}

/** Only mark article lines as Paid when funds were actually released. */
function getPaymentCoverageSourceRow(row) {
  if (/^paid$/i.test(String(row?.status || ''))) return row;
  return { ...row, forceEmptyCoverage: true };
}

function openVendorPaymentDetail(payId) {
  const raw = (typeof PAYMENT_STAGE_DATA !== 'undefined' ? PAYMENT_STAGE_DATA.payments : []).find(p => p.id === payId);
  if (!raw) return;
  const r = enrichVendorPaymentRow(raw);
  const statusSince = getPaymentStatusDate(r);
  const isRejected = /reject/i.test(String(r.status || ''));
  const rejectionReason = r.rejectionReason || (isRejected ? r.remarks : '');
  const coverageRow = getPaymentCoverageSourceRow(r);
  const rows = [
    ['Payment ID', r.id],
    ['Tender', r.tenderId || '—'],
    ['Bid', r.bidId || '—'],
    ['Title', r.title || '—'],
    ['Invoice ID', r.invoiceId || '—'],
    ['PO', r.poId || '—'],
    ['Vendor', r.vendor || '—'],
    ['Category', r.category || '—'],
    ['Detail type', categoryUsesItemWiseDetail(r.category) ? 'Item-wise' : 'Category-wise'],
    ['Division', r.division || '—'],
    ['Gross amount', r.gross || '—'],
    ['LD / deductions', r.ld || '—'],
    ['Mode', r.mode || '—'],
    ['UTR / reference', r.utr || '—'],
    ['Due date', r.dueDate && r.dueDate !== '—' ? r.dueDate : '—'],
    ['Status since', statusSince || '—']
  ];
  if (isRejected && rejectionReason) {
    rows.push(['Rejection reason', rejectionReason]);
  }
  openModal(`${escapeHtmlLite(r.id)} — Payment details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Payment details</p>
        <h3>${escapeHtmlLite(r.title || 'Payment')}</h3>
        <p>${escapeHtmlLite(r.tenderId || '—')} · ${escapeHtmlLite(r.bidId || '—')} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${needStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    ${isRejected ? renderRejectionReasonBanner(rejectionReason) : ''}
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Tender</span><strong>${escapeHtmlLite(r.tenderId || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Bid</span><strong>${escapeHtmlLite(r.bidId || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Invoice</span><strong>${escapeHtmlLite(r.invoiceId || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>PO</span><strong>${escapeHtmlLite(r.poId || '—')}</strong></div>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Status</span><strong>${escapeHtmlLite(r.status || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Net payable</span><strong>${escapeHtmlLite(r.netPayable || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Mode</span><strong>${escapeHtmlLite(r.mode || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Payment date</span><strong>${escapeHtmlLite(r.paymentDate && r.paymentDate !== '—' ? r.paymentDate : '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(coverageRow, {
      stageTitle: `${r.category || 'Category'} · category-wise payment`,
      noun: 'payment',
      yesLabel: 'Paid',
      noLabel: 'Not paid',
      yesHint: isRejected
        ? 'No articles were paid — this payment was rejected'
        : 'Articles covered under this payment release',
      noHint: isRejected
        ? 'Catalogue articles · payment not released for this record'
        : 'In category catalogue · not part of this payment',
      statusHead: 'Payment status',
      filterLabel: 'Payment Status',
      headTitle: `${r.category || 'Category'} articles · payment coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Payment summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${!isRejected && r.remarks ? `<p class="dvdms-detail-note">${escapeHtmlLite(r.remarks)}</p>` : ''}
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

/* ========== Vendor Stage 10 — Renewal ========== */
function getVendorSessionIdentity() {
  return {
    vendorId: authUser?.vendorId || vendorProfileState?.vendorId || 'VND-MP-000123',
    vendorName: authUser?.name || vendorProfileState?.company || 'MediSupply India Pvt Ltd',
    gstin: vendorProfileState?.gstin || '23AABCM1234A1Z5',
    contact: (authUser?.email || 'vendor@medisupply.in') + ' · +91 755 400 2100'
  };
}

function getVendorEligibleRenewalContracts() {
  const { vendorName } = getVendorSessionIdentity();
  const all = typeof CONTRACTS !== 'undefined' ? CONTRACTS : [];
  const active = all.filter(c => c.status === 'Active' || c.status === 'In Progress');
  const matched = active.filter(c => c.vendor === vendorName || String(c.vendor || '').includes('MediSupply'));
  return matched.length ? matched : active.filter(c => String(c.vendor || '').includes('MediSupply'));
}

function getVendorSeedRenewalRequests() {
  const { vendorId } = getVendorSessionIdentity();
  return (typeof RENEWAL_STAGE_DATA !== 'undefined' ? RENEWAL_STAGE_DATA.renewals : [])
    .filter(r => r.vendorId === vendorId)
    .map(r => ({ ...r, source: 'seed', documents: (r.documents || []).map(d => ({ ...d })) }));
}

function getVendorRenewalRequestRows() {
  const submitted = (vendorStageState.renewalRequests || []).map(r => ({ ...r, source: r.source || 'vendor' }));
  const submittedIds = new Set(submitted.map(r => r.id));
  const seeded = getVendorSeedRenewalRequests().filter(r => !submittedIds.has(r.id));
  let rows = [...submitted, ...seeded];
  const cat = vendorRenewalExecState.category;
  if (cat && cat !== 'all') rows = rows.filter(r => r.category === cat);
  return applyStagePeriodFilter(rows, vendorRenewalExecState, 'renewalDate');
}

function getVendorRenewalCategoryOptions() {
  const cats = typeof CATEGORIES !== 'undefined'
    ? CATEGORIES.filter(c => c && c !== 'All')
    : ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return ['All categories', ...cats];
}

function setVendorRenewalExecCategory(label) {
  vendorRenewalExecState.category = (!label || label === 'All categories') ? 'all' : label;
  vendorRenewalExecState.page = 1;
  refreshWorkflowUI();
}

function bindVendorRenewalExecCategorySelect() {
  const wrap = document.querySelector('.custom-select[data-select-id="renewalExecCategory"]');
  if (!wrap || wrap.dataset.renCatBound) return;
  wrap.dataset.renCatBound = '1';
  wrap.addEventListener('change', e => {
    const label = e.detail?.value
      || (typeof getCustomSelectValue === 'function' ? getCustomSelectValue('renewalExecCategory') : '');
    setVendorRenewalExecCategory(label);
  });
}

function setVendorRenewalExecPage(page) {
  vendorRenewalExecState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function renderVendorRenewalStage(canEdit = true) {
  const allForKpis = (() => {
    const submitted = (vendorStageState.renewalRequests || []).map(r => ({ ...r, source: r.source || 'vendor' }));
    const submittedIds = new Set(submitted.map(r => r.id));
    const seeded = getVendorSeedRenewalRequests().filter(r => !submittedIds.has(r.id));
    return applyStagePeriodFilter([...submitted, ...seeded], vendorRenewalExecState, 'renewalDate');
  })();
  const rows = getVendorRenewalRequestRows();
  const paged = paginateItems(rows, vendorRenewalExecState.page, 10);
  vendorRenewalExecState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(vendorRenewalExecState);
  const pending = allForKpis.filter(r => r.status !== 'Finalized').length;
  const finalized = allForKpis.filter(r => r.status === 'Finalized').length;
  const vendorRaised = allForKpis.filter(r => r.source === 'vendor').length;
  const eligible = getVendorEligibleRenewalContracts().length;
  const categoryOptions = getVendorRenewalCategoryOptions();
  const categorySelected = vendorRenewalExecState.category === 'all'
    ? 'All categories'
    : vendorRenewalExecState.category;

  return `<div class="vendor-renewal-stage">
    <div class="indent-mode-banner">
      <div>
        <strong>Renewal — raise request on Active or In Progress contracts</strong>
        <p style="margin:0.25rem 0 0;font-size:0.85rem;color:#64748b">Requests go to Resource Manager Stage 14 for finalization.</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm"${canEdit ? '' : ' disabled'} onclick="openVendorRenewalRequestModal()">
        <i class="fa-solid fa-file-circle-plus"></i> Raise request
      </button>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Eligible contracts</span><strong>${eligible}</strong></div>
      <div class="budget-pr-chip"><span>Open requests</span><strong>${pending}</strong></div>
      <div class="budget-pr-chip"><span>Finalized</span><strong>${finalized}</strong></div>
      <div class="budget-pr-chip"><span>Raised by you</span><strong>${vendorRaised}</strong></div>
      <div class="budget-pr-chip"><span>Period</span><strong>${escapeHtmlLite(periodLabel)}</strong></div>
    </div>

    <section class="budget-section" id="vendorRenewalStageTable">
      <div class="table-header bid-records-header" style="border-bottom:none;padding-bottom:0.35rem">
        <div class="budget-section-head" style="margin:0">
          <h4 style="margin:0"><i class="fa-solid fa-rotate"></i> Your renewal requests <span class="meta-chip" style="margin:0 0 0 0.35rem">${escapeHtmlLite(periodLabel)}</span></h4>
          <p style="margin:0.35rem 0 0">Click a row for details. Submit at least one new request to complete Stage 10.</p>
        </div>
        <div class="bid-records-category-filter" title="Filter by category">
          <span class="bid-records-category-label">Category</span>
          ${inlineCustomSelectHTML('renewalExecCategory', categoryOptions, categorySelected)}
        </div>
      </div>
      ${renderCompactWfPeriodFilter('vendorRenewal', vendorRenewalExecState)}
      <div class="consol-detail-table-wrap">
        <table class="data-table consol-detail-table tender-prep-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Contract / Tender</th>
              <th>Category</th>
              <th>Period</th>
              <th>Type</th>
              <th>Status</th>
              <th>Value</th>
              <th>Docs</th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.length ? paged.items.map(r => `
              <tr class="tender-prep-row need-row-clickable" role="button" tabindex="0" onclick="openVendorRenewalDetail('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorRenewalDetail('${r.id}')}" title="View request details">
                <td><strong>${r.id}</strong></td>
                <td>${r.contractId || '—'}${r.tenderId ? `<div class="table-sub">${r.tenderId}</div>` : ''}</td>
                <td>${r.category}</td>
                <td>${r.renewalFrom || '—'} → ${r.renewalTo || '—'}</td>
                <td><span class="badge badge-${renewalTypeBadge(r.renewalType)}">${r.renewalType}</span></td>
                <td><span class="badge badge-${renewalStatusBadge(r.status)}">${r.status}</span></td>
                <td class="cell-nowrap">${r.value || '—'}</td>
                <td>${(r.documents || []).length}</td>
              </tr>
            `).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No renewal requests for this filter. Use <strong>Raise request</strong> to submit one.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorRenewalExecPage', { hideInfo: true })}
    </section>
  </div>`;
}

function getVendorRenewalRequestById(reqId) {
  return getVendorRenewalRequestRows().find(r => r.id === reqId)
    || (vendorStageState.renewalRequests || []).find(r => r.id === reqId)
    || getVendorSeedRenewalRequests().find(r => r.id === reqId)
    || null;
}

function openVendorRenewalDetail(reqId) {
  const r = getVendorRenewalRequestById(reqId);
  if (!r) return;
  const docs = r.documents || [];
  const rows = [
    ['Request ID', r.id],
    ['Contract', r.contractId || '—'],
    ['Tender / MSA', r.tenderId || '—'],
    ['Category', r.category || '—'],
    ['Detail type', categoryUsesItemWiseDetail(r.category) ? 'Item-wise' : 'Category-wise'],
    ['Renewal from', r.renewalFrom || '—'],
    ['Renewal to', r.renewalTo || '—'],
    ['Submitted on', r.renewalDate || '—'],
    ['Source', r.source === 'vendor' ? 'Raised by vendor' : 'Existing pipeline record']
  ];
  openModal(`${escapeHtmlLite(r.id)} — Renewal request`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Renewal request</p>
        <h3>${escapeHtmlLite(r.remarks || 'Renewal request')}</h3>
        <p>${escapeHtmlLite(r.contractId || '—')} · ${escapeHtmlLite(r.tenderId || '—')} · ${escapeHtmlLite(r.category || '—')}</p>
      </div>
      <span class="badge badge-${renewalStatusBadge(r.status)}">${escapeHtmlLite(r.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Contract</span><strong>${escapeHtmlLite(r.contractId || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Type</span><strong>${escapeHtmlLite(r.renewalType || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Status</span><strong>${escapeHtmlLite(r.status || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Value</span><strong>${escapeHtmlLite(r.value || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(r, {
      stageTitle: `${r.category || 'Category'} · category-wise renewal`,
      noun: 'renewal',
      yesLabel: 'Covered',
      noLabel: 'Not covered',
      yesHint: 'Articles proposed under this renewal scope',
      noHint: 'In category catalogue · outside this renewal request',
      statusHead: 'Renewal status',
      filterLabel: 'Renewal Status',
      headTitle: `${r.category || 'Category'} articles · renewal coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Request summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head"><i class="fa-solid fa-paperclip"></i> Attached documents</div>
      <div class="data-table-wrap bid-article-table-wrap" style="max-height:14rem">
        <table class="data-table data-table--modal">
          <thead><tr><th>Document</th><th>Type</th><th></th></tr></thead>
          <tbody>
            ${docs.length ? docs.map(d => `<tr>
              <td>${escapeHtmlLite(d.name)}</td>
              <td><span class="badge badge-muted">${escapeHtmlLite(d.type || 'Supporting')}</span></td>
              <td>${d.id && String(d.id).startsWith('DOC-REN')
                ? `<button type="button" class="btn btn-outline btn-sm" onclick="downloadRenewalDocument('${escapeHtmlLite(r.id)}','${escapeHtmlLite(d.id)}')"><i class="fa-solid fa-download"></i> Download</button>`
                : (d.file ? `<span class="table-sub">${escapeHtmlLite(d.file)}</span>` : '—')}</td>
            </tr>`).join('') : `<tr><td colspan="3" style="text-align:center;color:#64748b;padding:1rem">No documents attached.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
    </div>
  </div>`, { wide: true, large: true });
}

function openVendorRenewalRequestModal() {
  const contracts = getVendorEligibleRenewalContracts();
  if (!contracts.length) {
    showWfAlert('No Active or In Progress contracts available for renewal.');
    return;
  }
  const options = contracts.map(c => `${c.id} — ${c.title}`);
  const defaultOpt = options[0];
  vendorRenewalExecState.uploadName = vendorStageState.uploads.renewalSupport?.name || null;
  const fromVal = vendorRenewalExecState.draftFrom || '01-04-2027';
  const toVal = vendorRenewalExecState.draftTo || '31-03-2028';
  const remarksVal = vendorRenewalExecState.draftRemarks
    || 'Requesting continuation of rate contract / MSA under existing commercial terms.';

  openModal('Raise renewal request', `<div class="consol-detail-modal">
    <p class="consol-detail-lead">Select an eligible contract or MSA, choose request type, propose the renewal period, and optionally attach a supporting document.</p>
    <div class="form-grid wf-form-grid">
      ${customSelectHTML('Contract / MSA', 'vendorRenContract', options, defaultOpt, true)}
      ${customSelectHTML('Request type', 'vendorRenType', ['Fresh renewal', 'Extra quality order'], 'Fresh renewal', true)}
      ${datePickerHTML('vendorRenFrom', fromVal, 'Renewal from (DD-MM-YYYY)', false)}
      ${datePickerHTML('vendorRenTo', toVal, 'Renewal to (DD-MM-YYYY)', false)}
      <div class="form-group" style="grid-column:1/-1"><label>Reason / remarks</label>
        <textarea id="vendorRenRemarks" rows="3" placeholder="Briefly describe why renewal is required">${escapeHtmlLite(remarksVal)}</textarea>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>Supporting document (optional)</label>
        ${renderInlineUpload({
          id: 'vendorRenUpload',
          title: 'Upload PDF / image',
          hint: 'Justification letter, draft addendum, or supporting note · PDF, JPG, PNG',
          disabled: false,
          fileName: vendorRenewalExecState.uploadName || null,
          onChange: 'onVendorRenewalSupportUpload'
        })}
      </div>
    </div>
    <div class="wf-actions mt-2">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="submitVendorRenewalRequest()">
        <i class="fa-solid fa-paper-plane"></i> Submit request
      </button>
    </div>
  </div>`, { wide: true, large: true });
  initCustomSelects();
}

function onVendorRenewalSupportUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  vendorRenewalExecState.uploadName = file.name;
  vendorStageState.uploads.renewalSupport = { name: file.name, size: file.size || 0 };
  vendorRenewalExecState.draftFrom = document.getElementById('vendorRenFrom')?.value?.trim() || vendorRenewalExecState.draftFrom;
  vendorRenewalExecState.draftTo = document.getElementById('vendorRenTo')?.value?.trim() || vendorRenewalExecState.draftTo;
  vendorRenewalExecState.draftRemarks = document.getElementById('vendorRenRemarks')?.value?.trim() || vendorRenewalExecState.draftRemarks;
  openVendorRenewalRequestModal();
}

function submitVendorRenewalRequest() {
  const contracts = getVendorEligibleRenewalContracts();
  const wrap = document.querySelector('[data-select-id="vendorRenContract"]');
  const label = wrap?.querySelector('.custom-select-value')?.textContent?.trim() || '';
  const contractId = label.split(' — ')[0];
  const contract = contracts.find(c => c.id === contractId) || contracts[0];
  if (!contract) {
    showWfAlert('Select a valid contract / MSA.');
    return;
  }
  const typeWrap = document.querySelector('[data-select-id="vendorRenType"]');
  const renewalType = typeWrap?.querySelector('.custom-select-value')?.textContent?.trim() || 'Fresh renewal';
  const renewalFrom = document.getElementById('vendorRenFrom')?.value?.trim() || '';
  const renewalTo = document.getElementById('vendorRenTo')?.value?.trim() || '';
  const remarks = document.getElementById('vendorRenRemarks')?.value?.trim() || '';
  if (!renewalFrom || !renewalTo) {
    showWfAlert('Enter both renewal from and to dates (DD-MM-YYYY).');
    return;
  }

  const identity = getVendorSessionIdentity();
  const seq = String((vendorStageState.renewalRequests || []).length + 70).padStart(4, '0');
  const id = `VREN-2026-${seq}`;
  const fileName = vendorRenewalExecState.uploadName || vendorStageState.uploads.renewalSupport?.name || null;
  const documents = fileName
    ? [{ id: `DOC-${id}-A`, name: fileName, type: 'Supporting', file: fileName }]
    : [];

  const row = {
    id,
    vendorId: identity.vendorId,
    vendorName: identity.vendorName,
    category: contract.category,
    renewalFrom,
    renewalTo,
    renewalDate: formatDateDMY(APP_TODAY),
    renewalType,
    status: 'Pending finalization',
    contractId: contract.id,
    tenderId: contract.tenderId,
    value: contract.value,
    contact: identity.contact,
    gstin: identity.gstin,
    remarks: remarks || `Vendor-raised ${renewalType.toLowerCase()} for ${contract.title}`,
    documents,
    source: 'vendor',
    title: contract.title
  };

  if (!Array.isArray(vendorStageState.renewalRequests)) vendorStageState.renewalRequests = [];
  vendorStageState.renewalRequests.unshift(row);
  vendorRenewalExecState.uploadName = null;
  vendorStageState.uploads.renewalSupport = null;
  vendorRenewalExecState.draftFrom = null;
  vendorRenewalExecState.draftTo = null;
  vendorRenewalExecState.draftRemarks = null;
  vendorRenewalExecState.page = 1;
  completeVendorStage(10);
  closeModal();
  refreshWorkflowUI();
  showWfAlert(`Request ${id} submitted for Resource Manager review.`, 'success');
}

function getVendorDeliveryExecRows() {
  const rows = filterByCategory(typeof DELIVERIES !== 'undefined' ? DELIVERIES : []);
  return applyStagePeriodFilter(rows, vendorDeliveryExecState, 'date');
}

function setVendorDeliveryExecPage(page) {
  vendorDeliveryExecState.page = Math.max(1, Number(page) || 1);
  refreshWorkflowUI();
}

function renderVendorDeliveryExecTable() {
  const rows = getVendorDeliveryExecRows();
  const paged = paginateItems(rows, vendorDeliveryExecState.page, 10);
  vendorDeliveryExecState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(vendorDeliveryExecState);

  return `<div class="vendor-delivery-exec-table">
    <div class="data-table-wrap mt-2">
      <div class="table-header bid-records-header">
        <h3>Delivery records <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      </div>
      ${renderCompactWfPeriodFilter('vendorDelivery', vendorDeliveryExecState)}
      <table class="data-table">
        <thead><tr><th>Challan ID</th><th>PO</th><th>Category</th><th>Items</th><th>GRN</th><th>Invoice</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(d => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openDeliveryDetail('${d.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDeliveryDetail('${d.id}')}" title="View delivery details">
            <td><strong>${d.id}</strong></td>
            <td>${d.po}</td>
            <td>${d.category}</td>
            <td>${d.items}</td>
            <td><span class="badge badge-${d.grn === 'Accepted' ? 'success' : 'warning'}">${d.grn}</span></td>
            <td>${d.invoice}</td>
            <td><span class="badge badge-${deliveryPaymentBadge(d.payment)}">${d.payment}</span></td>
            <td class="cell-date">${d.date || '—'}</td>
          </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No deliveries match the selected category and period.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorDeliveryExecPage')}
    </div>
  </div>`;
}

function selectVendorContractFromTable(tenderId, contractId) {
  if (!tenderId) return;
  ensureVendorContractPack(tenderId);
  const synced = getVendorContractSyncedPack(tenderId);
  const pack = synced.pack;
  if (synced.loiIssued) pack.loiIssued = true;
  if (synced.loiAccepted) pack.loiAccepted = true;
  if (contractId && !pack.id) pack.id = contractId;
  if (!pack.id && synced.contract?.id) pack.id = synced.contract.id;
  if (!pack.pbgAmount && synced.contract?.pbgAmount) pack.pbgAmount = synced.contract.pbgAmount;
  syncVendorContractStateFromPack(tenderId);
  persistVendorLifecycle();
  refreshWorkflowUI();
  const detail = document.getElementById('wfDetail');
  if (detail) detail.scrollTo?.({ top: 0, behavior: 'smooth' });
  window.scrollTo?.({ top: Math.max(0, (detail?.getBoundingClientRect?.().top || 0) + window.scrollY - 80), behavior: 'smooth' });
}

function renderVendorContractExecTable(opts = {}) {
  const rows = getVendorContractExecRows();
  const paged = paginateItems(rows, vendorContractExecState.page, 10);
  vendorContractExecState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(vendorContractExecState);
  const selectedTenderId = opts.selectedTenderId || vendorStageState.contract?.tenderId || '';
  const categoryOptions = getVendorContractExecCategoryOptions();
  const categorySelected = vendorContractExecState.category === 'all'
    ? 'All categories'
    : vendorContractExecState.category;

  return `<div class="vendor-contract-exec-table vendor-cm-register">
    <div class="vendor-cm-register-head bid-records-header">
      <div>
        <p class="vendor-cm-eyebrow">Register</p>
        <h3>Contracts for execution <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
        <p>Browse and open any contract. Click <strong>Work on tender</strong> to load that pack in the panels above.</p>
      </div>
      <div class="bid-records-category-filter" title="Filter by category">
        <span class="bid-records-category-label">Category</span>
        ${inlineCustomSelectHTML('contractExecCategory', categoryOptions, categorySelected)}
      </div>
    </div>
    ${renderCompactWfPeriodFilter('vendorContract', vendorContractExecState)}
    <div class="data-table-wrap mt-2">
      <table class="data-table">
        <thead><tr><th>Contract ID</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(c => {
            const isActive = selectedTenderId && c.tenderId === selectedTenderId;
            return `<tr class="need-row-clickable${isActive ? ' is-active-contract-row' : ''}" role="button" tabindex="0" onclick="openContractsPoDetail('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openContractsPoDetail('${c.id}')}" title="View contract details">
            <td><strong>${c.id}</strong>${isActive ? '<div class="table-sub">Active pack</div>' : ''}</td>
            <td>${c.tenderId}${c.title ? `<div class="table-sub">${c.title}</div>` : ''}</td>
            <td>${c.category}</td>
            <td class="cell-nowrap">${c.value}</td>
            <td><span class="badge badge-${contractPbgBadge(c.pbg)}">${c.pbg}</span></td>
            <td>${c.delivery}</td>
            <td><span class="badge badge-${contractStatusBadge(c.status)}">${c.status}</span></td>
            <td class="cell-date">${c.date || '—'}</td>
            <td class="cell-nowrap" onclick="event.stopPropagation()">
              <button type="button" class="btn btn-${isActive ? 'primary' : 'outline'} btn-sm" onclick="selectVendorContractFromTable('${c.tenderId}','${c.id}')">
                ${isActive ? 'Working' : 'Work on tender'}
              </button>
            </td>
          </tr>`;
          }).join('') : `<tr><td colspan="9" style="text-align:center;color:#64748b;padding:1.25rem">No contracts match the selected category and period.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorContractExecPage', { hideInfo: true })}
    </div>
  </div>`;
}

function contractPbgBadge(pbg) {
  if (pbg === 'Active') return 'success';
  if (pbg === 'Expiring' || pbg === 'Pending') return 'warning';
  return 'muted';
}

function contractStatusBadge(status) {
  if (status === 'Active') return 'success';
  if (status === 'In Progress') return 'warning';
  return 'info';
}

function renderContracts() {
  const rows = getContractsListRows();
  const paged = paginateItems(rows, contractsListState.page, 10);
  contractsListState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(contractsListState);

  return `<div class="contracts-page">
    <div class="indent-mode-banner">
      <div>
        <strong>${currentRole === 'vendor' ? 'Your contracts — synced from Contract Management' : 'Contracts &amp; POs — supply execution link'}</strong>
        <p class="indent-mode-banner-copy">${currentRole === 'vendor'
          ? 'LOA acknowledgement, PBG, signed T&amp;C, PO and SLA status are the same records Resource Manager sees. Do not re-enter master data.'
          : 'Open a row for summary or use Contract Management for full lifecycle, performance and AI/ML ops.'}</p>
      </div>
    </div>
    <div class="data-table-wrap mt-2 bid-dvdms-table-wrap">
      <div class="table-header">
        <h3>Contracts &amp; POs <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      </div>
      ${renderCompactWfPeriodFilter('contractsList', contractsListState)}
      <table class="data-table">
        <thead><tr><th>Contract ID</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(c => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openContractsPoDetail('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openContractsPoDetail('${c.id}')}" title="View contract details">
            <td><strong>${c.id}</strong></td>
            <td>${c.tenderId}${c.title ? `<div class="table-sub">${c.title}</div>` : ''}</td>
            <td>${c.category}</td>
            <td class="cell-nowrap">${c.value}</td>
            <td><span class="badge badge-${contractPbgBadge(c.pbg)}">${c.pbg}</span></td>
            <td>${c.delivery}</td>
            <td><span class="badge badge-${contractStatusBadge(c.status)}">${c.status}</span></td>
            <td class="cell-date">${c.date || '—'}</td>
          </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No contracts match the selected category and period.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setContractsListPage', { hideInfo: true })}
    </div>
  </div>`;
}

function openContractsPoDetail(contractId) {
  const c = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(x => x.id === contractId);
  if (!c) return;
  const enriched = typeof enrichContractForMgmt === 'function' ? enrichContractForMgmt(c) : c;
  const tender = (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === c.tenderId);
  const followUpFooter = currentRole === 'gov'
    ? `<button type="button" class="btn btn-primary" onclick="openContractsFollowUp('${c.id}')"><i class="fa-solid fa-envelope-open-text"></i> Take Follow-up</button>`
    : '';
  const canDownloadPo = canDownloadContractPurchaseOrder(c);
  const downloadBtn = canDownloadPo
    ? `<button type="button" class="btn btn-primary" onclick="downloadContractPurchaseOrder('${c.id}')">
          <i class="fa-solid fa-file-pdf"></i> Download Purchase Order
        </button>`
    : '';
  const itemWise = categoryUsesItemWiseDetail(c.category);
  let coveredItems = resolveLifecycleCoveredItems({
    tenderId: c.tenderId,
    category: c.category,
    coveredItems: c.coveredItems || c.contractItems || enriched.coveredItems
  });
  if (!coveredItems.length && tender) {
    coveredItems = getTenderScopeItemNames(tender);
  }
  if (!coveredItems.length && itemWise) {
    coveredItems = getTenderScopeItemNames({ id: c.tenderId, category: c.category, value: c.value, title: c.title });
  }
  const coverageRow = {
    category: c.category,
    tenderId: c.tenderId,
    contractId: c.id,
    value: c.value,
    coveredItems,
    categoryScope: `This ${c.category} contract is executed at category level. Line-item article schedules are not published for Services / Others packages.`
  };
  const cov = itemWise ? getLifecycleArticleCoverage(coverageRow) : null;
  const summaryRows = [
    ['Contract ID', c.id],
    ['Linked PO', c.poId || '—'],
    ['LOI / LOA', `${enriched.loiNo || '—'} · Ack: ${enriched.loiAck || '—'}`],
    ['Tender', c.tenderId || '—'],
    ['Title', c.title || '—'],
    ['Vendor', c.vendor || '—'],
    ['Category', c.category || '—'],
    ['Detail type', itemWise ? 'Item-wise' : 'Category-wise'],
    ['Division', c.division || '—'],
    ['PBG amount', c.pbgAmount || '—'],
    ['Delivery', c.delivery || '—'],
    ['Period', `${c.startDate || '—'} → ${c.endDate || '—'}`],
    ['Contract date', c.date || '—']
  ];
  if (cov) {
    summaryRows.push(['Articles in contract', `${cov.coveredCount} of ${cov.total}`]);
  }

  openModal(`${escapeHtmlLite(c.id)} — Contract details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Contract details</p>
        <h3>${escapeHtmlLite(c.title || 'Contract')}</h3>
        <p>${escapeHtmlLite(c.tenderId || '—')} · ${escapeHtmlLite(c.category || '—')}${enriched.lifecycleStage ? ` · ${escapeHtmlLite(enriched.lifecycleStage)}` : ''}</p>
      </div>
      <span class="badge badge-${contractStatusBadge(c.status)}">${escapeHtmlLite(c.status || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>Value</span><strong>${escapeHtmlLite(c.value || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>PBG</span><strong>${escapeHtmlLite(c.pbg || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Delivery</span><strong>${escapeHtmlLite(c.delivery || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Contract date</span><strong>${escapeHtmlLite(c.date || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(coverageRow, {
      stageTitle: `${c.category || 'Category'} · category-wise contract`,
      noun: 'contract',
      yesLabel: 'In contract',
      noLabel: 'Not in contract',
      yesHint: 'Articles covered under this contract / PO schedule',
      noHint: 'In category catalogue · not part of this contract',
      statusHead: 'Contract scope',
      filterLabel: 'Contract Status',
      headTitle: `${c.category || 'Category'} articles · coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">Contract &amp; PO summary</div>
      <table class="dvdms-detail-table">
        <tbody>
          ${summaryRows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${c.remarks ? `<p class="dvdms-detail-note">${escapeHtmlLite(c.remarks)}</p>` : ''}
    ${canDownloadPo ? `<p class="dvdms-detail-note"><i class="fa-solid fa-circle-info"></i> Contract is <strong>Active</strong> with delivery <strong>Completed</strong> — Purchase Order (MPPHCL format) is available to download.</p>` : ''}
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${currentRole === 'gov' && typeof openContractMgmtDetail === 'function' ? `<button type="button" class="btn btn-outline" onclick="openContractMgmtDetail('${c.id}')"><i class="fa-solid fa-file-signature"></i> Full Contract Mgmt</button>` : ''}
      ${downloadBtn}
      ${followUpFooter}
    </div>
  </div>`, { wide: true, large: true });
}

function canDownloadContractPurchaseOrder(c) {
  if (!c) return false;
  const statusOk = String(c.status || '').trim().toLowerCase() === 'active';
  const deliveryOk = String(c.delivery || '').trim().toLowerCase() === 'completed';
  return statusOk && deliveryOk;
}

function downloadContractPurchaseOrder(contractId) {
  const c = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(x => x.id === contractId);
  if (!c || !canDownloadContractPurchaseOrder(c)) {
    showWfAlert('Purchase Order download is available only when Status is <strong>Active</strong> and Delivery is <strong>Completed</strong>.');
    return;
  }
  const poNo = c.poId || c.id;
  confirmDocumentDownload({
    title: 'Confirm Purchase Order download',
    docLabel: `Purchase Order ${poNo}`,
    formatLabel: 'PDF · MPPHCL template',
    fileHint: 'Filled MPPHCL Purchase Order for this Active / Completed contract',
    execute: (mode) => performContractPurchaseOrderDownload(c, mode)
  });
}

function getContractPoLineItems(c) {
  const deliveries = (typeof DELIVERIES !== 'undefined' ? DELIVERIES : [])
    .filter(d => d.po === c.poId || (c.poId && String(d.po) === String(c.poId)));
  if (deliveries.length) {
    return deliveries.map((d, i) => ({
      no: (i + 1) * 10,
      desc: d.items || c.title || 'Supply against rate contract',
      hsn: c.category === 'Drugs' ? '3004' : c.category === 'Equipment' ? '9018' : c.category === 'Services' ? '9983' : '6307',
      rev: '00',
      qty: d.qty || '1',
      uom: 'Lot',
      unitPrice: d.amount || c.value,
      per: 'Lot',
      basic: d.amount || c.value,
      deliveryDate: d.date || c.date || '',
      freight: 'Inclusive',
      discount: '—',
      taxable: d.amount || c.value,
      gst: 'As applicable'
    }));
  }
  return [{
    no: 10,
    desc: `${c.title || 'Supply'} — against ${c.tenderId}`,
    hsn: c.category === 'Drugs' ? '3004' : c.category === 'Equipment' ? '9018' : c.category === 'Services' ? '9983' : '6307',
    rev: '00',
    qty: '1',
    uom: 'Lot',
    unitPrice: c.value,
    per: 'Lot',
    basic: c.value,
    deliveryDate: c.endDate || c.date || '',
    freight: 'Inclusive',
    discount: '—',
    taxable: c.value,
    gst: 'As applicable'
  }];
}

function amountInWordsFromContract(c) {
  const raw = String(c.value || '').replace(/[₹,\s]/g, '');
  if (/cr/i.test(String(c.value))) return `Rupees ${raw.replace(/cr/i, '').trim()} Crore only`;
  if (/l/i.test(String(c.value))) return `Rupees ${raw.replace(/l/i, '').trim()} Lakh only`;
  return `Rupees ${c.value || '—'} only`;
}

function buildMpphclPurchaseOrderSheetHtml(c) {

  const poNo = c.poId || c.id;
  const lines = getContractPoLineItems(c);
  const vendor = c.vendor || 'MediSupply India Pvt Ltd';
  const division = c.division || 'Bhopal';
  const poDate = c.date || formatDateDMY(APP_TODAY);
  const requiredBy = c.endDate || c.date || '';
  const email = getRegisteredDownloadEmail();
  const netTotal = c.value || '—';
  const words = amountInWordsFromContract(c);

  const itemRows = [];

  for (let i = 0; i < 3; i++) {

    const n = (i + 1) * 10;
    const r = lines[i];

    if (r) {

      itemRows.push(`
        <tr>
          <td class="c">${escapeHtmlLite(r.no)}</td>
          <td class="l item-desc">${escapeHtmlLite(r.desc)}</td>
          <td class="c">${escapeHtmlLite(r.hsn)}</td>
          <td class="c">${escapeHtmlLite(r.rev)}</td>
          <td class="c">${escapeHtmlLite(String(r.qty))}</td>
          <td class="c">${escapeHtmlLite(r.uom)}</td>
          <td class="r">${escapeHtmlLite(String(r.unitPrice))}</td>
          <td class="c">${escapeHtmlLite(r.per)}</td>
          <td class="r">${escapeHtmlLite(String(r.basic))}</td>
          <td class="c">${escapeHtmlLite(r.deliveryDate)}</td>
          <td class="c">${escapeHtmlLite(r.freight)}</td>
          <td class="c">${escapeHtmlLite(r.discount)}</td>
        </tr>
      `);

    } else {

      itemRows.push(`
        <tr class="empty">
          <td class="c">${n}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `);

    }
  }

  return `

<style>

/* =========================================================
   MPPHCL PURCHASE ORDER
   A4 PORTRAIT / PRINT DOCUMENT
   ========================================================= */

.po-sheet {
  width: 794px;
  min-height: 1123px;

  margin: 0;
  padding: 9px 10px 7px;

  box-sizing: border-box;

  background: #ffffff;
  color: #111111;

  font-family: Arial, Helvetica, sans-serif;
  font-size: 8px;
  line-height: 1.08;

  border: 1px solid #222;

  overflow: hidden;
}

.po-sheet *,
.po-sheet *::before,
.po-sheet *::after {
  box-sizing: border-box;
}


/* =========================================================
   HEADER
   ========================================================= */

.po-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  min-height: 38px;

  border-bottom: 1px solid #222;

  padding-bottom: 4px;
}

.po-brand {
  font-size: 15px;
  line-height: 1;

  font-weight: 800;

  color: #244a78;

  letter-spacing: 0.02em;
}

.po-brand-sub {
  margin-top: 2px;

  font-size: 7px;

  font-weight: 600;

  color: #222;

  max-width: 430px;
}

.po-title {
  padding-top: 1px;

  font-size: 15px;

  line-height: 1;

  font-weight: 800;

  letter-spacing: 0.04em;

  text-align: right;

  white-space: nowrap;
}


/* =========================================================
   REGISTERED OFFICE
   ========================================================= */

.po-office {
  display: flex;
  align-items: center;
  gap: 5px;

  min-height: 22px;

  border-bottom: 1px solid #222;

  padding: 3px 2px;

  font-size: 6.8px;

  white-space: nowrap;
}

.po-office .office-label {
  font-weight: 700;
}

.po-office .u {
  flex: 1;

  border-bottom: 1px solid #555;

  padding: 0 2px;

  min-width: 0;
}

.po-office .gst-label {
  font-weight: 700;
}

.po-office .u-sm {
  flex: 0 0 105px;
}


/* =========================================================
   COMMON SECTION HEADERS
   ========================================================= */

.po-section-title {
  margin: 0;

  font-size: 8px;

  font-weight: 800;
}


/* =========================================================
   INVOICE / SUPPLIER
   ========================================================= */

.po-2col {
  display: flex;
  width: 100%;
  border: 1px solid #222;
  margin-top: 4px;
}

.po-2col > div {
  width: 50%;
  padding: 4px 6px;
  min-width: 0;
}

.po-2col > div + div {
  border-left: 1px solid #222;
}

.po-2col h4 {
  margin: 0 0 3px;

  font-size: 8px;

  font-weight: 800;
}


/* =========================================================
   UNDERLINE FIELDS
   ========================================================= */

.po-line {
  display: flex;

  align-items: baseline;

  min-height: 12px;

  margin: 0;
}

.po-line .lbl {

  flex: 0 0 auto;

  font-weight: 700;

  white-space: nowrap;

  margin-right: 3px;
}

.po-line .val {

  flex: 1;

  min-width: 0;

  min-height: 10px;

  padding: 0 2px;

  border-bottom: 1px solid #777;

  font-weight: 500;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}


/* =========================================================
   PO META
   ========================================================= */

.po-meta {
  display: flex;
  width: 100%;
  border: 1px solid #222;
  border-top: 0;
}

.po-meta-col {
  width: 50%;
  min-width: 0;
}

.po-meta-col + .po-meta-col {
  border-left: 1px solid #222;
}

.po-kv {
  display: flex;
  align-items: center;
  min-height: 14px;
  padding: 1px 5px;
  border-bottom: 1px solid #d0d0d0;
}

.po-kv:last-child {
  border-bottom: 0;
}

.po-kv .k {
  flex: 0 0 100px;
  font-weight: 700;
  white-space: nowrap;
}

.po-kv .v {
  flex: 1;
  min-width: 0;
  min-height: 10px;
  padding: 0 2px;
  border-bottom: 1px solid #777;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}


/* =========================================================
   SHIP TO / TERMS
   ========================================================= */

.po-terms {
  display: flex;
  width: 100%;
  border: 1px solid #222;
  border-top: 0;
}

.po-terms > div {
  width: 50%;
  min-width: 0;
  padding: 4px 6px;
}

.po-terms > div + div {
  border-left: 1px solid #222;
}

.po-terms h4 {

  margin: 0 0 3px;

  font-size: 8px;

  font-weight: 800;
}


/* =========================================================
   ITEMS TABLE
   ========================================================= */

.po-items {

  width: 100%;

  margin-top: 4px;

  border-collapse: collapse;

  table-layout: fixed;

  font-size: 6.7px;

  line-height: 1.05;
}

.po-items th,
.po-items td {

  border: 1px solid #222;

  padding: 2px 2px;

  vertical-align: middle;

  word-break: break-word;

  overflow: hidden;
}

.po-items th {

  height: 29px;

  background: #d5d9df;

  font-weight: 800;

  text-align: center;

  line-height: 1.05;
}

.po-items td {

  height: 21px;

  background: #fff;
}

.po-items td.c {
  text-align: center;
}

.po-items td.r {
  text-align: right;

  white-space: nowrap;
}

.po-items td.l {
  text-align: left;
}

.po-items td.item-desc {

  line-height: 1.1;

  word-break: normal;
}

.po-items tr.empty td {

  height: 22px;
}


/* Exact column proportions */

.po-items col.c-no {
  width: 5%;
}

.po-items col.c-desc {
  width: 25%;
}

.po-items col.c-hsn {
  width: 6.5%;
}

.po-items col.c-rev {
  width: 5%;
}

.po-items col.c-qty {
  width: 6%;
}

.po-items col.c-uom {
  width: 5%;
}

.po-items col.c-price {
  width: 8.5%;
}

.po-items col.c-per {
  width: 4.5%;
}

.po-items col.c-basic {
  width: 9%;
}

.po-items col.c-del {
  width: 8%;
}

.po-items col.c-fr {
  width: 7.5%;
}

.po-items col.c-disc {
  width: 5.5%;
}


/* =========================================================
   TOTALS
   ========================================================= */

.po-totals {

  width: 100%;

  border-collapse: collapse;

  margin-top: -1px;

  font-size: 7px;
}

.po-totals td {

  height: 18px;

  border: 1px solid #222;

  padding: 2px 5px;
}

.po-totals td.lbl {

  width: 22%;

  font-weight: 700;
}

.po-totals td.amt {

  width: 19.5%;

  text-align: right;

  font-weight: 600;
}

.po-totals tr.net td {

  background: #d5d9df;

  font-weight: 800;
}


/* =========================================================
   AMOUNT IN WORDS
   ========================================================= */

.po-words {

  display: flex;

  align-items: baseline;

  gap: 4px;

  margin-top: 4px;

  font-size: 7.5px;

  min-height: 17px;
}

.po-words strong {

  white-space: nowrap;

  font-weight: 800;
}

.po-words .fill {

  flex: 1;

  min-width: 0;

  border-bottom: 1px solid #555;

  padding: 0 3px;

  font-weight: 600;

  white-space: nowrap;

  overflow: hidden;

  text-overflow: ellipsis;
}


/* =========================================================
   SPECIAL INSTRUCTIONS
   ========================================================= */

.po-instr {

  margin-top: 4px;

  border: 1px solid #222;

  padding: 4px 6px;

  font-size: 7px;

  line-height: 1.15;
}

.po-instr h4 {

  margin: 0 0 3px;

  font-size: 7.5px;

  font-weight: 800;
}

.po-instr ol {

  margin: 0 0 0 15px;

  padding: 0;
}

.po-instr li {

  margin: 1px 0;
}


/* =========================================================
   SIGNATURE BLOCK
   ========================================================= */

.po-sign {
  display: flex;
  width: 100%;
  margin-top: 4px;
  border: 1px solid #222;
}

.po-sign > div {
  width: 33.333%;
  min-width: 0;
  min-height: 91px;
  padding-bottom: 3px;
}

.po-sign > div + div {
  border-left: 1px solid #222;
}

.po-sign h4 {

  margin: 0;

  padding: 3px 5px;

  background: #d5d9df;

  border-bottom: 1px solid #222;

  font-size: 7.5px;

  font-weight: 800;
}

.po-sign .body {

  padding: 3px 6px;

  font-size: 7px;
}

.po-sign p {

  margin: 5px 0;

  white-space: nowrap;
}


/* =========================================================
   AUTHORIZED SIGNATORY
   ========================================================= */

.po-auth {

  margin-top: 2px;

  padding-right: 3px;

  text-align: right;

  font-size: 7px;

  font-weight: 800;
}


/* =========================================================
   TEMPLATE WARNING
   ========================================================= */

.po-note {

  margin-top: 3px;

  text-align: center;

  color: #b54b4b;

  font-size: 5.8px;

  line-height: 1.1;
}


/* =========================================================
   PRINT
   ========================================================= */

@media print {

  @page {

    size: A4 portrait;

    margin: 0;
  }

  html,
  body {

    margin: 0 !important;

    padding: 0 !important;

    background: #fff !important;
  }

  .po-sheet {

    width: 794px;

    min-height: 1123px;

    margin: 0;

    border: 1px solid #222;

    box-shadow: none;
  }
}


/* =========================================================
   SCREEN PREVIEW
   ========================================================= */

@media screen {

  .po-sheet {
    box-shadow: none;
  }
}

</style>


<div class="po-sheet" id="mpphclPoSheet">


  <!-- =====================================================
       HEADER
       ===================================================== -->

  <div class="po-top">

    <div>

      <div class="po-brand">
        MPPHCL
      </div>

      <div class="po-brand-sub">
        Madhya Pradesh Public Health Services Corporation Limited
      </div>

    </div>

    <div class="po-title">
      PURCHASE ORDER
    </div>

  </div>


  <!-- =====================================================
       REGISTERED OFFICE
       ===================================================== -->

  <div class="po-office">

    <span class="office-label">
      Registered Office:
    </span>

    <span class="u">
      First Floor, MP Oil Fed Premises, 01 Arera Hills, Bhopal 462011 (M.P.)
    </span>

    <span class="gst-label">
      GSTIN:
    </span>

    <span class="u u-sm">
      23AABCM3986N1ZS
    </span>

  </div>


  <!-- =====================================================
       INVOICE / SUPPLIER
       ===================================================== -->

  <div class="po-2col">

    <!-- INVOICE TO -->

    <div>

      <h4>Invoice To:</h4>

      <div class="po-line">
        <span class="lbl">Company:</span>
        <span class="val">MPPHCL</span>
      </div>

      <div class="po-line">
        <span class="lbl">Address:</span>
        <span class="val">
          First Floor, MP Oil Fed Premises, 01 Arera Hills
        </span>
      </div>

      <div class="po-line">
        <span class="lbl"></span>
        <span class="val">
          Bhopal 462011 (M.P.)
        </span>
      </div>

      <div class="po-line">

        <span class="lbl">
          GSTIN:
        </span>

        <span class="val" style="flex:0 0 37%;">
          23AABCM3986N1ZS
        </span>

        <span class="lbl" style="margin-left:5px;">
          State Code:
        </span>

        <span class="val" style="flex:0 0 15%;">
          23
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Contact:
        </span>

        <span class="val" style="flex:0 0 32%;">
          Procurement Cell
        </span>

        <span class="lbl" style="margin-left:5px;">
          Phone:
        </span>

        <span class="val">
          0755-2578911
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Email:
        </span>

        <span class="val">
          itcell-mpphscl[AT]mp[DOT]gov[DOT]in
        </span>

      </div>

    </div>


    <!-- SUPPLIER -->

    <div>

      <h4>Supplier:</h4>

      <div class="po-line">

        <span class="lbl">
          Supplier Code:
        </span>

        <span class="val">
          VND-MP-000123
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Name:
        </span>

        <span class="val">
          ${escapeHtmlLite(vendor)}
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Address:
        </span>

        <span class="val">
          Registered vendor address on file
        </span>

      </div>

      <div class="po-line">

        <span class="lbl"></span>

        <span class="val">
          ${escapeHtmlLite(division)} Division, Madhya Pradesh
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          GSTIN:
        </span>

        <span class="val" style="flex:0 0 37%;">
          23AABCM9988B1Z2
        </span>

        <span class="lbl" style="margin-left:5px;">
          State Code:
        </span>

        <span class="val" style="flex:0 0 15%;">
          23
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Contact / Email:
        </span>

        <span class="val">
          ${escapeHtmlLite(email)}
        </span>

      </div>

    </div>

  </div>


  <!-- =====================================================
       PO META
       ===================================================== -->

  <div class="po-meta">

    <div class="po-meta-col">

      <div class="po-kv">
        <div class="k">PO No.</div>
        <div class="v">${escapeHtmlLite(poNo)}</div>
      </div>

      <div class="po-kv">
        <div class="k">Document Type</div>
        <div class="v">Purchase Order</div>
      </div>

      <div class="po-kv">
        <div class="k">Indent / PR No.</div>
        <div class="v">—</div>
      </div>

      <div class="po-kv">
        <div class="k">Buyer / Officer</div>
        <div class="v">Resource Manager / Procurement Cell</div>
      </div>

      <div class="po-kv">
        <div class="k">Department</div>
        <div class="v">
          MPPHCL · ${escapeHtmlLite(c.category)}
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Project / Unit</div>
        <div class="v">
          ${escapeHtmlLite(division)} Division
        </div>
      </div>

    </div>


    <div class="po-meta-col">

      <div class="po-kv">
        <div class="k">PO Date</div>
        <div class="v">
          ${escapeHtmlLite(poDate)}
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Tender / RC No.</div>
        <div class="v">
          ${escapeHtmlLite(c.tenderId)}
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Contract / LOA No.</div>
        <div class="v">
          ${escapeHtmlLite(c.id)}
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Phone</div>
        <div class="v">
          0755-2578911
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Email</div>
        <div class="v">
          itcell-mpphscl[AT]mp[DOT]gov[DOT]in
        </div>
      </div>

      <div class="po-kv">
        <div class="k">Budget Head</div>
        <div class="v">
          DoPHFW / MPPHCL · ${escapeHtmlLite(c.category)}
        </div>
      </div>

    </div>

  </div>


  <!-- =====================================================
       SHIP TO / COMMERCIAL TERMS
       ===================================================== -->

  <div class="po-terms">

    <div>

      <h4>Ship To / Consignee:</h4>

      <div class="po-line">

        <span class="lbl">
          Facility / Plant:
        </span>

        <span class="val">
          Central / District Warehouse · ${escapeHtmlLite(division)}
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Address:
        </span>

        <span class="val">
          As per delivery schedule under contract ${escapeHtmlLite(c.id)}
        </span>

      </div>

      <div class="po-line">

        <span class="lbl"></span>

        <span class="val">
          ${escapeHtmlLite(division)}, Madhya Pradesh
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          GSTIN:
        </span>

        <span class="val" style="flex:0 0 37%;">
          23AABCM3986N1ZS
        </span>

        <span class="lbl" style="margin-left:5px;">
          State Code:
        </span>

        <span class="val" style="flex:0 0 15%;">
          23
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Contact Person:
        </span>

        <span class="val">
          Stores Officer · ${escapeHtmlLite(division)}
        </span>

      </div>

    </div>


    <div>

      <h4>Commercial &amp; Delivery Terms:</h4>

      <div class="po-line">

        <span class="lbl">
          Currency:
        </span>

        <span class="val">
          INR
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Required Delivery Date:
        </span>

        <span class="val">
          ${escapeHtmlLite(requiredBy)}
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Payment Terms:
        </span>

        <span class="val">
          As per contract / rate contract terms
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Mode of Transport:
        </span>

        <span class="val">
          Vendor arrangement
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Freight / Insurance:
        </span>

        <span class="val">
          Inclusive (unless otherwise stated)
        </span>

      </div>

      <div class="po-line">

        <span class="lbl">
          Incoterms / Delivery Basis:
        </span>

        <span class="val">
          Door delivery · GRN acceptance
        </span>

      </div>

    </div>

  </div>


  <!-- =====================================================
       ITEM TABLE
       ===================================================== -->

  <table class="po-items">

    <colgroup>

      <col class="c-no">
      <col class="c-desc">
      <col class="c-hsn">
      <col class="c-rev">
      <col class="c-qty">
      <col class="c-uom">
      <col class="c-price">
      <col class="c-per">
      <col class="c-basic">
      <col class="c-del">
      <col class="c-fr">
      <col class="c-disc">

    </colgroup>

    <thead>

      <tr>

        <th>Item<br>No.</th>

        <th>
          Material / Equipment Description<br>
          Specification / Drawing No.
        </th>

        <th>
          HSN /<br>SAC
        </th>

        <th>
          Rev.<br>No.
        </th>

        <th>Qty.</th>

        <th>UOM</th>

        <th>
          Unit Price<br>(₹)
        </th>

        <th>Per</th>

        <th>
          Basic Amount<br>(₹)
        </th>

        <th>
          Delivery<br>Date
        </th>

        <th>
          Freight /<br>Packing
        </th>

        <th>
          Discount
        </th>

      </tr>

    </thead>

    <tbody>

      ${itemRows.join('')}

    </tbody>

  </table>


  <!-- =====================================================
       TOTALS
       ===================================================== -->

  <table class="po-totals">

    <tr>

      <td class="lbl">
        Total
      </td>

      <td class="amt">
        ${escapeHtmlLite(netTotal)}
      </td>

      <td class="amt"></td>
      <td class="amt"></td>
      <td class="amt"></td>

    </tr>

    <tr>

      <td class="lbl">
        Freight / Packing
      </td>

      <td class="amt">
        Inclusive
      </td>

      <td class="amt"></td>
      <td class="amt"></td>
      <td class="amt"></td>

    </tr>

    <tr>

      <td class="lbl">
        Discount
      </td>

      <td class="amt">
        —
      </td>

      <td class="amt"></td>
      <td class="amt"></td>
      <td class="amt"></td>

    </tr>

    <tr>

      <td class="lbl">
        Taxable Value / GST
      </td>

      <td class="amt">
        As applicable
      </td>

      <td class="amt"></td>
      <td class="amt"></td>
      <td class="amt"></td>

    </tr>

    <tr class="net">

      <td class="lbl">
        Net Total
      </td>

      <td class="amt">
        ${escapeHtmlLite(netTotal)}
      </td>

      <td class="amt"></td>
      <td class="amt"></td>
      <td class="amt"></td>

    </tr>

  </table>


  <!-- =====================================================
       AMOUNT IN WORDS
       ===================================================== -->

  <div class="po-words">

    <strong>
      Amount in Words:
    </strong>

    <span class="fill">
      ${escapeHtmlLite(words)}
    </span>

  </div>


  <!-- =====================================================
       SPECIAL INSTRUCTIONS
       ===================================================== -->

  <div class="po-instr">

    <h4>
      Special Instructions / Terms:
    </h4>

    <ol>

      <li>
        ${escapeHtmlLite(
          c.remarks ||
          'Supply strictly as per approved tender / rate contract specifications.'
        )}
      </li>

      <li>
        Delivery:
        ${escapeHtmlLite(c.delivery)}
        · Status:
        ${escapeHtmlLite(c.status)}
        · PBG:
        ${escapeHtmlLite(c.pbg)}
        (${escapeHtmlLite(c.pbgAmount || '—')}).
      </li>

      <li>
        Payment subject to GRN / invoice matching and contractual deductions, if any.
      </li>

      <li>
        This Purchase Order is issued against Contract / LOA
        ${escapeHtmlLite(c.id)}
        / Tender
        ${escapeHtmlLite(c.tenderId)}.
      </li>

    </ol>

  </div>


  <!-- =====================================================
       SIGNATURES
       ===================================================== -->

  <div class="po-sign">

    <!-- PREPARED BY -->

    <div>

      <h4>
        Prepared By
      </h4>

      <div class="body">

        <p>
          Signature: __________________________
        </p>

        <p>
          Name: Resource Manager
        </p>

        <p>
          Designation: Procurement Cell
        </p>

        <p>
          Date: ${escapeHtmlLite(formatDateDMY(APP_TODAY))}
        </p>

      </div>

    </div>


    <!-- FINANCE -->

    <div>

      <h4>
        Checked / Finance Concurrence
      </h4>

      <div class="body">

        <p>
          Signature: __________________________
        </p>

        <p>
          Name: _______________________________
        </p>

        <p>
          Designation: Finance Wing
        </p>

        <p>
          Date: ____ / ____ / __________
        </p>

      </div>

    </div>


    <!-- AUTHORITY -->

    <div>

      <h4>
        For MPPHCL
      </h4>

      <div class="body">

        <p>
          Signature: __________________________
        </p>

        <p>
          Name: _______________________________
        </p>

        <p>
          Designation: Competent Authority
        </p>

        <p>
          Date: ____ / ____ / __________
        </p>

      </div>

    </div>

  </div>


  <div class="po-auth">
    Authorized Signatory &amp; Seal
  </div>


  <div class="po-note">
    Blank configurable template. Validate MPPHCL legal name, address,
    logo, tax details, approval hierarchy and contractual clauses before official use.
  </div>


</div>

`;
}


function performContractPurchaseOrderDownload(c, mode) {
  const poNo = c.poId || c.id;
  const filename = `${poNo}_MPPHCL_Purchase_Order.pdf`;

  if (typeof html2pdf === 'undefined') {
    return Promise.reject(new Error('html2pdf unavailable'));
  }

  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'width:794px',
      'background:#ffffff',
      'z-index:-9999',
      'pointer-events:none'
    ].join(';');
    host.innerHTML = buildMpphclPurchaseOrderSheetHtml(c);
    document.body.appendChild(host);

    const sheet = host.querySelector('#mpphclPoSheet') || host.firstElementChild;
    const finish = () => { try { host.remove(); } catch (_) { /* ignore */ } };

    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.88 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: 794,
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: [] }
    };

    // Build blob first, then trigger download — only then resolve (success modal waits on this).
    html2pdf()
      .set(opt)
      .from(sheet)
      .outputPdf('blob')
      .then((blob) => {
        finish();
        if (!blob) throw new Error('Empty PDF blob');
        downloadBlobFile(blob, filename);
        // Give the browser a beat to start the download before success UI
        setTimeout(() => resolve(blob), 200);
      })
      .catch((err) => {
        console.error(err);
        finish();
        reject(err);
      });
  });
}
function openContractsFollowUp(contractId) {
  if (currentRole !== 'gov') return;
  const c = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(x => x.id === contractId);
  if (!c) return;
  const fromName = authUser?.name || 'Resource Manager';
  openModal(`Take Follow-up — ${c.id}`, `<div class="kpi-detail">
    <p class="need-row-detail-lead">Follow up on <strong>${c.title || c.id}</strong> (${c.tenderId}).</p>
    <div class="form-grid">
      <div class="form-group"><label>From</label><input type="text" value="${fromName}" readonly></div>
      <div class="form-group"><label>Regarding</label><input type="text" value="${c.id} · ${c.poId || c.tenderId}" readonly></div>
      <div class="form-group full"><label>Message</label>
        <textarea id="contractsFollowUpMsg" rows="4" placeholder="Describe the follow-up action required (PBG, delivery milestone, invoice, etc.)"></textarea>
      </div>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button type="button" class="btn btn-primary" onclick="submitContractsFollowUp('${c.id}')"><i class="fa-solid fa-paper-plane"></i> Send follow-up</button>
    </div>
  </div>`, { wide: true });
}

function submitContractsFollowUp(contractId) {
  const msg = document.getElementById('contractsFollowUpMsg')?.value?.trim();
  if (!msg) {
    showWfAlert('Please enter a follow-up message before sending.');
    return;
  }
  openModal('Follow-up sent', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Follow-up on <strong>${contractId}</strong> has been recorded and notified to the mapped officials.</p></div>
  </div>`);
}

function renderDelivery() {
  const rows = getDeliveryListRows();
  const paged = paginateItems(rows, deliveryListState.page, 10);
  deliveryListState.page = paged.page;
  const periodLabel = getWfPeriodFilterLabel(deliveryListState);

  return `<div class="delivery-page">
    <div class="data-table-wrap bid-dvdms-table-wrap">
      <div class="table-header">
        <h3>Delivery &amp; Invoices <span class="meta-chip" style="margin:0">${escapeHtmlLite(periodLabel)}</span></h3>
      </div>
      ${renderCompactWfPeriodFilter('deliveryList', deliveryListState)}
      <table class="data-table">
        <thead><tr><th>Delivery Challan ID</th><th>PO Reference</th><th>Category</th><th>Items</th><th>GRN Status</th><th>Invoice</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(d => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openDeliveryDetail('${d.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDeliveryDetail('${d.id}')}" title="View delivery details">
            <td><strong>${d.id}</strong></td>
            <td>${d.po}</td>
            <td>${d.category}</td>
            <td>${d.items}</td>
            <td><span class="badge badge-${d.grn === 'Accepted' ? 'success' : 'warning'}">${d.grn}</span></td>
            <td>${d.invoice}</td>
            <td><span class="badge badge-${deliveryPaymentBadge(d.payment)}">${d.payment}</span></td>
            <td class="cell-date">${d.date || '—'}</td>
          </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No deliveries match the selected category and period.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setDeliveryListPage', { hideInfo: true })}
    </div>
  </div>`;
}

function getDeliveryListRows() {
  let rows = filterByCategory(typeof DELIVERIES !== 'undefined' ? DELIVERIES : []);
  return applyStagePeriodFilter(rows, deliveryListState, 'date');
}

function setDeliveryListPage(page) {
  deliveryListState.page = Math.max(1, Number(page) || 1);
  renderPage();
}

function deliveryPaymentBadge(payment) {
  if (payment === 'Paid') return 'success';
  if (payment === 'Processing') return 'warning';
  return 'muted';
}

function openDeliveryDetail(deliveryId) {
  const d = (typeof DELIVERIES !== 'undefined' ? DELIVERIES : []).find(x => x.id === deliveryId);
  if (!d) return;
  const followUpHead = currentRole === 'gov'
    ? `<button type="button" class="btn btn-primary btn-sm" onclick="openDeliveryFollowUp('${d.id}')">
          <i class="fa-solid fa-envelope-open-text"></i> Take Follow-up
        </button>`
    : '';
  const followUpFooter = currentRole === 'gov'
    ? `<button type="button" class="btn btn-primary" onclick="openDeliveryFollowUp('${d.id}')"><i class="fa-solid fa-envelope-open-text"></i> Take Follow-up</button>`
    : '';
  const contract = (typeof CONTRACTS !== 'undefined' ? CONTRACTS : []).find(c => c.poId === d.po);
  const tenderId = d.tenderId || contract?.tenderId || '';
  const tender = tenderId ? (typeof TENDERS !== 'undefined' ? TENDERS : []).find(t => t.id === tenderId) : null;
  let coveredItems = resolveLifecycleCoveredItems({
    tenderId,
    category: d.category,
    coveredItems: d.coveredItems || d.deliveredItems
  });
  if (!coveredItems.length && tender) {
    coveredItems = getTenderScopeItemNames(tender);
  }
  if (!coveredItems.length && categoryUsesItemWiseDetail(d.category)) {
    coveredItems = getTenderScopeItemNames({ id: tenderId, category: d.category, value: d.amount, title: d.items });
  }
  const row = {
    ...d,
    tenderId,
    value: d.amount,
    coveredItems,
    categoryScope: `This ${d.category} delivery is tracked at category level. Line-item article schedules are not published for Services / Others packages.`
  };
  const rows = [
    ['Delivery Challan ID', d.id],
    ['PO Reference', d.po],
    ['Items', d.items || '—'],
    ['Vendor', d.vendor || '—'],
    ['Category', d.category],
    ['Detail type', categoryUsesItemWiseDetail(d.category) ? 'Item-wise' : 'Category-wise'],
    ['Division', d.division || '—'],
    ['Quantity', d.qty || '—'],
    ['Amount', d.amount || '—'],
    ['Dispatch date', d.dispatchDate || '—'],
    ['Delivery / GRN date', d.date || '—'],
    ['Invoice', d.invoice || '—'],
    ['Payment status', d.payment || '—'],
    ['Remarks', d.remarks || '—']
  ];
  openModal(`${escapeHtmlLite(d.id)} — Delivery details`, `<div class="dvdms-detail">
    <div class="dvdms-detail-banner">
      <div>
        <p class="dvdms-detail-eyebrow">MPPHSCL · Delivery details</p>
        <h3>${escapeHtmlLite(d.items || 'Delivery record')}</h3>
        <p>${escapeHtmlLite(d.po || '—')} · ${escapeHtmlLite(d.category || '—')}</p>
      </div>
      <span class="badge badge-${d.grn === 'Accepted' ? 'success' : 'warning'}">${escapeHtmlLite(d.grn || '—')}</span>
    </div>
    <div class="dvdms-detail-stats">
      <div class="dvdms-detail-stat"><span>GRN</span><strong>${escapeHtmlLite(d.grn || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Invoice</span><strong>${escapeHtmlLite(d.invoice || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Payment</span><strong>${escapeHtmlLite(d.payment || '—')}</strong></div>
      <div class="dvdms-detail-stat"><span>Delivery date</span><strong>${escapeHtmlLite(d.date || '—')}</strong></div>
    </div>
    ${renderLifecycleCoverageBlock(row, {
      stageTitle: `${d.category || 'Category'} · category-wise delivery`,
      noun: 'delivery',
      yesLabel: 'Delivered',
      noLabel: 'Not delivered',
      yesHint: 'Articles included in this consignment / GRN',
      noHint: 'In category catalogue · not in this delivery lot',
      statusHead: 'Delivery status',
      filterLabel: 'Delivery Status',
      headTitle: `${d.category || 'Category'} articles · coverage`
    })}
    <div class="dvdms-detail-panel">
      <div class="dvdms-detail-panel-head">
        Challan &amp; invoice summary
        ${followUpHead ? `<span style="float:right">${followUpHead}</span>` : ''}
      </div>
      <table class="dvdms-detail-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtmlLite(k)}</th><td>${escapeHtmlLite(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      ${followUpFooter}
    </div>
  </div>`, { wide: true, large: true });
}

function openDeliveryFollowUp(deliveryId) {
  if (currentRole !== 'gov') return;
  const d = (typeof DELIVERIES !== 'undefined' ? DELIVERIES : []).find(x => x.id === deliveryId);
  if (!d) return;
  const fromName = authUser?.name || 'Resource Manager';
  openModal(`Take Follow-up — ${d.id}`, `<div class="kpi-detail">
    <p class="need-row-detail-lead">Follow up on <strong>${d.items || d.id}</strong> (${d.po}).</p>
    <div class="form-grid">
      <div class="form-group"><label>From</label><input type="text" value="${fromName}" readonly></div>
      <div class="form-group"><label>Regarding</label><input type="text" value="${d.id} · ${d.po}" readonly></div>
      <div class="form-group full"><label>Message</label>
        <textarea id="deliveryFollowUpMsg" rows="4" placeholder="Describe the follow-up action required (GRN, invoice, payment, dispatch, etc.)"></textarea>
      </div>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="modalGoBack()"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <button type="button" class="btn btn-primary" onclick="submitDeliveryFollowUp('${d.id}')"><i class="fa-solid fa-paper-plane"></i> Send follow-up</button>
    </div>
  </div>`, { wide: true });
}

function submitDeliveryFollowUp(deliveryId) {
  const msg = document.getElementById('deliveryFollowUpMsg')?.value?.trim();
  if (!msg) {
    showWfAlert('Please enter a follow-up message before sending.');
    return;
  }
  openModal('Follow-up sent', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Follow-up on <strong>${deliveryId}</strong> has been recorded and notified to the mapped officials.</p></div>
  </div>`);
}

function renderPerformance() {
  return renderPerformanceBreakdown(VENDORS[0]);
}

/* ========== Vendor Document Repository ========== */
function formatRepoFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function collectLiveVendorRepositoryDocs() {
  const out = [];
  const s = vendorStageState;
  const push = (meta, fields) => {
    if (!meta) return;
    const list = Array.isArray(meta) ? meta : [meta];
    list.forEach((f, i) => {
      if (!f?.name) return;
      out.push({
        id: fields.idBase + (list.length > 1 ? `-${i + 1}` : ''),
        name: f.name,
        stage: fields.stage,
        stageName: fields.stageName,
        docType: fields.docType,
        relatedRef: fields.relatedRef || '—',
        uploadedOn: fields.uploadedOn || formatDateDMY(APP_TODAY),
        size: formatRepoFileSize(f.size),
        status: fields.status || 'Uploaded',
        category: fields.category || currentCategory || 'All',
        file: f.name,
        source: 'session'
      });
    });
  };

  push(s.uploads?.kyc, { idBase: 'LIVE-KYC', stage: 2, stageName: 'KYC Verification', docType: 'KYC', relatedRef: 'Session upload', status: 'Uploaded' });
  push(s.uploads?.approvalLetter, { idBase: 'LIVE-APR', stage: 3, stageName: 'Vendor Approval', docType: 'Approval', relatedRef: 'Session upload', status: 'Uploaded' });
  push(s.uploads?.technicalDocs, { idBase: 'LIVE-TECH', stage: 4, stageName: 'Bid Submitted', docType: 'Technical bid', relatedRef: s.bid?.tenderId || 'Bid pack', status: s.bid?.submitted ? 'Submitted' : 'Uploaded' });
  push(s.uploads?.financialDocs, { idBase: 'LIVE-FIN', stage: 4, stageName: 'Bid Submitted', docType: 'Financial bid', relatedRef: s.bid?.tenderId || 'Bid pack', status: s.bid?.submitted ? 'Submitted' : 'Uploaded' });
  push(s.uploads?.pbg, { idBase: 'LIVE-PBG', stage: 6, stageName: 'Contract Execution', docType: 'PBG', relatedRef: s.contract?.id || 'PBG', status: s.contract?.pbgSubmitted ? 'Submitted' : 'Uploaded' });
  if (s.contract?.contractOcr?.fileName) {
    push({ name: s.contract.contractOcr.fileName, size: 0 }, { idBase: 'LIVE-CNT', stage: 6, stageName: 'Contract Execution', docType: 'Contract', relatedRef: s.contract?.id || 'Contract', status: s.contract?.signed ? 'Signed' : 'Uploaded' });
  }
  if (s.delivery?.fileName) {
    push({ name: s.delivery.fileName, size: 0 }, { idBase: 'LIVE-DEL', stage: 7, stageName: 'Delivery', docType: 'Delivery', relatedRef: s.delivery?.challan || 'Delivery', status: s.delivery?.updated ? 'Saved' : 'Uploaded' });
  }
  push(s.uploads?.deliveryProof, { idBase: 'LIVE-PROOF', stage: 8, stageName: 'Invoice Submission', docType: 'Invoice', relatedRef: s.invoice?.number || 'Invoice proof', status: s.invoice?.submitted ? 'Submitted' : 'Uploaded' });
  if (s.invoice?.fileName && s.invoice.fileName !== s.uploads?.deliveryProof?.name) {
    push({ name: s.invoice.fileName, size: 0 }, { idBase: 'LIVE-INV', stage: 8, stageName: 'Invoice Submission', docType: 'Invoice', relatedRef: s.invoice?.number || 'Invoice', status: s.invoice?.submitted ? 'Submitted' : 'Uploaded' });
  }
  push(s.uploads?.renewalSupport, { idBase: 'LIVE-REN', stage: 10, stageName: 'Renewal', docType: 'Renewal', relatedRef: 'Renewal request', status: 'Uploaded' });
  (s.renewalRequests || []).forEach((r, ri) => {
    (r.documents || []).forEach((d, di) => {
      if (!d?.name && !d?.file) return;
      out.push({
        id: `LIVE-VREN-${ri + 1}-${di + 1}`,
        name: d.name || d.file,
        stage: 10,
        stageName: 'Renewal',
        docType: d.type || 'Renewal',
        relatedRef: r.contractId || r.id,
        uploadedOn: r.renewalDate || formatDateDMY(APP_TODAY),
        size: '—',
        status: r.status || 'Pending finalization',
        category: r.category || 'All',
        file: d.file || d.name,
        source: 'session'
      });
    });
  });
  if (s.empanelment?.offline?.fileName) {
    push({ name: s.empanelment.offline.fileName, size: 0 }, {
      idBase: 'LIVE-EMP',
      stage: 1,
      stageName: 'Registration',
      docType: 'Payment proof',
      relatedRef: s.empanelment.offline.receiptNo || 'Empanelment',
      uploadedOn: s.empanelment.offline.uploadedOn || formatDateDMY(APP_TODAY),
      status: 'Submitted'
    });
  }
  return out;
}

function getVendorRepositoryDocs() {
  const seed = (typeof VENDOR_REPOSITORY_DOCS !== 'undefined' ? VENDOR_REPOSITORY_DOCS : []).map(d => ({ ...d, source: d.source || 'catalog' }));
  const live = collectLiveVendorRepositoryDocs();
  const byFile = new Set(live.map(d => String(d.file || d.name).toLowerCase()));
  const merged = [...live, ...seed.filter(d => !byFile.has(String(d.file || d.name).toLowerCase()))];
  return filterCategoryRows(merged);
}

function getFilteredVendorRepositoryDocs() {
  const q = (vendorRepositoryState.q || '').trim().toLowerCase();
  return getVendorRepositoryDocs().filter(d => {
    if (vendorRepositoryState.stage !== 'all' && String(d.stage) !== String(vendorRepositoryState.stage)) return false;
    if (vendorRepositoryState.docType !== 'all' && d.docType !== vendorRepositoryState.docType) return false;
    if (!q) return true;
    const hay = `${d.id} ${d.name} ${d.docType} ${d.relatedRef} ${d.stageName} ${d.file}`.toLowerCase();
    return hay.includes(q);
  });
}

function setVendorRepositoryPage(page) {
  vendorRepositoryState.page = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function setVendorRepositoryStage(stage) {
  vendorRepositoryState.stage = stage || 'all';
  vendorRepositoryState.page = 1;
  renderPageContent();
}

function setVendorRepositoryDocType(docType) {
  vendorRepositoryState.docType = docType || 'all';
  vendorRepositoryState.page = 1;
  renderPageContent();
}

function setVendorRepositoryQuery(value) {
  vendorRepositoryState.q = value || '';
  vendorRepositoryState.page = 1;
  renderPageContent();
  const input = document.getElementById('repoSearchInput');
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
}

function repositoryStatusBadge(status) {
  if (/submitted|signed|acknowledged|saved/i.test(status)) return 'success';
  if (/pending|uploaded/i.test(status)) return 'info';
  return 'muted';
}

function buildRepositoryDocPdfLines(doc) {
  const identity = typeof getVendorSessionIdentity === 'function'
    ? getVendorSessionIdentity()
    : { vendorId: 'VND-MP-000123', vendorName: 'MediSupply India Pvt Ltd' };
  return [
    'MP Health Procurement — Document Repository',
    'Department of Public Health & Medical Education, Madhya Pradesh',
    '',
    doc.name,
    `Document ID: ${doc.id}`,
    `File name: ${doc.file || doc.name}`,
    `Document type: ${doc.docType}`,
    `Status: ${doc.status}`,
    '',
    '— Lifecycle context —',
    `Stage: ${doc.stage} — ${doc.stageName}`,
    `Related reference: ${doc.relatedRef || '—'}`,
    `Category: ${doc.category || '—'}`,
    `Uploaded on: ${doc.uploadedOn || '—'}`,
    `Size: ${doc.size || '—'}`,
    `Source: ${doc.source === 'session' ? 'Uploaded in this session' : 'Repository catalog'}`,
    '',
    '— Vendor —',
    `Vendor: ${identity.vendorName} (${identity.vendorId})`,
    '',
    `Generated: ${formatDateDMY(APP_TODAY)} · Demo document from vendor repository`
  ];
}

function downloadVendorRepositoryDoc(docId) {
  const doc = getVendorRepositoryDocs().find(d => d.id === docId);
  if (!doc) {
    showWfAlert('Document not found in repository.');
    return;
  }
  const filename = (doc.file && /\.pdf$/i.test(doc.file)) ? doc.file : `${(doc.file || doc.id).replace(/\.[^.]+$/, '')}.pdf`;
  confirmDocumentDownload({
    title: 'Confirm document download',
    docLabel: doc.name,
    formatLabel: 'PDF',
    fileHint: filename,
    execute: () => downloadBlobFile(buildSimplePdfBlob(buildRepositoryDocPdfLines(doc)), filename)
  });
}

function downloadVendorRepositoryPack() {
  const docs = getFilteredVendorRepositoryDocs();
  if (!docs.length) {
    showWfAlert('No documents match the current repository filters.');
    return;
  }
  const filename = `Vendor-Repository-Pack-${formatDateDMY(APP_TODAY).replace(/-/g, '')}.pdf`;
  confirmDocumentDownload({
    title: 'Confirm repository pack download',
    docLabel: `Repository pack (${docs.length} documents)`,
    formatLabel: 'PDF',
    fileHint: filename,
    execute: () => {
      const identity = typeof getVendorSessionIdentity === 'function'
        ? getVendorSessionIdentity()
        : { vendorId: 'VND-MP-000123', vendorName: 'MediSupply India Pvt Ltd' };
      const lines = [
        'MP Health Procurement — Full Document Repository Pack',
        'Department of Public Health & Medical Education, Madhya Pradesh',
        '',
        `Vendor: ${identity.vendorName} (${identity.vendorId})`,
        `Documents in pack: ${docs.length}`,
        `Generated: ${formatDateDMY(APP_TODAY)}`,
        '',
        '— Document index —'
      ];
      docs.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.id} | ${d.name}`);
        lines.push(`   Stage ${d.stage} ${d.stageName} | ${d.docType} | ${d.relatedRef} | ${d.uploadedOn} | ${d.status}`);
      });
      lines.push('', 'End of repository pack index.');
      downloadBlobFile(buildSimplePdfBlob(lines), filename);
    }
  });
}

function openVendorRepositoryDetail(docId) {
  const doc = getVendorRepositoryDocs().find(d => d.id === docId);
  if (!doc) return;
  openModal(`${doc.id} — Repository document`, `<div class="kpi-detail need-row-detail">
    <p class="need-row-detail-lead">${doc.name}</p>
    <div class="tender-detail-stats tender-detail-stats--4">
      <div class="tender-stat"><span>Stage</span><strong>${doc.stage}. ${doc.stageName}</strong></div>
      <div class="tender-stat"><span>Type</span><strong>${doc.docType}</strong></div>
      <div class="tender-stat"><span>Status</span><strong><span class="badge badge-${repositoryStatusBadge(doc.status)}">${doc.status}</span></strong></div>
      <div class="tender-stat"><span>Size</span><strong>${doc.size || '—'}</strong></div>
    </div>
    <div class="tender-detail-section">
      <div class="tender-detail-section-head"><h4>Document details</h4></div>
      <div class="data-table-wrap" style="margin-bottom:0.75rem">
        <table class="data-table data-table--modal">
          <tbody>
            <tr><td>Document ID</td><td><strong>${doc.id}</strong></td></tr>
            <tr><td>File name</td><td>${doc.file || doc.name}</td></tr>
            <tr><td>Related reference</td><td>${doc.relatedRef || '—'}</td></tr>
            <tr><td>Category</td><td>${doc.category || '—'}</td></tr>
            <tr><td>Uploaded on</td><td class="cell-date">${doc.uploadedOn || '—'}</td></tr>
            <tr><td>Source</td><td>${doc.source === 'session' ? 'Uploaded in this session' : 'Repository catalog'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()"><i class="fa-solid fa-xmark"></i> Close</button>
      <button type="button" class="btn btn-primary" onclick="downloadVendorRepositoryDoc('${doc.id}')">
        <i class="fa-solid fa-download"></i> Download / Email
      </button>
    </div>
  </div>`, { wide: true, large: true });
}

function getVendorRepositoryStageLabel(stageId) {
  if (stageId === 'all' || stageId == null || stageId === '') return 'All stages';
  const steps = typeof VENDOR_WORKFLOW !== 'undefined' ? VENDOR_WORKFLOW : [];
  const step = steps.find(s => String(s.id) === String(stageId));
  return step ? `${step.id}. ${step.name}` : `Stage ${stageId}`;
}

function getVendorRepositoryStageOptions() {
  const steps = typeof VENDOR_WORKFLOW !== 'undefined' ? VENDOR_WORKFLOW : [];
  return ['All stages', ...steps.map(s => `${s.id}. ${s.name}`)];
}

function setVendorRepositoryStageFromLabel(label) {
  if (!label || label === 'All stages') {
    setVendorRepositoryStage('all');
    return;
  }
  const m = String(label).match(/^(\d+)\./);
  setVendorRepositoryStage(m ? m[1] : 'all');
}

function getVendorRepositoryDocTypeOptions(allDocs) {
  const types = [...new Set((allDocs || []).map(d => d.docType).filter(Boolean))].sort();
  return ['All types', ...types];
}

function bindVendorRepositoryFilters() {
  const stageWrap = document.querySelector('.custom-select[data-select-id="repoLifecycleStage"]');
  if (stageWrap && !stageWrap.dataset.repoBound) {
    stageWrap.dataset.repoBound = '1';
    stageWrap.addEventListener('change', () => {
      const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('repoLifecycleStage') : '';
      setVendorRepositoryStageFromLabel(label);
    });
  }
  const typeWrap = document.querySelector('.custom-select[data-select-id="repoDocType"]');
  if (typeWrap && !typeWrap.dataset.repoBound) {
    typeWrap.dataset.repoBound = '1';
    typeWrap.addEventListener('change', () => {
      const label = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('repoDocType') : '';
      setVendorRepositoryDocType((!label || label === 'All types') ? 'all' : label);
    });
  }
}

function renderVendorRepository() {
  const all = getVendorRepositoryDocs();
  const rows = getFilteredVendorRepositoryDocs();
  const paged = paginateItems(rows, vendorRepositoryState.page, 10);
  vendorRepositoryState.page = paged.page;

  const stageOptions = getVendorRepositoryStageOptions();
  const stageSelected = getVendorRepositoryStageLabel(vendorRepositoryState.stage);
  const typeOptions = getVendorRepositoryDocTypeOptions(all);
  const typeSelected = vendorRepositoryState.docType === 'all' ? 'All types' : vendorRepositoryState.docType;
  const byStage = {};
  all.forEach(d => { byStage[d.stage] = (byStage[d.stage] || 0) + 1; });
  const sessionCount = all.filter(d => d.source === 'session').length;

  const stageSelect = `<div class="form-group repo-filter-group"><label>Lifecycle stage</label>
    ${inlineCustomSelectHTML('repoLifecycleStage', stageOptions, stageSelected)}
  </div>`;
  const typeSelect = `<div class="form-group repo-filter-group"><label>Document type</label>
    ${inlineCustomSelectHTML('repoDocType', typeOptions, typeSelected)}
  </div>`;

  return `<div class="vendor-repository">
    <div class="report-toolbar">
      <div>
        <p class="report-toolbar-lead">Central repository of documents uploaded across Registration through Renewal.</p>
        <p class="report-toolbar-meta">Vendor document vault · Download or email any file from the table</p>
      </div>
    </div>

    <div class="budget-pr-summary">
      <div class="budget-pr-chip"><span>Total documents</span><strong>${all.length}</strong></div>
      <div class="budget-pr-chip"><span>Matching filter</span><strong>${rows.length}</strong></div>
      <div class="budget-pr-chip"><span>Session uploads</span><strong>${sessionCount}</strong></div>
      <div class="budget-pr-chip"><span>Stages covered</span><strong>${Object.keys(byStage).length}</strong></div>
    </div>

    <div class="repo-filters">
      ${stageSelect}
      ${typeSelect}
      <div class="form-group repo-filter-group repo-filter-search">
        <label>Search</label>
        <input id="repoSearchInput" type="search" placeholder="Search ID, name, tender, contract…" value="${escapeHtmlLite(vendorRepositoryState.q)}" oninput="setVendorRepositoryQuery(this.value)">
      </div>
    </div>

    <div class="data-table-wrap mt-2">
      <div class="table-header">
        <h3>Document repository</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Doc ID</th>
            <th>Document</th>
            <th>Stage</th>
            <th>Type</th>
            <th>Related ref</th>
            <th>Uploaded</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paged.items.length ? paged.items.map(d => `<tr class="need-row-clickable" role="button" tabindex="0" onclick="openVendorRepositoryDetail('${d.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorRepositoryDetail('${d.id}')}" title="View document details">
            <td><strong>${d.id}</strong></td>
            <td>${d.name}${d.source === 'session' ? '<div class="table-sub">Session upload</div>' : ''}</td>
            <td>${escapeHtmlLite(getVendorRepositoryStageLabel(d.stage))}</td>
            <td>${d.docType}</td>
            <td>${d.relatedRef || '—'}</td>
            <td class="cell-date">${d.uploadedOn || '—'}</td>
            <td>${d.size || '—'}</td>
            <td>
              <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation(); downloadVendorRepositoryDoc('${d.id}')" title="Download or email">
                <i class="fa-solid fa-download"></i>
              </button>
            </td>
          </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:1.25rem">No documents match the selected filters.</td></tr>`}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setVendorRepositoryPage')}
    </div>
  </div>`;
}

function getWorkQueueSource() {
  if (currentRole === 'gov' && typeof GOV_WORK_QUEUE !== 'undefined') return GOV_WORK_QUEUE;
  return typeof VENDOR_WORK_QUEUE !== 'undefined' ? VENDOR_WORK_QUEUE : [];
}

function getSlaHierarchy() {
  if (currentRole === 'gov' && typeof GOV_SLA_HIERARCHY !== 'undefined') return GOV_SLA_HIERARCHY;
  return typeof SLA_HIERARCHY !== 'undefined' ? SLA_HIERARCHY : [];
}

function getWorkQueueTabs() {
  if (currentRole === 'gov') {
    return [
      ['all', 'All'],
      ['unread', 'Unread'],
      ['approvals', 'Approvals'],
      ['payments', 'Payments'],
      ['sla', 'SLA'],
      ['vendors', 'Vendors'],
      ['tenders', 'Tenders']
    ];
  }
  return [
    ['all', 'All'],
    ['unread', 'Unread'],
    ['milestones', 'Milestones'],
    ['sla', 'SLA'],
    ['payments', 'Payments'],
    ['system', 'System']
  ];
}

function workQueueSeverityMeta(severity) {
  if (severity === 'high') return { icon: 'fa-circle-exclamation', cls: 'wq-sev--high', label: 'High' };
  if (severity === 'medium') return { icon: 'fa-triangle-exclamation', cls: 'wq-sev--medium', label: 'Medium' };
  return { icon: 'fa-circle-info', cls: 'wq-sev--info', label: 'Info' };
}

function filterWorkQueueItems() {
  const items = getWorkQueueSource();
  if (workQueueFilter === 'all') return items;
  if (workQueueFilter === 'unread') return items.filter(i => i.unread);
  return items.filter(i => i.category === workQueueFilter);
}

function getWorkQueueCounts() {
  const items = getWorkQueueSource();
  const counts = { all: items.length, unread: items.filter(i => i.unread).length };
  getWorkQueueTabs().forEach(([id]) => {
    if (id !== 'all' && id !== 'unread') counts[id] = items.filter(i => i.category === id).length;
  });
  return counts;
}

function renderWorkQueue() {
  const items = filterWorkQueueItems();
  const counts = getWorkQueueCounts();
  const tabs = getWorkQueueTabs();
  const isGov = currentRole === 'gov';
  const allItems = getWorkQueueSource();
  const highCount = allItems.filter(i => i.severity === 'high').length;
  const paged = paginateItems(items, workQueuePage, 10);
  workQueuePage = paged.page;

  return `<div class="work-queue">
    ${isGov ? `<div class="work-queue-summary">
      <div class="work-queue-stat">
        <span class="work-queue-stat-label">Total alerts</span>
        <strong>${counts.all}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--warn">
        <span class="work-queue-stat-label">Unread</span>
        <strong>${counts.unread}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--danger">
        <span class="work-queue-stat-label">High priority</span>
        <strong>${highCount}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--muted">
        <span class="work-queue-stat-label">SLA breaches</span>
        <strong>${counts.sla || 0}</strong>
      </div>
    </div>` : ''}
    <div class="work-queue-card">
      <div class="work-queue-card-head">
        <div>
          <h3>${isGov ? 'Government alerts & work queue' : 'Alerts and work queue'}</h3>
          <p>${isGov
            ? 'Prioritized actions from Analytics — approvals, payment delays, vendor SLA breaches, and tender pipeline.'
            : 'Prioritized actions grouped by severity, owner, due date and record type.'}</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="markAllWorkQueueRead()">Mark all as read</button>
      </div>
      <div class="work-queue-tabs" role="tablist">
        ${tabs.map(([id, label]) => `<button type="button" class="work-queue-tab${workQueueFilter === id ? ' active' : ''}" onclick="setWorkQueueFilter('${id}')">${label} <span>${counts[id] ?? 0}</span></button>`).join('')}
      </div>
      <div class="work-queue-list">
        ${paged.items.length ? paged.items.map(item => {
          const sev = workQueueSeverityMeta(item.severity);
          return `<button type="button" class="work-queue-row${item.unread ? ' is-unread' : ''}" onclick="openWorkQueueItem('${item.id}')">
            <span class="wq-sev ${sev.cls}"><i class="fa-solid ${sev.icon}"></i></span>
            <span class="wq-body">
              <strong>${item.title}</strong>
              <span class="wq-detail">${item.detail}</span>
              ${isGov ? `<span class="wq-owner"><i class="fa-solid fa-user"></i> ${item.owner}</span>` : ''}
            </span>
            <span class="wq-meta">
              <span class="wq-priority">${sev.label}</span>
              <span class="wq-time">${item.timeline}</span>
            </span>
          </button>`;
        }).join('') : `<div class="empty-state-card"><i class="fa-solid fa-inbox"></i><p>No alerts in this filter.</p></div>`}
      </div>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setWorkQueuePage')}
    </div>
  </div>`;
}

function setWorkQueuePage(page) {
  workQueuePage = Math.max(1, Number(page) || 1);
  renderPageContent();
}

function setWorkQueueFilter(filter) {
  workQueueFilter = filter;
  workQueuePage = 1;
  renderPageContent();
}

function markAllWorkQueueRead() {
  getWorkQueueSource().forEach(i => { i.unread = false; });
  renderSidebar();
  renderTopbar();
  renderPageContent();
  showWfAlert('All work queue alerts marked as read.', 'success');
}

function openWorkQueueItem(id) {
  const item = getWorkQueueSource().find(i => i.id === id);
  if (!item) return;
  item.unread = false;
  renderSidebar();
  renderTopbar();
  if (item.actionPage === 'sla-desk') {
    const thread = SLA_THREADS.find(t => t.id === item.ref || t.contractId === item.ref || t.subject.includes(item.ref));
    if (thread) activeSlaThreadId = thread.id;
  }
  if (item.actionPage) navigateTo(item.actionPage);
  else renderPageContent();
}

function renderSlaDesk() {
  const hierarchy = getSlaHierarchy();
  const thread = SLA_THREADS.find(t => t.id === activeSlaThreadId) || SLA_THREADS[0];
  const isGov = currentRole === 'gov';
  const officer = hierarchy.find(h => h.level === thread.level);
  const openCount = SLA_THREADS.filter(t => t.status !== 'Resolved').length;

  return `<div class="sla-desk${isGov ? ' sla-desk--gov' : ''}">
    <div class="sla-hierarchy-card">
      <div class="sla-hierarchy-head">
        <h3><i class="fa-solid fa-sitemap"></i> ${isGov ? 'Internal Response Hierarchy' : 'SLA Escalation Hierarchy'}</h3>
        <p>${isGov
          ? 'Assign and respond to vendor escalations within SLA windows. Escalate internally only when the current level cannot resolve.'
          : 'Communicate with government officers in order. Escalate only after the lower level SLA window lapses.'}</p>
      </div>
      <ol class="sla-hierarchy-list">
        ${hierarchy.map(h => `<li>
          <span class="sla-level">L${h.level}</span>
          <div>
            <strong>${h.role}</strong>
            <span class="sla-org">${h.org}</span>
            <span class="sla-window">${h.sla}</span>
            <span class="sla-contact"><i class="fa-solid fa-envelope"></i> ${h.contact}</span>
          </div>
        </li>`).join('')}
      </ol>
    </div>

    <div class="sla-comm-layout">
      <aside class="sla-thread-list">
        <div class="sla-thread-list-head">
          <h4>${isGov ? 'Vendor escalations' : 'Open threads'} <span class="sla-thread-count">${openCount}</span></h4>
          ${isGov ? '' : `<button type="button" class="btn btn-primary btn-sm" onclick="openNewSlaThreadModal()"><i class="fa-solid fa-plus"></i> New</button>`}
        </div>
        ${SLA_THREADS.map(t => `<button type="button" class="sla-thread-item${t.id === thread.id ? ' active' : ''}" onclick="selectSlaThread('${t.id}')">
          <div class="sla-thread-item-top">
            <strong>${t.subject}</strong>
            <span class="badge badge-${t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'danger' : 'warning'}">${t.status}</span>
          </div>
          <span class="sla-thread-meta">L${t.level} · ${t.contractId} · ${t.lastUpdate}</span>
          ${isGov ? `<span class="sla-thread-vendor"><i class="fa-solid fa-building"></i> Vendor thread</span>` : ''}
        </button>`).join('')}
      </aside>

      <section class="sla-thread-panel">
        <div class="sla-thread-panel-head">
          <div>
            <h3>${thread.subject}</h3>
            <p>Contract <strong>${thread.contractId}</strong> · Level L${thread.level} (${officer?.role || '—'}) · Priority: <span class="badge badge-${thread.priority === 'High' ? 'danger' : thread.priority === 'Medium' ? 'warning' : 'info'}">${thread.priority}</span></p>
          </div>
          <div class="sla-thread-actions">
            ${isGov && thread.status !== 'Resolved' ? `<button type="button" class="btn btn-outline btn-sm" onclick="resolveSlaThread('${thread.id}')"><i class="fa-solid fa-check"></i> Mark resolved</button>` : ''}
            <span class="badge badge-${thread.status === 'Resolved' ? 'success' : thread.status === 'Open' ? 'danger' : 'warning'}">${thread.status}</span>
          </div>
        </div>
        <div class="sla-messages" id="slaMessages">
          ${thread.messages.map(m => `<div class="sla-msg ${m.from === 'vendor' ? 'sla-msg--vendor' : 'sla-msg--gov'}">
            <div class="sla-msg-meta"><strong>${m.name}</strong> · ${m.role} · ${m.time}</div>
            <div class="sla-msg-body">${m.text}</div>
          </div>`).join('')}
        </div>
        ${thread.status !== 'Resolved' ? `<div class="sla-compose">
          ${customSelectHTML(isGov ? 'Assign / respond as' : 'Escalate to level', 'slaEscalateLevel', hierarchy.map(h => `L${h.level} — ${h.role}`), `L${thread.level} — ${officer?.role || ''}`)}
          <div class="form-group full">
            <label>${isGov ? 'Official response to vendor' : 'Message to government officer'} <span class="req-star">*</span></label>
            <textarea id="slaMessageInput" rows="3" placeholder="${isGov ? 'Provide cure plan, reference documents, and expected resolution date…' : 'Describe the SLA issue, reference documents, and requested action…'}"></textarea>
          </div>
          <div class="sla-compose-actions">
            <button type="button" class="btn btn-outline" onclick="navigateTo('work-queue')">Back to Work Queue</button>
            <button type="button" class="btn btn-primary" onclick="sendSlaMessage()"><i class="fa-solid fa-paper-plane"></i> ${isGov ? 'Send official response' : 'Send to hierarchy'}</button>
          </div>
        </div>` : `<div class="sla-resolved-banner"><i class="fa-solid fa-circle-check"></i> This thread is resolved. No further action required.</div>`}
      </section>
    </div>
  </div>`;
}

function selectSlaThread(id) {
  activeSlaThreadId = id;
  renderPageContent();
}

function openNewSlaThreadModal() {
  if (currentRole === 'gov') return;
  const hierarchy = getSlaHierarchy();
  openModal('Raise SLA Communication', `
    <div class="upload-modal">
      <p class="upload-modal-lead">Start a new escalation with the government hierarchy. Choose the correct SLA level based on issue type.</p>
      <div class="form-grid wf-form-grid">
        ${customSelectHTML('Contract', 'newSlaContract', CONTRACTS.map(c => c.id), CONTRACTS[0]?.id)}
        ${customSelectHTML('Escalate to', 'newSlaLevel', hierarchy.map(h => `L${h.level} — ${h.role}`), 'L2 — Contract Manager')}
        <div class="form-group full"><label>Subject <span class="req-star">*</span></label><input id="newSlaSubject" type="text" placeholder="e.g. Delivery response delay — CNT-2026-0089"></div>
        <div class="form-group full"><label>Details <span class="req-star">*</span></label><textarea id="newSlaDetails" rows="4" placeholder="Summarize the breach, dates, and requested cure…"></textarea></div>
      </div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="createSlaThread()">Create Thread</button>
      </div>
    </div>
  `, { wide: true });
  initCustomSelects();
}

function createSlaThread() {
  const subject = document.getElementById('newSlaSubject')?.value?.trim();
  const details = document.getElementById('newSlaDetails')?.value?.trim();
  const contractId = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('newSlaContract') : CONTRACTS[0]?.id;
  const levelLabel = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('newSlaLevel') : 'L2 — Contract Manager';
  const level = parseInt(String(levelLabel).replace(/^L/, ''), 10) || 2;
  if (!subject || !details) {
    showWfAlert('Please enter Subject and Details before creating an SLA thread.');
    return;
  }
  const id = `SLA-2026-${String(100 + SLA_THREADS.length).slice(-3)}`;
  SLA_THREADS.unshift({
    id,
    subject,
    contractId: contractId || 'CNT-2026-0089',
    level,
    status: 'Open',
    priority: level <= 2 ? 'High' : 'Medium',
    lastUpdate: formatDateDMY(APP_TODAY),
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, text: details }
    ]
  });
  activeSlaThreadId = id;
  closeModal();
  renderSidebar();
  renderPageContent();
  showWfAlert('SLA communication thread created and routed to the selected hierarchy level.', 'success');
}

function sendSlaMessage() {
  const text = document.getElementById('slaMessageInput')?.value?.trim();
  if (!text) {
    showWfAlert(currentRole === 'gov' ? 'Enter an official response before sending.' : 'Enter a message before sending to the government hierarchy.');
    return;
  }
  const thread = SLA_THREADS.find(t => t.id === activeSlaThreadId);
  if (!thread) return;
  const hierarchy = getSlaHierarchy();
  const levelLabel = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('slaEscalateLevel') : '';
  const level = parseInt(String(levelLabel).replace(/^L/, ''), 10);
  if (level) thread.level = level;
  thread.status = 'In Progress';
  thread.lastUpdate = formatDateDMY(APP_TODAY);
  const timeStr = `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  if (currentRole === 'gov') {
    const officer = hierarchy.find(h => h.level === thread.level);
    thread.messages.push({
      from: 'gov',
      name: authUser?.name || 'Dr. Rajesh Sharma',
      role: officer?.role || 'Contract Manager',
      time: timeStr,
      text
    });
    renderSidebar();
    renderPageContent();
    showWfAlert(`Official response sent as ${officer?.role || 'government officer'}.`, 'success');
    return;
  }

  thread.messages.push({
    from: 'vendor',
    name: 'MediSupply India',
    role: 'Vendor',
    time: timeStr,
    text
  });
  const officer = hierarchy.find(h => h.level === thread.level);
  if (officer) {
    thread.messages.push({
      from: 'gov',
      name: officer.role === 'Contract Manager' ? 'Rohit Sharma' : officer.role,
      role: officer.role,
      time: timeStr,
      text: `Message received at ${officer.role} desk. We will respond within the defined SLA window (${officer.sla}).`
    });
  }
  renderSidebar();
  renderPageContent();
  showWfAlert(`Message sent to ${officer?.role || 'government hierarchy'}.`, 'success');
}

function resolveSlaThread(id) {
  const thread = SLA_THREADS.find(t => t.id === id);
  if (!thread) return;
  thread.status = 'Resolved';
  thread.lastUpdate = formatDateDMY(APP_TODAY);
  const hierarchy = getSlaHierarchy();
  const officer = hierarchy.find(h => h.level === thread.level);
  thread.messages.push({
    from: 'gov',
    name: authUser?.name || 'Dr. Rajesh Sharma',
    role: officer?.role || 'Contract Manager',
    time: `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    text: 'Case reviewed and closed. Vendor notified of resolution. SLA cure clock stopped.'
  });
  renderSidebar();
  renderPageContent();
  showWfAlert('SLA thread marked as resolved.', 'success');
}

// ========== INTERACTIONS ==========
function setCategory(cat) {
  if (cat === currentCategory) return;
  currentCategory = cat;
  pipelinePage = 1;
  contractsListState.page = 1;
  contractMgmtListState.page = 1;
  deliveryListState.page = 1;
  vendorContractExecState.page = 1;
  vendorContractExecState.category = 'all';
  vendorInvoiceExecState.page = 1;
  vendorInvoiceExecState.category = 'all';
  vendorPaymentExecState.page = 1;
  vendorPaymentExecState.category = 'all';
  vendorDeliveryExecState.page = 1;
  vendorDeliveryExecState.category = 'all';
  vendorRenewalExecState.page = 1;
  vendorRenewalExecState.category = 'all';
  vendorBidDvdmsFilterState.page = 1;
  vendorBidDvdmsFilterState.category = 'all';
  vendorAwardSyncFilterState.page = 1;
  vendorAwardSyncFilterState.category = 'all';
  vendorDeliverySyncFilterState.page = 1;
  vendorDeliverySyncFilterState.category = 'all';
  vendorRepositoryState.page = 1;
  bidsListState.page = 1;
  bidsListState.category = 'all';
  clarificationsListState.page = 1;
  clarificationsListState.category = 'all';
  clarificationsListPage = 1;
  contractsListState.category = 'all';
  deliveryListState.category = 'all';
  tendersListState.page = 1;
  tendersListState.category = 'all';
  dashboardTenderCategory = 'all';
  pipelinePage = 1;
  workQueuePage = 1;
  vendorRegListPage = 1;
  vendorMatrixPage = 1;
  resetWfStageTablePages(govNeedState);
  resetWfStageTablePages(govStockCheckState);
  resetWfStageTablePages(govIndentState);
  resetWfStageTablePages(govConsolidationState);
  resetWfStageTablePages(govBudgetState);
  resetWfStageTablePages(govTenderPrepState);
  govBidEvalState.page = 1;
  govContractState.page = 1;
  govAwardState.page = 1;
  govPoState.page = 1;
  govGrnState.page = 1;
  govInvoiceState.page = 1;
  govPaymentState.page = 1;
  govRenewalState.page = 1;
  govNeedState.period = 'all';
  govStockCheckState.period = 'all';
  govIndentState.period = 'all';
  govConsolidationState.period = 'all';
  govBudgetState.period = 'all';
  govTenderPrepState.period = 'all';
  govBidEvalState.period = 'all';
  govContractState.period = 'all';
  govAwardState.period = 'all';
  govPoState.period = 'all';
  govGrnState.period = 'all';
  govInvoiceState.period = 'all';
  govPaymentState.period = 'all';
  govRenewalState.period = 'all';
  updatePageMeta();
  if (PAGES_WITH_CATEGORY.has(currentPage)) {
    updateCategoryBarInPlace();
    renderPageContent();
  } else {
    renderPage();
  }
}

function setPeriod(period) {
  currentPeriod = period;
  if (currentPage === 'dashboard' || currentPage === 'reports') {
    if (currentRole === 'vendor' && currentPage === 'reports') {
      initVendorReportCharts(currentCategory);
    } else if (isGovAnalyticsPage() && currentPage === 'dashboard') {
      document.querySelectorAll('.analytics-filter .time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
      });
      refreshAllCharts(getAnalyticsChartPeriod(), currentCategory);
      updateChartSubtitles();
    } else if (currentPage === 'vendor-matrix' && currentRole === 'gov') {
      refreshVendorMatrixPage();
    } else {
      refreshAllCharts(period, currentCategory);
    }
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
    });
  }
}

function setAnalyticsFocusYear(year) {
  analyticsFocusYear = year || 'all';
  analyticsPeriodFocus = 'all';
  if (analyticsFocusYear !== 'all' && !analyticsSliceType) analyticsSliceType = 'quarter';
  currentPeriod = analyticsFocusYear === 'all' ? 'year' : analyticsSliceType;
  if (isGovAnalyticsPage()) {
    renderPageContent();
  }
}

function setAnalyticsSliceType(slice) {
  if (analyticsFocusYear === 'all') return;
  analyticsSliceType = slice === 'month' ? 'month' : 'quarter';
  analyticsPeriodFocus = 'all';
  currentPeriod = analyticsSliceType;
  if (isGovAnalyticsPage()) {
    renderPageContent();
  }
}

function setAnalyticsPeriodFocus(period) {
  if (analyticsFocusYear === 'all') return;
  analyticsPeriodFocus = period || 'all';
  if (currentPage === 'dashboard' && currentRole === 'gov') {
    refreshAllCharts(getAnalyticsChartPeriod(), currentCategory);
    updateChartSubtitles();
    refreshDashboardVendorTable();
    document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
      const label = chip.textContent.trim().split(/\s/)[0];
      const isAll = analyticsPeriodFocus === 'all' && label === 'All';
      const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
      chip.classList.toggle('active', isAll || isMatch);
    });
  } else if (currentPage === 'vendor-matrix' && currentRole === 'gov') {
    refreshVendorMatrixPage();
  } else if (currentPage === 'reports' && currentRole === 'gov') {
    refreshGovReportsPage();
  }
}

function syncAnalyticsFilterControls() {
  const wrapper = document.querySelector('.custom-select[data-select-id="analyticsFocusYear"]');
  const display = analyticsFocusYear === 'all' ? 'All 10 years' : analyticsFocusYear;
  if (wrapper) {
    const valueEl = wrapper.querySelector('.custom-select-value');
    if (valueEl) valueEl.textContent = display;
    wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === display);
    });
  }
  document.querySelectorAll('.analytics-fy-chips:not(.analytics-period-row .analytics-fy-chips) .analytics-fy-chip, .analytics-filter > .analytics-fy-chips .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim();
    const isAll = analyticsFocusYear === 'all' && label.startsWith('All');
    const isYear = analyticsFocusYear !== 'all' && label === analyticsFocusYear.replace('FY', '');
    chip.classList.toggle('active', isAll || isYear);
  });
}

function updateAnalyticsExplorerSubtitle() {
  const subtitle = document.querySelector('#chartAnalyticsCompare')?.closest('.chart-card')?.querySelector('.chart-subtitle');
  if (subtitle && typeof getAnalyticsContextLabel === 'function') {
    const mode = analyticsCompareMode === 'progress' ? 'Tender pipeline' : 'Vendor score comparison';
    subtitle.textContent = `${getAnalyticsContextLabel()} · ${mode}`;
  }
}

function setAnalyticsCompareMode(mode) {
  analyticsCompareMode = mode === 'progress' ? 'progress' : 'vendor';
  if (currentPage === 'dashboard' && currentRole === 'gov') {
    renderPageContent();
  }
}

function toggleAlertPanel() {
  alertPanelOpen = !alertPanelOpen;
  const panel = document.getElementById('alertPanel');
  panel.classList.toggle('open', alertPanelOpen);
  if (alertPanelOpen) renderAlerts();
}

function closeAlertPanel() {
  alertPanelOpen = false;
  document.getElementById('alertPanel')?.classList.remove('open');
}

// ========== GOV NOTICES (website load — before login) ==========
function getPublicGovNotices() {
  if (typeof GOV_NOTICES === 'undefined') return [];
  // Public broadcast: show all active notices (prefer unread first)
  return [...GOV_NOTICES].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    if (!!b.unread !== !!a.unread) return a.unread ? -1 : 1;
    return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  });
}

function getUnreadGovNotices() {
  return (typeof GOV_NOTICES !== 'undefined' ? GOV_NOTICES : []).filter(n => n.unread);
}

function isUserLoggedIn() {
  return !!currentRole && document.getElementById('app')?.classList.contains('active');
}

/** Show official government notices on the login / landing page */
function showGovNoticesOnWebsiteLoad(force = false) {
  if (!force && noticesShownThisSession) return;
  const notices = getPublicGovNotices();
  if (!notices.length) return;
  noticesShownThisSession = true;
  openNoticeModal(notices);
}

function openNoticeModal(notices) {
  const overlay = document.getElementById('noticeOverlay');
  const body = document.getElementById('noticeModalBody');
  if (!overlay || !body) return;

  const list = notices || getPublicGovNotices();
  const critical = list.filter(n => n.priority === 'critical').length;
  const unread = list.filter(n => n.unread).length;
  const loggedIn = isUserLoggedIn();

  const continueBtn = document.getElementById('noticeContinueBtn');
  if (continueBtn) {
    continueBtn.textContent = loggedIn ? 'Continue to Dashboard' : 'Continue to Sign In';
  }

  body.innerHTML = `
    <div class="notice-summary">
      <div class="notice-summary-text">
        <strong>${list.length} official notice${list.length === 1 ? '' : 's'}</strong> from the Government / Resource Manager
        ${critical ? `<span class="notice-critical-chip">${critical} critical</span>` : ''}
        ${unread ? `<span class="notice-unread-chip">${unread} new</span>` : ''}
      </div>
      <p>${loggedIn
        ? 'Please review these official communications. You can reopen them anytime from the notification bell.'
        : 'These government announcements are shown to all visitors. Sign in to take action on tenders, bids, or contracts.'}</p>
    </div>
    <div class="notice-list">
      ${list.map(n => renderNoticeCard(n, loggedIn)).join('')}
    </div>
  `;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderNoticeCard(n, loggedIn) {
  const priorityClass = n.priority === 'critical' ? 'critical' : n.priority === 'high' ? 'high' : 'medium';
  const canAct = loggedIn && n.actionPage;
  return `<article class="notice-card notice-card--${priorityClass}${n.unread ? '' : ' notice-card--read'}" data-notice-id="${n.id}">
    <div class="notice-card-top">
      <span class="notice-priority notice-priority--${priorityClass}">${n.priority}</span>
      <span class="notice-category">${n.category}</span>
      ${n.unread ? '<span class="notice-new-dot">New</span>' : ''}
      <span class="notice-ref">${n.ref}</span>
    </div>
    <h3 class="notice-card-title">${n.title}</h3>
    <p class="notice-card-msg">${n.msg}</p>
    <div class="notice-card-meta">
      <span><i class="fa-solid fa-building-columns"></i> ${n.from}</span>
      <span><i class="fa-regular fa-calendar"></i> ${n.date} · ${n.time}</span>
    </div>
    <div class="notice-card-actions">
      ${n.unread ? `<button type="button" class="btn btn-outline btn-sm" onclick="acknowledgeNotice('${n.id}')">Mark as read</button>` : ''}
      ${canAct
        ? `<button type="button" class="btn btn-primary btn-sm" onclick="actOnNotice('${n.id}','${n.actionPage}')">${n.actionLabel || 'Open'}</button>`
        : `<span class="notice-signin-hint"><i class="fa-solid fa-lock"></i> Sign in to act on this notice</span>`}
    </div>
  </article>`;
}

function acknowledgeNotice(id) {
  const notice = GOV_NOTICES.find(n => n.id === id);
  if (notice) notice.unread = false;

  const related = ALERTS_VENDOR.find(a => a.unread && (
    (notice?.ref && a.msg.includes(notice.ref.split('-').pop())) ||
    a.title.toLowerCase().includes((notice?.category || '').toLowerCase())
  ));
  if (related) related.unread = false;

  if (isUserLoggedIn()) renderTopbar();
  openNoticeModal(getPublicGovNotices());
}

function acknowledgeAllNotices() {
  GOV_NOTICES.forEach(n => { n.unread = false; });
  ALERTS_VENDOR.forEach(a => { a.unread = false; });
  if (isUserLoggedIn()) renderTopbar();
  closeNoticeModal();
}

function actOnNotice(id, page) {
  if (!isUserLoggedIn()) {
    closeNoticeModal();
    return;
  }
  acknowledgeNotice(id);
  closeNoticeModal();
  if (page) navigateTo(page);
}

function closeNoticeModal() {
  const overlay = document.getElementById('noticeOverlay');
  overlay?.classList.remove('open');
  overlay?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderAlerts() {
  const list = document.getElementById('alertList');
  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  list.innerHTML = alerts.map(a => `<div class="alert-item ${a.unread ? 'unread' : ''}" onclick="markAlertRead(${a.id})">
    <div class="alert-type ${a.type}">${a.type}</div>
    <h4>${a.title}</h4>
    <p>${a.msg}</p>
    <div class="alert-meta"><span><i class="fa-regular fa-calendar"></i> ${a.date}</span><span><i class="fa-solid fa-bolt"></i> ${a.impact}</span></div>
    <div class="alert-meta" style="margin-top:0.25rem"><strong>Action:</strong> ${a.action}</div>
  </div>`).join('');
}

function markAlertRead(id) {
  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.unread = false;
  renderAlerts();
  renderTopbar();
}

function openDrillDown(type, title, content) {
  if (type === 'tender') {
    openTenderDetail(title);
    return;
  }
  if (type === 'categorySpend') {
    openCategorySpendDetail(title);
    return;
  }
  if (type === 'chartPeriod') {
    openChartPeriodDetail(title, content);
    return;
  }
  openModal(title, `<div class="drill-simple"><p>${content}</p></div>`, { wide: false });
}

function getCategoryMetricAverages(vendors) {
  const list = vendors?.length ? vendors : VENDORS;
  const keys = (typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : []).map(m => m.key);
  const out = {};
  keys.forEach(k => {
    out[k] = list.length
      ? Math.round(list.reduce((s, v) => s + (v[k] || 0), 0) / list.length)
      : 0;
  });
  return out;
}

function filterListByCategory(list) {
  if (currentCategory === 'All') return list;
  return list.filter(x => x.category === currentCategory);
}

function filterListByGovKpiModalCategory(list) {
  if (govKpiModalCategory === 'All') return list;
  return list.filter(x => x.category === govKpiModalCategory);
}

function countByCategoryField(list, category) {
  if (category === 'All') return list.length;
  return list.filter(x => x.category === category).length;
}

function renderGovKpiModalCategoryFilter(kpiKey, sourceList) {
  const cats = typeof CATEGORIES !== 'undefined' ? CATEGORIES : ['All', 'Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];
  return `<div class="gov-kpi-cat-filter">
    <div class="gov-kpi-cat-filter-head">
      <strong><i class="fa-solid fa-filter"></i> Category-wise filter</strong>
      <span class="meta-chip">Same filter pattern as Vendor portal</span>
    </div>
    <div class="gov-kpi-cat-tabs" role="tablist" aria-label="Category filter">
      ${cats.map(c => {
        const count = countByCategoryField(sourceList || [], c);
        const active = govKpiModalCategory === c ? 'active' : '';
        return `<button type="button" role="tab" aria-selected="${govKpiModalCategory === c}" class="gov-kpi-cat-tab ${active}" onclick="setGovKpiModalCategory('${c}','${kpiKey}')">
          ${c}${c !== 'All' ? `<span class="cat-count">${count}</span>` : ''}
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

function renderGovKpiItemWiseHint(category) {
  if (!category || category === 'All') {
    return `<div class="gov-kpi-itemwise-hint">
      <p><i class="fa-solid fa-circle-info"></i> Select a category tab to filter this table, then open <strong>item-wise detail</strong> for that category.</p>
    </div>`;
  }
  return `<div class="gov-kpi-itemwise-hint">
    <p><i class="fa-solid fa-layer-group"></i> Showing <strong>${escapeHtmlLite(category)}</strong>. Open item-wise lines, types and facility coverage for this category.</p>
    <button type="button" class="btn btn-primary btn-sm" onclick="openGovCategoryItemWiseDetail('${category}')">
      <i class="fa-solid fa-list"></i> Item-wise detail
    </button>
  </div>`;
}

function setGovKpiModalCategory(cat, kpiKey) {
  govKpiModalCategory = cat || 'All';
  govKpiModalKey = kpiKey || govKpiModalKey;
  if (!govKpiModalKey) return;
  openGovKpiDetail(govKpiModalKey, { replace: true });
}

function openGovCategoryItemWiseDetail(category) {
  const cat = category && category !== 'All' ? category : null;
  if (!cat) {
    showWfAlert('Select a specific category to view item-wise detail.');
    return;
  }
  const items = (typeof CATEGORY_ITEM_TYPES !== 'undefined' ? (CATEGORY_ITEM_TYPES[cat] || []) : [])
    .map(i => ({ ...i, category: cat }));
  const amounts = { Drugs: 90.3, Equipment: 60.2, Services: 32.3, Consumables: 21.5, Others: 10.8 };
  const pct = typeof CHART_DATA !== 'undefined' ? CHART_DATA.categorySpend : { labels: [], data: [] };
  const pctIdx = pct.labels ? pct.labels.indexOf(cat) : -1;
  const share = pctIdx >= 0 ? pct.data[pctIdx] : '—';

  openModal(`${cat} — Item-wise detail`, `
    <div class="kpi-detail">
      <div class="tender-detail-stats tender-detail-stats--3">
        <div class="tender-stat"><span>Category</span><strong>${escapeHtmlLite(cat)}</strong></div>
        <div class="tender-stat"><span>Approx spend</span><strong>₹${amounts[cat] ?? '—'} Cr</strong></div>
        <div class="tender-stat"><span>Share of total</span><strong>${share}${share !== '—' ? '%' : ''}</strong></div>
      </div>
      <div class="tender-detail-section">
        <h4>Item-wise lines · ${escapeHtmlLite(cat)}</h4>
        <div class="data-table-wrap kpi-detail-table">
          <table class="data-table data-table--modal">
            <thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Code</th><th>Unit</th><th>Linked tenders</th><th>Spend (Approx)</th><th>Facilities</th></tr></thead>
            <tbody>
              ${items.length ? items.map((i, idx) => `<tr>
                <td>${idx + 1}</td>
                <td class="cell-title"><strong>${escapeHtmlLite(i.name)}</strong></td>
                <td><span class="badge badge-info">${escapeHtmlLite(i.type)}</span></td>
                <td class="cell-nowrap">${escapeHtmlLite(i.code || '—')}</td>
                <td>${escapeHtmlLite(i.unit || '—')}</td>
                <td>${i.tenders ?? '—'}</td>
                <td class="cell-nowrap">${escapeHtmlLite(i.spend || '—')}</td>
                <td>${i.facilities ?? '—'}</td>
              </tr>`).join('') : emptyTableRow(8, 'No item lines for this category.')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true, fullBleed: true });
}

function shortPerfMetricLabel(label) {
  const map = {
    'Quality': 'Quality',
    'Timely Delivery': 'Delivery',
    'Costing': 'Cost',
    'Packaging & supply': 'Packaging',
    'Communication Response': 'Comm.',
    'Blacklisting': 'Blacklist'
  };
  return map[label] || label;
}

function openGovKpiDetail(key, opts = {}) {
  if (key?.startsWith('metric:')) {
    openMetricWeightDetail(key.slice(7));
    return;
  }

  if (!opts.replace) {
    govKpiModalCategory = currentCategory || 'All';
  }
  govKpiModalKey = key;
  const modalCat = govKpiModalCategory || 'All';
  const catLabel = modalCat === 'All' ? 'All categories' : modalCat;
  const modalOpts = { wide: true, large: true, extraWide: true, fullBleed: true, replace: !!opts.replace };

  if (key === 'openTenders') {
    const allOpen = (typeof TENDERS !== 'undefined' ? TENDERS : []).filter(t => t.status === 'Open');
    const tenders = filterListByGovKpiModalCategory(allOpen);
    openModal(`Open Tenders — ${catLabel}`, `
      <div class="kpi-detail">
        ${renderGovKpiModalCategoryFilter('openTenders', allOpen)}
        ${renderGovKpiItemWiseHint(modalCat)}
        <div class="tender-detail-section">
          <h4>Tender details</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                ${tenders.length ? tenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td class="cell-nowrap"><strong>${t.id}</strong></td>
                  <td class="cell-title">${t.title}${modalCat === 'All' ? `<div class="cell-sub">${t.category}</div>` : ''}</td>
                  <td class="cell-nowrap">${t.value}</td>
                  <td>${t.bids}</td>
                  <td class="cell-nowrap">${formatDateDMY(t.deadline)}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                </tr>`).join('') : emptyTableRow(7, 'No open tenders for this filter.')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, modalOpts);
    return;
  }

  if (key === 'pendingApprovals') {
    const allRows = typeof PENDING_APPROVALS !== 'undefined' ? PENDING_APPROVALS : [];
    const rows = filterListByGovKpiModalCategory(allRows);
    openModal(`Pending Approvals — ${catLabel}`, `
      <div class="kpi-detail">
        ${renderGovKpiModalCategoryFilter('pendingApprovals', allRows)}
        ${renderGovKpiItemWiseHint(modalCat)}
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Awaiting action</span><strong>${rows.length}</strong></div>
          <div class="tender-stat"><span>Oldest</span><strong>${rows.length ? Math.max(...rows.map(r => parseInt(r.age, 10) || 0)) + ' days' : '—'}</strong></div>
          <div class="tender-stat"><span>Financial sanction</span><strong>${rows.filter(r => r.stage.includes('Financial')).length}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Purchase requisitions in queue</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>PR ID</th><th>Title</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
              <tbody>
                ${rows.length ? rows.map((r, i) => `<tr>
                  <td>${i + 1}</td>
                  <td class="cell-nowrap"><strong>${r.id}</strong></td>
                  <td class="cell-title">${r.title}${modalCat === 'All' ? `<div class="cell-sub">${r.category}</div>` : ''}</td>
                  <td><span class="badge badge-warning">${r.stage}</span></td>
                  <td class="cell-nowrap">${r.amount}</td>
                  <td class="cell-nowrap">${r.age}</td>
                  <td>${r.owner}</td>
                </tr>`).join('') : emptyTableRow(7)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, modalOpts);
    return;
  }

  if (key === 'paymentDelays') {
    const allRows = typeof PAYMENT_DELAYS !== 'undefined' ? PAYMENT_DELAYS : [];
    const rows = filterListByGovKpiModalCategory(allRows);
    openModal(`Payment Delays — ${catLabel}`, `
      <div class="kpi-detail">
        ${renderGovKpiModalCategoryFilter('paymentDelays', allRows)}
        ${renderGovKpiItemWiseHint(modalCat)}
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Delayed invoices</span><strong>${rows.length}</strong></div>
          <div class="tender-stat"><span>Max overdue</span><strong>${rows.length ? Math.max(...rows.map(r => r.daysOverdue)) + ' days' : '—'}</strong></div>
          <div class="tender-stat"><span>Vendors affected</span><strong>${new Set(rows.map(r => r.vendor)).size}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Invoice hold / delay register</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Invoice</th><th>Vendor</th><th>Amount</th><th>Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
              <tbody>
                ${rows.length ? rows.map((r, i) => `<tr>
                  <td>${i + 1}</td>
                  <td class="cell-nowrap"><strong>${r.id}</strong></td>
                  <td class="cell-title">${r.vendor}${modalCat === 'All' ? `<div class="cell-sub">${r.category}</div>` : ''}</td>
                  <td class="cell-nowrap">${r.amount}</td>
                  <td><span class="badge badge-danger">${r.daysOverdue}d</span></td>
                  <td>${r.reason}</td>
                  <td class="cell-nowrap">${r.contractId}</td>
                </tr>`).join('') : emptyTableRow(7)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, modalOpts);
    return;
  }

  if (key === 'procurementSpend') {
    openCategorySpendDetail(modalCat === 'All' ? null : modalCat, { replace: !!opts.replace, fromKpiModal: true });
    return;
  }

  if (key === 'avgVendorScore') {
    const allVendors = typeof VENDORS !== 'undefined' ? VENDORS : [];
    const vendors = filterListByGovKpiModalCategory(allVendors);
    const metrics = typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : [];
    const colSpan = 2 + metrics.length + 2;
    openModal(`Vendor Score — ${catLabel}`, `
      <div class="kpi-detail">
        ${renderGovKpiModalCategoryFilter('avgVendorScore', allVendors)}
        ${renderGovKpiItemWiseHint(modalCat)}
        <div class="tender-detail-section">
          <div class="need-section-head" style="border:none;padding:0 0 0.65rem;background:transparent">
            <h4>Score breakdown by vendor</h4>
            <span class="meta-chip">${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} scored</span>
          </div>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal data-table--vendor-score">
              <thead><tr>
                <th>S.No</th>
                <th>Vendor</th>
                ${metrics.map(m => `<th title="${escapeHtmlLite(m.label)}">${escapeHtmlLite(shortPerfMetricLabel(m.label))}</th>`).join('')}
                <th>Overall</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                ${vendors.length ? vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                  <td>${i + 1}</td>
                  <td class="cell-vendor"><strong>${v.name}</strong><div class="cell-sub">${v.id}</div></td>
                  ${metrics.map(m => `<td>${v[m.key] ?? '—'}</td>`).join('')}
                  <td><strong>${v.overall}</strong></td>
                  <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
                </tr>`).join('') : emptyTableRow(colSpan)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, modalOpts);
  }
}

function openMetricWeightDetail(metricKey) {
  const metric = PERF_METRICS.find(m => m.key === metricKey);
  if (!metric) return;
  const vendors = filterByCategory(VENDORS).slice().sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
  const avg = vendors.length
    ? Math.round(vendors.reduce((s, v) => s + (v[metricKey] || 0), 0) / vendors.length)
    : 0;
  openModal(`${metric.label} — Performance Matrix`, `
    <div class="kpi-detail">
      <div class="tender-detail-stats tender-detail-stats--3">
        <div class="tender-stat"><span>Weight in overall</span><strong>${metric.weight}%</strong></div>
        <div class="tender-stat"><span>Category avg</span><strong>${avg}</strong></div>
        <div class="tender-stat"><span>Top score</span><strong>${vendors[0] ? vendors[0][metricKey] : '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <h4>Vendor ranking on ${metric.label}</h4>
        <div class="data-table-wrap kpi-detail-table">
          <table class="data-table data-table--modal">
            <thead><tr><th>Rank</th><th>Vendor</th><th>${metric.label}</th><th>Overall</th><th>Status</th></tr></thead>
            <tbody>
              ${vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                <td>${i + 1}</td>
                <td class="cell-vendor"><strong>${v.name}</strong><div class="cell-sub">${v.category}</div></td>
                <td><strong>${v[metricKey]}</strong></td>
                <td>${v.overall}</td>
                <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `, { wide: true, large: true, extraWide: true });
}

function openCategorySpendDetail(focusCategory, opts = {}) {
  const cat = focusCategory && focusCategory !== 'All' ? focusCategory : null;
  govKpiModalKey = 'procurementSpend';
  if (!opts.replace || opts.fromKpiModal || focusCategory != null) {
    govKpiModalCategory = cat || 'All';
  }
  const title = cat ? `${cat} Spend Detail` : 'Category-wise Spend Distribution';
  const amounts = { Drugs: 90.3, Equipment: 60.2, Services: 32.3, Consumables: 21.5, Others: 10.8 };
  const pct = CHART_DATA.categorySpend;
  const cats = cat ? [cat] : pct.labels;
  const items = cat
    ? (CATEGORY_ITEM_TYPES[cat] || []).map(i => ({ ...i, category: cat }))
    : Object.entries(CATEGORY_ITEM_TYPES).flatMap(([c, list]) => list.map(i => ({ ...i, category: c })));

  const districtKey = cat ? cat.toLowerCase() : null;
  const districts = DISTRICT_SPEND.map(d => {
    const value = districtKey
      ? d[districtKey]
      : d.drugs + d.equipment + d.services + d.consumables + d.others;
    return { ...d, value: Math.round(value * 10) / 10 };
  });

  const filterHtml = `${renderGovKpiModalCategoryFilter('procurementSpend', [
      ...pct.labels.flatMap(c => (CATEGORY_ITEM_TYPES[c] || []).map(i => ({ ...i, category: c })))
    ])}${renderGovKpiItemWiseHint(cat || 'All')}`;

  openModal(title, `
    <div class="kpi-detail">
      ${filterHtml}
      <div class="tender-detail-stats" style="grid-template-columns:repeat(${Math.min(cats.length, 5)},minmax(0,1fr))">
        ${cats.map(c => {
          const i = pct.labels.indexOf(c);
          return `<div class="tender-stat ${!cat ? 'is-clickable' : ''}" ${!cat ? `onclick="openCategorySpendDetail('${c}', { replace: true, fromKpiModal: true })" title="Open ${c} item-wise spend"` : ''}>
            <span>${c}</span><strong>₹${amounts[c]} Cr</strong><em>${pct.data[i]}% of total${!cat ? ' · click for items' : ''}</em>
          </div>`;
        }).join('')}
      </div>
      <div class="tender-detail-section">
        <h4>${cat === 'Drugs' ? 'Types of drugs / items' : 'Item types &amp; tender coverage'}</h4>
        <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Item</th><th>Type</th>${cat ? '' : '<th>Category</th>'}<th>Linked tenders</th><th>Spend (Approx)</th><th>Facilities</th></tr></thead>
              <tbody>
              ${items.map((i, idx) => `<tr ${cat ? '' : `onclick="openGovCategoryItemWiseDetail('${i.category}')" style="cursor:pointer"`}>
                <td>${idx + 1}</td>
                <td class="cell-title"><strong>${i.name}</strong></td>
                <td><span class="badge badge-info">${i.type}</span></td>
                ${cat ? '' : `<td>${i.category}</td>`}
                <td>${i.tenders}</td>
                <td class="cell-nowrap">${i.spend}</td>
                <td>${i.facilities}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="tender-detail-section">
        <h4>District &amp; facility spend (₹ Cr)</h4>
        <div class="data-table-wrap kpi-detail-table">
          <table class="data-table data-table--modal">
            <thead><tr><th>S.No</th><th>District</th><th>Facility</th><th>Spend (₹ Cr)</th></tr></thead>
            <tbody>
              ${districts.map((d, i) => `<tr>
                <td>${i + 1}</td>
                <td><strong>${d.district}</strong></td>
                <td>${d.facility}</td>
                <td class="cell-nowrap">₹${d.value} Cr</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> ${cat
        ? `Item-wise detail for <strong>${cat}</strong>. Use category tabs to switch or open full item-wise detail.`
        : 'Click a category card or row to open item-wise detail for that category.'}</p>
    </div>
  `, { wide: true, large: true, extraWide: true, fullBleed: true, replace: !!opts.replace });
}

function openChartTrendDetail(chartKey, seriesLabel, periodLabel, value) {
  const cat = currentCategory === 'All' ? null : currentCategory;
  const catLabel = cat || 'All categories';
  const ctx = getAnalyticsContextLabel();
  const val = value != null ? value : '—';

  if (chartKey === 'spend') {
    const amounts = { Drugs: 90.3, Equipment: 60.2, Services: 32.3, Consumables: 21.5, Others: 10.8 };
    const cats = cat ? [cat] : CHART_DATA.categorySpend.labels;
    const total = cat ? amounts[cat] : Object.values(amounts).reduce((s, v) => s + v, 0);
    const scale = val !== '—' && total ? Number(val) / total : 1;
    const numVal = typeof val === 'number' ? val : Number(val);
    const fmt = Number.isFinite(numVal) ? numVal.toFixed(1) : val;
    const items = cat
      ? (CATEGORY_ITEM_TYPES[cat] || []).slice(0, 5)
      : (CATEGORY_ITEM_TYPES.Drugs || []).slice(0, 4);
    const tenders = filterListByCategory(TENDERS).slice(0, 6);
    openModal(`Spend Trends (Procurement) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Procurement spend · ₹ Crore</span>
            <h3 class="trend-detail-value">₹${fmt} Cr</h3>
            <p class="trend-detail-desc">Money spent via POs &amp; contracts in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>What this means:</strong> Total procurement outlay for the period — the rupee value of awarded tenders / purchase orders. Unit is <strong>₹ Crore</strong> (1 Cr = ₹1 crore = ₹10 million). This is spend, not savings.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period spend</span><strong>₹${fmt} Cr</strong></div>
          <div class="tender-stat"><span>Category</span><strong>${catLabel}</strong></div>
          <div class="tender-stat"><span>Linked tenders</span><strong>${tenders.length}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Where the money went (by category)</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Category</th><th>Spend (₹ Cr)</th><th>Share</th></tr></thead>
              <tbody>
                ${cats.map((c, i) => {
                  const amt = Math.round(amounts[c] * scale * 10) / 10;
                  const share = total ? Math.round((amounts[c] / total) * 100) : 0;
                  return `<tr><td>${i + 1}</td><td><strong>${c}</strong></td><td>₹${amt} Cr</td><td>${share}%</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-section">
          <h4>Key drug / item lines driving spend</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Spend (Approx)</th><th>Tenders</th></tr></thead>
              <tbody>
                ${items.map((i, idx) => `<tr>
                  <td>${idx + 1}</td>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.type}</td>
                  <td>${i.spend}</td>
                  <td>${i.tenders}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-section">
          <h4>Top districts by spend</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>District</th><th>Facility</th><th>Spend (₹ Cr)</th></tr></thead>
              <tbody>
                ${DISTRICT_SPEND.slice(0, 6).map((d, i) => {
                  const v = cat
                    ? d[cat.toLowerCase()]
                    : d.drugs + d.equipment + d.services + d.consumables + d.others;
                  return `<tr><td>${i + 1}</td><td><strong>${d.district}</strong></td><td>${d.facility}</td><td>₹${(v * scale).toFixed(1)} Cr</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-actions">
          <button type="button" class="btn btn-primary" onclick="openCategorySpendDetail(${cat ? `'${cat}'` : 'null'})">View full category spend →</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'procurement') {
    const tenders = filterListByCategory(TENDERS).slice(0, 8);
    const open = tenders.filter(t => t.status === 'Open').length;
    const awarded = tenders.filter(t => t.status === 'Awarded').length;
    const evaln = tenders.filter(t => t.status === 'Evaluation').length;
    openModal(`Procurement (Tenders) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Tenders</span>
            <h3 class="trend-detail-value">${val}</h3>
            <p class="trend-detail-desc">Tenders published or processed in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p>Each unit is one <strong>tender</strong> (NIT/RFP) issued or progressed in the period — not individual items or line items.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Total tenders</span><strong>${val}</strong></div>
          <div class="tender-stat"><span>Currently open</span><strong>${open}</strong></div>
          <div class="tender-stat"><span>Awarded / in eval</span><strong>${awarded} / ${evaln}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Tender register — ${periodLabel}</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Status</th><th>Bids</th></tr></thead>
              <tbody>
                ${tenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.category}</td>
                  <td>${t.value}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                  <td>${t.bids}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'vendorPerf') {
    const vendors = filterByCategory(VENDORS).slice().sort((a, b) => b.overall - a.overall).slice(0, 8);
    const avg = vendors.length ? (vendors.reduce((s, v) => s + v.overall, 0) / vendors.length).toFixed(1) : '—';
    openModal(`Vendor Performance — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Score (0–100)</span>
            <h3 class="trend-detail-value">${val} pts</h3>
            <p class="trend-detail-desc">Weighted average vendor score for <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p>Score combines ${PERF_METRICS.map(m => `${m.label} (${m.weight}%)`).join(', ')}. Higher is better; 80+ is preferred vendor threshold.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period avg</span><strong>${val} pts</strong></div>
          <div class="tender-stat"><span>Vendors scored</span><strong>${vendors.length}</strong></div>
          <div class="tender-stat"><span>Category filter</span><strong>${catLabel}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Vendor ranking — ${periodLabel}</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Vendor</th><th>Category</th><th>Quality</th><th>Timely Delivery</th><th>Costing</th><th>Overall</th><th>Status</th></tr></thead>
              <tbody>
                ${vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${v.name}</strong></td>
                  <td>${v.category}</td>
                  <td>${v.testingLabs}</td>
                  <td>${v.timelyDelivery}</td>
                  <td>${v.pricing}</td>
                  <td><strong>${v.overall}</strong></td>
                  <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-actions">
          <button type="button" class="btn btn-primary" onclick="openGovKpiDetail('avgVendorScore')">View all vendor scores →</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'savings') {
    const sources = [
      { name: 'Rate contract negotiation', amount: 8.2, pct: 37, how: 'Locked multi-year rates below market' },
      { name: 'Bulk purchase pooling', amount: 5.4, pct: 25, how: 'District demand pooled for volume discount' },
      { name: 'Generic substitution', amount: 4.1, pct: 19, how: 'Branded → equivalent generics' },
      { name: 'E-procurement efficiency', amount: 2.8, pct: 13, how: 'Faster cycle, lower overhead' },
      { name: 'Vendor competition (L1)', amount: 1.5, pct: 6, how: 'Competitive bidding pulled prices down' }
    ];
    const numVal = typeof val === 'number' ? val : Number(val);
    const fmt = Number.isFinite(numVal) ? numVal.toFixed(1) : val;
    const scale = Number.isFinite(numVal) ? numVal / 22 : 1;
    const estimated = Number.isFinite(numVal) ? Math.round((numVal + numVal / 0.1) * 10) / 10 : '—';
    const actual = Number.isFinite(numVal) ? Math.round((estimated - numVal) * 10) / 10 : '—';
    const periodTarget = analyticsFocusYear === 'all' ? 20 : (analyticsSliceType === 'month' ? 1.8 : 5.5);
    const achievement = Number.isFinite(numVal) ? Math.round((numVal / periodTarget) * 100) : '—';
    openModal(`Savings Realization (₹ Cr) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Cost savings · ₹ Crore</span>
            <h3 class="trend-detail-value">₹${fmt} Cr</h3>
            <p class="trend-detail-desc">Money saved vs estimate in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>What this means:</strong> Savings = <em>estimated / budgeted cost − actual contract value</em>. Unit is <strong>₹ Crore</strong>. This is money <em>not spent</em> relative to the estimate — not procurement spend.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Estimated cost</span><strong>₹${estimated} Cr</strong></div>
          <div class="tender-stat"><span>Actual paid</span><strong>₹${actual} Cr</strong></div>
          <div class="tender-stat"><span>Saved</span><strong>₹${fmt} Cr</strong></div>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period target</span><strong>₹${periodTarget} Cr</strong></div>
          <div class="tender-stat"><span>Achievement</span><strong>${achievement}%</strong></div>
          <div class="tender-stat"><span>Category</span><strong>${catLabel}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>How savings were earned</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Source</th><th>How</th><th>Saved (₹ Cr)</th><th>Share</th></tr></thead>
              <tbody>
                ${sources.map((s, i) => `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.how}</td>
                  <td>₹${(s.amount * scale).toFixed(1)} Cr</td>
                  <td>${s.pct}%</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'progress') {
    const d = typeof getTenderProgressSeries === 'function' ? getTenderProgressSeries(currentCategory) : null;
    const idx = d ? d.labels.findIndex(l => l === periodLabel || l.startsWith(periodLabel) || l.includes(periodLabel)) : -1;
    const proc = idx >= 0 ? d.processed[idx] : '—';
    const pend = idx >= 0 ? d.pending[idx] : '—';
    const del = idx >= 0 ? d.delayed[idx] : '—';
    openModal(`Tender Pipeline — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Tender counts</span>
            <h3 class="trend-detail-value">${proc} processed</h3>
            <p class="trend-detail-desc">Pipeline status for <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>Processed</strong> = tenders completed (awarded/closed). <strong>Pending</strong> = in evaluation or approval. <strong>Delayed</strong> = past SLA deadline.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Processed</span><strong>${proc}</strong></div>
          <div class="tender-stat"><span>Pending</span><strong>${pend}</strong></div>
          <div class="tender-stat"><span>Delayed</span><strong>${del}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Active tenders in pipeline</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Status</th><th>Deadline</th></tr></thead>
              <tbody>
                ${filterListByCategory(TENDERS).filter(t => ['Open', 'Evaluation', 'Draft'].includes(t.status)).slice(0, 6).map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.category}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                  <td>${formatDateDMY(t.deadline)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'vendorCompare') {
    const vendors = filterByCategory(VENDORS);
    const vendor = vendors.find(v => v.name.includes(periodLabel) || v.name.replace(' India Pvt Ltd', '').replace(' Solutions', '').includes(periodLabel));
    if (vendor) { openVendorDetail(vendor.id); return; }
  }

  openChartPeriodDetail(seriesLabel, periodLabel);
}

function openChartPeriodDetail(seriesLabel, periodLabel) {
  const cat = currentCategory === 'All' ? null : currentCategory;
  const items = cat
    ? (CATEGORY_ITEM_TYPES[cat] || [])
    : (CATEGORY_ITEM_TYPES.Drugs || []).slice(0, 4);
  openModal(`${seriesLabel}: ${periodLabel}`, `
    <div class="kpi-detail">
      <div class="tender-detail-section">
        <h4>Period snapshot — ${periodLabel}</h4>
        <p>Detailed breakdown for <strong>${periodLabel}</strong>${cat ? ` under <strong>${cat}</strong>` : ''}. Transaction-level ledgers remain in Finance module.</p>
      </div>
      <div class="tender-detail-section">
        <h4>${cat === 'Drugs' || !cat ? 'Key drug / item lines' : 'Key item lines'}</h4>
        <div class="kpi-detail-chips">
          ${items.map(i => `<span class="kpi-chip"><strong>${i.name}</strong><em>${i.type} · ${i.spend}</em></span>`).join('')}
        </div>
      </div>
      <div class="tender-detail-actions">
        <button type="button" class="btn btn-primary" onclick="openCategorySpendDetail(${cat ? `'${cat}'` : 'null'})">View full category spend →</button>
      </div>
    </div>
  `, { wide: true });
}

function openVendorDetail(id) {
  const v = VENDORS.find(x => x.id === id);
  if (!v) return;
  const metrics = typeof PERF_METRICS !== 'undefined' ? PERF_METRICS : [];
  openModal(`${v.id} — ${v.name}`, `<div class="drill-simple">
    <p><strong>Overall Score:</strong> ${v.overall} · <strong>Status:</strong> ${v.status} · <strong>Category:</strong> ${v.category}</p>
    <div class="tender-detail-stats mt-2">
      ${metrics.map(m => `<div class="tender-stat"><span>${escapeHtmlLite(m.label)}</span><strong>${v[m.key] ?? '—'}</strong></div>`).join('')}
    </div>
  </div>`, { wide: true });
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay?.querySelector('.modal');
  overlay?.classList.remove('open');
  modal?.classList.remove('modal--wide', 'modal--lg', 'modal--xl', 'modal--xxl');
  modalHistory = [];
  document.getElementById('modalBackBtn')?.classList.add('hidden');
}

function bindPageEvents() {
  if (window.__mphPageEventsBound) return;
  window.__mphPageEventsBound = true;

  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.getElementById('noticeOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'noticeOverlay') closeNoticeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('noticeOverlay')?.classList.contains('open')) {
      closeNoticeModal();
      return;
    }
    if (document.getElementById('modalOverlay')?.classList.contains('open')) {
      if (modalHistory.length) modalGoBack();
      else closeModal();
    }
  });
}

// ========== STAGE SLA / EXPIRY WATCHDOG ==========
const SLA_SETTINGS_KEY = 'mph_sla_settings_v1';
let slaSettingsCache = null;
let slaModalTimer = null;
let slaNotifyLog = [];
const slaNotifiedKeys = new Set();

function defaultSlaSettings() {
  const stages = {};
  if (typeof SLA_STAGE_DEFAULTS !== 'undefined') {
    Object.keys(SLA_STAGE_DEFAULTS).forEach(k => {
      stages[k] = { ...SLA_STAGE_DEFAULTS[k] };
    });
  }
  const notify = typeof SLA_NOTIFY_DEFAULTS !== 'undefined'
    ? { ...SLA_NOTIFY_DEFAULTS }
    : { email: true, whatsapp: true, nearExpiryDays: 30, renewalWarnDays: 45 };
  return { stages, notify };
}

function getSlaSettings() {
  if (slaSettingsCache) return slaSettingsCache;
  try {
    const raw = localStorage.getItem(SLA_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultSlaSettings();
      slaSettingsCache = {
        stages: { ...base.stages, ...(parsed.stages || {}) },
        notify: { ...base.notify, ...(parsed.notify || {}) }
      };
      return slaSettingsCache;
    }
  } catch (_) { /* ignore */ }
  slaSettingsCache = defaultSlaSettings();
  return slaSettingsCache;
}

function persistSlaSettings(cfg) {
  slaSettingsCache = cfg;
  try { localStorage.setItem(SLA_SETTINGS_KEY, JSON.stringify(cfg)); } catch (_) { /* ignore */ }
}

function saveSlaSettingsFromForm() {
  const cfg = getSlaSettings();
  const stages = { ...cfg.stages };
  document.querySelectorAll('.sla-stage-days').forEach(inp => {
    const id = inp.dataset.stage;
    if (!stages[id]) stages[id] = {};
    stages[id].slaDays = Math.max(1, Number(inp.value) || 30);
  });
  document.querySelectorAll('.sla-stage-warn').forEach(inp => {
    const id = inp.dataset.stage;
    if (!stages[id]) stages[id] = {};
    stages[id].warningPct = Math.min(50, Math.max(5, Number(inp.value) || 20));
  });
  Object.keys(stages).forEach(id => {
    const def = (typeof SLA_STAGE_DEFAULTS !== 'undefined' && SLA_STAGE_DEFAULTS[id]) || {};
    stages[id].owners = stages[id].owners || def.owners || '';
    stages[id].actionHint = stages[id].actionHint || def.actionHint || '';
  });
  const next = {
    stages,
    notify: {
      email: !!document.getElementById('slaNotifyEmail')?.checked,
      whatsapp: !!document.getElementById('slaNotifyWhatsApp')?.checked,
      nearExpiryDays: Math.max(1, Number(document.getElementById('slaNearExpiryDays')?.value) || 30),
      renewalWarnDays: Math.max(1, Number(document.getElementById('slaRenewalWarnDays')?.value) || 45)
    }
  };
  persistSlaSettings(next);
  openModal('SLA settings saved', `<div class="wf-inline-alert wf-inline-alert--success">
    <i class="fa-solid fa-circle-check"></i>
    <div><p>Stage SLAs and notification preferences saved. Alerts will use these thresholds on the next stage visit.</p></div>
  </div>`);
}

function resetSlaSettings() {
  try { localStorage.removeItem(SLA_SETTINGS_KEY); } catch (_) { /* ignore */ }
  slaSettingsCache = null;
  if (currentPage === 'settings') renderPage();
  openModal('SLA defaults restored', `<div class="wf-inline-alert wf-inline-alert--info">
    <i class="fa-solid fa-rotate-left"></i>
    <div><p>Stage SLA days and notify windows reset to Madhya Pradesh prototype defaults.</p></div>
  </div>`);
}

function daysBetweenDates(fromStr, toStr) {
  const from = parseISODate(fromStr);
  const to = parseISODate(toStr);
  if (!from || !to) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function classifySlaSeverity(daysOpen, slaDays, warningPct) {
  if (daysOpen == null || !slaDays) return null;
  if (daysOpen > slaDays) return 'danger';
  const warnStart = Math.max(1, Math.ceil(slaDays * (1 - (warningPct || 20) / 100)));
  if (daysOpen >= warnStart) return 'warning';
  return null;
}

function buildSlaItem({ stageId, ref, title, meta, pendingSince, status, owners, nextAction }) {
  const cfg = getSlaSettings();
  const stageCfg = cfg.stages[stageId] || (typeof SLA_STAGE_DEFAULTS !== 'undefined' ? SLA_STAGE_DEFAULTS[stageId] : {}) || {};
  const slaDays = stageCfg.slaDays || 30;
  const warningPct = stageCfg.warningPct || 20;
  const daysOpen = daysBetweenDates(pendingSince, APP_TODAY);
  if (daysOpen == null || daysOpen < 0) return null;
  const severity = classifySlaSeverity(daysOpen, slaDays, warningPct);
  if (!severity) return null;
  const overdueBy = daysOpen > slaDays ? daysOpen - slaDays : 0;
  const daysLeft = daysOpen <= slaDays ? slaDays - daysOpen : 0;
  return {
    kind: 'stage',
    stageId,
    ref,
    title,
    meta,
    pendingSince: formatDateDMY(pendingSince),
    status: status || 'Pending',
    owners: owners || stageCfg.owners || 'Resource Manager',
    nextAction: nextAction || stageCfg.actionHint || 'Take action',
    slaDays,
    daysOpen,
    overdueBy,
    daysLeft,
    severity
  };
}

function isOpenStatus(status, doneList) {
  const s = String(status || '').trim().toLowerCase();
  return !doneList.some(d => s === String(d).toLowerCase());
}

function collectStageSlaItems(stageId) {
  const items = [];
  const push = (row) => { if (row) items.push(row); };
  const sid = Number(stageId);

  if (sid === 1 && typeof NEED_IDENTIFICATION_API !== 'undefined') {
    (NEED_IDENTIFICATION_API.stockLevels?.rows || []).forEach(r => {
      if (!['Critical', 'Low'].includes(r.status)) return;
      push(buildSlaItem({
        stageId: 1, ref: `${r.facility} · ${r.sku}`, title: r.sku,
        meta: `${r.facility} · cover ${r.coverDays}d · ${r.status}`,
        pendingSince: r.date, status: r.status
      }));
    });
  }

  if (sid === 2 && typeof STOCK_CHECK_API !== 'undefined') {
    (STOCK_CHECK_API.warehouse?.rows || []).forEach(r => {
      if (!['Low', 'Critical'].includes(r.status)) return;
      push(buildSlaItem({
        stageId: 2, ref: `${r.facility} · ${r.item}`, title: r.item,
        meta: `${r.facility} · ${r.recommendation}`,
        pendingSince: r.date, status: r.status
      }));
    });
    (STOCK_CHECK_API.otherLocations?.rows || []).forEach(r => {
      if (!['Hold', 'Review'].includes(r.status)) return;
      push(buildSlaItem({
        stageId: 2, ref: `${r.from} → ${r.to}`, title: r.item,
        meta: `Transfer · ${r.qty} · ${r.status}`,
        pendingSince: r.date, status: r.status
      }));
    });
  }

  if (sid === 3) {
    const rows = typeof getIndentListRows === 'function' ? getIndentListRows()
      : (typeof INDENT_LIST_SEED !== 'undefined' ? INDENT_LIST_SEED : []);
    rows.forEach(r => {
      if (!isOpenStatus(r.status, ['Approved', 'Rejected', 'Closed', 'Cancelled'])) return;
      push(buildSlaItem({
        stageId: 3, ref: r.id, title: r.item,
        meta: `${r.facility} · ${r.district} · ${r.source || 'Manual'} indent · ${r.category}`,
        pendingSince: r.date, status: r.status,
        owners: r.approvingAuthority || undefined,
        nextAction: 'Approve / action pending indent'
      }));
    });
  }

  if (sid === 4 && typeof DEMAND_APPROVAL_LIST !== 'undefined') {
    DEMAND_APPROVAL_LIST.forEach(r => {
      if (!isOpenStatus(r.status, ['Approved', 'Rejected', 'Closed'])) return;
      push(buildSlaItem({
        stageId: 4, ref: r.id, title: `${r.district} · ${r.category} consolidation`,
        meta: `${r.items} items · ${r.facilities} facilities · ${r.valueLow}–${r.valueHigh} · ${r.indentRef}`,
        pendingSince: r.date, status: r.status,
        nextAction: r.notes || 'Clear consolidation pending'
      }));
    });
  }

  if (sid === 5 && typeof PR_BUDGET_APPROVAL_API !== 'undefined') {
    (PR_BUDGET_APPROVAL_API.departments || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Approved', 'Verified', 'Cleared', 'Not Approved', 'Rejected'])) return;
      const since = r.decisionDate && r.decisionDate !== '—' ? r.decisionDate : '05-08-2026';
      push(buildSlaItem({
        stageId: 5, ref: r.id || r.shortName, title: r.name || r.shortName,
        meta: `${r.scheme || ''} · ${r.budgetHead || ''}`.trim(),
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 6 && typeof TENDER_PREPARATION_DATA !== 'undefined') {
    (TENDER_PREPARATION_DATA.tenders || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Published', 'Awarded', 'Closed', 'Cancelled'])) return;
      push(buildSlaItem({
        stageId: 6, ref: r.id, title: r.title,
        meta: `${r.division} · ${r.category} · checkers ${r.checkersDone}`,
        pendingSince: r.preparedOn, status: r.status
      }));
    });
  }

  if (sid === 7 && typeof BID_EVALUATION_DATA !== 'undefined') {
    (BID_EVALUATION_DATA.evaluations || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Evaluation complete', 'Complete', 'Closed'])) return;
      push(buildSlaItem({
        stageId: 7, ref: r.id, title: r.title,
        meta: `${r.tenderId} · ${r.method} · ${r.division}`,
        pendingSince: r.evalDate, status: r.status
      }));
    });
  }

  if (sid === 8 && typeof CONTRACT_APPROVAL_DATA !== 'undefined') {
    (CONTRACT_APPROVAL_DATA.contracts || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Agreement signed', 'Signed', 'Closed'])) return;
      const since = (r.noaDate && r.noaDate !== '—') ? r.noaDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 8, ref: r.id, title: r.title,
        meta: `${r.l1Vendor} · ${r.division}`,
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 9 && typeof AWARD_STAGE_DATA !== 'undefined') {
    (AWARD_STAGE_DATA.awards || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Award active', 'Closed', 'Cancelled'])) return;
      const since = (r.loaDate && r.loaDate !== '—') ? r.loaDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 9, ref: r.id, title: r.title,
        meta: `${r.vendor} · PBG ${r.pbgStatus}`,
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 10 && typeof PURCHASE_ORDER_DATA !== 'undefined') {
    (PURCHASE_ORDER_DATA.orders || []).forEach(r => {
      if (!isOpenStatus(r.status, ['PO issued', 'Delivery scheduled', 'Vendor notified', 'Acknowledged', 'Closed', 'Delivered', 'Completed'])) return;
      const since = r.poDate && r.poDate !== '—' ? r.poDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 10, ref: r.id, title: r.title || r.item || r.id,
        meta: `${r.vendor || ''} · ${r.division || ''}`.trim(),
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 11 && typeof GRN_INSPECTION_DATA !== 'undefined') {
    (GRN_INSPECTION_DATA.receipts || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Accepted', 'Closed'])) return;
      const since = r.grnDate && r.grnDate !== '—' ? r.grnDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 11, ref: r.id, title: r.title,
        meta: `${r.vendor} · QA ${r.qaStatus}`,
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 12 && typeof INVOICE_MATCHING_DATA !== 'undefined') {
    (INVOICE_MATCHING_DATA.invoices || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Matched', 'Approved', 'Paid', 'Closed'])) return;
      const since = r.invoiceDate && r.invoiceDate !== '—' ? r.invoiceDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 12, ref: r.id, title: r.title || r.id,
        meta: `${r.vendor || ''} · ${r.poId || ''}`.trim(),
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 13 && typeof PAYMENT_STAGE_DATA !== 'undefined') {
    (PAYMENT_STAGE_DATA.payments || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Paid', 'Settled', 'Closed'])) return;
      const since = r.dueDate && r.dueDate !== '—' ? r.dueDate : r.date;
      if (!since || since === '—') return;
      push(buildSlaItem({
        stageId: 13, ref: r.id, title: r.title || r.id,
        meta: `${r.vendor || ''} · ${r.invoiceId || ''}`.trim(),
        pendingSince: since, status: r.status
      }));
    });
  }

  if (sid === 14 && typeof RENEWAL_STAGE_DATA !== 'undefined') {
    (RENEWAL_STAGE_DATA.renewals || []).forEach(r => {
      if (!isOpenStatus(r.status, ['Finalized', 'Closed', 'Cancelled'])) return;
      push(buildSlaItem({
        stageId: 14, ref: r.id, title: `${r.vendorName} · ${r.renewalType}`,
        meta: `${r.contractId} · ${r.renewalFrom} → ${r.renewalTo}`,
        pendingSince: r.renewalDate, status: r.status,
        nextAction: 'Finalize renewal / attach documents'
      }));
    });
  }

  return items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1;
    return b.daysOpen - a.daysOpen;
  });
}

function collectExpirySlaItems() {
  const cfg = getSlaSettings();
  const nearDays = cfg.notify.nearExpiryDays || 30;
  const renewDays = cfg.notify.renewalWarnDays || 45;
  const list = typeof SLA_EXPIRY_WATCH !== 'undefined' ? SLA_EXPIRY_WATCH : [];
  const items = [];

  list.forEach(e => {
    const daysLeft = daysBetweenDates(APP_TODAY, e.expiryDate);
    if (daysLeft == null) return;
    const window = e.type === 'renewal' ? renewDays : nearDays;
    if (daysLeft > window) return;
    let severity = 'warning';
    if (daysLeft < 0) severity = 'danger';
    else if (daysLeft <= Math.ceil(window / 3)) severity = 'danger';
    items.push({
      kind: e.type === 'renewal' ? 'renewal' : 'expiry',
      stageId: e.type === 'renewal' ? 14 : null,
      ref: e.id,
      title: e.title,
      meta: e.entity,
      pendingSince: e.expiryDate,
      status: daysLeft < 0 ? 'Expired' : (daysLeft === 0 ? 'Due today' : `${daysLeft} day(s) left`),
      owners: e.owners,
      nextAction: e.impact,
      slaDays: window,
      daysOpen: daysLeft < 0 ? Math.abs(daysLeft) : (window - daysLeft),
      overdueBy: daysLeft < 0 ? Math.abs(daysLeft) : 0,
      daysLeft: Math.max(0, daysLeft),
      severity
    });
  });

  return items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  });
}

function slaDismissKey(scope) {
  return `mph_sla_dismiss_${scope}_${APP_TODAY}`;
}

function isSlaDismissed(scope) {
  try { return sessionStorage.getItem(slaDismissKey(scope)) === '1'; } catch (_) { return false; }
}

/** Remember that this SLA scope was already shown (once per stage / day). */
function markSlaShown(scope) {
  if (!scope) return;
  try { sessionStorage.setItem(slaDismissKey(scope), '1'); } catch (_) { /* ignore */ }
}

function dismissSlaModal(scope) {
  markSlaShown(scope);
  closeModal();
}

function pushSlaAlertsToQueue(items) {
  if (typeof ALERTS_GOV === 'undefined' || !items.length) return;
  items.forEach(it => {
    const key = `sla-${it.ref}`;
    if (ALERTS_GOV.some(a => a.slaKey === key)) return;
    ALERTS_GOV.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      slaKey: key,
      type: it.severity === 'danger' ? 'approval' : 'expiry',
      title: it.severity === 'danger' ? `SLA breached — ${it.ref}` : `SLA warning — ${it.ref}`,
      msg: `${it.title}: ${it.meta} · pending ${it.daysOpen}d vs SLA ${it.slaDays}d`,
      date: APP_TODAY,
      impact: it.nextAction,
      action: 'Open lifecycle stage / take follow-up',
      unread: true
    });
  });
  if (typeof renderTopbar === 'function') renderTopbar();
}

function notifySlaOfficials(items, scopeLabel) {
  const cfg = getSlaSettings();
  const channels = [];
  if (cfg.notify.email) channels.push('Email');
  if (cfg.notify.whatsapp) channels.push('WhatsApp');
  if (!channels.length || !items.length) return channels;

  items.forEach(it => {
    const key = `${it.ref}|${it.severity}`;
    if (slaNotifiedKeys.has(key)) return;
    slaNotifiedKeys.add(key);
  });

  const danger = items.filter(i => i.severity === 'danger').length;
  const warn = items.filter(i => i.severity === 'warning').length;
  const owners = [...new Set(items.map(i => i.owners).filter(Boolean))].slice(0, 3).join('; ');
  const entry = {
    at: `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    channels,
    summary: `${scopeLabel}: ${danger} overdue, ${warn} near deadline → ${owners || 'mapped officials'}`
  };
  slaNotifyLog.unshift(entry);
  if (slaNotifyLog.length > 20) slaNotifyLog.length = 20;
  return channels;
}

function renderSlaAlertModalBody(items, opts = {}) {
  const stageName = opts.stageName || 'Procurement';
  const scope = opts.scope || 'stage';
  const danger = items.filter(i => i.severity === 'danger').length;
  const warn = items.filter(i => i.severity === 'warning').length;
  const channels = opts.channels || [];
  const isExpiry = scope === 'expiry';

  const rows = items.map(it => {
    const badge = it.severity === 'danger'
      ? '<span class="badge badge-danger">Overdue</span>'
      : '<span class="badge badge-warning">Near deadline</span>';
    const timing = it.kind === 'expiry' || it.kind === 'renewal'
      ? (it.overdueBy > 0 ? `Expired ${it.overdueBy}d ago` : `${it.daysLeft}d remaining`)
      : (it.overdueBy > 0 ? `+${it.overdueBy}d over SLA` : `${it.daysLeft}d left in SLA`);
    return `<tr class="sla-row sla-row--${it.severity}">
      <td><strong>${it.ref}</strong><div class="sla-row-sub">${it.title}</div></td>
      <td>${it.meta}</td>
      <td class="cell-date">${it.pendingSince}</td>
      <td><strong>${it.daysOpen}</strong> / ${it.slaDays}d<div class="sla-row-sub">${timing}</div></td>
      <td>${badge}</td>
      <td>${it.owners}</td>
      <td>${it.nextAction}</td>
    </tr>`;
  }).join('');

  return `<div class="sla-alert-modal">
    <p class="need-row-detail-lead">${isExpiry
      ? 'Near-expiry and tender renewal windows from <strong>Settings</strong>.'
      : `Stage work has exceeded (or is approaching) the predefined state SLA for <strong>${stageName}</strong>.`}</p>
    <div class="tender-detail-stats tender-detail-stats--4">
      <div class="tender-stat"><span>Overdue</span><strong class="text-danger">${danger}</strong></div>
      <div class="tender-stat"><span>Near deadline</span><strong style="color:#c2410c">${warn}</strong></div>
      <div class="tender-stat"><span>As of</span><strong>${formatDateDMY(APP_TODAY)}</strong></div>
      <div class="tender-stat"><span>Notify</span><strong>${channels.length ? channels.join(' + ') : 'Off'}</strong></div>
    </div>
    <div class="data-table-wrap need-table">
      <table class="data-table">
        <thead><tr>
          <th>Reference</th><th>Details</th><th>${isExpiry ? 'Due / Expiry' : 'Pending since'}</th>
          <th>Days / SLA</th><th>Severity</th><th>Officials</th><th>Next action</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${channels.length ? `<p class="report-footnote mt-2"><i class="fa-solid fa-paper-plane"></i> Notify sent via <strong>${channels.join(' + ')}</strong> to mapped officials. Logged under Settings → Recent notifications.</p>` : ''}
    <div class="modal-inline-actions">
      <button type="button" class="btn btn-outline" onclick="dismissSlaModal('${opts.dismissScope || scope}')"><i class="fa-solid fa-xmark"></i> Got it</button>
      ${!isExpiry && opts.stageId ? `<button type="button" class="btn btn-primary" onclick="closeModal()"><i class="fa-solid fa-list-check"></i> Review stage list</button>` : ''}
      <button type="button" class="btn btn-outline" onclick="navigateTo('work-queue');closeModal()"><i class="fa-solid fa-bell"></i> Open Alerts</button>
    </div>
  </div>`;
}

function openSlaItemsModal(items, opts = {}) {
  if (!items.length) return;
  pushSlaAlertsToQueue(items);
  const channels = notifySlaOfficials(items, opts.stageName || opts.scopeLabel || 'SLA');
  const titleIcon = items.some(i => i.severity === 'danger') ? 'SLA breach' : 'SLA warning';

  // Stage SLA: show once per stage per day on first visit — not again on re-entry,
  // Automated/Manual UI refreshes, or clicking elsewhere on the same step.
  if (opts.scope === 'stage' && opts.dismissScope) {
    markSlaShown(opts.dismissScope);
  }

  openModal(
    `${titleIcon} — ${opts.stageName || opts.scopeLabel || 'Alert'}`,
    renderSlaAlertModalBody(items, { ...opts, channels }),
    { wide: true, large: true, replace: true }
  );
}

function scheduleStageSlaCheck(stageId) {
  if (currentRole !== 'gov' || currentPage !== 'workflow') return;
  clearTimeout(slaModalTimer);
  const sid = Number(stageId);
  slaModalTimer = setTimeout(() => maybeShowStageSlaModal(sid), 400);
}

function maybeShowStageSlaModal(stageId) {
  if (currentRole !== 'gov' || currentPage !== 'workflow') return;
  const sid = Number(stageId);
  if (!sid) return;

  // Only the stage currently on screen — ignore stale timers after a quick step change.
  if (Number(currentWorkflowStep) !== sid) return;

  // SLA popups start from Stage 3 (Indent) onwards — never on Need Identification or Stock Check.
  if (sid < 3) return;

  // Only when this stage is reached in the lifecycle (not a future preview).
  const progress = getWorkflowProgressStep();
  const renewalJump = sid === 14 && !govSequentialCommitted;
  if (sid > progress && !renewalJump) return;

  const dismissScope = `stage-${sid}`;
  if (isSlaDismissed(dismissScope)) return;
  if (document.getElementById('modalOverlay')?.classList.contains('open')) return;

  let items = collectStageSlaItems(sid);
  if (sid === 14) {
    const expiry = collectExpirySlaItems().filter(i => i.kind === 'renewal' || i.stageId === 14);
    items = [...items, ...expiry];
  }
  if (!items.length) return;

  const step = (typeof GOV_WORKFLOW !== 'undefined' ? GOV_WORKFLOW.find(s => s.id === sid) : null);
  openSlaItemsModal(items, {
    stageId: sid,
    stageName: `Stage ${sid}: ${step?.name || ''}`,
    scope: 'stage',
    dismissScope
  });
}

function previewExpirySlaModal() {
  const items = collectExpirySlaItems();
  if (!items.length) {
    openModal('No expiry alerts', `<div class="wf-inline-alert wf-inline-alert--info">
      <i class="fa-solid fa-circle-info"></i>
      <div><p>No near-expiry or renewal items fall inside the configured windows (as of ${formatDateDMY(APP_TODAY)}).</p></div>
    </div>`);
    return;
  }
  openSlaItemsModal(items, {
    scope: 'expiry',
    scopeLabel: 'Expiry & renewal',
    stageName: 'Expiry & tender renewal',
    dismissScope: 'expiry'
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  const authPage = document.getElementById('authPage');
  if (authPage) {
    authPage.classList.remove('is-hidden');
    authPage.style.display = 'flex';
  }
  initAuth();
  bindPageEvents();
  // Official gov notices appear on the login page as soon as the website loads
  setTimeout(() => showGovNoticesOnWebsiteLoad(), 450);
});
