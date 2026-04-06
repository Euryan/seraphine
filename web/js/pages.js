import { PRODUCTS, getVariantStock } from './data.js';
import { state } from './state.js';
import { getSavedMeasurements } from './size-advisor.js';

function getSelectedSizeButtonClass(isSelected) {
    return isSelected
        ? 'border-black bg-black text-white'
        : 'border-zinc-200 hover:border-black';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatOrderStatus(status, fallback = '') {
    const source = status || fallback || '';
    if (!source) return 'Pending';
    return source.charAt(0).toUpperCase() + source.slice(1);
}

function renderStars(rating) {
    const safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
    const fullStars = Math.round(safeRating);
    return Array.from({ length: 5 }, (_, index) => index < fullStars ? '★' : '☆').join('');
}

function formatReviewDate(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return 'Recent purchase';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CHECKOUT_SHIPPING_OPTIONS = [
    {
        value: 'jne-reg',
        label: 'JNE REG',
        fee: 12,
        eta: '2-4 business days',
        description: 'Pilihan reguler nasional yang stabil untuk pengiriman fashion.',
        logoPath: '/assets/img/jne.png',
        logoAlt: 'JNE logo',
    },
    {
        value: 'jnt-express',
        label: 'J&T Express',
        fee: 14,
        eta: '1-3 business days',
        description: 'Kurir cepat dengan jangkauan luas untuk pengiriman domestik.',
        logoPath: '/assets/img/J%26t.jpg',
        logoAlt: 'J&T Express logo',
    },
    {
        value: 'sicepat-best',
        label: 'SiCepat BEST',
        fee: 16,
        eta: '1-2 business days',
        description: 'Express service untuk kebutuhan pengiriman lebih sigap.',
        logoPath: '/assets/img/sicepat.jpg',
        logoAlt: 'SiCepat logo',
    },
    {
        value: 'gosend-sameday',
        label: 'GoSend Same Day',
        fee: 28,
        eta: 'Same day selected cities',
        description: 'Untuk area kota tertentu dengan kebutuhan kirim cepat.',
        logoPath: '/assets/img/gosen.png',
        logoAlt: 'GoSend logo',
    },
];

const CHECKOUT_PAYMENT_OPTIONS = [
    {
        value: 'credit-card',
        label: 'Credit Card',
        helper: 'Visa, Mastercard, Amex',
        placeholder: 'Card Number',
    },
    {
        value: 'bank-transfer',
        label: 'Bank Transfer',
        helper: 'Virtual account or transfer reference',
        placeholder: 'Transfer Reference',
    },
    {
        value: 'ewallet',
        label: 'E-Wallet',
        helper: 'OVO, GoPay, DANA, ShopeePay',
        placeholder: 'Wallet Number',
    },
    {
        value: 'cod',
        label: 'Cash on Delivery',
        helper: 'Pay directly to courier on arrival',
        placeholder: 'Not required',
    },
];

function calculateAccountInsights() {
    const orders = Array.isArray(state.orders) ? state.orders : [];
    const totalSpend = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((sum, order) => sum + (Array.isArray(order.items) ? order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0) : 0), 0);
    const completedOrders = orders.filter((order) => String(order.status || '').toLowerCase() === 'completed').length;

    let tier = state.account?.membership?.tier || 'Bronze';
    let nextTier = 'Silver';
    let nextTarget = 1000;

    if (totalSpend >= 7000) {
        tier = 'Noir';
        nextTier = 'Elite';
        nextTarget = totalSpend;
    } else if (totalSpend >= 3000) {
        tier = 'Gold';
        nextTier = 'Noir';
        nextTarget = 7000;
    } else if (totalSpend >= 1000) {
        tier = 'Silver';
        nextTier = 'Gold';
        nextTarget = 3000;
    }

    const progress = nextTarget > totalSpend
        ? Math.max(8, Math.min(100, (totalSpend / nextTarget) * 100))
        : 100;

    return {
        totalSpend,
        totalOrders,
        totalUnits,
        completedOrders,
        tier,
        nextTier,
        nextTarget,
        progress,
        remaining: Math.max(nextTarget - totalSpend, 0),
    };
}

function getAccountCompletion(account, measurements) {
    const checks = [
        Boolean(account.profile.firstName),
        Boolean(account.profile.lastName),
        Boolean(account.profile.email),
        Boolean(account.address.street),
        Boolean(account.address.city),
        Boolean(account.address.postalCode),
        Boolean(measurements.chest_cm || measurements.waist_cm),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
}

function renderAccountSectionNav(activeSection) {
    const sections = [
        ['overview', 'Overview'],
        ['profile', 'Personal Data'],
        ['address', 'Address'],
        ['measurements', 'Measurements'],
        ['membership', 'Membership'],
        ['preferences', 'Preferences'],
    ];

    return `
        <div class="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div class="grid grid-cols-2 gap-3 md:grid-cols-1">
                ${sections.map(([key, label]) => `
                    <button onclick="window.navigate('account', { section: '${key}' })" class="rounded-2xl border px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] transition-colors ${activeSection === key ? 'border-black bg-black text-white' : 'border-zinc-200 text-zinc-600 hover:border-black hover:text-black'}">${label}</button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAccountOverview(account, measurements, insights, completion) {
    const preferredName = [account.profile.firstName, account.profile.lastName].filter(Boolean).join(' ') || state.user.username;
    const membershipLine = account.membership.active && account.membership.rfidUid
        ? `RFID UID ${escapeHtml(account.membership.rfidUid)}`
        : 'Membership belum diaktifkan oleh admin';
    return `
        <section class="space-y-8">
            <div class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                <div class="overflow-hidden rounded-[2rem] bg-zinc-950 p-8 text-white shadow-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">Private Account</p>
                    <h2 class="mt-4 text-3xl font-serif md:text-4xl">${escapeHtml(preferredName)}</h2>
                    <p class="mt-3 max-w-2xl text-sm leading-7 text-white/70">${membershipLine}</p>
                    <div class="mt-8 grid gap-4 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Tier</p>
                            <p class="mt-2 text-xl font-serif">${escapeHtml(account.membership.active ? account.membership.tier : insights.tier)}</p>
                        </div>
                        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Lifetime Spend</p>
                            <p class="mt-2 text-xl font-serif">${formatCurrency(insights.totalSpend)}</p>
                        </div>
                        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Profile Ready</p>
                            <p class="mt-2 text-xl font-serif">${completion}%</p>
                        </div>
                    </div>
                </div>
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Next Tier</p>
                    <h3 class="mt-4 text-3xl font-serif">${insights.nextTier}</h3>
                    <p class="mt-2 text-sm leading-7 text-zinc-500">${insights.remaining > 0 ? `${formatCurrency(insights.remaining)} lagi untuk naik tier.` : 'Anda sudah berada di tier tertinggi saat ini.'}</p>
                    <div class="mt-6 h-3 overflow-hidden rounded-full bg-zinc-100">
                        <div class="h-full rounded-full bg-black" style="width:${insights.progress}%"></div>
                    </div>
                    <div class="mt-6 space-y-3 text-sm text-zinc-600">
                        <p><span class="font-semibold text-black">Preferred contact:</span> ${escapeHtml(account.preferences.preferredContact)}</p>
                        <p><span class="font-semibold text-black">Fit preference:</span> ${escapeHtml(account.preferences.fitPreference)}</p>
                        <p><span class="font-semibold text-black">Measurements saved:</span> ${measurements.chest_cm || measurements.waist_cm ? 'Available' : 'Not complete yet'}</p>
                    </div>
                </div>
            </div>
            <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Orders</p>
                    <p class="mt-4 text-3xl font-serif">${insights.totalOrders}</p>
                    <p class="mt-2 text-sm text-zinc-500">${insights.completedOrders} completed orders</p>
                </div>
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Units Bought</p>
                    <p class="mt-4 text-3xl font-serif">${insights.totalUnits}</p>
                    <p class="mt-2 text-sm text-zinc-500">Across all purchases</p>
                </div>
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Primary City</p>
                    <p class="mt-4 text-3xl font-serif">${escapeHtml(account.address.city || 'Unset')}</p>
                    <p class="mt-2 text-sm text-zinc-500">Shipping destination</p>
                </div>
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Private Code</p>
                    <p class="mt-4 text-2xl font-serif">${escapeHtml(account.membership.privateCode)}</p>
                    <p class="mt-2 text-sm text-zinc-500">Use for concierge support</p>
                </div>
            </div>
        </section>
    `;
}

function renderAccountSection(activeSection, account, measurements, insights, completion) {
    if (activeSection === 'profile') {
        return `
            <section class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div class="mb-8">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Personal Data</p>
                    <h2 class="mt-3 text-3xl font-serif">Identity & Contact</h2>
                </div>
                <form onsubmit="event.preventDefault(); window.saveAccountProfile(this)" class="grid gap-5 md:grid-cols-2">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">First Name</label>
                        <input name="firstName" value="${escapeHtml(account.profile.firstName)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Rizki">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Last Name</label>
                        <input name="lastName" value="${escapeHtml(account.profile.lastName)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Pratama">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Email</label>
                        <input type="email" name="email" value="${escapeHtml(account.profile.email)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="nama@email.com">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Phone</label>
                        <input name="phone" value="${escapeHtml(account.profile.phone)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="08xxxxxxxxxx">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Birthday</label>
                        <input type="date" name="birthday" value="${escapeHtml(account.profile.birthday)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Gender</label>
                        <select name="gender" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                            ${['Prefer not to say', 'Female', 'Male', 'Non-binary'].map((option) => `<option value="${option}" ${account.profile.gender === option ? 'selected' : ''}>${option}</option>`).join('')}
                        </select>
                    </div>
                    <div class="md:col-span-2 flex items-center justify-between gap-4 border-t border-zinc-100 pt-5">
                        <p class="text-sm text-zinc-500">Profile completion saat ini ${completion}%.</p>
                        <button type="submit" class="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Save Personal Data</button>
                    </div>
                </form>
            </section>
        `;
    }

    if (activeSection === 'address') {
        return `
            <section class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div class="mb-8">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Address Book</p>
                    <h2 class="mt-3 text-3xl font-serif">Primary Shipping Address</h2>
                </div>
                <form onsubmit="event.preventDefault(); window.saveAccountAddress(this)" class="grid gap-5 md:grid-cols-2">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Label</label>
                        <input name="label" value="${escapeHtml(account.address.label)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Home / Studio / Office">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Recipient</label>
                        <input name="recipient" value="${escapeHtml(account.address.recipient)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Nama penerima">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Phone</label>
                        <input name="phone" value="${escapeHtml(account.address.phone)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Nomor telepon penerima">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Postal Code</label>
                        <input name="postalCode" value="${escapeHtml(account.address.postalCode)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="40123">
                    </div>
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Street Address</label>
                        <textarea name="street" rows="3" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Jl. lengkap, nomor rumah, kecamatan">${escapeHtml(account.address.street)}</textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">City</label>
                        <input name="city" value="${escapeHtml(account.address.city)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Bandung">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Province</label>
                        <input name="province" value="${escapeHtml(account.address.province)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Jawa Barat">
                    </div>
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Delivery Notes</label>
                        <textarea name="notes" rows="3" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Patokan rumah, jam penerimaan, dll.">${escapeHtml(account.address.notes)}</textarea>
                    </div>
                    <div class="md:col-span-2 flex justify-end border-t border-zinc-100 pt-5">
                        <button type="submit" class="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Save Address</button>
                    </div>
                </form>
            </section>
        `;
    }

    if (activeSection === 'measurements') {
        return `
            <section class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Body Measurements</p>
                        <h2 class="mt-3 text-3xl font-serif">Fit Profile</h2>
                    </div>
                    <div class="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">Gunakan data ini untuk size recommendation yang lebih konsisten.</div>
                </div>
                <form onsubmit="event.preventDefault(); window.saveAccountMeasurements(this)" class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Height (cm)</label>
                        <input type="number" name="height_cm" value="${escapeHtml(measurements.height_cm)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Weight (kg)</label>
                        <input type="number" name="weight_kg" value="${escapeHtml(measurements.weight_kg)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Chest (cm)</label>
                        <input type="number" name="chest_cm" value="${escapeHtml(measurements.chest_cm)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Waist (cm)</label>
                        <input type="number" name="waist_cm" value="${escapeHtml(measurements.waist_cm)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Hip (cm)</label>
                        <input type="number" name="hip_cm" value="${escapeHtml(measurements.hip_cm)}" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Fit Preference</label>
                        <select name="measurementPreference" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                            ${[['slim', 'Slim / Fitted'], ['regular', 'Regular'], ['relaxed', 'Relaxed / Loose']].map(([value, label]) => `<option value="${value}" ${String(measurements.preferences || account.preferences.fitPreference) === value ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="xl:col-span-3 flex items-center justify-between gap-4 border-t border-zinc-100 pt-5">
                        <p class="text-sm text-zinc-500">Terakhir dipakai oleh AI Size Guide saat Anda meminta rekomendasi size.</p>
                        <button type="submit" class="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Save Measurements</button>
                    </div>
                </form>
            </section>
        `;
    }

    if (activeSection === 'membership') {
        return `
            <section class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Membership</p>
                    <h2 class="mt-3 text-3xl font-serif">Seraphine ${insights.tier}</h2>
                    <p class="mt-4 text-sm leading-7 text-zinc-500">Tier membership dihitung dari akumulasi transaksi akun Anda. Semakin tinggi total spend, semakin personal layanan yang Anda dapatkan.</p>
                    <div class="mt-8 grid gap-4 md:grid-cols-3">
                        <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Joined</p>
                            <p class="mt-2 text-lg font-serif">${formatReviewDate(account.membership.joinedAt)}</p>
                        </div>
                        <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Private Code</p>
                            <p class="mt-2 text-lg font-serif">${escapeHtml(account.membership.privateCode)}</p>
                        </div>
                        <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Lifetime Spend</p>
                            <p class="mt-2 text-lg font-serif">${formatCurrency(insights.totalSpend)}</p>
                        </div>
                    </div>
                    <div class="mt-8 rounded-[2rem] bg-zinc-950 p-6 text-white">
                        <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">Benefits</p>
                        <div class="mt-5 grid gap-4 md:grid-cols-2">
                            ${[
                                'Priority access untuk collection drops tertentu',
                                'Riwayat ukuran dan preferensi untuk styling yang konsisten',
                                'Faster support routing dengan private code',
                                'Early notification untuk restock wishlist item',
                            ].map((benefit) => `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">${benefit}</div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Upgrade Progress</p>
                    <h3 class="mt-3 text-3xl font-serif">${insights.nextTier}</h3>
                    <p class="mt-3 text-sm leading-7 text-zinc-500">${insights.remaining > 0 ? `${formatCurrency(insights.remaining)} lagi untuk membuka tier berikutnya.` : 'Tier tertinggi aktif. Pertahankan engagement untuk layanan paling prioritas.'}</p>
                    <div class="mt-6 h-3 overflow-hidden rounded-full bg-zinc-100">
                        <div class="h-full rounded-full bg-black" style="width:${insights.progress}%"></div>
                    </div>
                    <div class="mt-6 space-y-3 text-sm text-zinc-600">
                        <p><span class="font-semibold text-black">Orders placed:</span> ${insights.totalOrders}</p>
                        <p><span class="font-semibold text-black">Completed:</span> ${insights.completedOrders}</p>
                        <p><span class="font-semibold text-black">Preferred style:</span> ${escapeHtml(account.preferences.styleProfile)}</p>
                    </div>
                </div>
            </section>
        `;
    }

    if (activeSection === 'preferences') {
        return `
            <section class="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div class="mb-8">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Preferences</p>
                    <h2 class="mt-3 text-3xl font-serif">Service & Style Settings</h2>
                </div>
                <form onsubmit="event.preventDefault(); window.saveAccountPreferences(this)" class="grid gap-6 md:grid-cols-2">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Preferred Contact</label>
                        <select name="preferredContact" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                            ${[['email', 'Email'], ['whatsapp', 'WhatsApp'], ['phone', 'Phone Call']].map(([value, label]) => `<option value="${value}" ${account.preferences.preferredContact === value ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Style Profile</label>
                        <select name="styleProfile" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                            ${['Modern Elegance', 'Sharp Tailoring', 'Soft Minimal', 'Statement Luxury'].map((value) => `<option value="${value}" ${account.preferences.styleProfile === value ? 'selected' : ''}>${value}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Default Fit Preference</label>
                        <select name="fitPreference" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                            ${[['slim', 'Slim'], ['regular', 'Regular'], ['relaxed', 'Relaxed']].map(([value, label]) => `<option value="${value}" ${account.preferences.fitPreference === value ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-4 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 md:row-span-2">
                        ${[
                            ['notifyRestock', 'Email me when wishlist products are restocked', account.preferences.notifyRestock],
                            ['notifyDrops', 'Send collection drop alerts and exclusive releases', account.preferences.notifyDrops],
                            ['prioritySupport', 'Use priority support routing for service requests', account.preferences.prioritySupport],
                        ].map(([name, label, checked]) => `
                            <label class="flex items-start gap-3 text-sm text-zinc-700">
                                <input type="checkbox" name="${name}" class="mt-1 h-4 w-4 rounded border-zinc-300" ${checked ? 'checked' : ''}>
                                <span>${label}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="md:col-span-2 flex justify-end border-t border-zinc-100 pt-5">
                        <button type="submit" class="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Save Preferences</button>
                    </div>
                </form>
            </section>
        `;
    }

    return renderAccountOverview(account, measurements, insights, completion);
}

function renderProductReviews(product) {
    const reviews = Array.isArray(product.reviewEntries) ? product.reviewEntries : [];

    if (!reviews.length) {
        return `
            <section class="mt-20 border-t border-zinc-200 pt-12">
                <div class="max-w-3xl">
                    <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Buyer Reviews</p>
                    <h2 class="mt-3 text-3xl font-serif text-black">No written reviews yet</h2>
                    <p class="mt-4 text-sm leading-7 text-zinc-500">Rating summary is available, but no buyer has left a written review for this product yet.</p>
                </div>
            </section>
        `;
    }

    return `
        <section class="mt-20 border-t border-zinc-200 pt-12">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Buyer Reviews</p>
                    <h2 class="mt-3 text-3xl font-serif text-black">What verified buyers say</h2>
                </div>
                <div class="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-zinc-600">
                    <p class="font-medium text-amber-700">${renderStars(product.rating)} ${Number(product.rating || 0).toFixed(1)} average</p>
                    <p class="mt-1">Based on ${Number(product.reviews || 0)} reviews</p>
                </div>
            </div>
            <div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                ${reviews.map((review) => `
                    <article class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div class="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-black">${escapeHtml(review.username || 'Verified Buyer')}</p>
                                <p class="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-400">${review.verifiedPurchase ? 'Verified Purchase' : 'Customer Review'}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-medium text-amber-600">${renderStars(review.rating)} ${Number(review.rating || 0).toFixed(1)}</p>
                                <p class="mt-1 text-xs text-zinc-400">${formatReviewDate(review.created_at)}</p>
                            </div>
                        </div>
                        <p class="mt-5 text-sm leading-7 text-zinc-600">${escapeHtml(review.comment || 'Customer left a rating without a written comment.')}</p>
                    </article>
                `).join('')}
            </div>
        </section>
    `;
}

function renderProductCard(productData) {
    const product = productData.product_id ? PRODUCTS.find(p => p.id === productData.product_id) : PRODUCTS.find(p => p.id === productData.id) || productData;
    if (!product) {
        return `<div class="p-6 border rounded-lg text-sm text-red-500">Product data not found</div>`;
    }

    const isWishlisted = state.wishlist.some(w => {
        if (w.product_id) return w.product_id === product.id;
        return w.id === product.id;
    });

    const image1 = product.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Image';
    const image2 = product.images?.[1] || '';

    return `
        <div class="group relative fade-in">
            <div class="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                <a href="#" onclick="event.preventDefault(); window.navigate('product', {productId: '${product.id}'})">
                    <img src="${image1}" alt="${product.name}" class="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer">
                    ${image2 ? `<img src="${image2}" alt="${product.name}" class="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-700 group-hover:opacity-100" referrerPolicy="no-referrer">` : ''}
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
        const activeSize = state.selectedSize || (p.sizes.length === 1 ? p.sizes[0] : null);
        const activeColor = state.selectedColor || (p.colors.length === 1 ? p.colors[0] : null);
        const activeStock = getVariantStock(p, activeSize, activeColor);
        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div class="aspect-[3/4] overflow-hidden bg-zinc-100">
                        <img src="${p.images[0]}" class="h-full w-full object-cover object-center" referrerPolicy="no-referrer">
                    </div>
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">${p.category}</p>
                        <h1 class="text-4xl md:text-5xl font-serif mb-4">${p.name}</h1>
                        <div class="flex flex-wrap items-center gap-3 mb-4 text-sm text-zinc-500">
                            <span class="font-medium text-amber-600">${renderStars(p.rating)} ${Number(p.rating || 0).toFixed(1)}</span>
                            <span>${Number(p.reviews || 0)} reviews</span>
                            <span>${Number(p.soldCount || 0)} sold</span>
                        </div>
                        <p class="text-2xl font-serif font-bold mb-8">$${p.price.toLocaleString()}</p>
                        <p class="text-zinc-600 leading-relaxed mb-10">${p.description}</p>
                        <div class="space-y-8 mb-12">
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-widest mb-4">Size</h3>
                                <div class="flex flex-wrap gap-3">
                                    ${p.sizes.map(s => `
                                        <button
                                            onclick="window.selectProductSize('${s}')"
                                            class="w-12 h-12 flex items-center justify-center text-xs font-bold border transition-all ${getSelectedSizeButtonClass(state.selectedSize === s)}"
                                        >${s}</button>
                                    `).join('')}
                                </div>
                                <p class="text-xs text-zinc-500 mt-4">${state.selectedSize ? `Selected size: ${state.selectedSize}` : 'Choose your size before adding to bag.'}</p>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-widest mb-4">Color</h3>
                                <div class="flex flex-wrap gap-3">
                                    ${p.colors.map(color => `
                                        <button
                                            onclick="window.selectProductColor('${color}')"
                                            class="px-4 h-12 flex items-center justify-center text-xs font-bold border transition-all ${state.selectedColor === color ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-black'}"
                                        >${color}</button>
                                    `).join('')}
                                </div>
                                <p class="text-xs text-zinc-500 mt-4">${state.selectedColor ? `Selected color: ${state.selectedColor}` : 'Choose your color before adding to bag.'}</p>
                            </div>
                            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                <p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Variant Availability</p>
                                <p class="mt-2 text-sm ${activeStock > 0 ? 'text-emerald-600' : 'text-red-600'}">${activeStock > 0 ? `${activeStock} items available for this variant` : 'This variant is out of stock'}</p>
                            </div>
                        </div>
                        <div class="flex gap-3 mb-4">
                            <button onclick="window.addToCart('${p.id}')" class="flex-1 py-5 bg-black text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center space-x-3">
                                <i data-lucide="shopping-bag" size="18"></i>
                                <span>Add to Bag</span>
                            </button>
                            <button onclick="window.openSizeAdvisor('${p.id}')" class="py-5 px-6 border border-black text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-all flex items-center justify-center space-x-2" title="AI Size Recommendation">
                                <i data-lucide="sparkles" size="16"></i>
                                <span>AI Size Guide</span>
                            </button>
                        </div>
                    </div>
                </div>
                ${renderProductReviews(p)}
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

        const total = state.cart.reduce((sum, item) => {
            const product = PRODUCTS.find(p => p.id === item.product_id || p.id === item.id);
            const price = item.price || (product ? product.price : 0);
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <h1 class="text-4xl md:text-5xl font-serif mb-12">Shopping Bag</h1>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div class="lg:col-span-2 space-y-8">
                        ${state.cart.map(item => {
                            const product = PRODUCTS.find(p => p.id === item.product_id || p.id === item.id);
                            const imageUrl = product ? product.images?.[0] : '';
                            const name = product ? product.name : (item.name || 'Unknown Product');
                            const price = item.price || (product ? product.price : 0);
                            const quantity = item.quantity || 1;
                            const size = item.size || 'Size not set';
                            const color = item.color || 'Color not set';
                            return `
                            <div class="flex space-x-6 py-8 border-b border-zinc-100">
                                <div class="w-24 h-32 bg-zinc-100 flex-shrink-0">
                                    <img src="${imageUrl}" class="w-full h-full object-cover" referrerPolicy="no-referrer">
                                </div>
                                <div class="flex-grow">
                                    <h3 class="text-sm font-bold uppercase tracking-widest">${name}</h3>
                                    <p class="text-xs text-zinc-500 mt-1">Size: ${size}</p>
                                    <p class="text-xs text-zinc-500 mt-1">Color: ${color}</p>
                                    <p class="text-xs text-zinc-500 mt-1">$${price.toLocaleString()} x ${quantity}</p>
                                    <button onclick="window.removeFromCart('${item.id}')" class="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-red-500 mt-4">Remove</button>
                                </div>
                            </div>
                        `;
                        }).join('')}
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
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Username</label>
                            <input type="text" name="username" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm" placeholder="Masukkan username">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Password</label>
                            <input type="password" name="password" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm" placeholder="Masukkan password">
                        </div>
                        <button type="submit" class="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">Sign In</button>
                    </form>
                    <p class="text-center text-zinc-500 text-xs mt-4">Belum punya akun? <a href="#" onclick="event.preventDefault(); window.navigate('register')" class="text-black font-bold">Daftar di sini</a></p>
                </div>
            </div>
        </div>
    `,
    register:() => `
        <div class="min-h-screen flex items-center justify-center pt-20 pb-12 px-6 fade-in">
            <div class="w-full max-w-md">
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-serif mb-4 uppercase">Seraphine</h1>
                    <p class="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Create an Account</p>
                </div>
                <div class="bg-white p-8 md:p-12 border border-zinc-100 shadow-2xl">
                    <form onsubmit="event.preventDefault(); window.handleRegister(this)" class="space-y-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Username</label>
                            <input type="text" name="username" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm" placeholder="Nama pengguna">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm" placeholder="example@domain.com">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Password</label>
                            <input type="password" name="password" required class="w-full px-4 py-3 border border-zinc-200 focus:border-black outline-none text-sm" placeholder="Minimal 6 karakter">
                        </div>
                        <button type="submit" class="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">Sign Up</button>
                    </form>
                </div>
            </div>
        </div>
    `,
    checkout: () => `
        ${(() => {
            if (state.cart.length === 0) {
                return `
                    <div class="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full text-center fade-in">
                        <h1 class="text-4xl font-serif mb-6">Checkout</h1>
                        <p class="text-zinc-500 mb-10">Your bag is empty. Add products before continuing to checkout.</p>
                        <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="inline-block rounded-full bg-black px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Continue Shopping</a>
                    </div>
                `;
            }

            const cartItems = state.cart.map((item) => {
                const product = PRODUCTS.find((entry) => entry.id === item.product_id);
                return {
                    ...item,
                    product,
                    lineTotal: Number(item.quantity || 0) * Number(product?.price || 0),
                };
            });
            const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
            const totalUnits = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const defaultShipping = CHECKOUT_SHIPPING_OPTIONS[0];
            const defaultTotal = subtotal + defaultShipping.fee;
            const defaultPayment = CHECKOUT_PAYMENT_OPTIONS[0];

            return `
                <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                    <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Secure Checkout</p>
                            <h1 class="mt-4 text-4xl md:text-5xl font-serif">Delivery & Payment</h1>
                            <p class="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">Lengkapi data penerima, pilih jasa pengiriman, dan tinjau kembali detail produk sebelum transaksi dikonfirmasi.</p>
                        </div>
                        <a href="#" onclick="event.preventDefault(); window.navigate('cart')" class="rounded-full border border-zinc-200 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-700 hover:border-black hover:text-black">Back to Bag</a>
                    </div>
                    <form onsubmit="event.preventDefault(); window.handleCheckout(this)" class="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.3fr)_24rem] xl:grid-cols-[minmax(0,1.45fr)_26rem]">
                        <div class="space-y-8">
                            <section class="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
                                <div class="mb-6 flex items-center justify-between">
                                    <div>
                                        <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Personal Data</p>
                                        <h2 class="mt-3 text-2xl font-serif">Customer Profile</h2>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">First Name</label>
                                        <input name="firstName" value="${escapeHtml(state.account.profile.firstName)}" placeholder="First Name" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Last Name</label>
                                        <input name="lastName" value="${escapeHtml(state.account.profile.lastName)}" placeholder="Last Name" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Email</label>
                                        <input type="email" name="email" value="${escapeHtml(state.account.profile.email || state.user?.email || '')}" placeholder="you@email.com" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Phone Number</label>
                                        <input name="phone" value="${escapeHtml(state.account.profile.phone || state.account.address.phone)}" placeholder="08xxxxxxxxxx" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                </div>
                            </section>

                            <section class="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
                                <div class="mb-6">
                                    <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Shipping Details</p>
                                    <h2 class="mt-3 text-2xl font-serif">Recipient & Delivery Address</h2>
                                </div>
                                <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div class="md:col-span-2">
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Street Address</label>
                                        <textarea name="address" rows="3" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none" placeholder="Full street address, building, district">${escapeHtml(state.account.address.street)}</textarea>
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">City</label>
                                        <input name="city" value="${escapeHtml(state.account.address.city)}" placeholder="Bandung" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Province</label>
                                        <input name="province" value="${escapeHtml(state.account.address.province)}" placeholder="Jawa Barat" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Postal Code</label>
                                        <input name="postalCode" value="${escapeHtml(state.account.address.postalCode)}" placeholder="40123" required class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Recipient Notes</label>
                                        <input name="deliveryNotes" value="${escapeHtml(state.account.address.notes)}" placeholder="Gate code, reception hours, landmark" class="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="mt-8">
                                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Shipping Service</p>
                                    <div class="mt-4 grid gap-4">
                                        ${CHECKOUT_SHIPPING_OPTIONS.map((option, index) => `
                                            <label class="block cursor-pointer rounded-[1.5rem] border border-zinc-200 p-4 transition-colors hover:border-black">
                                                <input type="radio" name="shippingService" value="${option.value}" data-fee="${option.fee}" data-label="${option.label}" onchange="window.updateCheckoutSummary(this.dataset.fee, this.dataset.label)" class="sr-only" ${index === 0 ? 'checked' : ''}>
                                                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                    <div class="flex items-start gap-3">
                                                        <div class="flex h-12 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
                                                            <img src="${option.logoPath}" alt="${option.logoAlt}" class="max-h-full max-w-full object-contain" referrerPolicy="no-referrer">
                                                        </div>
                                                        <div>
                                                            <p class="text-sm font-semibold text-black">${option.label}</p>
                                                            <p class="mt-1 text-sm text-zinc-500">${option.description}</p>
                                                        </div>
                                                    </div>
                                                    <div class="text-left md:text-right">
                                                        <p class="text-sm font-semibold text-black">${formatCurrency(option.fee)}</p>
                                                        <p class="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">${option.eta}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            </section>

                            <section class="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
                                <div class="mb-6">
                                    <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Payment</p>
                                    <h2 class="mt-3 text-2xl font-serif">Choose Payment Method</h2>
                                </div>
                                <div class="grid gap-4">
                                    ${CHECKOUT_PAYMENT_OPTIONS.map((option, index) => `
                                        <label class="block cursor-pointer rounded-[1.5rem] border border-zinc-200 p-4 transition-colors hover:border-black">
                                            <input type="radio" name="paymentMethod" value="${option.value}" onchange="window.updateCheckoutPaymentMethod('${option.value}')" class="sr-only" ${index === 0 ? 'checked' : ''}>
                                            <div class="flex items-start justify-between gap-4">
                                                <div>
                                                    <p class="text-sm font-semibold text-black">${option.label}</p>
                                                    <p class="mt-1 text-sm text-zinc-500">${option.helper}</p>
                                                </div>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                                <div id="checkout-payment-reference-wrap" class="mt-6 rounded-[1.5rem] bg-zinc-50 p-5">
                                    <label id="checkout-payment-reference-label" class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">${defaultPayment.placeholder}</label>
                                    <input id="checkout-payment-reference" name="paymentReference" inputmode="numeric" autocomplete="cc-number" placeholder="${defaultPayment.placeholder}" required class="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none">
                                    <p class="mt-2 text-xs text-zinc-500">Untuk demo ini hanya 4 digit terakhir atau karakter akhir referensi yang akan disimpan ke order.</p>
                                </div>
                            </section>
                        </div>

                        <aside class="space-y-6">
                            <div class="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 shadow-sm lg:sticky lg:top-28">
                                <div class="flex items-center justify-between border-b border-zinc-200 pb-5">
                                    <div>
                                        <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Order Summary</p>
                                        <h2 class="mt-3 text-2xl font-serif">Your Selection</h2>
                                    </div>
                                    <span class="rounded-full border border-zinc-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">${totalUnits} items</span>
                                </div>
                                <div class="mt-6 space-y-4">
                                    ${cartItems.map((item) => `
                                        <article class="rounded-[1.5rem] border border-zinc-200 bg-white p-4">
                                            <div class="flex gap-4">
                                                <div class="h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                                                    <img src="${item.product?.images?.[0] || ''}" alt="${escapeHtml(item.product?.name || 'Product')}" class="h-full w-full object-cover" referrerPolicy="no-referrer">
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-sm font-semibold text-black">${escapeHtml(item.product?.name || 'Product')}</p>
                                                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">${escapeHtml(item.product?.description || 'Luxury piece selected from your bag.')}</p>
                                                    <div class="mt-3 space-y-1 text-xs text-zinc-500">
                                                        <p>Size ${escapeHtml(item.size || '-')} • Color ${escapeHtml(item.color || '-')}</p>
                                                        <p>${formatCurrency(item.product?.price || 0)} x ${Number(item.quantity || 0)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    `).join('')}
                                </div>
                                <div class="mt-6 space-y-3 border-t border-zinc-200 pt-5 text-sm text-zinc-600">
                                    <div class="flex items-center justify-between">
                                        <span>Subtotal</span>
                                        <span id="checkout-subtotal" data-amount="${subtotal}">${formatCurrency(subtotal)}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span id="checkout-shipping-label">${defaultShipping.label}</span>
                                        <span id="checkout-shipping-fee">${formatCurrency(defaultShipping.fee)}</span>
                                    </div>
                                    <div class="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-semibold text-black">
                                        <span>Total</span>
                                        <span id="checkout-total">${formatCurrency(defaultTotal)}</span>
                                    </div>
                                </div>
                                <button type="submit" class="mt-6 w-full rounded-full bg-black px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Complete Purchase</button>
                            </div>
                        </aside>
                    </form>
                </div>
            `;
        })()}
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
        const wishlistProducts = state.wishlist
            .map(w => {
                if (w.product_id) return PRODUCTS.find(p => p.id === w.product_id);
                return PRODUCTS.find(p => p.id === w.id) || null;
            })
            .filter(Boolean);

        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <h1 class="text-4xl md:text-5xl font-serif mb-16">My Wishlist</h1>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    ${wishlistProducts.map(p => renderProductCard(p)).join('')}
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
    `,
    orders: () => {
        if (!state.user) {
            return `
                <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full text-center fade-in">
                    <h1 class="text-4xl md:text-5xl font-serif mb-8">My Orders</h1>
                    <p class="text-zinc-500 mb-12">Please login to view your orders.</p>
                    <a href="#" onclick="event.preventDefault(); window.navigate('login')" class="inline-block bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">Login</a>
                </div>
            `;
        }

        if (state.orders.length === 0) {
            return `
                <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full text-center fade-in">
                    <h1 class="text-4xl md:text-5xl font-serif mb-8">My Orders</h1>
                    <p class="text-zinc-500 mb-12">You haven't placed any orders yet.</p>
                    <a href="#" onclick="event.preventDefault(); window.navigate('shop')" class="inline-block bg-black text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">Start Shopping</a>
                </div>
            `;
        }

        return `
            <div class="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full fade-in">
                <h1 class="text-4xl md:text-5xl font-serif mb-12">My Orders</h1>
                <div class="space-y-8">
                    ${state.orders.map(order => `
                        <div class="bg-white border border-zinc-100 p-8 rounded-lg shadow-sm">
                            <div class="flex flex-wrap items-center justify-between mb-6 pb-6 border-b border-zinc-100">
                                <div>
                                    <h3 class="text-lg font-bold">Order #${order.id}</h3>
                                    <p class="text-zinc-500 text-sm">Placed on ${new Date(order.order_date).toLocaleDateString()}</p>
                                    ${order.shipping_first_name ? `<p class="text-zinc-500 text-sm">Ship to: ${order.shipping_first_name} ${order.shipping_last_name || ''}</p>` : ''}
                                    ${order.shipping_service_label ? `<p class="text-zinc-500 text-sm">Delivery: ${escapeHtml(order.shipping_service_label)}</p>` : ''}
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-zinc-500">Status: <span class="font-medium text-black">${formatOrderStatus(order.statusLabel, order.status)}</span></p>
                                    <p class="text-lg font-bold">$${order.total_amount.toFixed(2)}</p>
                                    ${order.payment_method_label ? `<p class="text-zinc-500 text-sm">Payment: ${escapeHtml(order.payment_method_label)}</p>` : ''}
                                    ${order.payment_last4 ? `<p class="text-zinc-500 text-sm">Ref ending ${order.payment_last4}</p>` : ''}
                                </div>
                            </div>
                            <div class="space-y-4">
                                ${order.items.map(item => {
                                    const product = PRODUCTS.find(p => p.id === item.product_id);
                                    const size = item.size || 'Size not set';
                                    const review = item.review;
                                    const reviewBlock = review
                                        ? `
                                            <div class="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                                                <div class="flex flex-wrap items-center justify-between gap-3">
                                                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Your Review</p>
                                                    <p class="text-sm font-medium text-amber-700">${renderStars(review.rating)} ${Number(review.rating || 0).toFixed(1)}</p>
                                                </div>
                                                ${review.comment ? `<p class="mt-2 text-sm leading-6 text-zinc-700">${escapeHtml(review.comment)}</p>` : '<p class="mt-2 text-sm text-zinc-500">No written comment.</p>'}
                                            </div>
                                        `
                                        : item.reviewEligible
                                            ? `
                                                <div class="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                                                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Rate This Product</p>
                                                    <div class="mt-3 flex flex-col gap-3">
                                                        <select id="review-rating-${item.order_item_id}" class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none">
                                                            <option value="">Select rating</option>
                                                            <option value="5">5 - Excellent</option>
                                                            <option value="4">4 - Very good</option>
                                                            <option value="3">3 - Good</option>
                                                            <option value="2">2 - Fair</option>
                                                            <option value="1">1 - Poor</option>
                                                        </select>
                                                        <textarea id="review-comment-${item.order_item_id}" rows="3" placeholder="Tell us about the fit, quality, or overall experience" class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"></textarea>
                                                        <button onclick="window.submitProductReview(${order.id}, ${item.order_item_id})" class="w-full rounded-xl bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-colors">Submit Review</button>
                                                    </div>
                                                </div>
                                            `
                                            : '';
                                    return `
                                        <div class="flex items-center space-x-4 py-4 border-b border-zinc-50 last:border-b-0">
                                            <div class="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                                                ${product && product.images ? `<img src="${product.images[0]}" alt="${product.name}" class="w-full h-full object-cover">` : ''}
                                            </div>
                                            <div class="flex-1">
                                                <h4 class="font-medium">${product ? product.name : 'Product not found'}</h4>
                                                <p class="text-zinc-500 text-sm">Size: ${size}</p>
                                                <p class="text-zinc-500 text-sm">Color: ${item.color || '-'}</p>
                                                <p class="text-zinc-500 text-sm">Quantity: ${item.quantity}</p>
                                                ${reviewBlock}
                                            </div>
                                            <div class="text-right">
                                                <p class="font-medium">$${(item.price * item.quantity).toFixed(2)}</p>
                                                <p class="text-zinc-500 text-sm">$${item.price.toFixed(2)} each</p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    account: () => {
        if (!state.user) {
            return `
                <div class="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full text-center fade-in">
                    <h1 class="text-4xl md:text-5xl font-serif mb-8">My Account</h1>
                    <p class="text-zinc-500 mb-12">Silakan login untuk mengakses personal data, alamat, ukuran tubuh, membership, dan riwayat pesanan Anda.</p>
                    <a href="#" onclick="event.preventDefault(); window.navigate('login')" class="inline-block rounded-full bg-black px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Login</a>
                </div>
            `;
        }

        const account = state.account;
        const measurements = state.account.measurements || getSavedMeasurements();
        const activeSection = state.accountSection || 'overview';
        const insights = calculateAccountInsights();
        const completion = getAccountCompletion(account, measurements);

        return `
            <div class="pt-28 pb-24 px-4 md:px-10 xl:px-14 fade-in">
                <div class="mx-auto max-w-7xl">
                    <div class="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Account Center</p>
                            <h1 class="mt-4 text-4xl font-serif md:text-6xl">My Seraphine</h1>
                            <p class="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">Satu halaman untuk mengelola data pribadi, alamat pengiriman, body measurements, membership, dan aktivitas order Anda.</p>
                        </div>
                        <div class="rounded-full border border-zinc-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">${escapeHtml(state.user.username)}</div>
                    </div>
                    <div class="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-8">
                        <aside>${renderAccountSectionNav(activeSection)}</aside>
                        <div class="space-y-6">${renderAccountSection(activeSection, account, measurements, insights, completion)}</div>
                    </div>
                </div>
            </div>
        `;
    }
};
