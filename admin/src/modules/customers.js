/**
 * Customers Module
 * List and filtering.
 */

import { fetchCustomers, updateCustomerMembership } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

function getCustomerSearchText(customer) {
  return [
    customer.name,
    customer.username,
    customer.email,
    customer.phone,
    customer.city,
    customer.tier,
    customer.membershipRfidUid,
  ].join(' ').toLowerCase();
}

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
            <input id="customers-search" type="text" placeholder="Search customer, email, tier, or city..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
          <div class="flex items-center gap-2">
            <select id="customers-sort" class="bg-zinc-100 border-none text-sm text-zinc-500 rounded-lg px-3 py-2 focus:ring-0">
              <option value="spend">Sort by Spend</option>
              <option value="orders">Sort by Orders</option>
              <option value="recent">Recently Active</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
        <div id="customers-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('customers-table-container');
  const searchInput = document.getElementById('customers-search');
  const sortSelect = document.getElementById('customers-sort');
  const tableConfig = {
    columns: [
      { key: 'name', label: 'Customer', render: (val, item) => `
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase">
            ${String(val || '?').split(' ').map(n => n[0]).join('')}
          </div>
          <div class="space-y-1">
            <p class="font-medium text-black">${val}</p>
            <p class="text-xs text-zinc-400">${item.email}</p>
          </div>
        </div>
      `},
      { key: 'phone', label: 'Phone', render: (val) => `<span class="text-zinc-400 text-xs">${val || '-'}</span>` },
      { key: 'tier', label: 'Tier', render: (val) => `<span class="text-xs font-medium text-zinc-500">${val || 'Client'}</span>` },
      { key: 'membershipRfidUid', label: 'RFID UID', render: (val, item) => item.membershipActive ? `<span class="text-xs font-medium text-emerald-700">${val || 'Unassigned'}</span>` : '<span class="text-xs text-zinc-400">Inactive</span>' },
      { key: 'totalOrders', label: 'Orders', render: (val) => `<span class="font-medium text-black">${val}</span>` },
      { key: 'totalSpend', label: 'Total Spend', render: (val) => `<span class="font-medium text-black">$${Number(val || 0).toLocaleString()}</span>` },
      { key: 'lastActive', label: 'Last Active', render: (val) => `<span class="text-zinc-400 text-xs">${new Date(val).toLocaleDateString()}</span>` },
    ],
    actions: (item) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-end gap-2';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      viewBtn.innerHTML = icons.eye;
      viewBtn.onclick = () => showCustomerDetail(item, () => renderCustomers(container));
      div.appendChild(viewBtn);
      return div;
    },
  };

  const getFilteredCustomers = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const sortMode = sortSelect?.value || 'spend';
    const filtered = customers.filter((customer) => !keyword || getCustomerSearchText(customer).includes(keyword));
    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortMode === 'orders') return Number(right.totalOrders || 0) - Number(left.totalOrders || 0);
      if (sortMode === 'recent') return new Date(right.lastActive || 0).getTime() - new Date(left.lastActive || 0).getTime();
      if (sortMode === 'name') return String(left.name || '').localeCompare(String(right.name || ''));
      return Number(right.totalSpend || 0) - Number(left.totalSpend || 0);
    });
    return sorted;
  };

  const renderFilteredCustomers = () => {
    renderTable({
      container: tableContainer,
      data: getFilteredCustomers(),
      columns: tableConfig.columns,
      actions: tableConfig.actions,
    });
  };

  searchInput?.addEventListener('input', renderFilteredCustomers);
  sortSelect?.addEventListener('change', renderFilteredCustomers);
  renderFilteredCustomers();

  document.getElementById('export-customers-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredCustomers(), 'seraphine_customers', [
      { key: 'id', label: 'Customer ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'city', label: 'City' },
      { key: 'tier', label: 'Tier' },
      { key: 'membershipActive', label: 'Membership Active' },
      { key: 'membershipRfidUid', label: 'RFID UID' },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalSpend', label: 'Total Spend' },
      { key: 'lastActive', label: 'Last Active' },
    ]);
  });
};

function showCustomerDetail(customer, refreshCustomers) {
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
        <p class="text-xs uppercase tracking-[0.2em] text-zinc-400">@${customer.username || customer.name}</p>
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
          <p class="text-xs text-zinc-400">Membership</p>
          <p class="text-sm text-zinc-600">${customer.membershipActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">RFID UID</p>
          <p class="text-sm text-zinc-600">${customer.membershipRfidUid || '-'}</p>
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

    <div class="space-y-4">
      <h4 class="text-sm font-bold text-black uppercase tracking-wider">Saved Address & Measurements</h4>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Address</p>
          <p class="text-sm text-zinc-600">${customer.address?.street || '-'}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">City</p>
          <p class="text-sm text-zinc-600">${customer.address?.city || customer.city || '-'}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Chest / Waist / Hip</p>
          <p class="text-sm text-zinc-600">${customer.measurements?.chest_cm || '-'} / ${customer.measurements?.waist_cm || '-'} / ${customer.measurements?.hip_cm || '-'}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-zinc-400">Fit Preference</p>
          <p class="text-sm text-zinc-600">${customer.preferences?.fitPreference || customer.measurements?.preferences || '-'}</p>
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
    },
    {
      label: 'Manage Membership',
      onClick: () => openMembershipModal(customer, refreshCustomers)
    }
  ]);
}

function openMembershipModal(customer, refreshCustomers) {
  const content = document.createElement('div');
  content.className = 'space-y-6';
  content.innerHTML = `
    <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      Membership aktif akan menampilkan RFID UID customer di kartu overview account storefront.
    </div>
    <label class="flex items-center gap-3 text-sm text-zinc-700">
      <input id="membership-active" type="checkbox" class="h-4 w-4 rounded border-zinc-300" ${customer.membershipActive ? 'checked' : ''}>
      Aktifkan membership untuk customer ini
    </label>
    <div class="space-y-2">
      <label class="text-xs font-medium uppercase tracking-wider text-zinc-400">RFID UID</label>
      <div class="flex gap-3">
        <input id="membership-rfid" type="text" value="${customer.membershipRfidUid || ''}" placeholder="RFID UID kartu membership" class="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 outline-none">
        <button id="generate-rfid" type="button" class="rounded-xl border border-zinc-200 px-4 py-3 text-xs font-medium text-zinc-700 hover:border-zinc-400">Generate</button>
      </div>
      <p class="text-xs text-zinc-400">Gunakan UID dari reader RFID atau buat kode demo baru.</p>
    </div>
  `;

  modal.show('Membership RFID', content, [
    {
      label: 'Save Membership',
      onClick: async () => {
        const active = Boolean(content.querySelector('#membership-active')?.checked);
        const rfidUid = String(content.querySelector('#membership-rfid')?.value || '').trim();
        try {
          await updateCustomerMembership(customer.userId, { active, rfidUid });
          toast.show('Customer membership updated', 'success');
          await refreshCustomers();
        } catch (err) {
          toast.show(err.message || 'Failed to update membership', 'error');
        }
      }
    }
  ]);

  content.querySelector('#generate-rfid')?.addEventListener('click', () => {
    const token = `RFID-${customer.userId}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const input = content.querySelector('#membership-rfid');
    if (input) input.value = token;
  });
}
