import './style.css';
import { getProductById, loadProducts } from './js/data.js';
import { state, updateCartBadge, restoreState, clearAuthState } from './js/state.js';
import { Pages } from './js/pages.js';
import { toggleWishlist, addToCart, removeFromCart, handleLogin, handleRegister, handleCheckout, fetchCart, fetchWishlist, fetchOrders } from './js/logic.js';

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

function syncMobileAuthControls() {
    const mobileAuthLink = document.getElementById('mobile-auth-link');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if (!mobileAuthLink || !mobileLogoutBtn) {
        return;
    }

    if (state.user) {
        mobileAuthLink.textContent = 'My Orders';
        mobileAuthLink.setAttribute('data-link', 'orders');
        mobileLogoutBtn.classList.remove('hidden');
    } else {
        mobileAuthLink.textContent = 'Sign In';
        mobileAuthLink.setAttribute('data-link', 'login');
        mobileLogoutBtn.classList.add('hidden');
    }

    mobileLogoutBtn.onclick = () => {
        closeMobileMenu();
        window.handleLogout();
    };
}

// --- Router ---
export function navigate(page, params = {}) {
    restoreState(); // Restore state sebelum navigasi
    state.currentPage = page;
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
}

// --- Main Render ---
export function render() {
    restoreState(); // Ensure state is fresh from localStorage
    const app = document.getElementById('app-content');
    const pageFn = Pages[state.currentPage] || Pages.home;
    app.innerHTML = pageFn();
    
    // Update Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Render User Menu
    renderUserMenu();
    syncAdminLinks();
    syncMobileAuthControls();

    // Update Navbar Style
    const nav = document.getElementById('navbar');
    if (state.currentPage === 'home') {
        nav.classList.add('bg-transparent');
        nav.classList.remove('bg-white', 'shadow-sm');
    } else {
        nav.classList.remove('bg-transparent');
        nav.classList.add('bg-white', 'shadow-sm');
    }
}

// --- Render User Menu ---
function renderUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    if (state.user) {
        userMenu.innerHTML = `
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
                    <a href="#" onclick="event.preventDefault(); closeMobileMenu(); window.navigate('orders')" class="block px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
                        My Orders
                    </a>
                    <button id="logout-btn" class="w-full text-left px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
                        Logout
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Setup dropdown toggle dan logout
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdown.classList.toggle('hidden');
            });

            // Close dropdown saat click di tempat lain
            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeMobileMenu();
                window.handleLogout();
            });
        }
    } else {
        userMenu.innerHTML = `
            <a href="#" data-link="login" class="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-sm transition-colors hover:text-gold md:h-auto md:w-auto md:bg-transparent md:shadow-none">
                <i data-lucide="user" size="20"></i>
            </a>
        `;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    restoreState();
    if (state.user && state.token) {
        await fetchCart();
        await fetchWishlist();
        await fetchOrders();
    }
    render();
    updateCartBadge();

    // Global Link Handling
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const page = link.getAttribute('data-link');
            const category = link.getAttribute('data-category');
            closeMobileMenu();
            navigate(page, { category });
        }
    });

    document.addEventListener('click', (e) => {
        const adminLink = e.target.closest('[data-admin-link]');
        if (adminLink) {
            closeMobileMenu();
        }
    });

    // Mobile Menu
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

    // Scroll Effect
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

// Expose functions to global scope for inline onclick handlers
window.navigate = navigate;
window.toggleWishlist = toggleWishlist;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleCheckout = handleCheckout;
window.selectProductSize = (size) => {
    state.selectedSize = size;
    render();
};

window.selectProductColor = (color) => {
    state.selectedColor = color;
    render();
};

window.handleLogout = () => {
    clearAuthState();
    closeMobileMenu();
    window.navigate('home');
};

window.closeMobileMenu = closeMobileMenu;
