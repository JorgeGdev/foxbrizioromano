// ===============================
// TIGRIZIO FRONTEND - CON SSE (SERVER-SENT EVENTS)
// Más simple y confiable que WebSockets
// ===============================

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// SSE connection
let eventSource = null;

// Global variables
let selectedPresenter = null;
let currentSessionId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeSSE();
    initializeDashboard();
    setupEventListeners();
    loadStats();
    checkConnection();
});

// ===============================
// SSE INITIALIZATION (MÁS SIMPLE QUE WEBSOCKETS)
// ===============================

function initializeSSE() {
    try {
        eventSource = new EventSource('/api/logs');
        
        eventSource.onopen = function() {
            addLog('SSE', 'Conectado - Logs en tiempo real activados', 'success');
            updateConnectionStatus('connected');
        };
        
        eventSource.onmessage = function(event) {
            const logData = JSON.parse(event.data);
            addLog(logData.category, logData.message, logData.type);
        };
        
        eventSource.onerror = function() {
            addLog('SSE', 'Error de conexión SSE', 'error');
            updateConnectionStatus('disconnected');
        };
        
    } catch (error) {
        console.error('Error inicializando SSE:', error);
        addLog('ERROR', 'Error inicializando logs en tiempo real', 'error');
    }
}

function initializeDashboard() {
    addLog('SYSTEM', 'Dashboard inicializado - Esperando conexión SSE...', 'info');
    selectPresenter(1);
}

function setupEventListeners() {
    // Presenter selection
    document.querySelectorAll('.presenter-card').forEach(card => {
        card.addEventListener('click', function() {
            const presenter = this.dataset.presenter;
            selectPresenter(presenter);
        });
    });

    // Generate video button
    document.getElementById('generateBtn').addEventListener('click', generateVideo);

    // Enter key on keyword input
    document.getElementById('keywordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateVideo();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            generateVideo();
        }
        
        if (e.key === 'Escape') {
            const approvalSection = document.getElementById('scriptApprovalSection');
            if (!approvalSection.classList.contains('d-none')) {
                cancelGeneration();
            }
        }
    });
}

// ===============================
// API COMMUNICATION FUNCTIONS
// ===============================

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (response.ok) {
            
            return { success: true, data: result };
        } else {
            addLog('API', `${endpoint} falló: ${result.error}`, 'error');
            return { success: false, error: result.error, suggestions: result.suggestions };
        }
    } catch (error) {
        addLog('API', `${endpoint} error: ${error.message}`, 'error');
        updateConnectionStatus('disconnected');
        return { success: false, error: error.message };
    }
}

// ===============================
// CORE FUNCTIONS
// ===============================

function selectPresenter(number) {
    document.querySelectorAll('.presenter-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelector(`[data-presenter="${number}"]`).classList.add('selected');
    selectedPresenter = number;
    
    addLog('USER', `Seleccionado Tigrizio ${number}`, 'info');
}

async function generateVideo() {
    const keyword = document.getElementById('keywordInput').value.trim();
    
    if (!selectedPresenter) {
        addLog('ERROR', 'Selecciona un presentador primero', 'error');
        return;
    }
    
    if (!keyword) {
        addLog('ERROR', 'Ingresa una palabra clave', 'error');
        return;
    }
    
    if (keyword.length < 2) {
        addLog('ERROR', 'Palabra clave muy corta (mínimo 2 caracteres)', 'error');
        return;
    }

    setGenerating(true);
    addLog('GENERATOR', `Iniciando: Tigrizio${selectedPresenter}@${keyword}`, 'info');
    
    const result = await apiCall('/generate-video', 'POST', {
        presenter: selectedPresenter,
        keyword: keyword
    });
    
    setGenerating(false);
    
    if (result.success) {
        currentSessionId = result.data.sessionId;
        showScriptApproval(
            result.data.presenter,
            result.data.keyword,
            result.data.script.text,
            result.data.script.wordCount
        );
        addLog('APPROVAL', `Script (${result.data.script.wordCount} palabras) - Esperando aprobación`, 'warning');
    } else {
        addLog('ERROR', result.error, 'error');
        if (result.suggestions) {
            result.suggestions.forEach(suggestion => {
                addLog('TIP', suggestion, 'warning');
            });
        }
    }
}

function showScriptApproval(presenter, keyword, script, wordCount) {
    document.getElementById('approvalPresenter').textContent = `Tigrizio ${presenter}`;
    document.getElementById('approvalKeyword').textContent = keyword;
    document.getElementById('approvalWordCount').textContent = wordCount;
    document.getElementById('approvalScript').textContent = script;
    
    document.getElementById('scriptApprovalSection').classList.remove('d-none');
    
    addLog('SCRIPT', `Script de ${wordCount} palabras listo`, 'info');
}

async function approveScript() {
    if (!currentSessionId) return;
    
    hideScriptApproval();
    addLog('APPROVAL', 'Script aprobado por el usuario', 'success');
    
    const result = await apiCall(`/approve/${currentSessionId}`, 'POST');
    
    if (result.success) {
        addLog('PIPELINE', 'Generación REAL iniciada - Logs en tiempo real', 'info');
        // Los logs del proceso vendrán por SSE automáticamente
        
        setTimeout(() => {
            updateStats();
        }, 15000);
    } else {
        addLog('ERROR', result.error, 'error');
    }
    
    currentSessionId = null;
}

async function rejectScript() {
    if (!currentSessionId) return;
    
    hideScriptApproval();
    addLog('APPROVAL', 'Script rechazado - Regenerando', 'warning');
    
    const result = await apiCall(`/reject/${currentSessionId}`, 'POST');
    
    if (result.success) {
        showScriptApproval(
            selectedPresenter,
            document.getElementById('keywordInput').value,
            result.data.script.text,
            result.data.script.wordCount
        );
        addLog('REGENERATION', 'Nuevo script generado', 'success');
    } else {
        addLog('ERROR', result.error, 'error');
        currentSessionId = null;
    }
}

async function regenerateScript() {
    await rejectScript();
}

async function cancelGeneration() {
    if (!currentSessionId) {
        hideScriptApproval();
        return;
    }
    
    hideScriptApproval();
    
    const result = await apiCall(`/cancel/${currentSessionId}`, 'POST');
    
    if (result.success) {
        addLog('APPROVAL', 'Generación cancelada', 'info');
    } else {
        addLog('ERROR', result.error, 'error');
    }
    
    currentSessionId = null;
}

function hideScriptApproval() {
    document.getElementById('scriptApprovalSection').classList.add('d-none');
}

async function loadStats() {
    const result = await apiCall('/stats');
    
    if (result.success) {
        const stats = result.data;
        
        animateNumber('totalTweets', stats.totalTweets);
        animateNumber('vipTweets', stats.vipTweets);
        animateNumber('activeSessions', stats.activeSessions);
        animateNumber('videosGenerated', stats.videosGenerated || 0);
    } else {
        addLog('ERROR', `Error cargando estadísticas: ${result.error}`, 'error');
    }
}

async function checkConnection() {
    updateConnectionStatus('connecting');
    
    const result = await apiCall('/health');
    
    if (result.success) {
        updateConnectionStatus('connected');
    } else {
        updateConnectionStatus('disconnected');
        addLog('SYSTEM', 'Error conectando al backend', 'error');
    }
}

// ===============================
// UI HELPER FUNCTIONS
// ===============================

function setGenerating(isGenerating) {
    const btn = document.getElementById('generateBtn');
    const text = document.getElementById('generateText');
    const spinner = document.getElementById('generateSpinner');
    
    btn.disabled = isGenerating;
    
    if (isGenerating) {
        text.textContent = 'Generating...';
        spinner.classList.remove('d-none');
    } else {
        text.textContent = 'Generate Video';
        spinner.classList.add('d-none');
    }
}

function addLog(category, message, type = 'info') {
    const container = document.getElementById('logsContainer');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<strong>[${category}]</strong> ${message} <small class="text-muted float-end">${timestamp}</small>`;
    
    container.appendChild(logEntry);
    container.scrollTop = container.scrollHeight;
    
    // Remove old logs (keep last 50)
    const logs = container.children;
    if (logs.length > 50) {
        container.removeChild(logs[0]);
    }
}

function updateConnectionStatus(status) {
    const indicator = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    
    switch(status) {
        case 'connected':
            indicator.className = 'status-indicator status-active';
            text.textContent = 'Connected';
            break;
        case 'connecting':
            indicator.className = 'status-indicator status-processing';
            text.textContent = 'Connecting...';
            break;
        case 'disconnected':
            indicator.className = 'status-indicator status-inactive';
            text.textContent = 'Disconnected';
            break;
    }
}

function animateNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    const startNumber = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetNumber - startNumber) / 20);
    let currentNumber = startNumber;
    
    const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= targetNumber) {
            currentNumber = targetNumber;
            clearInterval(timer);
        }
        element.textContent = currentNumber;
    }, 50);
}

function updateStats() {
    setTimeout(loadStats, 1000);
}

// ===============================
// PERIODIC TASKS
// ===============================

// Auto-refresh stats every 2 minutes
setInterval(loadStats, 120000);


// ===============================
// CLEANUP
// ===============================

window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});

window.addEventListener('error', function(e) {
    addLog('ERROR', `JavaScript error: ${e.message}`, 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    addLog('ERROR', `Unhandled promise rejection: ${e.reason}`, 'error');
});


// ===============================
// LOGOUT FUNCTION
// ===============================
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Error en logout:', error);
        // Forzar redirect aunque falle
        window.location.href = '/login';
    }
}

function goToAdmin() {
    window.location.href = '/admin';
}