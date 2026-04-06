/**
 * Products Module
 * CRUD and filtering.
 */

import { createProduct, deleteProductById, fetchProducts, updateProduct, uploadProductImage } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

function getProductSearchText(product) {
  return [
    product.name,
    product.sku,
    product.category,
    product.description,
    ...(product.sizes || []),
    ...(product.colors || []),
  ].join(' ').toLowerCase();
}

export const renderProducts = async (container) => {
  const products = await fetchProducts();
  const categories = ['Apparel', 'Bags', 'Footwear', 'Accessories'];
  
  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Products</h2>
        <div class="flex items-center gap-3">
          <button id="export-products-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
          <button id="add-product-btn" class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
            ${icons.plus} Add Product
          </button>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input id="products-search" type="text" placeholder="Search product, SKU, size, or color..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
          <div class="flex items-center gap-2">
            <select id="products-category-filter" class="bg-zinc-100 border-none text-sm text-zinc-500 rounded-lg px-3 py-2 focus:ring-0">
              <option value="all">All Categories</option>
              ${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="products-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('products-table-container');
  const searchInput = document.getElementById('products-search');
  const categoryFilter = document.getElementById('products-category-filter');
  const tableConfig = {
    columns: [
      { key: 'image', label: 'Product', render: (val, item) => `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
            <img src="${val || item.images?.[0] || ''}" class="w-full h-full object-cover bg-zinc-100" referrerPolicy="no-referrer">
          </div>
          <div class="space-y-1">
            <p class="font-medium text-black">${item.name}</p>
            <p class="text-xs text-zinc-400">${item.category} • ${item.sku || `SRF-${item.id}`}</p>
          </div>
        </div>
      `},
      { key: 'price', label: 'Price', render: (val) => `$${val.toLocaleString()}` },
      { key: 'sizes', label: 'Size Run', render: (val) => `<span class="text-xs text-zinc-500">${(val || []).join(', ')}</span>` },
      { key: 'stock', label: 'Stock', render: (val, item) => `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full ${val < 10 ? 'bg-red-500' : 'bg-emerald-500'}"></div>
          <span class="${val < 10 ? 'text-red-600' : 'text-emerald-600'}">${val} units</span>
          <span class="text-xs text-zinc-400">${item.variantStocks?.length || 0} variants</span>
        </div>
      `},
      { key: 'soldCount', label: 'Sold', render: (val) => `<span class="text-sm font-medium text-black">${Number(val || 0)} units</span>` },
      { key: 'rating', label: 'Rating', render: (val, item) => `<span class="text-xs text-zinc-500">${Number(val || 0).toFixed(1)} / 5 · ${Number(item.reviews || 0)} reviews</span>` },
      { key: 'colors', label: 'Colorways', render: (val) => `<span class="text-xs text-zinc-500">${(val || []).join(', ')}</span>` },
    ],
    actions: (item) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-end gap-2';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
      editBtn.innerHTML = icons.edit;
      editBtn.onclick = () => showProductModal(item);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg';
      deleteBtn.innerHTML = icons.trash;
      deleteBtn.onclick = () => deleteProduct(item.id);
      
      div.appendChild(editBtn);
      div.appendChild(deleteBtn);
      return div;
    }
  };

  const getFilteredProducts = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const category = categoryFilter?.value || 'all';
    return products.filter((product) => {
      const matchesKeyword = !keyword || getProductSearchText(product).includes(keyword);
      const matchesCategory = category === 'all' || product.category === category;
      return matchesKeyword && matchesCategory;
    });
  };

  const renderFilteredProducts = () => {
    renderTable({
      container: tableContainer,
      data: getFilteredProducts(),
      columns: tableConfig.columns,
      actions: tableConfig.actions,
    });
  };

  searchInput?.addEventListener('input', renderFilteredProducts);
  categoryFilter?.addEventListener('change', renderFilteredProducts);
  renderFilteredProducts();

  document.getElementById('add-product-btn')?.addEventListener('click', () => showProductModal());
  document.getElementById('export-products-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredProducts(), 'seraphine_products', [
      { key: 'id', label: 'Product ID' },
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price' },
      { key: 'stock', label: 'Stock' },
      { key: 'soldCount', label: 'Sold Count' },
      { key: 'rating', label: 'Rating' },
      { key: 'reviews', label: 'Reviews' },
      { key: 'sizes', label: 'Sizes' },
      { key: 'colors', label: 'Colors' },
    ]);
  });
};

function showProductModal(product) {
  const isEdit = !!product;
  const categories = ['Apparel', 'Bags', 'Footwear', 'Accessories'];
  const currentImage = product?.image || product?.images?.[0] || '';
  const initialSizes = product?.sizes || [];
  const initialColors = product?.colors || [];
  const initialVariantStocks = Array.isArray(product?.variantStocks) ? product.variantStocks : [];
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Product Name</label>
        <input type="text" id="p-name" value="${product?.name || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</label>
        <select id="p-category" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
          ${categories.map((category) => `<option ${product?.category === category ? 'selected' : ''}>${category}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Price ($)</label>
        <input type="number" id="p-price" value="${product?.price || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Stock</label>
        <input type="number" id="p-stock-total" value="${product?.stock || 0}" class="w-full bg-zinc-100 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-0" readonly>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sizes</label>
        <input type="text" id="p-sizes" value="${(product?.sizes || []).join(', ')}" placeholder="XS, S, M, L" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Colors</label>
        <input type="text" id="p-colors" value="${(product?.colors || []).join(', ')}" placeholder="Black, Gold" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
      </div>
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Image URL</label>
      <input type="url" id="p-image" value="${currentImage}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300" placeholder="http://... atau hasil upload lokal">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Upload Image</label>
      <input type="file" id="p-image-file" accept="image/png,image/jpeg,image/webp,image/gif" class="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300 file:mr-4 file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-white">
      <p class="text-xs text-zinc-500">Rekomendasi ukuran portrait 3:4 seperti 1200x1600. File akan disimpan ke folder assets/img dan dipakai juga oleh web utama.</p>
    </div>
    <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div class="aspect-[3/4] overflow-hidden rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
        <img id="p-image-preview" src="${currentImage}" class="h-full w-full object-cover ${currentImage ? '' : 'hidden'}" referrerPolicy="no-referrer">
        <span id="p-image-empty" class="text-xs uppercase tracking-widest text-zinc-400 ${currentImage ? 'hidden' : ''}">No image selected</span>
      </div>
      <p id="p-image-ratio-note" class="mt-3 text-xs text-zinc-500">Rasio ideal 3:4. Jika tidak sesuai, gambar akan dipotong otomatis agar tetap pas.</p>
    </div>
    <div class="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Variant Stock</p>
          <p class="text-xs text-zinc-500">Atur stok per kombinasi size dan color. Checkout akan mengurangi stok varian yang dipilih.</p>
        </div>
        <button type="button" id="p-regenerate-variants" class="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white rounded-lg">Refresh Variants</button>
      </div>
      <div id="p-variant-stock-grid" class="space-y-2"></div>
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description</label>
      <textarea id="p-desc" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300 h-24">${product?.description || ''}</textarea>
    </div>
  `;

  const imageInput = content.querySelector('#p-image');
  const fileInput = content.querySelector('#p-image-file');
  const previewImage = content.querySelector('#p-image-preview');
  const previewEmpty = content.querySelector('#p-image-empty');
  const ratioNote = content.querySelector('#p-image-ratio-note');
  const variantGrid = content.querySelector('#p-variant-stock-grid');
  const totalStockInput = content.querySelector('#p-stock-total');
  const sizeInput = content.querySelector('#p-sizes');
  const colorInput = content.querySelector('#p-colors');

  const variantKey = (sizeValue, colorValue) => `${sizeValue || ''}::${colorValue || ''}`;

  const buildVariantDefinitions = (sizes, colors) => {
    const normalizedSizes = sizes.length ? sizes : ['Default'];
    const normalizedColors = colors.length ? colors : ['Default'];
    return normalizedSizes.flatMap((sizeValue) => normalizedColors.map((colorValue) => ({
      size: sizeValue === 'Default' ? null : sizeValue,
      color: colorValue === 'Default' ? null : colorValue,
    })));
  };

  const collectCurrentVariantValues = () => {
    const current = new Map();
    variantGrid.querySelectorAll('[data-variant-key]').forEach((input) => {
      current.set(input.dataset.variantKey, Number(input.value || 0));
    });
    return current;
  };

  const renderVariantGrid = (preserve = true) => {
    const sizes = sizeInput.value.split(',').map((value) => value.trim()).filter(Boolean);
    const colors = colorInput.value.split(',').map((value) => value.trim()).filter(Boolean);
    const definitions = buildVariantDefinitions(sizes, colors);
    const persisted = preserve ? collectCurrentVariantValues() : new Map();
    const initialMap = new Map(initialVariantStocks.map((variant) => [variantKey(variant.size, variant.color), Number(variant.stock || 0)]));

    variantGrid.innerHTML = definitions.map((variant) => {
      const key = variantKey(variant.size, variant.color);
      const value = persisted.has(key) ? persisted.get(key) : (initialMap.get(key) ?? 0);
      const label = [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default Variant';
      return `
        <div class="grid grid-cols-[1fr_120px] gap-3 items-center rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <div>
            <p class="text-sm font-medium text-black">${label}</p>
            <p class="text-xs text-zinc-500">Stock khusus untuk varian ini</p>
          </div>
          <input type="number" min="0" value="${value}" data-variant-key="${key}" data-size="${variant.size || ''}" data-color="${variant.color || ''}" class="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
        </div>
      `;
    }).join('');

    const updateTotalStock = () => {
      const total = Array.from(variantGrid.querySelectorAll('[data-variant-key]')).reduce((sum, input) => sum + Number(input.value || 0), 0);
      totalStockInput.value = String(total);
    };

    variantGrid.querySelectorAll('[data-variant-key]').forEach((input) => {
      input.addEventListener('input', updateTotalStock);
    });

    updateTotalStock();
  };

  const updateRatioNote = (width, height) => {
    if (!width || !height) {
      ratioNote.textContent = 'Rasio ideal 3:4. Jika tidak sesuai, gambar akan dipotong otomatis agar tetap pas.';
      ratioNote.className = 'mt-3 text-xs text-zinc-500';
      return;
    }

    const ratio = width / height;
    const targetRatio = 3 / 4;
    const difference = Math.abs(ratio - targetRatio);

    if (difference <= 0.08) {
      ratioNote.textContent = `Rasio gambar ${width}x${height} sudah dekat dengan format ideal 3:4.`;
      ratioNote.className = 'mt-3 text-xs text-emerald-600';
      return;
    }

    ratioNote.textContent = `Rasio gambar ${width}x${height} tidak sesuai 3:4. Sistem akan memotong bagian tepi agar tampil pas.`;
    ratioNote.className = 'mt-3 text-xs text-amber-600';
  };

  const inspectImage = (src) => {
    if (!src) {
      updateRatioNote();
      return;
    }

    const probe = new Image();
    probe.onload = () => updateRatioNote(probe.naturalWidth, probe.naturalHeight);
    probe.onerror = () => updateRatioNote();
    probe.src = src;
  };

  const syncPreview = (src) => {
    if (src) {
      previewImage.src = src;
      previewImage.classList.remove('hidden');
      previewEmpty.classList.add('hidden');
    } else {
      previewImage.src = '';
      previewImage.classList.add('hidden');
      previewEmpty.classList.remove('hidden');
    }

    inspectImage(src);
  };

  imageInput.addEventListener('input', () => {
    if (!fileInput.files?.length) {
      syncPreview(imageInput.value.trim());
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      syncPreview(imageInput.value.trim());
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    syncPreview(objectUrl);
  });

  sizeInput.addEventListener('change', () => renderVariantGrid());
  sizeInput.addEventListener('input', () => renderVariantGrid());
  colorInput.addEventListener('change', () => renderVariantGrid());
  colorInput.addEventListener('input', () => renderVariantGrid());
  content.querySelector('#p-regenerate-variants').addEventListener('click', () => renderVariantGrid(false));

  inspectImage(currentImage);
  renderVariantGrid(false);

  modal.show(isEdit ? 'Edit Product' : 'Add New Product', content, [
    { 
      label: isEdit ? 'Save Changes' : 'Create Product', 
      onClick: async () => {
        const name = document.getElementById('p-name').value;
        const category = document.getElementById('p-category').value;
        const price = parseFloat(document.getElementById('p-price').value);
        const sizes = document.getElementById('p-sizes').value.split(',').map((value) => value.trim()).filter(Boolean);
        const colors = document.getElementById('p-colors').value.split(',').map((value) => value.trim()).filter(Boolean);
        let image = document.getElementById('p-image').value.trim();
        const description = document.getElementById('p-desc').value;
        const selectedFile = document.getElementById('p-image-file').files?.[0];
        const variantStocks = Array.from(variantGrid.querySelectorAll('[data-variant-key]')).map((input) => ({
          size: input.dataset.size || null,
          color: input.dataset.color || null,
          stock: Number(input.value || 0),
        }));
        const stock = variantStocks.reduce((sum, variant) => sum + variant.stock, 0);

        if (!name || isNaN(price)) {
          toast.show('Please fill all required fields', 'error');
          return;
        }

        if (selectedFile) {
          const uploadResult = await uploadProductImage(selectedFile);
          image = uploadResult.url;
        }

        const payload = {
          sku: product?.sku || `SRF-${Date.now().toString().slice(-6)}`,
          name,
          category,
          price,
          stock,
          sizes,
          colors,
          variantStocks,
          images: [image || currentImage || ''],
          description,
          isFeatured: Boolean(product?.isFeatured),
          isNew: Boolean(product?.isNew),
          rating: Number(product?.rating || 0),
          reviews: Number(product?.reviews || 0),
        };

        if (!payload.images[0]) {
          toast.show('Please provide an image URL or upload a file', 'error');
          return;
        }

        if (isEdit) {
          await updateProduct(product.id, { id: product.id, ...payload });
          toast.show('Product updated successfully', 'success');
        } else {
          await createProduct(payload);
          toast.show('Product created successfully', 'success');
        }
        await renderProducts(document.getElementById('main-content'));
      }
    }
  ]);
}

function deleteProduct(id) {
  modal.show('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', [
    {
      label: 'Delete',
      variant: 'danger',
      onClick: async () => {
        await deleteProductById(id);
        toast.show('Product deleted', 'success');
        await renderProducts(document.getElementById('main-content'));
      }
    }
  ]);
}
