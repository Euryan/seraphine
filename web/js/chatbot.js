/**
 * Seraphine AI Chatbot Widget
 * Floating chat assistant with SSE streaming.
 */

import { API_BASE } from './config.js';
import { state } from './state.js';

let chatHistory = [];
let isOpen = false;
let isStreaming = false;
let pageContext = { page: 'home' };

export function setChatPageContext(ctx) {
    pageContext = ctx;
}

export function initChatbot() {
    injectChatHTML();
    bindChatEvents();
    loadSuggestions();
}

function injectChatHTML() {
    const container = document.createElement('div');
    container.id = 'seraphine-chat';
    container.innerHTML = `
        <button id="chat-fab" class="fixed bottom-6 right-6 z-[70] w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95" title="Chat with Seraphine AI">
            <svg id="chat-fab-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            <span id="chat-fab-pulse" class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>

        <div id="chat-panel" class="fixed bottom-24 right-6 z-[70] w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden translate-y-4 opacity-0 pointer-events-none transition-all duration-300">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 bg-black text-white">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">S</div>
                    <div>
                        <p class="text-sm font-bold tracking-wide">Seraphine AI</p>
                        <p class="text-[10px] text-white/60 uppercase tracking-widest">Virtual Stylist</p>
                    </div>
                </div>
                <button id="chat-close" class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>
            </div>

            <!-- Messages -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
                <div class="flex gap-3">
                    <div class="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">S</div>
                    <div class="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                        <p class="text-sm text-zinc-700 leading-relaxed">Welcome to Seraphine Couture. I'm your personal stylist — ask me about sizing, products, shipping, or styling advice.</p>
                    </div>
                </div>
                <div id="chat-suggestions" class="flex flex-wrap gap-2 ml-10"></div>
            </div>

            <!-- Input -->
            <div class="border-t border-zinc-100 p-3">
                <div class="flex items-center gap-2 bg-zinc-50 rounded-xl px-4 py-2">
                    <input id="chat-input" type="text" placeholder="Ask me anything..." class="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" maxlength="500" autocomplete="off">
                    <button id="chat-send" class="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                </div>
                <p class="text-[10px] text-zinc-400 text-center mt-2">Powered by AI · Responses may be inaccurate</p>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}

function bindChatEvents() {
    const fab = document.getElementById('chat-fab');
    const panel = document.getElementById('chat-panel');
    const close = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');

    fab?.addEventListener('click', () => toggleChat());
    close?.addEventListener('click', () => toggleChat(false));

    input?.addEventListener('input', () => {
        send.disabled = !input.value.trim() || isStreaming;
    });

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && !isStreaming) {
            e.preventDefault();
            sendMessage(input.value.trim());
        }
    });

    send?.addEventListener('click', () => {
        if (input.value.trim() && !isStreaming) {
            sendMessage(input.value.trim());
        }
    });
}

function toggleChat(forceState) {
    const panel = document.getElementById('chat-panel');
    const pulse = document.getElementById('chat-fab-pulse');
    isOpen = forceState !== undefined ? forceState : !isOpen;

    if (isOpen) {
        panel.classList.remove('translate-y-4', 'opacity-0', 'pointer-events-none');
        panel.classList.add('translate-y-0', 'opacity-100');
        pulse?.classList.add('hidden');
        document.getElementById('chat-input')?.focus();
    } else {
        panel.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none');
        panel.classList.remove('translate-y-0', 'opacity-100');
    }
}

async function sendMessage(text) {
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const messages = document.getElementById('chat-messages');

    input.value = '';
    send.disabled = true;
    isStreaming = true;

    // Remove suggestions after first message
    document.getElementById('chat-suggestions')?.remove();

    // Add user message
    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    // Add AI message placeholder
    const aiMsgId = `ai-msg-${Date.now()}`;
    appendMessage('assistant', '', aiMsgId);

    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                conversation_history: chatHistory.slice(-10),
                page_context: pageContext,
            }),
        });

        if (!response.ok) throw new Error('Chat request failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let streamError = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.token) {
                        fullResponse += data.token;
                        updateMessageContent(aiMsgId, fullResponse);
                        messages.scrollTop = messages.scrollHeight;
                    }
                    if (data.error) {
                        streamError = data.error;
                        updateMessageContent(aiMsgId, `Sorry, I encountered an error: ${data.error}`);
                    }
                } catch { /* skip malformed lines */ }
            }
        }

        if (fullResponse) {
            chatHistory.push({ role: 'assistant', content: fullResponse });
        } else if (streamError) {
            updateMessageContent(aiMsgId, `Sorry, I encountered an error: ${streamError}`);
        } else {
            updateMessageContent(aiMsgId, "I'm unable to respond right now. Please try again in a moment.");
        }
    } catch (err) {
        updateMessageContent(
            aiMsgId,
            "Unable to connect to Seraphine AI. Please make sure the backend server is running."
        );
    } finally {
        isStreaming = false;
        send.disabled = !input.value.trim();
    }
}

function appendMessage(role, content, id) {
    const messages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'flex gap-3' + (role === 'user' ? ' flex-row-reverse' : '');
    if (id) div.id = id;

    if (role === 'user') {
        div.innerHTML = `
            <div class="bg-black text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p class="text-sm leading-relaxed">${escapeHtml(content)}</p>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">S</div>
            <div class="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                <p class="text-sm text-zinc-700 leading-relaxed ai-content">${content || '<span class="inline-flex gap-1"><span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay:0ms"></span><span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay:150ms"></span><span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay:300ms"></span></span>'}</p>
            </div>
        `;
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function updateMessageContent(id, content) {
    const el = document.getElementById(id);
    if (!el) return;
    const p = el.querySelector('.ai-content');
    if (p) p.innerHTML = formatMarkdown(content);
}

function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

async function loadSuggestions() {
    const container = document.getElementById('chat-suggestions');
    if (!container) return;

    try {
        const params = new URLSearchParams({ page: pageContext.page || 'home' });
        if (pageContext.product?.id) params.set('product_id', pageContext.product.id);

        const resp = await fetch(`${API_BASE}/ai/chat/suggestions?${params}`);
        if (!resp.ok) return;
        const data = await resp.json();

        container.innerHTML = (data.suggestions || []).map(s =>
            `<button class="chat-suggestion text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300 transition-all">${escapeHtml(s)}</button>`
        ).join('');

        container.querySelectorAll('.chat-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!isStreaming) sendMessage(btn.textContent);
            });
        });
    } catch { /* suggestions are optional */ }
}

export function refreshChatSuggestions() {
    loadSuggestions();
}
