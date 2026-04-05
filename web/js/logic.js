import { getProductById, getVariantStock, loadProducts } from './data.js';
import { API_BASE } from './config.js';
import { state, saveState, clearAuthState, setPendingAuthAction, clearPendingAuthAction } from './state.js';
import { render } from '../main.js';

function getNoticeContainer() {
    let container = document.getElementById('seraphine-notice-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'seraphine-notice-container';
    container.className = 'fixed right-4 top-24 z-[120] flex w-[min(92vw,24rem)] flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
    return container;
}

function showNotice(message, type = 'info') {
    const palette = {
        info: 'border-zinc-200 bg-white text-zinc-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        error: 'border-red-200 bg-red-50 text-red-800',
    };
    const container = getNoticeContainer();
    const notice = document.createElement('div');
    notice.className = `pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300 ${palette[type] || palette.info}`;
    notice.innerHTML = `<p class="text-sm font-medium leading-5">${message}</p>`;
    notice.style.opacity = '0';
    notice.style.transform = 'translateY(-8px)';
    container.appendChild(notice);

    requestAnimationFrame(() => {
        notice.style.opacity = '1';
        notice.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        notice.style.opacity = '0';
        notice.style.transform = 'translateY(-8px)';
        setTimeout(() => notice.remove(), 220);
    }, 2600);
}

function formatVariantLabel(item) {
    return [item.size, item.color].filter(Boolean).join(' / ') || 'variant ini';
}

function syncCartQuantitiesWithStock() {
    const nextCart = [];
    const adjustments = [];

    state.cart.forEach((item) => {
        const product = getProductById(item.product_id);
        if (!product) {
            adjustments.push({
                productName: item.name || 'Produk',
                requestedQuantity: item.quantity || 0,
                appliedQuantity: 0,
                variantLabel: formatVariantLabel(item),
            });
            return;
        }

        const availableQuantity = getVariantStock(product, item.size, item.color);
        const requestedQuantity = Math.max(Number(item.quantity || 0), 0);
        const appliedQuantity = Math.min(requestedQuantity, Math.max(availableQuantity, 0));

        if (appliedQuantity !== requestedQuantity) {
            adjustments.push({
                productName: product.name,
                requestedQuantity,
                appliedQuantity,
                variantLabel: formatVariantLabel(item),
            });
        }

        if (appliedQuantity > 0) {
            nextCart.push({ ...item, quantity: appliedQuantity });
        }
    });

    if (adjustments.length > 0) {
        state.cart = nextCart;
        saveState();
    }

    return adjustments;
}

function showStockAdjustments(adjustments, fallbackType = 'warning') {
    adjustments.forEach((adjustment) => {
        if (adjustment.appliedQuantity > 0) {
            showNotice(
                `${adjustment.productName || 'Produk'} ${adjustment.variantLabel ? `(${adjustment.variantLabel}) ` : ''}disesuaikan dari ${adjustment.requestedQuantity} ke ${adjustment.appliedQuantity} karena stok tersisa ${adjustment.appliedQuantity}.`,
                fallbackType,
            );
            return;
        }

        showNotice(
            `${adjustment.productName || 'Produk'} ${adjustment.variantLabel ? `(${adjustment.variantLabel}) ` : ''}dihapus dari bag karena stok sudah habis.`,
            'warning',
        );
    });
}

function requireLoginForAction(action, message) {
    setPendingAuthAction(action);
    showNotice(message, 'warning');
    window.navigate('login');
}

async function executePendingAuthAction() {
    const action = state.pendingAuthAction;
    if (!action || !state.user || !state.token) return;

    clearPendingAuthAction();

    try {
        if (action.type === 'wishlist-add') {
            await apiJson(`${API_BASE}/wishlist/add`, {
                method: 'POST',
                body: JSON.stringify({ product_id: action.productId }),
            });
            await fetchWishlist();
            showNotice('Produk masuk ke wishlist akun Anda.', 'success');
            return;
        }

        if (action.type === 'cart-add') {
            const response = await apiJson(`${API_BASE}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({
                    product_id: action.productId,
                    quantity: action.quantity || 1,
                    size: action.size,
                    color: action.color,
                }),
            });
            await fetchCart();
            if (response.adjusted) {
                showNotice(response.message || 'Quantity di bag disesuaikan dengan stok yang tersedia.', 'warning');
            } else {
                showNotice('Produk masuk ke bag akun Anda.', 'success');
            }
        }
    } catch (err) {
        showNotice(`Aksi setelah login gagal: ${err.message}`, 'error');
    }
}

function isAuthFailure(status, message) {
    if (status !== 401) return false;
    const normalizedMessage = String(message || '').toLowerCase();
    return normalizedMessage.includes('invalid token')
        || normalizedMessage.includes('could not validate credentials')
        || normalizedMessage.includes('signature has expired')
        || normalizedMessage.includes('user not found');
}

function handleInvalidSession() {
    clearAuthState();
    render();
    throw new Error('Session login sudah tidak valid. Silakan login ulang.');
}

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
        if (isAuthFailure(res.status, message) && state.token) {
            handleInvalidSession();
        }
        throw new Error(message);
    }
    return body;
}

async function fetchCart() {
    if (!state.user || !state.token) return;
    try {
        const items = await apiJson(`${API_BASE}/cart`);
        state.cart = items.map(item => ({ id: item.id, product_id: item.product_id, quantity: item.quantity, size: item.size, color: item.color }));
        saveState();
        render();
    } catch (err) {
        console.warn('Fetch cart failed', err.message);
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
        console.warn('Fetch wishlist failed', err.message);
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
        console.warn('Fetch orders failed', err.message);
    }
}

export async function toggleWishlist(productId) {
    const isInWishlist = state.wishlist.some(item => item.product_id === productId);
    if (!state.user || !state.token) {
        requireLoginForAction(
            { type: 'wishlist-add', productId },
            'Login terlebih dahulu. Produk akan masuk ke wishlist akun Anda setelah login.',
        );
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
    const product = getProductById(productId);
    if (!product) return;

    const selectedSize = state.selectedSize || (product.sizes.length === 1 ? product.sizes[0] : null);
    const selectedColor = state.selectedColor || (product.colors.length === 1 ? product.colors[0] : null);
    if (!selectedSize) {
        alert('Pilih size terlebih dahulu sebelum menambahkan ke bag');
        return;
    }
    if (product.colors.length > 1 && !selectedColor) {
        alert('Pilih color terlebih dahulu sebelum menambahkan ke bag');
        return;
    }

    if (!state.user || !state.token) {
        const availableQuantity = getVariantStock(product, selectedSize, selectedColor);

        if (availableQuantity <= 0) {
            showNotice('Variant yang dipilih sudah habis.', 'warning');
            return;
        }

        requireLoginForAction(
            {
                type: 'cart-add',
                productId,
                quantity: 1,
                size: selectedSize,
                color: selectedColor,
            },
            'Login terlebih dahulu. Produk akan masuk ke bag akun Anda setelah login.',
        );
        return;
    }

    try {
        const response = await apiJson(`${API_BASE}/cart/add`, { method: 'POST', body: JSON.stringify({ product_id: productId, quantity: 1, size: selectedSize, color: selectedColor }) });
        state.selectedSize = null;
        state.selectedColor = null;
        await fetchCart();
        if (response.adjusted) {
            showNotice(response.message || `Stok tersisa ${response.available_quantity}. Quantity di bag disesuaikan.`, 'warning');
        } else {
            showNotice('Produk ditambahkan ke bag.', 'success');
        }
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
        state.cart = [];
        state.wishlist = [];
        state.orders = [];
        saveState();
        await fetchCart();
        await fetchWishlist();
        await fetchOrders();
        await executePendingAuthAction();
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
        state.cart = [];
        state.wishlist = [];
        state.orders = [];
        saveState();
        await fetchCart();
        await fetchWishlist();
        await fetchOrders();
        await executePendingAuthAction();
        render();
        window.navigate('home');
    } catch (err) {
        alert(`Login gagal: ${err.message}`);
    }
}

export async function handleCheckout(form) {
    if (!state.user || !state.token) {
        showNotice('Login diperlukan agar checkout mengurangi stok dan tercatat di admin.', 'warning');
        window.navigate('login');
        return;
    }

    await loadProducts();
    const localAdjustments = syncCartQuantitiesWithStock();
    if (localAdjustments.length > 0) {
        showStockAdjustments(localAdjustments);
    }

    if (state.cart.length === 0) {
        showNotice('Semua item di bag sudah habis. Silakan pilih produk lain.', 'warning');
        window.navigate('cart');
        return;
    }

    const itemWithoutSize = state.cart.find(item => !item.size);
    if (itemWithoutSize) {
        alert('Ada item di bag yang belum memiliki size. Hapus lalu pilih size yang benar sebelum checkout.');
        return;
    }
    const itemWithoutColor = state.cart.find((item) => {
        const product = getProductById(item.product_id);
        return product && product.colors.length > 1 && !item.color;
    });
    if (itemWithoutColor) {
        alert('Ada item di bag yang belum memiliki color. Hapus lalu pilih color yang benar sebelum checkout.');
        return;
    }

    try {
        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const address = form.address.value.trim();
        const cardNumber = form.cardNumber.value.replace(/\s+/g, '');

        if (cardNumber.length < 4) {
            alert('Nomor kartu minimal harus memiliki 4 digit');
            return;
        }

        const payload = {
            first_name: firstName,
            last_name: lastName,
            address,
            payment_last4: cardNumber.slice(-4),
            items: state.cart.map(item => {
                return {
                    product_id: item.product_id,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity
                };
            }),
            total_amount: state.cart.reduce((sum, item) => {
                const product = getProductById(item.product_id);
                return sum + (item.quantity * (product ? product.price : 0));
            }, 0)
        };

        const data = await apiJson(`${API_BASE}/orders/checkout`, { method: 'POST', body: JSON.stringify(payload) });
        await loadProducts();
        await fetchCart();
        await fetchOrders();
        if (Array.isArray(data.adjustments) && data.adjustments.length > 0) {
            showStockAdjustments(data.adjustments.map((adjustment) => {
                const product = getProductById(adjustment.product_id);
                return {
                    productName: product?.name || `Produk ${adjustment.product_id}`,
                    requestedQuantity: adjustment.requested_quantity,
                    appliedQuantity: adjustment.applied_quantity,
                    variantLabel: formatVariantLabel({ size: adjustment.size, color: adjustment.color }),
                };
            }));
        }
        showNotice('Checkout berhasil.', 'success');
        window.navigate('order-success');
    } catch (err) {
        alert(`Checkout gagal: ${err.message}`);
    }
}

export { fetchCart, fetchWishlist, fetchOrders };

