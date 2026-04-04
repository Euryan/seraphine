import { PRODUCTS } from './data.js';

function getCartKey() {
    return state.user ? `seraphine_cart_${state.user.username}` : 'seraphine_cart_guest';
}

function getOrdersKey() {
    return state.user ? `seraphine_orders_${state.user.username}` : 'seraphine_orders_guest';
}

function getDefaultSize(productId) {
    const product = PRODUCTS.find(item => item.id === productId);
    if (!product || !Array.isArray(product.sizes) || product.sizes.length !== 1) {
        return null;
    }
    return product.sizes[0];
}

function normalizeCartItem(item) {
    return {
        ...item,
        product_id: item.product_id || item.id,
        quantity: item.quantity || 1,
        size: item.size || getDefaultSize(item.product_id || item.id),
    };
}

function normalizeOrderItem(item) {
    return {
        ...item,
        size: item.size || getDefaultSize(item.product_id || item.id),
        quantity: item.quantity || 1,
    };
}

function normalizeOrder(order) {
    return {
        ...order,
        items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    };
}

export let state = {
    user: null,
    token: null,
    cart: [],
    wishlist: [],
    currentPage: 'home',
    currentProduct: null,
    shopCategory: 'All',
    orders: [],
    selectedSize: null
};

export function restoreState() {
    state.user = JSON.parse(localStorage.getItem('seraphine_user')) || null;
    state.token = localStorage.getItem('seraphine_token') || null;
    state.wishlist = JSON.parse(localStorage.getItem('seraphine_wishlist')) || [];
    state.orders = (JSON.parse(localStorage.getItem(getOrdersKey())) || []).map(normalizeOrder);
    
    // Load cart berdasarkan user
    if (state.user) {
        const userCartKey = `seraphine_cart_${state.user.username}`;
        state.cart = (JSON.parse(localStorage.getItem(userCartKey)) || []).map(normalizeCartItem);
    } else {
        state.cart = (JSON.parse(localStorage.getItem('seraphine_cart_guest')) || []).map(normalizeCartItem);
    }
}

// Restore state saat module load
restoreState();

export function saveState() {
    localStorage.setItem('seraphine_user', JSON.stringify(state.user));
    localStorage.setItem('seraphine_token', state.token || '');
    localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
    localStorage.setItem('seraphine_wishlist', JSON.stringify(state.wishlist));
    localStorage.setItem(getOrdersKey(), JSON.stringify(state.orders));
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
