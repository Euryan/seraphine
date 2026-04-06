/**
 * Orders Module
 * Table, status update, shipping labels, and invoice PDFs.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db, fetchOrders, fetchProducts, updateOrderStatus } from './data.js';
import { API_BASE } from './config.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

const BRAND_LOGO_PATH = '/assets/img/seraphine.jpeg';
const pdfImageCache = new Map();

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBrandLogoUrl() {
  if (BRAND_LOGO_PATH.startsWith('http')) return BRAND_LOGO_PATH;
  if (API_BASE.startsWith('http')) {
    return new URL(BRAND_LOGO_PATH, API_BASE.replace(/\/api\/?$/, '/')).toString();
  }
  return BRAND_LOGO_PATH;
}

function normalizeDocumentImageUrl(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw || raw.startsWith('data:')) return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.pathname.startsWith('/assets/')) {
      return parsed.pathname;
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function getDocumentSettings() {
  return {
    ...db.get('settings', {
      storeName: 'Seraphine Couture',
      storeEmail: 'atelier@seraphine.com',
      address: 'Via Montenapoleone 18, Milan, Italy',
    }),
    logoUrl: getBrandLogoUrl(),
  };
}

function buildBarcodeMarkup(value) {
  const source = String(value || '000000').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return source.split('').map((character, index) => {
    const code = character.charCodeAt(0) + index;
    const width = code % 3 === 0 ? 4 : code % 2 === 0 ? 3 : 2;
    return `<span style="display:block;width:${width}px;height:56px;background:#111"></span>`;
  }).join('');
}

function getOrderLineItems(order, products) {
  return (order.items || []).map((item) => {
    const productId = item.productId || item.product_id;
    const product = products.find((entry) => entry.id === productId);
    return {
      ...item,
      productId,
      productName: product?.name || `Product ${productId}`,
      image: normalizeDocumentImageUrl(product?.image || product?.images?.[0] || ''),
      lineTotal: Number(item.quantity || 0) * Number(item.price || 0),
    };
  });
}

async function convertImageUrlToDataUrl(url) {
  const normalizedUrl = normalizeDocumentImageUrl(url);
  if (!normalizedUrl || normalizedUrl.startsWith('data:')) {
    return normalizedUrl;
  }

  if (pdfImageCache.has(normalizedUrl)) {
    return pdfImageCache.get(normalizedUrl);
  }

  try {
    const response = await fetch(normalizedUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    pdfImageCache.set(normalizedUrl, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn('Unable to inline image for PDF:', normalizedUrl, error);
    return normalizedUrl;
  }
}

async function inlineImagesForPdf(container) {
  const imageNodes = Array.from(container.querySelectorAll('img'));
  await Promise.all(imageNodes.map(async (imageNode) => {
    const originalSrc = imageNode.getAttribute('src');
    const nextSrc = await convertImageUrlToDataUrl(originalSrc);
    if (nextSrc && nextSrc !== originalSrc) {
      imageNode.setAttribute('src', nextSrc);
    }
  }));

  await Promise.all(imageNodes.map((imageNode) => new Promise((resolve) => {
    if (imageNode.complete) {
      resolve();
      return;
    }
    imageNode.addEventListener('load', resolve, { once: true });
    imageNode.addEventListener('error', resolve, { once: true });
  })));
}

function getDocumentStyles() {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f4f5;
      color: #111111;
      font-family: Georgia, 'Times New Roman', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 960px;
      margin: 32px auto;
      padding: 24px;
    }
    .doc-shell {
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 28px;
      padding: 32px;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.08);
    }
    .doc-header, .doc-grid, .section-heading-row, .doc-item-row, .doc-footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .doc-header { align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid #e4e4e7; }
    .doc-brand { display: flex; align-items: center; gap: 16px; }
    .doc-brand img {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 20px;
      border: 1px solid #e4e4e7;
      background: #ffffff;
    }
    .doc-brand h1, .doc-grid h2, .doc-items h2 { margin: 8px 0 6px; }
    .doc-brand h1 { font-size: 32px; }
    .doc-kicker, .section-label { text-transform: uppercase; letter-spacing: 0.25em; font-size: 10px; color: #71717a; margin: 0; }
    .doc-meta { min-width: 240px; display: grid; gap: 12px; }
    .doc-meta div, .doc-card, .doc-total-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 18px; padding: 16px 18px; }
    .doc-meta span, .doc-card p { display: block; font-size: 12px; color: #71717a; margin: 0 0 4px; }
    .doc-meta strong, .doc-card h2 { font-size: 16px; color: #111111; }
    .doc-grid { margin-top: 24px; }
    .doc-grid > * { flex: 1; }
    .doc-items { margin-top: 28px; }
    .section-heading-row { align-items: flex-end; margin-bottom: 18px; }
    .doc-barcode-wrap { text-align: right; }
    .doc-barcode { display: flex; justify-content: flex-end; gap: 2px; margin-bottom: 8px; }
    .doc-barcode-wrap p { margin: 0; font-size: 11px; color: #52525b; letter-spacing: 0.28em; }
    .doc-table { display: grid; gap: 14px; }
    .doc-item-row { align-items: center; border: 1px solid #e4e4e7; border-radius: 22px; padding: 16px 18px; }
    .doc-item-main { display: flex; align-items: center; gap: 16px; flex: 1; }
    .doc-image-wrap { width: 78px; height: 98px; border-radius: 18px; overflow: hidden; background: #f4f4f5; border: 1px solid #e4e4e7; flex-shrink: 0; }
    .doc-image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .doc-image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #a1a1aa; font-size: 11px; }
    .doc-item-main h3 { margin: 0 0 8px; font-size: 18px; }
    .doc-item-main p, .doc-footer p { margin: 0 0 5px; font-size: 13px; color: #52525b; line-height: 1.5; }
    .doc-item-side { min-width: 160px; text-align: right; }
    .doc-item-side p { margin: 0 0 6px; font-size: 13px; color: #52525b; }
    .doc-item-side strong { font-size: 18px; }
    .doc-footer { align-items: flex-end; margin-top: 28px; padding-top: 24px; border-top: 1px solid #e4e4e7; }
    .doc-total-box { min-width: 220px; text-align: right; }
    .doc-total-box span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #71717a; }
    .doc-total-box strong { display: block; margin-top: 6px; font-size: 28px; }
    .print-note {
      display: inline-flex;
      margin: 0 auto 18px;
      padding: 10px 14px;
      border-radius: 999px;
      background: #111111;
      color: white;
      font: 600 12px/1.4 Arial, sans-serif;
    }
    .label-shell {
      background: #ffffff;
      border: 2px solid #111111;
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.08);
    }
    .label-top, .label-addresses, .label-footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .label-brand { display: flex; gap: 16px; align-items: center; }
    .label-brand img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 18px;
      border: 1px solid #e4e4e7;
    }
    .label-addresses { margin-top: 28px; }
    .label-col {
      flex: 1;
      border: 1px solid #e4e4e7;
      border-radius: 20px;
      padding: 16px 18px;
      background: #fafafa;
    }
    .label-col h3, .label-top h2 { margin: 8px 0 6px; }
    .label-col p, .label-meta p, .label-footer p { margin: 0 0 4px; font-size: 13px; color: #52525b; line-height: 1.5; }
    .label-meta {
      min-width: 220px;
      display: grid;
      gap: 10px;
      text-align: right;
    }
    .label-meta div { padding: 12px 14px; border-radius: 16px; background: #111111; color: #ffffff; }
    .label-meta span { display: block; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.7; }
    .label-meta strong { display: block; margin-top: 6px; font-size: 18px; }
    .label-barcode-box {
      margin-top: 28px;
      border: 2px solid #111111;
      border-radius: 20px;
      padding: 20px;
      text-align: center;
    }
    .label-barcode { display: flex; justify-content: center; gap: 2px; margin-bottom: 12px; }
    .label-items {
      margin-top: 24px;
      border: 1px solid #e4e4e7;
      border-radius: 20px;
      padding: 16px 18px;
      background: #fafafa;
    }
    .label-items ul { margin: 10px 0 0; padding-left: 18px; }
    .label-items li { margin-bottom: 8px; font-size: 13px; color: #52525b; }
    .label-footer { margin-top: 20px; align-items: flex-end; }
    @media print {
      body { background: #ffffff; }
      .page { max-width: none; margin: 0; padding: 0; }
      .doc-shell, .label-shell { box-shadow: none; border-radius: 0; }
      .print-note { display: none; }
    }
  `;
}

function buildInvoiceMarkup(order, products, settings) {
  const lineItems = getOrderLineItems(order, products);
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = 0;
  const grandTotal = Number(order.total ?? order.total_amount ?? subtotal);
  const statusLabel = normalizeStatusLabel(order.status);
  const barcode = buildBarcodeMarkup(`SRF${order.id}`);

  return `
    <div class="doc-shell">
      <header class="doc-header">
        <div class="doc-brand">
          <img src="${settings.logoUrl}" alt="Seraphine logo" referrerpolicy="no-referrer">
          <div>
            <p class="doc-kicker">Luxury Commerce Invoice</p>
            <h1>${escapeHtml(settings.storeName || 'Seraphine Couture')}</h1>
            <p>${escapeHtml(settings.address || 'Via Montenapoleone 18, Milan, Italy')}</p>
            <p>${escapeHtml(settings.storeEmail || 'atelier@seraphine.com')}</p>
          </div>
        </div>
        <div class="doc-meta">
          <div>
            <span>Order ID</span>
            <strong>#${escapeHtml(order.id)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>${escapeHtml(statusLabel)}</strong>
          </div>
          <div>
            <span>Order Date</span>
            <strong>${escapeHtml(new Date(order.date || order.order_date).toLocaleString())}</strong>
          </div>
        </div>
      </header>

      <section class="doc-grid">
        <div class="doc-card">
          <p class="section-label">Bill To</p>
          <h2>${escapeHtml(order.customerName || 'Guest Customer')}</h2>
          <p>${escapeHtml(order.address || 'Address unavailable')}</p>
          <p>Customer ID: ${escapeHtml(order.customerId || '-')}</p>
        </div>
        <div class="doc-card">
          <p class="section-label">Payment</p>
          <h2>${escapeHtml(order.payment_method_label || 'Payment')}</h2>
          <p>${escapeHtml(order.shipping_service_label || 'Shipping service not set')}</p>
          <p>${order.payment_last4 ? `Reference ending ${escapeHtml(order.payment_last4)}` : 'Reference unavailable'}</p>
          <p>Subtotal: ${formatCurrency(subtotal)}</p>
          <p>Shipping: ${formatCurrency(order.shipping_fee ?? shippingFee)}</p>
          <p>Total charged: ${formatCurrency(grandTotal)}</p>
        </div>
      </section>

      <section class="doc-items">
        <div class="section-heading-row">
          <div>
            <p class="section-label">Order Items</p>
            <h2>Transaction Summary</h2>
          </div>
          <div class="doc-barcode-wrap">
            <div class="doc-barcode">${barcode}</div>
            <p>SRF-${escapeHtml(String(order.id).replace(/[^a-zA-Z0-9]/g, ''))}</p>
          </div>
        </div>

        <div class="doc-table">
          ${lineItems.map((item) => `
            <article class="doc-item-row">
              <div class="doc-item-main">
                <div class="doc-image-wrap">
                  ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.productName)}" referrerpolicy="no-referrer">` : `<div class="doc-image-placeholder">No Image</div>`}
                </div>
                <div>
                  <h3>${escapeHtml(item.productName)}</h3>
                  <p>Product ID: ${escapeHtml(item.productId)}</p>
                  <p>Variant: Size ${escapeHtml(item.size || '-')} • Color ${escapeHtml(item.color || '-')}</p>
                </div>
              </div>
              <div class="doc-item-side">
                <p>Qty ${escapeHtml(item.quantity)}</p>
                <p>${formatCurrency(item.price)} each</p>
                <strong>${formatCurrency(item.lineTotal)}</strong>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <footer class="doc-footer">
        <div>
          <p class="section-label">Notes</p>
          <p>This invoice was generated from the Seraphine admin panel and can be archived as PDF for finance, fulfillment, and customer support.</p>
        </div>
        <div class="doc-total-box">
          <span>Total</span>
          <strong>${formatCurrency(grandTotal)}</strong>
        </div>
      </footer>
    </div>
  `;
}

function buildShippingLabelMarkup(order, products, settings) {
  const lineItems = getOrderLineItems(order, products);
  const barcode = buildBarcodeMarkup(`LBL${order.id}`);
  return `
    <div class="label-shell">
      <header class="label-top">
        <div class="label-brand">
          <img src="${settings.logoUrl}" alt="Seraphine logo" referrerpolicy="no-referrer">
          <div>
            <p class="doc-kicker">Shipping Label</p>
            <h2>${escapeHtml(settings.storeName || 'Seraphine Couture')}</h2>
            <p>${escapeHtml(settings.address || 'Via Montenapoleone 18, Milan, Italy')}</p>
          </div>
        </div>
        <div class="label-meta">
          <div>
            <span>Order ID</span>
            <strong>#${escapeHtml(order.id)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>${escapeHtml(normalizeStatusLabel(order.status))}</strong>
          </div>
        </div>
      </header>

      <section class="label-addresses">
        <div class="label-col">
          <p class="section-label">Ship From</p>
          <h3>${escapeHtml(settings.storeName || 'Seraphine Couture')}</h3>
          <p>${escapeHtml(settings.address || 'Via Montenapoleone 18, Milan, Italy')}</p>
          <p>${escapeHtml(settings.storeEmail || 'atelier@seraphine.com')}</p>
        </div>
        <div class="label-col">
          <p class="section-label">Ship To</p>
          <h3>${escapeHtml(order.customerName || 'Guest Customer')}</h3>
          <p>${escapeHtml(order.address || 'Address unavailable')}</p>
          <p>${escapeHtml(order.shipping_phone || '-')}</p>
          <p>Customer ID: ${escapeHtml(order.customerId || '-')}</p>
        </div>
      </section>

      <section class="label-barcode-box">
        <div class="label-barcode">${barcode}</div>
        <p class="doc-kicker">SRF-LABEL-${escapeHtml(String(order.id).replace(/[^a-zA-Z0-9]/g, ''))}</p>
      </section>

      <section class="label-items">
        <p class="section-label">Package Contents</p>
        <ul>
          ${lineItems.map((item) => `<li>${escapeHtml(item.productName)} • Size ${escapeHtml(item.size || '-')} • Color ${escapeHtml(item.color || '-')} • Qty ${escapeHtml(item.quantity)}</li>`).join('')}
        </ul>
      </section>

      <footer class="label-footer">
        <div>
          <p class="section-label">Dispatch Date</p>
          <p>${escapeHtml(new Date(order.date || order.order_date).toLocaleDateString())}</p>
        </div>
        <div style="text-align:right">
          <p class="section-label">Payment Reference</p>
          <p>${escapeHtml(order.payment_method_label || 'Payment')}</p>
          <p>${order.payment_last4 ? `Ref ending ${escapeHtml(order.payment_last4)}` : 'No stored reference'}</p>
        </div>
      </footer>
    </div>
  `;
}

function openPrintDocument(title, markup) {
  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) {
    toast.show('Popup diblokir browser. Izinkan popup untuk mencetak dokumen.', 'error');
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>${getDocumentStyles()}</style>
      </head>
      <body>
        <div class="page">
          <div class="print-note">Gunakan destination “Save as PDF” jika ingin menyimpan dokumen ini sebagai PDF.</div>
          ${markup}
        </div>
        <script>
          const images = Array.from(document.images);
          let loaded = 0;
          const triggerPrint = () => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 300);
          };
          if (!images.length) {
            triggerPrint();
          } else {
            const done = () => {
              loaded += 1;
              if (loaded >= images.length) triggerPrint();
            };
            images.forEach((image) => {
              if (image.complete) {
                done();
              } else {
                image.addEventListener('load', done, { once: true });
                image.addEventListener('error', done, { once: true });
              }
            });
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function downloadPdfFromMarkup(filename, markup) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = '960px';
  wrapper.style.background = '#f4f4f5';
  wrapper.style.padding = '24px';
  wrapper.innerHTML = `<style>${getDocumentStyles()}</style><div class="page">${markup}</div>`;
  document.body.appendChild(wrapper);

  try {
    await inlineImagesForPdf(wrapper);

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#f4f4f5',
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
    toast.show('PDF berhasil diunduh.', 'success');
  } catch (error) {
    console.error(error);
    toast.show('Gagal membuat PDF. Coba lagi.', 'error');
  } finally {
    wrapper.remove();
  }
}

function printInvoice(order, products) {
  const settings = getDocumentSettings();
  openPrintDocument(`Invoice - Order ${order.id}`, buildInvoiceMarkup(order, products, settings));
}

function printShippingLabel(order, products) {
  const settings = getDocumentSettings();
  openPrintDocument(`Shipping Label - Order ${order.id}`, buildShippingLabelMarkup(order, products, settings));
}

function downloadInvoicePdf(order, products) {
  const settings = getDocumentSettings();
  return downloadPdfFromMarkup(`seraphine_invoice_${order.id}`, buildInvoiceMarkup(order, products, settings));
}

function normalizeStatusLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Pending';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getOrderSearchText(order) {
  return [
    order.id,
    order.customerName,
    order.customerId,
    order.address,
    normalizeStatusLabel(order.status),
    ...(order.items || []).map((item) => `${item.product_id} ${item.size || ''} ${item.color || ''}`),
  ].join(' ').toLowerCase();
}

export const renderOrders = async (container) => {
  const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()]);
  
  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Orders</h2>
        <div class="flex items-center gap-3">
          <button id="export-orders-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input id="orders-search" type="text" placeholder="Search orders, customer, product, or address..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
          <div class="flex items-center gap-2">
            <select id="orders-status-filter" class="bg-zinc-100 border-none text-sm text-zinc-500 rounded-lg px-3 py-2 focus:ring-0">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div id="orders-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('orders-table-container');
  const searchInput = document.getElementById('orders-search');
  const statusFilter = document.getElementById('orders-status-filter');
  const tableConfig = {
    columns: [
      { key: 'id', label: 'Order ID', render: (val) => `<span class="font-mono text-xs font-bold text-black">${val}</span>` },
      { key: 'customerName', label: 'Customer', render: (val) => `<span class="text-zinc-600">${val}</span>` },
      { key: 'total', label: 'Total', render: (val, item) => `<span class="font-medium text-black">$${Number(val ?? item.total_amount ?? 0).toLocaleString()}</span>` },
      { key: 'status', label: 'Status', render: (val) => {
        const label = normalizeStatusLabel(val);
        return `
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            label === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
            label === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            label === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
            label === 'Completed' ? 'bg-zinc-100 text-zinc-600 border border-zinc-200' :
            'bg-red-50 text-red-600 border border-red-100'
          }">${label}</span>
        `;
      }},
      { key: 'date', label: 'Date', render: (val, item) => `<span class="text-zinc-400 text-xs">${new Date(val || item.order_date).toLocaleDateString()}</span>` },
    ],
    actions: (item) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-end gap-2';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      viewBtn.innerHTML = icons.eye;
      viewBtn.onclick = () => showOrderDetail(item, products);
      const printBtn = document.createElement('button');
      printBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      printBtn.innerHTML = icons.printer;
      printBtn.title = 'Print Shipping Label';
      printBtn.onclick = () => printShippingLabel(item, products);
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      downloadBtn.innerHTML = icons.download;
      downloadBtn.title = 'Download Invoice PDF';
      downloadBtn.onclick = () => downloadInvoicePdf(item, products);
      div.appendChild(viewBtn);
      div.appendChild(printBtn);
      div.appendChild(downloadBtn);
      return div;
    },
  };

  const getFilteredOrders = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const selectedStatus = statusFilter?.value || 'all';
    return orders.filter((order) => {
      const matchesKeyword = !keyword || getOrderSearchText(order).includes(keyword);
      const matchesStatus = selectedStatus === 'all' || String(order.status || '').toLowerCase() === selectedStatus;
      return matchesKeyword && matchesStatus;
    });
  };

  const renderFilteredOrders = () => {
    renderTable({
      container: tableContainer,
      data: getFilteredOrders(),
      columns: tableConfig.columns,
      actions: tableConfig.actions,
    });
  };

  searchInput?.addEventListener('input', renderFilteredOrders);
  statusFilter?.addEventListener('change', renderFilteredOrders);
  renderFilteredOrders();

  document.getElementById('export-orders-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredOrders(), 'seraphine_orders', [
      { key: 'id', label: 'Order ID' },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerId', label: 'Customer ID' },
      { key: (row) => normalizeStatusLabel(row.status), label: 'Status' },
      { key: (row) => Number(row.total ?? row.total_amount ?? 0), label: 'Total Amount' },
      { key: 'address', label: 'Shipping Address' },
      { key: 'payment_last4', label: 'Card Last 4' },
      { key: (row) => new Date(row.date || row.order_date).toISOString(), label: 'Order Date' },
      { key: (row) => (row.items || []).map((item) => `${item.product_id} | size:${item.size || '-'} | color:${item.color || '-'} | qty:${item.quantity}`).join(' ; '), label: 'Items' },
    ]);
  });
};

function showOrderDetail(order, products) {
  const content = document.createElement('div');
  content.className = 'space-y-6';
  content.innerHTML = `
    <div class="grid grid-cols-2 gap-8">
      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Customer Information</p>
          <p class="text-sm text-black font-medium">${order.customerName}</p>
          <p class="text-xs text-zinc-400">ID: ${order.customerId}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Shipping Address</p>
          <p class="text-sm text-zinc-600 leading-relaxed">${order.address}</p>
        </div>
      </div>
      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Order Status</p>
          <select id="update-status" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-3 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
            <option ${String(order.status).toLowerCase() === 'pending' ? 'selected' : ''}>Pending</option>
            <option ${String(order.status).toLowerCase() === 'paid' ? 'selected' : ''}>Paid</option>
            <option ${String(order.status).toLowerCase() === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option ${String(order.status).toLowerCase() === 'completed' ? 'selected' : ''}>Completed</option>
            <option ${String(order.status).toLowerCase() === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-medium text-zinc-400 uppercase">Order Date</p>
          <p class="text-sm text-zinc-600">${new Date(order.date).toLocaleString()}</p>
        </div>
      </div>
    </div>
    
    <div class="space-y-3 pt-4 border-t border-zinc-100">
      <p class="text-xs font-medium text-zinc-400 uppercase">Order Items</p>
      <div class="space-y-2">
        ${order.items.map(item => {
          const productId = item.productId || item.product_id;
          const product = products.find((entry) => entry.id === productId);
          return `
          <div class="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
            <div class="flex items-center gap-3">
              <img src="${product?.image || ''}" class="w-10 h-10 rounded bg-zinc-100 object-cover" referrerPolicy="no-referrer">
              <div class="space-y-0.5">
                <p class="text-sm font-medium text-black">${product?.name || `Product ${productId}`}</p>
                <p class="text-xs text-zinc-400">Size: ${item.size || '-'} • Color: ${item.color || '-'} • Qty: ${item.quantity} x $${item.price.toLocaleString()}</p>
              </div>
            </div>
            <p class="text-sm font-bold text-black">$${(item.quantity * item.price).toLocaleString()}</p>
          </div>
        `;}).join('')}
      </div>
      <div class="flex items-center justify-between pt-4">
        <p class="text-lg font-bold text-black">Total Amount</p>
        <p class="text-2xl font-bold text-black">$${order.total}</p>
      </div>
    </div>
  `;

  modal.show(`Order Detail: ${order.id}`, content, [
    {
      label: 'Print Label',
      onClick: () => {
        printShippingLabel(order, products);
      }
    },
    {
      label: 'Print Invoice',
      onClick: () => {
        printInvoice(order, products);
      }
    },
    {
      label: 'Download PDF',
      onClick: async () => {
        await downloadInvoicePdf(order, products);
      }
    },
    {
      label: 'Update Status',
      onClick: async () => {
        const newStatus = document.getElementById('update-status').value;
        await updateOrderStatus(order.id, newStatus);
        toast.show(`Order status updated to ${newStatus}`, 'success');
        await renderOrders(document.getElementById('main-content'));
      }
    }
  ]);
}
