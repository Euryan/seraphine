/**
 * Customers Module
 * List and filtering.
 */

import { fetchCustomers } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

export const renderCustomers = async (container) => {
  const customers = await fetchCustomers();
  
  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Customers</h2>
        <div class="flex items-center gap-3">
          <button id="export-customers-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
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
            <input type="text" placeholder="Search customers..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
          <div class="flex items-center gap-2">
            <select class="bg-zinc-100 border-none text-sm text-zinc-500 rounded-lg px-3 py-2 focus:ring-0">
              <option>Sort by Spend</option>
              <option>Sort by Orders</option>
              <option>Recently Active</option>
            </select>
          </div>
        </div>
        <div id="customers-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('customers-table-container');
  renderTable({
    container: tableContainer,
    data: customers,
    columns: [
      { key: 'name', label: 'Customer', render: (val, item) => `
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase">
            ${val.split(' ').map(n => n[0]).join('')}
          </div>
          <div class="space-y-1">
            <p class="font-medium text-black">${val}</p>
            <p class="text-xs text-zinc-400">${item.email}</p>
          </div>
        </div>
      `},
      { key: 'phone', label: 'Phone', render: (val) => `<span class="text-zinc-400 text-xs">${val}</span>` },
      { key: 'tier', label: 'Tier', render: (val) => `<span class="text-xs font-medium text-zinc-500">${val || 'Client'}</span>` },
      { key: 'totalOrders', label: 'Orders', render: (val) => `<span class="font-medium text-black">${val}</span>` },
      { key: 'totalSpend', label: 'Total Spend', render: (val) => `<span class="font-medium text-black">$${val.toLocaleString()}</span>` },
      { key: 'lastActive', label: 'Last Active', render: (val) => `<span class="text-zinc-400 text-xs">${new Date(val).toLocaleDateString()}</span>` },
    ],
    actions: (item) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-end gap-2';
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      viewBtn.innerHTML = icons.eye;
      viewBtn.onclick = () => showCustomerDetail(item);
      
      div.appendChild(viewBtn);
      return div;
    }
  });

  document.getElementById('export-customers-btn')?.addEventListener('click', () => exportToCSV(customers, 'seraphine_customers'));
};

function showCustomerDetail(customer) {
  const content = document.createElement('div');
  content.className = 'space-y-6';
  content.innerHTML = `
    <div class="flex items-center gap-6 pb-6 border-b border-zinc-100">
      <div class="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-2xl uppercase">
        ${customer.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div class="space-y-1">
        <h3 class="text-2xl font-bold text-black">${customer.name}</h3>
        <p class="text-zinc-400">${customer.email}</p>
      </div>
    </div>
    
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-zinc-50 p-4 rounded-xl space-y-1">
        <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Orders</p>
        <p class="text-xl font-bold text-black">${customer.totalOrders}</p>
      </div>
      <div class="bg-zinc-50 p-4 rounded-xl space-y-1">
        <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Spend</p>
        <p class="text-xl font-bold text-black">$${customer.totalSpend.toLocaleString()}</p>
      </div>
      <div class="bg-zinc-50 p-4 rounded-xl space-y-1">
        <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Order</p>
        <p class="text-xl font-bold text-black">$${(customer.totalSpend / customer.totalOrders).toFixed(2)}</p>
      </div>
    </div>
    
    <div class="space-y-4">
      <h4 class="text-sm font-bold text-black uppercase tracking-wider">Contact Details</h4>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Phone</p>
          <p class="text-sm text-zinc-600">${customer.phone}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Client Tier</p>
          <p class="text-sm text-zinc-600">${customer.tier || 'Client'}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Last Active</p>
          <p class="text-sm text-zinc-600">${new Date(customer.lastActive).toLocaleString()}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">City</p>
          <p class="text-sm text-zinc-600">${customer.city || '-'}</p>
        </div>
      </div>
    </div>
  `;

  modal.show('Client Profile', content, [
    {
      label: 'Send Email',
      onClick: () => {
        toast.show(`Email sent to ${customer.email}`, 'success');
      }
    }
  ]);
}
