/* Chart.js configurations for MP Health Procurement */

let charts = {};

const chartColors = {
  primary: '#003D5D',
  accent: '#00bfa5',
  blue: '#0A5578',
  green: '#2e7d32',
  orange: '#f57c00',
  red: '#d32f2f',
  purple: '#7b1fa2',
  teal: '#00897b',
  palette: ['#003D5D', '#00bfa5', '#f57c00', '#7b1fa2', '#d32f2f', '#00897b']
};

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function scaleData(data, category = 'All') {
  if (category === 'All') return data;
  const w = typeof CATEGORY_WEIGHTS !== 'undefined' ? CATEGORY_WEIGHTS[category] : 1;
  return data.map(v => Math.round(v * w * 10) / 10);
}

/** Apply quarter/month period focus filter */
function applyPeriodFocus(labels, data) {
  const pf = typeof analyticsPeriodFocus !== 'undefined' ? analyticsPeriodFocus : 'all';
  if (pf === 'all' || !labels.length) return { labels: [...labels], data: [...data] };
  const idx = labels.findIndex(l => l === pf || l.startsWith(pf) || l.includes(pf));
  if (idx < 0) return { labels: [...labels], data: [...data] };
  return { labels: [labels[idx]], data: [data[idx]] };
}

/** Resolve chart labels/data for last-10-year explorer (focus year + granularity) */
function resolveChartSeries(metricKey, period = 'year') {
  const series = CHART_DATA[metricKey]?.[period] || CHART_DATA[metricKey]?.year;
  if (!series) return { labels: [], data: [] };
  const focus = typeof analyticsFocusYear !== 'undefined' ? analyticsFocusYear : 'all';
  if (period === 'year' && focus && focus !== 'all') {
    const idx = series.labels.indexOf(focus);
    if (idx >= 0) {
      return applyPeriodFocus([series.labels[idx]], [series.data[idx]]);
    }
  }
  if (period !== 'year' && focus && focus !== 'all') {
    const yearSeries = CHART_DATA[metricKey]?.year;
    const idx = yearSeries ? yearSeries.labels.indexOf(focus) : -1;
    const base = yearSeries && idx >= 0 ? yearSeries.data[idx] : null;
    const latest = yearSeries ? yearSeries.data[yearSeries.data.length - 1] : 1;
    const factor = base && latest ? base / latest : 1;
    return applyPeriodFocus(
      series.labels,
      series.data.map(v => Math.round(v * factor * 10) / 10)
    );
  }
  return applyPeriodFocus(series.labels, series.data);
}

function initSpendChart(period = 'year', category = 'All') {
  destroyChart('spend');
  const ctx = document.getElementById('chartSpend');
  if (!ctx) return;
  const d = resolveChartSeries('spend', period);
  charts.spend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Procurement Spend (₹ Cr)' : `${category} Spend (₹ Cr)`,
        data: scaleData(d.data, category),
        backgroundColor: chartColors.palette.map(c => c + 'cc'),
        borderColor: chartColors.palette,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: chartOptions('₹ Cr', 'spend')
  });
}

function initProcurementChart(period = 'year', category = 'All') {
  destroyChart('procurement');
  const ctx = document.getElementById('chartProcurement');
  if (!ctx) return;
  const d = resolveChartSeries('procurement', period);
  charts.procurement = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Tenders (count)' : `${category} Tenders`,
        data: scaleData(d.data, category),
        borderColor: chartColors.accent,
        backgroundColor: chartColors.accent + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: chartColors.accent
      }]
    },
    options: chartOptions('tenders', 'procurement')
  });
}

function initVendorPerfChart(period = 'year', category = 'All') {
  destroyChart('vendorPerf');
  const ctx = document.getElementById('chartVendorPerf');
  if (!ctx) return;
  const d = resolveChartSeries('vendorPerf', period);
  charts.vendorPerf = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Avg Vendor Score' : `${category} Vendor Score`,
        data: scaleData(d.data, category),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primary + '15',
        fill: true,
        tension: 0.4,
        pointRadius: 5
      }]
    },
    options: chartOptions('pts', 'vendorPerf')
  });
}

function initSavingsChart(period = 'year', category = 'All') {
  destroyChart('savings');
  const ctx = document.getElementById('chartSavings');
  if (!ctx) return;
  const d = resolveChartSeries('savings', period);
  charts.savings = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Savings Realized (₹ Cr)' : `${category} Savings (₹ Cr)`,
        data: scaleData(d.data, category),
        backgroundColor: chartColors.green + 'aa',
        borderColor: chartColors.green,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: chartOptions('₹ Cr', 'savings')
  });
}

function initCategoryChart(highlightCategory = 'All') {
  destroyChart('category');
  const ctx = document.getElementById('chartCategory');
  if (!ctx) return;
  const labels = CHART_DATA.categorySpend.labels;
  const data = CHART_DATA.categorySpend.data; // always real % — never distort slice sizes
  const bgColors = labels.map((l, i) => {
    if (highlightCategory === 'All') return chartColors.palette[i];
    return l === highlightCategory ? chartColors.palette[i] : chartColors.palette[i] + '44';
  });
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: [...data],
        backgroundColor: bgColors,
        borderWidth: highlightCategory === 'All' ? 0 : 2,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11, weight: '600' },
            padding: 12,
            generateLabels(chart) {
              return chart.data.labels.map((label, i) => ({
                text: `${label}: ${data[i]}% spend`,
                fillStyle: chartColors.palette[i],
                fontColor: highlightCategory !== 'All' && label !== highlightCategory ? '#94a3b8' : '#0f172a',
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: '700' },
          callbacks: {
            title(items) {
              return items[0].label + ' — Spend Share';
            },
            label(ctx) {
              const pct = data[ctx.dataIndex];
              return ` ${pct}% of total procurement spend`;
            },
            afterLabel(ctx) {
              const amounts = { Drugs: '₹90.3 Cr', Equipment: '₹60.2 Cr', Services: '₹32.3 Cr', Consumables: '₹21.5 Cr', Others: '₹10.8 Cr' };
              const note = highlightCategory !== 'All' && ctx.label !== highlightCategory
                ? '(other categories dimmed — filter active)'
                : '';
              const amt = amounts[ctx.label] ? `Estimated spend: ${amounts[ctx.label]}` : '';
              return [amt, note].filter(Boolean).join('\n');
            }
          }
        }
      },
      cutout: '60%',
      onClick: (e, elements) => {
        if (!elements.length) {
          if (typeof openCategorySpendDetail === 'function') openCategorySpendDetail(highlightCategory === 'All' ? null : highlightCategory);
          return;
        }
        const label = labels[elements[0].index];
        if (typeof openCategorySpendDetail === 'function') openCategorySpendDetail(label);
      }
    }
  });
}

function initRadarChart(vendor) {
  initPerformanceBarChart(vendor);
}

function initPerformanceBarChart(vendor) {
  destroyChart('performanceBar');
  const ctx = document.getElementById('chartPerformanceBar');
  if (!ctx || !vendor) return;

  const labels = PERF_METRICS.map(m => m.label);
  const data = PERF_METRICS.map(m => vendor[m.key]);
  const colors = PERF_METRICS.map(m => m.color);

  charts.performanceBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Your Score',
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Score: ${ctx.raw}/100`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#e2e8f0' },
          ticks: { stepSize: 20, font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: '600' } }
        }
      }
    }
  });
}

function initVendorTrendChart(vendors = VENDORS) {
  destroyChart('vendorTrend');
  const ctx = document.getElementById('chartVendorTrend');
  if (!ctx) return;
  const list = vendors && vendors.length ? vendors : VENDORS;
  const vendorIds = list.map(v => v.id);
  charts.vendorTrend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: list.map(v => v.id),
      datasets: [
        { label: 'Quality', data: list.map(v => v.quality), backgroundColor: chartColors.primary + 'cc', borderRadius: 6 },
        { label: 'Lead Time', data: list.map(v => v.leadTime), backgroundColor: chartColors.teal + 'cc', borderRadius: 6 },
        { label: 'Cost', data: list.map(v => v.cost), backgroundColor: chartColors.orange + 'cc', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11, weight: '600' } } },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            footer() { return 'Click a bar group to view vendor detail'; }
          }
        },
        valueLabels: { enabled: true, unit: 'pts' }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 }, callback: v => v + ' pts' } }
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const vendorId = vendorIds[idx];
          if (vendorId && typeof openVendorDetail === 'function') openVendorDetail(vendorId);
        }
      }
    }
  });
}

function chartOptions(unit, chartKey = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 18 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        callbacks: {
          label(ctx) {
            const u = unit === '₹ Cr' ? ' ₹ Cr' : unit === 'tenders' ? ' tenders' : unit === 'pts' ? ' pts' : '';
            return ` ${ctx.dataset.label}: ${ctx.raw}${u}`;
          }
        }
      },
      valueLabels: { enabled: true, unit }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: {
          font: { size: 11 },
          callback(v) {
            if (unit === '₹ Cr') return '₹' + v;
            if (unit === 'tenders') return v;
            if (unit === 'pts') return v;
            return v;
          }
        }
      }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const chart = e.chart;
        const idx = elements[0].index;
        const label = chart.data.labels[idx];
        const series = chart.data.datasets[0].label || 'Trend';
        const value = chart.data.datasets[0].data[idx];
        if (typeof openChartTrendDetail === 'function') {
          openChartTrendDetail(chartKey, series, label, value);
        } else if (typeof openChartPeriodDetail === 'function') {
          openChartPeriodDetail(series, label);
        }
      }
    }
  };
}

/** Draw numeric values above bar / line points */
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const conf = chart.options.plugins?.valueLabels;
    if (!conf || conf.enabled === false) return;
    const { ctx } = chart;
    const unit = conf.unit || '';
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((element, index) => {
        const raw = dataset.data[index];
        if (raw == null) return;
        const { x, y } = element.tooltipPosition();
        const text = unit === '₹ Cr'
          ? `₹${raw}`
          : unit === 'tenders'
            ? String(raw)
            : (Number.isInteger(raw) ? String(raw) : Number(raw).toFixed(1));
        ctx.save();
        ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, x, y - 6);
        ctx.restore();
      });
    });
  }
};

if (typeof Chart !== 'undefined') {
  try { Chart.register(valueLabelsPlugin); } catch (_) { /* already registered */ }
}

function refreshAllCharts(period = 'year', category = 'All') {
  initSpendChart(period, category);
  initProcurementChart(period, category);
  initVendorPerfChart(period, category);
  initSavingsChart(period, category);
  initCategoryChart(category);
  initAnalyticsCompareChart(category);
}

function scaleArray(arr, category = 'All') {
  if (category === 'All') return [...arr];
  const w = typeof CATEGORY_WEIGHTS !== 'undefined' ? CATEGORY_WEIGHTS[category] : 1;
  return arr.map(v => Math.max(1, Math.round(v * w)));
}

function getTenderProgressSeries(category = 'All') {
  const tp = CHART_DATA.tenderProgress;
  if (!tp) return { labels: [], processed: [], pending: [], delayed: [] };

  const focus = typeof analyticsFocusYear !== 'undefined' ? analyticsFocusYear : 'all';
  const slice = typeof analyticsSliceType !== 'undefined' ? analyticsSliceType : 'quarter';

  if (focus === 'all') {
    return {
      labels: [...tp.year.labels],
      processed: scaleArray(tp.year.processed, category),
      pending: scaleArray(tp.year.pending, category),
      delayed: scaleArray(tp.year.delayed, category)
    };
  }

  const yearIdx = typeof ANALYTICS_FY_OPTIONS !== 'undefined'
    ? Math.max(0, ANALYTICS_FY_OPTIONS.indexOf(focus))
    : 9;
  const factor = 0.82 + (yearIdx * 0.02);

  if (slice === 'month') {
    const result = {
      labels: [...tp.month.labels],
      processed: scaleArray(tp.month.processed.map(v => Math.round(v * factor)), category),
      pending: scaleArray(tp.month.pending.map(v => Math.max(1, Math.round(v * factor * 0.9))), category),
      delayed: scaleArray(tp.month.delayed.map(v => Math.max(1, Math.round(v * factor * 0.85))), category)
    };
    return applyPeriodFocusToProgress(result);
  }

  const result = {
    labels: [...tp.quarter.labels],
    processed: scaleArray(tp.quarter.processed.map(v => Math.round(v * factor)), category),
    pending: scaleArray(tp.quarter.pending.map(v => Math.max(1, Math.round(v * factor * 0.9))), category),
    delayed: scaleArray(tp.quarter.delayed.map(v => Math.max(1, Math.round(v * factor * 0.85))), category)
  };
  return applyPeriodFocusToProgress(result);
}

function applyPeriodFocusToProgress(result) {
  const pf = typeof analyticsPeriodFocus !== 'undefined' ? analyticsPeriodFocus : 'all';
  if (pf === 'all') return result;
  const idx = result.labels.findIndex(l => l === pf || l.startsWith(pf) || l.includes(pf));
  if (idx < 0) return result;
  return {
    labels: [result.labels[idx]],
    processed: [result.processed[idx]],
    pending: [result.pending[idx]],
    delayed: [result.delayed[idx]]
  };
}

function initAnalyticsCompareChart(category = 'All') {
  destroyChart('analyticsCompare');
  const ctx = document.getElementById('chartAnalyticsCompare');
  if (!ctx) return;

  const mode = typeof analyticsCompareMode !== 'undefined' ? analyticsCompareMode : 'vendor';
  if (mode === 'progress') {
    const d = getTenderProgressSeries(category);
    charts.analyticsCompare = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.labels,
        datasets: [
          {
            label: 'Total processed',
            data: d.processed,
            borderColor: chartColors.green,
            backgroundColor: chartColors.green + '18',
            fill: true,
            tension: 0.35,
            pointRadius: 5,
            pointBackgroundColor: chartColors.green,
            borderWidth: 2.5
          },
          {
            label: 'Pending',
            data: d.pending,
            borderColor: chartColors.orange,
            backgroundColor: chartColors.orange + '12',
            fill: true,
            tension: 0.35,
            pointRadius: 5,
            pointBackgroundColor: chartColors.orange,
            borderWidth: 2.5
          },
          {
            label: 'Delayed',
            data: d.delayed,
            borderColor: chartColors.red,
            backgroundColor: chartColors.red + '12',
            fill: true,
            tension: 0.35,
            pointRadius: 5,
            pointBackgroundColor: chartColors.red,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 18 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11, weight: '600' }, usePointStyle: true } },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              footer(items) {
                if (items.length < 2) return '';
                const proc = items.find(i => i.dataset.label === 'Total processed')?.raw;
                const pend = items.find(i => i.dataset.label === 'Pending')?.raw;
                const del = items.find(i => i.dataset.label === 'Delayed')?.raw;
                if (proc == null || pend == null || del == null) return '';
                const clearance = proc ? Math.round(((proc - pend - del) / proc) * 100) : 0;
                return `Clearance rate: ~${clearance}%`;
              }
            }
          },
          valueLabels: { enabled: true }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 }, stepSize: 5 } }
        },
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const chart = e.chart;
            const idx = elements[0].index;
            const label = chart.data.labels[idx];
            const proc = chart.data.datasets[0]?.data[idx];
            if (typeof openChartTrendDetail === 'function') {
              openChartTrendDetail('progress', 'Tender Pipeline', label, proc);
            }
          }
        }
      }
    });
    return;
  }

  const vendors = typeof filterByCategory === 'function' ? filterByCategory(VENDORS) : VENDORS;
  const list = vendors.length ? vendors.slice(0, 6) : VENDORS.slice(0, 6);
  const vendorIds = list.map(v => v.id);
  charts.analyticsCompare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: list.map(v => v.name.replace(' India Pvt Ltd', '').replace(' Solutions', '').replace(' Distributors', '')),
      datasets: [
        { label: 'Quality', data: list.map(v => v.quality), backgroundColor: chartColors.primary + 'cc', borderRadius: 6 },
        { label: 'Lead Time', data: list.map(v => v.leadTime), backgroundColor: chartColors.teal + 'cc', borderRadius: 6 },
        { label: 'Cost', data: list.map(v => v.cost), backgroundColor: chartColors.orange + 'cc', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11, weight: '600' } } },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            footer() { return 'Click a bar group to view vendor detail'; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 }, callback: v => v + ' pts' } }
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const vendorId = vendorIds[idx];
          if (vendorId && typeof openVendorDetail === 'function') {
            openVendorDetail(vendorId);
          }
        }
      }
    }
  });
}

function initVendorCharts(category = 'All') {
  initCategoryChart(category);
  initVendorTrendChart();
}

function countBy(items, keyFn) {
  const map = {};
  items.forEach(item => {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function initVendorReportCharts(category = 'All') {
  const tenders = category === 'All' ? TENDERS : TENDERS.filter(t => t.category === category);
  const bids = category === 'All' ? BIDS : BIDS.filter(b => b.category === category);
  const deliveries = category === 'All' ? DELIVERIES : DELIVERIES.filter(d => d.category === category);
  const completed = typeof vendorStageState !== 'undefined' ? vendorStageState.completed : {};

  // Tender status bar
  destroyChart('vendorTenderStatus');
  const tenderCtx = document.getElementById('chartVendorTenderStatus');
  if (tenderCtx) {
    const byStatus = countBy(tenders, t => t.status);
    const labels = Object.keys(byStatus);
    charts.vendorTenderStatus = new Chart(tenderCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tenders',
          data: labels.map(l => byStatus[l]),
          backgroundColor: labels.map((_, i) => chartColors.palette[i % chartColors.palette.length] + 'cc'),
          borderColor: labels.map((_, i) => chartColors.palette[i % chartColors.palette.length]),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        ...chartOptions('Count'),
        onClick: (e, elements) => {
          if (!elements.length) return;
          const label = e.chart.data.labels[elements[0].index];
          if (typeof openVendorReportChartDetail === 'function') openVendorReportChartDetail('tender', label);
        }
      }
    });
  }

  // Bid mix doughnut
  destroyChart('vendorBidMix');
  const bidCtx = document.getElementById('chartVendorBidMix');
  if (bidCtx) {
    const byStatus = countBy(bids, b => b.status);
    const labels = Object.keys(byStatus).length ? Object.keys(byStatus) : ['No bids'];
    const data = Object.keys(byStatus).length ? labels.map(l => byStatus[l]) : [1];
    charts.vendorBidMix = new Chart(bidCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: chartColors.palette.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11, weight: '600' }, padding: 10 } },
          tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
        },
        cutout: '58%',
        onClick: (e, elements) => {
          if (!elements.length) return;
          const label = e.chart.data.labels[elements[0].index];
          if (typeof openVendorReportChartDetail === 'function') openVendorReportChartDetail('bid', label);
        }
      }
    });
  }

  // Delivery / payment stacked-like grouped bar
  destroyChart('vendorDeliveryPay');
  const delCtx = document.getElementById('chartVendorDeliveryPay');
  if (delCtx) {
    const grnAccepted = deliveries.filter(d => d.grn === 'Accepted').length;
    const grnPending = deliveries.filter(d => d.grn !== 'Accepted').length;
    const paid = deliveries.filter(d => d.payment === 'Paid').length;
    const processing = deliveries.filter(d => d.payment === 'Processing').length;
    const unpaid = deliveries.filter(d => d.payment === '—' || !d.payment || (d.payment !== 'Paid' && d.payment !== 'Processing')).length;
    charts.vendorDeliveryPay = new Chart(delCtx, {
      type: 'bar',
      data: {
        labels: ['GRN Accepted', 'GRN Pending', 'Payment Paid', 'Payment Processing', 'Payment Pending'],
        datasets: [{
          label: 'Count',
          data: [grnAccepted, grnPending, paid, processing, unpaid],
          backgroundColor: [
            chartColors.green + 'cc',
            chartColors.orange + 'cc',
            chartColors.teal + 'cc',
            chartColors.blue + 'cc',
            chartColors.red + 'cc'
          ],
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: chartOptions('Count')
    });
  }

  // Performance score radar removed from My Reports (available on Performance Score page)

  // Lifecycle completion
  destroyChart('vendorLifecycle');
  const lifeCtx = document.getElementById('chartVendorLifecycle');
  if (lifeCtx) {
    const labels = ['Reg', 'KYC', 'Approval', 'Bid', 'Award', 'Contract', 'Delivery', 'Invoice', 'Payment', 'Renewal'];
    const data = labels.map((_, i) => (completed[i + 1] ? 100 : (i + 1 === (typeof getVendorActiveStageId === 'function' ? getVendorActiveStageId() : 4) ? 45 : 0)));
    charts.vendorLifecycle = new Chart(lifeCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Completion %',
          data,
          backgroundColor: data.map(v => v === 100 ? chartColors.green + 'cc' : v > 0 ? chartColors.blue + 'cc' : '#cbd5e1'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        ...chartOptions('%'),
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#e2e8f0' },
            ticks: { font: { size: 11 }, callback: v => v + '%' }
          }
        }
      }
    });
  }
}

function initGovReportCharts(category = 'All') {
  const tenders = category === 'All' ? TENDERS : TENDERS.filter(t => t.category === category);
  const approvals = category === 'All' ? PENDING_APPROVALS : PENDING_APPROVALS.filter(a => a.category === category);
  const delays = category === 'All' ? PAYMENT_DELAYS : PAYMENT_DELAYS.filter(p => p.category === category);
  const vendors = category === 'All' ? VENDORS : VENDORS.filter(v => v.category === category);
  const workQueue = typeof getWorkQueueSource === 'function' ? getWorkQueueSource() : (typeof GOV_WORK_QUEUE !== 'undefined' ? GOV_WORK_QUEUE : []);
  const filteredQueue = category === 'All'
    ? workQueue
    : workQueue.filter(w => `${w.title} ${w.detail}`.toLowerCase().includes(category.toLowerCase()));

  // Workflow stage status
  destroyChart('govWorkflow');
  const wfCtx = document.getElementById('chartGovWorkflow');
  if (wfCtx && typeof GOV_WORKFLOW !== 'undefined') {
    const labels = GOV_WORKFLOW.map(s => s.name);
    const data = GOV_WORKFLOW.map(s => (s.status === 'done' ? 100 : s.status === 'active' ? 50 : 10));
    charts.govWorkflow = new Chart(wfCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Progress %',
          data,
          backgroundColor: GOV_WORKFLOW.map(s => s.status === 'done' ? chartColors.green + 'cc' : s.status === 'active' ? chartColors.orange + 'cc' : '#cbd5e1'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        ...chartOptions('%'),
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 10 }, callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  // Tender pipeline
  destroyChart('govTenderPipeline');
  const tenderCtx = document.getElementById('chartGovTenderPipeline');
  if (tenderCtx) {
    const byStatus = countBy(tenders, t => t.status);
    const labels = Object.keys(byStatus);
    charts.govTenderPipeline = new Chart(tenderCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tenders',
          data: labels.map(l => byStatus[l]),
          backgroundColor: labels.map((_, i) => chartColors.palette[i % chartColors.palette.length] + 'cc'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: chartOptions('Count')
    });
  }

  // Approval stages doughnut
  destroyChart('govApprovalStages');
  const apprCtx = document.getElementById('chartGovApprovalStages');
  if (apprCtx) {
    const byStage = countBy(approvals, a => a.stage);
    const labels = Object.keys(byStage).length ? Object.keys(byStage) : ['No pending'];
    const data = Object.keys(byStage).length ? labels.map(l => byStage[l]) : [0];
    charts.govApprovalStages = new Chart(apprCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: chartColors.palette.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 10, weight: '600' }, padding: 8 } },
          tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
        },
        cutout: '58%'
      }
    });
  }

  // Payment delays bar
  destroyChart('govPaymentDelays');
  const payCtx = document.getElementById('chartGovPaymentDelays');
  if (payCtx) {
    charts.govPaymentDelays = new Chart(payCtx, {
      type: 'bar',
      data: {
        labels: delays.map(p => p.id),
        datasets: [{
          label: 'Days overdue',
          data: delays.map(p => p.daysOverdue),
          backgroundColor: delays.map(p => (p.daysOverdue >= 10 ? chartColors.red : chartColors.orange) + 'cc'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: chartOptions('Days')
    });
  }

  // Work queue by category
  destroyChart('govWorkQueue');
  const wqCtx = document.getElementById('chartGovWorkQueue');
  if (wqCtx) {
    const byCat = countBy(filteredQueue, w => w.category);
    const labels = Object.keys(byCat).length ? Object.keys(byCat) : ['No alerts'];
    const data = Object.keys(byCat).length ? labels.map(l => byCat[l]) : [0];
    charts.govWorkQueue = new Chart(wqCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Alerts',
          data,
          backgroundColor: chartColors.palette.slice(0, labels.length).map(c => c + 'cc'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: chartOptions('Count')
    });
  }

  // SLA status doughnut
  destroyChart('govSlaStatus');
  const slaCtx = document.getElementById('chartGovSlaStatus');
  if (slaCtx && typeof SLA_THREADS !== 'undefined') {
    const byStatus = countBy(SLA_THREADS, t => t.status);
    const labels = Object.keys(byStatus);
    charts.govSlaStatus = new Chart(slaCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: labels.map(l => byStatus[l]),
          backgroundColor: [chartColors.red, chartColors.orange, chartColors.green].slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11, weight: '600' }, padding: 10 } },
          tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
        },
        cutout: '58%'
      }
    });
  }

  // Vendor scores comparison
  destroyChart('govVendorScores');
  const vendCtx = document.getElementById('chartGovVendorScores');
  if (vendCtx) {
    const sorted = [...vendors].sort((a, b) => b.overall - a.overall);
    charts.govVendorScores = new Chart(vendCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(v => v.name.split(' ')[0]),
        datasets: [{
          label: 'Overall score',
          data: sorted.map(v => v.overall),
          backgroundColor: sorted.map(v => (v.overall >= 85 ? chartColors.green : v.overall >= 75 ? chartColors.blue : chartColors.orange) + 'cc'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        ...chartOptions('Score'),
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 }, callback: v => v + ' pts' } }
        }
      }
    });
  }
}
