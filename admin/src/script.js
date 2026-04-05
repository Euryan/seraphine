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
import { authenticateAdmin } from './modules/data.js';

// Initialize Database
db.init();

const app = document.getElementById('root');

// Simple Router
const routes = {
  dashboard: renderDashboard,
  products: renderProducts,
  orders: renderOrders,
  customers: renderCustomers,
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
          <div class="w-16 h-16 bg-black rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-[0_0_40px_rgba(0,0,0,0.1)]">${getBrandMonogram()}</div>
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
        <div class="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">${getBrandMonogram()}</div>
          <span class="font-black tracking-tighter text-black text-xl sidebar-label">${settings.storeName}</span>
        </div>
        
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
          ${renderNavItem('dashboard', 'Dashboard', icons.dashboard)}
          ${renderNavItem('products', 'Products', icons.products)}
          ${renderNavItem('orders', 'Orders', icons.orders)}
          ${renderNavItem('customers', 'Customers', icons.customers)}
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
            <button class="relative p-2 text-zinc-500 hover:text-black transition-colors">
              ${icons.bell}
              <span class="absolute top-2 right-2 w-2 h-2 bg-black rounded-full border-2 border-white"></span>
            </button>
            <div class="h-8 w-px bg-zinc-200"></div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-black">${session.user}</p>
                <p class="text-[10px] text-zinc-400">${session.role || 'Commerce Operations'}</p>
              </div>
              <div class="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 font-bold text-xs">
                ${initials || 'AD'}
              </div>
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
