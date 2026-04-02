import { PRODUCTS } from './data.js';
import { state } from './state.js';

function renderProductCard(product) {
    const isWishlisted = state.wishlist.some(p => p.id === product.id);
    return `
        <div class="group relative fade-in">
            <div class="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                <a href="#" onclick="event.preventDefault(); window.navigate('product', {productId: '${product.id}'})">
                    <img src="${product.images[0]}" alt="${product.name}" class="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer">
                    ${product.images[1] ? `<img src="${product.images[1]}" alt="${product.name}" class="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-700 group-hover:opacity-100" referrerPolicy="no-referrer">` : ''}
                </a>
                <div class="absolute top-4 left-4 flex flex-col gap-2">
                    ${product.isNew ? `<span class="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">New</span>` : ''}
                    ${product.stock <= 3 ? `<span class="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-black/10 shadow-sm">Only ${product.stock} left</span>` : ''}
                </div>
                <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                    <button onclick="window.toggleWishlist('${product.id}')" class="p-3 rounded-full transition-colors backdrop-blur-md ${isWishlisted ? 'bg-gold text-white' : 'bg-white/80 text-black hover:bg-white'}">
                        <i data-lucide="heart" size="18" ${isWishlisted ? 'fill="currentColor"' : ''}></i>
                    </button>
                    <a href="#" onclick="event.preventDefault(); window.navigate('product', {productId: '${product.id}'})" class="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-zinc-800 transition-colors">Quick View</a>
                </div>
            </div>
            <div class="mt-4 flex flex-col items-center text-center">
                <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">${product.category}</p>
                <a href="#" onclick="event.preventDefault(); window.navigate('product', {productId: '${product.id}'})" class="text-sm font-medium hover:text-gold transition-colors">${product.name}</a>
                <p class="mt-1 text-sm font-serif font-semibold">$${product.price.toLocaleString()}</p>
            </div>
        </div>
    `;
}

export const Pages = {
    home: () => {
        const featured = PRODUCTS.filter(p => p.isFeatured).slice(0, 4);
        return `
            <div class="flex flex-col fade-in">
                <!-- Hero Section -->
                <section class="relative h-screen w-full overflow-hidden flex items-center justify-center">
                    <div class="absolute inset-0 z-0">
                        <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000" class="h-full w-full object-cover object-center scale-105 animate-slow-zoom" referrerPolicy="no-referrer">
                        <div class="absolute inset-0 bg-black/30"></div>
                    </div>
                    <div class="relative z-10 text-center text-white px-6">
                        <p class="text-xs md:text-sm font-bold uppercase tracking-[0.4em] mb-4">Spring / Summer 2026</p>
                        <h1 class="text-5xl md:text-8xl font-serif font-bold mb-8 tracking-tight">The Art of <br> <span class="italic">Elegance</span></h1>
                        <div class="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
                            <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="bg-white text-black px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gold hover:text-white transition-all duration-300">Explore Collection</a>
                        </div>
                    </div>
                </section>

                <!-- Philosophy Section -->
                <section class="py-32 px-6 md:px-12 bg-zinc-50">
                    <div class="max-w-4xl mx-auto text-center">
                        <h2 class="text-xs font-bold uppercase tracking-[0.4em] text-gold mb-8">Our Philosophy</h2>
                        <p class="text-2xl md:text-4xl font-serif leading-relaxed mb-12">
                            "Luxury is not a status, it's a state of mind. We believe in the beauty of simplicity and the power of exceptional craftsmanship."
                        </p>
                        <div class="w-16 h-[1px] bg-zinc-300 mx-auto"></div>
                    </div>
                </section>

                <!-- Featured Collection -->
                <section class="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
                    <div class="flex flex-col md:flex-row justify-between items-end mb-16">
                        <div class="max-w-xl">
                            <h2 class="text-3xl md:text-5xl font-serif mb-6">Curated Excellence</h2>
                            <p class="text-zinc-500 leading-relaxed">Discover our latest arrivals, where tradition meets innovation.</p>
                        </div>
                        <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="group flex items-center space-x-2 text-xs font-bold uppercase tracking-widest mt-8 md:mt-0">
                            <span>View All Products</span>
                            <i data-lucide="arrow-right" size="16"></i>
                        </a>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        ${featured.map(p => renderProductCard(p)).join('')}
                    </div>
                </section>

                <!-- The Atelier Section -->
                <section class="grid grid-cols-1 md:grid-cols-2 h-[80vh]">
                    <div class="relative overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200" class="h-full w-full object-cover" referrerPolicy="no-referrer">
                    </div>
                    <div class="bg-zinc-950 text-white flex flex-col justify-center px-12 md:px-24">
                        <h2 class="text-3xl md:text-5xl font-serif mb-8">The Atelier</h2>
                        <p class="text-zinc-400 leading-relaxed mb-12">
                            Every piece in our collection is born in our Milanese atelier. Our master artisans combine century-old techniques with modern precision to create garments that are truly timeless.
                        </p>
                        <a href="#" onclick="event.preventDefault(); window.navigate('about')" class="text-xs font-bold uppercase tracking-widest border-b border-white pb-1 w-fit hover:text-gold hover:border-gold transition-colors">Learn More</a>
                    </div>
                </section>
            </div>
        `;
    },
    about: () => `
        <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
            <div class="max-w-3xl mx-auto text-center mb-24">
                <h1 class="text-4xl md:text-6xl font-serif mb-8">Our Story</h1>
                <p class="text-zinc-500 leading-relaxed text-lg">
                    Founded in 1924, Seraphine has been at the forefront of luxury fashion for over a century. What began as a small leather workshop in Milan has evolved into a global symbol of elegance and sophistication.
                </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
                <img src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1000" class="w-full aspect-[4/5] object-cover" referrerPolicy="no-referrer">
                <div>
                    <h2 class="text-3xl font-serif mb-6">Craftsmanship Above All</h2>
                    <p class="text-zinc-600 leading-relaxed mb-6">
                        We believe that true luxury lies in the details. Every stitch, every fold, and every material is chosen with meticulous care. Our artisans spend hundreds of hours on a single piece, ensuring it meets our uncompromising standards.
                    </p>
                    <p class="text-zinc-600 leading-relaxed">
                        Sustainability is also at the heart of our craft. We work exclusively with ethical suppliers and prioritize long-lasting quality over fast-fashion trends.
                    </p>
                </div>
            </div>
        </div>
    `,
    collections: () => `
        <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
            <h1 class="text-4xl md:text-6xl font-serif mb-12 text-center">Collections</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                ${['Apparel', 'Bags', 'Footwear', 'Accessories'].map(cat => `
                    <div class="group relative h-[60vh] overflow-hidden cursor-pointer" onclick="window.navigate('shop', {category: '${cat}'})">
                        <img src="${PRODUCTS.find(p => p.category === cat)?.images[0]}" class="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" referrerPolicy="no-referrer">
                        <div class="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors"></div>
                        <div class="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <h3 class="text-4xl font-serif mb-4">${cat}</h3>
                            <span class="text-xs font-bold uppercase tracking-widest border-b border-white pb-1 opacity-0 group-hover:opacity-100 transition-opacity">View Collection</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `,
    shop: () => {
        const category = state.shopCategory;
        const filtered = category === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === category);
        const categories = ['All', 'Apparel', 'Bags', 'Footwear', 'Accessories'];
        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <div class="mb-12">
                    <h1 class="text-4xl md:text-6xl font-serif mb-4">${category === 'All' ? 'The Collection' : category}</h1>
                    <p class="text-zinc-500 max-w-lg">Explore our curated selection of luxury pieces.</p>
                </div>
                <div class="flex flex-wrap items-center justify-between border-y border-zinc-100 py-6 mb-12 gap-4">
                    <div class="flex items-center space-x-8 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                        ${categories.map(cat => `
                            <button onclick="window.navigate('shop', {category: '${cat}'})" class="text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${category === cat ? 'text-gold border-b border-gold pb-1' : 'text-zinc-400 hover:text-black'}">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                    ${filtered.map(p => renderProductCard(p)).join('')}
                </div>
            </div>
        `;
    },
    product: () => {
        const p = state.currentProduct;
        if (!p) return `<div class="pt-32 text-center">Product not found.</div>`;
        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div class="aspect-[3/4] overflow-hidden bg-zinc-100">
                        <img src="${p.images[0]}" class="h-full w-full object-cover object-center" referrerPolicy="no-referrer">
                    </div>
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">${p.category}</p>
                        <h1 class="text-4xl md:text-5xl font-serif mb-4">${p.name}</h1>
                        <p class="text-2xl font-serif font-bold mb-8">$${p.price.toLocaleString()}</p>
                        <p class="text-zinc-600 leading-relaxed mb-10">${p.description}</p>
                        <div class="space-y-8 mb-12">
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-widest mb-4">Size</h3>
                                <div class="flex flex-wrap gap-3">
                                    ${p.sizes.map(s => `<button class="w-12 h-12 flex items-center justify-center text-xs font-bold border border-zinc-200 hover:border-black transition-all">${s}</button>`).join('')}
                                </div>
                            </div>
                        </div>
                        <button onclick="window.addToCart('${p.id}')" class="w-full py-5 bg-black text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center space-x-3">
                            <i data-lucide="shopping-bag" size="18"></i>
                            <span>Add to Bag</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    cart: () => {
        if (state.cart.length === 0) return `
            <div class="pt-48 pb-24 px-6 text-center max-w-2xl mx-auto fade-in">
                <h1 class="text-4xl font-serif mb-6">Your Bag is Empty</h1>
                <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="inline-block bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-[0.2em]">Start Shopping</a>
            </div>
        `;
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <h1 class="text-4xl md:text-5xl font-serif mb-12">Shopping Bag</h1>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div class="lg:col-span-2 space-y-8">
                        ${state.cart.map(item => `
                            <div class="flex space-x-6 py-8 border-b border-zinc-100">
                                <div class="w-24 h-32 bg-zinc-100 flex-shrink-0">
                                    <img src="${item.images[0]}" class="w-full h-full object-cover" referrerPolicy="no-referrer">
                                </div>
                                <div class="flex-grow">
                                    <h3 class="text-sm font-bold uppercase tracking-widest">${item.name}</h3>
                                    <p class="text-xs text-zinc-500 mt-1">$${item.price.toLocaleString()}</p>
                                    <button onclick="window.removeFromCart('${item.id}')" class="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-red-500 mt-4">Remove</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="lg:col-span-1">
                        <div class="bg-zinc-50 p-8 sticky top-32">
                            <h2 class="text-xl font-serif font-bold mb-8">Summary</h2>
                            <div class="flex justify-between items-end pt-4 border-t border-zinc-200 mb-10">
                                <span class="text-xs font-bold uppercase tracking-widest">Total</span>
                                <span class="text-2xl font-serif font-bold">$${total.toLocaleString()}</span>
                            </div>
                            <button onclick="window.navigate('checkout')" class="w-full py-5 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">Checkout</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    login: () => `
        <div class="min-h-screen flex items-center justify-center pt-20 pb-12 px-6 fade-in">
            <div class="w-full max-w-md">
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-serif mb-4 uppercase">Seraphine</h1>
                    <p class="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Welcome Back</p>
                </div>
                <div class="bg-white p-8 md:p-12 border border-zinc-100 shadow-2xl">
                    <form onsubmit="event.preventDefault(); window.handleLogin(this)" class="space-y-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Password</label>
                            <input type="password" name="password" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm">
                        </div>
                        <button type="submit" class="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">Sign In</button>
                    </form>
                </div>
            </div>
        </div>
    `,
    checkout: () => `
        <div class="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto w-full fade-in">
            <h1 class="text-3xl font-serif font-bold mb-12">Checkout</h1>
            <form onsubmit="event.preventDefault(); window.handleCheckout(this)" class="space-y-8">
                <div class="grid grid-cols-2 gap-6">
                    <input placeholder="First Name" required class="px-4 py-3 border border-zinc-200 outline-none text-sm">
                    <input placeholder="Last Name" required class="px-4 py-3 border border-zinc-200 outline-none text-sm">
                </div>
                <input placeholder="Address" required class="w-full px-4 py-3 border border-zinc-200 outline-none text-sm">
                <div class="bg-zinc-50 p-6 space-y-4">
                    <h3 class="text-xs font-bold uppercase tracking-widest">Payment</h3>
                    <input placeholder="Card Number" required class="w-full px-4 py-3 border border-zinc-200 outline-none text-sm">
                </div>
                <button type="submit" class="w-full py-5 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">Complete Purchase</button>
            </form>
        </div>
    `,
    'order-success': () => `
        <div class="pt-48 pb-24 px-6 text-center max-w-2xl mx-auto fade-in">
            <h1 class="text-4xl md:text-5xl font-serif mb-6">Order Confirmed</h1>
            <p class="text-zinc-500 mb-10">Your luxury pieces are being prepared for delivery.</p>
            <a href="#" onclick="event.preventDefault(); window.navigate('home')" class="inline-block bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-[0.2em]">Return Home</a>
        </div>
    `,
    wishlist: () => {
        if (state.wishlist.length === 0) {
            return `
                <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full text-center fade-in">
                    <h1 class="text-4xl md:text-5xl font-serif mb-8">My Wishlist</h1>
                    <p class="text-zinc-500 mb-12">Your wishlist is empty. Start adding items you love!</p>
                    <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="inline-block bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">Continue Shopping</a>
                </div>
            `;
        }
        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <h1 class="text-4xl md:text-5xl font-serif mb-16">My Wishlist</h1>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    ${state.wishlist.map(p => renderProductCard(p)).join('')}
                </div>
            </div>
        `;
    },
    contact: () => `
        <div class="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full fade-in">
            <div class="text-center mb-20">
                <h1 class="text-4xl md:text-5xl font-serif mb-6">Contact Us</h1>
                <p class="text-zinc-500 text-lg">We'd love to hear from you. Get in touch with our team.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
                <div class="text-center">
                    <i data-lucide="map-pin" size="32" class="mx-auto mb-4 text-gold"></i>
                    <h3 class="text-sm font-bold uppercase tracking-widest mb-2">Headquarters</h3>
                    <p class="text-zinc-600 text-sm">Via Montenapoleone 8<br>20121 Milano, Italy</p>
                </div>
                <div class="text-center">
                    <i data-lucide="phone" size="32" class="mx-auto mb-4 text-gold"></i>
                    <h3 class="text-sm font-bold uppercase tracking-widest mb-2">Phone</h3>
                    <p class="text-zinc-600 text-sm">+39 02 7201 5200<br>Available 10am-6pm CET</p>
                </div>
                <div class="text-center">
                    <i data-lucide="mail" size="32" class="mx-auto mb-4 text-gold"></i>
                    <h3 class="text-sm font-bold uppercase tracking-widest mb-2">Email</h3>
                    <p class="text-zinc-600 text-sm">hello@seraphine.com<br>We respond within 24 hours</p>
                </div>
            </div>
            <div class="bg-zinc-50 p-12 rounded-lg">
                <h2 class="text-2xl font-serif font-bold mb-8">Send us a Message</h2>
                <form class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input type="text" placeholder="Your Name" required class="px-4 py-3 border border-zinc-200 outline-none text-sm focus:border-gold">
                        <input type="email" placeholder="Your Email" required class="px-4 py-3 border border-zinc-200 outline-none text-sm focus:border-gold">
                    </div>
                    <input type="text" placeholder="Subject" required class="w-full px-4 py-3 border border-zinc-200 outline-none text-sm focus:border-gold">
                    <textarea placeholder="Your Message" rows="6" required class="w-full px-4 py-3 border border-zinc-200 outline-none text-sm focus:border-gold"></textarea>
                    <button type="submit" class="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">Send Message</button>
                </form>
            </div>
        </div>
    `
};
