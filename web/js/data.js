import { API_BASE } from './config.js';

const FALLBACK_PRODUCTS = [
    {
        id: '1',
        sku: 'SRF-001',
        name: 'Silk Evening Gown',
        price: 2450,
        category: 'Apparel',
        description: 'A breathtaking floor-length gown crafted from the finest Italian silk. Features a delicate cowl neckline and an elegant open back.',
        images: [
            'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Midnight Black', 'Champagne', 'Emerald'],
        stock: 3,
        rating: 4.9,
        reviews: 12,
        isFeatured: true,
        isNew: true
    },
    {
        id: '2',
        sku: 'SRF-002',
        name: 'Leather Monogram Tote',
        price: 1850,
        category: 'Bags',
        description: 'Signature monogrammed leather tote with gold-tone hardware. Spacious interior with multiple compartments for the modern professional.',
        images: [
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['One Size'],
        colors: ['Cognac', 'Onyx'],
        stock: 5,
        rating: 4.8,
        reviews: 24,
        isFeatured: true,
        isNew: true
    },
    {
        id: '3',
        sku: 'SRF-003',
        name: 'Velvet Smoking Jacket',
        price: 1200,
        category: 'Apparel',
        description: 'A classic tailored smoking jacket in rich burgundy velvet. Satin lapels and silk lining provide ultimate comfort and style.',
        images: [
            'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Burgundy', 'Navy'],
        stock: 2,
        rating: 5.0,
        reviews: 8,
        isNew: true
    },
    {
        id: '4',
        sku: 'SRF-004',
        name: 'Gold Link Bracelet',
        price: 3200,
        category: 'Accessories',
        description: '18k solid gold link bracelet. A timeless piece that exudes sophistication and grace.',
        images: [
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1611085583191-a3b13b24424a?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['S', 'M'],
        colors: ['Gold'],
        stock: 1,
        rating: 4.9,
        reviews: 15,
        isFeatured: true
    },
    {
        id: '5',
        sku: 'SRF-005',
        name: 'Suede Chelsea Boots',
        price: 850,
        category: 'Footwear',
        description: 'Handcrafted Italian suede boots with a sleek silhouette. Elastic side panels and pull tabs for easy wear.',
        images: [
            'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['40', '41', '42', '43', '44'],
        colors: ['Sand', 'Chocolate'],
        stock: 8,
        rating: 4.7,
        reviews: 32
    },
    {
        id: '6',
        sku: 'SRF-006',
        name: 'Cashmere Oversized Coat',
        price: 3800,
        category: 'Apparel',
        description: 'Luxurious double-faced cashmere coat. Minimalist design with a relaxed fit and waist-defining belt.',
        images: [
            'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['S', 'M', 'L'],
        colors: ['Camel', 'Ivory'],
        stock: 4,
        rating: 4.9,
        reviews: 18,
        isFeatured: true
    },
    {
        id: '7',
        sku: 'SRF-007',
        name: 'Crystal Satin Heels',
        price: 1450,
        category: 'Footwear',
        description: 'Elegant satin heels finished with crystal embellishment, crafted to elevate formal evening looks.',
        images: [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=800'
        ],
        sizes: ['36', '37', '38', '39', '40'],
        colors: ['Black', 'Silver'],
        stock: 6,
        rating: 4.8,
        reviews: 11,
        isFeatured: true
    }
];

export const PRODUCTS = [];

function buildVariantStocks(product) {
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [null];
    const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : [null];
    const combinations = sizes.flatMap((size) => colors.map((color) => ({ size, color, stock: 0 })));
    const existing = Array.isArray(product.variantStocks) ? product.variantStocks : [];
    if (existing.length) {
        const existingMap = new Map(existing.map((variant) => [`${variant.size || ''}::${variant.color || ''}`, Number(variant.stock || 0)]));
        return combinations.map((variant) => ({
            ...variant,
            stock: existingMap.get(`${variant.size || ''}::${variant.color || ''}`) ?? 0,
        }));
    }

    const total = Number(product.stock || 0);
    for (let index = 0; index < total; index += 1) {
        combinations[index % combinations.length].stock += 1;
    }
    return combinations;
}

function normalizeProduct(product) {
    const normalizeImageUrl = (imageUrl) => {
        if (!imageUrl) return imageUrl;
        if (String(imageUrl).startsWith('/assets/')) return imageUrl;

        try {
            const parsed = new URL(imageUrl, window.location.origin);
            if (parsed.pathname.startsWith('/assets/')) {
                return parsed.pathname;
            }
        } catch {
            return imageUrl;
        }

        return imageUrl;
    };

    const images = (Array.isArray(product.images) ? product.images : []).map(normalizeImageUrl);
    return {
        ...product,
        id: String(product.id),
        images,
        image: normalizeImageUrl(product.image) || images[0] || '',
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
        reviewEntries: Array.isArray(product.reviewEntries) ? product.reviewEntries : [],
        variantStocks: buildVariantStocks(product),
        isFeatured: Boolean(product.isFeatured),
        isNew: Boolean(product.isNew),
    };
}

export function setProducts(products) {
    PRODUCTS.splice(0, PRODUCTS.length, ...products.map(normalizeProduct));
}

export function getProductById(productId) {
    return PRODUCTS.find((product) => product.id === String(productId));
}

export function getVariantStock(product, size = null, color = null) {
    if (!product) return 0;
    const variant = (product.variantStocks || []).find((entry) => entry.size === size && entry.color === color);
    return Number(variant?.stock || 0);
}

export async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) {
            throw new Error(`Failed to load products: ${response.status}`);
        }

        const products = await response.json();
        setProducts(products);
    } catch (error) {
        console.warn('Using fallback product catalog.', error.message);
        setProducts(FALLBACK_PRODUCTS);
    }

    return PRODUCTS;
}

setProducts(FALLBACK_PRODUCTS);
