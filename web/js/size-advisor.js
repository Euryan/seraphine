/**
 * AI Size Advisor Modal
 * Recommends sizes based on body measurements using Ollama.
 */

import { API_BASE } from './config.js';
import { state } from './state.js';

const STORAGE_KEY = 'seraphine_measurements';

function getMeasurementsKey() {
    return state.user ? `${STORAGE_KEY}_${state.user.username}` : STORAGE_KEY;
}

export function openSizeAdvisor(productId) {
    const saved = getSavedMeasurements();
    injectModal(productId, saved);
}

export function getSavedMeasurements() {
    try {
        const scoped = JSON.parse(localStorage.getItem(getMeasurementsKey()) || 'null');
        if (scoped && typeof scoped === 'object') {
            return scoped;
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
}

export function saveMeasurements(m) {
    localStorage.setItem(getMeasurementsKey(), JSON.stringify(m));
}

export function syncMeasurementsCache(measurements) {
    if (!measurements || typeof measurements !== 'object') return;
    saveMeasurements(measurements);
}

function injectModal(productId, saved) {
    // Remove existing
    document.getElementById('size-advisor-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'size-advisor-modal';
    modal.className = 'fixed inset-0 z-[80] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="size-advisor-backdrop"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <!-- Header -->
            <div class="bg-black text-white px-6 py-5">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-bold tracking-wide">AI Size Guide</h3>
                        <p class="text-xs text-white/60 mt-1">Powered by Seraphine AI</p>
                    </div>
                    <button id="size-advisor-close" class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-5" id="size-advisor-body">
                <!-- Measurement Illustration -->
                <div class="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                    <div class="w-12 h-12 bg-zinc-200 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-500"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-zinc-900">Enter your measurements</p>
                        <p class="text-xs text-zinc-500">We'll recommend the perfect size for you</p>
                    </div>
                </div>

                <!-- Form -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Height (cm)</label>
                        <input type="number" id="sa-height" value="${saved.height_cm || ''}" placeholder="170" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all" min="100" max="250">
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Weight (kg)</label>
                        <input type="number" id="sa-weight" value="${saved.weight_kg || ''}" placeholder="65" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all" min="30" max="200">
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Chest (cm)</label>
                        <input type="number" id="sa-chest" value="${saved.chest_cm || ''}" placeholder="90" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all" min="60" max="150">
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Waist (cm)</label>
                        <input type="number" id="sa-waist" value="${saved.waist_cm || ''}" placeholder="72" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all" min="50" max="130">
                    </div>
                    <div class="space-y-1.5 col-span-2">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hip (cm)</label>
                        <input type="number" id="sa-hip" value="${saved.hip_cm || ''}" placeholder="95" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all" min="60" max="160">
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fit Preference (optional)</label>
                    <select id="sa-preference" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black transition-all">
                        <option value="">No preference</option>
                        <option value="slim">Slim / Fitted</option>
                        <option value="regular">Regular / True to size</option>
                        <option value="relaxed">Relaxed / Loose</option>
                    </select>
                </div>

                <button id="sa-submit" class="w-full py-3.5 bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/></svg>
                    Get AI Recommendation
                </button>
            </div>

            <!-- Result (hidden initially) -->
            <div id="size-advisor-result" class="hidden px-6 py-5 space-y-4">
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Bind events
    document.getElementById('size-advisor-backdrop')?.addEventListener('click', closeModal);
    document.getElementById('size-advisor-close')?.addEventListener('click', closeModal);
    document.getElementById('sa-submit')?.addEventListener('click', () => submitMeasurements(productId));
}

function closeModal() {
    const modal = document.getElementById('size-advisor-modal');
    modal?.remove();
}

async function submitMeasurements(productId) {
    const btn = document.getElementById('sa-submit');
    const resultDiv = document.getElementById('size-advisor-result');
    const bodyDiv = document.getElementById('size-advisor-body');

    const measurements = {
        height_cm: parseFloat(document.getElementById('sa-height')?.value) || null,
        weight_kg: parseFloat(document.getElementById('sa-weight')?.value) || null,
        chest_cm: parseFloat(document.getElementById('sa-chest')?.value) || null,
        waist_cm: parseFloat(document.getElementById('sa-waist')?.value) || null,
        hip_cm: parseFloat(document.getElementById('sa-hip')?.value) || null,
        preferences: document.getElementById('sa-preference')?.value || null,
    };

    // Require at least chest or waist
    if (!measurements.chest_cm && !measurements.waist_cm) {
        btn.textContent = 'Please enter at least chest or waist';
        btn.classList.add('bg-red-600');
        setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/></svg> Get AI Recommendation`;
            btn.classList.remove('bg-red-600');
        }, 2000);
        return;
    }

    // Save for next time
    saveMeasurements(measurements);

    if (state.user && state.token) {
        try {
            await fetch(`${API_BASE}/me/account`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${state.token}`,
                },
                body: JSON.stringify({
                    measurements,
                    preferences: {
                        fitPreference: measurements.preferences || undefined,
                    },
                }),
            });
        } catch (err) {
            console.warn('Persist size advisor measurements failed', err);
        }
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-flex gap-1"><span class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay:0ms"></span><span class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay:150ms"></span><span class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay:300ms"></span></span> Analyzing...`;

    try {
        const resp = await fetch(`${API_BASE}/ai/size-recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, measurements }),
        });

        if (!resp.ok) throw new Error('Recommendation failed');
        const result = await resp.json();

        // Show result
        const confidenceColors = {
            high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            medium: 'bg-amber-100 text-amber-700 border-amber-200',
            low: 'bg-red-100 text-red-700 border-red-200',
        };
        const confClass = confidenceColors[result.confidence] || confidenceColors.medium;

        resultDiv.innerHTML = `
            <div class="text-center space-y-3">
                <p class="text-xs uppercase tracking-widest text-zinc-500">Recommended Size</p>
                <div class="w-20 h-20 mx-auto rounded-2xl bg-black text-white flex items-center justify-center text-3xl font-bold">${escapeHtml(result.recommended_size)}</div>
                <span class="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${confClass}">${result.confidence} confidence</span>
            </div>
            <div class="bg-zinc-50 rounded-xl p-4 space-y-2">
                <p class="text-sm text-zinc-700 leading-relaxed">${escapeHtml(result.explanation || '')}</p>
                ${result.fit_notes ? `<p class="text-xs text-zinc-500 italic">${escapeHtml(result.fit_notes)}</p>` : ''}
            </div>
            <button id="sa-try-again" class="w-full py-3 text-xs font-bold uppercase tracking-widest border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all">
                Try Different Measurements
            </button>
        `;

        bodyDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');

        document.getElementById('sa-try-again')?.addEventListener('click', () => {
            bodyDiv.classList.remove('hidden');
            resultDiv.classList.add('hidden');
            btn.disabled = false;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/></svg> Get AI Recommendation`;
        });
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = 'Connection Error — Retry';
        btn.classList.add('bg-red-600');
        setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/></svg> Get AI Recommendation`;
            btn.classList.remove('bg-red-600');
        }, 3000);
    }
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
