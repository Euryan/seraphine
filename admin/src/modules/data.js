/**
 * Data Management Module
 * Keeps UI/session preferences in localStorage and uses backend API for products, orders, and customers.
 */

import { API_BASE } from './config.js';

const STORAGE_PREFIX = 'seraphine_admin';

function storageKey(key) {
  return `${STORAGE_PREFIX}_${key}`;
}

async function apiJson(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: isFormData
      ? { ...(options.headers || {}) }
      : {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || body.message || response.statusText);
  }

  return body;
}

function normalizeProduct(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return {
    ...product,
    images,
    image: product.image || images[0] || '',
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    variantStocks: Array.isArray(product.variantStocks) ? product.variantStocks : [],
  };
}

export const db = {
  get: (key, defaultValue) => {
    const data = localStorage.getItem(storageKey(key));
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key, value) => {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  },
  init: () => {
    if (!localStorage.getItem(storageKey('settings'))) {
      db.set('settings', {
        storeName: 'Seraphine Couture',
        storeEmail: 'atelier@seraphine.com',
        logo: '',
        address: 'Via Montenapoleone 18, Milan, Italy',
        theme: 'dark'
      });
    }
  },
  reset: () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
      .forEach((key) => localStorage.removeItem(key));
    db.init();
    window.location.reload();
  }
};

export async function authenticateAdmin(email, password) {
  return apiJson('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAccessAccounts() {
  return apiJson('/admin/access-accounts');
}

export async function createAccessAccount(payload) {
  return apiJson('/admin/access-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAccessAccount(accountId, payload) {
  return apiJson(`/admin/access-accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccessAccount(accountId) {
  return apiJson(`/admin/access-accounts/${accountId}`, {
    method: 'DELETE',
  });
}

export async function fetchProducts() {
  const products = await apiJson('/admin/products');
  return products.map(normalizeProduct);
}

export async function createProduct(product) {
  const created = await apiJson('/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  return normalizeProduct(created);
}

export async function updateProduct(productId, product) {
  const updated = await apiJson(`/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  return normalizeProduct(updated);
}

export async function deleteProductById(productId) {
  return apiJson(`/admin/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function fetchOrders() {
  return apiJson('/admin/orders');
}

export async function updateOrderStatus(orderId, status) {
  return apiJson(`/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function fetchCustomers() {
  return apiJson('/admin/customers');
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiJson('/admin/uploads/images', {
    method: 'POST',
    body: formData,
  });
}
