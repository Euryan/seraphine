/**
 * Orders Module
 * Table, status update, and shipping labels.
 */

import { db, fetchOrders, fetchProducts, updateOrderStatus } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

export const renderOrders = async (container) => {
  const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()]);
  
  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Orders</h2>
        <div class="flex items-center gap-3">
          <button id="export-orders-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input type="text" placeholder="Search orders..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
          <div class="flex items-center gap-2">
            <select class="bg-zinc-100 border-none text-sm text-zinc-500 rounded-lg px-3 py-2 focus:ring-0">
              <option>All Status</option>
              <option>Pending</option>
              <option>Paid</option>
              <option>Shipped</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>
        <div id="orders-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('orders-table-container');
  renderTable({
    container: tableContainer,
    data: orders,
    columns: [
      { key: 'id', label: 'Order ID', render: (val) => `<span class="font-mono text-xs font-bold text-black">${val}</span>` },
      { key: 'customerName', label: 'Customer', render: (val) => `<span class="text-zinc-600">${val}</span>` },
      { key: 'total', label: 'Total', render: (val) => `<span class="font-medium text-black">$${val}</span>` },
      { key: 'status', label: 'Status', render: (val) => `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
          val === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
          val === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
          val === 'Completed' ? 'bg-zinc-100 text-zinc-600 border border-zinc-200' :
          'bg-red-50 text-red-600 border border-red-100'
        }">${val}</span>
      `},
      { key: 'date', label: 'Date', render: (val) => `<span class="text-zinc-400 text-xs">${new Date(val).toLocaleDateString()}</span>` },
    ],
    actions: (item) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-end gap-2';
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      viewBtn.innerHTML = icons.eye;
      viewBtn.onclick = () => showOrderDetail(item);
      
      const printBtn = document.createElement('button');
      printBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      printBtn.innerHTML = icons.printer;
      printBtn.onclick = () => showShippingLabel(item);
      
      div.appendChild(viewBtn);
      div.appendChild(printBtn);
      return div;
    }
  });

  document.getElementById('export-orders-btn')?.addEventListener('click', () => exportToCSV(orders, 'seraphine_orders'));
};

function showOrderDetail(order) {
  fetchProducts().then((products) => {
  const content = document.createElement('div');
  content.className = 'space-y-6';
  content.innerHTML = `
    <div class="grid grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Customer Information</p>
          <p class="text-sm text-black font-medium">${order.customerName}</p>
          <p class="text-xs text-zinc-400">ID: ${order.customerId}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Shipping Address</p>
          <p class="text-sm text-zinc-600 leading-relaxed">${order.address}</p>
        </div>
      </div>
      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Order Status</p>
          <select id="update-status" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-3 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
            <option ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option ${order.status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Order Date</p>
          <p class="text-sm text-zinc-600">${new Date(order.date).toLocaleString()}</p>
        </div>
      </div>
    </div>
    
    <div class="space-y-3 pt-4 border-t border-zinc-100">
      <p class="text-xs font-medium text-zinc-400 uppercase">Order Items</p>
      <div class="space-y-2">
        ${order.items.map(item => {
          const productId = item.productId || item.product_id;
          const product = products.find((entry) => entry.id === productId);
          return `
          <div class="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
            <div class="flex items-center gap-3">
              <img src="${product?.image || ''}" class="w-10 h-10 rounded bg-zinc-100 object-cover" referrerPolicy="no-referrer">
              <div class="space-y-0.5">
                <p class="text-sm font-medium text-black">${product?.name || `Product ${productId}`}</p>
                <p class="text-xs text-zinc-400">Size: ${item.size || '-'} • Color: ${item.color || '-'} • Qty: ${item.quantity} x $${item.price.toLocaleString()}</p>
              </div>
            </div>
            <p class="text-sm font-bold text-black">$${(item.quantity * item.price).toLocaleString()}</p>
          </div>
        `;}).join('')}
      </div>
      <div class="flex items-center justify-between pt-4">
        <p class="text-lg font-bold text-black">Total Amount</p>
        <p class="text-2xl font-bold text-black">$${order.total}</p>
      </div>
    </div>
  `;

  modal.show(`Order Detail: ${order.id}`, content, [
    {
      label: 'Update Status',
      onClick: async () => {
        const newStatus = document.getElementById('update-status').value;
        await updateOrderStatus(order.id, newStatus);
        toast.show(`Order status updated to ${newStatus}`, 'success');
        await renderOrders(document.getElementById('main-content'));
      }
    }
  ]);
  });
}

function showShippingLabel(order) {
  const settings = db.get('settings', {
    storeName: 'Seraphine Couture',
    address: 'Via Montenapoleone 18, Milan, Italy',
  });
  const content = document.createElement('div');
  content.className = 'p-8 bg-white text-black space-y-8 print-label';
  content.innerHTML = `
    <div class="flex justify-between items-start border-b-2 border-black pb-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-black uppercase tracking-tighter">${settings.storeName}</h1>
        <p class="text-xs font-bold">EXPRESS SHIPPING</p>
      </div>
      <div class="text-right">
        <p class="text-xs font-bold uppercase">Order ID</p>
        <p class="text-lg font-black">${order.id}</p>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-12">
      <div class="space-y-2">
        <p class="text-[10px] font-black uppercase text-zinc-500">Ship From</p>
        <p class="text-sm font-bold">Seraphine Atelier</p>
        <p class="text-xs leading-tight">${settings.address.replace(/, /g, '<br>')}</p>
      </div>
      <div class="space-y-2">
        <p class="text-[10px] font-black uppercase text-zinc-500">Ship To</p>
        <p class="text-sm font-bold">${order.customerName}</p>
        <p class="text-xs leading-tight">${order.address.replace(', ', '<br>')}</p>
      </div>
    </div>
    
    <div class="border-2 border-black p-4 flex flex-col items-center gap-4">
      <div class="w-full h-24 bg-black flex items-center justify-center">
        <!-- Simulated Barcode -->
        <div class="flex gap-1 h-16 items-stretch">
          ${Array.from({length: 40}).map(() => `<div class="bg-white" style="width: ${Math.random() > 0.5 ? '2px' : '4px'}"></div>`).join('')}
        </div>
      </div>
      <p class="text-xs font-black tracking-[0.5em]">${order.id.replace('-', '')}0000X</p>
    </div>
    
    <div class="flex justify-between items-end pt-4">
      <div class="space-y-1">
        <p class="text-[10px] font-black uppercase text-zinc-500">Weight</p>
        <p class="text-sm font-bold">1.25 KG</p>
      </div>
      <div class="text-right space-y-1">
        <p class="text-[10px] font-black uppercase text-zinc-500">Date</p>
        <p class="text-sm font-bold">${new Date().toLocaleDateString()}</p>
      </div>
    </div>
  `;

  modal.show('Shipping Label Preview', content, [
    {
      label: 'Print Label',
      onClick: () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Shipping Label - ${order.id}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  body { padding: 0; margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body class="p-8">
              ${content.outerHTML}
              <script>
                window.onload = () => {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  ]);
}
