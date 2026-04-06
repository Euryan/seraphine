import { PRODUCTS } from './data.js';

const PENDING_AUTH_ACTION_KEY = 'seraphine_pending_auth_action';
const DEFAULT_ACCOUNT_SECTION = 'overview';

function getAccountKey() {
    return state.user ? `seraphine_account_${state.user.username}` : null;
}

function createDefaultAccountData(user = null) {
    return {
        profile: {
            firstName: '',
            lastName: '',
            email: user?.email || '',
            phone: '',
            birthday: '',
            gender: 'Prefer not to say',
        },
        address: {
            label: 'Primary Address',
            recipient: '',
            phone: '',
            street: '',
            city: '',
            province: '',
            postalCode: '',
            notes: '',
        },
        measurements: {
            height_cm: null,
            weight_kg: null,
            chest_cm: null,
            waist_cm: null,
            hip_cm: null,
            preferences: null,
        },
        preferences: {
            preferredContact: 'email',
            styleProfile: 'Modern Elegance',
            fitPreference: 'regular',
            notifyRestock: true,
            notifyDrops: true,
            prioritySupport: false,
        },
        membership: {
            active: false,
            tier: 'Bronze',
            rfidUid: '',
            joinedAt: new Date().toISOString(),
            privateCode: user?.username ? `SER-${String(user.username).toUpperCase()}` : 'SER-GUEST',
        },
    };
}

function normalizeAccountData(data = {}, user = null) {
    const defaults = createDefaultAccountData(user);
    return {
        profile: {
            ...defaults.profile,
            ...(data.profile || {}),
            email: data.profile?.email || user?.email || defaults.profile.email,
        },
        address: {
            ...defaults.address,
            ...(data.address || {}),
        },
        measurements: {
            ...defaults.measurements,
            ...(data.measurements || {}),
        },
        preferences: {
            ...defaults.preferences,
            ...(data.preferences || {}),
        },
        membership: {
            ...defaults.membership,
            ...(data.membership || {}),
            privateCode: data.membership?.privateCode || defaults.membership.privateCode,
            joinedAt: data.membership?.joinedAt || defaults.membership.joinedAt,
        },
    };
}

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
    notifications: [],
    notificationUnreadCount: 0,
    shopCategory: 'All',
    orders: [],
    selectedSize: null,
    selectedColor: null,
    pendingAuthAction: null,
    account: createDefaultAccountData(),
    accountSection: DEFAULT_ACCOUNT_SECTION,
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
    state.accountSection = localStorage.getItem('seraphine_account_section') || DEFAULT_ACCOUNT_SECTION;
    
    if (state.user) {
        state.wishlist = JSON.parse(localStorage.getItem(getWishlistKey())) || [];
        state.orders = (JSON.parse(localStorage.getItem(getOrdersKey())) || []).map(normalizeOrder);
        const userCartKey = `seraphine_cart_${state.user.username}`;
        state.cart = (JSON.parse(localStorage.getItem(userCartKey)) || []).map(normalizeCartItem);
        state.account = normalizeAccountData(JSON.parse(localStorage.getItem(getAccountKey()) || 'null') || {}, state.user);
        state.notifications = [];
        state.notificationUnreadCount = 0;
    } else {
        state.cart = [];
        state.wishlist = [];
        state.orders = [];
        state.notifications = [];
        state.notificationUnreadCount = 0;
        state.account = createDefaultAccountData();
        state.accountSection = DEFAULT_ACCOUNT_SECTION;
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
    localStorage.setItem('seraphine_account_section', state.accountSection || DEFAULT_ACCOUNT_SECTION);
    if (state.user) {
        localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
        localStorage.setItem(getWishlistKey(), JSON.stringify(state.wishlist));
        localStorage.setItem(getOrdersKey(), JSON.stringify(state.orders));
        localStorage.setItem(getAccountKey(), JSON.stringify(normalizeAccountData(state.account, state.user)));
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
    state.notifications = [];
    state.notificationUnreadCount = 0;
    state.account = createDefaultAccountData();
    state.accountSection = DEFAULT_ACCOUNT_SECTION;
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

export function setAccountSection(section) {
    state.accountSection = section || DEFAULT_ACCOUNT_SECTION;
    saveState();
}

export function mergeAccountData(partial) {
    state.account = normalizeAccountData({
        ...state.account,
        ...partial,
        profile: {
            ...(state.account?.profile || {}),
            ...(partial?.profile || {}),
        },
        address: {
            ...(state.account?.address || {}),
            ...(partial?.address || {}),
        },
        measurements: {
            ...(state.account?.measurements || {}),
            ...(partial?.measurements || {}),
        },
        preferences: {
            ...(state.account?.preferences || {}),
            ...(partial?.preferences || {}),
        },
        membership: {
            ...(state.account?.membership || {}),
            ...(partial?.membership || {}),
        },
    }, state.user);
    saveState();
}

export function hydrateAccountStateForCurrentUser() {
    if (!state.user) {
        state.account = createDefaultAccountData();
        return;
    }
    state.account = normalizeAccountData(JSON.parse(localStorage.getItem(getAccountKey()) || 'null') || {}, state.user);
}

export function setAccountData(account) {
    state.account = normalizeAccountData(account || {}, state.user);
    saveState();
}
