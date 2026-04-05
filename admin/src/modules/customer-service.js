import { createAccessAccount, deleteAccessAccount, fetchAccessAccounts, updateAccessAccount, db } from './data.js';
import { icons } from './icons.js';
import { modal, toast } from './ui.js';

export const renderCustomerService = async (container) => {
  const accounts = await fetchAccessAccounts();
  const demoAccount = accounts.find((account) => account.source === 'demo');
  const customAccounts = accounts.filter((account) => account.source !== 'demo');
  const currentSession = db.get('session', null);
  const activeAccounts = customAccounts.filter((account) => account.active !== false).length;

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-1">
          <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Admin Access Control</p>
          <h2 class="text-3xl font-bold tracking-tight text-black">Customer Service</h2>
          <p class="max-w-3xl text-sm text-zinc-500">Kelola akun yang dapat mengakses dashboard admin. Credential demo bawaan tetap aktif untuk sementara dan tidak akan dihapus dari halaman ini.</p>
        </div>
        <button id="add-access-account-btn" class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
          ${icons.plus} Add Access Account
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${renderStatCard('Demo Credential', '1', 'Fallback access tetap tersedia', 'text-zinc-500')}
        ${renderStatCard('Custom Accounts', customAccounts.length.toString(), `${activeAccounts} akun aktif bisa login`, activeAccounts > 0 ? 'text-emerald-600' : 'text-zinc-400')}
        ${renderStatCard('Current Session', currentSession?.email || '-', currentSession ? `${currentSession.role || 'Admin'} sedang login` : 'Tidak ada sesi aktif', 'text-blue-600')}
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-6 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-black">Access Accounts</h3>
              <p class="text-sm text-zinc-500">Akun tambahan untuk tim customer service atau operasional.</p>
            </div>
          </div>
          <div class="divide-y divide-zinc-100">
            ${renderDemoRow(demoAccount)}
            ${customAccounts.length ? customAccounts.map((account) => renderAccountRow(account, currentSession)).join('') : `
              <div class="p-10 text-center text-zinc-400">
                <div class="mx-auto mb-4 w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">${icons.customerService}</div>
                <p class="text-sm">Belum ada akun tambahan. Tambahkan akun agar tim lain bisa login ke admin.</p>
              </div>
            `}
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="text-lg font-semibold text-black">How It Works</h3>
            <div class="space-y-3 text-sm text-zinc-500">
              <p>1. Tambahkan akun baru dengan nama, email, password, dan role.</p>
              <p>2. Akun aktif langsung bisa dipakai untuk login di halaman admin.</p>
              <p>3. Akun nonaktif akan tersimpan, tetapi tidak bisa login.</p>
              <p>4. Credential demo bawaan admin@seraphine.com / password tetap tersedia sampai Anda memutuskan mengganti sistem login.</p>
            </div>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-2">
            <p class="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">Database-backed Access</p>
            <p class="text-sm text-amber-900">Akun tambahan sekarang disimpan di database backend. Session admin masih disimpan lokal di browser, tetapi source akunnya sudah dari server.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('add-access-account-btn')?.addEventListener('click', () => {
    showAccessAccountModal();
  });

  customAccounts.forEach((account) => {
    document.getElementById(`edit-access-${account.id}`)?.addEventListener('click', () => showAccessAccountModal(account));
    document.getElementById(`delete-access-${account.id}`)?.addEventListener('click', () => showDeleteAccountModal(account, currentSession));
  });
};

function renderStatCard(title, value, subtitle, colorClass) {
  return `
    <div class="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2 shadow-sm">
      <p class="text-sm font-medium text-zinc-400">${title}</p>
      <p class="text-2xl font-bold text-black break-all">${value}</p>
      <p class="text-xs ${colorClass}">${subtitle}</p>
    </div>
  `;
}

function renderDemoRow(account) {
  return `
    <div class="p-5 bg-zinc-50/80">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">DEMO</div>
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex items-center flex-wrap gap-2">
            <p class="text-sm font-semibold text-black">${account.name}</p>
            <span class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fixed Credential</span>
            <span class="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active</span>
          </div>
          <p class="text-sm text-zinc-500">${account.email}</p>
          <p class="text-xs text-zinc-400">Role: ${account.role} • Password: ${account.passwordHint || 'password'}</p>
        </div>
      </div>
    </div>
  `;
}

function renderAccountRow(account, currentSession) {
  const isCurrent = currentSession?.email === account.email;
  return `
    <div class="p-5">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold text-xs shrink-0 uppercase">${getInitials(account.name)}</div>
        <div class="min-w-0 flex-1 space-y-1">
          <div class="flex items-center flex-wrap gap-2">
            <p class="text-sm font-semibold text-black">${account.name}</p>
            <span class="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">${account.role}</span>
            <span class="rounded-full border ${account.active !== false ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-zinc-200 bg-zinc-100 text-zinc-500'} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">${account.active !== false ? 'Active' : 'Inactive'}</span>
            ${isCurrent ? '<span class="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">Current Session</span>' : ''}
          </div>
          <p class="text-sm text-zinc-500">${account.email}</p>
          <p class="text-xs text-zinc-400">Password is stored securely • Created ${formatDate(account.createdAt)}</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="edit-access-${account.id}" class="p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg">${icons.edit}</button>
          <button id="delete-access-${account.id}" class="p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg">${icons.trash}</button>
        </div>
      </div>
    </div>
  `;
}

function showAccessAccountModal(account = null) {
  const content = document.createElement('div');
  content.className = 'space-y-5';
  content.innerHTML = `
    <div class="space-y-2">
      <label class="text-xs font-bold uppercase tracking-widest text-zinc-400">Full Name</label>
      <input id="cs-name" type="text" value="${account?.name || ''}" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none focus:ring-1 focus:ring-zinc-300">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-bold uppercase tracking-widest text-zinc-400">Email</label>
      <input id="cs-email" type="email" value="${account?.email || ''}" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none focus:ring-1 focus:ring-zinc-300">
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-bold uppercase tracking-widest text-zinc-400">Password</label>
        <input id="cs-password" type="text" value="" placeholder="${account ? 'Kosongkan jika tidak ingin mengganti password' : 'Minimal 4 karakter'}" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none focus:ring-1 focus:ring-zinc-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs font-bold uppercase tracking-widest text-zinc-400">Role</label>
        <select id="cs-role" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-black outline-none focus:ring-1 focus:ring-zinc-300">
          ${['Customer Service', 'Operations', 'Supervisor'].map((role) => `<option value="${role}" ${account?.role === role ? 'selected' : ''}>${role}</option>`).join('')}
        </select>
      </div>
    </div>
    <label class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
      <input id="cs-active" type="checkbox" class="rounded border-zinc-300" ${account?.active !== false ? 'checked' : ''}>
      <span>Aktifkan akun agar bisa login ke dashboard admin</span>
    </label>
  `;

  modal.show(account ? 'Edit Access Account' : 'Add Access Account', content, [
    {
      label: account ? 'Update Account' : 'Create Account',
      onClick: async () => {
        const payload = {
          name: document.getElementById('cs-name').value,
          email: document.getElementById('cs-email').value,
          password: document.getElementById('cs-password').value,
          role: document.getElementById('cs-role').value,
          active: document.getElementById('cs-active').checked,
        };

        try {
          if (account) {
            await updateAccessAccount(account.id, payload);
            toast.show('Access account updated', 'success');
          } else {
            await createAccessAccount(payload);
            toast.show('Access account created', 'success');
          }
          await renderCustomerService(document.getElementById('main-content'));
        } catch (error) {
          toast.show(error.message, 'error');
        }
      }
    }
  ]);
}

function showDeleteAccountModal(account, currentSession) {
  if (currentSession?.email === account.email) {
    toast.show('Akun yang sedang dipakai login tidak bisa dihapus sekarang.', 'error');
    return;
  }

  modal.show(
    'Delete Access Account',
    `Akun <strong>${account.name}</strong> dengan email <strong>${account.email}</strong> akan dihapus dari akses admin lokal.`,
    [
      {
        label: 'Delete Account',
        variant: 'danger',
        onClick: async () => {
          await deleteAccessAccount(account.id);
          toast.show('Access account deleted', 'success');
          await renderCustomerService(document.getElementById('main-content'));
        }
      }
    ]
  );
}

function getInitials(name) {
  return String(name || 'CS')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}