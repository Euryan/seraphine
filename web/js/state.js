import { PRODUCTS } from './data.js';

const PENDING_AUTH_ACTION_KEY = 'seraphine_pending_auth_action';

function getCartKey() {
    return state.user ? `seraphine_cart_${state.user.username}` : 'seraphine_cart_guest';
}

function getWishlistKey() {
    return state.user ? `seraphine_wishlist_${state.user.username}` : 'seraphine_wishlist_guest';
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

function getDefaultColor(productId) {
    const product = PRODUCTS.find(item => item.id === productId);
    if (!product || !Array.isArray(product.colors) || product.colors.length !== 1) {
        return null;
    }
    return product.colors[0];
}

function normalizeCartItem(item) {
    return {
        ...item,
        product_id: item.product_id || item.id,
        quantity: item.quantity || 1,
        size: item.size || getDefaultSize(item.product_id || item.id),
        color: item.color || getDefaultColor(item.product_id || item.id),
    };
}

function normalizeOrderItem(item) {
    return {
        ...item,
        size: item.size || getDefaultSize(item.product_id || item.id),
        color: item.color || getDefaultColor(item.product_id || item.id),
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
    selectedSize: null,
    selectedColor: null,
    pendingAuthAction: null,
};

export function setPendingAuthAction(action) {
    state.pendingAuthAction = action;
    if (action) {
        localStorage.setItem(PENDING_AUTH_ACTION_KEY, JSON.stringify(action));
        return;
    }
    localStorage.removeItem(PENDING_AUTH_ACTION_KEY);
}

export function clearPendingAuthAction() {
    state.pendingAuthAction = null;
    localStorage.removeItem(PENDING_AUTH_ACTION_KEY);
}

export function restoreState() {
    state.user = JSON.parse(localStorage.getItem('seraphine_user')) || null;
    state.token = localStorage.getItem('seraphine_token') || null;
    state.pendingAuthAction = JSON.parse(localStorage.getItem(PENDING_AUTH_ACTION_KEY)) || null;
    
    if (state.user) {
        state.wishlist = JSON.parse(localStorage.getItem(getWishlistKey())) || [];
        state.orders = (JSON.parse(localStorage.getItem(getOrdersKey())) || []).map(normalizeOrder);
        const userCartKey = `seraphine_cart_${state.user.username}`;
        state.cart = (JSON.parse(localStorage.getItem(userCartKey)) || []).map(normalizeCartItem);
    } else {
        state.cart = [];
        state.wishlist = [];
        state.orders = [];
        localStorage.removeItem('seraphine_cart_guest');
        localStorage.removeItem('seraphine_wishlist_guest');
        localStorage.removeItem('seraphine_orders_guest');
    }
}

// Restore state saat module load
restoreState();

export function saveState() {
    localStorage.setItem('seraphine_user', JSON.stringify(state.user));
    localStorage.setItem('seraphine_token', state.token || '');
    if (state.user) {
        localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
        localStorage.setItem(getWishlistKey(), JSON.stringify(state.wishlist));
        localStorage.setItem(getOrdersKey(), JSON.stringify(state.orders));
    } else {
        localStorage.removeItem('seraphine_cart_guest');
        localStorage.removeItem('seraphine_wishlist_guest');
        localStorage.removeItem('seraphine_orders_guest');
    }
    updateCartBadge();
}

export function clearAuthState() {
    state.user = null;
    state.token = null;
    state.selectedSize = null;
    state.selectedColor = null;
    localStorage.removeItem('seraphine_user');
    localStorage.removeItem('seraphine_token');
    state.cart = [];
    state.wishlist = [];
    state.orders = [];
    localStorage.removeItem('seraphine_cart_guest');
    localStorage.removeItem('seraphine_wishlist_guest');
    localStorage.removeItem('seraphine_orders_guest');
    saveState();
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
