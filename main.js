import './style.css';
import { PRODUCTS } from './js/data.js';
import { state, updateCartBadge } from './js/state.js';
import { Pages } from './js/pages.js';
import { toggleWishlist, addToCart, removeFromCart, handleLogin, handleCheckout } from './js/logic.js';

// --- Router ---
export function navigate(page, params = {}) {
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
    const app = document.getElementById('app-content');
    const pageFn = Pages[state.currentPage] || Pages.home;
    app.innerHTML = pageFn();
    
    // Update Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

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

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
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
window.handleCheckout = handleCheckout;
