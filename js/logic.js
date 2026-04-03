import { PRODUCTS } from './data.js';
import { state, saveState, restoreState } from './state.js';
import { render } from '../main.js';

const API_BASE = 'http://localhost:8000';

async function apiJson(url, options = {}) {
    const opts = {
        headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
        },
        ...options,
    };
    const res = await fetch(url, opts);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = body.detail || body.message || res.statusText;
        throw new Error(message);
    }
    return body;
}

async function fetchCart() {
    if (!state.user || !state.token) return;
    try {
        const items = await apiJson(`${API_BASE}/cart`);
        state.cart = items.map(item => ({ id: item.id, product_id: item.product_id, quantity: item.quantity }));
        saveState();
        render();
    } catch (err) {
        console.error('Fetch cart failed', err);
    }
}

async function fetchWishlist() {
    if (!state.user || !state.token) return;
    try {
        const items = await apiJson(`${API_BASE}/wishlist`);
        state.wishlist = items.map(item => ({ id: item.id, product_id: item.product_id }));
        saveState();
        render();
    } catch (err) {
        console.error('Fetch wishlist failed', err);
    }
}

async function fetchOrders() {
    if (!state.user || !state.token) return;
    try {
        const orders = await apiJson(`${API_BASE}/orders`);
        state.orders = orders;
        saveState();
        render();
    } catch (err) {
        console.error('Fetch orders failed', err);
    }
}

export async function toggleWishlist(productId) {
    const isInWishlist = state.wishlist.some(item => item.product_id === productId);
    if (!state.user || !state.token) {
        if (isInWishlist) state.wishlist = state.wishlist.filter(item => item.product_id !== productId);
        else state.wishlist.push({ id: Date.now(), product_id: productId });
        saveState();
        render();
        return;
    }

    try {
        if (isInWishlist) {
            const item = state.wishlist.find(item => item.product_id === productId);
            await apiJson(`${API_BASE}/wishlist/${item.id}`, { method: 'DELETE' });
        } else {
            await apiJson(`${API_BASE}/wishlist/add`, { method: 'POST', body: JSON.stringify({ product_id: productId }) });
        }
        await fetchWishlist();
    } catch (err) {
        alert(`Wishlist action failed: ${err.message}`);
    }
}

export async function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    if (!state.user || !state.token) {
        const existing = state.cart.find(item => item.product_id === productId);
        if (existing) existing.quantity++;
        else state.cart.push({ id: Date.now(), product_id: productId, quantity: 1 });
        saveState();
        alert('Added to bag');
        render();
        return;
    }

    try {
        await apiJson(`${API_BASE}/cart/add`, { method: 'POST', body: JSON.stringify({ product_id: productId, quantity: 1 }) });
        await fetchCart();
        alert('Added to bag');
    } catch (err) {
        alert(`Add to cart gagal: ${err.message}`);
    }
}

export async function removeFromCart(itemId) {
    if (!state.user || !state.token) {
        state.cart = state.cart.filter(item => item.id !== itemId);
        saveState();
        render();
        return;
    }

    try {
        await apiJson(`${API_BASE}/cart/${itemId}`, { method: 'DELETE' });
        await fetchCart();
    } catch (err) {
        alert(`Remove from cart failed: ${err.message}`);
    }
}

export async function handleRegister(form) {
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!username) return alert('Username wajib diisi');

    try {
        const data = await apiJson(`${API_BASE}/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });

        state.user = { username, email };
        state.token = data.access_token;
        saveState();
        await fetchCart();
        await fetchWishlist();
        render();
        window.navigate('home');
    } catch (err) {
        alert(`Registrasi gagal: ${err.message}`);
    }
}

export async function handleLogin(form) {
    const username = form.username.value.trim();
    const password = form.password.value;

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login gagal');

        state.user = { username };
        state.token = data.access_token;
        saveState();
        await fetchCart();
        await fetchWishlist();
        render();
        window.navigate('home');
    } catch (err) {
        alert(`Login gagal: ${err.message}`);
    }
}

export async function handleCheckout(form) {
    if (!state.user || !state.token) {
        // guest checkout fallback
        const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
        state.orders.push({ id: orderId, date: new Date(), items: [...state.cart] });
        state.cart = [];
        saveState();
        window.navigate('order-success');
        return;
    }

    try {
        const payload = {
            items: state.cart.map(item => {
                const product = PRODUCTS.find(p => p.id === item.product_id);
                console.log('Item:', item, 'Product found:', product);
                return {
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: product ? product.price : 0
                };
            }),
            total_amount: state.cart.reduce((sum, item) => {
                const product = PRODUCTS.find(p => p.id === item.product_id);
                return sum + (item.quantity * (product ? product.price : 0));
            }, 0)
        };

        console.log('Checkout payload:', payload);
        const data = await apiJson(`${API_BASE}/orders/checkout`, { method: 'POST', body: JSON.stringify(payload) });
        await fetchCart();
        await fetchOrders();
        alert('Checkout sukses: ' + data.order_id);
        window.navigate('order-success');
    } catch (err) {
        alert(`Checkout gagal: ${err.message}`);
    }
}

export { fetchCart, fetchWishlist, fetchOrders };

