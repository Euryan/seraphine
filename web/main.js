import './style.css';
import { getProductById, loadProducts } from './js/data.js';
import { state, updateCartBadge, restoreState, clearAuthState, setAccountSection } from './js/state.js';
import { Pages } from './js/pages.js';
import {
    toggleWishlist,
    addToCart,
    removeFromCart,
    handleLogin,
    handleRegister,
    handleCheckout,
    submitProductReview,
    fetchCart,
    fetchWishlist,
    fetchOrders,
    fetchAccountProfile,
    fetchUserNotifications,
    markUserNotificationsRead,
    saveAccountProfile,
    saveAccountAddress,
    saveAccountPreferences,
    saveAccountMeasurements,
} from './js/logic.js';
import { initChatbot, setChatPageContext } from './js/chatbot.js';
import { openSizeAdvisor } from './js/size-advisor.js';

let userNotificationPoller = null;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRelativeTime(value) {
    if (!value) return 'Baru saja';
    const date = new Date(value);
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString();
}

function getAdminUrl() {
    const { protocol, hostname, port, origin } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocalHost && port === '4173') {
        return `${protocol}//${hostname}:3101/`;
    }

    return `${origin}/control-room/`;
}

function syncAdminLinks() {
    const adminUrl = getAdminUrl();
    document.querySelectorAll('[data-admin-link]').forEach((link) => {
        link.setAttribute('href', adminUrl);
    });
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu?.classList.add('translate-x-full');
}

function showNotificationPreview(message) {
    let container = document.getElementById('seraphine-notification-preview');
    if (!container) {
        container = document.createElement('div');
        container.id = 'seraphine-notification-preview';
        container.className = 'fixed right-4 top-24 z-[120] flex w-[min(92vw,22rem)] flex-col gap-3';
        document.body.appendChild(container);
    }

    const card = document.createElement('div');
    card.className = 'rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-xl';
    card.textContent = message;
    container.appendChild(card);

    window.setTimeout(() => {
        card.remove();
        if (!container.children.length) {
            container.remove();
        }
    }, 2600);
}

function renderUserNotificationItems() {
    if (!Array.isArray(state.notifications) || state.notifications.length === 0) {
        return `
            <div class="px-4 py-10 text-center text-sm text-zinc-400">
                Belum ada notifikasi order.
            </div>
        `;
    }

    return state.notifications.map((item) => `
        <button type="button" data-user-notification-order="${item.orderId || ''}" class="flex w-full flex-col gap-1 border-b border-zinc-100 px-4 py-4 text-left transition-colors hover:bg-zinc-50 last:border-b-0 ${item.isRead ? 'bg-white' : 'bg-zinc-50/80'}">
            <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-semibold text-zinc-900">${escapeHtml(item.title)}</p>
                ${item.isRead ? '' : '<span class="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-zinc-900"></span>'}
            </div>
            <p class="text-xs leading-5 text-zinc-500">${escapeHtml(item.message)}</p>
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">${escapeHtml(formatRelativeTime(item.createdAt))}</p>
        </button>
    `).join('');
}

function updateUserNotificationElements() {
    const badge = document.getElementById('user-notification-badge');
    const count = document.getElementById('user-notification-count');
    const content = document.getElementById('user-notification-content');

    if (badge) {
        badge.classList.toggle('hidden', Number(state.notificationUnreadCount || 0) === 0);
    }
    if (count) {
        count.textContent = Number(state.notificationUnreadCount || 0) > 9 ? '9+' : String(Number(state.notificationUnreadCount || 0));
    }
    if (content) {
        content.innerHTML = renderUserNotificationItems();
        content.querySelectorAll('[data-user-notification-order]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                document.getElementById('user-notification-dropdown')?.classList.add('hidden');
                closeMobileMenu();
                window.navigate('orders');
            });
        });
    }
}

async function refreshUserNotificationCenter({ silent = false } = {}) {
    if (!state.user || !state.token) {
        state.notifications = [];
        state.notificationUnreadCount = 0;
        updateUserNotificationElements();
        return;
    }

    try {
        const previousUnread = Number(state.notificationUnreadCount || 0);
        await fetchUserNotifications();
        updateUserNotificationElements();

        if (!silent && Number(state.notificationUnreadCount || 0) > previousUnread) {
            const latest = state.notifications[0];
            if (latest?.message) {
                const preview = latest.message.length > 88 ? `${latest.message.slice(0, 88)}...` : latest.message;
                showNotificationPreview(preview);
            }
        }
    } catch (error) {
        console.warn('User notifications unavailable', error.message);
    }
}

function ensureUserNotificationPolling() {
    if (!state.user || !state.token) {
        if (userNotificationPoller) {
            clearInterval(userNotificationPoller);
            userNotificationPoller = null;
        }
        state.notifications = [];
        state.notificationUnreadCount = 0;
        return;
    }

    if (userNotificationPoller) {
        return;
    }

    userNotificationPoller = window.setInterval(() => {
        refreshUserNotificationCenter();
    }, 20000);
}

function syncMobileAuthControls() {
    const mobileAuthLink = document.getElementById('mobile-auth-link');
    const mobileOrdersLink = document.getElementById('mobile-orders-link');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if (!mobileAuthLink || !mobileOrdersLink || !mobileLogoutBtn) {
        return;
    }

    if (state.user) {
        mobileAuthLink.textContent = 'My Account';
        mobileAuthLink.setAttribute('data-link', 'account');
        mobileOrdersLink.classList.remove('hidden');
        mobileLogoutBtn.classList.remove('hidden');
    } else {
        mobileAuthLink.textContent = 'Sign In';
        mobileAuthLink.setAttribute('data-link', 'login');
        mobileOrdersLink.classList.add('hidden');
        mobileLogoutBtn.classList.add('hidden');
    }

    mobileLogoutBtn.onclick = () => {
        closeMobileMenu();
        window.handleLogout();
    };
}

export function navigate(page, params = {}) {
    restoreState();
    state.currentPage = page;
    if (page === 'account') {
        setAccountSection(params.section || state.accountSection || 'overview');
    }
    if (params.productId) {
        state.currentProduct = getProductById(params.productId);
        state.selectedSize = state.currentProduct?.sizes?.length === 1 ? state.currentProduct.sizes[0] : null;
        state.selectedColor = state.currentProduct?.colors?.length === 1 ? state.currentProduct.colors[0] : null;
    }
    if (params.category) {
        state.shopCategory = params.category;
    }

    render();
    window.scrollTo(0, 0);

    const ctx = { page };
    if (page === 'product' && state.currentProduct) {
        ctx.product = { id: state.currentProduct.id, name: state.currentProduct.name, category: state.currentProduct.category, price: state.currentProduct.price };
    }
    setChatPageContext(ctx);
}

export function render() {
    restoreState();
    const app = document.getElementById('app-content');
    const pageFn = Pages[state.currentPage] || Pages.home;
    app.innerHTML = pageFn();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    renderUserMenu();
    syncAdminLinks();
    syncMobileAuthControls();
    ensureUserNotificationPolling();

    const nav = document.getElementById('navbar');
    if (state.currentPage === 'home') {
        nav.classList.add('bg-transparent');
        nav.classList.remove('bg-white', 'shadow-sm');
    } else {
        nav.classList.remove('bg-transparent');
        nav.classList.add('bg-white', 'shadow-sm');
    }
}

function renderUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (state.user) {
        userMenu.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="relative">
                    <button id="user-notification-btn" class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-sm transition-colors hover:text-gold md:bg-transparent md:shadow-none">
                        <i data-lucide="bell" size="20"></i>
                        <span id="user-notification-badge" class="absolute -right-1 -top-1 hidden min-w-5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            <span id="user-notification-count">0</span>
                        </span>
                    </button>
                    <div id="user-notification-dropdown" class="fixed left-4 right-4 top-20 hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl z-50 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:rounded-3xl md:border md:shadow-xl">
                        <div class="border-b border-zinc-100 px-4 py-4">
                            <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Notifications</p>
                            <p class="mt-1 text-sm font-semibold text-zinc-900">Order updates</p>
                        </div>
                        <div id="user-notification-content" class="max-h-[24rem] overflow-y-auto"></div>
                    </div>
                </div>
                <div class="relative">
                    <button id="user-menu-btn" class="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-sm transition-colors hover:text-gold md:h-auto md:w-auto md:space-x-2 md:bg-transparent md:shadow-none">
                        <i data-lucide="user" size="20"></i>
                        <span class="text-[10px] font-bold uppercase hidden md:inline">${state.user.username}</span>
                    </button>
                    <div id="user-dropdown" class="fixed left-4 right-4 top-20 hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl z-50 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-56 md:rounded-none md:border md:shadow-lg">
                        <div class="px-4 py-3 border-b border-zinc-100">
                            <p class="text-xs font-bold">Username: ${state.user.username}</p>
                            ${state.user.email ? `<p class="text-xs text-zinc-500">Email: ${state.user.email}</p>` : ''}
                        </div>
                        <a href="#" onclick="event.preventDefault(); closeMobileMenu(); window.navigate('account')" class="block px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
                            Account Settings
                        </a>
                        <a href="#" onclick="event.preventDefault(); closeMobileMenu(); window.navigate('orders')" class="block px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
                            My Orders
                        </a>
                        <button id="logout-btn" class="w-full text-left px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        updateUserNotificationElements();

        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        const userNotificationBtn = document.getElementById('user-notification-btn');
        const userNotificationDropdown = document.getElementById('user-notification-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                userNotificationDropdown?.classList.add('hidden');
                userDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (event) => {
                if (!userMenu.contains(event.target)) {
                    userDropdown.classList.add('hidden');
                    userNotificationDropdown?.classList.add('hidden');
                }
            });
        }

        if (userNotificationBtn && userNotificationDropdown) {
            userNotificationBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = userNotificationDropdown.classList.contains('hidden');
                userDropdown?.classList.add('hidden');
                userNotificationDropdown.classList.toggle('hidden');
                if (!willOpen) {
                    return;
                }

                await refreshUserNotificationCenter({ silent: true });
                userNotificationDropdown.classList.remove('hidden');
                if (Number(state.notificationUnreadCount || 0) > 0) {
                    await markUserNotificationsRead({ markAll: true });
                    updateUserNotificationElements();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (event) => {
                event.preventDefault();
                closeMobileMenu();
                window.handleLogout();
            });
        }
        return;
    }

    userMenu.innerHTML = `
        <a href="#" data-link="login" class="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-sm transition-colors hover:text-gold md:h-auto md:w-auto md:bg-transparent md:shadow-none">
            <i data-lucide="user" size="20"></i>
        </a>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    restoreState();
    if (state.user && state.token) {
        await fetchAccountProfile();
        await fetchCart();
        await fetchWishlist();
        await fetchOrders();
        await refreshUserNotificationCenter({ silent: true });
    }
    render();
    updateCartBadge();
    initChatbot();

    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-link]');
        if (link) {
            event.preventDefault();
            const page = link.getAttribute('data-link');
            const category = link.getAttribute('data-category');
            closeMobileMenu();
            navigate(page, { category });
        }
    });

    document.addEventListener('click', (event) => {
        const adminLink = event.target.closest('[data-admin-link]');
        if (adminLink) {
            closeMobileMenu();
        }
    });

    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('translate-x-full');
        });
    }
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'py-3');
            nav.classList.remove('py-4');
        } else if (state.currentPage === 'home') {
            nav.classList.remove('bg-white/90', 'backdrop-blur-md', 'shadow-sm');
            nav.classList.add('py-4');
        }
    });
});

window.navigate = navigate;
window.toggleWishlist = toggleWishlist;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleCheckout = handleCheckout;
window.submitProductReview = submitProductReview;
window.selectProductSize = (size) => {
    state.selectedSize = size;
    render();
};

window.selectProductColor = (color) => {
    state.selectedColor = color;
    render();
};

window.handleLogout = () => {
    if (userNotificationPoller) {
        clearInterval(userNotificationPoller);
        userNotificationPoller = null;
    }
    clearAuthState();
    closeMobileMenu();
    window.navigate('home');
};

window.closeMobileMenu = closeMobileMenu;
window.openSizeAdvisor = openSizeAdvisor;
window.saveAccountProfile = saveAccountProfile;
window.saveAccountAddress = saveAccountAddress;
window.saveAccountPreferences = saveAccountPreferences;
window.saveAccountMeasurements = saveAccountMeasurements;
window.updateCheckoutSummary = (fee, label) => {
    const parsedFee = Number(fee || 0);
    const subtotalNode = document.getElementById('checkout-subtotal');
    const shippingLabelNode = document.getElementById('checkout-shipping-label');
    const shippingFeeNode = document.getElementById('checkout-shipping-fee');
    const totalNode = document.getElementById('checkout-total');

    if (!subtotalNode || !shippingFeeNode || !totalNode) {
        return;
    }

    const subtotal = Number(subtotalNode.dataset.amount || 0);
    if (shippingLabelNode) {
        shippingLabelNode.textContent = label || 'Shipping';
    }
    shippingFeeNode.textContent = `$${parsedFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalNode.textContent = `$${(subtotal + parsedFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
window.updateCheckoutPaymentMethod = (method) => {
    const labelNode = document.getElementById('checkout-payment-reference-label');
    const inputNode = document.getElementById('checkout-payment-reference');
    const wrapNode = document.getElementById('checkout-payment-reference-wrap');
    if (!labelNode || !inputNode || !wrapNode) {
        return;
    }

    const config = {
        'credit-card': { label: 'Card Number', placeholder: 'Card Number', required: true, mode: 'numeric' },
        'bank-transfer': { label: 'Transfer Reference', placeholder: 'Transfer Reference', required: true, mode: 'text' },
        ewallet: { label: 'Wallet Number', placeholder: 'Wallet Number', required: true, mode: 'text' },
        cod: { label: 'Payment Reference', placeholder: 'Not required for cash on delivery', required: false, mode: 'text' },
    }[method] || { label: 'Payment Reference', placeholder: 'Payment Reference', required: true, mode: 'text' };

    labelNode.textContent = config.label;
    inputNode.placeholder = config.placeholder;
    inputNode.required = config.required;
    inputNode.inputMode = config.mode === 'numeric' ? 'numeric' : 'text';
    inputNode.autocomplete = method === 'credit-card' ? 'cc-number' : 'off';
    if (!config.required) {
        inputNode.value = '';
        wrapNode.classList.add('opacity-70');
    } else {
        wrapNode.classList.remove('opacity-70');
    }
};