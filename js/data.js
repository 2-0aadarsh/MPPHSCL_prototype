/* Mock Data for MP Health Procurement Prototype */

const CATEGORIES = ['All', 'Drugs', 'Equipment', 'Services', 'Consumables', 'Others'];

const GOV_WORKFLOW = [
  { id: 1, name: 'Need Identification', desc: 'Stock levels, patient load, disease burden and gap analysis are auto-populated from DVDMS / e-Aushadhi to determine requirements.', status: 'pending' },
  { id: 2, name: 'Stock Check', desc: 'Verify existing warehouse stock, other locations, approved open POs, and redistributable inventory.', status: 'pending' },
  { id: 3, name: 'Indent Raised', desc: 'Review raised indent lines by facility, quantity, priority and status.', status: 'pending' },
  { id: 4, name: 'Demand Consolidation', desc: 'Review consolidated district demand packages by category, period, and status.', status: 'pending' },
  { id: 5, name: 'PR & Budget Approval', desc: 'Purchase requisition with budget head allocation and administrative/financial sanction.', status: 'pending' },
  { id: 6, name: 'Tender Preparation', desc: 'System prepares NIT/RFP draft from prior stage data; division checkers upload consensus; final tender is issued.', status: 'pending' },
  { id: 7, name: 'Bid Evaluation', desc: 'System-assisted technical and financial bid evaluation; custom evaluation sheet generated for each tender.', status: 'pending' },
  { id: 8, name: 'Contract Approval', desc: 'Approve agreement from DVDMS / NIC / tender-synced terms (LOI, PBG, T&C). Decision with timestamp only — no re-keying of master data.', status: 'pending' },
  { id: 9, name: 'Award', desc: 'Track awarded tenders with LOA details, PBG collection and award checklist synced from NIC / Contract Management.', status: 'pending' },
  { id: 10, name: 'Purchase Order', desc: 'PO raised in DVDMS after contract execution; delivery schedule and supply tracked in Contract Management.', status: 'pending' },
  { id: 11, name: 'GRN & Inspection', desc: 'Goods receipt, quality testing, batch verification and acceptance certificate.', status: 'pending' },
  { id: 12, name: 'Invoice Matching', desc: 'Three-way match: PO, GRN, and invoice verification.', status: 'pending' },
  { id: 13, name: 'Payment', desc: 'Process payment within contract terms, apply LD if applicable.', status: 'pending' },
  { id: 14, name: 'Renewal', desc: 'Review vendor renewals, attached tender documents, and finalize renewals as Resource Manager.', status: 'pending' }
];

const WORKFLOW_GUIDE_PATH = 'assets/MP-Health-Procurement-Lifecycle-Guide.html';

const VENDOR_STAGE_CHECKLIST = {
  1: ['Company profile & contact details', 'GSTIN, PAN, incorporation certificate', 'Category & product line declaration', 'Registered address', 'Empanelment fee (Pending until present / Submitted when recorded)', 'Authorized signatory letter'],
  2: ['Bank account verification (cancelled cheque)', 'KYC documents & regulatory licenses', 'Address proof & signatory ID', 'Respond to verification queries within 48 hours'],
  3: ['Department review of registration & KYC', 'Confirm vendor code assignment (e.g. VND-MP-000123)', 'Approval notification on portal', 'Link approved profile to bidding'],
  4: ['Review tender and bid status in the table', 'Check EMD and document flags', 'Refresh to fetch the latest bid records', 'Confirm sync once bids appear to continue'],
  5: ['Review LOA / award records in the table', 'Check PBG due date and award value', 'Acknowledge LOA for issued awards', 'Confirm sync to continue lifecycle'],
  6: ['Select tender for this contract pack', 'LOI issue → LOI accept → PBG submission', 'Review draft template synced with tender docs', 'Upload tender-specific PBG, SBG, SOW, deliverables & signed contract'],
  7: ['Review delivery records in the table', 'Check challan, GRN and dispatch status', 'Refresh to fetch the latest deliveries', 'Confirm sync once records appear to continue'],
  8: ['Raise invoice with GRN reference', 'Attach delivery & acceptance proof', 'Submit invoice on portal', 'Track invoice verification status'],
  9: ['Review payment records by tender and bid', 'Refresh to fetch the latest payment status', 'Open a payment row for invoice / PO / UTR detail', 'Confirm credit and close the invoice cycle'],
  10: ['Select Active / In Progress contract or MSA', 'Choose Fresh renewal or Extra quality order', 'Propose renewal period and reason', 'Submit request for Resource Manager review']
};

const GOV_STAGE_CHECKLIST = {
  1: ['Assess stock levels & patient load', 'Gap analysis by facility', 'Disease burden review'],
  2: ['Warehouse stock verification', 'Inter-facility redistribution check', 'Open PO & redistributable inventory'],
  3: ['Search existing stock & open orders', 'Raise indent if unavailable', 'CMO / competent authority approval'],
  4: ['Duplicate demand check', 'District consolidation', 'Stock optimization before fresh procurement'],
  5: ['Purchase requisition with budget head', 'Administrative sanction', 'Financial approval'],
  6: ['Draft NIT/RFP with BOQ', 'Eligibility, EMD, timelines', 'Evaluation method (L1/QCBS)'],
  7: ['Technical evaluation committee', 'Financial bid opening', 'L1/QCBS scoring'],
  8: ['Confirm synced LOI / PBG / T&C from DVDMS–NIC–tender', 'Timestamped approval after LOI accept + PBG receive', 'Contract before PO gate'],
  9: ['Issue LOA to L1 bidder', 'PBG collection', 'Contract signing'],
  10: ['PO generation post-contract', 'Delivery schedule & terms', 'Vendor notification'],
  11: ['GRN & quality inspection', 'Batch verification', 'Acceptance certificate'],
  12: ['Three-way match: PO, GRN, Invoice', 'Deductions / LD if applicable', 'Finance verification'],
  13: ['Payment processing', 'Audit trail entry', 'Contract closure records'],
  14: ['Review renewal vendor list', 'Verify renewal period & status', 'Download attached tender / addendum / corrigendum PDFs', 'Finalize renewal with optional supporting document']
};

const VENDOR_STAGE_TIPS = {
  1: 'Ensure GSTIN matches bank account name exactly — mismatches delay KYC.',
  2: 'Respond to verification queries within 48 hours to avoid registration delays.',
  3: 'Vendor approval unlocks bidding — keep profile documents current.',
  4: 'Use Refresh to pull the latest bid status, then confirm sync to continue.',
  5: 'Refresh award records, acknowledge LOA where required, then confirm sync to continue.',
  6: 'Select the tender, accept LOI, submit PBG, review SLA / schedule / penalties from the RFP, then upload tender-specific contract documents.',
  7: 'Refresh delivery records, review challan / GRN status, then confirm sync to continue.',
  8: 'Invoice must reference GRN and delivery proof for three-way match.',
  9: 'Track payment status on the portal; escalate delays through helpdesk.',
  10: 'Raise renewal only against Active / In Progress contracts. RM finalizes on Stage 14.'
};

const GOV_STAGE_TIPS = {
  4: 'Optimize from warehouse and inter-facility stock before fresh procurement.',
  7: 'Commercial bids open only for technically qualified vendors.',
  8: 'Contract approval must precede PO generation per policy.',
  12: 'Three-way match: PO, GRN, and Invoice before payment release.'
};

/**
 * Stage 1 — Need Identification payload (simulates integrated API response).
 * In production this would come from related health & inventory APIs.
 */
const NEED_IDENTIFICATION_API = {
  meta: {
    source: 'DVDMS',
    endpoint: '/api/v1/dvdms/need-identification',
    lastSynced: '03-09-2026 02:45 IST',
    syncedBy: 'SYSTEM · DVDMS / e-Aushadhi',
    district: 'Bhopal Division',
    facilities: 12,
    assessmentPeriod: 'Aug 2026',
    status: 'Synced'
  },
  stockLevels: {
    label: 'Stock Levels',
    summary: 'Warehouse + facility on-hand vs reorder point',
    overallFillRate: '68%',
    criticalSkus: 14,
    belowReorder: 28,
    daysOfCover: 11,
    status: 'Attention',
    rows: [
      { facility: 'Gandhi Medical College', sku: 'Paracetamol 500mg', onHand: 42000, reorder: 80000, coverDays: 8, status: 'Critical', date: '18-08-2026' },
      { facility: 'M.Y. Hospital Indore', sku: 'IV Fluids (NS)', onHand: 18500, reorder: 25000, coverDays: 12, status: 'Low', date: '01-09-2026' },
      { facility: 'NSCB Jabalpur', sku: 'Insulin 40 IU', onHand: 9200, reorder: 15000, coverDays: 9, status: 'Critical', date: '15-08-2026' },
      { facility: 'GR Medical Gwalior', sku: 'Amoxicillin 250mg', onHand: 61000, reorder: 45000, coverDays: 22, status: 'Adequate', date: '03-09-2026' },
      { facility: 'District Hospital Rewa', sku: 'ORS Sachets', onHand: 11000, reorder: 20000, coverDays: 10, status: 'Low', date: '30-08-2026' },
      { facility: 'CHC Sehore', sku: 'Surgical Gloves', onHand: 8500, reorder: 12000, coverDays: 14, status: 'Low', date: '02-09-2026' },
      { facility: 'Civil Hospital Sagar', sku: 'Metformin 500mg', onHand: 34000, reorder: 28000, coverDays: 26, status: 'Adequate', date: '29-08-2026' },
      { facility: 'District Hospital Ujjain', sku: 'Ceftriaxone 1g', onHand: 4200, reorder: 9000, coverDays: 7, status: 'Critical', date: '27-08-2026' },
      { facility: 'GMC Bhopal — Stores', sku: 'PPE Kit', onHand: 2600, reorder: 5000, coverDays: 11, status: 'Low', date: '31-08-2026' },
      { facility: 'Regional Store Indore', sku: 'Hospital Linen', onHand: 18000, reorder: 15000, coverDays: 30, status: 'Adequate', date: '04-09-2026' },
      { facility: 'District Hospital Satna', sku: 'Iron Folic Acid', onHand: 7200, reorder: 14000, coverDays: 9, status: 'Critical', date: '26-08-2026' },
      { facility: 'CHC Hoshangabad', sku: 'Rabies Vaccine', onHand: 980, reorder: 1500, coverDays: 13, status: 'Low', date: '03-09-2026' }
    ]
  },
  patientLoad: {
    label: 'Patient Load',
    summary: 'OPD + IPD footfall driving consumption forecast',
    opdMonthly: '4.2 Lakh',
    ipdOccupancy: '86%',
    growthYoY: '+6.4%',
    highLoadFacilities: 5,
    status: 'Elevated',
    rows: [
      { facility: 'Gandhi Medical College', opd: 48500, ipdBedOcc: '92%', trend: '↑ 8%', category: 'Tertiary', date: '02-09-2026' },
      { facility: 'M.Y. Hospital Indore', opd: 52100, ipdBedOcc: '89%', trend: '↑ 5%', category: 'Tertiary', date: '01-09-2026' },
      { facility: 'District Hospital Rewa', opd: 18200, ipdBedOcc: '78%', trend: '↑ 3%', category: 'Secondary', date: '31-08-2026' },
      { facility: 'CHC Sehore', opd: 9400, ipdBedOcc: '71%', trend: '→ 0%', category: 'CHC', date: '03-09-2026' },
      { facility: 'NSCB Jabalpur', opd: 41200, ipdBedOcc: '88%', trend: '↑ 4%', category: 'Tertiary', date: '30-08-2026' },
      { facility: 'GR Medical Gwalior', opd: 35600, ipdBedOcc: '84%', trend: '↑ 2%', category: 'Tertiary', date: '29-08-2026' },
      { facility: 'District Hospital Ujjain', opd: 22100, ipdBedOcc: '80%', trend: '↑ 6%', category: 'Secondary', date: '28-08-2026' },
      { facility: 'Civil Hospital Sagar', opd: 16800, ipdBedOcc: '76%', trend: '→ 1%', category: 'Secondary', date: '27-08-2026' },
      { facility: 'District Hospital Satna', opd: 14200, ipdBedOcc: '74%', trend: '↑ 3%', category: 'Secondary', date: '26-08-2026' },
      { facility: 'CHC Hoshangabad', opd: 8100, ipdBedOcc: '68%', trend: '↓ 2%', category: 'CHC', date: '25-08-2026' },
      { facility: 'District Hospital Mandla', opd: 11900, ipdBedOcc: '72%', trend: '↑ 1%', category: 'Secondary', date: '24-08-2026' },
      { facility: 'PHC Berasia', opd: 5200, ipdBedOcc: '61%', trend: '→ 0%', category: 'PHC', date: '04-09-2026' }
    ]
  },
  diseaseBurden: {
    label: 'Disease Burden',
    summary: 'Priority disease programmes influencing formulary demand',
    topConditions: 4,
    seasonalAlert: 'Monsoon vector-borne peak',
    programmeSkus: 36,
    riskScore: 'High',
    status: 'High',
    rows: [
      { condition: 'Seasonal Influenza / ARI', cases: '28,400', trend: '↑', skuFocus: 'Antipyretics, Antibiotics', priority: 'High', date: '30-08-2026' },
      { condition: 'Vector-borne (Dengue / Malaria)', cases: '6,120', trend: '↑', skuFocus: 'IV Fluids, Antimalarials', priority: 'Critical', date: '02-09-2026' },
      { condition: 'NCD — Diabetes', cases: '41,800', trend: '↑', skuFocus: 'Insulin, Oral hypoglycemics', priority: 'High', date: '20-08-2026' },
      { condition: 'Maternal & Child Health', cases: '12,600', trend: '→', skuFocus: 'Iron, Vaccines, ORS', priority: 'Medium', date: '01-09-2026' },
      { condition: 'TB Elimination Programme', cases: '3,840', trend: '↓', skuFocus: 'Anti-TB drugs, Diagnostics', priority: 'High', date: '29-08-2026' },
      { condition: 'Cardiovascular / Hypertension', cases: '22,100', trend: '↑', skuFocus: 'Anti-hypertensives, Statins', priority: 'High', date: '28-08-2026' },
      { condition: 'Diarrhoea / Dehydration (U5)', cases: '9,750', trend: '↑', skuFocus: 'ORS, Zinc, IV Fluids', priority: 'Critical', date: '03-09-2026' },
      { condition: 'Snakebite / Trauma', cases: '1,120', trend: '→', skuFocus: 'ASV, Trauma consumables', priority: 'Medium', date: '27-08-2026' },
      { condition: 'Oncology Support Care', cases: '2,460', trend: '↑', skuFocus: 'Cytotoxics, Supportive meds', priority: 'High', date: '26-08-2026' },
      { condition: 'Mental Health Programme', cases: '5,300', trend: '↑', skuFocus: 'Psychotropics', priority: 'Medium', date: '25-08-2026' },
      { condition: 'Eye Care / Cataract camps', cases: '4,980', trend: '→', skuFocus: 'Ophthalmic consumables', priority: 'Medium', date: '24-08-2026' },
      { condition: 'Immunisation drive (MR)', cases: '18,200', trend: '↑', skuFocus: 'Vaccines, Syringes', priority: 'High', date: '04-09-2026' }
    ]
  },
  gapAnalysis: {
    label: 'Gap Analysis',
    summary: 'Requirement gap after stock + open PO netting',
    netGapValue: '₹18.6 Cr',
    lineItems: 47,
    fulfillFromStock: 28,
    freshProcurement: 19,
    estimatedSavings: '₹2.1 Cr',
    status: 'Action Required',
    rows: [
      { item: 'Paracetamol 500mg Tab', required: '12.0 L packs', available: '4.2 L', openPo: '1.5 L', gap: '6.3 L', action: 'Fresh tender', date: '03-09-2026' },
      { item: 'IV Normal Saline 500ml', required: '2.8 L units', available: '1.1 L', openPo: '0.4 L', gap: '1.3 L', action: 'Fresh tender', date: '03-09-2026' },
      { item: 'Insulin 40 IU Vial', required: '45,000', available: '18,200', openPo: '8,000', gap: '18,800', action: 'Rate contract top-up', date: '29-08-2026' },
      { item: 'Surgical Gloves (pair)', required: '9.5 L', available: '6.2 L', openPo: '2.0 L', gap: '1.3 L', action: 'Redistribute + PO', date: '01-09-2026' },
      { item: 'Amoxicillin 250mg Cap', required: '5.4 L packs', available: '2.1 L', openPo: '0.8 L', gap: '2.5 L', action: 'Fresh tender', date: '02-09-2026' },
      { item: 'ORS Sachets', required: '3.2 L', available: '1.4 L', openPo: '0.5 L', gap: '1.3 L', action: 'Redistribute + PO', date: '31-08-2026' },
      { item: 'Ceftriaxone 1g Inj', required: '28,000', available: '9,500', openPo: '4,000', gap: '14,500', action: 'Rate contract top-up', date: '30-08-2026' },
      { item: 'PPE Kit', required: '22,000', available: '8,200', openPo: '3,500', gap: '10,300', action: 'Fresh tender', date: '28-08-2026' },
      { item: 'Metformin 500mg', required: '6.8 L packs', available: '4.1 L', openPo: '1.0 L', gap: '1.7 L', action: 'Rate contract top-up', date: '27-08-2026' },
      { item: 'Iron Folic Acid Tab', required: '4.5 L', available: '1.9 L', openPo: '0.6 L', gap: '2.0 L', action: 'Fresh tender', date: '26-08-2026' },
      { item: 'Rabies Vaccine', required: '6,400', available: '2,100', openPo: '1,200', gap: '3,100', action: 'Emergency purchase', date: '25-08-2026' },
      { item: 'Hospital Linen sets', required: '18,000', available: '11,000', openPo: '2,500', gap: '4,500', action: 'Redistribute + PO', date: '04-09-2026' }
    ]
  }
};

/**
 * Stage 2 — Stock Check payload (simulates inventory optimization API).
 * Verifies warehouse stock, other locations, open POs, and redistributable inventory.
 */
const STOCK_CHECK_API = {
  meta: {
    source: 'DVDMS',
    endpoint: '/api/v1/dvdms/stock-check',
    algorithm: 'Demand–stock matching',
    lastSynced: '03-09-2026 13:15 IST',
    syncedBy: 'SYSTEM · DVDMS / e-Aushadhi',
    district: 'Bhopal Division',
    facilities: 12,
    assessmentPeriod: 'Aug 2026',
    status: 'Synced'
  },
  warehouse: {
    label: 'Warehouse Stock',
    summary: 'Central & regional warehouse on-hand verified via inventory APIs',
    sites: 3,
    skusVerified: 186,
    surplusValue: '₹1.4 Cr',
    deficitSkus: 22,
    status: 'Verified',
    rows: [
      { facility: 'Central Warehouse — Bhopal', item: 'Paracetamol 500mg Tab', onHand: '2.8 L packs', reorder: '2.0 L', usable: '2.6 L', recommendation: 'Release to GMC Bhopal', status: 'Surplus', date: '01-09-2026' },
      { facility: 'Central Warehouse — Bhopal', item: 'IV Normal Saline 500ml', onHand: '0.9 L units', reorder: '1.2 L', usable: '0.85 L', recommendation: 'Hold buffer; await open PO', status: 'Low', date: '28-08-2026' },
      { facility: 'Regional Store — Indore', item: 'Surgical Gloves (pair)', onHand: '4.1 L', reorder: '3.0 L', usable: '3.9 L', recommendation: 'Redistribute 0.8 L to Rewa', status: 'Surplus', date: '02-09-2026' },
      { facility: 'Regional Store — Jabalpur', item: 'Amoxicillin 250mg', onHand: '1.1 L packs', reorder: '1.5 L', usable: '1.0 L', recommendation: 'Top-up via open PO INV-0910', status: 'Low', date: '30-08-2026' },
      { facility: 'Regional Store — Gwalior', item: 'ORS Sachets', onHand: '2.4 L', reorder: '1.8 L', usable: '2.3 L', recommendation: 'Release to DH Rewa', status: 'Surplus', date: '29-08-2026' },
      { facility: 'Central Warehouse — Bhopal', item: 'Insulin 40 IU', onHand: '0.6 L vials', reorder: '0.9 L', usable: '0.55 L', recommendation: 'Cold-chain hold', status: 'Low', date: '27-08-2026' },
      { facility: 'Regional Store — Rewa', item: 'PPE Kit', onHand: '1.8 L', reorder: '1.2 L', usable: '1.7 L', recommendation: 'Release to GMC Bhopal', status: 'Surplus', date: '03-09-2026' },
      { facility: 'Central Warehouse — Bhopal', item: 'Ceftriaxone 1g', onHand: '0.45 L', reorder: '0.7 L', usable: '0.42 L', recommendation: 'Await open PO', status: 'Low', date: '26-08-2026' },
      { facility: 'Regional Store — Indore', item: 'Metformin 500mg', onHand: '3.2 L', reorder: '2.5 L', usable: '3.0 L', recommendation: 'Release to Ujjain DH', status: 'Surplus', date: '25-08-2026' },
      { facility: 'Regional Store — Jabalpur', item: 'Hospital Linen', onHand: '0.95 L', reorder: '1.4 L', usable: '0.9 L', recommendation: 'Top-up via PO', status: 'Low', date: '24-08-2026' },
      { facility: 'Central Warehouse — Bhopal', item: 'Iron Folic Acid', onHand: '2.1 L', reorder: '1.6 L', usable: '2.0 L', recommendation: 'Release to Satna DH', status: 'Surplus', date: '04-09-2026' },
      { facility: 'Regional Store — Gwalior', item: 'Rabies Vaccine', onHand: '0.22 L', reorder: '0.35 L', usable: '0.2 L', recommendation: 'Hold; cold-chain', status: 'Low', date: '23-08-2026' }
    ]
  },
  otherLocations: {
    label: 'Other Locations',
    summary: 'Inter-facility stock available for redistribution',
    facilitiesWithSurplus: 5,
    transferableSkus: 34,
    estTransferValue: '₹0.62 Cr',
    leadDays: '2–5',
    status: 'Available',
    rows: [
      { from: 'M.Y. Hospital Indore', to: 'District Hospital Rewa', item: 'Insulin 40 IU Vial', qty: '6,200', coverGain: '+9 days', recommendation: 'Approve transfer', status: 'Recommended', date: '03-09-2026' },
      { from: 'NSCB Jabalpur', to: 'CHC Sehore', item: 'ORS Sachets', qty: '18,000', coverGain: '+14 days', recommendation: 'Approve transfer', status: 'Recommended', date: '01-09-2026' },
      { from: 'GR Medical Gwalior', to: 'Gandhi Medical College', item: 'PPE Kit', qty: '2,400', coverGain: '+6 days', recommendation: 'Partial transfer (60%)', status: 'Review', date: '29-08-2026' },
      { from: 'District Hospital Rewa', to: 'M.Y. Hospital Indore', item: 'Paracetamol 500mg Tab', qty: '0.4 L', coverGain: '+3 days', recommendation: 'Defer — low surplus margin', status: 'Hold', date: '27-08-2026' },
      { from: 'Civil Hospital Sagar', to: 'District Hospital Satna', item: 'Amoxicillin 250mg', qty: '12,000', coverGain: '+8 days', recommendation: 'Approve transfer', status: 'Recommended', date: '02-09-2026' },
      { from: 'District Hospital Ujjain', to: 'CHC Hoshangabad', item: 'IV Fluids (NS)', qty: '3,500', coverGain: '+5 days', recommendation: 'Approve transfer', status: 'Recommended', date: '30-08-2026' },
      { from: 'GMC Bhopal — Stores', to: 'PHC Berasia', item: 'ORS Sachets', qty: '4,800', coverGain: '+11 days', recommendation: 'Approve transfer', status: 'Recommended', date: '28-08-2026' },
      { from: 'Regional Store Indore', to: 'NSCB Jabalpur', item: 'Surgical Gloves', qty: '0.6 L', coverGain: '+4 days', recommendation: 'Partial transfer', status: 'Review', date: '26-08-2026' },
      { from: 'District Hospital Mandla', to: 'District Hospital Rewa', item: 'Iron Folic Acid', qty: '8,500', coverGain: '+7 days', recommendation: 'Approve transfer', status: 'Recommended', date: '25-08-2026' },
      { from: 'CHC Sehore', to: 'CHC Hoshangabad', item: 'Metformin 500mg', qty: '5,200', coverGain: '+6 days', recommendation: 'Defer — verify expiry', status: 'Hold', date: '24-08-2026' },
      { from: 'M.Y. Hospital Indore', to: 'District Hospital Ujjain', item: 'Ceftriaxone 1g', qty: '1,800', coverGain: '+5 days', recommendation: 'Approve transfer', status: 'Recommended', date: '04-09-2026' },
      { from: 'GR Medical Gwalior', to: 'Civil Hospital Sagar', item: 'Hospital Linen', qty: '900', coverGain: '+3 days', recommendation: 'Review logistics cost', status: 'Review', date: '23-08-2026' }
    ]
  },
  openPos: {
    label: 'Approved Open POs',
    summary: 'In-flight purchase orders that can offset fresh indent',
    openCount: 5,
    pipelineValue: '₹0.38 Cr',
    arriving7d: 2,
    delayed: 1,
    status: 'Tracked',
    rows: [
      { po: 'PO-2026-0089', vendor: 'MediSupply India', item: 'Hospital Linen — Batch 3', qty: '12,000 sets', eta: '06-09-2026', facility: 'GMC Bhopal', recommendation: 'Expedite GRN slot', status: 'On Track', date: '02-09-2026' },
      { po: 'PO-2025-0234', vendor: 'PharmaCare Distributors', item: 'Essential Medicines Q3', qty: 'Mixed SKU', eta: '10-09-2026', facility: 'Central Warehouse', recommendation: 'Net against gap analysis', status: 'On Track', date: '25-08-2026' },
      { po: 'PO-2026-0095', vendor: 'MedEquip Solutions', item: 'Patient Monitor accessories', qty: '48 kits', eta: '18-09-2026', facility: 'M.Y. Indore', recommendation: 'Flag delay risk', status: 'At Risk', date: '30-08-2026' },
      { po: 'PO-2026-0102', vendor: 'CleanCare Supplies', item: 'Disposable Gloves', qty: '1.5 L pairs', eta: '08-09-2026', facility: 'Regional Store Indore', recommendation: 'Use before fresh tender', status: 'On Track', date: '01-09-2026' },
      { po: 'PO-2026-0110', vendor: 'MediSupply India', item: 'Paracetamol 500mg', qty: '2.0 L packs', eta: '12-09-2026', facility: 'Central Warehouse', recommendation: 'Offset gap analysis', status: 'On Track', date: '03-09-2026' },
      { po: 'PO-2026-0114', vendor: 'PharmaCare Distributors', item: 'Insulin 40 IU', qty: '10,000 vials', eta: '15-09-2026', facility: 'Regional Store Rewa', recommendation: 'Cold-chain slot ready', status: 'On Track', date: '29-08-2026' },
      { po: 'PO-2026-0118', vendor: 'CleanCare Supplies', item: 'PPE Kit', qty: '8,000', eta: '20-09-2026', facility: 'GMC Bhopal', recommendation: 'Monitor vendor ETA', status: 'At Risk', date: '28-08-2026' },
      { po: 'PO-2026-0121', vendor: 'MedEquip Solutions', item: 'IV Fluids (NS)', qty: '0.8 L units', eta: '09-09-2026', facility: 'NSCB Jabalpur', recommendation: 'Net against indent', status: 'On Track', date: '27-08-2026' },
      { po: 'PO-2026-0125', vendor: 'MediSupply India', item: 'Amoxicillin 250mg', qty: '1.2 L packs', eta: '14-09-2026', facility: 'Regional Store Gwalior', recommendation: 'Use before tender', status: 'On Track', date: '26-08-2026' },
      { po: 'PO-2026-0128', vendor: 'PharmaCare Distributors', item: 'Ceftriaxone 1g', qty: '6,000', eta: '22-09-2026', facility: 'District Hospital Ujjain', recommendation: 'Escalate delay', status: 'At Risk', date: '24-08-2026' },
      { po: 'PO-2026-0130', vendor: 'CleanCare Supplies', item: 'ORS Sachets', qty: '0.9 L', eta: '07-09-2026', facility: 'CHC Sehore', recommendation: 'Expedite GRN', status: 'On Track', date: '04-09-2026' },
      { po: 'PO-2026-0133', vendor: 'MediSupply India', item: 'Iron Folic Acid', qty: '1.1 L', eta: '11-09-2026', facility: 'District Hospital Satna', recommendation: 'Offset MCH demand', status: 'On Track', date: '23-08-2026' }
    ]
  },
  redistributable: {
    label: 'Redistributable Inventory',
    summary: 'Ranked surplus that can fulfill demand without new procurement',
    candidates: 28,
    recommendedNow: 19,
    estSavings: '₹2.1 Cr',
    confidence: '87%',
    status: 'Action Ready',
    rows: [
      { item: 'Paracetamol 500mg Tab', from: 'Central Warehouse — Bhopal', to: 'GMC Bhopal', qty: '1.2 L packs', savings: '₹42 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '03-09-2026' },
      { item: 'Surgical Gloves (pair)', from: 'Regional Store — Indore', to: 'District Hospital Rewa', qty: '0.8 L', savings: '₹18 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '02-09-2026' },
      { item: 'Insulin 40 IU Vial', from: 'M.Y. Hospital Indore', to: 'District Hospital Rewa', qty: '6,200', savings: '₹28 L', recommendation: 'Cold-chain transfer', status: 'High Confidence', date: '01-09-2026' },
      { item: 'ORS Sachets', from: 'NSCB Jabalpur', to: 'CHC Sehore', qty: '18,000', savings: '₹6 L', recommendation: 'Batch transfer', status: 'Medium Confidence', date: '31-08-2026' },
      { item: 'Amoxicillin 250mg', from: 'Civil Hospital Sagar', to: 'District Hospital Satna', qty: '12,000', savings: '₹9 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '30-08-2026' },
      { item: 'PPE Kit', from: 'Regional Store — Rewa', to: 'GMC Bhopal', qty: '2,000', savings: '₹14 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '29-08-2026' },
      { item: 'IV Fluids (NS)', from: 'District Hospital Ujjain', to: 'CHC Hoshangabad', qty: '3,500', savings: '₹7 L', recommendation: 'Batch transfer', status: 'Medium Confidence', date: '28-08-2026' },
      { item: 'Metformin 500mg', from: 'Regional Store — Indore', to: 'District Hospital Ujjain', qty: '0.9 L', savings: '₹11 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '27-08-2026' },
      { item: 'Iron Folic Acid', from: 'Central Warehouse — Bhopal', to: 'District Hospital Satna', qty: '0.7 L', savings: '₹5 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '26-08-2026' },
      { item: 'Hospital Linen', from: 'GR Medical Gwalior', to: 'Civil Hospital Sagar', qty: '900', savings: '₹4 L', recommendation: 'Review logistics', status: 'Medium Confidence', date: '25-08-2026' },
      { item: 'Ceftriaxone 1g', from: 'M.Y. Hospital Indore', to: 'District Hospital Ujjain', qty: '1,800', savings: '₹12 L', recommendation: 'Auto-allocate', status: 'High Confidence', date: '04-09-2026' },
      { item: 'Rabies Vaccine', from: 'Regional Store — Gwalior', to: 'CHC Sehore', qty: '420', savings: '₹3 L', recommendation: 'Cold-chain transfer', status: 'Medium Confidence', date: '24-08-2026' }
    ]
  }
};

/**
 * Stage 5 — PR & Budget Approval (Resource Manager verification view).
 * Department submissions / OCR run behind the scenes; RM reviews outcomes only.
 */
const PR_BUDGET_APPROVAL_API = {
  meta: {
    source: 'related apis',
    endpoint: '/api/v1/pr-budget-approval',
    ocrEndpoint: '/api/v1/docs/ocr-extract',
    docsEndpoint: '/api/v1/departments/{deptId}/budget-documents',
    lastSynced: '03-09-2026 14:40 IST',
    syncedBy: 'SYSTEM',
    prNumber: 'PR-MP-2026-0912',
    district: 'Bhopal Division',
    category: 'Drugs',
    estimatedRange: '₹16.8 Cr – ₹21.5 Cr',
    status: 'Under Verification'
  },
  checklist: [
    {
      id: 'pr-draft',
      title: 'Purchase requisition with budget head',
      detail: 'PR raised from consolidated demand with scheme / budget head mapping.',
      section: 'Procurement Cell',
      owner: 'Procurement Officer',
      status: 'Verified',
      done: true
    },
    {
      id: 'admin-sanction',
      title: 'Administrative sanction',
      detail: 'Competent authority administrative approval against residual procurement gap.',
      section: 'Directorate / CMO Office',
      owner: 'CMO Office — Bhopal',
      status: 'Verified',
      done: true
    },
    {
      id: 'fin-approval',
      title: 'Financial approval',
      detail: 'Finance concurrence and budget availability confirmation under GFRs.',
      section: 'Finance Wing',
      owner: 'GM Finance',
      status: 'Pending review',
      done: false
    },
    {
      id: 'dept-budget',
      title: 'Department budget concurrence',
      detail: 'Each indenting / programme department confirms head-wise availability.',
      section: 'Programme Departments',
      owner: 'Resource Manager (verify)',
      status: 'In progress',
      done: false
    },
    {
      id: 'doc-ocr',
      title: 'Supporting documents received',
      detail: 'Departments have uploaded sanction notes and supporting files. Scanned or handwritten notes are read and summarised for review.',
      section: 'Records / Document Cell',
      owner: 'Department clerks',
      status: 'Partial',
      done: false
    }
  ],
  departments: [
    {
      id: 'finance',
      name: 'Finance Wing',
      shortName: 'Finance',
      category: 'Drugs',
      budgetHead: '2210-01-110-01',
      scheme: 'NHM — Essential Drugs',
      allocated: '₹6.40 Cr',
      requested: '₹5.85 Cr',
      available: '₹6.40 Cr',
      status: 'Approved',
      decisionBy: 'GM Finance',
      decisionDate: '02-09-2026',
      reason: 'Budget head has adequate balance for Q2. Concurrence granted subject to L1 outcome within estimated range.',
      reasonSource: 'Sanction note (PDF)',
      sectionWork: ['Financial concurrence', 'Budget head locking', 'GFRs compliance check'],
      documents: [
        { id: 'DOC-FIN-091', name: 'Financial Concurrence Note.pdf', kind: 'PDF', uploadedBy: 'Finance Wing', uploadedOn: '02-09-2026', ocr: false },
        { id: 'DOC-FIN-092', name: 'Budget Head Availability Certificate.pdf', kind: 'PDF', uploadedBy: 'Budget Cell', uploadedOn: '02-09-2026', ocr: false }
      ],
      ocrExtract: null
    },
    {
      id: 'cmo',
      name: 'CMO / Administrative Office',
      shortName: 'Admin Sanction',
      category: 'Drugs',
      budgetHead: 'AS-BPL-2026-Q2',
      scheme: 'District Administrative Sanction',
      allocated: '₹4.20 Cr',
      requested: '₹4.20 Cr',
      available: '₹4.20 Cr',
      status: 'Approved',
      decisionBy: 'CMO — Bhopal',
      decisionDate: '01-09-2026',
      reason: 'Administrative sanction accorded for residual gap after stock optimization. Priority: critical & essential formulary SKUs.',
      reasonSource: 'Signed AS order (scanned note)',
      sectionWork: ['Administrative sanction order', 'Priority classification', 'Facility coverage confirmation'],
      documents: [
        { id: 'DOC-CMO-044', name: 'AS Order — Cover note (scanned).jpg', kind: 'Scanned note', uploadedBy: 'CMO Office Clerk', uploadedOn: '01-09-2026', ocr: true },
        { id: 'DOC-CMO-045', name: 'Administrative Sanction Order.pdf', kind: 'PDF', uploadedBy: 'CMO Office', uploadedOn: '01-09-2026', ocr: false }
      ],
      ocrExtract: {
        sourceDoc: 'AS Order — Cover note (scanned).jpg',
        confidence: '91%',
        fields: [
          { label: 'Sanction amount', value: '₹4.20 Cr' },
          { label: 'Authority', value: 'CMO Bhopal' },
          { label: 'Decision', value: 'Approved' },
          { label: 'Conditions', value: 'Subject to finance concurrence & rate contract ceilings' },
          { label: 'Date on note', value: '01-09-2026' }
        ],
        rawText: 'AS accorded for Rs 4.20 Cr against PR-MP-2026-0912 for essential drugs — Bhopal Division. Conditionally approved pending Finance Wing concurrence.'
      }
    },
    {
      id: 'nhm',
      name: 'NHM Programme Division',
      shortName: 'NHM',
      category: 'Drugs',
      budgetHead: 'NHM-DRG-Q2-26',
      scheme: 'NHM Free Drug Initiative',
      allocated: '₹3.10 Cr',
      requested: '₹3.75 Cr',
      available: '₹3.10 Cr',
      status: 'Not Approved',
      decisionBy: 'State Programme Officer — NHM',
      decisionDate: '03-09-2026',
      reason: 'Requested amount exceeds Q2 NHM free-drug ceiling by ₹0.65 Cr. Resubmit with revised quantity for non-priority SKUs or seek additional allocation from State Health Society.',
      reasonSource: 'Rejection note (handwritten, scanned)',
      sectionWork: ['Programme budget check', 'SKU priority vs NHM EDL', 'Ceiling enforcement'],
      documents: [
        { id: 'DOC-NHM-078', name: 'NHM Rejection Note (scanned).jpg', kind: 'Scanned note', uploadedBy: 'NHM Cell', uploadedOn: '03-09-2026', ocr: true },
        { id: 'DOC-NHM-079', name: 'Q2 Ceiling Statement.pdf', kind: 'PDF', uploadedBy: 'NHM Accounts', uploadedOn: '03-09-2026', ocr: false }
      ],
      ocrExtract: {
        sourceDoc: 'NHM Rejection Note (scanned).jpg',
        confidence: '88%',
        fields: [
          { label: 'Decision', value: 'Not Approved' },
          { label: 'Shortfall', value: '₹0.65 Cr over Q2 ceiling' },
          { label: 'Action required', value: 'Revise qty / seek SHS additional allocation' },
          { label: 'Officer', value: 'SPO — NHM' },
          { label: 'Date on note', value: '03-09-2026' }
        ],
        rawText: 'Not approved. Request 3.75 Cr vs available 3.10 Cr. Excess 0.65 Cr. Please revise non-priority lines or obtain SHS approval for additional funds.'
      }
    },
    {
      id: 'stores',
      name: 'Central Stores / Warehouse',
      shortName: 'Stores',
      category: 'Drugs',
      budgetHead: 'STR-OPT-2026',
      scheme: 'Stock optimization residual',
      allocated: '₹1.80 Cr',
      requested: '₹1.55 Cr',
      available: '₹1.80 Cr',
      status: 'Under Review',
      decisionBy: 'Store Manager — Consolidation Cell',
      decisionDate: '—',
      reason: 'Awaiting final netting of open POs and redistributable stock confirmation before locking residual budget.',
      reasonSource: 'Department status remark (typed)',
      sectionWork: ['Residual gap confirmation', 'Open PO netting', 'Redistribution offsets'],
      documents: [
        { id: 'DOC-STR-033', name: 'Residual Gap Working Sheet.pdf', kind: 'PDF', uploadedBy: 'Stores', uploadedOn: '02-09-2026', ocr: false }
      ],
      ocrExtract: null
    },
    {
      id: 'medical',
      name: 'Medical / Specialty Indenting Dept.',
      shortName: 'Medical',
      category: 'Drugs',
      budgetHead: 'MED-ONC-Q2',
      scheme: 'Specialty & oncology buffer',
      allocated: '₹2.25 Cr',
      requested: '₹2.25 Cr',
      available: '₹2.00 Cr',
      status: 'Partial',
      decisionBy: 'HOD — Medical Services',
      decisionDate: '02-09-2026',
      reason: 'Partial concurrence: ₹2.00 Cr approved for critical oncology lines; ₹0.25 Cr deferred pending updated patient-load certificate from GMC.',
      reasonSource: 'Partial sanction note (handwritten, scanned)',
      sectionWork: ['Clinical priority confirmation', 'Patient-load linkage', 'Partial head release'],
      documents: [
        { id: 'DOC-MED-061', name: 'Partial Sanction Note (scanned).jpg', kind: 'Scanned note', uploadedBy: 'Medical Dept Clerk', uploadedOn: '02-09-2026', ocr: true },
        { id: 'DOC-MED-062', name: 'Oncology Priority List.pdf', kind: 'PDF', uploadedBy: 'Medical Dept', uploadedOn: '01-09-2026', ocr: false }
      ],
      ocrExtract: {
        sourceDoc: 'Partial Sanction Note (scanned).jpg',
        confidence: '90%',
        fields: [
          { label: 'Decision', value: 'Partial Approved' },
          { label: 'Approved portion', value: '₹2.00 Cr' },
          { label: 'Deferred', value: '₹0.25 Cr' },
          { label: 'Condition', value: 'Updated patient-load certificate from GMC' },
          { label: 'Date on note', value: '02-09-2026' }
        ],
        rawText: 'Partial approval Rs 2.00 Cr for critical oncology. Balance 0.25 Cr held till GMC patient load certificate received.'
      }
    },
    {
      id: 'equip-fin',
      name: 'Finance Wing — Equipment',
      shortName: 'Finance (Eq)',
      category: 'Equipment',
      budgetHead: '2210-05-105-02',
      scheme: 'Diagnostic Equipment Capex',
      allocated: '₹3.50 Cr',
      requested: '₹3.20 Cr',
      available: '₹3.50 Cr',
      status: 'Approved',
      decisionBy: 'GM Finance',
      decisionDate: '28-08-2026',
      reason: 'Capex head has adequate balance for CT / imaging cluster under Q2 equipment plan.',
      reasonSource: 'Sanction note (PDF)',
      sectionWork: ['Capex concurrence', 'Budget head locking'],
      documents: [
        { id: 'DOC-EQF-011', name: 'Equipment Capex Concurrence.pdf', kind: 'PDF', uploadedBy: 'Finance Wing', uploadedOn: '28-08-2026', ocr: false }
      ],
      ocrExtract: null
    },
    {
      id: 'cons-stores',
      name: 'Central Stores — Consumables',
      shortName: 'Stores (Con)',
      category: 'Consumables',
      budgetHead: 'CON-PPE-Q2',
      scheme: 'PPE & linen buffer',
      allocated: '₹0.85 Cr',
      requested: '₹0.72 Cr',
      available: '₹0.85 Cr',
      status: 'Under Review',
      decisionBy: 'Store Manager — Consumables',
      decisionDate: '—',
      reason: 'Awaiting glove sample acceptance before locking residual consumables budget.',
      reasonSource: 'Department status remark (typed)',
      sectionWork: ['PPE buffer confirmation', 'Sample acceptance'],
      documents: [
        { id: 'DOC-CON-019', name: 'Consumables Gap Sheet.pdf', kind: 'PDF', uploadedBy: 'Stores', uploadedOn: '01-09-2026', ocr: false }
      ],
      ocrExtract: null
    },
    {
      id: 'srv-it',
      name: 'IT / Digital Health Cell',
      shortName: 'IT Services',
      category: 'Services',
      budgetHead: 'SRV-HMIS-Q2',
      scheme: 'HMIS & telemedicine support',
      allocated: '₹1.20 Cr',
      requested: '₹1.05 Cr',
      available: '₹1.20 Cr',
      status: 'Approved',
      decisionBy: 'GM — Digital Health',
      decisionDate: '29-08-2026',
      reason: 'Service budget cleared for HMIS upgrade milestones within sanctioned band.',
      reasonSource: 'Sanction note (PDF)',
      sectionWork: ['Service budget check', 'Milestone alignment'],
      documents: [
        { id: 'DOC-SRV-007', name: 'HMIS Budget Note.pdf', kind: 'PDF', uploadedBy: 'Digital Health', uploadedOn: '29-08-2026', ocr: false }
      ],
      ocrExtract: null
    }
  ]
};

/**
 * Stage 6 — Tender Preparation (Resource Manager view).
 * Draft auto-built from prior stages; division checkers upload consensus; final NIT/RFP issued.
 */
const TENDER_PREPARATION_DATA = {
  meta: {
    draftId: 'NIT-DRAFT-MP-2026-0912',
    linkedPr: 'PR-MP-2026-0912',
    preparedOn: '03-09-2026 15:10 IST',
    sourceStages: 'Need Identification → Stock Check → Indent → Consolidation → PR & Budget',
    evaluationMethod: 'L1 / QCBS (as applicable)',
    status: 'Under division check'
  },
  autoDraft: {
    scope: 'Essential medicines & residual gap items for Bhopal Division after stock optimization',
    boqLines: 47,
    eligibility: 'Valid drug license, GST, PAN, average annual turnover as per category ceilings',
    emd: '₹3,20,000 (or as per NIT schedule)',
    bidDeadline: '25-09-2026',
    bidOpening: '26-09-2026',
    deliveryPeriod: '60–90 days from PO'
  },
  processSteps: [
    { id: 1, title: 'Auto draft prepared', detail: 'System prepares NIT/RFP draft from approved indent, consolidation and budget data.', status: 'Done' },
    { id: 2, title: 'Division checker review', detail: 'Checkers from Procurement, Finance, Stores, Legal and Medical review the draft.', status: 'In progress' },
    { id: 3, title: 'Consensus uploaded', detail: 'Each division uploads concurrence / remarks on the draft.', status: 'Partial' },
    { id: 4, title: 'Final NIT / RFP', detail: 'After consensus, the final tender document is prepared for publication.', status: 'Pending' }
  ],
  checkers: [
    {
      id: 'proc',
      division: 'Procurement Cell',
      officer: 'Procurement Officer',
      status: 'Consensus uploaded',
      remark: 'BOQ and timelines verified against consolidated demand.',
      uploadedOn: '03-09-2026',
      linkedDraft: 'NIT-DRAFT-MP-2026-0912',
      document: 'Procurement Consensus Note.pdf',
      reviewed: ['Scope of work', 'BOQ quantities', 'Bid timelines', 'Evaluation method'],
      decision: 'Concurred',
      detail: 'BOQ line items match residual gap after stock optimization. Bid deadline and opening dates are workable for vendor response window.'
    },
    {
      id: 'fin',
      division: 'Finance Wing',
      officer: 'GM Finance',
      status: 'Consensus uploaded',
      remark: 'EMD and estimated value range aligned with sanctioned budget.',
      uploadedOn: '03-09-2026',
      linkedDraft: 'NIT-DRAFT-MP-2026-0912',
      document: 'Finance Concurrence — EMD & Value.pdf',
      reviewed: ['Estimated value range', 'EMD amount', 'Budget head linkage', 'Payment terms'],
      decision: 'Concurred',
      detail: 'Estimated tender value is within PR & budget sanction band. EMD of ₹3,20,000 is consistent with category norms.'
    },
    {
      id: 'stores',
      division: 'Central Stores',
      officer: 'Store Manager',
      status: 'Under review',
      remark: 'Cross-checking open PO netting lines in BOQ.',
      uploadedOn: '—',
      linkedDraft: 'NIT-DRAFT-MP-2026-0912',
      document: '— Pending upload',
      reviewed: ['Open PO offsets', 'Warehouse release lines', 'Facility-wise quantities'],
      decision: 'Under review',
      detail: 'Stores is verifying that open PO and redistributable offsets are correctly reflected so duplicate procurement is avoided.'
    },
    {
      id: 'legal',
      division: 'Legal Cell',
      officer: 'Legal Advisor',
      status: 'Consensus uploaded',
      remark: 'Eligibility & bid security clauses cleared.',
      uploadedOn: '02-09-2026',
      linkedDraft: 'NIT-DRAFT-MP-2026-0912',
      document: 'Legal Clearance Note.pdf',
      reviewed: ['Eligibility criteria', 'Bid security / EMD clauses', 'LD & force majeure', 'Dispute resolution'],
      decision: 'Concurred',
      detail: 'Standard NIT legal clauses are in order. No restrictive condition flagged for this draft.'
    },
    {
      id: 'medical',
      division: 'Medical Services',
      officer: 'HOD — Medical',
      status: 'Pending',
      remark: 'Awaiting specialty item specification confirmation.',
      uploadedOn: '—',
      linkedDraft: 'NIT-DRAFT-MP-2026-0912',
      document: '— Pending upload',
      reviewed: ['Clinical specifications', 'Oncology / specialty SKUs', 'Quality standards'],
      decision: 'Pending',
      detail: 'Medical Services will confirm specialty item specifications before uploading consensus on the current draft.'
    }
  ],
  tenders: [
    { id: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Under Evaluation', preparedOn: '12-08-2026', value: '₹11.8 Cr – ₹13.2 Cr', emd: '₹3,20,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/DRG/2026/042', scope: 'Rate contract for essential medicines across Bhopal Division facilities', boqLines: 62, eligibility: 'Valid drug license, GST, PAN, min. turnover ₹10 Cr', bidDeadline: '15-09-2026', bidOpening: '16-09-2026', deliveryPeriod: 'As per rate-contract schedule', linkedPr: 'PR-MP-2026-0840' },
    { id: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', state: 'Madhya Pradesh', division: 'Indore', category: 'Drugs', status: 'Published', preparedOn: '20-08-2026', value: '₹1.9 Cr – ₹2.3 Cr', emd: '₹85,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/DRG/2026/078', scope: 'Bulk supply of Paracetamol 500mg tablets for Indore Division', boqLines: 8, eligibility: 'Drug license for oral solids, GST, PAN', bidDeadline: '18-09-2026', bidOpening: '19-09-2026', deliveryPeriod: '45 days from PO', linkedPr: 'PR-MP-2026-0855' },
    { id: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Awarded', preparedOn: '05-07-2026', value: '₹7.8 Cr – ₹9.0 Cr', emd: '₹2,10,000', method: 'QCBS', checkersDone: '5/5', nitNo: 'NIT/MP/DRG/2026/098', scope: 'Oncology & critical care drug supply for Jabalpur Division', boqLines: 34, eligibility: 'Oncology wholesale license, cold-chain capability, turnover ₹15 Cr', bidDeadline: '10-08-2026', bidOpening: '11-08-2026', deliveryPeriod: '30–60 days from PO', linkedPr: 'PR-MP-2026-0712' },
    { id: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Published', preparedOn: '18-08-2026', value: '₹2.9 Cr – ₹3.5 Cr', emd: '₹1,60,000', method: 'QCBS', checkersDone: '5/5', nitNo: 'NIT/MP/EQP/2026/055', scope: 'Procurement of CT scanner with installation & training at GMC Bhopal', boqLines: 12, eligibility: 'OEM / authorized dealer, ISO, service centre in MP', bidDeadline: '05-09-2026', bidOpening: '06-09-2026', deliveryPeriod: '90 days from PO', linkedPr: 'PR-MP-2026-0861' },
    { id: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Published', preparedOn: '22-08-2026', value: '₹40 L – ₹50 L', emd: '₹45,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/EQP/2026/072', scope: 'Surgical instrument sets for district hospitals — Gwalior Division', boqLines: 18, eligibility: 'BIS / CE marked instruments, GST, PAN', bidDeadline: '20-09-2026', bidOpening: '21-09-2026', deliveryPeriod: '60 days from PO', linkedPr: 'PR-MP-2026-0870' },
    { id: 'TND-2026-MP-0120', title: 'Ambulance Vehicle Purchase', state: 'Madhya Pradesh', division: 'Rewa', category: 'Equipment', status: 'Draft prepared', preparedOn: '01-09-2026', value: '₹4.1 Cr – ₹4.9 Cr', emd: '₹2,25,000', method: 'L1', checkersDone: '2/5', nitNo: 'DRAFT/MP/EQP/2026/120', scope: 'ALS / BLS ambulance vehicles for Rewa Division', boqLines: 6, eligibility: 'Vehicle OEM / authorized dealer, AIS compliant fabrication', bidDeadline: '15-10-2026', bidOpening: '16-10-2026', deliveryPeriod: '120 days from PO', linkedPr: 'PR-MP-2026-0901' },
    { id: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Awarded', preparedOn: '10-07-2026', value: '₹2.5 Cr – ₹3.1 Cr', emd: '₹1,40,000', method: 'QCBS', checkersDone: '5/5', nitNo: 'NIT/MP/EQP/2026/102', scope: 'Digital X-ray units with AMC for Indore Division facilities', boqLines: 9, eligibility: 'AERB compliant, authorized service network', bidDeadline: '28-07-2026', bidOpening: '29-07-2026', deliveryPeriod: '90 days from PO', linkedPr: 'PR-MP-2026-0698' },
    { id: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Awarded', preparedOn: '28-06-2026', value: '₹78 L – ₹92 L', emd: '₹42,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/CON/2026/038', scope: 'Hospital linen supply and periodic replenishment — Bhopal', boqLines: 14, eligibility: 'Textile manufacturer / authorized supplier, GST', bidDeadline: '20-07-2026', bidOpening: '21-07-2026', deliveryPeriod: '45 days from PO', linkedPr: 'PR-MP-2026-0610' },
    { id: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'Published', preparedOn: '25-08-2026', value: '₹24 L – ₹32 L', emd: '₹28,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/CON/2026/091', scope: 'Examination & surgical gloves for Jabalpur Division', boqLines: 5, eligibility: 'BIS / ISO certified gloves, GST, PAN', bidDeadline: '22-09-2026', bidOpening: '23-09-2026', deliveryPeriod: '30 days from PO', linkedPr: 'PR-MP-2026-0882' },
    { id: 'TND-2026-MP-0061', title: 'HMIS Software Upgrade', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Draft prepared', preparedOn: '30-08-2026', value: '₹1.6 Cr – ₹2.0 Cr', emd: '₹90,000', method: 'QCBS', checkersDone: '3/5', nitNo: 'DRAFT/MP/SRV/2026/061', scope: 'HMIS module upgrade, training and 1-year support', boqLines: 11, eligibility: 'MEITY empaneled / prior govt. HMIS experience', bidDeadline: '01-10-2026', bidOpening: '02-10-2026', deliveryPeriod: 'Milestone-based (6 months)', linkedPr: 'PR-MP-2026-0890' },
    { id: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Published', preparedOn: '15-08-2026', value: '₹85 L – ₹1.05 Cr', emd: '₹47,500', method: 'QCBS', checkersDone: '5/5', nitNo: 'NIT/MP/SRV/2026/126', scope: 'Telemedicine platform deployment for Gwalior Division PHCs', boqLines: 10, eligibility: 'Health-IT vendor with prior state deployment', bidDeadline: '28-09-2026', bidOpening: '29-09-2026', deliveryPeriod: '90 days from PO', linkedPr: 'PR-MP-2026-0833' },
    { id: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Under Evaluation', preparedOn: '08-08-2026', value: '₹28 L – ₹36 L', emd: '₹32,000', method: 'L1', checkersDone: '5/5', nitNo: 'NIT/MP/OTH/2026/085', scope: 'Annual maintenance of ambulance fleet — Rewa Division', boqLines: 7, eligibility: 'Authorized workshop network in Rewa Division', bidDeadline: '12-09-2026', bidOpening: '13-09-2026', deliveryPeriod: 'Service contract — 12 months', linkedPr: 'PR-MP-2026-0799' },
    { id: 'TND-2026-MP-DRAFT', title: 'Essential Drugs — Residual Gap (Current PR)', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Under checker review', preparedOn: '03-09-2026', value: '₹16.8 Cr – ₹21.5 Cr', emd: '₹3,20,000', method: 'L1 / QCBS', checkersDone: '3/5', nitNo: 'NIT-DRAFT-MP-2026-0912', scope: 'Essential medicines & residual gap items for Bhopal Division after stock optimization', boqLines: 47, eligibility: 'Valid drug license, GST, PAN, average annual turnover as per category ceilings', bidDeadline: '25-09-2026', bidOpening: '26-09-2026', deliveryPeriod: '60–90 days from PO', linkedPr: 'PR-MP-2026-0912' }
  ]
};

/** Stage 7 — Bid Evaluation (Resource Manager view) */
const BID_EVALUATION_DATA = {
  meta: {
    process: 'System-assisted evaluation from bidder documents',
    sheetFormat: 'Custom evaluation sheet (technical + financial)',
    committee: 'Procurement · Stores · Finance · Quality · Evaluation',
    lastUpdated: '03-09-2026 16:20 IST'
  },
  processSteps: [
    { id: 1, title: 'Bid documents received', detail: 'Technical and financial bids are collected for each published tender.', status: 'Done' },
    { id: 2, title: 'System-assisted screening', detail: 'Uploaded bid papers are read and checked against NIT requirements; a custom evaluation sheet is prepared.', status: 'Done' },
    { id: 3, title: 'Committee scoring', detail: 'Evaluation committee reviews the sheet and records technical / financial scores (L1 or QCBS).', status: 'In progress' },
    { id: 4, title: 'Evaluation outcome', detail: 'Qualified bidders, L1 recommendation and remarks are locked for contract stage.', status: 'Partial' }
  ],
  evaluations: [
    { id: 'EVAL-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Evaluation complete', method: 'L1', bidsReceived: 8, techQualified: 6, l1Vendor: 'MediSupply India', l1Value: '₹11.9 Cr – ₹12.4 Cr', sheetNo: 'EVS-DRG-0042', evalDate: '28-08-2026', techScore: '92%', finScore: 'L1 ranked', remarks: 'All major EDL lines covered; two bidders disqualified on turnover.', evaluatedItems: ['Paracetamol 500mg Tab', 'Amoxicillin 250mg Cap', 'IV Normal Saline 500ml', 'ORS Sachets', 'Metformin 500mg Tab'], bidders: [{ name: 'MediSupply India', tech: 'Qualified', rank: 'L1', quote: '₹11.95 Cr' }, { name: 'PharmaCare Distributors', tech: 'Qualified', rank: 'L2', quote: '₹12.18 Cr' }, { name: 'GenericMed Corp', tech: 'Qualified', rank: 'L3', quote: '₹12.40 Cr' }] },
    { id: 'EVAL-0078', tenderId: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', state: 'Madhya Pradesh', division: 'Indore', category: 'Drugs', status: 'Under evaluation', method: 'L1', bidsReceived: 10, techQualified: 8, l1Vendor: '— Pending', l1Value: '₹1.9 Cr – ₹2.3 Cr', sheetNo: 'EVS-DRG-0078', evalDate: '02-09-2026', techScore: 'In progress', finScore: 'Sealed', remarks: 'Technical opening done; commercial opening scheduled.', evaluatedItems: ['Paracetamol 500mg Tab'], bidders: [{ name: 'Sunrise Pharma', tech: 'Qualified', rank: '—', quote: 'Sealed' }, { name: 'MediSupply India', tech: 'Qualified', rank: '—', quote: 'Sealed' }] },
    { id: 'EVAL-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Evaluation complete', method: 'QCBS', bidsReceived: 15, techQualified: 11, l1Vendor: 'OncoCare Pharma', l1Value: '₹7.9 Cr – ₹8.5 Cr', sheetNo: 'EVS-DRG-0098', evalDate: '02-08-2026', techScore: '88%', finScore: 'QCBS #1', remarks: 'QCBS weightage 70:30 applied; cold-chain proofs verified from scanned bids.', evaluatedItems: ['Oncology Drug Pack', 'Insulin 40 IU', 'Ceftriaxone 1g Inj'], bidders: [{ name: 'OncoCare Pharma', tech: 'Qualified', rank: 'H1', quote: '₹8.05 Cr' }, { name: 'MediSupply India', tech: 'Qualified', rank: 'H2', quote: '₹8.22 Cr' }] },
    { id: 'EVAL-0140', tenderId: 'TND-2026-MP-0140', title: 'Insulin & Diabetic Care Kit', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Technical screening', method: 'L1', bidsReceived: 7, techQualified: 4, l1Vendor: '— Pending', l1Value: '₹3.2 Cr – ₹3.9 Cr', sheetNo: 'EVS-DRG-0140', evalDate: '31-08-2026', techScore: 'Screening', finScore: 'Not opened', remarks: 'Three bids pending license clarity from uploaded documents.', evaluatedItems: ['Insulin 40 IU', 'Metformin 500mg Tab'], bidders: [{ name: 'DiabetCare India', tech: 'Under review', rank: '—', quote: 'Not opened' }] },
    { id: 'EVAL-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Under evaluation', method: 'QCBS', bidsReceived: 4, techQualified: 3, l1Vendor: '— Pending', l1Value: '₹2.9 Cr – ₹3.5 Cr', sheetNo: 'EVS-EQP-0055', evalDate: '01-09-2026', techScore: '84%', finScore: 'Sealed', remarks: 'Custom evaluation sheet generated; demo scoring in progress.', evaluatedItems: ['CT Scanner'], bidders: [{ name: 'MedEquip Solutions', tech: 'Qualified', rank: '—', quote: 'Sealed' }, { name: 'ScanTech Systems', tech: 'Qualified', rank: '—', quote: 'Sealed' }] },
    { id: 'EVAL-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Evaluation complete', method: 'L1', bidsReceived: 6, techQualified: 5, l1Vendor: 'Apex Surgical India', l1Value: '₹41 L – ₹48 L', sheetNo: 'EVS-EQP-0072', evalDate: '30-08-2026', techScore: '90%', finScore: 'L1 ranked', remarks: 'BIS marks verified from bid annexures.', evaluatedItems: ['Surgical Instruments'], bidders: [{ name: 'Apex Surgical India', tech: 'Qualified', rank: 'L1', quote: '₹43.2 L' }, { name: 'SurgiCare Ltd', tech: 'Qualified', rank: 'L2', quote: '₹44.8 L' }] },
    { id: 'EVAL-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Evaluation complete', method: 'QCBS', bidsReceived: 9, techQualified: 7, l1Vendor: 'ImageMed Systems', l1Value: '₹2.6 Cr – ₹3.0 Cr', sheetNo: 'EVS-EQP-0102', evalDate: '15-07-2026', techScore: '91%', finScore: 'QCBS #1', remarks: 'AERB compliance confirmed from uploaded certificates.', evaluatedItems: ['Digital X-Ray'], bidders: [{ name: 'ImageMed Systems', tech: 'Qualified', rank: 'H1', quote: '₹2.72 Cr' }] },
    { id: 'EVAL-0147', tenderId: 'TND-2026-MP-0147', title: 'Patient Monitoring Systems', state: 'Madhya Pradesh', division: 'Rewa', category: 'Equipment', status: 'Technical screening', method: 'L1', bidsReceived: 8, techQualified: 5, l1Vendor: '— Pending', l1Value: '₹95 L – ₹1.2 Cr', sheetNo: 'EVS-EQP-0147', evalDate: '29-08-2026', techScore: 'Screening', finScore: 'Not opened', remarks: 'Warranty clauses being matched to NIT from scanned proposals.', evaluatedItems: ['Patient Monitors'], bidders: [{ name: 'CareMonitors Pvt', tech: 'Under review', rank: '—', quote: 'Not opened' }] },
    { id: 'EVAL-0115', tenderId: 'TND-2026-MP-0115', title: 'Pathology Lab Reagents', state: 'Madhya Pradesh', division: 'Indore', category: 'Consumables', status: 'Under evaluation', method: 'L1', bidsReceived: 5, techQualified: 4, l1Vendor: '— Pending', l1Value: '₹50 L – ₹62 L', sheetNo: 'EVS-CON-0115', evalDate: '03-09-2026', techScore: '86%', finScore: 'Sealed', remarks: 'Shelf-life proofs extracted from bid packs.', evaluatedItems: ['Pathology Reagents'], bidders: [{ name: 'LabPro Reagents', tech: 'Qualified', rank: '—', quote: 'Sealed' }] },
    { id: 'EVAL-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'Evaluation complete', method: 'L1', bidsReceived: 7, techQualified: 6, l1Vendor: 'SafeHands Consumables', l1Value: '₹25 L – ₹30 L', sheetNo: 'EVS-CON-0091', evalDate: '01-09-2026', techScore: '93%', finScore: 'L1 ranked', remarks: 'Sample test reports accepted.', evaluatedItems: ['Disposable Gloves', 'Surgical Masks'], bidders: [{ name: 'SafeHands Consumables', tech: 'Qualified', rank: 'L1', quote: '₹26.4 L' }] },
    { id: 'EVAL-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Under evaluation', method: 'QCBS', bidsReceived: 3, techQualified: 3, l1Vendor: '— Pending', l1Value: '₹85 L – ₹1.05 Cr', sheetNo: 'EVS-SRV-0126', evalDate: '28-08-2026', techScore: '80%', finScore: 'Sealed', remarks: 'Custom QCBS sheet generated for platform demo scoring.', bidders: [{ name: 'CloudCare Systems', tech: 'Qualified', rank: '—', quote: 'Sealed' }] },
    { id: 'EVAL-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Evaluation complete', method: 'L1', bidsReceived: 3, techQualified: 3, l1Vendor: 'MediTrans Logistics', l1Value: '₹29 L – ₹34 L', sheetNo: 'EVS-OTH-0085', evalDate: '25-08-2026', techScore: '87%', finScore: 'L1 ranked', remarks: 'Workshop coverage verified across Rewa blocks.', bidders: [{ name: 'MediTrans Logistics', tech: 'Qualified', rank: 'L1', quote: '₹30.5 L' }] }
  ]
};

/** Stage 8 — Contract Approval (Resource Manager view) */
const CONTRACT_APPROVAL_DATA = {
  meta: {
    gate: 'Contract before PO',
    lastUpdated: '03-09-2026 16:45 IST',
    note: 'L1 is taken from bid evaluation; LOI / NOA and agreement terms are synced from NIC / DVDMS / tender templates. Resource Manager records timestamped approval only — signed post LOI acceptance and PBG receipt.'
  },
  processSteps: [
    { id: 1, title: 'L1 identified', detail: 'L1 / H1 bidder is taken from the completed bid evaluation for the tender.', status: 'Done' },
    { id: 2, title: 'LOI / NOA issued', detail: 'Letter of Intent / Notification of Award issued — synced from NIC.', status: 'In progress' },
    { id: 3, title: 'PBG & agreement draft', detail: 'PBG submission tracked; contract draft from standard templates synced with tender documents.', status: 'Partial' },
    { id: 4, title: 'Timestamped approval', detail: 'Competent authority approves with timestamp after LOI accept + PBG receive — before PO.', status: 'Pending' }
  ],
  contracts: [
    { id: 'CNT-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Agreement signed', l1Vendor: 'MediSupply India', noaNo: 'NOA/MP/DRG/2026/042', noaDate: '30-08-2026', agreementNo: 'AGR/MP/2026/042', value: '₹11.9 Cr – ₹12.4 Cr', legalStatus: 'Cleared', financeStatus: 'Cleared', signedOn: '02-09-2026', remarks: 'Rate contract for 24 months; price fall clause included.' },
    { id: 'CNT-2026-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'NOA issued', l1Vendor: 'OncoCare Pharma', noaNo: 'NOA/MP/DRG/2026/098', noaDate: '05-08-2026', agreementNo: '— Pending', value: '₹7.9 Cr – ₹8.5 Cr', legalStatus: 'Under review', financeStatus: 'Cleared', signedOn: '—', remarks: 'Awaiting cold-chain SLA annexure in agreement draft.' },
    { id: 'CNT-2026-0078', tenderId: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', state: 'Madhya Pradesh', division: 'Indore', category: 'Drugs', status: 'Awaiting L1 lock', l1Vendor: '— Pending evaluation', noaNo: '—', noaDate: '—', agreementNo: '—', value: '₹1.9 Cr – ₹2.3 Cr', legalStatus: 'Not started', financeStatus: 'Not started', signedOn: '—', date: '02-09-2026', remarks: 'Will start after commercial bid opening.' },
    { id: 'CNT-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'NOA issued', l1Vendor: 'Apex Surgical India', noaNo: 'NOA/MP/EQP/2026/072', noaDate: '01-09-2026', agreementNo: 'Draft AGR/072', value: '₹41 L – ₹48 L', legalStatus: 'Cleared', financeStatus: 'Under review', signedOn: '—', remarks: 'Warranty & AMC schedule under finance check.' },
    { id: 'CNT-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Agreement signed', l1Vendor: 'ImageMed Systems', noaNo: 'NOA/MP/EQP/2026/102', noaDate: '18-07-2026', agreementNo: 'AGR/MP/2026/102', value: '₹2.6 Cr – ₹3.0 Cr', legalStatus: 'Cleared', financeStatus: 'Cleared', signedOn: '25-07-2026', remarks: 'Installation milestones linked to payment schedule.' },
    { id: 'CNT-2026-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting L1 lock', l1Vendor: '— Pending evaluation', noaNo: '—', noaDate: '—', agreementNo: '—', value: '₹2.9 Cr – ₹3.5 Cr', legalStatus: 'Not started', financeStatus: 'Not started', signedOn: '—', date: '01-09-2026', remarks: 'QCBS evaluation still open.' },
    { id: 'CNT-2026-0038', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Agreement signed', l1Vendor: 'CleanCare Supplies', noaNo: 'NOA/MP/CON/2026/038', noaDate: '22-07-2026', agreementNo: 'AGR/MP/2026/038', value: '₹78 L – ₹92 L', legalStatus: 'Cleared', financeStatus: 'Cleared', signedOn: '28-07-2026', remarks: 'Delivery schedule quarterly.' },
    { id: 'CNT-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'NOA issued', l1Vendor: 'SafeHands Consumables', noaNo: 'NOA/MP/CON/2026/091', noaDate: '02-09-2026', agreementNo: 'Draft AGR/091', value: '₹25 L – ₹30 L', legalStatus: 'Under review', financeStatus: 'Cleared', signedOn: '—', remarks: 'Sample acceptance certificate to be annexed.' },
    { id: 'CNT-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Agreement signed', l1Vendor: 'SecureHealth Services', noaNo: 'NOA/MP/SRV/2026/161', noaDate: '25-07-2026', agreementNo: 'AGR/MP/2026/161', value: '₹65 L – ₹78 L', legalStatus: 'Cleared', financeStatus: 'Cleared', signedOn: '01-08-2026', remarks: 'Manpower deployment SLA included.' },
    { id: 'CNT-2026-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting L1 lock', l1Vendor: '— Pending evaluation', noaNo: '—', noaDate: '—', agreementNo: '—', value: '₹85 L – ₹1.05 Cr', legalStatus: 'Not started', financeStatus: 'Not started', signedOn: '—', date: '28-08-2026', remarks: 'Depends on QCBS outcome.' },
    { id: 'CNT-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'NOA issued', l1Vendor: 'MediTrans Logistics', noaNo: 'NOA/MP/OTH/2026/085', noaDate: '28-08-2026', agreementNo: 'Draft AGR/085', value: '₹29 L – ₹34 L', legalStatus: 'Cleared', financeStatus: 'Under review', signedOn: '—', remarks: 'Uptime penalty clauses under finance review.' },
    { id: 'CNT-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'Agreement signed', l1Vendor: 'GreenMed Waste', noaNo: 'NOA/MP/OTH/2026/133', noaDate: '10-08-2026', agreementNo: 'AGR/MP/2026/133', value: '₹38 L – ₹46 L', legalStatus: 'Cleared', financeStatus: 'Cleared', signedOn: '18-08-2026', remarks: 'PCB authorization verified.' }
  ]
};

/** Stage 9 — Award (Resource Manager view) */
const AWARD_STAGE_DATA = {
  meta: {
    lastUpdated: '03-09-2026 17:00 IST',
    note: 'Track awarded tenders with LOA, PBG collection and award checklist.'
  },
  checklistTemplate: [
    { id: 'loa', title: 'LOA issued to L1 / H1 bidder', detail: 'Letter of Award communicated with value, timelines and conditions.' },
    { id: 'ack', title: 'LOA acknowledgement', detail: 'Bidder acknowledges LOA on the portal within stipulated period.' },
    { id: 'pbg', title: 'PBG collection', detail: 'Performance Bank Guarantee received and verified (SFMS / e-BG).' },
    { id: 'sign', title: 'Contract signing complete', detail: 'Signed agreement available against the award.' },
    { id: 'activate', title: 'Award activated for PO', detail: 'Award record unlocked for Purchase Order generation.' }
  ],
  awards: [
    { id: 'AWD-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Award active', vendor: 'MediSupply India', loaNo: 'LOA/MP/DRG/2026/042', loaDate: '30-08-2026', loaAck: 'Acknowledged', pbgStatus: 'Received', pbgAmount: '₹59.5 L – ₹62 L', pbgDue: '15-09-2026', pbgRef: 'PBG/HDFC/2026/8841', value: '₹11.9 Cr – ₹12.4 Cr', contractId: 'CNT-2026-0042', checklist: { loa: true, ack: true, pbg: true, sign: true, activate: true } },
    { id: 'AWD-2026-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'PBG pending', vendor: 'OncoCare Pharma', loaNo: 'LOA/MP/DRG/2026/098', loaDate: '05-08-2026', loaAck: 'Acknowledged', pbgStatus: 'Pending', pbgAmount: '₹39.5 L – ₹42.5 L', pbgDue: '20-08-2026', pbgRef: '—', value: '₹7.9 Cr – ₹8.5 Cr', contractId: 'CNT-2026-0098', checklist: { loa: true, ack: true, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Award active', vendor: 'ImageMed Systems', loaNo: 'LOA/MP/EQP/2026/102', loaDate: '18-07-2026', loaAck: 'Acknowledged', pbgStatus: 'Received', pbgAmount: '₹13 L – ₹15 L', pbgDue: '02-08-2026', pbgRef: 'PBG/SBI/2026/4412', value: '₹2.6 Cr – ₹3.0 Cr', contractId: 'CNT-2026-0102', checklist: { loa: true, ack: true, pbg: true, sign: true, activate: true } },
    { id: 'AWD-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'LOA issued', vendor: 'Apex Surgical India', loaNo: 'LOA/MP/EQP/2026/072', loaDate: '01-09-2026', loaAck: 'Pending', pbgStatus: 'Not due yet', pbgAmount: '₹2.1 L – ₹2.4 L', pbgDue: '16-09-2026', pbgRef: '—', value: '₹41 L – ₹48 L', contractId: 'CNT-2026-0072', checklist: { loa: true, ack: false, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0038', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Award active', vendor: 'CleanCare Supplies', loaNo: 'LOA/MP/CON/2026/038', loaDate: '22-07-2026', loaAck: 'Acknowledged', pbgStatus: 'Received', pbgAmount: '₹4.0 L – ₹4.6 L', pbgDue: '05-08-2026', pbgRef: 'PBG/ICICI/2026/2290', value: '₹78 L – ₹92 L', contractId: 'CNT-2026-0038', checklist: { loa: true, ack: true, pbg: true, sign: true, activate: true } },
    { id: 'AWD-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'LOA issued', vendor: 'SafeHands Consumables', loaNo: 'LOA/MP/CON/2026/091', loaDate: '02-09-2026', loaAck: 'Acknowledged', pbgStatus: 'Pending', pbgAmount: '₹1.3 L – ₹1.5 L', pbgDue: '17-09-2026', pbgRef: '—', value: '₹25 L – ₹30 L', contractId: 'CNT-2026-0091', checklist: { loa: true, ack: true, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Award active', vendor: 'SecureHealth Services', loaNo: 'LOA/MP/SRV/2026/161', loaDate: '25-07-2026', loaAck: 'Acknowledged', pbgStatus: 'Received', pbgAmount: '₹3.3 L – ₹3.9 L', pbgDue: '08-08-2026', pbgRef: 'PBG/AXIS/2026/1102', value: '₹65 L – ₹78 L', contractId: 'CNT-2026-0161', checklist: { loa: true, ack: true, pbg: true, sign: true, activate: true } },
    { id: 'AWD-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'Award active', vendor: 'GreenMed Waste', loaNo: 'LOA/MP/OTH/2026/133', loaDate: '10-08-2026', loaAck: 'Acknowledged', pbgStatus: 'Received', pbgAmount: '₹1.9 L – ₹2.3 L', pbgDue: '24-08-2026', pbgRef: 'PBG/BOB/2026/7731', value: '₹38 L – ₹46 L', contractId: 'CNT-2026-0133', checklist: { loa: true, ack: true, pbg: true, sign: true, activate: true } },
    { id: 'AWD-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'LOA issued', vendor: 'MediTrans Logistics', loaNo: 'LOA/MP/OTH/2026/085', loaDate: '28-08-2026', loaAck: 'Pending', pbgStatus: 'Not due yet', pbgAmount: '₹1.5 L – ₹1.7 L', pbgDue: '12-09-2026', pbgRef: '—', value: '₹29 L – ₹34 L', contractId: 'CNT-2026-0085', checklist: { loa: true, ack: false, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting award', vendor: '— Pending L1', loaNo: '—', loaDate: '—', loaAck: '—', pbgStatus: '—', pbgAmount: '—', pbgDue: '—', pbgRef: '—', value: '₹2.9 Cr – ₹3.5 Cr', contractId: '—', date: '01-09-2026', checklist: { loa: false, ack: false, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0078', tenderId: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', state: 'Madhya Pradesh', division: 'Indore', category: 'Drugs', status: 'Awaiting award', vendor: '— Pending L1', loaNo: '—', loaDate: '—', loaAck: '—', pbgStatus: '—', pbgAmount: '—', pbgDue: '—', pbgRef: '—', value: '₹1.9 Cr – ₹2.3 Cr', contractId: '—', date: '02-09-2026', checklist: { loa: false, ack: false, pbg: false, sign: false, activate: false } },
    { id: 'AWD-2026-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting award', vendor: '— Pending L1', loaNo: '—', loaDate: '—', loaAck: '—', pbgStatus: '—', pbgAmount: '—', pbgDue: '—', pbgRef: '—', value: '₹85 L – ₹1.05 Cr', contractId: '—', date: '28-08-2026', checklist: { loa: false, ack: false, pbg: false, sign: false, activate: false } }
  ]
};

/** Stage 10 — Purchase Order (Resource Manager view) */
const PURCHASE_ORDER_DATA = {
  meta: {
    lastUpdated: '03-09-2026 17:30 IST',
    note: 'Purchase orders are raised in DVDMS after contract execution. Supply tracking continues in Contract Management.'
  },
  processSteps: [
    { id: 1, title: 'Contract executed', detail: 'Signed agreement and active award unlock PO generation in DVDMS.', status: 'Done' },
    { id: 2, title: 'PO raised in DVDMS', detail: 'Line items, rates, delivery locations and payment terms pulled from synced contract.', status: 'Done' },
    { id: 3, title: 'Vendor notified', detail: 'PO shared on portal / email with acknowledgement tracking.', status: 'In Progress' },
    { id: 4, title: 'Supply tracked in Contract Mgmt', detail: 'Milestones, GRN and SLA monitored against the contract register.', status: 'Pending' }
  ],
  orders: [
    { id: 'PO-2026-0042', tenderId: 'TND-2026-MP-0042', awardId: 'AWD-2026-0042', contractId: 'CNT-2026-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'PO issued', vendor: 'MediSupply India', vendorNotified: 'Notified', poDate: '02-09-2026', value: '₹11.9 Cr – ₹12.4 Cr', deliveryStart: '15-09-2026', deliveryEnd: '15-03-2027', paymentTerms: 'Net 45 days from GRN', shipTo: 'Central Warehouse — Bhopal', lines: 62, schedule: 'Monthly releases · 6 lots', terms: 'Rate contract · price fall clause · cold-chain where applicable', ackStatus: 'Acknowledged', remarks: 'First release scheduled for district hospitals under Bhopal Division.' },
    { id: 'PO-2026-0102', tenderId: 'TND-2026-MP-0102', awardId: 'AWD-2026-0102', contractId: 'CNT-2026-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Delivery scheduled', vendor: 'ImageMed Systems', vendorNotified: 'Notified', poDate: '28-07-2026', value: '₹2.6 Cr – ₹3.0 Cr', deliveryStart: '01-09-2026', deliveryEnd: '30-10-2026', paymentTerms: '30% advance · 70% after installation', shipTo: 'District Hospital — Indore', lines: 9, schedule: 'Site-wise install · 3 facilities', terms: 'AMC included · AERB compliance · training pack', ackStatus: 'Acknowledged', remarks: 'Installation slots confirmed with biomedical engineering.' },
    { id: 'PO-2026-0038', tenderId: 'TND-2026-MP-0038', awardId: 'AWD-2026-0038', contractId: 'CNT-2026-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'PO issued', vendor: 'CleanCare Supplies', vendorNotified: 'Notified', poDate: '01-08-2026', value: '₹78 L – ₹92 L', deliveryStart: '10-08-2026', deliveryEnd: '10-11-2026', paymentTerms: 'Net 30 days from GRN', shipTo: 'Central Warehouse — Bhopal', lines: 14, schedule: 'Quarterly replenishment', terms: 'Quality sample retained · rejection clause', ackStatus: 'Acknowledged', remarks: 'Q2 replenishment PO against rate contract.' },
    { id: 'PO-2026-0161', tenderId: 'TND-2026-MP-0161', awardId: 'AWD-2026-0161', contractId: 'CNT-2026-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Vendor notified', vendor: 'SecureHealth Services', vendorNotified: 'Notified', poDate: '05-08-2026', value: '₹65 L – ₹78 L', deliveryStart: '15-08-2026', deliveryEnd: '14-08-2027', paymentTerms: 'Monthly billing · Net 30', shipTo: 'GMC Bhopal campus', lines: 4, schedule: 'Manpower deployment from 15-08-2026', terms: 'SLA uptime · attendance biometric', ackStatus: 'Acknowledged', remarks: 'Service PO for 12-month engagement.' },
    { id: 'PO-2026-0133', tenderId: 'TND-2026-MP-0133', awardId: 'AWD-2026-0133', contractId: 'CNT-2026-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'PO issued', vendor: 'GreenMed Waste', vendorNotified: 'Notified', poDate: '20-08-2026', value: '₹38 L – ₹46 L', deliveryStart: '01-09-2026', deliveryEnd: '31-08-2027', paymentTerms: 'Monthly · Net 30', shipTo: 'Indore Division facilities', lines: 6, schedule: 'Daily collection · monthly billing', terms: 'PCB authorization mandatory', ackStatus: 'Acknowledged', remarks: 'Bio-medical waste contract PO activated.' },
    { id: 'PO-2026-0098', tenderId: 'TND-2026-MP-0098', awardId: 'AWD-2026-0098', contractId: 'CNT-2026-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Draft PO', vendor: 'OncoCare Pharma', vendorNotified: 'Pending', poDate: '—', value: '₹7.9 Cr – ₹8.5 Cr', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Net 45 days from GRN', shipTo: 'Regional Store — Jabalpur', lines: 34, schedule: 'Awaiting PBG / agreement lock', terms: 'Cold-chain · batch COA required', ackStatus: 'Not sent', date: '03-09-2026', remarks: 'PO draft held until PBG and agreement signing complete.' },
    { id: 'PO-2026-0072', tenderId: 'TND-2026-MP-0072', awardId: 'AWD-2026-0072', contractId: 'CNT-2026-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Pending contract', vendor: 'Apex Surgical India', vendorNotified: 'Not sent', poDate: '—', value: '₹41 L – ₹48 L', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Net 30 days from GRN', shipTo: 'District Hospital — Gwalior', lines: 18, schedule: 'After LOA acknowledgement & agreement', terms: 'BIS marked · warranty 24 months', ackStatus: 'Not sent', date: '01-09-2026', remarks: 'Waiting for LOA acknowledgement before PO generation.' },
    { id: 'PO-2026-0091', tenderId: 'TND-2026-MP-0091', awardId: 'AWD-2026-0091', contractId: 'CNT-2026-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'Draft PO', vendor: 'SafeHands Consumables', vendorNotified: 'Pending', poDate: '—', value: '₹25 L – ₹30 L', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Net 30 days from GRN', shipTo: 'Regional Store — Jabalpur', lines: 5, schedule: 'Single consignment after agreement', terms: 'Sample acceptance certificate annexed', ackStatus: 'Not sent', date: '02-09-2026', remarks: 'Draft ready; finance clearance on agreement pending.' },
    { id: 'PO-2026-0085', tenderId: 'TND-2026-MP-0085', awardId: 'AWD-2026-0085', contractId: 'CNT-2026-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Pending contract', vendor: 'MediTrans Logistics', vendorNotified: 'Not sent', poDate: '—', value: '₹29 L – ₹34 L', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Quarterly · Net 30', shipTo: 'Rewa Division workshop', lines: 7, schedule: 'Service start after agreement', terms: 'Uptime SLA · penalty clause', ackStatus: 'Not sent', date: '28-08-2026', remarks: 'LOA pending acknowledgement; PO blocked.' },
    { id: 'PO-2026-0126', tenderId: 'TND-2026-MP-0126', awardId: 'AWD-2026-0126', contractId: '—', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting award', vendor: '— Pending L1', vendorNotified: 'Not sent', poDate: '—', value: '₹85 L – ₹1.05 Cr', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Milestone-based', shipTo: 'Gwalior Division PHCs', lines: 10, schedule: 'After award & contract', terms: 'Milestone acceptance · training', ackStatus: 'Not sent', date: '28-08-2026', remarks: 'Cannot generate PO until award and contract are complete.' },
    { id: 'PO-2026-0055', tenderId: 'TND-2026-MP-0055', awardId: 'AWD-2026-0055', contractId: '—', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting award', vendor: '— Pending L1', vendorNotified: 'Not sent', poDate: '—', value: '₹2.9 Cr – ₹3.5 Cr', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Milestone · installation linked', shipTo: 'GMC Bhopal', lines: 12, schedule: 'After QCBS award', terms: 'OEM install · training · warranty', ackStatus: 'Not sent', date: '01-09-2026', remarks: 'Evaluation still open; PO not started.' },
    { id: 'PO-2026-0078', tenderId: 'TND-2026-MP-0078', awardId: 'AWD-2026-0078', contractId: '—', title: 'Paracetamol 500mg Bulk', state: 'Madhya Pradesh', division: 'Indore', category: 'Drugs', status: 'Awaiting award', vendor: '— Pending L1', vendorNotified: 'Not sent', poDate: '—', value: '₹1.9 Cr – ₹2.3 Cr', deliveryStart: '—', deliveryEnd: '—', paymentTerms: 'Net 45 days from GRN', shipTo: 'Regional Store — Indore', lines: 8, schedule: 'After commercial opening', terms: 'Shelf-life ≥ 75% remaining', ackStatus: 'Not sent', date: '02-09-2026', remarks: 'Bid evaluation incomplete; PO gated.' }
  ]
};

/** PO templates available to Resource Manager when generating a Purchase Order (demo).
 *  Template 1 aligns with the MPPHCL sheet vendors download for Active + Delivery Completed contracts. */
const PO_TEMPLATES = [
  { id: '1', label: 'Template 1 — MPPHCL Standard Purchase Order', hint: 'Same layout vendors download when Status is Active and Delivery is Completed.' },
  { id: '2', label: 'Template 2 — Rate Contract Call-off PO', hint: 'Short-form call-off against an active rate contract.' },
  { id: '3', label: 'Template 3 — Equipment / Installation PO', hint: 'Includes install, training and warranty annexure blocks.' },
  { id: '4', label: 'Template 4 — Service / Manpower PO', hint: 'Monthly billing and SLA schedule oriented.' },
  { id: '5', label: 'Template 5 — Consumables Replenishment PO', hint: 'Quarterly / lot-wise replenishment schedule.' },
  { id: '6', label: 'Template 6 — Emergency / Short-notice PO', hint: 'Expedited delivery terms with urgency clause.' }
];

/** Stage 11 — GRN & Inspection (Resource Manager view) */
const GRN_INSPECTION_DATA = {
  meta: {
    lastUpdated: '03-09-2026 18:00 IST',
    note: 'Track goods receipt, quality testing, batch verification and acceptance certificates against issued POs.'
  },
  processSteps: [
    { id: 1, title: 'Goods received', detail: 'Delivery challan matched to PO quantity and ship-to location.', status: 'Done' },
    { id: 2, title: 'Quality inspection', detail: 'Store / QA checks samples against NIT specs and COA.', status: 'In Progress' },
    { id: 3, title: 'Batch verification', detail: 'Batch / serial / expiry recorded and verified.', status: 'Pending' },
    { id: 4, title: 'Acceptance certificate', detail: 'Accepted quantity locked for invoice matching.', status: 'Pending' }
  ],
  receipts: [
    { id: 'GRN-2026-0042', poId: 'PO-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Accepted', vendor: 'MediSupply India', grnDate: '18-09-2026', value: '₹1.95 Cr – ₹2.10 Cr', qtyOrdered: 'Lot-1 · 10,400 packs', qtyReceived: '10,400 packs', qtyAccepted: '10,380 packs', qtyRejected: '20 packs', batchNo: 'MS/EDL/0826/A', expiry: '08-2028', qaStatus: 'Passed', inspector: 'Store Officer — Bhopal', acceptanceCert: 'AC/MP/DRG/2026/042-1', remarks: 'Minor label damage on 20 packs; rest accepted.' },
    { id: 'GRN-2026-0102', poId: 'PO-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Under inspection', vendor: 'ImageMed Systems', grnDate: '05-09-2026', value: '₹2.6 Cr – ₹3.0 Cr', qtyOrdered: '3 units', qtyReceived: '3 units', qtyAccepted: '— Pending', qtyRejected: '—', batchNo: 'IMX-2026-IND-01/02/03', expiry: 'N/A', qaStatus: 'In progress', inspector: 'Biomedical Engg. — Indore', acceptanceCert: '— Pending', remarks: 'Installation verification and AERB checklist in progress.' },
    { id: 'GRN-2026-0038', poId: 'PO-2026-0038', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Accepted', vendor: 'CleanCare Supplies', grnDate: '22-08-2026', value: '₹26 L – ₹30 L', qtyOrdered: 'Q2 release', qtyReceived: 'Full lot', qtyAccepted: 'Full lot', qtyRejected: 'Nil', batchNo: 'CC/LN/Q2/26', expiry: 'N/A', qaStatus: 'Passed', inspector: 'Store Officer — Bhopal', acceptanceCert: 'AC/MP/CON/2026/038-2', remarks: 'Sample matched retained specimen.' },
    { id: 'GRN-2026-0161', poId: 'PO-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Accepted', vendor: 'SecureHealth Services', grnDate: '20-08-2026', value: '₹5.4 L – ₹6.5 L', qtyOrdered: 'Month-1 deployment', qtyReceived: 'Deployed', qtyAccepted: 'Deployed', qtyRejected: 'Nil', batchNo: 'N/A — service', expiry: 'N/A', qaStatus: 'Passed', inspector: 'Facility Admin — GMC', acceptanceCert: 'AC/MP/SRV/2026/161-1', remarks: 'Attendance & biometric onboarding verified.' },
    { id: 'GRN-2026-0133', poId: 'PO-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'Accepted', vendor: 'GreenMed Waste', grnDate: '08-09-2026', value: '₹3.1 L – ₹3.8 L', qtyOrdered: 'Month-1 service', qtyReceived: 'Service live', qtyAccepted: 'Service live', qtyRejected: 'Nil', batchNo: 'N/A — service', expiry: 'N/A', qaStatus: 'Passed', inspector: 'PCB Liaison — Indore', acceptanceCert: 'AC/MP/OTH/2026/133-1', remarks: 'Collection logs and PCB authorization checked.' },
    { id: 'GRN-2026-0098', poId: 'PO-2026-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Awaiting delivery', vendor: 'OncoCare Pharma', grnDate: '—', value: '₹7.9 Cr – ₹8.5 Cr', qtyOrdered: '—', qtyReceived: '—', qtyAccepted: '—', qtyRejected: '—', batchNo: '—', expiry: '—', qaStatus: 'Not started', inspector: '—', acceptanceCert: '—', date: '03-09-2026', remarks: 'PO still in draft; GRN unlocks after PO issue.' },
    { id: 'GRN-2026-0072', poId: 'PO-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Awaiting delivery', vendor: 'Apex Surgical India', grnDate: '—', value: '₹41 L – ₹48 L', qtyOrdered: '—', qtyReceived: '—', qtyAccepted: '—', qtyRejected: '—', batchNo: '—', expiry: '—', qaStatus: 'Not started', inspector: '—', acceptanceCert: '—', date: '01-09-2026', remarks: 'Pending contract / PO before goods receipt.' },
    { id: 'GRN-2026-0091', poId: 'PO-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'Partial receipt', vendor: 'SafeHands Consumables', grnDate: '01-09-2026', value: '₹12 L – ₹15 L', qtyOrdered: 'Full PO', qtyReceived: '60%', qtyAccepted: 'Pending QA', qtyRejected: '—', batchNo: 'SH/GL/0826/B', expiry: '07-2029', qaStatus: 'In progress', inspector: 'Store Officer — Jabalpur', acceptanceCert: '— Pending', remarks: 'Balance consignment expected within 7 days.' },
    { id: 'GRN-2026-0085', poId: 'PO-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Awaiting delivery', vendor: 'MediTrans Logistics', grnDate: '—', value: '₹29 L – ₹34 L', qtyOrdered: '—', qtyReceived: '—', qtyAccepted: '—', qtyRejected: '—', batchNo: '—', expiry: '—', qaStatus: 'Not started', inspector: '—', acceptanceCert: '—', date: '28-08-2026', remarks: 'Service PO not yet issued.' },
    { id: 'GRN-2026-0042B', poId: 'PO-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract (Lot-2)', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Rejected / held', vendor: 'MediSupply India', grnDate: '28-08-2026', value: '₹48 L – ₹55 L', qtyOrdered: 'Lot-2 sample', qtyReceived: 'Sample lot', qtyAccepted: 'Nil', qtyRejected: 'Full sample', batchNo: 'MS/EDL/0726/X', expiry: '02-2027', qaStatus: 'Failed', inspector: 'QA Cell — Bhopal', acceptanceCert: 'Hold notice HN/042', remarks: 'Shelf-life below NIT threshold; vendor to replace.' },
    { id: 'GRN-2026-0126', poId: 'PO-2026-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting delivery', vendor: '— Pending L1', grnDate: '—', value: '₹85 L – ₹1.05 Cr', qtyOrdered: '—', qtyReceived: '—', qtyAccepted: '—', qtyRejected: '—', batchNo: '—', expiry: '—', qaStatus: 'Not started', inspector: '—', acceptanceCert: '—', date: '28-08-2026', remarks: 'Award pending; no GRN yet.' },
    { id: 'GRN-2026-0055', poId: 'PO-2026-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting delivery', vendor: '— Pending L1', grnDate: '—', value: '₹2.9 Cr – ₹3.5 Cr', qtyOrdered: '—', qtyReceived: '—', qtyAccepted: '—', qtyRejected: '—', batchNo: '—', expiry: '—', qaStatus: 'Not started', inspector: '—', acceptanceCert: '—', date: '01-09-2026', remarks: 'Evaluation open; GRN not applicable yet.' }
  ]
};

/** Stage 12 — Invoice Matching (Resource Manager view) */
const INVOICE_MATCHING_DATA = {
  meta: {
    lastUpdated: '03-09-2026 18:15 IST',
    note: 'Three-way match of Purchase Order, GRN and vendor invoice before payment release.'
  },
  processSteps: [
    { id: 1, title: 'Three-way match: PO, GRN, Invoice', detail: 'Quantity, rate and tax lines compared across the three documents.', status: 'In Progress' },
    { id: 2, title: 'Deductions / LD if applicable', detail: 'Apply liquidated damages, shortages or other deductions.', status: 'Pending' },
    { id: 3, title: 'Finance verification', detail: 'Finance clears matched invoices for payment release.', status: 'Pending' }
  ],
  invoices: [
    { id: 'INV-2026-0042', poId: 'PO-2026-0042', grnId: 'GRN-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Matched', vendor: 'MediSupply India', invoiceDate: '20-09-2026', value: '₹1.94 Cr – ₹2.08 Cr', poValue: '₹1.95 Cr – ₹2.10 Cr', grnValue: '₹1.95 Cr – ₹2.10 Cr', matchScore: '98%', taxInvoice: 'MS/TAX/2026/8841', deductions: '₹0.02 Cr (rejected packs)', financeStatus: 'Cleared', remarks: 'Three-way match complete; minor deduction for rejected qty.' },
    { id: 'INV-2026-0102', poId: 'PO-2026-0102', grnId: 'GRN-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'Under match', vendor: 'ImageMed Systems', invoiceDate: '08-09-2026', value: '₹2.6 Cr – ₹3.0 Cr', poValue: '₹2.6 Cr – ₹3.0 Cr', grnValue: 'Pending acceptance', matchScore: '—', taxInvoice: 'IM/TAX/2026/4412', deductions: '—', financeStatus: 'On hold', remarks: 'Waiting for acceptance certificate after installation QA.' },
    { id: 'INV-2026-0038', poId: 'PO-2026-0038', grnId: 'GRN-2026-0038', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Matched', vendor: 'CleanCare Supplies', invoiceDate: '25-08-2026', value: '₹26 L – ₹30 L', poValue: '₹26 L – ₹30 L', grnValue: '₹26 L – ₹30 L', matchScore: '100%', taxInvoice: 'CC/TAX/2026/2290', deductions: 'Nil', financeStatus: 'Cleared', remarks: 'Full match; ready for payment.' },
    { id: 'INV-2026-0161', poId: 'PO-2026-0161', grnId: 'GRN-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'Matched', vendor: 'SecureHealth Services', invoiceDate: '01-09-2026', value: '₹5.4 L – ₹6.5 L', poValue: '₹5.4 L – ₹6.5 L', grnValue: '₹5.4 L – ₹6.5 L', matchScore: '100%', taxInvoice: 'SHS/TAX/2026/1102', deductions: 'Nil', financeStatus: 'Cleared', remarks: 'Month-1 service invoice matched to attendance GRN.' },
    { id: 'INV-2026-0133', poId: 'PO-2026-0133', grnId: 'GRN-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'Matched', vendor: 'GreenMed Waste', invoiceDate: '10-09-2026', value: '₹3.1 L – ₹3.8 L', poValue: '₹3.1 L – ₹3.8 L', grnValue: '₹3.1 L – ₹3.8 L', matchScore: '100%', taxInvoice: 'GMW/TAX/2026/7731', deductions: 'Nil', financeStatus: 'Cleared', remarks: 'Service invoice cleared for payment.' },
    { id: 'INV-2026-0091', poId: 'PO-2026-0091', grnId: 'GRN-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'Mismatch', vendor: 'SafeHands Consumables', invoiceDate: '02-09-2026', value: '₹25 L – ₹30 L', poValue: '₹25 L – ₹30 L', grnValue: '₹12 L – ₹15 L (partial)', matchScore: '60%', taxInvoice: 'SH/TAX/2026/091', deductions: 'Hold full invoice', financeStatus: 'On hold', remarks: 'Invoice for full PO while GRN is partial — vendor to revise.' },
    { id: 'INV-2026-0098', poId: 'PO-2026-0098', grnId: 'GRN-2026-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Awaiting GRN', vendor: 'OncoCare Pharma', invoiceDate: '—', value: '₹7.9 Cr – ₹8.5 Cr', poValue: 'Draft', grnValue: '—', matchScore: '—', taxInvoice: '—', deductions: '—', financeStatus: 'Not started', date: '03-09-2026', remarks: 'No invoice matching until PO and GRN exist.' },
    { id: 'INV-2026-0072', poId: 'PO-2026-0072', grnId: 'GRN-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Awaiting GRN', vendor: 'Apex Surgical India', invoiceDate: '—', value: '₹41 L – ₹48 L', poValue: 'Pending', grnValue: '—', matchScore: '—', taxInvoice: '—', deductions: '—', financeStatus: 'Not started', date: '01-09-2026', remarks: 'Blocked until contract and GRN.' },
    { id: 'INV-2026-0042B', poId: 'PO-2026-0042', grnId: 'GRN-2026-0042B', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines (held lot)', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Rejected', vendor: 'MediSupply India', invoiceDate: '29-08-2026', value: '₹48 L – ₹55 L', poValue: '₹48 L – ₹55 L', grnValue: 'Rejected', matchScore: '0%', taxInvoice: 'MS/TAX/2026/0901', deductions: 'Full hold', financeStatus: 'Rejected', remarks: 'Invoice blocked — GRN rejected for shelf-life.' },
    { id: 'INV-2026-0085', poId: 'PO-2026-0085', grnId: 'GRN-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Awaiting GRN', vendor: 'MediTrans Logistics', invoiceDate: '—', value: '₹29 L – ₹34 L', poValue: 'Pending', grnValue: '—', matchScore: '—', taxInvoice: '—', deductions: '—', financeStatus: 'Not started', date: '28-08-2026', remarks: 'No matching until service PO / GRN.' },
    { id: 'INV-2026-0126', poId: 'PO-2026-0126', grnId: 'GRN-2026-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting GRN', vendor: '— Pending L1', invoiceDate: '—', value: '₹85 L – ₹1.05 Cr', poValue: '—', grnValue: '—', matchScore: '—', taxInvoice: '—', deductions: '—', financeStatus: 'Not started', date: '28-08-2026', remarks: 'Award pending.' },
    { id: 'INV-2026-0055', poId: 'PO-2026-0055', grnId: 'GRN-2026-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting GRN', vendor: '— Pending L1', invoiceDate: '—', value: '₹2.9 Cr – ₹3.5 Cr', poValue: '—', grnValue: '—', matchScore: '—', taxInvoice: '—', deductions: '—', financeStatus: 'Not started', date: '01-09-2026', remarks: 'Evaluation open.' }
  ]
};

/** Stage 13 — Payment (Resource Manager view) */
const PAYMENT_STAGE_DATA = {
  meta: {
    lastUpdated: '03-09-2026 18:30 IST',
    note: 'Process payments within contract terms; apply LD where applicable and track treasury release.'
  },
  processSteps: [
    { id: 1, title: 'Payment processing', detail: 'Release net payable within contract payment terms via PFMS / treasury.', status: 'In Progress' },
    { id: 2, title: 'Audit trail entry', detail: 'Record payment advice, UTR and approval chain for audit.', status: 'Pending' },
    { id: 3, title: 'Contract closure records', detail: 'Close payment cycle and update contract closure status.', status: 'Pending' }
  ],
  payments: [
    { id: 'PAY-2026-0042', invoiceId: 'INV-2026-0042', poId: 'PO-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Paid', vendor: 'MediSupply India', paymentDate: '28-09-2026', value: '₹1.92 Cr – ₹2.06 Cr', gross: '₹1.94 Cr – ₹2.08 Cr', ld: 'Nil', netPayable: '₹1.92 Cr – ₹2.06 Cr', mode: 'PFMS / NEFT', utr: 'UTR/SBI/2026/991204', dueDate: '04-11-2026', remarks: 'Paid within Net 45 from GRN.', paidItems: ['Paracetamol 500mg Tab', 'Amoxicillin 250mg Cap', 'IV Normal Saline 500ml'] },
    { id: 'PAY-2026-0038', invoiceId: 'INV-2026-0038', poId: 'PO-2026-0038', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Consumables', status: 'Paid', vendor: 'CleanCare Supplies', paymentDate: '20-09-2026', value: '₹26 L – ₹30 L', gross: '₹26 L – ₹30 L', ld: 'Nil', netPayable: '₹26 L – ₹30 L', mode: 'PFMS / NEFT', utr: 'UTR/HDFC/2026/441188', dueDate: '24-09-2026', remarks: 'Paid on Net 30 terms.', paidItems: ['Hospital Linen'] },
    { id: 'PAY-2026-0161', invoiceId: 'INV-2026-0161', poId: 'PO-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Services', status: 'In process', vendor: 'SecureHealth Services', paymentDate: '—', value: '₹5.4 L – ₹6.5 L', gross: '₹5.4 L – ₹6.5 L', ld: 'Nil', netPayable: '₹5.4 L – ₹6.5 L', mode: 'PFMS', utr: '— Pending', dueDate: '01-10-2026', date: '03-09-2026', remarks: 'Payment advice generated; treasury queue.' },
    { id: 'PAY-2026-0133', invoiceId: 'INV-2026-0133', poId: 'PO-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', state: 'Madhya Pradesh', division: 'Indore', category: 'Others', status: 'Approved', vendor: 'GreenMed Waste', paymentDate: '—', value: '₹3.1 L – ₹3.8 L', gross: '₹3.1 L – ₹3.8 L', ld: 'Nil', netPayable: '₹3.1 L – ₹3.8 L', mode: 'PFMS', utr: '—', dueDate: '10-10-2026', date: '02-09-2026', remarks: 'Finance approved; awaiting release.' },
    { id: 'PAY-2026-0102', invoiceId: 'INV-2026-0102', poId: 'PO-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', state: 'Madhya Pradesh', division: 'Indore', category: 'Equipment', status: 'On hold', vendor: 'ImageMed Systems', paymentDate: '—', value: '₹2.6 Cr – ₹3.0 Cr', gross: '₹2.6 Cr – ₹3.0 Cr', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '08-09-2026', remarks: 'Held until GRN acceptance certificate.', paidItems: ['Digital X-Ray'] },
    { id: 'PAY-2026-0091', invoiceId: 'INV-2026-0091', poId: 'PO-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Consumables', status: 'On hold', vendor: 'SafeHands Consumables', paymentDate: '—', value: '₹25 L – ₹30 L', gross: '₹25 L – ₹30 L', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '02-09-2026', remarks: 'Invoice mismatch — revise before payment.', paidItems: ['Disposable Gloves'] },
    { id: 'PAY-2026-0042B', invoiceId: 'INV-2026-0042B', poId: 'PO-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines (held lot)', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Drugs', status: 'Rejected', vendor: 'MediSupply India', paymentDate: '—', value: '₹48 L – ₹55 L', gross: '₹48 L – ₹55 L', ld: 'N/A', netPayable: 'Nil', mode: '—', utr: '—', dueDate: '—', date: '29-08-2026', rejectionReason: 'GRN-2026-0042B failed QA — shelf-life below NIT threshold. Invoice INV-2026-0042B was blocked and no payment was released for this held lot.', remarks: 'No payment — GRN and invoice rejected.', paidItems: ['Essential Medicines RC Pack'] },
    { id: 'PAY-2026-0098', invoiceId: 'INV-2026-0098', poId: 'PO-2026-0098', tenderId: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', state: 'Madhya Pradesh', division: 'Jabalpur', category: 'Drugs', status: 'Awaiting invoice', vendor: 'OncoCare Pharma', paymentDate: '—', value: '₹7.9 Cr – ₹8.5 Cr', gross: '—', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '03-09-2026', remarks: 'Upstream stages incomplete.' },
    { id: 'PAY-2026-0072', invoiceId: 'INV-2026-0072', poId: 'PO-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Equipment', status: 'Awaiting invoice', vendor: 'Apex Surgical India', paymentDate: '—', value: '₹41 L – ₹48 L', gross: '—', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '01-09-2026', remarks: 'Awaiting contract / GRN / invoice.' },
    { id: 'PAY-2026-0085', invoiceId: 'INV-2026-0085', poId: 'PO-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', state: 'Madhya Pradesh', division: 'Rewa', category: 'Others', status: 'Awaiting invoice', vendor: 'MediTrans Logistics', paymentDate: '—', value: '₹29 L – ₹34 L', gross: '—', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '28-08-2026', remarks: 'No payment queue entry yet.' },
    { id: 'PAY-2026-0126', invoiceId: 'INV-2026-0126', poId: 'PO-2026-0126', tenderId: 'TND-2026-MP-0126', title: 'Telemedicine Platform', state: 'Madhya Pradesh', division: 'Gwalior', category: 'Services', status: 'Awaiting invoice', vendor: '— Pending L1', paymentDate: '—', value: '₹85 L – ₹1.05 Cr', gross: '—', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '28-08-2026', remarks: 'Award pending.' },
    { id: 'PAY-2026-0055', invoiceId: 'INV-2026-0055', poId: 'PO-2026-0055', tenderId: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', state: 'Madhya Pradesh', division: 'Bhopal', category: 'Equipment', status: 'Awaiting invoice', vendor: '— Pending L1', paymentDate: '—', value: '₹2.9 Cr – ₹3.5 Cr', gross: '—', ld: '—', netPayable: '—', mode: '—', utr: '—', dueDate: '—', date: '01-09-2026', remarks: 'Evaluation open.' }
  ]
};

/** Stage 3 — Indent list (seed rows for Resource Manager) */
const INDENT_LIST_SEED = [
  { id: 'IND-2026-0041', item: 'Paracetamol 500mg Tab', quantity: '6.3 L packs', unit: 'Packs', facility: 'Gandhi Medical College', district: 'Bhopal', category: 'Drugs', priority: 'High', status: 'Submitted', source: 'Manual', date: '02-09-2026', requiredBy: '20-09-2026', raisedBy: 'Store Manager — Bhopal', approvingAuthority: 'CMO / Competent Authority', justification: 'Critical shortfall vs reorder; open PO insufficient for monsoon ARI load.', remarks: 'Escalate if not approved by 10-09-2026' },
  { id: 'IND-2026-0038', item: 'IV Normal Saline 500ml', quantity: '1.3 L units', unit: 'Units', facility: 'M.Y. Hospital Indore', district: 'Indore', category: 'Drugs', priority: 'High', status: 'Under review', source: 'Automated', date: '01-09-2026', requiredBy: '15-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Gap analysis residual after stock & open PO netting.', remarks: '' },
  { id: 'IND-2026-0032', item: 'Insulin 40 IU Vial', quantity: '18,800', unit: 'Vials', facility: 'District Hospital Rewa', district: 'Rewa', category: 'Drugs', priority: 'Critical', status: 'Submitted', source: 'Automated', date: '28-08-2026', requiredBy: '12-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Rate-contract top-up required for NCD programme buffer.', remarks: 'Cold-chain transfer preferred if surplus found' },
  { id: 'IND-2026-0029', item: 'Surgical Gloves (pair)', quantity: '1.3 L', unit: 'Pairs', facility: 'NSCB Jabalpur', district: 'Jabalpur', category: 'Consumables', priority: 'Medium', status: 'Approved', source: 'Manual', date: '25-08-2026', requiredBy: '05-09-2026', raisedBy: 'Store Manager — Jabalpur', approvingAuthority: 'CMO / Competent Authority', justification: 'Redistribution incomplete; residual indent for PPE buffer.', remarks: '' },
  { id: 'IND-2026-0027', item: 'Amoxicillin 250mg Cap', quantity: '2.5 L packs', unit: 'Packs', facility: 'Civil Hospital Sagar', district: 'Sagar', category: 'Drugs', priority: 'High', status: 'Submitted', source: 'Manual', date: '10-08-2026', requiredBy: '10-09-2026', raisedBy: 'Store Manager — Sagar', approvingAuthority: 'CMO / Competent Authority', justification: 'Antibiotic buffer for monsoon infections.', remarks: 'Near 30-day indent SLA' },
  { id: 'IND-2026-0025', item: 'ORS Sachets', quantity: '1.3 L', unit: 'Sachets', facility: 'CHC Sehore', district: 'Sehore', category: 'Drugs', priority: 'Medium', status: 'Under review', source: 'Automated', date: '08-08-2026', requiredBy: '08-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Diarrhoea season uplift.', remarks: 'Near indent SLA deadline' },
  { id: 'IND-2026-0022', item: 'Ceftriaxone 1g Inj', quantity: '14,500', unit: 'Vials', facility: 'District Hospital Ujjain', district: 'Ujjain', category: 'Drugs', priority: 'Critical', status: 'Submitted', source: 'Manual', date: '05-08-2026', requiredBy: '05-09-2026', raisedBy: 'Store Manager — Ujjain', approvingAuthority: 'CMO / Competent Authority', justification: 'Injectable antibiotic critical shortfall.', remarks: 'Approaching 30-day SLA' },
  { id: 'IND-2026-0020', item: 'PPE Kit', quantity: '10,300', unit: 'Kits', facility: 'GMC Bhopal — Stores', district: 'Bhopal', category: 'Consumables', priority: 'High', status: 'Approved', source: 'Automated', date: '21-08-2026', requiredBy: '01-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'Infection-control buffer.', remarks: '' },
  { id: 'IND-2026-0018', item: 'Metformin 500mg', quantity: '1.7 L packs', unit: 'Packs', facility: 'District Hospital Satna', district: 'Satna', category: 'Drugs', priority: 'Medium', status: 'Submitted', source: 'Manual', date: '20-07-2026', requiredBy: '15-09-2026', raisedBy: 'Store Manager — Satna', approvingAuthority: 'CMO / Competent Authority', justification: 'NCD programme top-up.', remarks: 'SLA breached — 45+ days pending' },
  { id: 'IND-2026-0015', item: 'Iron Folic Acid Tab', quantity: '2.0 L', unit: 'Packs', facility: 'CHC Hoshangabad', district: 'Hoshangabad', category: 'Drugs', priority: 'High', status: 'Under review', source: 'Automated', date: '18-07-2026', requiredBy: '10-09-2026', raisedBy: 'System — AI/ML indent', approvingAuthority: 'CMO / Competent Authority', justification: 'MCH programme demand.', remarks: 'SLA breached — no action taken' },
  { id: 'IND-2026-0012', item: 'Rabies Vaccine', quantity: '3,100', unit: 'Vials', facility: 'District Hospital Mandla', district: 'Mandla', category: 'Drugs', priority: 'Critical', status: 'Submitted', source: 'Manual', date: '15-07-2026', requiredBy: '28-08-2026', raisedBy: 'Store Manager — Mandla', approvingAuthority: 'CMO / Competent Authority', justification: 'Emergency ASV/ARV buffer.', remarks: 'Critical indent overdue vs 30-day SLA' },
  { id: 'IND-2026-0010', item: 'Hospital Linen sets', quantity: '4,500', unit: 'Sets', facility: 'PHC Berasia', district: 'Bhopal', category: 'Consumables', priority: 'Medium', status: 'Approved', source: 'Manual', date: '17-08-2026', requiredBy: '05-09-2026', raisedBy: 'Store Manager — Berasia', approvingAuthority: 'CMO / Competent Authority', justification: 'Facility linen replenishment.', remarks: '' }

];

/** Stage 4 — Demand approval list */
const DEMAND_APPROVAL_LIST = [
  { id: 'DEM-2026-0112', district: 'Bhopal', category: 'Drugs', items: 47, facilities: 12, valueLow: '₹14.6 Cr', valueHigh: '₹17.8 Cr', status: 'Pending Review', date: '03-09-2026', indentRef: 'IND-2026-0041', notes: 'Awaiting duplicate check clearance for antipyretics pack.' },
  { id: 'DEM-2026-0108', district: 'Indore', category: 'Equipment', items: 18, facilities: 6, valueLow: '₹8.4 Cr', valueHigh: '₹11.2 Cr', status: 'Verified', date: '01-09-2026', indentRef: 'IND-2026-0035', notes: 'Optimization sources reviewed — warehouse release preferred.' },
  { id: 'DEM-2026-0101', district: 'Jabalpur', category: 'Consumables', items: 22, facilities: 8, valueLow: '₹2.2 Cr', valueHigh: '₹3.4 Cr', status: 'Clarification Sought', date: '28-08-2026', indentRef: 'IND-2026-0029', notes: 'Clarification issued on PPE quantity uplift.' },
  { id: 'DEM-2026-0094', district: 'Gwalior', category: 'Drugs', items: 31, facilities: 9, valueLow: '₹9.1 Cr', valueHigh: '₹11.5 Cr', status: 'Approved', date: '20-08-2026', indentRef: 'IND-2026-0021', notes: 'Approved for PR & budget sanction path.' },
  { id: 'DEM-2026-0090', district: 'Rewa', category: 'Drugs', items: 26, facilities: 7, valueLow: '₹6.2 Cr', valueHigh: '₹7.8 Cr', status: 'Pending Review', date: '20-07-2026', indentRef: 'IND-2026-0032', notes: 'Insulin cold-chain lines pending — near 50-day consolidation SLA.' },
  { id: 'DEM-2026-0086', district: 'Sagar', category: 'Consumables', items: 14, facilities: 5, valueLow: '₹1.1 Cr', valueHigh: '₹1.6 Cr', status: 'Verified', date: '18-08-2026', indentRef: 'IND-2026-0027', notes: 'Gloves & linen consolidated.' },
  { id: 'DEM-2026-0082', district: 'Ujjain', category: 'Drugs', items: 19, facilities: 6, valueLow: '₹4.8 Cr', valueHigh: '₹6.1 Cr', status: 'Clarification Sought', date: '18-07-2026', indentRef: 'IND-2026-0022', notes: 'Ceftriaxone clarification open — approaching consolidation SLA.' },
  { id: 'DEM-2026-0078', district: 'Sehore', category: 'Drugs', items: 11, facilities: 4, valueLow: '₹0.9 Cr', valueHigh: '₹1.3 Cr', status: 'Approved', date: '16-08-2026', indentRef: 'IND-2026-0025', notes: 'ORS seasonal pack approved.' },
  { id: 'DEM-2026-0074', district: 'Satna', category: 'Equipment', items: 9, facilities: 3, valueLow: '₹2.4 Cr', valueHigh: '₹3.1 Cr', status: 'Pending Review', date: '10-07-2026', indentRef: 'IND-2026-0018', notes: 'Pending >50 days — consolidation SLA breached.' },
  { id: 'DEM-2026-0070', district: 'Hoshangabad', category: 'Drugs', items: 16, facilities: 5, valueLow: '₹3.2 Cr', valueHigh: '₹4.0 Cr', status: 'Verified', date: '14-08-2026', indentRef: 'IND-2026-0015', notes: 'MCH iron/folic demand verified.' },
  { id: 'DEM-2026-0066', district: 'Mandla', category: 'Drugs', items: 8, facilities: 3, valueLow: '₹0.7 Cr', valueHigh: '₹1.0 Cr', status: 'Approved', date: '13-08-2026', indentRef: 'IND-2026-0012', notes: 'Emergency rabies vaccine pack approved.' },
  { id: 'DEM-2026-0062', district: 'Bhopal', category: 'Services', items: 5, facilities: 2, valueLow: '₹1.6 Cr', valueHigh: '₹2.0 Cr', status: 'Pending Review', date: '08-07-2026', indentRef: 'IND-2026-0008', notes: 'HMIS support package — consolidation SLA breached.' }

];

const RENEWAL_STAGE_DATA = {
  meta: {
    lastUpdated: '04-09-2026 14:00 IST',
    note: 'Resource Managers review vendor renewals, download attached tender documents, and finalize renewals with optional supporting uploads.'
  },
  renewals: [
    {
      id: 'REN-2026-0012', vendorId: 'VND-MP-000123', vendorName: 'MediSupply India Pvt Ltd', category: 'Drugs',
      renewalFrom: '01-04-2026', renewalTo: '31-03-2027', renewalDate: '15-08-2026',
      renewalType: 'Fresh renewal', status: 'Pending finalization', contractId: 'CNT-2025-0088', value: '₹4.2 Cr',
      contact: 'ops@medisupply.in · +91 755 400 2100', gstin: '23AABCM1234A1Z5',
      remarks: 'Rate contract due for annual renewal under Drugs formulary.',
      documents: [
        { id: 'DOC-REN-0012-A', name: 'Fresh Tender NIT — Essential Medicines RC', type: 'Fresh tender', file: 'REN-0012-Fresh-Tender-NIT.pdf' },
        { id: 'DOC-REN-0012-B', name: 'Addendum — Shelf-life clause', type: 'Addendum', file: 'REN-0012-Addendum-ShelfLife.pdf' }
      ]
    },
    {
      id: 'REN-2026-0018', vendorId: 'VND-MP-000456', vendorName: 'HealthTech Solutions', category: 'Equipment',
      renewalFrom: '01-07-2026', renewalTo: '30-06-2027', renewalDate: '22-08-2026',
      renewalType: 'Extra quality order', status: 'Under review', contractId: 'CNT-2025-0142', value: '₹1.8 Cr',
      contact: 'support@healthtech.in · +91 731 255 8800', gstin: '23AABCH4567B1Z2',
      remarks: 'Additional quality order against existing AMC for digital X-Ray fleet.',
      documents: [
        { id: 'DOC-REN-0018-A', name: 'Corrigendum — Delivery schedule', type: 'Corrigendum', file: 'REN-0018-Corrigendum-Delivery.pdf' },
        { id: 'DOC-REN-0018-B', name: 'Extra Quality Order — Spec sheet', type: 'Extra quality order', file: 'REN-0018-EQO-Specs.pdf' }
      ]
    },
    {
      id: 'REN-2026-0021', vendorId: 'VND-MP-000789', vendorName: 'PharmaCare Distributors', category: 'Drugs',
      renewalFrom: '01-10-2026', renewalTo: '30-09-2027', renewalDate: '01-09-2026',
      renewalType: 'Fresh renewal', status: 'Pending finalization', contractId: 'CNT-2025-0201', value: '₹2.6 Cr',
      contact: 'tenders@pharmacare.in · +91 761 400 1122', gstin: '23AABCP7890C1Z8',
      remarks: 'Oncology pack rate contract renewal — license expiry check required.',
      documents: [
        { id: 'DOC-REN-0021-A', name: 'Fresh Tender — Oncology Drug Pack', type: 'Fresh tender', file: 'REN-0021-Fresh-Tender.pdf' }
      ]
    },
    {
      id: 'REN-2026-0025', vendorId: 'VND-MP-001012', vendorName: 'BioMed Instruments', category: 'Equipment',
      renewalFrom: '15-05-2026', renewalTo: '14-05-2027', renewalDate: '10-07-2026',
      renewalType: 'Fresh renewal', status: 'Finalized', contractId: 'CNT-2025-0110', value: '₹95 L',
      contact: 'contracts@biomed.in · +91 755 266 4400', gstin: '23AABB1012D1Z4',
      remarks: 'Surgical instruments kit renewal finalized by Resource Manager.',
      documents: [
        { id: 'DOC-REN-0025-A', name: 'Addendum — Warranty extension', type: 'Addendum', file: 'REN-0025-Addendum-Warranty.pdf' },
        { id: 'DOC-REN-0025-B', name: 'Signed renewal LOA', type: 'Fresh tender', file: 'REN-0025-Signed-LOA.pdf' }
      ]
    },
    {
      id: 'REN-2026-0030', vendorId: 'VND-MP-001345', vendorName: 'CarePlus Consumables', category: 'Consumables',
      renewalFrom: '01-09-2026', renewalTo: '31-08-2027', renewalDate: '28-08-2026',
      renewalType: 'Extra quality order', status: 'Pending finalization', contractId: 'CNT-2025-0334', value: '₹42 L',
      contact: 'sales@careplus.in · +91 755 300 7788', gstin: '23AABCC1345E1Z9',
      remarks: 'Extra quality order for gloves & PPE — pending compliance clearance.',
      documents: [
        { id: 'DOC-REN-0030-A', name: 'Corrigendum — Quantity uplift', type: 'Corrigendum', file: 'REN-0030-Corrigendum-Qty.pdf' }
      ]
    },
    {
      id: 'REN-2026-0034', vendorId: 'VND-MP-001678', vendorName: 'Digital Health IT', category: 'Services',
      renewalFrom: '01-04-2026', renewalTo: '31-03-2028', renewalDate: '05-06-2026',
      renewalType: 'Fresh renewal', status: 'Under review', contractId: 'CNT-2025-0402', value: '₹1.1 Cr',
      contact: 'renewals@digitalhealth.in · +91 755 488 2200', gstin: '23AABCD1678F1Z1',
      remarks: 'Telemedicine SLA renewal — 2-year term proposed.',
      documents: [
        { id: 'DOC-REN-0034-A', name: 'Fresh Tender — Telemedicine Platform', type: 'Fresh tender', file: 'REN-0034-Fresh-Tender.pdf' },
        { id: 'DOC-REN-0034-B', name: 'Addendum — SLA KPIs', type: 'Addendum', file: 'REN-0034-Addendum-SLA.pdf' },
        { id: 'DOC-REN-0034-C', name: 'Corrigendum — Uptime clause', type: 'Corrigendum', file: 'REN-0034-Corrigendum-Uptime.pdf' }
      ]
    },
    {
      id: 'REN-2026-0038', vendorId: 'VND-MP-001901', vendorName: 'OncoCare Pharma', category: 'Drugs',
      renewalFrom: '01-11-2026', renewalTo: '31-10-2027', renewalDate: '02-09-2026',
      renewalType: 'Fresh renewal', status: 'Pending finalization', contractId: 'CNT-2025-0510', value: '₹3.4 Cr',
      contact: 'renewals@oncocare.in · +91 761 222 4455', gstin: '23AABCO1901G1Z3',
      remarks: 'Oncology supportive care RC — cold-chain clause review.',
      documents: [
        { id: 'DOC-REN-0038-A', name: 'Fresh Tender — Oncology Support', type: 'Fresh tender', file: 'REN-0038-Fresh-Tender.pdf' }
      ]
    },
    {
      id: 'REN-2026-0042', vendorId: 'VND-MP-002134', vendorName: 'ImageMed Systems', category: 'Equipment',
      renewalFrom: '01-06-2026', renewalTo: '31-05-2027', renewalDate: '18-08-2026',
      renewalType: 'Extra quality order', status: 'Under review', contractId: 'CNT-2025-0555', value: '₹72 L',
      contact: 'amc@imagemed.in · +91 731 400 9988', gstin: '23AABCI2134H1Z6',
      remarks: 'AMC uplift for digital X-Ray — spare kits EQO.',
      documents: [
        { id: 'DOC-REN-0042-A', name: 'EQO — Spares list', type: 'Extra quality order', file: 'REN-0042-EQO.pdf' },
        { id: 'DOC-REN-0042-B', name: 'Corrigendum — Response time', type: 'Corrigendum', file: 'REN-0042-Corrigendum.pdf' }
      ]
    },
    {
      id: 'REN-2026-0046', vendorId: 'VND-MP-002367', vendorName: 'SafeHands Consumables', category: 'Consumables',
      renewalFrom: '01-08-2026', renewalTo: '31-07-2027', renewalDate: '12-08-2026',
      renewalType: 'Fresh renewal', status: 'Finalized', contractId: 'CNT-2025-0601', value: '₹38 L',
      contact: 'contracts@safehands.in · +91 755 311 6677', gstin: '23AABCS2367I1Z0',
      remarks: 'Gloves & PPE rate contract renewed.',
      documents: [
        { id: 'DOC-REN-0046-A', name: 'Signed renewal LOA', type: 'Fresh tender', file: 'REN-0046-LOA.pdf' }
      ]
    },
    {
      id: 'REN-2026-0050', vendorId: 'VND-MP-002590', vendorName: 'SecureHealth Services', category: 'Services',
      renewalFrom: '01-09-2026', renewalTo: '31-08-2027', renewalDate: '25-08-2026',
      renewalType: 'Fresh renewal', status: 'Pending finalization', contractId: 'CNT-2025-0660', value: '₹68 L',
      contact: 'ops@securehealth.in · +91 755 500 1212', gstin: '23AABCS2590J1Z7',
      remarks: 'Hospital security manpower SLA renewal.',
      documents: [
        { id: 'DOC-REN-0050-A', name: 'Fresh Tender — Security SLA', type: 'Fresh tender', file: 'REN-0050-Fresh-Tender.pdf' },
        { id: 'DOC-REN-0050-B', name: 'Addendum — Manpower rates', type: 'Addendum', file: 'REN-0050-Addendum.pdf' }
      ]
    },
    {
      id: 'REN-2026-0054', vendorId: 'VND-MP-002813', vendorName: 'GreenMed Waste', category: 'Others',
      renewalFrom: '01-05-2026', renewalTo: '30-04-2027', renewalDate: '08-07-2026',
      renewalType: 'Fresh renewal', status: 'Under review', contractId: 'CNT-2025-0712', value: '₹29 L',
      contact: 'tenders@greenmed.in · +91 731 266 3344', gstin: '23AABCG2813K1Z2',
      remarks: 'Biomedical waste contract — PCB authorization check.',
      documents: [
        { id: 'DOC-REN-0054-A', name: 'Fresh Tender — BMW services', type: 'Fresh tender', file: 'REN-0054-Fresh-Tender.pdf' }
      ]
    },
    {
      id: 'REN-2026-0058', vendorId: 'VND-MP-003036', vendorName: 'Apex Surgical India', category: 'Equipment',
      renewalFrom: '01-12-2026', renewalTo: '30-11-2027', renewalDate: '30-08-2026',
      renewalType: 'Fresh renewal', status: 'Pending finalization', contractId: 'CNT-2025-0788', value: '₹55 L',
      contact: 'renewals@apexsurg.in · +91 755 277 9090', gstin: '23AABCA3036L1Z5',
      remarks: 'Surgical instruments RC — BIS certification refresh.',
      documents: [
        { id: 'DOC-REN-0058-A', name: 'Fresh Tender — Surgical Kits', type: 'Fresh tender', file: 'REN-0058-Fresh-Tender.pdf' },
        { id: 'DOC-REN-0058-B', name: 'Addendum — Sterility norms', type: 'Addendum', file: 'REN-0058-Addendum.pdf' }
      ]
    }
  ]
};

const AUDIT_TRAIL_VENDOR = [
  { id: 'AUD-V-2026-0142', time: '2026-09-04 14:32:10', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Bid Draft Saved', stage: 'Bid Submission', stageId: 4, module: 'Vendor Lifecycle', detail: 'Technical bid documents updated for TND-2026-MP-0055', ref: 'TND-2026-MP-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0141', time: '2026-09-04 11:05:44', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'EMD Payment Initiated', stage: 'Bid Submission', stageId: 4, module: 'Payments', detail: 'EMD of ₹3,20,000 initiated via e-BG portal — pending bank confirmation', ref: 'EMD-TND-0055', ip: '103.24.18.92', status: 'Pending' },
  { id: 'AUD-V-2026-0129', time: '2026-08-28 14:22:51', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Vendor Approved', stage: 'Vendor Approval', stageId: 3, module: 'Vendor Registry', detail: 'Vendor code VND-MP-000123 approved and activated for bidding', ref: 'VND-MP-000123', ip: '10.0.0.1', status: 'Success' },
  { id: 'AUD-V-2026-0124', time: '2026-08-27 11:07:33', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Verified', stage: 'KYC Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Bank account HDFC ****4567 verified; drug license DL-MH-2024-0892 validated', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0120', time: '2026-08-26 15:55:18', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'KYC Documents Uploaded', stage: 'KYC Verification', stageId: 2, module: 'Vendor Lifecycle', detail: 'Cancelled cheque, address proof, and signatory ID submitted', ref: 'KYC-2026-441', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0115', time: '2026-08-25 10:12:40', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Registration Submitted', stage: 'Registration', stageId: 1, module: 'Vendor Lifecycle', detail: 'Company profile, GSTIN 23AABCM1234A1Z5, PAN AABCM1234A registered', ref: 'REG-2026-1187', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0114', time: '2026-08-25 10:08:22', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Profile Created', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Vendor portal account created — email verified', ref: 'USR-VND-8891', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0108', time: '2026-08-20 17:30:00', user: 'VND-MP-000123', userName: 'MediSupply India', action: 'Financial Bid Sealed', stage: 'Bid Submission', stageId: 4, module: 'Bid Management', detail: 'Commercial bid encrypted and sealed — opening scheduled post technical evaluation', ref: 'BID-FIN-0055', ip: '103.24.18.92', status: 'Success' },
  { id: 'AUD-V-2026-0102', time: '2026-08-15 09:00:00', user: 'SYSTEM', userName: 'MP Health Portal', action: 'Session Login', stage: 'Registration', stageId: 1, module: 'Authentication', detail: 'Successful login from registered device', ref: 'SES-99201', ip: '103.24.18.92', status: 'Success' }
];

const AUDIT_TRAIL_GOV = [
  { id: 'AUD-G-2026-0088', time: '2026-09-04 15:10:22', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'Evaluation Committee Formed', stage: 'Bid Evaluation', stageId: 7, module: 'Tender Management', detail: 'Committee assigned for TND-2026-MP-0055 — technical opening completed', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0085', time: '2026-09-03 11:22:18', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Demand Consolidated', stage: 'Demand Consolidation', stageId: 4, module: 'Inventory', detail: 'District drug demand consolidated — 28 items optimizable from stock', ref: 'DEM-MP-2026-334', ip: '10.24.8.12', status: 'Success' },
  { id: 'AUD-G-2026-0080', time: '2026-09-01 14:05:55', user: 'GOV-FIN-007', userName: 'Finance Controller', action: 'Budget Sanctioned', stage: 'PR & Budget Approval', stageId: 5, module: 'Finance', detail: 'Administrative sanction for ₹4.2 Cr — Drugs category FY 2026-27', ref: 'BUD-MP-DRG-092', ip: '10.24.8.33', status: 'Success' },
  { id: 'AUD-G-2026-0076', time: '2026-08-29 10:40:11', user: 'GOV-PROC-014', userName: 'Dr. Sharma (Procurement)', action: 'NIT Published', stage: 'Tender Preparation', stageId: 6, module: 'Tender Management', detail: 'TND-2026-MP-0055 published — EMD ₹3,20,000, deadline 2026-09-05', ref: 'TND-2026-MP-0055', ip: '10.24.8.45', status: 'Success' },
  { id: 'AUD-G-2026-0070', time: '2026-08-25 09:15:00', user: 'GOV-STORE-022', userName: 'Store Manager — Bhopal', action: 'Indent Raised', stage: 'Indent Raised', stageId: 3, module: 'Inventory', detail: 'Critical stock indent for oncology drugs — 14 SKUs below reorder level', ref: 'IND-BPL-2026-089', ip: '10.24.8.12', status: 'Success' },
  { id: 'AUD-G-2026-0065', time: '2026-08-22 16:48:30', user: 'GOV-ADMIN-003', userName: 'CMO Office', action: 'Need Assessment Approved', stage: 'Need Identification', stageId: 1, module: 'Planning', detail: 'Quarterly need assessment for district hospitals approved', ref: 'NEED-MP-Q3-26', ip: '10.24.8.01', status: 'Success' }
];

const VENDOR_RESOURCE_DETAILS = {
  'bid-sealing': {
    title: 'Commercial Bid Sealing',
    icon: 'fa-lock',
    status: 'Sealed',
    statusClass: 'badge-info',
    summary: 'Your financial bid for TND-2026-MP-0055 is encrypted and stored separately from the technical bid until the authorized commercial opening stage.',
    stats: [
      { label: 'Tender Reference', value: 'TND-2026-MP-0055' },
      { label: 'Sealed On', value: '2026-08-20 17:30 IST' },
      { label: 'Opening Stage', value: 'Post technical qualification' },
      { label: 'Encryption', value: 'AES-256 + portal key' }
    ],
    steps: [
      'Technical bid evaluated first by the procurement committee',
      'Only technically qualified vendors proceed to commercial evaluation',
      'Financial bids are opened in a scheduled session with audit witnesses',
      'L1 / QCBS ranking computed after opening — vendors notified on portal'
    ],
    note: 'You cannot view or edit the sealed amount after submission. Contact procurement helpdesk for pre-deadline corrections only.'
  },
  'compliance-matrix': {
    title: 'Compliance Matrix',
    icon: 'fa-clipboard-list',
    status: '93% Complete',
    statusClass: 'badge-warning',
    summary: 'Map every tender requirement from the NIT/RFP to your submitted evidence. Gaps flagged before evaluation reduce disqualification risk.',
    stats: [
      { label: 'Tender', value: 'TND-2026-MP-0055' },
      { label: 'Requirements', value: '45 total' },
      { label: 'Mapped', value: '42 compliant' },
      { label: 'Pending', value: '3 clarifications' }
    ],
    rows: [
      { req: 'WHO-GMP certification', response: 'Certificate GMP/IN/2024/0892', status: 'Compliant' },
      { req: 'Minimum turnover ₹10 Cr', response: '₹12.5 Cr (FY 2025-26)', status: 'Compliant' },
      { req: 'Past supply to govt. hospitals', response: '8 years — annexure attached', status: 'Compliant' },
      { req: 'Cold chain capability', response: 'Clarification requested', status: 'Pending' },
      { req: 'EMD submission', response: 'e-BG initiated — pending', status: 'Pending' }
    ],
    note: 'Update eligibility proofs in Stage 4 if you receive clarification requests during evaluation.'
  },
  'emd-pbg': {
    title: 'EMD / Performance Bank Guarantee',
    icon: 'fa-building-columns',
    status: 'EMD Pending',
    statusClass: 'badge-warning',
    summary: 'Earnest Money Deposit (EMD) is required with bid submission. Performance Bank Guarantee (PBG) is submitted after award via SFMS/e-BG.',
    stats: [
      { label: 'EMD Amount', value: '₹3,20,000' },
      { label: 'EMD Status', value: 'Payment initiated' },
      { label: 'PBG (post-award)', value: '5–10% of contract value' },
      { label: 'PBG Channel', value: 'SFMS / e-BG portal' }
    ],
    steps: [
      'Pay EMD before bid deadline — DD, e-BG, or online transfer as per NIT',
      'EMD validity must cover evaluation period plus 45 days',
      'On award, submit PBG within LOA timeline (typically 15–21 days)',
      'PBG released after defect liability period and no-dues clearance'
    ],
    note: 'Failed EMD forfeiture applies if you withdraw after bid opening or fail to sign contract after award.'
  }
};

const VENDOR_WORKFLOW = [
  { id: 1, name: 'Registration', desc: 'Submit company profile and mandatory registration documents on the vendor portal.', status: 'pending' },
  { id: 2, name: 'KYC Verification', desc: 'Complete KYC, bank account verification, and regulatory compliance checks.', status: 'pending' },
  { id: 3, name: 'Vendor Approval', desc: 'Department reviews and approves vendor registration; vendor code is activated for bidding.', status: 'pending' },
  { id: 4, name: 'Bid Submitted', desc: '', status: 'pending' },
  { id: 5, name: 'Award Notification', desc: '', status: 'pending' },
  { id: 6, name: 'Contract Execution', desc: 'Select tender, complete LOI → PBG → draft, and upload tender-specific contract documents.', status: 'pending' },
  { id: 7, name: 'Delivery', desc: '', status: 'pending' },
  { id: 8, name: 'Invoice Submission', desc: 'Raise invoice with GRN reference and delivery proof for payment processing.', status: 'pending' },
  { id: 9, name: 'Payment Tracking', desc: 'Track payment status, receive payment advice, and close the invoice cycle.', status: 'pending' },
  { id: 10, name: 'Renewal', desc: 'Request renewal on an existing tender, MSA, or rate contract for Resource Manager review.', status: 'pending' }
];

const VENDORS = [
  { id: 'VND-MP-000123', name: 'MediSupply India Pvt Ltd', testingLabs: 92, communication: 90, timelyDelivery: 88, packaging: 86, pricing: 85, blacklisting: 98, overall: 90.3, status: 'Preferred', category: 'Drugs' },
  { id: 'VND-MP-000456', name: 'HealthTech Solutions', testingLabs: 85, communication: 82, timelyDelivery: 78, packaging: 84, pricing: 92, blacklisting: 90, overall: 84.2, status: 'Active', category: 'Equipment' },
  { id: 'VND-MP-000789', name: 'PharmaCare Distributors', testingLabs: 78, communication: 75, timelyDelivery: 72, packaging: 74, pricing: 88, blacklisting: 82, overall: 77.3, status: 'Active', category: 'Drugs' },
  { id: 'VND-MP-001012', name: 'BioMed Instruments', testingLabs: 95, communication: 88, timelyDelivery: 82, packaging: 90, pricing: 75, blacklisting: 98, overall: 88.7, status: 'Preferred', category: 'Equipment' },
  { id: 'VND-MP-001345', name: 'CarePlus Consumables', testingLabs: 70, communication: 68, timelyDelivery: 65, packaging: 72, pricing: 90, blacklisting: 60, overall: 69.2, status: 'Watch', category: 'Consumables' },
  { id: 'VND-MP-001678', name: 'Digital Health IT', testingLabs: 88, communication: 85, timelyDelivery: 90, packaging: 84, pricing: 80, blacklisting: 92, overall: 87.5, status: 'Active', category: 'Services' }
];

const ALERTS_GOV = [
  { id: 1, type: 'expiry', title: 'Drug License Expiring Soon', msg: 'VND-MP-000789 - Wholesale Drug License expires in 15 days', date: '2026-09-17', impact: 'Cannot participate in drug tenders', action: 'Renew license immediately', unread: true },
  { id: 2, type: 'corrigendum', title: 'Tender Corrigendum Issued', msg: 'TND-2026-MP-0042 - BOQ quantity amended for Paracetamol 500mg', date: '2026-09-01', impact: 'Bid submission deadline extended', action: 'Review and update bid', unread: true },
  { id: 3, type: 'approval', title: 'PR Pending Approval', msg: 'PR-2026-1187 - District Hospital Bhopal equipment procurement', date: '2026-09-02', impact: 'Tender cannot proceed', action: 'Review and approve PR', unread: true },
  { id: 4, type: 'quality', title: 'Quality Observation', msg: 'GRN-2026-0892 - Batch QC failed for IV Fluids', date: '2026-08-30', impact: 'Payment on hold', action: 'Initiate vendor communication', unread: true },
  { id: 5, type: 'expiry', title: 'PBG Expiry Alert', msg: 'Contract CNT-2025-0234 - Performance Bank Guarantee expires in 30 days', date: '2026-10-02', impact: 'Contract compliance risk', action: 'Request PBG renewal', unread: false },
  { id: 6, type: 'approval', title: 'Contract Milestone', msg: 'CNT-2026-0089 - Delivery milestone due in 5 days', date: '2026-09-07', impact: 'LD clause may apply', action: 'Follow up with vendor', unread: true },
  { id: 7, type: 'corrigendum', title: 'Restrictive Notice', msg: 'Vendor VND-MP-001345 suspended pending compliance review', date: '2026-08-28', impact: 'Cannot bid on new tenders', action: 'Review suspension order', unread: true }
];

const ALERTS_VENDOR = [
  { id: 1, type: 'corrigendum', title: 'Corrigendum Published', msg: 'TND-2026-MP-0042 - Technical specifications updated', date: '2026-09-01', impact: 'Update technical bid', action: 'Download corrigendum', unread: true },
  { id: 2, type: 'approval', title: 'Bid Submitted Reminder', msg: 'TND-2026-MP-0055 closes in 3 days', date: '2026-09-05', impact: 'Miss deadline = rejection', action: 'Complete bid submission', unread: true },
  { id: 3, type: 'expiry', title: 'Document Expiry', msg: 'ISO 13485 certificate expires in 22 days', date: '2026-09-24', impact: 'Eligibility at risk', action: 'Upload renewed certificate', unread: true },
  { id: 4, type: 'approval', title: 'LOA Received', msg: 'TND-2026-MP-0038 - Letter of Award issued', date: '2026-08-29', impact: 'Submit PBG within 15 days', action: 'Acknowledge LOA', unread: true }
];

/** Official notices pushed from Government / Resource Manager to Vendor portal — shown as load-time modal */
const GOV_NOTICES = [
  {
    id: 'GN-2026-041',
    priority: 'critical',
    category: 'Corrigendum',
    title: 'Corrigendum — Essential Medicines Rate Contract',
    msg: 'BOQ quantity and technical specs updated for Paracetamol 500mg under TND-2026-MP-0042. Vendors must revise sealed bids before the extended deadline.',
    date: '2026-09-01',
    time: '11:20 IST',
    from: 'Procurement Cell, MP Health',
    ref: 'TND-2026-MP-0042',
    actionLabel: 'Open Tender Discovery',
    actionPage: 'tenders',
    unread: true
  },
  {
    id: 'GN-2026-038',
    priority: 'high',
    category: 'Deadline',
    title: 'Bid Closing Reminder — CT Scanner Procurement',
    msg: 'TND-2026-MP-0055 closes on 05 Sep 2026, 17:00 IST. Incomplete technical or financial bids will be rejected without further notice.',
    date: '2026-09-02',
    time: '09:00 IST',
    from: 'Tender Management Unit',
    ref: 'TND-2026-MP-0055',
    actionLabel: 'Go to Bid Submitted',
    actionPage: 'bids',
    unread: true
  },
  {
    id: 'GN-2026-035',
    priority: 'high',
    category: 'Award',
    title: 'Letter of Award Issued',
    msg: 'LOA issued for Hospital Linen Supply (TND-2026-MP-0038). Acknowledge LOA and submit Performance Bank Guarantee within 15 calendar days.',
    date: '2026-08-29',
    time: '16:45 IST',
    from: 'Contract Award Committee',
    ref: 'LOA-2026-0038',
    actionLabel: 'View Contracts',
    actionPage: 'contracts',
    unread: true
  },
  {
    id: 'GN-2026-029',
    priority: 'medium',
    category: 'Compliance',
    title: 'Certificate Renewal Advisory',
    msg: 'ISO 13485 certificate for MediSupply India Pvt Ltd expires in 22 days. Upload renewed certificate under Registration / KYC to avoid eligibility blocks.',
    date: '2026-08-28',
    time: '10:15 IST',
    from: 'Vendor Registry',
    ref: 'KYC-CERT-13485',
    actionLabel: 'Open Registration',
    actionPage: 'registration',
    unread: false
  }
];

const TENDERS = [
  { id: 'TND-2026-MP-0042', title: 'Essential Medicines Rate Contract', category: 'Drugs', value: '₹12.5 Cr', status: 'Evaluation', bids: 8, deadline: '2026-09-15' },
  { id: 'TND-2026-MP-0055', title: 'CT Scanner Procurement', category: 'Equipment', value: '₹3.2 Cr', status: 'Open', bids: 4, deadline: '2026-09-05' },
  { id: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', category: 'Consumables', value: '₹85 L', status: 'Awarded', bids: 12, deadline: '2026-08-20' },
  { id: 'TND-2026-MP-0061', title: 'HMIS Software Upgrade', category: 'Services', value: '₹1.8 Cr', status: 'Draft', bids: 0, deadline: '2026-10-01' },
  { id: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', category: 'Equipment', value: '₹45 L', status: 'Open', bids: 6, deadline: '2026-09-20' },
  { id: 'TND-2026-MP-0078', title: 'Paracetamol 500mg Bulk', category: 'Drugs', value: '₹2.1 Cr', status: 'Open', bids: 10, deadline: '2026-09-18' },
  { id: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', category: 'Others', value: '₹32 L', status: 'Evaluation', bids: 3, deadline: '2026-09-12' },
  { id: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', category: 'Consumables', value: '₹28 L', status: 'Open', bids: 7, deadline: '2026-09-22' },
  { id: 'TND-2026-MP-0098', title: 'Oncology Drug Supply 2026', category: 'Drugs', value: '₹8.4 Cr', status: 'Awarded', bids: 15, deadline: '2026-08-10' },
  { id: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', category: 'Equipment', value: '₹2.8 Cr', status: 'Awarded', bids: 9, deadline: '2026-07-28' },
  { id: 'TND-2026-MP-0108', title: 'IV Fluid & Saline Supply', category: 'Drugs', value: '₹1.2 Cr', status: 'Open', bids: 11, deadline: '2026-09-25' },
  { id: 'TND-2026-MP-0115', title: 'Pathology Lab Reagents', category: 'Consumables', value: '₹56 L', status: 'Evaluation', bids: 5, deadline: '2026-09-14' },
  { id: 'TND-2026-MP-0120', title: 'Ambulance Vehicle Purchase', category: 'Equipment', value: '₹4.5 Cr', status: 'Draft', bids: 0, deadline: '2026-10-15' },
  { id: 'TND-2026-MP-0126', title: 'Telemedicine Platform', category: 'Services', value: '₹95 L', status: 'Open', bids: 3, deadline: '2026-09-28' },
  { id: 'TND-2026-MP-0133', title: 'Waste Management Services', category: 'Others', value: '₹42 L', status: 'Awarded', bids: 6, deadline: '2026-08-05' },
  { id: 'TND-2026-MP-0140', title: 'Insulin & Diabetic Care Kit', category: 'Drugs', value: '₹3.6 Cr', status: 'Evaluation', bids: 7, deadline: '2026-09-16' },
  { id: 'TND-2026-MP-0147', title: 'Patient Monitoring Systems', category: 'Equipment', value: '₹1.1 Cr', status: 'Open', bids: 8, deadline: '2026-09-30' },
  { id: 'TND-2026-MP-0154', title: 'CSSD Sterilization Supply', category: 'Consumables', value: '₹38 L', status: 'Draft', bids: 0, deadline: '2026-10-08' },
  { id: 'TND-2026-MP-0161', title: 'Hospital Security Services', category: 'Services', value: '₹72 L', status: 'Awarded', bids: 4, deadline: '2026-07-20' },
  { id: 'TND-2026-MP-0168', title: 'Medical Oxygen Plant O&M', category: 'Others', value: '₹1.5 Cr', status: 'Open', bids: 5, deadline: '2026-10-05' }
];

const VENDOR_REGISTRATIONS = [
  { id: 'REG-2026-0891', name: 'Sunrise Pharma Ltd', category: 'Drugs', kyc: 'Verified', documents: 'Complete', submitted: '2026-08-28', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Verified', utr: 'SBIN928471036482' } },
  { id: 'REG-2026-0892', name: 'MedEquip Solutions', category: 'Equipment', kyc: 'Pending', documents: '3/5 uploaded', submitted: '2026-08-30', empanelment: { amount: '₹25,000', mode: 'Offline', status: 'Submitted', proof: 'NEFT-Challan-MedEquip.pdf' } },
  { id: 'REG-2026-0893', name: 'CleanCare Supplies', category: 'Consumables', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-01', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Verified', utr: 'HDFC918273645012' } },
  { id: 'REG-2026-0894', name: 'TechHealth IT', category: 'Services', kyc: 'In Review', documents: '4/6 uploaded', submitted: '2026-09-02', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Submitted', utr: 'ICIC847562019384' } },
  { id: 'REG-2026-0895', name: 'Apex Surgical India', category: 'Equipment', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-02', empanelment: { amount: '₹25,000', mode: 'Offline', status: 'Verified', proof: 'DD-Apex-Empanelment.pdf' } },
  { id: 'REG-2026-0896', name: 'GenericMed Corp', category: 'Drugs', kyc: 'Pending', documents: '2/5 uploaded', submitted: '2026-09-03', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Pending', utr: '—' } },
  { id: 'REG-2026-0897', name: 'LabPro Reagents', category: 'Others', kyc: 'In Review', documents: '3/6 uploaded', submitted: '2026-09-03', empanelment: { amount: '₹25,000', mode: 'Offline', status: 'Submitted', proof: 'Challan-LabPro.jpg' } },
  { id: 'REG-2026-0898', name: 'SafeHands Consumables', category: 'Consumables', kyc: 'Pending', documents: '1/5 uploaded', submitted: '2026-09-04', empanelment: { amount: '₹25,000', mode: 'Offline', status: 'Pending', proof: '—' } },
  { id: 'REG-2026-0899', name: 'CloudCare Systems', category: 'Services', kyc: 'Verified', documents: 'Complete', submitted: '2026-09-04', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Verified', utr: 'AXIS552019384756' } },
  { id: 'REG-2026-0900', name: 'MediTrans Logistics', category: 'Others', kyc: 'Pending', documents: '2/5 uploaded', submitted: '2026-09-05', empanelment: { amount: '₹25,000', mode: 'Online', status: 'Submitted', utr: 'SBIN110293847561' } }
];

const BIDS = [
  { tenderId: 'TND-2026-MP-0055', category: 'Equipment', technical: 'Complete', financial: 'Sealed', emd: 'Pending', deadline: '2026-09-05', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0042', category: 'Drugs', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-15', status: 'Under Evaluation' },
  { tenderId: 'TND-2026-MP-0061', category: 'Services', technical: 'In Progress', financial: 'Sealed', emd: 'Pending', deadline: '2026-10-01', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0078', category: 'Drugs', technical: 'Complete', financial: 'Sealed', emd: 'Paid', deadline: '2026-09-18', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0091', category: 'Consumables', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-22', status: 'Under Evaluation' },
  { tenderId: 'TND-2026-MP-0072', category: 'Equipment', technical: 'Complete', financial: 'Sealed', emd: 'Paid', deadline: '2026-09-20', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0108', category: 'Drugs', technical: 'In Progress', financial: 'Sealed', emd: 'Pending', deadline: '2026-09-25', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0115', category: 'Consumables', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-14', status: 'Under Evaluation' },
  { tenderId: 'TND-2026-MP-0126', category: 'Services', technical: 'Complete', financial: 'Sealed', emd: 'Pending', deadline: '2026-09-28', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0147', category: 'Equipment', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-09-30', status: 'Under Evaluation' },
  { tenderId: 'TND-2026-MP-0168', category: 'Others', technical: 'In Progress', financial: 'Sealed', emd: 'Pending', deadline: '2026-10-05', status: 'Draft' },
  { tenderId: 'TND-2026-MP-0038', category: 'Consumables', technical: 'Submitted', financial: 'Submitted', emd: 'Paid', deadline: '2026-08-20', status: 'Awarded' }
];

const VENDOR_BID_DVDMS_API = {
  meta: {
    source: 'System',
    channel: 'Portal',
    endpoint: '',
    status: 'Synced',
    lastSynced: '08-09-2026 16:42 IST',
    syncedBy: 'Sync Service'
  },
  rows: [
    {
      bidId: 'BID-2026-1042',
      tenderId: 'TND-2026-MP-0042',
      title: 'Essential Medicines Rate Contract',
      category: 'Drugs',
      emdStatus: 'Paid',
      emdAmount: '₹3,20,000',
      deadline: '15-09-2026 17:00 IST',
      techStatus: 'Submitted',
      finStatus: 'Submitted',
      status: 'Under Evaluation',
      submittedOn: '10-09-2026',
      periodDate: '10-09-2026',
      portal: 'Portal',
      biddedItems: [
        'Paracetamol 500mg Tab',
        'Amoxicillin 250mg Cap',
        'IV Normal Saline 500ml',
        'Metformin 500mg Tab',
        'Essential Medicines RC Pack',
        'IV Fluids & Saline Combo'
      ]
    },
    {
      bidId: 'BID-2026-1088',
      tenderId: 'TND-2026-MP-0055',
      title: 'Digital X-Ray & Imaging Equipment',
      category: 'Equipment',
      emdStatus: 'Pending',
      emdAmount: '₹2,50,000',
      deadline: '05-09-2026 17:00 IST',
      techStatus: 'Uploaded',
      finStatus: 'Sealed',
      status: 'Draft',
      submittedOn: '—',
      periodDate: '28-08-2026',
      portal: 'Portal',
      biddedItems: ['Digital X-Ray']
    },
    {
      bidId: 'BID-2026-1115',
      tenderId: 'TND-2026-MP-0091',
      title: 'Disposable Gloves & PPE Supply',
      category: 'Consumables',
      emdStatus: 'Paid',
      emdAmount: '₹1,10,000',
      deadline: '22-09-2026 17:00 IST',
      techStatus: 'Submitted',
      finStatus: 'Submitted',
      status: 'Under Evaluation',
      submittedOn: '12-09-2026',
      periodDate: '12-09-2026',
      portal: 'Portal',
      biddedItems: ['Disposable Gloves', 'Surgical Masks']
    },
    {
      bidId: 'BID-2026-0981',
      tenderId: 'TND-2026-MP-0038',
      title: 'Hospital Linen Supply',
      category: 'Consumables',
      emdStatus: 'Paid',
      emdAmount: '₹85,000',
      deadline: '20-08-2026 17:00 IST',
      techStatus: 'Submitted',
      finStatus: 'Submitted',
      status: 'Awarded',
      submittedOn: '18-08-2026',
      periodDate: '18-08-2026',
      portal: 'Portal',
      biddedItems: ['Hospital Linen', 'Examination Gowns']
    },
    {
      bidId: 'BID-2026-1203',
      tenderId: 'TND-2026-MP-0061',
      title: 'HMIS Software Upgrade',
      category: 'Services',
      emdStatus: 'Pending',
      emdAmount: '₹1,75,000',
      deadline: '01-10-2026 17:00 IST',
      techStatus: 'In Progress',
      finStatus: 'Sealed',
      status: 'Draft',
      submittedOn: '—',
      periodDate: '01-09-2026',
      portal: 'Portal',
      biddedItems: ['HMIS Upgrade']
    }
  ]
};

/** Mock award / LOA feed for Vendor Bid-to-Pay Stage 5 (read-only sync) */
const VENDOR_AWARD_SYNC_API = {
  meta: {
    status: 'Synced',
    lastSynced: '08-09-2026 17:10 IST'
  },
  rows: [
    {
      awardId: 'AWD-2026-0038',
      tenderId: 'TND-2026-MP-0038',
      title: 'Hospital Linen Supply',
      category: 'Consumables',
      loaStatus: 'Issued',
      loaDate: '29-08-2026',
      pbgDue: '13-09-2026',
      value: '₹85 L',
      acknowledgement: 'Pending',
      periodDate: '29-08-2026',
      awardedItems: ['Hospital Linen', 'Examination Gowns']
    },
    {
      awardId: 'AWD-2026-0042',
      tenderId: 'TND-2026-MP-0042',
      title: 'Essential Medicines Rate Contract',
      category: 'Drugs',
      loaStatus: 'Issued',
      loaDate: '02-09-2026',
      pbgDue: '17-09-2026',
      value: '₹12.1 Cr',
      acknowledgement: 'Pending',
      periodDate: '02-09-2026',
      awardedItems: [
        'Paracetamol 500mg Tab',
        'Amoxicillin 250mg Cap',
        'IV Normal Saline 500ml',
        'Metformin 500mg Tab',
        'Essential Medicines RC Pack',
        'IV Fluids & Saline Combo'
      ]
    },
    {
      awardId: 'AWD-2026-0091',
      tenderId: 'TND-2026-MP-0091',
      title: 'Disposable Gloves & PPE Supply',
      category: 'Consumables',
      loaStatus: 'Acknowledged',
      loaDate: '20-08-2026',
      pbgDue: '04-09-2026',
      value: '₹28 L',
      acknowledgement: 'Acknowledged',
      periodDate: '20-08-2026',
      awardedItems: ['Disposable Gloves', 'Surgical Masks']
    },
    {
      awardId: 'AWD-2026-0072',
      tenderId: 'TND-2026-MP-0072',
      title: 'Surgical Instruments Kit',
      category: 'Equipment',
      loaStatus: 'Issued',
      loaDate: '05-09-2026',
      pbgDue: '20-09-2026',
      value: '₹45 L',
      acknowledgement: 'Pending',
      periodDate: '05-09-2026',
      awardedItems: ['Surgical Instruments']
    },
    {
      awardId: 'AWD-2026-0061',
      tenderId: 'TND-2026-MP-0061',
      title: 'HMIS Software Upgrade',
      category: 'Services',
      loaStatus: 'Issued',
      loaDate: '08-09-2026',
      pbgDue: '23-09-2026',
      value: '₹1.8 Cr',
      acknowledgement: 'Pending',
      periodDate: '08-09-2026',
      awardScope: 'Category-level LOA for HMIS / digital health services under the selected tender package.'
    },
    {
      awardId: 'AWD-2026-0110',
      tenderId: 'TND-2026-MP-0110',
      title: 'Medical Oxygen Plant O&M',
      category: 'Others',
      loaStatus: 'Issued',
      loaDate: '01-09-2026',
      pbgDue: '16-09-2026',
      value: '₹1.5 Cr',
      acknowledgement: 'Pending',
      periodDate: '01-09-2026',
      awardScope: 'Category-level LOA covering oxygen plant operations & maintenance under Others.'
    },
    {
      awardId: 'AWD-2025-0198',
      tenderId: 'TND-2025-MP-0198',
      title: 'Essential Medicines Rate Contract 2025',
      category: 'Drugs',
      loaStatus: 'Acknowledged',
      loaDate: '15-04-2025',
      pbgDue: '30-04-2025',
      value: '₹3.35 Cr',
      acknowledgement: 'Acknowledged',
      periodDate: '15-04-2025',
      awardedItems: [
        'Paracetamol 500mg Tab',
        'Amoxicillin 250mg Cap',
        'Insulin 40 IU',
        'Ceftriaxone 1g Inj',
        'Essential Medicines RC Pack'
      ]
    }
  ]
};

const VENDOR_DELIVERY_SYNC_API = {
  meta: {
    status: 'Synced',
    lastSynced: '08-09-2026 18:05 IST'
  },
  rows: [
    {
      deliveryId: 'DEL-2026-0456',
      challan: 'CHL-2026-0456',
      poId: 'PO-2026-0089',
      tenderId: 'TND-2026-MP-0038',
      title: 'Hospital Linen Supply',
      category: 'Consumables',
      items: 'Hospital Linen - Batch 3',
      qty: '2,400 sets',
      amount: '₹4.25 L',
      vehicle: 'MP-04-AB-2190 / LR-88912',
      dispatchDate: '25-08-2026',
      expectedDate: '28-08-2026',
      deliveryDate: '28-08-2026',
      status: 'Delivered',
      grn: 'Accepted',
      coldChain: 'No',
      invoice: 'INV-0892',
      payment: 'Processing',
      periodDate: '28-08-2026',
      remarks: 'Batch 3 against rate contract CNT-2026-0089.'
    },
    {
      deliveryId: 'DEL-2026-0461',
      challan: 'CHL-2026-0461',
      poId: 'PO-2026-0042',
      tenderId: 'TND-2026-MP-0042',
      title: 'Essential Medicines Rate Contract',
      category: 'Drugs',
      items: 'Essential Medicines RC — Lot 1',
      qty: '96 SKUs',
      amount: '₹1.1 Cr',
      vehicle: 'MP-09-CD-4412 / LR-90211',
      dispatchDate: '03-09-2026',
      expectedDate: '05-09-2026',
      deliveryDate: '05-09-2026',
      status: 'Delivered',
      grn: 'Accepted',
      coldChain: 'Yes',
      invoice: 'INV-0910',
      payment: 'Processing',
      periodDate: '05-09-2026',
      remarks: 'First lot under 24-month rate contract. Cold-chain verified.'
    },
    {
      deliveryId: 'DEL-2026-0457',
      challan: 'CHL-2026-0457',
      poId: 'PO-2025-0234',
      tenderId: 'TND-2025-MP-0198',
      title: 'Essential Medicines Rate Contract 2025',
      category: 'Drugs',
      items: 'Essential Medicines Q3',
      qty: '148 SKUs',
      amount: '₹62 L',
      vehicle: 'MP-04-EF-1188 / LR-77102',
      dispatchDate: '08-06-2026',
      expectedDate: '12-06-2026',
      deliveryDate: '12-06-2026',
      status: 'Delivered',
      grn: 'Accepted',
      coldChain: 'Yes',
      invoice: 'INV-0893',
      payment: 'Paid',
      periodDate: '12-06-2026',
      remarks: 'Q3 release fully accepted at CWH Bhopal.'
    },
    {
      deliveryId: 'DEL-2026-0472',
      challan: 'CHL-2026-0472',
      poId: 'PO-2026-0089',
      tenderId: 'TND-2026-MP-0038',
      title: 'Hospital Linen Supply',
      category: 'Consumables',
      items: 'Hospital Linen - Batch 4 (in transit)',
      qty: '1,800 sets',
      amount: '₹3.2 L',
      vehicle: 'MP-04-GH-3301 / LR-91550',
      dispatchDate: '07-09-2026',
      expectedDate: '10-09-2026',
      deliveryDate: '—',
      status: 'In Transit',
      grn: 'Pending',
      coldChain: 'No',
      invoice: '—',
      payment: '—',
      periodDate: '07-09-2026',
      remarks: 'Dispatched; awaiting facility receipt.'
    },
    {
      deliveryId: 'DEL-2025-0388',
      challan: 'CHL-2025-0388',
      poId: 'PO-2025-0142',
      tenderId: 'TND-2025-MP-0142',
      title: 'Patient Monitor AMC',
      category: 'Equipment',
      items: 'Patient Monitor AMC — FY visit',
      qty: '48 units',
      amount: '₹18 L',
      vehicle: 'Service van — Indore',
      dispatchDate: '12-05-2025',
      expectedDate: '15-05-2025',
      deliveryDate: '15-05-2025',
      status: 'Delivered',
      grn: 'Accepted',
      coldChain: 'No',
      invoice: 'INV-0712',
      payment: 'Paid',
      periodDate: '15-05-2025',
      remarks: 'Scheduled AMC completed.'
    }
  ]
};

const CONTRACTS = [
  { id: 'CNT-2026-0089', tenderId: 'TND-2026-MP-0038', title: 'Hospital Linen Supply', vendor: 'MediSupply India Pvt Ltd', category: 'Consumables', value: '₹85 L', pbg: 'Active', pbgAmount: '₹4.25 L', delivery: 'Milestone due in 5 days', status: 'In Progress', date: '01-08-2026', startDate: '01-08-2026', endDate: '31-07-2027', poId: 'PO-2026-0089', division: 'Bhopal', remarks: 'Quarterly replenishment against rate contract.' },
  { id: 'CNT-2025-0234', tenderId: 'TND-2025-MP-0198', title: 'Essential Medicines Rate Contract', vendor: 'MediSupply India Pvt Ltd', category: 'Drugs', value: '₹3.35 Cr', pbg: 'Expiring', pbgAmount: '₹16.75 L', delivery: 'Completed', status: 'Active', date: '15-04-2025', startDate: '15-04-2025', endDate: '14-04-2027', poId: 'PO-2025-0234', division: 'Bhopal', remarks: 'PBG renewal due within 30 days.' },
  { id: 'CNT-2026-0095', tenderId: 'TND-2026-MP-0061', title: 'HMIS Software Upgrade', vendor: 'Digital Health IT', category: 'Services', value: '₹1.8 Cr', pbg: 'Active', pbgAmount: '₹9 L', delivery: 'Go-Live in 30 days', status: 'In Progress', date: '12-07-2026', startDate: '12-07-2026', endDate: '11-07-2027', poId: 'PO-2026-0095', division: 'Bhopal', remarks: 'Phase-1 go-live scheduled.' },
  { id: 'CNT-2026-0042', tenderId: 'TND-2026-MP-0042', title: 'Essential Medicines RC 2026', vendor: 'MediSupply India Pvt Ltd', category: 'Drugs', value: '₹12.1 Cr', pbg: 'Active', pbgAmount: '₹60.5 L', delivery: 'Lot-1 delivered', status: 'Active', date: '02-09-2026', startDate: '02-09-2026', endDate: '01-09-2028', poId: 'PO-2026-0042', division: 'Bhopal', remarks: '24-month rate contract with monthly releases.' },
  { id: 'CNT-2026-0102', tenderId: 'TND-2026-MP-0102', title: 'Digital X-Ray Machines', vendor: 'ImageMed Systems', category: 'Equipment', value: '₹2.8 Cr', pbg: 'Active', pbgAmount: '₹14 L', delivery: 'Installation in progress', status: 'In Progress', date: '25-07-2026', startDate: '25-07-2026', endDate: '24-07-2028', poId: 'PO-2026-0102', division: 'Indore', remarks: 'AERB compliance and site install underway.' },
  { id: 'CNT-2026-0072', tenderId: 'TND-2026-MP-0072', title: 'Surgical Instruments Kit', vendor: 'Apex Surgical India', category: 'Equipment', value: '₹45 L', pbg: 'Pending', pbgAmount: '₹2.25 L', delivery: 'Awaiting PBG', status: 'In Progress', date: '01-09-2026', startDate: '01-09-2026', endDate: '31-08-2027', poId: 'PO-2026-0072', division: 'Gwalior', remarks: 'PO draft held until PBG receipt.' },
  { id: 'CNT-2026-0091', tenderId: 'TND-2026-MP-0091', title: 'Disposable Gloves Supply', vendor: 'SafeHands Consumables', category: 'Consumables', value: '₹28 L', pbg: 'Active', pbgAmount: '₹1.4 L', delivery: 'Partial receipt', status: 'In Progress', date: '05-08-2026', startDate: '05-08-2026', endDate: '04-08-2027', poId: 'PO-2026-0091', division: 'Jabalpur', remarks: 'Balance consignment expected within 7 days.' },
  { id: 'CNT-2026-0161', tenderId: 'TND-2026-MP-0161', title: 'Hospital Security Services', vendor: 'SecureHealth Services', category: 'Services', value: '₹72 L', pbg: 'Active', pbgAmount: '₹3.6 L', delivery: 'Manpower deployed', status: 'Active', date: '01-08-2026', startDate: '01-08-2026', endDate: '31-07-2027', poId: 'PO-2026-0161', division: 'Bhopal', remarks: 'Monthly billing · biometric attendance live.' },
  { id: 'CNT-2026-0133', tenderId: 'TND-2026-MP-0133', title: 'Waste Management Services', vendor: 'GreenMed Waste', category: 'Others', value: '₹42 L', pbg: 'Active', pbgAmount: '₹2.1 L', delivery: 'Service live', status: 'Active', date: '18-08-2026', startDate: '18-08-2026', endDate: '17-08-2027', poId: 'PO-2026-0133', division: 'Indore', remarks: 'PCB authorization verified.' },
  { id: 'CNT-2026-0085', tenderId: 'TND-2026-MP-0085', title: 'Ambulance Fleet Maintenance', vendor: 'MediTrans Logistics', category: 'Others', value: '₹32 L', pbg: 'Expiring', pbgAmount: '₹1.6 L', delivery: 'SLA monitoring', status: 'In Progress', date: '28-08-2026', startDate: '28-08-2026', endDate: '27-08-2027', poId: 'PO-2026-0085', division: 'Rewa', remarks: 'Uptime SLA under review.' },
  { id: 'CNT-2025-0142', tenderId: 'TND-2025-MP-0110', title: 'Patient Monitor AMC', vendor: 'HealthTech Solutions', category: 'Equipment', value: '₹95 L', pbg: 'Active', pbgAmount: '₹4.75 L', delivery: 'AMC visits on schedule', status: 'Active', date: '10-06-2025', startDate: '10-06-2025', endDate: '09-06-2027', poId: 'PO-2025-0142', division: 'Indore', remarks: 'Annual maintenance against installed base.' },
  { id: 'CNT-2026-0115', tenderId: 'TND-2026-MP-0115', title: 'Pathology Lab Reagents', vendor: 'LabPro Reagents', category: 'Consumables', value: '₹56 L', pbg: 'Active', pbgAmount: '₹2.8 L', delivery: 'Next release due', status: 'Active', date: '20-05-2026', startDate: '20-05-2026', endDate: '19-05-2027', poId: 'PO-2026-0115', division: 'Indore', remarks: 'Shelf-life ≥ 75% remaining required.' }
];

/** Contract Management hub — synced lifecycle / T&C / DVDMS / AI overlays (no manual master-data forms) */
const CONTRACT_MGMT_META = {
  sourceNote: 'Contract register is fed from DVDMS, NIC award records and tender templates. Manual re-entry is disabled; proposed AI/ML handles alerts, LD, expiry and scorecards.',
  lastSynced: '08-09-2026 10:15 IST',
  syncChannels: ['DVDMS', 'NIC', 'Eoffice', 'Tender']
};

const CONTRACT_PERFORMANCE_MONITORS = [
  { id: 'qc', label: 'Quality', weight: 20 },
  { id: 'delivery', label: 'Timely Delivery', weight: 25 },
  { id: 'price', label: 'Costing', weight: 10 },
  { id: 'pack', label: 'Packaging & supply', weight: 10 },
  { id: 'comm', label: 'Communication Response', weight: 10 },
  { id: 'blacklist', label: 'Blacklisting', weight: 15 },
  { id: 'market', label: 'Market information (Generic)', weight: 10 }
];

/** Resource Manager — AI/ML replaces manual indent/PR/forecast/PO planning chain */
const RESOURCE_AIML_PIPELINE = [
  { id: 'indents', label: 'Indents collation', source: 'DVDMS', engine: 'AI/ML', status: 'Automated' },
  { id: 'pr', label: 'PR requisitions collate', source: 'DVDMS', engine: 'AI/ML', status: 'Automated' },
  { id: 'forecast', label: 'Demand forecast', source: 'DVDMS · AMC', engine: 'AI/ML', status: 'Running' },
  { id: 'poPlan', label: 'PO planning', source: 'DVDMS', engine: 'AI/ML', status: 'Proposed' },
  { id: 'raisePo', label: 'Raise PO', source: 'DVDMS', engine: 'Workflow', status: 'DVDMS action' },
  { id: 'grn', label: 'GRN', source: 'DVDMS', engine: 'DVDMS', status: 'Synced' },
  { id: 'threshold', label: 'AMC / threshold compute', source: 'DVDMS consumption', engine: 'AI/ML', status: 'Automated' }
];

/** Vendor Management — NIC portal registration façade + DVDMS sync (not a second master form) */
const VENDOR_MGMT_PROFILES = [
  { id: 'VND-MP-000123', nicVendorCode: 'MP-NIC-DRG-88421', name: 'MediSupply India Pvt Ltd', type: 'Supplier', category: 'Drugs', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '01-08-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 92, eligibility: 'Empanelled', marketIntel: 'Strong EDL coverage · MP warehouses' },
  { id: 'VND-MP-000188', nicVendorCode: 'MP-NIC-EQP-55102', name: 'ImageMed Systems', type: 'Supplier', category: 'Equipment', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '12-07-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 88, eligibility: 'Empanelled', marketIntel: 'AERB-ready install base' },
  { id: 'VND-MP-000210', nicVendorCode: 'MP-NIC-LAB-22014', name: 'LabPro Reagents', type: 'Authorised Laboratory', category: 'Consumables', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '20-05-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 85, eligibility: 'QC empanelled', marketIntel: 'NABL partner labs · Indore' },
  { id: 'VND-MP-000245', nicVendorCode: 'MP-NIC-CON-10933', name: 'SafeHands Consumables', type: 'Supplier', category: 'Consumables', nicStatus: 'Registered', dsc: 'Pending renew', empanelmentFee: 'Submitted', renewDue: '05-09-2026', dvdmsSync: 'Partial', kyc: 'Pending', score: 71, eligibility: 'Under review', marketIntel: 'Gloves / PPE — price volatility watch' },
  { id: 'VND-MP-000301', nicVendorCode: 'MP-NIC-SRV-77301', name: 'SecureHealth Services', type: 'Supplier', category: 'Services', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '01-08-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 90, eligibility: 'Empanelled', marketIntel: 'Manpower SLA stable' },
  { id: 'VND-MP-000318', nicVendorCode: 'MP-NIC-OTH-44118', name: 'GreenMed Waste', type: 'Supplier', category: 'Others', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '18-08-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 87, eligibility: 'Empanelled', marketIntel: 'PCB authorization current' },
  { id: 'VND-MP-000340', nicVendorCode: 'MP-NIC-EQP-66220', name: 'Apex Surgical India', type: 'Supplier', category: 'Equipment', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '02-09-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 79, eligibility: 'LOA pending ack', marketIntel: 'BIS kits · Gwalior focus' },
  { id: 'VND-MP-000355', nicVendorCode: 'MP-NIC-OTH-55801', name: 'MediTrans Logistics', type: 'Supplier', category: 'Others', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '28-08-2027', dvdmsSync: 'Synced', kyc: 'Pending', score: 74, eligibility: 'SLA watch', marketIntel: 'Ambulance uptime risk' },
  { id: 'VND-MP-000372', nicVendorCode: 'MP-NIC-LAB-33002', name: 'OncoCare Pharma QC Lab', type: 'Authorised Laboratory', category: 'Drugs', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Paid · Annual', renewDue: '15-10-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 91, eligibility: 'QC empanelled', marketIntel: 'Oncology batch COA turnaround < 72h' },
  { id: 'VND-MP-000401', nicVendorCode: 'MP-NIC-DRG-99012', name: 'Sunrise Pharma Ltd', type: 'Supplier', category: 'Drugs', nicStatus: 'Registered', dsc: 'Active', empanelmentFee: 'Verified', renewDue: '28-08-2027', dvdmsSync: 'Synced', kyc: 'Verified', score: 83, eligibility: 'Eligible — AI shortlist', marketIntel: 'Generic EDL alternate source' }
];

const AI_ELIGIBLE_VENDOR_QUEUE = [
  { id: 'AI-ELIG-01', name: 'Sunrise Pharma Ltd', category: 'Drugs', type: 'Supplier', reason: 'Market intelligence: EDL alternate · GSTIN match · no blacklist', confidence: '94%', action: 'Confirm onboard' },
  { id: 'AI-ELIG-02', name: 'OncoCare Pharma QC Lab', category: 'Drugs', type: 'Authorised Laboratory', reason: 'NABL + cold-chain COA capacity for oncology lots', confidence: '91%', action: 'Confirm QC empanel' },
  { id: 'AI-ELIG-03', name: 'GenericMed Corp', category: 'Drugs', type: 'Supplier', reason: 'Price intelligence below RC band · docs incomplete', confidence: '68%', action: 'Request docs' },
  { id: 'AI-ELIG-04', name: 'CloudCare Systems', category: 'Services', type: 'Supplier', reason: 'HMIS / telemedicine capability match open RFPs', confidence: '86%', action: 'Confirm onboard' }
];

const CLARIFICATIONS = [
  { id: 'CL-0891', tenderId: 'TND-2026-MP-0055', category: 'Equipment', subject: 'Technical spec clarification', status: 'Answered', response: 'View' },
  { id: 'CL-0892', tenderId: 'TND-2026-MP-0042', category: 'Drugs', subject: 'BOQ quantity amendment', status: 'Corrigendum Issued', response: 'View' },
  { id: 'CL-0893', tenderId: 'TND-2026-MP-0061', category: 'Services', subject: 'SLA uptime requirement', status: 'Pending', response: '—' },
  { id: 'CL-0894', tenderId: 'TND-2026-MP-0072', category: 'Equipment', subject: 'Warranty period clarification', status: 'Answered', response: 'View' },
  { id: 'CL-0895', tenderId: 'TND-2026-MP-0078', category: 'Drugs', subject: 'Shelf-life criteria for bulk pack', status: 'Pending', response: '—' },
  { id: 'CL-0896', tenderId: 'TND-2026-MP-0091', category: 'Consumables', subject: 'Delivery lot schedule', status: 'Answered', response: 'View' },
  { id: 'CL-0897', tenderId: 'TND-2026-MP-0108', category: 'Drugs', subject: 'Cold-chain packaging norms', status: 'Corrigendum Issued', response: 'View' },
  { id: 'CL-0898', tenderId: 'TND-2026-MP-0115', category: 'Consumables', subject: 'Kit composition variance', status: 'Pending', response: '—' },
  { id: 'CL-0899', tenderId: 'TND-2026-MP-0126', category: 'Services', subject: 'Data residency clause', status: 'Answered', response: 'View' },
  { id: 'CL-0900', tenderId: 'TND-2026-MP-0147', category: 'Equipment', subject: 'Installation site readiness', status: 'Pending', response: '—' },
  { id: 'CL-0901', tenderId: 'TND-2026-MP-0168', category: 'Others', subject: 'O&M response time SLA', status: 'Answered', response: 'View' },
  { id: 'CL-0902', tenderId: 'TND-2026-MP-0038', category: 'Consumables', subject: 'Fabric GSM tolerance', status: 'Corrigendum Issued', response: 'View' }
];

const DELIVERIES = [
  { id: 'DEL-2026-0456', po: 'PO-2026-0089', category: 'Consumables', items: 'Hospital Linen - Batch 3', grn: 'Accepted', invoice: 'INV-0892', payment: 'Processing', date: '28-08-2026', vendor: 'MediSupply India Pvt Ltd', division: 'Bhopal', dispatchDate: '25-08-2026', qty: '2,400 sets', amount: '₹4.25 L', remarks: 'Batch 3 against rate contract CNT-2026-0089.' },
  { id: 'DEL-2026-0457', po: 'PO-2025-0234', category: 'Drugs', items: 'Essential Medicines Q3', grn: 'Accepted', invoice: 'INV-0893', payment: 'Paid', date: '12-06-2026', vendor: 'MediSupply India Pvt Ltd', division: 'Bhopal', dispatchDate: '08-06-2026', qty: '148 SKUs', amount: '₹62 L', remarks: 'Q3 release fully accepted at CWH Bhopal.' },
  { id: 'DEL-2026-0458', po: 'PO-2026-0095', category: 'Services', items: 'HMIS Module - Phase 1', grn: 'Pending', invoice: '—', payment: '—', date: '01-09-2026', vendor: 'Digital Health IT', division: 'Bhopal', dispatchDate: '01-09-2026', qty: '1 module', amount: '₹45 L', remarks: 'UAT pending before GRN acceptance.' },
  { id: 'DEL-2026-0461', po: 'PO-2026-0042', category: 'Drugs', items: 'Essential Medicines RC — Lot 1', grn: 'Accepted', invoice: 'INV-0910', payment: 'Processing', date: '05-09-2026', vendor: 'MediSupply India Pvt Ltd', division: 'Bhopal', dispatchDate: '03-09-2026', qty: '96 SKUs', amount: '₹1.1 Cr', remarks: 'First lot under 24-month rate contract.' },
  { id: 'DEL-2026-0462', po: 'PO-2026-0102', category: 'Equipment', items: 'Digital X-Ray — Site install kit', grn: 'Pending', invoice: '—', payment: '—', date: '20-08-2026', vendor: 'ImageMed Systems', division: 'Indore', dispatchDate: '18-08-2026', qty: '4 units', amount: '₹2.8 Cr', remarks: 'AERB clearance pending at two sites.' },
  { id: 'DEL-2026-0463', po: 'PO-2026-0091', category: 'Consumables', items: 'Disposable Gloves — Consignment A', grn: 'Accepted', invoice: 'INV-0901', payment: 'Paid', date: '10-08-2026', vendor: 'SafeHands Consumables', division: 'Jabalpur', dispatchDate: '07-08-2026', qty: '50,000 pairs', amount: '₹14 L', remarks: 'Partial receipt; balance due within 7 days.' },
  { id: 'DEL-2026-0464', po: 'PO-2026-0161', category: 'Services', items: 'Security services — Aug billing', grn: 'Accepted', invoice: 'INV-0922', payment: 'Processing', date: '31-08-2026', vendor: 'SecureHealth Services', division: 'Bhopal', dispatchDate: '31-08-2026', qty: '1 month', amount: '₹6 L', remarks: 'Biometric attendance verified.' },
  { id: 'DEL-2026-0465', po: 'PO-2026-0133', category: 'Others', items: 'BMW collection — Aug cycle', grn: 'Accepted', invoice: 'INV-0918', payment: 'Paid', date: '22-08-2026', vendor: 'GreenMed Waste', division: 'Indore', dispatchDate: '22-08-2026', qty: '1 cycle', amount: '₹3.5 L', remarks: 'PCB authorization on file.' },
  { id: 'DEL-2026-0466', po: 'PO-2026-0085', category: 'Others', items: 'Ambulance AMC — Q2 visit', grn: 'Pending', invoice: 'INV-0930', payment: '—', date: '02-09-2026', vendor: 'MediTrans Logistics', division: 'Rewa', dispatchDate: '01-09-2026', qty: '12 vehicles', amount: '₹8 L', remarks: 'Uptime SLA under review before GRN.' },
  { id: 'DEL-2025-0388', po: 'PO-2025-0142', category: 'Equipment', items: 'Patient Monitor AMC — FY visit', grn: 'Accepted', invoice: 'INV-0712', payment: 'Paid', date: '15-05-2025', vendor: 'HealthTech Solutions', division: 'Indore', dispatchDate: '12-05-2025', qty: '48 units', amount: '₹18 L', remarks: 'Scheduled AMC completed.' },
  { id: 'DEL-2026-0468', po: 'PO-2026-0115', category: 'Consumables', items: 'Pathology reagents — May release', grn: 'Accepted', invoice: 'INV-0880', payment: 'Paid', date: '25-05-2026', vendor: 'LabPro Reagents', division: 'Indore', dispatchDate: '22-05-2026', qty: '36 kits', amount: '₹14 L', remarks: 'Shelf-life ≥ 75% verified on receipt.' },
  { id: 'DEL-2026-0470', po: 'PO-2026-0072', category: 'Equipment', items: 'Surgical Instruments Kit — Lot A', grn: 'Pending', invoice: '—', payment: '—', date: '04-09-2026', vendor: 'Apex Surgical India', division: 'Gwalior', dispatchDate: '03-09-2026', qty: '20 kits', amount: '₹22 L', remarks: 'Held pending PBG confirmation on linked PO.' }
];

const TOR_ENTRIES = [
  { id: 'TOR-2026-0042', tenderId: 'TND-2026-MP-0042', category: 'Drugs', coverage: '92%', flags: 2, status: 'Review' },
  { id: 'TOR-2026-0055', tenderId: 'TND-2026-MP-0055', category: 'Equipment', coverage: '100%', flags: 0, status: 'Approved' },
  { id: 'TOR-2026-0061', tenderId: 'TND-2026-MP-0061', category: 'Services', coverage: '78%', flags: 2, status: 'Blocked' },
  { id: 'TOR-2026-0085', tenderId: 'TND-2026-MP-0085', category: 'Others', coverage: '85%', flags: 1, status: 'Review' }
];

const CATEGORY_WEIGHTS = {
  All: 1,
  Drugs: 0.42,
  Equipment: 0.28,
  Services: 0.15,
  Consumables: 0.10,
  Others: 0.05
};

const MASTER_DATA_COUNTS = {
  Drugs: 248,
  Equipment: 156,
  Services: 89,
  Consumables: 312,
  Others: 45
};

const NAV_GOV = [
  { section: 'Overview' },
  { id: 'dashboard', icon: 'fa-chart-line', label: 'Analytics Dashboard', badge: 0 },
  { section: 'Procurement Lifecycle' },
  { id: 'workflow', icon: 'fa-arrows-rotate', label: 'Need Identification to Pay', badge: 0 },
  { id: 'contract-mgmt', icon: 'fa-file-signature', label: 'Contract Management', badge: 0 },
  { id: 'vendor-reg', icon: 'fa-building-user', label: 'Vendor Management', badge: 10 },
  { id: 'sourcing', icon: 'fa-bullseye', label: 'Sourcing & Award', badge: 0 },
  { section: 'Operations' },
  { id: 'work-queue', icon: 'fa-bell', label: 'Alerts & Work Queue', badge: 0 },
  { id: 'sla-desk', icon: 'fa-headset', label: 'SLA Communication', badge: 0 },
  { section: 'Performance' },
  { id: 'vendor-matrix', icon: 'fa-chart-bar', label: 'Vendor Performance Matrix', badge: 0 },
  { id: 'reports', icon: 'fa-file-lines', label: 'Reports & Analytics', badge: 0 },
  { id: 'settings', icon: 'fa-gear', label: 'Settings & Branding', badge: 0 }
];

const NAV_VENDOR = [
  { section: 'Overview' },
  { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard', badge: 0 },
  { section: 'Vendor Lifecycle' },
  { id: 'workflow', icon: 'fa-arrows-rotate', label: 'Bid-to-Pay Lifecycle', badge: 0 },
  { id: 'registration', icon: 'fa-id-card', label: 'Profile & KYC', badge: 0 },
  { id: 'tenders', icon: 'fa-magnifying-glass', label: 'Tender Discovery', badge: 0 },
  { id: 'bids', icon: 'fa-paper-plane', label: 'Bid Submitted', badge: 0 },
  { id: 'clarifications', icon: 'fa-comments', label: 'Clarifications', badge: 0 },
  { id: 'work-queue', icon: 'fa-bell', label: 'Alerts & Work Queue', badge: 0 },
  { section: 'Execution' },
  { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts & POs', badge: 0 },
  { id: 'delivery', icon: 'fa-truck', label: 'Delivery & Invoices', badge: 0 },
  { id: 'sla-desk', icon: 'fa-headset', label: 'SLA Communication', badge: 0 },
  { id: 'performance', icon: 'fa-star', label: 'Performance Score', badge: 0 },
  { id: 'repository', icon: 'fa-box-archive', label: 'Repository', badge: 0 },
  { section: 'Analytics' },
  { id: 'reports', icon: 'fa-file-lines', label: 'My Reports', badge: 0 }
];

/** Vendor Document Repository — seed catalog of lifecycle uploads (merged with live session uploads at runtime) */
const VENDOR_REPOSITORY_DOCS = [
  { id: 'REP-REG-001', name: 'Company Incorporation Certificate', stage: 1, stageName: 'Registration', docType: 'Registration', relatedRef: 'VND-MP-000123', uploadedOn: '01-08-2026', size: '420 KB', status: 'On file', category: 'Drugs', file: 'Incorporation-Certificate.pdf' },
  { id: 'REP-REG-002', name: 'GSTIN Registration Certificate', stage: 1, stageName: 'Registration', docType: 'Registration', relatedRef: '23AABCM1234A1Z5', uploadedOn: '01-08-2026', size: '310 KB', status: 'On file', category: 'Drugs', file: 'GSTIN-Certificate.pdf' },
  { id: 'REP-REG-003', name: 'Empanelment Fee Proof (NEFT)', stage: 1, stageName: 'Registration', docType: 'Payment proof', relatedRef: 'UTR SBIN928471036482', uploadedOn: '01-08-2026', size: '185 KB', status: 'On file', category: 'Drugs', file: 'Empanelment-NEFT-Proof.pdf' },
  { id: 'REP-KYC-001', name: 'Cancelled Cheque — HDFC ****4567', stage: 2, stageName: 'KYC Verification', docType: 'KYC', relatedRef: 'Bank verification', uploadedOn: '03-08-2026', size: '240 KB', status: 'On file', category: 'Drugs', file: 'Cancelled-Cheque.pdf' },
  { id: 'REP-KYC-002', name: 'Drug License DL-MH-2024-1102', stage: 2, stageName: 'KYC Verification', docType: 'License', relatedRef: 'Expires 20-06-2028', uploadedOn: '03-08-2026', size: '560 KB', status: 'On file', category: 'Drugs', file: 'Drug-License.pdf' },
  { id: 'REP-KYC-003', name: 'ISO 13485 Certificate', stage: 2, stageName: 'KYC Verification', docType: 'Certificate', relatedRef: 'Valid until 15-08-2027', uploadedOn: '03-08-2026', size: '480 KB', status: 'On file', category: 'Drugs', file: 'ISO-13485.pdf' },
  { id: 'REP-APR-001', name: 'Vendor Approval Letter', stage: 3, stageName: 'Vendor Approval', docType: 'Approval', relatedRef: 'VND-MP-000123', uploadedOn: '10-08-2026', size: '290 KB', status: 'On file', category: 'Drugs', file: 'Vendor-Approval-Letter.pdf' },
  { id: 'REP-BID-001', name: 'Technical Bid Pack — TND-2026-MP-0038', stage: 4, stageName: 'Bid Submitted', docType: 'Technical bid', relatedRef: 'TND-2026-MP-0038', uploadedOn: '18-08-2026', size: '2.1 MB', status: 'Submitted', category: 'Consumables', file: 'Tech-Bid-TND-0038.pdf' },
  { id: 'REP-BID-002', name: 'Financial Bid Pack — TND-2026-MP-0038', stage: 4, stageName: 'Bid Submitted', docType: 'Financial bid', relatedRef: 'TND-2026-MP-0038', uploadedOn: '18-08-2026', size: '890 KB', status: 'Submitted', category: 'Consumables', file: 'Fin-Bid-TND-0038.pdf' },
  { id: 'REP-BID-003', name: 'EMD Payment Advice', stage: 4, stageName: 'Bid Submitted', docType: 'EMD', relatedRef: '₹3,20,000', uploadedOn: '18-08-2026', size: '210 KB', status: 'Submitted', category: 'Consumables', file: 'EMD-Payment-Advice.pdf' },
  { id: 'REP-AWD-001', name: 'LOA Acknowledgement Copy', stage: 5, stageName: 'Award Notification', docType: 'LOA', relatedRef: 'TND-2026-MP-0038', uploadedOn: '29-08-2026', size: '175 KB', status: 'Acknowledged', category: 'Consumables', file: 'LOA-Ack-0038.pdf' },
  { id: 'REP-CNT-001', name: 'Performance Bank Guarantee (PBG)', stage: 6, stageName: 'Contract Execution', docType: 'PBG', relatedRef: 'CNT-2026-0089', uploadedOn: '02-09-2026', size: '640 KB', status: 'Submitted', category: 'Consumables', file: 'PBG-CNT-0089.pdf' },
  { id: 'REP-CNT-002', name: 'Signed Contract Agreement', stage: 6, stageName: 'Contract Execution', docType: 'Contract', relatedRef: 'CNT-2026-0089', uploadedOn: '02-09-2026', size: '1.4 MB', status: 'Signed', category: 'Consumables', file: 'Signed-Contract-0089.pdf' },
  { id: 'REP-DEL-001', name: 'Delivery Challan / Dispatch Note', stage: 7, stageName: 'Delivery', docType: 'Delivery', relatedRef: 'DC-2026-0089', uploadedOn: '05-09-2026', size: '380 KB', status: 'Uploaded', category: 'Consumables', file: 'Delivery-Challan-0089.pdf' },
  { id: 'REP-INV-001', name: 'Invoice with GRN Proof', stage: 8, stageName: 'Invoice Submission', docType: 'Invoice', relatedRef: 'INV-2026-0089', uploadedOn: '06-09-2026', size: '520 KB', status: 'Submitted', category: 'Consumables', file: 'Invoice-GRN-0089.pdf' },
  { id: 'REP-PAY-001', name: 'Payment Advice / Receipt', stage: 9, stageName: 'Payment Tracking', docType: 'Payment', relatedRef: 'PAY-2026-0089', uploadedOn: '07-09-2026', size: '195 KB', status: 'On file', category: 'Consumables', file: 'Payment-Advice-0089.pdf' },
  { id: 'REP-REN-001', name: 'Renewal Supporting Note — CNT-2025-0234', stage: 10, stageName: 'Renewal', docType: 'Renewal', relatedRef: 'CNT-2025-0234', uploadedOn: '15-08-2026', size: '260 KB', status: 'On file', category: 'Drugs', file: 'Renewal-Support-0234.pdf' }
];

/** Vendor Alerts & Work Queue — severity-grouped actionable items */
const VENDOR_WORK_QUEUE = [
  {
    id: 'WQ-001',
    category: 'sla',
    severity: 'high',
    unread: true,
    title: 'Response Time SLA breach needs disposition',
    detail: 'CNT-2026-0089 — Owner: Contract Manager — Cure ends 13-09-2026',
    timeline: 'Today',
    owner: 'Contract Manager',
    ref: 'CNT-2026-0089',
    actionPage: 'sla-desk'
  },
  {
    id: 'WQ-002',
    category: 'payments',
    severity: 'high',
    unread: true,
    title: 'Invoice INV-0892 is awaiting finance verification',
    detail: '₹4,25,000 — Owner: GM Finance — Delivery proof attached',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'INV-0892',
    actionPage: 'delivery'
  },
  {
    id: 'WQ-003',
    category: 'milestones',
    severity: 'medium',
    unread: true,
    title: 'Contract CNT-2025-0234 PBG renewal decision is due',
    detail: 'Vendor: MediSupply India — PBG status: Expiring',
    timeline: '30 days',
    owner: 'Contract Manager',
    ref: 'CNT-2025-0234',
    actionPage: 'contracts'
  },
  {
    id: 'WQ-004',
    category: 'milestones',
    severity: 'medium',
    unread: true,
    title: 'Bid deadline approaching for CT Scanner Procurement',
    detail: 'TND-2026-MP-0055 closes 05-09-2026 17:00 IST',
    timeline: '2 days',
    owner: 'Vendor',
    ref: 'TND-2026-MP-0055',
    actionPage: 'bids'
  },
  {
    id: 'WQ-005',
    category: 'system',
    severity: 'info',
    unread: true,
    title: 'ISO 13485 certificate uploaded — awaiting verification',
    detail: 'Uploaded by MediSupply India — Version 1 — Vendor Registry',
    timeline: '2 days',
    owner: 'Vendor Registry',
    ref: 'KYC-CERT-13485',
    actionPage: 'registration'
  },
  {
    id: 'WQ-006',
    category: 'sla',
    severity: 'medium',
    unread: false,
    title: 'Delivery milestone SLA — linen batch 3 dispatch window',
    detail: 'CNT-2026-0089 — Owner: Stores Officer — Expected within contract schedule',
    timeline: '5 days',
    owner: 'Stores Officer',
    ref: 'CNT-2026-0089',
    actionPage: 'sla-desk'
  },
  {
    id: 'WQ-007',
    category: 'payments',
    severity: 'info',
    unread: false,
    title: 'Payment advice generated for INV-0893',
    detail: 'Essential Medicines Q3 — Status: Paid — HDFC ****4567',
    timeline: '7 days',
    owner: 'GM Finance',
    ref: 'INV-0893',
    actionPage: 'delivery'
  },
  {
    id: 'WQ-008',
    category: 'system',
    severity: 'info',
    unread: false,
    title: 'Corrigendum published for Essential Medicines Rate Contract',
    detail: 'TND-2026-MP-0042 — Technical specs updated — Review before evaluation close',
    timeline: 'Read',
    owner: 'Procurement Cell',
    ref: 'TND-2026-MP-0042',
    actionPage: 'tenders'
  }
];

/** Resource Manager — Alerts & Work Queue (aligned with Analytics action queue) */
const GOV_WORK_QUEUE = [
  {
    id: 'GWQ-001',
    category: 'sla',
    severity: 'high',
    unread: true,
    title: 'Vendor SLA breach — response overdue',
    detail: 'MediSupply India · CNT-2026-0089 · 48-hour response window exceeded',
    timeline: 'Today',
    owner: 'Contract Manager',
    ref: 'SLA-2026-014',
    actionPage: 'sla-desk'
  },
  {
    id: 'GWQ-002',
    category: 'approvals',
    severity: 'high',
    unread: true,
    title: 'Financial sanction pending — Oncology Drug Top-up',
    detail: 'PR-2026-1220 · Drugs · ₹2.8 Cr · Owner: GM Finance · 6 days',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'PR-2026-1220',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-003',
    category: 'payments',
    severity: 'high',
    unread: true,
    title: 'Payment delay — PharmaCare invoice overdue',
    detail: 'INV-0901 · ₹48.0 L · 8 days overdue · GRN batch discrepancy',
    timeline: 'Today',
    owner: 'GM Finance',
    ref: 'INV-0901',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-004',
    category: 'tenders',
    severity: 'medium',
    unread: true,
    title: 'Open tender evaluation due — CT Scanner',
    detail: 'TND-2026-MP-0055 · Equipment · 4 bids · Deadline 05-09-2026',
    timeline: '2 days',
    owner: 'Technical Committee',
    ref: 'TND-2026-MP-0055',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-005',
    category: 'vendors',
    severity: 'medium',
    unread: true,
    title: 'Vendor KYC pending review',
    detail: 'MedEquip Solutions · Equipment · 3/5 documents uploaded',
    timeline: '2 days',
    owner: 'Vendor Registry',
    ref: 'REG-2026-0892',
    actionPage: 'vendor-reg'
  },
  {
    id: 'GWQ-006',
    category: 'approvals',
    severity: 'medium',
    unread: false,
    title: 'Administrative approval — CT Scanner Replacement',
    detail: 'PR-2026-1190 · Equipment · ₹3.2 Cr · 5 days in queue',
    timeline: '5 days',
    owner: 'Director Procurement',
    ref: 'PR-2026-1190',
    actionPage: 'sourcing'
  },
  {
    id: 'GWQ-007',
    category: 'sla',
    severity: 'medium',
    unread: false,
    title: 'Vendor escalation — invoice verification delay',
    detail: 'SLA-2026-011 · MediSupply India · INV-0892 · In progress',
    timeline: '3 days',
    owner: 'GM Finance',
    ref: 'SLA-2026-011',
    actionPage: 'sla-desk'
  },
  {
    id: 'GWQ-008',
    category: 'tenders',
    severity: 'info',
    unread: false,
    title: 'Corrigendum issued — Essential Medicines RC',
    detail: 'TND-2026-MP-0042 · Drugs · BOQ amendment published',
    timeline: 'Read',
    owner: 'Procurement Cell',
    ref: 'TND-2026-MP-0042',
    actionPage: 'sourcing'
  }
];

/** Internal gov response chain for SLA desk (vendor-facing) */
const GOV_SLA_HIERARCHY = [
  { level: 1, role: 'Stores Officer', org: 'Receiving Facility', sla: 'Acknowledge vendor delivery queries within 24 hrs', contact: 'stores.bhopal@mphp.gov.in' },
  { level: 2, role: 'Contract Manager', org: 'Procurement Cell', sla: 'Respond to vendor SLA threads within 5 working days', contact: 'contracts@mphp.gov.in' },
  { level: 3, role: 'GM Finance', org: 'Finance Wing', sla: 'Clear invoice / payment escalations within 7 working days', contact: 'finance.gm@mphp.gov.in' },
  { level: 4, role: 'Director (Procurement)', org: 'DoPHFW, GoMP', sla: 'Critical vendor escalations within 10 working days', contact: 'dir.proc@mphp.gov.in' }
];

/** SLA hierarchy — vendor ↔ government escalation chain communication */
const SLA_HIERARCHY = [
  { level: 1, role: 'Stores Officer', org: 'Receiving Facility', sla: 'Acknowledge delivery queries within 24 hrs', contact: 'stores.bhopal@mphp.gov.in' },
  { level: 2, role: 'Contract Manager', org: 'MP Health Procurement', sla: 'Resolve contract/SLA disputes within 5 working days', contact: 'contracts@mphp.gov.in' },
  { level: 3, role: 'GM Finance', org: 'Finance Wing', sla: 'Payment / invoice escalations within 7 working days', contact: 'finance.gm@mphp.gov.in' },
  { level: 4, role: 'Director (Procurement)', org: 'DoPHFW, GoMP', sla: 'Critical escalations within 10 working days', contact: 'dir.proc@mphp.gov.in' }
];

const SLA_THREADS = [
  {
    id: 'SLA-2026-014',
    subject: 'Response Time SLA breach — CNT-2026-0089',
    contractId: 'CNT-2026-0089',
    level: 2,
    status: 'Open',
    priority: 'High',
    lastUpdate: '03-09-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '02-09-2026 14:20', text: 'We raised a dispatch clarification on 28-08-2026. No response received within the 48-hour SLA. Requesting Contract Manager intervention.' },
      { from: 'gov', name: 'Rohit Sharma', role: 'Contract Manager', time: '02-09-2026 17:05', text: 'Acknowledged. Stores Officer has been notified. Please share LR copy and expected delivery date for cure plan.' },
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '03-09-2026 09:40', text: 'LR-88912 attached via Delivery stage. Expected delivery 06-09-2026. Kindly confirm SLA cure clock pause.' }
    ]
  },
  {
    id: 'SLA-2026-011',
    subject: 'Invoice verification delay — INV-0892',
    contractId: 'CNT-2026-0089',
    level: 3,
    status: 'In Progress',
    priority: 'Medium',
    lastUpdate: '01-09-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '30-08-2026 11:10', text: 'Invoice INV-0892 submitted with GRN reference. Payment status still under verification beyond stated timeline.' },
      { from: 'gov', name: 'Ananya Gupta', role: 'GM Finance', time: '01-09-2026 16:30', text: 'Three-way match in progress. Finance will update within 2 working days.' }
    ]
  },
  {
    id: 'SLA-2026-008',
    subject: 'PBG acknowledgement pending — CNT-2025-0234',
    contractId: 'CNT-2025-0234',
    level: 2,
    status: 'Resolved',
    priority: 'Low',
    lastUpdate: '25-08-2026',
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: '20-08-2026 10:00', text: 'Renewed PBG uploaded. Request acknowledgement to avoid contract compliance flag.' },
      { from: 'gov', name: 'Rohit Sharma', role: 'Contract Manager', time: '25-08-2026 12:15', text: 'PBG verified via SFMS. Ticket closed. Thank you.' }
    ]
  }
];

const PERF_METRICS = [
  {
    key: 'testingLabs',
    label: 'Quality',
    weight: 25,
    icon: 'fa-award',
    color: '#003D5D',
    scoring: 'higherBetter',
    logic: 'Higher quality → more points'
  },
  {
    key: 'timelyDelivery',
    label: 'Timely Delivery',
    weight: 25,
    icon: 'fa-truck-fast',
    color: '#00897b',
    scoring: 'lowerBetter',
    logic: 'Faster delivery (less time) → more points'
  },
  {
    key: 'pricing',
    label: 'Costing',
    weight: 10,
    icon: 'fa-indian-rupee-sign',
    color: '#f57c00',
    scoring: 'inverse',
    logic: 'Higher cost → fewer points'
  },
  {
    key: 'packaging',
    label: 'Packaging & supply',
    weight: 10,
    icon: 'fa-box',
    color: '#6d4c41',
    scoring: 'nearBenchmark',
    logic: 'Closer to benchmark → more points'
  },
  {
    key: 'communication',
    label: 'Communication Response',
    weight: 15,
    icon: 'fa-comments',
    color: '#1565c0',
    scoring: 'lowerBetter',
    logic: 'Faster response (less time) → more points'
  },
  {
    key: 'blacklisting',
    label: 'Blacklisting',
    weight: 15,
    icon: 'fa-ban',
    color: '#c62828',
    scoring: 'lowerBetter',
    logic: 'Lower blacklisting risk → more points'
  }
];

const CHART_DATA = {
  spend: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [98, 112, 125, 138, 142, 155, 168, 185, 198, 215] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [48, 52, 58, 57] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [16, 18, 14, 19, 17, 15, 18, 20, 16, 14, 17, 19] }
  },
  procurement: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [62, 71, 78, 85, 90, 96, 102, 112, 124, 134] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [28, 32, 38, 36] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [9, 11, 8, 12, 10, 9, 11, 13, 10, 8, 10, 12] }
  },
  vendorPerf: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [72, 74, 76, 78, 79, 81, 82, 84, 86, 88] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [85, 87, 88, 90] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [86, 87, 88, 89, 88, 90, 89, 91, 90, 88, 89, 92] }
  },
  savings: {
    year: { labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'], data: [6, 8, 9, 11, 12, 14, 15, 17, 19, 22] },
    quarter: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], data: [5, 6, 5.5, 5.5] },
    month: { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], data: [1.8, 1.6, 1.7, 1.9, 1.8, 1.7, 1.9, 2.0, 1.8, 1.6, 1.8, 2.1] }
  },
  categorySpend: {
    labels: ['Drugs', 'Equipment', 'Services', 'Consumables', 'Others'],
    data: [42, 28, 15, 10, 5],
    unit: '%',
    description: 'Share of total procurement spend by category'
  },
  /** Item-wise comparison mock (category items) */
  itemCompare: {
    labels: ['Paracetamol 500mg', 'CT Scanner', 'Hospital Linen', 'HMIS Module', 'IV Fluids'],
    testingLabs: [92, 88, 85, 90, 87],
    timelyDelivery: [86, 78, 91, 84, 80],
    pricing: [81, 75, 88, 79, 83]
  },
  /** Tender pipeline progress — processed / pending / delayed */
  tenderProgress: {
    year: {
      labels: ['FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21', 'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26'],
      processed: [88, 95, 102, 108, 115, 122, 128, 135, 142, 148],
      pending: [24, 22, 20, 19, 18, 17, 16, 15, 14, 12],
      delayed: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5]
    },
    quarter: {
      labels: ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'],
      processed: [32, 36, 39, 41],
      pending: [10, 9, 8, 7],
      delayed: [5, 4, 4, 3]
    },
    month: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      processed: [10, 11, 11, 12, 12, 12, 13, 13, 14, 13, 14, 15],
      pending: [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1],
      delayed: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    }
  }
};

const ANALYTICS_QUARTER_OPTIONS = [
  { id: 'Q1', label: 'Q1', range: 'Jan–Mar' },
  { id: 'Q2', label: 'Q2', range: 'Apr–Jun' },
  { id: 'Q3', label: 'Q3', range: 'Jul–Sep' },
  { id: 'Q4', label: 'Q4', range: 'Oct–Dec' }
];

const ANALYTICS_MONTH_OPTIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ANALYTICS_FY_OPTIONS = [
  'all',
  'FY16-17', 'FY17-18', 'FY18-19', 'FY19-20', 'FY20-21',
  'FY21-22', 'FY22-23', 'FY23-24', 'FY24-25', 'FY25-26', 'FY26-27'
];

const SCORE_WEIGHTS = [
  { label: 'Quality', weight: 25 },
  { label: 'Timely Delivery', weight: 25 },
  { label: 'Costing', weight: 10 },
  { label: 'Packaging & supply', weight: 10 },
  { label: 'Communication Response', weight: 15 },
  { label: 'Blacklisting', weight: 15 }
];

/** Item / drug types by category — used in analytics drill-downs */
const CATEGORY_ITEM_TYPES = {
  Drugs: [
    { name: 'Paracetamol 500mg Tab', type: 'Analgesic', code: 'DRG-PARA-500', unit: '10×10 blister', tenders: 2, spend: '₹2.1 Cr', facilities: 48 },
    { name: 'Amoxicillin 250mg Cap', type: 'Antibiotic', code: 'DRG-AMOX-250', unit: 'Strip of 10', tenders: 1, spend: '₹1.4 Cr', facilities: 40 },
    { name: 'IV Normal Saline 500ml', type: 'Infusion', code: 'DRG-NS-500', unit: 'Bottle', tenders: 1, spend: '₹1.2 Cr', facilities: 62 },
    { name: 'ORS Sachets', type: 'ORS', code: 'DRG-ORS-20', unit: 'Box of 50', tenders: 1, spend: '₹42 L', facilities: 55 },
    { name: 'Metformin 500mg Tab', type: 'Chronic Care', code: 'DRG-MET-500', unit: 'Strip of 10', tenders: 1, spend: '₹95 L', facilities: 38 },
    { name: 'Insulin 40 IU', type: 'Chronic Care', code: 'DRG-INS-40', unit: 'Vial', tenders: 1, spend: '₹3.6 Cr', facilities: 35 },
    { name: 'Ceftriaxone 1g Inj', type: 'Antibiotic', code: 'DRG-CEF-1G', unit: 'Vial', tenders: 1, spend: '₹1.1 Cr', facilities: 44 },
    { name: 'Oncology Drug Pack', type: 'Oncology', code: 'DRG-ONCO-PK', unit: 'Kit', tenders: 1, spend: '₹8.4 Cr', facilities: 12 },
    { name: 'Essential Medicines RC Pack', type: 'Formulary', code: 'DRG-EMRC-01', unit: 'Assorted', tenders: 1, spend: '₹12.5 Cr', facilities: 90 },
    { name: 'IV Fluids & Saline Combo', type: 'Infusion', code: 'DRG-IVF-COM', unit: 'Carton', tenders: 1, spend: '₹1.8 Cr', facilities: 50 }
  ],
  Equipment: [
    { name: 'CT Scanner', type: 'Imaging', code: 'EQP-CT-01', unit: 'Unit', tenders: 1, spend: '₹3.2 Cr', facilities: 4 },
    { name: 'Digital X-Ray', type: 'Imaging', code: 'EQP-DXR-01', unit: 'Unit', tenders: 1, spend: '₹2.8 Cr', facilities: 8 },
    { name: 'Patient Monitors', type: 'Critical Care', code: 'EQP-PM-01', unit: 'Unit', tenders: 1, spend: '₹1.1 Cr', facilities: 22 },
    { name: 'Surgical Instruments', type: 'OT', code: 'EQP-SI-01', unit: 'Kit', tenders: 1, spend: '₹45 L', facilities: 18 }
  ],
  Services: [
    { name: 'HMIS Upgrade', type: 'IT', code: 'SRV-HMIS-01', unit: 'Lot', tenders: 1, spend: '₹1.8 Cr', facilities: 51 },
    { name: 'Telemedicine Platform', type: 'Digital Health', code: 'SRV-TM-01', unit: 'Lot', tenders: 1, spend: '₹95 L', facilities: 30 },
    { name: 'Hospital Security', type: 'Facility', code: 'SRV-SEC-01', unit: 'Month', tenders: 1, spend: '₹72 L', facilities: 14 }
  ],
  Consumables: [
    { name: 'Hospital Linen', type: 'Textile', code: 'CON-LIN-01', unit: 'Set', tenders: 1, spend: '₹85 L', facilities: 40 },
    { name: 'Disposable Gloves', type: 'PPE', code: 'CON-GLV-01', unit: 'Box', tenders: 1, spend: '₹28 L', facilities: 75 },
    { name: 'Pathology Reagents', type: 'Lab', code: 'CON-PRG-01', unit: 'Kit', tenders: 1, spend: '₹56 L', facilities: 20 },
    { name: 'Surgical Masks', type: 'PPE', code: 'CON-MSK-01', unit: 'Box of 100', tenders: 1, spend: '₹18 L', facilities: 60 },
    { name: 'Examination Gowns', type: 'PPE', code: 'CON-GWN-01', unit: 'Pack', tenders: 1, spend: '₹22 L', facilities: 35 }
  ],
  Others: [
    { name: 'Ambulance Fleet O&M', type: 'Transport', code: 'OTH-AMB-01', unit: 'Vehicle / year', tenders: 1, spend: '₹32 L', facilities: 16 },
    { name: 'Medical Oxygen Plant', type: 'Infrastructure', code: 'OTH-OXY-01', unit: 'Plant', tenders: 1, spend: '₹1.5 Cr', facilities: 6 },
    { name: 'Waste Management', type: 'Facility', code: 'OTH-WST-01', unit: 'Month', tenders: 1, spend: '₹42 L', facilities: 25 }
  ]
};

const PENDING_APPROVALS = [
  { id: 'PR-2026-1182', title: 'Essential Medicines Indent — Bhopal', category: 'Drugs', stage: 'Financial Sanction', amount: '₹4.2 Cr', age: '3 days', owner: 'GM Finance' },
  { id: 'PR-2026-1190', title: 'CT Scanner Replacement', category: 'Equipment', stage: 'Administrative Approval', amount: '₹3.2 Cr', age: '5 days', owner: 'Director Procurement' },
  { id: 'PR-2026-1194', title: 'IV Fluids Bulk Indent', category: 'Drugs', stage: 'Budget Head Check', amount: '₹1.1 Cr', age: '1 day', owner: 'Stores Officer' },
  { id: 'PR-2026-1201', title: 'HMIS Phase-2 Budget', category: 'Services', stage: 'Financial Sanction', amount: '₹95 L', age: '7 days', owner: 'GM Finance' },
  { id: 'PR-2026-1208', title: 'PPE Consumables Q3', category: 'Consumables', stage: 'CMO Approval', amount: '₹28 L', age: '2 days', owner: 'CMO Indore' },
  { id: 'PR-2026-1215', title: 'Oxygen Plant O&M Renewal', category: 'Others', stage: 'Contract Review', amount: '₹1.5 Cr', age: '4 days', owner: 'Legal Cell' },
  { id: 'PR-2026-1220', title: 'Oncology Drug Top-up', category: 'Drugs', stage: 'Financial Sanction', amount: '₹2.8 Cr', age: '6 days', owner: 'GM Finance' },
  { id: 'PR-2026-1224', title: 'Patient Monitor Cluster', category: 'Equipment', stage: 'Technical Vetting', amount: '₹1.1 Cr', age: '2 days', owner: 'Biomedical Engg' }
];

const PAYMENT_DELAYS = [
  { id: 'INV-0892', vendor: 'MediSupply India', category: 'Consumables', amount: '₹12.4 L', daysOverdue: 12, reason: 'Three-way match pending', contractId: 'CNT-2026-0089' },
  { id: 'INV-0901', vendor: 'PharmaCare Distributors', category: 'Drugs', amount: '₹48.0 L', daysOverdue: 8, reason: 'GRN batch discrepancy', contractId: 'CNT-2025-0234' },
  { id: 'INV-0910', vendor: 'MedEquip Solutions', category: 'Equipment', amount: '₹6.5 L', daysOverdue: 5, reason: 'PBG verification hold', contractId: 'CNT-2026-0095' },
  { id: 'INV-0918', vendor: 'CleanCare Supplies', category: 'Consumables', amount: '₹3.2 L', daysOverdue: 15, reason: 'Invoice vs PO mismatch', contractId: 'CNT-2026-0089' },
  { id: 'INV-0925', vendor: 'GenericMed Corp', category: 'Drugs', amount: '₹22.1 L', daysOverdue: 3, reason: 'Finance queue', contractId: 'CNT-2025-0234' },
  { id: 'INV-0930', vendor: 'TechHealth IT', category: 'Services', amount: '₹9.8 L', daysOverdue: 9, reason: 'Milestone acceptance pending', contractId: 'CNT-2026-0095' }
];

const DISTRICT_SPEND = [
  { district: 'Bhopal', facility: 'Gandhi Medical College', drugs: 18.2, equipment: 9.4, services: 4.1, consumables: 3.2, others: 1.5 },
  { district: 'Indore', facility: 'M.Y. Hospital', drugs: 16.8, equipment: 11.2, services: 3.8, consumables: 2.9, others: 1.2 },
  { district: 'Jabalpur', facility: 'NSCB Medical College', drugs: 12.4, equipment: 7.6, services: 2.9, consumables: 2.1, others: 0.9 },
  { district: 'Gwalior', facility: 'GR Medical College', drugs: 11.1, equipment: 6.8, services: 2.5, consumables: 1.8, others: 0.8 },
  { district: 'Rewa', facility: 'Sanjay Gandhi Hospital', drugs: 8.6, equipment: 5.2, services: 2.1, consumables: 1.5, others: 0.6 }
];

/**
 * Stage SLA defaults (Madhya Pradesh procurement prototype).
 * warningPct = last N% of SLA window → amber; daysOpen > slaDays → red/danger.
 */
const SLA_STAGE_DEFAULTS = {
  1:  { slaDays: 10, warningPct: 20, owners: 'Store Officer · Resource Manager', actionHint: 'Close critical stock gaps or escalate redistribution' },
  2:  { slaDays: 10, warningPct: 20, owners: 'Central Stores · Resource Manager', actionHint: 'Complete stock verification / transfer decision' },
  3:  { slaDays: 30, warningPct: 20, owners: 'Store Manager · CMO · Resource Manager', actionHint: 'Approve or action pending indent' },
  4:  { slaDays: 50, warningPct: 20, owners: 'Stock Manager · Division Procurement', actionHint: 'Clear consolidation / duplicate check' },
  5:  { slaDays: 21, warningPct: 20, owners: 'Finance · CMO Office · Resource Manager', actionHint: 'Complete PR & budget concurrence' },
  6:  { slaDays: 21, warningPct: 20, owners: 'Procurement Cell · Division checkers', actionHint: 'Complete checker consensus / publish NIT' },
  7:  { slaDays: 21, warningPct: 20, owners: 'Evaluation Committee · Procurement', actionHint: 'Complete bid evaluation sheet' },
  8:  { slaDays: 15, warningPct: 20, owners: 'Legal · Finance · Competent Authority', actionHint: 'Issue NOA / sign agreement' },
  9:  { slaDays: 15, warningPct: 20, owners: 'Procurement Cell · Vendor liaison', actionHint: 'Collect PBG / activate award' },
  10: { slaDays: 10, warningPct: 20, owners: 'Purchase Cell · Stores', actionHint: 'Issue PO / lock delivery schedule' },
  11: { slaDays: 10, warningPct: 20, owners: 'Store Officer · QA Cell', actionHint: 'Complete GRN / inspection' },
  12: { slaDays: 10, warningPct: 20, owners: 'Accounts · Stores', actionHint: 'Complete three-way invoice match' },
  13: { slaDays: 21, warningPct: 20, owners: 'Finance · Treasury liaison', actionHint: 'Release payment within contract terms' },
  14: { slaDays: 30, warningPct: 20, owners: 'Resource Manager · Contracts Cell', actionHint: 'Finalize vendor / rate-contract renewal' }
};

const SLA_NOTIFY_DEFAULTS = {
  email: true,
  whatsapp: true,
  nearExpiryDays: 30,
  renewalWarnDays: 45
};

/** Near-expiry / renewal watch list (checked against APP_TODAY) */
const SLA_EXPIRY_WATCH = [
  { id: 'EXP-LIC-0789', type: 'expiry', title: 'Wholesale Drug License', entity: 'VND-MP-000789 · PharmaCare Distributors', expiryDate: '18-09-2026', owners: 'Vendor KYC · Resource Manager', impact: 'Cannot participate in drug tenders' },
  { id: 'EXP-PBG-0234', type: 'expiry', title: 'Performance Bank Guarantee', entity: 'CNT-2025-0234', expiryDate: '20-09-2026', owners: 'Contracts Cell · Finance', impact: 'Contract compliance risk' },
  { id: 'EXP-ISO-13485', type: 'expiry', title: 'ISO 13485 Certificate', entity: 'VND-MP-000456 · HealthTech Solutions', expiryDate: '25-09-2026', owners: 'Vendor KYC', impact: 'Equipment tender eligibility at risk' },
  { id: 'REN-WIN-0021', type: 'renewal', title: 'Oncology rate-contract renewal window', entity: 'REN-2026-0021 · PharmaCare Distributors', expiryDate: '30-09-2026', owners: 'Resource Manager · Contracts Cell', impact: 'Tender renewal (Stage 14) must be finalized' },
  { id: 'REN-WIN-0012', type: 'renewal', title: 'Essential medicines RC renewal', entity: 'REN-2026-0012 · MediSupply India', expiryDate: '15-10-2026', owners: 'Resource Manager · Drugs Cell', impact: 'Fresh renewal window approaching' }
];
