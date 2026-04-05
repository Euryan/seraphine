/**
 * Settings Module
 * Store and profile settings.
 */

import { db } from './data.js';
import { icons } from './icons.js';
import { toast, modal } from './ui.js';

export const renderSettings = (container) => {
  const settings = db.get('settings', { storeName: 'Seraphine Couture', storeEmail: 'atelier@seraphine.com', logo: '', address: '', theme: 'light' });
  const currentTheme = db.get('theme', 'light');
  const session = db.get('session', null);
  
  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Settings</h2>
        <button id="save-settings-btn" class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
          Save Changes
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <!-- Store Settings -->
          <div class="bg-white border border-zinc-200 rounded-2xl p-8 space-y-8 shadow-sm">
            <div class="space-y-1">
              <h3 class="text-lg font-semibold text-black">Store Configuration</h3>
              <p class="text-sm text-zinc-500">Manage your store's public information and branding.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Store Name</label>
                <input type="text" id="s-name" value="${settings.storeName}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Store Email</label>
                <input type="email" id="s-email" value="${settings.storeEmail || 'atelier@seraphine.com'}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
              </div>
            </div>
            
            <div class="space-y-2">
              <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Store Address</label>
              <textarea id="s-address" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300 h-24">${settings.address}</textarea>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-red-50 border border-red-100 rounded-2xl p-8 space-y-6 shadow-sm">
            <div class="space-y-1">
              <h3 class="text-lg font-semibold text-red-600">Danger Zone</h3>
              <p class="text-sm text-red-400">Irreversible actions for your store data.</p>
            </div>
            <div class="flex items-center justify-between p-4 bg-red-100/50 border border-red-100 rounded-xl">
              <div class="space-y-1">
                <p class="text-sm font-medium text-red-800">Reset All Data</p>
                <p class="text-xs text-red-400">Clear all products, orders, and customers from localStorage.</p>
              </div>
              <button id="reset-data-btn" class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm">
                Reset Data
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-8">
          <!-- Theme Settings -->
          <div class="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6 shadow-sm">
            <h3 class="text-lg font-semibold text-black">Appearance</h3>
            <div class="space-y-4">
              <button id="theme-light-btn" class="w-full flex items-center justify-between p-3 rounded-xl border transition-all ${currentTheme === 'light' ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-50 border-zinc-200 opacity-50'}">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-white border border-zinc-300"></div>
                  <span class="text-sm font-medium text-black">Light Mode</span>
                </div>
                ${currentTheme === 'light' ? `<div class="w-2 h-2 bg-black rounded-full"></div>` : ''}
              </button>
              <button id="theme-dark-btn" class="w-full flex items-center justify-between p-3 rounded-xl border transition-all ${currentTheme === 'dark' ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-50 border-zinc-200 opacity-50'}">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-black border border-zinc-800"></div>
                  <span class="text-sm font-medium text-black">Dark Mode</span>
                </div>
                ${currentTheme === 'dark' ? `<div class="w-2 h-2 bg-black rounded-full"></div>` : ''}
              </button>
            </div>
          </div>

          <!-- Admin Profile -->
          <div class="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6 shadow-sm">
            <h3 class="text-lg font-semibold text-black">Admin Profile</h3>
            <div class="flex flex-col items-center gap-4 py-4">
              <div class="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 border-2 border-zinc-200">
                ${icons.customers}
              </div>
              <div class="text-center space-y-1">
                <p class="text-lg font-bold text-black">${session?.user || 'Admin User'}</p>
                <p class="text-sm text-zinc-400">${session?.email || 'admin@seraphine.com'}</p>
              </div>
            </div>
            <button class="w-full py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-black rounded-lg transition-all border border-zinc-200">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const updateTheme = (theme) => {
    db.set('theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    renderSettings(container);
    toast.show(`Theme changed to ${theme} mode`, 'info');
  };

  document.getElementById('theme-light-btn')?.addEventListener('click', () => updateTheme('light'));
  document.getElementById('theme-dark-btn')?.addEventListener('click', () => updateTheme('dark'));

  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const name = document.getElementById('s-name').value;
    const storeEmail = document.getElementById('s-email').value;
    const address = document.getElementById('s-address').value;
    db.set('settings', { ...settings, storeName: name, storeEmail, address });
    toast.show('Settings saved successfully', 'success');
  });

  document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    modal.show('Reset Data', 'This will permanently delete all your data and reset the store to its initial state. Are you sure?', [
      {
        label: 'Reset Everything',
        variant: 'danger',
        onClick: () => {
          db.reset();
          window.location.reload();
        }
      }
    ]);
  });
};
