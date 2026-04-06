/**
 * Dashboard Module
 * KPIs and Charts.
 */

import { fetchCustomers, fetchOrders, fetchProducts } from './data.js';
import { icons } from './icons.js';
import { exportToCSV } from './export.js';
import { API_BASE } from './config.js';

function getOrderValue(order, metric) {
  if (metric === 'orders') return 1;
  if (metric === 'units') {
    return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }
  return Number(order.total ?? order.total_amount ?? 0);
}

export const renderDashboard = async (container) => {
  const [orders, products, customers] = await Promise.all([
    fetchOrders(),
    fetchProducts(),
    fetchCustomers(),
  ]);

  const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total ?? order.total_amount ?? 0), 0);
  const totalOrders = orders.length;
  const activeCustomers = customers.length;
  const lowStock = products.filter((product) => Number(product.stock || 0) < 10).length;
  const totalUnitsSold = products.reduce((acc, product) => acc + Number(product.soldCount || 0), 0);
  const bestSeller = [...products].sort((left, right) => Number(right.soldCount || 0) - Number(left.soldCount || 0))[0] || null;
  const defaultRange = '7';
  const defaultMetric = 'revenue';

  // Fetch IoT sensor status
  let iotStatus = { sensors: 0, online: 0, lastScan: '--', running: false };
  try {
    const [sensorsResp, simResp] = await Promise.all([
      fetch(`${API_BASE}/iot/sensors`).then(r => r.json()).catch(() => ({ sensors: [] })),
      fetch(`${API_BASE}/iot/simulator/status`).then(r => r.json()).catch(() => ({ running: false })),
    ]);
    const sensors = sensorsResp.sensors || [];
    iotStatus.sensors = sensors.length;
    iotStatus.online = sensors.filter(s => s.status === 'online').length;
    iotStatus.running = simResp.running;
    const lastEvent = sensors.map(s => s.last_event_time).filter(Boolean).sort().pop();
    iotStatus.lastScan = lastEvent ? new Date(lastEvent).toLocaleTimeString() : '--';
  } catch { /* IoT is optional */ }

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Overview</h2>
        <div class="flex items-center gap-3">
          <button id="export-dashboard-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export Report
          </button>
          <button class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
            ${icons.plus} New Product
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${renderKPICard('Total Revenue', `$${totalRevenue.toLocaleString()}`, 'Based on live orders', 'text-emerald-600')}
        ${renderKPICard('Total Orders', totalOrders.toString(), 'Synced from backend', 'text-blue-600')}
        ${renderKPICard('Active Customers', activeCustomers.toString(), 'Registered customer accounts', 'text-purple-600')}
        ${renderKPICard('Low Stock Alert', lowStock.toString(), 'Requires attention', lowStock > 0 ? 'text-red-600' : 'text-zinc-400')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <p class="text-sm font-medium text-zinc-400">Units Sold</p>
          <div class="mt-2 flex items-end justify-between gap-4">
            <h3 class="text-3xl font-bold tracking-tight text-black">${totalUnitsSold.toLocaleString()}</h3>
            <p class="text-xs text-zinc-500">Completed orders only</p>
          </div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <p class="text-sm font-medium text-zinc-400">Best Seller</p>
          <div class="mt-2 flex items-end justify-between gap-4">
            <div>
              <h3 class="text-2xl font-bold tracking-tight text-black">${bestSeller ? bestSeller.name : 'No sales yet'}</h3>
              <p class="mt-1 text-xs text-zinc-500">${bestSeller ? `${Number(bestSeller.soldCount || 0)} units sold · ${Number(bestSeller.rating || 0).toFixed(1)} / 5 from ${Number(bestSeller.reviews || 0)} reviews` : 'No completed order has been recorded yet.'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Warehouse IoT Status Bar -->
      <div class="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl ${iotStatus.running ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'} flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-2 .5-4 2-5.5"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4c-1 .1-1.97-.5-2.47-1.4"/><path d="M12 22a9.97 9.97 0 0 0 8-4"/><path d="M18 12c0 2-.5 4-2 5.5"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-black">Warehouse IoT</p>
              <p class="text-xs text-zinc-500">${iotStatus.online}/${iotStatus.sensors} sensors online · Last scan: ${iotStatus.lastScan}</p>
            </div>
          </div>
          <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold ${iotStatus.running ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}">
            <span class="w-2 h-2 rounded-full ${iotStatus.running ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}"></span>
            ${iotStatus.running ? 'Live Monitoring' : 'Offline'}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Sales Chart -->
        <div class="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-black">Performance Analytics</h3>
              <p id="chart-summary" class="mt-1 text-xs text-zinc-500">Interactive overview of recent activity</p>
            </div>
            <div class="flex items-center gap-2">
              <select id="chart-metric" class="bg-zinc-100 border-none text-xs text-zinc-500 rounded-md px-3 py-2 focus:ring-0">
                <option value="revenue">Revenue</option>
                <option value="orders">Orders</option>
                <option value="units">Units Sold</option>
              </select>
              <select id="chart-range" class="bg-zinc-100 border-none text-xs text-zinc-500 rounded-md px-3 py-2 focus:ring-0">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>
          <div class="h-[300px] w-full relative">
            <canvas id="revenueChart" class="w-full h-full"></canvas>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 class="text-lg font-semibold text-black">Recent Activity</h3>
          <div class="space-y-6">
            ${orders.slice(0, 5).map(order => `
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                  ${icons.orders}
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium text-zinc-600">Order <span class="text-black">#${order.id}</span> placed</p>
                  <p class="text-xs text-zinc-400">${formatOrderDate(order.date || order.order_date)}</p>
                </div>
                <div class="ml-auto text-sm font-medium text-black">+$${Number(order.total ?? order.total_amount ?? 0).toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
          <button class="w-full py-2 text-sm font-medium text-zinc-400 hover:text-black transition-colors border-t border-zinc-100 pt-4">
            View all activity
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('export-dashboard-btn')?.addEventListener('click', () => {
    const range = Number(document.getElementById('chart-range')?.value || defaultRange);
    const metric = document.getElementById('chart-metric')?.value || defaultMetric;
    const chartData = buildSeries(orders, range, metric);
    exportToCSV(chartData.rows, `seraphine_dashboard_${metric}_${range}d`, [
      { key: 'date', label: 'Date' },
      { key: 'label', label: 'Label' },
      { key: 'value', label: metric === 'revenue' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Units Sold' },
    ]);
  });

  const metricSelect = document.getElementById('chart-metric');
  const rangeSelect = document.getElementById('chart-range');
  const chartSummary = document.getElementById('chart-summary');
  const renderChart = () => {
    const metric = metricSelect?.value || defaultMetric;
    const range = Number(rangeSelect?.value || defaultRange);
    const chartData = buildSeries(orders, range, metric);
    const totalValue = chartData.values.reduce((sum, value) => sum + value, 0);
    chartSummary.textContent = metric === 'revenue'
      ? `$${totalValue.toLocaleString()} captured in the last ${range} days`
      : metric === 'orders'
        ? `${totalValue.toLocaleString()} orders recorded in the last ${range} days`
        : `${totalValue.toLocaleString()} units sold in the last ${range} days`;
    initChart(chartData.values, chartData.labels, metric);
  };

  metricSelect.value = defaultMetric;
  rangeSelect.value = defaultRange;
  metricSelect?.addEventListener('change', renderChart);
  rangeSelect?.addEventListener('change', renderChart);
  renderChart();
};

function renderKPICard(title, value, sub, colorClass) {
  return `
    <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2 hover:border-zinc-300 transition-colors group shadow-sm">
      <p class="text-sm font-medium text-zinc-400">${title}</p>
      <div class="flex items-baseline justify-between">
        <h4 class="text-2xl font-bold text-black tracking-tight">${value}</h4>
      </div>
      <p class="text-xs ${colorClass}">${sub}</p>
    </div>
  `;
}

function initChart(data, labels, metric = 'revenue') {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fallbackData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const fallbackLabels = labels.length ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = Math.max(...fallbackData, 1);
  const padding = 42;
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  
  canvas.width = width;
  canvas.height = height;

  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const step = fallbackData.length > 1 ? chartWidth / (fallbackData.length - 1) : chartWidth;
  
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#e4e4e7';
  ctx.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + (chartHeight / 3) * index;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const points = fallbackData.map((val, i) => {
    const x = padding + step * i;
    const y = height - padding - (val / max) * chartHeight;
    return { x, y, value: val };
  });

  const areaGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  areaGradient.addColorStop(0, 'rgba(0,0,0,0.18)');
  areaGradient.addColorStop(1, 'rgba(0,0,0,0.02)');

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(points[points.length - 1].x, height - padding);
  ctx.lineTo(points[0].x, height - padding);
  ctx.closePath();
  ctx.fillStyle = areaGradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.fillStyle = '#111111';
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fallbackLabels[index], point.x, height - 15);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#71717a';
  ctx.font = '11px sans-serif';
  const label = metric === 'revenue' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Units';
  ctx.fillText(label, padding, 18);
}

function buildSeries(orders, range = 7, metric = 'revenue') {
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - ((range - 1) - index));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const values = days.map((date) => {
    const key = date.toISOString().slice(0, 10);
    return orders.reduce((sum, order) => {
      const orderDate = new Date(order.date || order.order_date || 0);
      if (Number.isNaN(orderDate.getTime())) {
        return sum;
      }

      return orderDate.toISOString().slice(0, 10) === key
        ? sum + getOrderValue(order, metric)
        : sum;
    }, 0);
  });

  const labels = days.map((date) => range <= 7
    ? date.toLocaleDateString(undefined, { weekday: 'short' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  return {
    values,
    labels,
    rows: days.map((date, index) => ({
      date: date.toISOString().slice(0, 10),
      label: labels[index],
      value: values[index],
    })),
  };
}

function formatOrderDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
}
