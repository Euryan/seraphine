import { PRODUCTS } from './data.js';
import { state, saveState } from './state.js';
import { render } from '../main.js';

export function toggleWishlist(id) {
    const product = PRODUCTS.find(p => p.id === id);
    const index = state.wishlist.findIndex(p => p.id === id);
    if (index > -1) state.wishlist.splice(index, 1);
    else state.wishlist.push(product);
    saveState();
    render();
}

export function addToCart(id) {
    const product = PRODUCTS.find(p => p.id === id);
    const existing = state.cart.find(item => item.id === id);
    if (existing) existing.quantity++;
    else state.cart.push({ ...product, quantity: 1 });
    saveState();
    alert('Added to bag');
    render();
}

export function removeFromCart(id) {
    state.cart = state.cart.filter(item => item.id !== id);
    saveState();
    render();
}

export function handleLogin(form) {
    const email = form.email.value;
    state.user = { email, name: 'Valued Client' };
    saveState();
    window.navigate('home');
}

export function handleCheckout(form) {
    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
    state.orders.push({ id: orderId, date: new Date(), items: [...state.cart] });
    state.cart = [];
    saveState();
    window.navigate('order-success');
}
