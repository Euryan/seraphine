/**
 * Dashboard Module
 * KPIs and Charts.
 */

import { fetchCustomers, fetchOrders, fetchProducts } from './data.js';
import { icons } from './icons.js';
import { exportToCSV } from './export.js';

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
  const chartData = buildRevenueSeries(orders);

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

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Sales Chart -->
        <div class="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-black">Revenue Analytics</h3>
            <select class="bg-zinc-100 border-none text-xs text-zinc-500 rounded-md px-2 py-1 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
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
    exportToCSV(orders, 'nexus_orders_report');
  });

  initChart(chartData.values, chartData.labels);
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

function initChart(data, labels) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fallbackData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const fallbackLabels = labels.length ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const max = Math.max(...fallbackData, 1);
  const padding = 40;
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  
  canvas.width = width;
  canvas.height = height;

  const barWidth = (width - padding * 2) / fallbackData.length;
  
  ctx.clearRect(0, 0, width, height);
  
  fallbackData.forEach((val, i) => {
    const barHeight = (val / max) * (height - padding * 2);
    const x = padding + i * barWidth + 10;
    const y = height - padding - barHeight;
    
    // Draw bar
    const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#f4f4f5');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth - 20, barHeight, 4);
    ctx.fill();
    
    // Draw label
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fallbackLabels[i], x + (barWidth - 20) / 2, height - 15);
  });
}

function buildRevenueSeries(orders) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
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
        ? sum + Number(order.total ?? order.total_amount ?? 0)
        : sum;
    }, 0);
  });

  const labels = days.map((date) => date.toLocaleDateString(undefined, { weekday: 'short' }));
  return { values, labels };
}

function formatOrderDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
}
