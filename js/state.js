import { PRODUCTS } from './data.js';

export let state = {
    user: JSON.parse(localStorage.getItem('seraphine_user')) || null,
    cart: JSON.parse(localStorage.getItem('seraphine_cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('seraphine_wishlist')) || [],
    currentPage: 'home',
    currentProduct: null,
    shopCategory: 'All',
    orders: JSON.parse(localStorage.getItem('seraphine_orders')) || []
};

export function saveState() {
    localStorage.setItem('seraphine_user', JSON.stringify(state.user));
    localStorage.setItem('seraphine_cart', JSON.stringify(state.cart));
    localStorage.setItem('seraphine_wishlist', JSON.stringify(state.wishlist));
    localStorage.setItem('seraphine_orders', JSON.stringify(state.orders));
    updateCartBadge();
}

export function updateCartBadge() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}
