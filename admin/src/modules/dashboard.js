/**
 * Dashboard Module
 * Rich operational overview for products, orders, customers, and inventory.
 */

import { db, fetchCustomers, fetchOrders, fetchProducts } from './data.js';
import { icons } from './icons.js';
import { exportToCSV } from './export.js';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 Days', days: 7 },
  { value: '30', label: 'Last 30 Days', days: 30 },
  { value: '90', label: 'Last 90 Days', days: 90 },
];

export const renderDashboard = async (container) => {
  const [orders, products, customers] = await Promise.all([
    fetchOrders(),
    fetchProducts(),
    fetchCustomers(),
  ]);
  const settings = db.get('settings', { storeName: 'Seraphine Couture' });
  let selectedPeriod = db.get('dashboard_period', '30');

  const renderView = () => {
    const days = PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.days || 30;
    const filteredOrders = filterOrdersByPeriod(orders, days);
    const previousOrders = filterOrdersByPeriod(orders, days, days);
    const activeCustomers = filterCustomersByPeriod(customers, days);
    const revenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || order.total_amount || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total || order.total_amount || 0), 0);
    const averageOrderValue = filteredOrders.length ? revenue / filteredOrders.length : 0;
    const statusCounts = getStatusCounts(filteredOrders);
    const topProducts = getTopProducts(products, filteredOrders).slice(0, 5);
    const lowStockVariants = getLowStockVariants(products).slice(0, 6);
    const topCustomers = getTopCustomers(customers, filteredOrders).slice(0, 5);
    const recentOrders = [...orders]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 5);
    const fulfillmentRate = filteredOrders.length
      ? Math.round(((statusCounts.completed + statusCounts.shipped) / filteredOrders.length) * 100)
      : 0;
    const revenueTrend = describeTrend(revenue, previousRevenue, 'from previous window');

    container.innerHTML = `
      <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-2">
            <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">${settings.storeName}</p>
            <h2 class="text-3xl font-bold tracking-tight text-black">Operations Overview</h2>
            <p class="max-w-3xl text-sm text-zinc-500">Dashboard ini sekarang menyorot performa penjualan, kesehatan stok per varian, dan pelanggan bernilai tinggi dari data live storefront.</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select id="dashboard-period" class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 outline-none transition-all focus:border-zinc-300">
              ${PERIOD_OPTIONS.map((option) => `<option value="${option.value}" ${option.value === selectedPeriod ? 'selected' : ''}>${option.label}</option>`).join('')}
            </select>
            <button id="export-dashboard-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
              ${icons.download} Export Report
            </button>
            <button id="dashboard-open-products" class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
              ${icons.plus} Manage Products
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          ${renderKPICard('Revenue', `$${formatCompactCurrency(revenue)}`, revenueTrend.copy, revenueTrend.colorClass)}
          ${renderKPICard('Orders', filteredOrders.length.toString(), `${statusCounts.pending} pending, ${statusCounts.completed} completed`, 'text-blue-600')}
          ${renderKPICard('Active Clients', activeCustomers.length.toString(), `${topCustomers.length} high-value clients in focus`, 'text-fuchsia-600')}
          ${renderKPICard('Avg. Order Value', `$${averageOrderValue.toFixed(0)}`, `${fulfillmentRate}% fulfillment rate this period`, fulfillmentRate >= 60 ? 'text-emerald-600' : 'text-amber-600')}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div class="xl:col-span-3 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Revenue Analytics</h3>
                <p class="text-sm text-zinc-500">Pendapatan harian untuk ${days} hari terakhir.</p>
              </div>
              <div class="flex flex-wrap gap-3">
                ${renderMiniStatusCard('Pending', statusCounts.pending, 'bg-amber-50 text-amber-700 border-amber-100')}
                ${renderMiniStatusCard('Paid', statusCounts.paid, 'bg-emerald-50 text-emerald-700 border-emerald-100')}
                ${renderMiniStatusCard('Shipped', statusCounts.shipped, 'bg-blue-50 text-blue-700 border-blue-100')}
                ${renderMiniStatusCard('Completed', statusCounts.completed, 'bg-zinc-100 text-zinc-700 border-zinc-200')}
                ${renderMiniStatusCard('Cancelled', statusCounts.cancelled, 'bg-red-50 text-red-700 border-red-100')}
              </div>
            </div>
            <div class="h-[320px] w-full relative">
              <canvas id="revenueChart" class="w-full h-full"></canvas>
            </div>
          </div>

          <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Quick Actions</h3>
                <p class="text-sm text-zinc-500">Akses cepat ke pekerjaan harian.</p>
              </div>
            </div>
            <div class="grid gap-3">
              ${renderQuickAction('dashboard-open-orders', 'Review Incoming Orders', 'Check pending and paid orders now', icons.orders)}
              ${renderQuickAction('dashboard-open-products-secondary', 'Restock Inventory', 'Edit products and variant stock', icons.products)}
              ${renderQuickAction('dashboard-open-customers', 'View Top Clients', 'See customer activity and spend', icons.customers)}
            </div>
            <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-1">
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Restock Attention</p>
              <p class="text-2xl font-bold text-black">${lowStockVariants.length}</p>
              <p class="text-sm text-zinc-500">Variant stock entries are at or below 2 units.</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Top Products</h3>
                <p class="text-sm text-zinc-500">Best-selling pieces in the selected period.</p>
              </div>
              <button id="dashboard-open-products-table" class="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Open Products</button>
            </div>
            <div class="space-y-4">
              ${topProducts.length ? topProducts.map((item, index) => `
                <div class="flex items-center gap-4 rounded-xl border border-zinc-100 p-3">
                  <div class="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">${index + 1}</div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-black">${item.name}</p>
                    <p class="text-xs text-zinc-500">${item.units} units sold • $${item.revenue.toLocaleString()}</p>
                  </div>
                </div>
              `).join('') : `<p class="text-sm text-zinc-400">No sales in this period yet.</p>`}
            </div>
          </div>

          <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Low Stock Variants</h3>
                <p class="text-sm text-zinc-500">Variant-level restock alerts from live inventory.</p>
              </div>
              <button id="dashboard-restock-btn" class="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Open Inventory</button>
            </div>
            <div class="space-y-3">
              ${lowStockVariants.length ? lowStockVariants.map((entry) => `
                <div class="rounded-xl border ${entry.stock === 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'} p-3">
                  <div class="flex items-center justify-between gap-4">
                    <div>
                      <p class="text-sm font-semibold text-black">${entry.name}</p>
                      <p class="text-xs text-zinc-500">${entry.size || 'Default'} • ${entry.color || 'Default color'}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold ${entry.stock === 0 ? 'text-red-700' : 'text-amber-700'}">${entry.stock}</p>
                      <p class="text-[10px] font-bold uppercase tracking-widest ${entry.stock === 0 ? 'text-red-500' : 'text-amber-500'}">${entry.stock === 0 ? 'Out' : 'Low'}</p>
                    </div>
                  </div>
                </div>
              `).join('') : `<p class="text-sm text-zinc-400">No urgent restock alerts right now.</p>`}
            </div>
          </div>

          <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Top Clients</h3>
                <p class="text-sm text-zinc-500">Customers with the highest spend in this period.</p>
              </div>
              <button id="dashboard-open-customers-table" class="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Open Clients</button>
            </div>
            <div class="space-y-4">
              ${topCustomers.length ? topCustomers.map((client) => `
                <div class="flex items-center gap-4 rounded-xl border border-zinc-100 p-3">
                  <div class="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 uppercase shrink-0">
                    ${getInitials(client.name)}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-black">${client.name}</p>
                    <p class="text-xs text-zinc-500">${client.orders} orders • $${client.spend.toLocaleString()} spend</p>
                  </div>
                </div>
              `).join('') : `<p class="text-sm text-zinc-400">No client activity in this period yet.</p>`}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Recent Activity</h3>
                <p class="text-sm text-zinc-500">Latest live storefront orders and status updates.</p>
              </div>
              <button id="dashboard-open-activity" class="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Open Orders</button>
            </div>
            <div class="space-y-5">
              ${recentOrders.length ? recentOrders.map((order) => `
                <div class="flex items-start gap-4">
                  <div class="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                    ${icons.orders}
                  </div>
                  <div class="space-y-1 min-w-0 flex-1">
                    <p class="text-sm font-medium text-zinc-600"><span class="text-black">${order.customerName}</span> placed order <span class="text-black">#${order.id}</span></p>
                    <p class="text-xs text-zinc-500">Status: ${order.status}</p>
                    <p class="text-xs text-zinc-400">${formatDateTime(order.date)}</p>
                  </div>
                  <div class="text-sm font-medium text-black">+$${Number(order.total || 0).toLocaleString()}</div>
                </div>
              `).join('') : `<p class="text-sm text-zinc-400">No recent order activity.</p>`}
            </div>
          </div>

          <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-black">Inventory Snapshot</h3>
                <p class="text-sm text-zinc-500">Category mix and stock posture across products.</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              ${renderSnapshotCard('Products', products.length, 'Catalog items live in admin')}
              ${renderSnapshotCard('Variants', countTotalVariants(products), 'Size/color combinations tracked')}
              ${renderSnapshotCard('Units in Stock', products.reduce((sum, product) => sum + Number(product.stock || 0), 0), 'Total units across all variants')}
              ${renderSnapshotCard('Out of Stock', lowStockVariants.filter((item) => item.stock === 0).length, 'Variants requiring immediate action')}
            </div>
            <div class="space-y-3 pt-2">
              ${renderCategoryBreakdown(products)}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dashboard-period')?.addEventListener('change', (event) => {
      selectedPeriod = event.target.value;
      db.set('dashboard_period', selectedPeriod);
      renderView();
    });
    document.getElementById('export-dashboard-btn')?.addEventListener('click', () => {
      exportToCSV(filteredOrders, `seraphine_dashboard_${selectedPeriod}d`);
    });
    wireRouteButton('dashboard-open-products', 'products');
    wireRouteButton('dashboard-open-products-secondary', 'products');
    wireRouteButton('dashboard-open-products-table', 'products');
    wireRouteButton('dashboard-restock-btn', 'products');
    wireRouteButton('dashboard-open-orders', 'orders');
    wireRouteButton('dashboard-open-activity', 'orders');
    wireRouteButton('dashboard-open-customers', 'customers');
    wireRouteButton('dashboard-open-customers-table', 'customers');

    initChart(filteredOrders, days);
  };

  renderView();
};

function renderKPICard(title, value, sub, colorClass) {
  return `
    <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2 hover:border-zinc-300 transition-colors shadow-sm">
      <p class="text-sm font-medium text-zinc-400">${title}</p>
      <div class="flex items-baseline justify-between">
        <h4 class="text-2xl font-bold text-black tracking-tight">${value}</h4>
      </div>
      <p class="text-xs ${colorClass}">${sub}</p>
    </div>
  `;
}

function renderMiniStatusCard(label, value, className) {
  return `<div class="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}">${label}: ${value}</div>`;
}

function renderQuickAction(id, title, description, icon) {
  return `
    <button id="${id}" class="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50">
      <div class="mt-0.5 text-zinc-500">${icon}</div>
      <div class="space-y-1">
        <p class="text-sm font-semibold text-black">${title}</p>
        <p class="text-xs text-zinc-500">${description}</p>
      </div>
    </button>
  `;
}

function renderSnapshotCard(label, value, subcopy) {
  return `
    <div class="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-1">
      <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">${label}</p>
      <p class="text-2xl font-bold text-black">${value}</p>
      <p class="text-xs text-zinc-500">${subcopy}</p>
    </div>
  `;
}

function filterOrdersByPeriod(orders, days, offsetDays = 0) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offsetDays);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return orders.filter((order) => {
    const orderDate = new Date(order.date || order.order_date || order.created_at);
    return !Number.isNaN(orderDate.getTime()) && orderDate >= start && orderDate <= end;
  });
}

function filterCustomersByPeriod(customers, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return customers.filter((customer) => {
    const lastActive = new Date(customer.lastActive);
    return !Number.isNaN(lastActive.getTime()) && lastActive >= start;
  });
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getStatusCounts(orders) {
  return orders.reduce((counts, order) => {
    const status = normalizeStatus(order.status);
    if (status === 'pending') counts.pending += 1;
    else if (status === 'paid') counts.paid += 1;
    else if (status === 'shipped') counts.shipped += 1;
    else if (status === 'completed') counts.completed += 1;
    else if (status === 'cancelled') counts.cancelled += 1;
    return counts;
  }, { pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0 });
}

function getTopProducts(products, orders) {
  const productMap = new Map(products.map((product) => [String(product.id), product]));
  const salesMap = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const productId = String(item.productId || item.product_id || '');
      if (!productId) return;
      const current = salesMap.get(productId) || { units: 0, revenue: 0 };
      current.units += Number(item.quantity || 0);
      current.revenue += Number(item.quantity || 0) * Number(item.price || 0);
      salesMap.set(productId, current);
    });
  });

  return [...salesMap.entries()]
    .map(([productId, stats]) => ({
      id: productId,
      name: productMap.get(productId)?.name || `Product ${productId}`,
      units: stats.units,
      revenue: stats.revenue,
    }))
    .sort((left, right) => right.units - left.units || right.revenue - left.revenue);
}

function getLowStockVariants(products) {
  return products
    .flatMap((product) => (product.variantStocks || []).map((variant) => ({
      productId: product.id,
      name: product.name,
      size: variant.size,
      color: variant.color,
      stock: Number(variant.stock || 0),
    })))
    .filter((entry) => entry.stock <= 2)
    .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name));
}

function getTopCustomers(customers, orders) {
  const customerMap = new Map(customers.map((customer) => [String(customer.id), customer]));
  const spendMap = new Map();

  orders.forEach((order) => {
    const customerId = String(order.customerId || order.customer_id || '');
    if (!customerId) return;
    const current = spendMap.get(customerId) || { spend: 0, orders: 0 };
    current.spend += Number(order.total || order.total_amount || 0);
    current.orders += 1;
    spendMap.set(customerId, current);
  });

  return [...spendMap.entries()]
    .map(([customerId, stats]) => ({
      id: customerId,
      name: customerMap.get(customerId)?.name || `Client ${customerId}`,
      spend: stats.spend,
      orders: stats.orders,
    }))
    .sort((left, right) => right.spend - left.spend || right.orders - left.orders);
}

function describeTrend(currentValue, previousValue, suffix) {
  if (!previousValue && !currentValue) {
    return { copy: `No movement ${suffix}`, colorClass: 'text-zinc-400' };
  }
  if (!previousValue) {
    return { copy: `New activity ${suffix}`, colorClass: 'text-emerald-600' };
  }
  const diffPercent = Math.round(((currentValue - previousValue) / previousValue) * 100);
  if (diffPercent > 0) {
    return { copy: `Up ${diffPercent}% ${suffix}`, colorClass: 'text-emerald-600' };
  }
  if (diffPercent < 0) {
    return { copy: `Down ${Math.abs(diffPercent)}% ${suffix}`, colorClass: 'text-red-600' };
  }
  return { copy: `Flat ${suffix}`, colorClass: 'text-zinc-400' };
}

function countTotalVariants(products) {
  return products.reduce((sum, product) => sum + (product.variantStocks?.length || 0), 0);
}

function renderCategoryBreakdown(products) {
  const categories = products.reduce((map, product) => {
    const category = product.category || 'Other';
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map());

  return [...categories.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, count]) => `
      <div class="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3">
        <p class="text-sm font-medium text-black">${category}</p>
        <p class="text-xs font-bold uppercase tracking-widest text-zinc-400">${count} products</p>
      </div>
    `)
    .join('');
}

function wireRouteButton(id, route) {
  document.getElementById(id)?.addEventListener('click', () => {
    document.querySelector(`[data-route="${route}"]`)?.click();
  });
}

function formatCompactCurrency(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1000) return numeric.toLocaleString();
  return numeric.toFixed(0);
}

function getInitials(name) {
  return String(name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function initChart(orders, days) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const labels = [];
  const data = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(today.getDate() - index);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    labels.push(day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    data.push(
      orders
        .filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate >= day && orderDate < nextDay;
        })
        .reduce((sum, order) => sum + Number(order.total || 0), 0)
    );
  }

  const max = Math.max(...data, 1);
  const padding = 40;
  const width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 600;
  const height = canvas.offsetHeight || 320;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#e4e4e7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((value, index) => ({
    x: padding + (stepX * index),
    y: height - padding - ((value / max) * (height - padding * 2)),
    value,
  }));

  if (points.length) {
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(1, 'rgba(161,161,170,0.2)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#09090b';
      ctx.fill();

      if (days <= 30 || index % Math.ceil(days / 8) === 0 || index === points.length - 1) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], point.x, height - 15);
      }
    });
  }
}
