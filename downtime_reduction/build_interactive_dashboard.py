"""build_interactive_dashboard.py — renders interactive_dashboard.html with
dashboard_data.json embedded inline, so it's one self-contained file.

Run after export_demo_data.py (or just re-run this, it calls export first).
"""

import json
import subprocess

subprocess.run(["python3", "export_demo_data.py"], check=True)

with open("dashboard_data.json", encoding="utf-8") as f:
    data = json.load(f)

data_json = json.dumps(data)

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Downtime Reduction — Live Pipeline Demo</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
  :root {
    --bg: #f7f6f2; --card: #ffffff; --border: #e1e0d9;
    --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
    --accent: #185fa5; --accent-bg: #e6f1fb;
    --success: #27500a; --success-bg: #eaf3de;
    --amber: #633806; --amber-bg: #faeeda;
    --red: #791f1f; --red-bg: #fcebeb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a19; --card: #232322; --border: #383835;
      --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #898781;
      --accent: #85b7eb; --accent-bg: #042c53;
      --success: #c0dd97; --success-bg: #173404;
      --amber: #fac775; --amber-bg: #412402;
      --red: #f7c1c1; --red-bg: #501313;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px; background: var(--bg); color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 980px; margin: 0 auto; }
  .eyebrow { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 4px; font-weight: 600; }
  h1 { font-size: 23px; font-weight: 700; margin: 0 0 6px; }
  .subtitle { font-size: 14px; color: var(--text-secondary); margin: 0 0 22px; }

  .tabs { display: flex; gap: 4px; margin-bottom: 18px; border-bottom: 0.5px solid var(--border); }
  .tab { padding: 8px 16px; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .panel { display: none; }
  .panel.active { display: block; }

  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .metric-card { background: var(--card); border: 0.5px solid var(--border); border-radius: 14px; padding: 16px; }
  .metric-label { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 6px; }
  .metric-value { font-size: 26px; font-weight: 700; margin: 0; }
  .metric-value.success { color: var(--success); }
  .metric-value.accent { color: var(--accent); }

  section { background: var(--card); border: 0.5px solid var(--border); border-radius: 14px; padding: 20px 22px; margin-bottom: 16px; }
  h2 { font-size: 15px; font-weight: 700; margin: 0 0 14px; }

  .check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; }
  .check-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .check-dot.pass { background: var(--success); }
  .check-dot.fail { background: var(--red); }

  .asset-list { display: flex; flex-direction: column; gap: 8px; }
  .asset-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 0.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: background 0.15s; }
  .asset-row:hover { background: var(--bg); }
  .asset-name { font-weight: 700; font-size: 13.5px; }
  .asset-detail { font-size: 12px; color: var(--text-secondary); }
  .asset-bar-track { width: 140px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .asset-bar-fill { height: 100%; background: var(--accent); }

  button.replay-btn {
    background: var(--accent); color: white; border: none; border-radius: 8px;
    padding: 9px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; margin-bottom: 14px;
  }
  button.replay-btn:disabled { opacity: 0.5; cursor: default; }
  .live-stats { display: flex; gap: 20px; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px; }
  .live-stats b { color: var(--text-primary); }

  .chart-box { position: relative; width: 100%; height: 260px; margin-bottom: 8px; }
  .legend { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
  .legend span { display: flex; align-items: center; gap: 4px; }
  .swatch { width: 10px; height: 10px; border-radius: 2px; }

  .badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
  .badge.high { background: var(--red-bg); color: var(--red); }
  .badge.medium { background: var(--amber-bg); color: var(--amber); }
  .badge.low { background: var(--success-bg); color: var(--success); }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Inuka hackathon &middot; stage 1 &middot; domain b, problem 4</p>
  <h1>Downtime reduction — live pipeline demo</h1>
  <p class="subtitle">Interactive view of the ETL quality gate, chronic-asset insights, and scheduler run — click around during the demo</p>

  <div class="metrics" id="metrics"></div>

  <div class="tabs">
    <div class="tab active" data-tab="quality">Quality gate</div>
    <div class="tab" data-tab="insights">Chronic assets</div>
    <div class="tab" data-tab="scheduler">Scheduler performance</div>
  </div>

  <div class="panel active" id="panel-quality">
    <section>
      <h2 id="quality-heading">Data quality gate</h2>
      <div class="check-grid" id="checkGrid"></div>
    </section>
  </div>

  <div class="panel" id="panel-insights">
    <section>
      <h2>Chronic-failure assets — click to see detail</h2>
      <div class="asset-list" id="assetList"></div>
    </section>
  </div>

  <div class="panel" id="panel-scheduler">
    <section>
      <h2>Replay the scheduler run</h2>
      <button class="replay-btn" id="replayBtn"><i></i>Replay ticket creation</button>
      <div class="live-stats">
        <span>Tickets: <b id="liveCount">0</b></span>
        <span>Success rate: <b id="liveSuccess">–</b></span>
        <span>Avg latency: <b id="liveLatency">–</b></span>
        <span>Retries: <b id="liveRetries">0</b></span>
      </div>
      <div class="chart-box"><canvas id="latencyChart" role="img" aria-label="Latency per ticket creation call, in order"></canvas></div>
      <div class="legend">
        <span><span class="swatch" style="background:#2a78d6"></span>Latency (ms)</span>
        <span><span class="swatch" style="background:#eb6834"></span>Needed a retry</span>
      </div>
    </section>
    <section>
      <h2>Breakdown by priority and zone</h2>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="chart-box" style="height:220px;"><canvas id="priorityChart" role="img" aria-label="Ticket count by priority level"></canvas></div>
        <div class="chart-box" style="height:220px;"><canvas id="zoneChart" role="img" aria-label="Ticket count by depot zone"></canvas></div>
      </div>
    </section>
  </div>
</div>

<script>
const DATA = __DATA_JSON__;

// ---- Tabs ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ---- Metrics ----
const qr = DATA.quality_report;
const insights = DATA.insights;
const run = DATA.scheduler_run;
document.getElementById('metrics').innerHTML = [
  { label: 'Quality gate', value: qr.passed + '/' + qr.total, cls: 'success' },
  { label: 'Chronic assets flagged', value: insights.chronic_assets_found + '/' + insights.total_assets_analyzed, cls: '' },
  { label: 'Tickets created', value: run.succeeded + '/' + run.total_candidates, cls: 'accent' },
  { label: 'Avg latency', value: run.avg_latency_ms + 'ms', cls: 'accent' },
].map(m => '<div class="metric-card"><p class="metric-label">' + m.label + '</p><p class="metric-value ' + m.cls + '">' + m.value + '</p></div>').join('');

// ---- Quality gate checklist ----
document.getElementById('quality-heading').textContent = 'Data quality gate — ' + qr.passed + '/' + qr.total + ' checks passing';
const labels = {
  no_null_asset_id: 'No null asset IDs',
  no_null_reported_time: 'No null report timestamps',
  work_order_id_unique: 'Work order IDs unique',
  status_in_valid_set: 'Status values in valid set',
  zone_in_valid_set: 'Zone values in valid set',
  downtime_non_negative: 'Downtime hours non-negative',
  downtime_within_bounds: 'Downtime hours within bounds',
  completed_time_after_reported: 'Completion after report time',
  unknown_status_rate_below_5pct: 'Unknown-status rate below 5%',
  technician_double_booking_rate_below_2pct: 'Technician double-booking rate below 2%',
};
document.getElementById('checkGrid').innerHTML = Object.entries(qr.checks).map(([key, passed]) =>
  '<div class="check-row"><span class="check-dot ' + (passed ? 'pass' : 'fail') + '"></span><span>' + (labels[key] || key) + '</span></div>'
).join('');

// ---- Chronic assets ----
const maxCount = Math.max(...insights.chronic_assets.map(a => a.ticket_count));
document.getElementById('assetList').innerHTML = insights.chronic_assets.map(a =>
  '<div class="asset-row" data-asset="' + a.asset_id + '">' +
    '<div><div class="asset-name">' + a.asset_id + '</div><div class="asset-detail">' + a.zone + ' \u00b7 ' + a.asset_type + ' \u00b7 ' + a.multiplier_vs_fleet_average + '\u00d7 fleet average</div></div>' +
    '<div style="display:flex; align-items:center; gap:10px;"><div class="asset-bar-track"><div class="asset-bar-fill" style="width:' + (a.ticket_count / maxCount * 100) + '%"></div></div><span style="font-size:13px; font-weight:700; min-width:24px; text-align:right;">' + a.ticket_count + '</span></div>' +
  '</div>'
).join('');
document.querySelectorAll('.asset-row').forEach(row => {
  row.addEventListener('click', () => {
    const id = row.dataset.asset;
    const a = insights.chronic_assets.find(x => x.asset_id === id);
    alert(id + ' (' + a.zone + '): ' + a.ticket_count + ' tickets vs fleet average of ' + a.fleet_average + ' \u2014 ' + a.multiplier_vs_fleet_average + '\u00d7 higher. Priority candidate for condition-based maintenance.');
  });
});

// ---- Priority / zone charts ----
new Chart(document.getElementById('priorityChart'), {
  type: 'doughnut',
  data: {
    labels: Object.keys(run.priority_breakdown),
    datasets: [{ data: Object.values(run.priority_breakdown), backgroundColor: ['#e34948', '#eda100', '#1baf7a'] }]
  },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
});
new Chart(document.getElementById('zoneChart'), {
  type: 'doughnut',
  data: {
    labels: Object.keys(run.zone_breakdown),
    datasets: [{ data: Object.values(run.zone_breakdown), backgroundColor: ['#2a78d6', '#4a3aa7', '#e87ba4'] }]
  },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
});

// ---- Replay animation ----
const tickets = run.tickets;
let latencyChart;
const replayBtn = document.getElementById('replayBtn');

function initEmptyChart() {
  latencyChart = new Chart(document.getElementById('latencyChart'), {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,0.08)', fill: true, tension: 0.2, pointRadius: (ctx) => ctx.raw && ctx.raw.retry ? 5 : 2, pointBackgroundColor: (ctx) => ctx.raw && ctx.raw.retry ? '#eb6834' : '#2a78d6', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { title: { display: true, text: 'ms' } }, x: { ticks: { display: false } } }
    }
  });
}
initEmptyChart();

replayBtn.addEventListener('click', () => {
  replayBtn.disabled = true;
  replayBtn.textContent = 'Replaying...';
  latencyChart.data.labels = [];
  latencyChart.data.datasets[0].data = [];
  latencyChart.update();

  let i = 0;
  let successCount = 0;
  let retryCount = 0;
  let latencySum = 0;
  const batchSize = 4;

  function step() {
    const end = Math.min(i + batchSize, tickets.length);
    for (; i < end; i++) {
      const t = tickets[i];
      latencyChart.data.labels.push(i + 1);
      latencyChart.data.datasets[0].data.push({ x: i + 1, y: t.latency_ms, retry: t.attempts > 1 });
      if (t.success) successCount++;
      if (t.attempts > 1) retryCount++;
      latencySum += t.latency_ms;
    }
    latencyChart.update('none');
    document.getElementById('liveCount').textContent = i;
    document.getElementById('liveSuccess').textContent = Math.round(successCount / i * 100) + '%';
    document.getElementById('liveLatency').textContent = Math.round(latencySum / i) + 'ms';
    document.getElementById('liveRetries').textContent = retryCount;

    if (i < tickets.length) {
      requestAnimationFrame(() => setTimeout(step, 15));
    } else {
      replayBtn.disabled = false;
      replayBtn.textContent = 'Replay ticket creation';
    }
  }
  step();
});
</script>
</body>
</html>
"""

html = HTML.replace("__DATA_JSON__", data_json)

with open("interactive_dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Wrote interactive_dashboard.html:", len(html), "bytes")
