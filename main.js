import './style.css';
import { PRODUCTS } from './js/data.js';
import { state, updateCartBadge, restoreState, saveState } from './js/state.js';
import { Pages } from './js/pages.js';
import { toggleWishlist, addToCart, removeFromCart, handleLogin, handleRegister, handleCheckout, fetchCart, fetchWishlist, fetchOrders } from './js/logic.js';

// --- Router ---
export function navigate(page, params = {}) {
    restoreState(); // Restore state sebelum navigasi
    state.currentPage = page;
    if (params.productId) {
        state.currentProduct = PRODUCTS.find(p => p.id === params.productId);
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
                <button id="user-menu-btn" class="flex items-center space-x-2 hover:text-gold transition-colors">
                    <i data-lucide="user" size="20"></i>
                    <span class="text-[10px] font-bold uppercase hidden md:inline">${state.user.username}</span>
                </button>
                <div id="user-dropdown" class="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 shadow-lg hidden z-50">
                    <div class="px-4 py-3 border-b border-zinc-100">
                        <p class="text-xs font-bold">Username: ${state.user.username}</p>
                        ${state.user.email ? `<p class="text-xs text-zinc-500">Email: ${state.user.email}</p>` : ''}
                    </div>
                    <a href="#" onclick="event.preventDefault(); window.navigate('orders')" class="block px-4 py-3 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors">
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
                window.handleLogout();
            });
        }
    } else {
        userMenu.innerHTML = `
            <a href="#" data-link="login" class="hover:text-gold transition-colors">
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
            navigate(page, { category });
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
            mobileMenu.classList.add('translate-x-full');
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

window.handleLogout = () => {
    state.user = null;
    state.token = null;
    localStorage.removeItem('seraphine_user');
    localStorage.removeItem('seraphine_token');
    state.cart = JSON.parse(localStorage.getItem('seraphine_cart_guest')) || [];
    saveState();
    window.navigate('home');
};
