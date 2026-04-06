/**
 * IoT Dashboard Module
 * Real-time warehouse monitoring with sensor data visualization.
 */

import { API_BASE } from './config.js';
import { icons } from './icons.js';

let eventSource = null;
let eventLog = [];
let sensorData = {};
let envReadings = { temperature: [], humidity: [] };

export const renderIoTDashboard = async (container) => {
    // Fetch initial data
    const [sensorsResp, eventsResp, statusResp] = await Promise.all([
        fetch(`${API_BASE}/iot/sensors`).then(r => r.json()).catch(() => ({ sensors: [] })),
        fetch(`${API_BASE}/iot/events?limit=20`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${API_BASE}/iot/simulator/status`).then(r => r.json()).catch(() => ({ running: false })),
    ]);

    const sensors = sensorsResp.sensors || [];
    const events = eventsResp.events || [];
    eventLog = events;

    sensors.forEach(s => { sensorData[s.id] = s; });

    container.innerHTML = `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-3xl font-bold tracking-tight text-black">IoT Monitor</h2>
                    <p class="text-sm text-zinc-500 mt-1">Real-time warehouse sensor data</p>
                </div>
                <div class="flex items-center gap-3">
                    <span id="iot-connection-badge" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${statusResp.running ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}">
                        <span class="w-2 h-2 rounded-full ${statusResp.running ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}"></span>
                        ${statusResp.running ? 'Live' : 'Offline'}
                    </span>
                    <button id="iot-toggle-btn" class="px-4 py-2 text-sm font-medium ${statusResp.running ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-lg transition-all shadow-sm">
                        ${statusResp.running ? 'Stop Simulator' : 'Start Simulator'}
                    </button>
                </div>
            </div>

            <!-- Sensor Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="iot-sensor-grid">
                ${sensors.map(s => renderSensorCard(s)).join('')}
            </div>

            <!-- Main Content: 2 columns -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Live Event Feed -->
                <div class="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-black">Live Event Feed</h3>
                        <span id="iot-event-count" class="text-xs text-zinc-500">${events.length} events</span>
                    </div>
                    <div id="iot-event-feed" class="max-h-[500px] overflow-y-auto divide-y divide-zinc-50">
                        ${events.length === 0
                            ? '<div class="p-8 text-center text-zinc-400 text-sm">No events yet. Start the simulator to begin.</div>'
                            : events.slice().reverse().map(e => renderEventRow(e)).join('')
                        }
                    </div>
                </div>

                <!-- Environment Panel -->
                <div class="space-y-6">
                    <!-- Temperature Gauge -->
                    <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                        <h3 class="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Environment</h3>
                        <div class="space-y-4">
                            <div id="iot-temp-display" class="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-orange-600"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-xs text-zinc-500">Temperature</p>
                                        <p class="text-lg font-bold text-black" id="iot-temp-value">--°C</p>
                                    </div>
                                </div>
                                <span id="iot-temp-badge" class="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Normal</span>
                            </div>
                            <div id="iot-humidity-display" class="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-xs text-zinc-500">Humidity</p>
                                        <p class="text-lg font-bold text-black" id="iot-humidity-value">--%</p>
                                    </div>
                                </div>
                                <span id="iot-humidity-badge" class="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Normal</span>
                            </div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div class="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                        <h3 class="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Session Stats</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span class="text-zinc-500">Stock In Events</span>
                                <span class="font-bold text-emerald-600" id="iot-stat-in">0</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-zinc-500">Stock Out Events</span>
                                <span class="font-bold text-blue-600" id="iot-stat-out">0</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-zinc-500">Audit Scans</span>
                                <span class="font-bold text-purple-600" id="iot-stat-audit">0</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-zinc-500">Alerts</span>
                                <span class="font-bold text-red-600" id="iot-stat-alerts">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Bind events
    document.getElementById('iot-toggle-btn')?.addEventListener('click', toggleSimulator);

    // Start SSE if simulator is running
    if (statusResp.running) {
        connectSSE();
    }

    updateStats();
};

function renderSensorCard(sensor) {
    const isOnline = sensor.status === 'online';
    const typeLabels = {
        rfid_gate: 'RFID Gate',
        rfid_shelf: 'RFID Shelf',
        environmental: 'Environmental',
    };
    const typeIcons = {
        rfid_gate: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-2 .5-4 2-5.5"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4c-1 .1-1.97-.5-2.47-1.4"/><path d="M12 22a9.97 9.97 0 0 0 8-4"/><path d="M18 12c0 2-.5 4-2 5.5"/><circle cx="12" cy="12" r="2"/></svg>`,
        rfid_shelf: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>`,
        environmental: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
    };

    return `
        <div class="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm" id="sensor-${sensor.id}">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'} flex items-center justify-center">
                        ${typeIcons[sensor.type] || typeIcons.environmental}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-black">${sensor.id}</p>
                        <p class="text-[10px] text-zinc-500 uppercase tracking-widest">${typeLabels[sensor.type] || sensor.type}</p>
                    </div>
                </div>
                <span class="w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-300'}"></span>
            </div>
            <div class="text-xs text-zinc-500 space-y-1">
                <p>📍 ${sensor.location}</p>
                <p>🔋 ${sensor.battery || '--'}%</p>
                <p class="text-[10px] truncate sensor-last-reading">${sensor.last_reading || 'Awaiting data...'}</p>
            </div>
        </div>
    `;
}

function renderEventRow(event) {
    const typeStyles = {
        stock_in: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '📦', label: 'Stock In' },
        stock_out: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🚚', label: 'Stock Out' },
        stock_count: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '📋', label: 'Audit' },
        temperature_reading: { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🌡️', label: 'Temp' },
        humidity_reading: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: '💧', label: 'Humidity' },
        movement_detected: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🏃', label: 'Movement' },
    };
    const style = typeStyles[event.event_type] || { bg: 'bg-zinc-50', text: 'text-zinc-700', icon: '📡', label: event.event_type };
    const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '--:--';

    return `
        <div class="flex items-center gap-4 px-6 py-3 hover:bg-zinc-50 transition-colors ${event.alert ? 'border-l-4 border-red-500' : ''}">
            <span class="text-lg">${style.icon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold ${style.text} ${style.bg} px-2 py-0.5 rounded-full">${style.label}</span>
                    <span class="text-[10px] text-zinc-400">${event.sensor_id || ''}</span>
                </div>
                <p class="text-sm text-zinc-700 truncate mt-0.5">${event.description || ''}</p>
            </div>
            <span class="text-[10px] text-zinc-400 whitespace-nowrap">${time}</span>
        </div>
    `;
}

async function toggleSimulator() {
    const btn = document.getElementById('iot-toggle-btn');
    const badge = document.getElementById('iot-connection-badge');

    try {
        const statusResp = await fetch(`${API_BASE}/iot/simulator/status`).then(r => r.json());
        const isRunning = statusResp.running;

        if (isRunning) {
            await fetch(`${API_BASE}/iot/simulator/stop`, { method: 'POST' });
            disconnectSSE();
            btn.textContent = 'Start Simulator';
            btn.classList.remove('bg-red-600', 'hover:bg-red-700');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-zinc-400"></span> Offline`;
            badge.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-500';
        } else {
            await fetch(`${API_BASE}/iot/simulator/start`, { method: 'POST' });
            connectSSE();
            btn.textContent = 'Stop Simulator';
            btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            btn.classList.add('bg-red-600', 'hover:bg-red-700');
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live`;
            badge.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700';
        }
    } catch {
        btn.textContent = 'Connection Error';
    }
}

function connectSSE() {
    disconnectSSE();
    eventSource = new EventSource(`${API_BASE}/iot/stream`);

    eventSource.onmessage = (e) => {
        try {
            const event = JSON.parse(e.data);
            if (event.type === 'connected' || event.type === 'keepalive') return;
            handleIoTEvent(event);
        } catch { /* skip */ }
    };

    eventSource.onerror = () => {
        // Will auto-reconnect
    };
}

function disconnectSSE() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

function handleIoTEvent(event) {
    eventLog.push(event);

    // Update event feed
    const feed = document.getElementById('iot-event-feed');
    if (feed) {
        const placeholder = feed.querySelector('.text-center');
        if (placeholder) placeholder.remove();

        const row = document.createElement('div');
        row.innerHTML = renderEventRow(event);
        feed.insertBefore(row.firstElementChild, feed.firstChild);

        // Keep max 100 rows in DOM
        while (feed.children.length > 100) {
            feed.removeChild(feed.lastChild);
        }
    }

    // Update event count
    const countEl = document.getElementById('iot-event-count');
    if (countEl) countEl.textContent = `${eventLog.length} events`;

    // Update sensor card
    if (event.sensor_id) {
        const sensorCard = document.querySelector(`#sensor-${CSS.escape(event.sensor_id)} .sensor-last-reading`);
        if (sensorCard) sensorCard.textContent = event.description || '';
    }

    // Update environmental readings
    if (event.event_type === 'temperature_reading') {
        const tempVal = document.getElementById('iot-temp-value');
        const tempBadge = document.getElementById('iot-temp-badge');
        if (tempVal) tempVal.textContent = `${event.value}°C`;
        if (tempBadge) {
            if (event.alert) {
                tempBadge.textContent = 'Alert';
                tempBadge.className = 'text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700';
            } else {
                tempBadge.textContent = 'Normal';
                tempBadge.className = 'text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700';
            }
        }
    }

    if (event.event_type === 'humidity_reading') {
        const humVal = document.getElementById('iot-humidity-value');
        const humBadge = document.getElementById('iot-humidity-badge');
        if (humVal) humVal.textContent = `${event.value}%`;
        if (humBadge) {
            if (event.alert) {
                humBadge.textContent = 'Alert';
                humBadge.className = 'text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700';
            } else {
                humBadge.textContent = 'Normal';
                humBadge.className = 'text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700';
            }
        }
    }

    updateStats();
}

function updateStats() {
    const counts = { in: 0, out: 0, audit: 0, alerts: 0 };
    for (const e of eventLog) {
        if (e.event_type === 'stock_in') counts.in++;
        if (e.event_type === 'stock_out') counts.out++;
        if (e.event_type === 'stock_count') counts.audit++;
        if (e.alert) counts.alerts++;
    }
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('iot-stat-in', counts.in);
    el('iot-stat-out', counts.out);
    el('iot-stat-audit', counts.audit);
    el('iot-stat-alerts', counts.alerts);
}

export function cleanupIoT() {
    disconnectSSE();
    eventLog = [];
}
