/**
 * UI Components Module
 * Vanilla JS components for the dashboard.
 */

import { icons } from './icons.js';

export const toast = {
  show: (message, type = 'info') => {
    const container = document.getElementById('toast-container') || createToastContainer();
    const el = document.createElement('div');
    el.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-right-full duration-300 ${
      type === 'success' ? 'bg-white border-zinc-200 text-black' : 
      type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
      'bg-white border-zinc-200 text-zinc-600'
    }`;
    
    const icon = type === 'success' ? '<circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" fill="none"/>' : 
                 type === 'error' ? '<circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/><path d="m15 9-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" fill="none"/>' : '';

    el.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24">${icon}</svg>
      <span class="text-sm font-medium">${message}</span>
    `;
    
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('animate-out', 'fade-out', 'slide-out-to-right-full');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }
};

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.className = 'fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none';
  document.body.appendChild(el);
  return el;
}

export const modal = {
  show: (title, content, actions) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200';
    
    const dialog = document.createElement('div');
    dialog.className = 'bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200';
    
    const header = `
      <div class="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-black">${title}</h3>
        <button class="close-modal p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
    
    const body = document.createElement('div');
    body.className = 'px-6 py-6 max-h-[70vh] overflow-y-auto text-zinc-600';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    
    const footer = document.createElement('div');
    footer.className = 'px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'px-4 py-2 text-sm font-medium text-zinc-500 hover:text-black transition-colors';
    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = () => closeModal();
    footer.appendChild(closeBtn);
    
    actions?.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        action.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-black hover:bg-zinc-800 text-white'
      }`;
      btn.textContent = action.label;
      btn.onclick = () => {
        action.onClick();
        closeModal();
      };
      footer.appendChild(btn);
    });
    
    dialog.innerHTML = header;
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
      overlay.classList.add('animate-out', 'fade-out');
      dialog.classList.add('animate-out', 'zoom-out-95');
      setTimeout(() => overlay.remove(), 200);
    };
    
    overlay.querySelector('.close-modal')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    return { body, closeModal };
  }
};

export const renderTable = (config) => {
  const { container, data, columns, actions } = config;
  
  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-zinc-200">
            ${columns.map(col => `<th class="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">${col.label}</th>`).join('')}
            ${actions ? '<th class="px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>' : ''}
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100">
          ${data.length === 0 ? `
            <tr>
              <td colspan="${columns.length + (actions ? 1 : 0)}" class="px-6 py-12 text-center text-zinc-400">
                <div class="flex flex-col items-center gap-3">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-20"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                  <p>No data found</p>
                </div>
              </td>
            </tr>
          ` : data.map((item, idx) => `
            <tr class="hover:bg-zinc-50 transition-colors group">
              ${columns.map(col => {
                const val = item[col.key];
                return `<td class="px-6 py-4 text-sm text-zinc-600">${col.render ? col.render(val, item) : val}</td>`;
              }).join('')}
              ${actions ? `<td class="px-6 py-4 text-right" id="actions-${idx}"></td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  if (actions) {
    data.forEach((item, idx) => {
      const actionCell = container.querySelector(`#actions-${idx}`);
      if (actionCell) actionCell.appendChild(actions(item));
    });
  }
};
