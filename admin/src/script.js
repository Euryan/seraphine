/**
 * Main Application Entry Point
 * Handles layout, routing, and authentication.
 */

import './index.css';
import { db } from './modules/data.js';
import { icons } from './modules/icons.js';
import { toast } from './modules/ui.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderProducts } from './modules/products.js';
import { renderOrders } from './modules/orders.js';
import { renderCustomers } from './modules/customers.js';
import { renderSettings } from './modules/settings.js';
import { renderCustomerService } from './modules/customer-service.js';
import { renderIoTDashboard, cleanupIoT } from './modules/iot-dashboard.js';
import { authenticateAdmin, fetchAdminNotifications, markAdminNotificationsRead } from './modules/data.js';

const BRAND_LOGO_PATH = '/assets/img/seraphine.jpeg';

// Initialize Database
db.init();

const app = document.getElementById('root');

// Simple Router
const routes = {
  dashboard: renderDashboard,
  products: renderProducts,
  orders: renderOrders,
  customers: renderCustomers,
  'iot-monitor': renderIoTDashboard,
  'customer-service': renderCustomerService,
  settings: renderSettings,
  reports: (container) => {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in">
        <div class="p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm">
          ${icons.reports}
        </div>
        <h2 class="text-2xl font-bold text-black">Reports Module</h2>
        <p class="text-zinc-500">Advanced analytics and reporting are coming soon.</p>
      </div>
    `;
  }
};

let currentRoute = 'dashboard';
let adminNotificationPoller = null;
let adminNotificationState = { items: [], unreadCount: 0 };

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function renderAdminNotificationItems() {
  if (!adminNotificationState.items.length) {
    return `
      <div class="px-4 py-10 text-center text-sm text-zinc-400">
        No order notifications yet.
      </div>
    `;
  }

  return adminNotificationState.items.map((item) => `
    <button type="button" data-notification-order="${item.orderId || ''}" class="flex w-full flex-col gap-1 border-b border-zinc-100 px-4 py-4 text-left transition-colors hover:bg-zinc-50 last:border-b-0 ${item.isRead ? 'bg-white' : 'bg-zinc-50/80'}">
      <div class="flex items-start justify-between gap-3">
        <p class="text-sm font-semibold text-black">${escapeHtml(item.title)}</p>
        ${item.isRead ? '' : '<span class="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-black"></span>'}
      </div>
      <p class="text-xs leading-5 text-zinc-500">${escapeHtml(item.message)}</p>
      <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">${escapeHtml(formatRelativeTime(item.createdAt))}</p>
    </button>
  `).join('');
}

function updateAdminNotificationUi() {
  const badge = document.getElementById('admin-notification-badge');
  const count = document.getElementById('admin-notification-count');
  const content = document.getElementById('admin-notification-content');

  if (badge) {
    badge.classList.toggle('hidden', adminNotificationState.unreadCount === 0);
  }
  if (count) {
    count.textContent = adminNotificationState.unreadCount > 9 ? '9+' : String(adminNotificationState.unreadCount || 0);
  }
  if (content) {
    content.innerHTML = renderAdminNotificationItems();
    content.querySelectorAll('[data-notification-order]').forEach((button) => {
      button.addEventListener('click', async () => {
        document.getElementById('admin-notification-dropdown')?.classList.add('hidden');
        await navigateTo('orders');
      });
    });
  }
}

async function refreshAdminNotificationCenter({ silent = false } = {}) {
  const session = db.get('session', null);
  if (!session) return;

  try {
    const previousUnread = Number(adminNotificationState.unreadCount || 0);
    const payload = await fetchAdminNotifications();
    adminNotificationState = {
      items: Array.isArray(payload.items) ? payload.items : [],
      unreadCount: Number(payload.unreadCount || 0),
    };
    updateAdminNotificationUi();

    if (!silent && adminNotificationState.unreadCount > previousUnread) {
      const delta = adminNotificationState.unreadCount - previousUnread;
      toast.show(`${delta} new order notification${delta > 1 ? 's' : ''}`, 'info');
    }
  } catch (error) {
    console.warn('Admin notifications unavailable', error.message);
  }
}

function setupAdminNotificationCenter() {
  const button = document.getElementById('admin-notification-btn');
  const dropdown = document.getElementById('admin-notification-dropdown');

  if (!button || !dropdown) return;

  updateAdminNotificationUi();
  refreshAdminNotificationCenter({ silent: true });

  if (adminNotificationPoller) {
    clearInterval(adminNotificationPoller);
  }
  adminNotificationPoller = window.setInterval(() => {
    refreshAdminNotificationCenter();
  }, 20000);

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    if (!willOpen) {
      return;
    }

    await refreshAdminNotificationCenter({ silent: true });
    dropdown.classList.remove('hidden');
    if (adminNotificationState.unreadCount > 0) {
      await markAdminNotificationsRead({ markAll: true });
      adminNotificationState = {
        ...adminNotificationState,
        unreadCount: 0,
        items: adminNotificationState.items.map((item) => ({ ...item, isRead: true })),
      };
      updateAdminNotificationUi();
    }
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

function getSettings() {
  return db.get('settings', {
    storeName: 'Seraphine Couture',
    storeEmail: 'atelier@seraphine.com',
    address: 'Via Montenapoleone 18, Milan, Italy',
  });
}

function getBrandWordmark() {
  return getSettings().storeName.toUpperCase();
}

function getBrandMonogram() {
  return 'S';
}

function getBrandLogoMarkup(sizeClass = 'w-16 h-16', roundedClass = 'rounded-2xl') {
  return `<img src="${BRAND_LOGO_PATH}" alt="Seraphine logo" class="${sizeClass} ${roundedClass} object-cover border border-zinc-200 bg-white shadow-[0_0_40px_rgba(0,0,0,0.08)]" referrerpolicy="no-referrer">`;
}

function init() {
  const session = db.get('session', null);
  const theme = db.get('theme', 'light');
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  
  if (!session) {
    renderLogin();
  } else {
    renderLayout();
    navigateTo(currentRoute);
  }
}

function renderLogin() {
  const settings = getSettings();
  app.innerHTML = `
    <div class="min-h-screen bg-zinc-50 flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div class="w-full max-w-md space-y-12">
        <div class="text-center space-y-4">
          <div class="mx-auto flex justify-center">${getBrandLogoMarkup()}</div>
          <h1 class="text-4xl font-black tracking-tighter text-black">${getBrandWordmark()}</h1>
          <p class="text-zinc-500 text-sm font-medium uppercase tracking-widest">Commerce Control Room</p>
        </div>
        
        <div class="bg-white border border-zinc-200 rounded-3xl p-8 space-y-8 shadow-xl">
          <div class="space-y-2 text-center">
            <h2 class="text-xl font-bold text-black">Sign In</h2>
            <p class="text-xs text-zinc-500">Enter your credentials to access the dashboard</p>
          </div>
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
              <input type="email" id="login-email" value="admin@seraphine.com" class="w-full bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-black focus:ring-1 focus:ring-zinc-400 transition-all outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Password</label>
              <input type="password" id="login-password" value="password" class="w-full bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-black focus:ring-1 focus:ring-zinc-400 transition-all outline-none">
            </div>
          </div>
          
          <button id="login-btn" class="w-full bg-black hover:bg-zinc-800 text-white font-bold py-4 rounded-xl transition-all shadow-xl active:scale-[0.98]">
            Sign In to Dashboard
          </button>
          
          <div class="text-center">
            <p class="text-xs text-zinc-400">Demo Credentials: admin@seraphine.com / password</p>
            <p class="text-[11px] text-zinc-400 mt-2">Akun tambahan juga bisa dibuat dari menu Customer Service setelah login.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    try {
      const account = await authenticateAdmin(email, pass);
      db.set('session', {
        user: account.name,
        email: account.email,
        role: account.role,
        source: account.source,
      });
      toast.show(`Welcome back, ${account.name}`, 'success');
      init();
    } catch (error) {
      toast.show(error.message || 'Invalid credentials', 'error');
    }
  });
}

function renderLayout() {
  const settings = getSettings();
  const session = db.get('session', null) || { user: 'Admin User', email: 'admin@seraphine.com', role: 'Commerce Operations' };
  const initials = String(session.user || 'AD').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  app.innerHTML = `
    <div class="min-h-screen bg-white text-zinc-600 flex overflow-hidden">
      <!-- Sidebar -->
      <aside id="sidebar" class="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col transition-all duration-300 relative z-50">
        <div class="p-6 flex items-center gap-4 border-b border-zinc-200">
        <div class="shrink-0">${getBrandLogoMarkup('w-10 h-10', 'rounded-xl')}</div>
          <span class="font-black tracking-tighter text-black text-xl sidebar-label">${settings.storeName}</span>
        </div>
        
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
          ${renderNavItem('dashboard', 'Dashboard', icons.dashboard)}
          ${renderNavItem('products', 'Products', icons.products)}
          ${renderNavItem('orders', 'Orders', icons.orders)}
          ${renderNavItem('customers', 'Customers', icons.customers)}
          ${renderNavItem('iot-monitor', 'IoT Monitor', `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-2 .5-4 2-5.5"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4c-1 .1-1.97-.5-2.47-1.4"/><path d="M12 22a9.97 9.97 0 0 0 8-4"/><path d="M18 12c0 2-.5 4-2 5.5"/><circle cx="12" cy="12" r="2"/></svg>`)}
          ${renderNavItem('reports', 'Reports', icons.reports)}
          <div class="pt-8 pb-2 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest sidebar-label">System</div>
          ${renderNavItem('customer-service', 'Customer Service', icons.customerService)}
          ${renderNavItem('settings', 'Settings', icons.settings)}
        </nav>
        
        <div class="p-4 border-t border-zinc-200">
          <button id="logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            ${icons.logout} <span class="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col min-w-0 relative">
        <!-- Navbar -->
        <header class="h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div class="flex items-center gap-4">
            <button id="toggle-sidebar" class="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
            <div class="relative hidden md:block">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                ${icons.search}
              </div>
              <input type="text" placeholder="Global search ( / )" class="bg-zinc-100 border border-zinc-200 rounded-full pl-10 pr-4 py-1.5 text-xs text-zinc-600 focus:ring-1 focus:ring-zinc-300 w-64 transition-all focus:w-80 outline-none">
            </div>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="relative">
            <button id="admin-notification-btn" class="relative p-2 text-zinc-500 hover:text-black transition-colors">
              ${icons.bell}
              <span id="admin-notification-badge" class="absolute -right-1 -top-1 hidden min-w-5 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                <span id="admin-notification-count">0</span>
              </span>
            </button>
            <div id="admin-notification-dropdown" class="absolute right-0 top-full z-50 mt-3 hidden w-[24rem] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
              <div class="flex items-center justify-between border-b border-zinc-100 px-4 py-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Notifications</p>
                  <p class="mt-1 text-sm font-semibold text-black">Order activity</p>
                </div>
              </div>
              <div id="admin-notification-content" class="max-h-[26rem] overflow-y-auto"></div>
            </div>
            </div>
            <div class="h-8 w-px bg-zinc-200"></div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-black">${session.user}</p>
                <p class="text-[10px] text-zinc-400">${session.role || 'Commerce Operations'}</p>
              </div>
              <img src="${BRAND_LOGO_PATH}" alt="Seraphine logo" class="w-10 h-10 rounded-full border border-zinc-200 object-cover bg-white" referrerpolicy="no-referrer">
            </div>
          </div>
        </header>
        
        <!-- Content Area -->
        <div id="main-content" class="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full">
          <!-- Module content injected here -->
        </div>
      </main>
    </div>
  `;

  // Event Listeners
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (adminNotificationPoller) {
      clearInterval(adminNotificationPoller);
      adminNotificationPoller = null;
    }
    db.set('session', null);
    toast.show('Logged out successfully', 'info');
    init();
  });

  document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('w-64');
    sidebar.classList.toggle('w-20');
    document.querySelectorAll('.sidebar-label').forEach(el => el.classList.toggle('hidden'));
  });

  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      const route = e.currentTarget.dataset.route;
      navigateTo(route);
    });
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      document.querySelector('header input')?.focus();
    }
  });

  setupAdminNotificationCenter();
}

function renderNavItem(route, label, icon) {
  return `
    <button data-route="${route}" class="nav-item w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
      currentRoute === route ? 'bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
    }">
      <span class="shrink-0">${icon}</span>
      <span class="sidebar-label">${label}</span>
    </button>
  `;
}

async function navigateTo(route) {
  if (!routes[route]) return;
  // Cleanup IoT SSE when navigating away
  if (currentRoute === 'iot-monitor' && route !== 'iot-monitor') {
    cleanupIoT();
  }
  currentRoute = route;
  
  // Update UI
  document.querySelectorAll('.nav-item').forEach(el => {
    const r = el.dataset.route;
    if (r === route) {
      el.classList.add('bg-black', 'text-white');
      el.classList.remove('text-zinc-500', 'hover:text-black', 'hover:bg-zinc-100');
    } else {
      el.classList.remove('bg-black', 'text-white');
      el.classList.add('text-zinc-500', 'hover:text-black', 'hover:bg-zinc-100');
    }
  });

  const content = document.getElementById('main-content');
  content.innerHTML = '<div class="flex items-center justify-center h-full"><div class="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div></div>';
  
  setTimeout(async () => {
    await routes[route](content);
  }, 300);
}

// Start App
init();
