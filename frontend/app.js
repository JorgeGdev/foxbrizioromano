// ===============================
// TIGRIZIO FRONTEND - API INTEGRATION
// ===============================

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let selectedPresenter = null;
let currentSessionId = null;
let isAutoScrapingActive = false;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadStats();
    checkConnection();
});

function initializeDashboard() {
    addLog('SYSTEM', 'Dashboard initialized successfully', 'info');
    selectPresenter(1); // Select first presenter by default
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

    // Scraping controls
    document.getElementById('toggleScrapingBtn').addEventListener('click', toggleAutoScraping);
    document.getElementById('manualScrapingBtn').addEventListener('click', performManualScraping);

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
        addLog('API', `Calling ${endpoint}...`, 'info');
        
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
            addLog('API', `${endpoint} completed successfully`, 'success');
            return { success: true, data: result };
        } else {
            addLog('API', `${endpoint} failed: ${result.error}`, 'error');
            return { success: false, error: result.error, suggestions: result.suggestions };
        }
    } catch (error) {
        addLog('API', `${endpoint} network error: ${error.message}`, 'error');
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
    
    addLog('USER', `Selected Tigrizio ${number} as presenter`, 'info');
}

async function generateVideo() {
    const keyword = document.getElementById('keywordInput').value.trim();
    
    if (!selectedPresenter) {
        addLog('ERROR', 'Please select a presenter first', 'error');
        return;
    }
    
    if (!keyword) {
        addLog('ERROR', 'Please enter a keyword or topic', 'error');
        return;
    }
    
    if (keyword.length < 2) {
        addLog('ERROR', 'Keyword must be at least 2 characters', 'error');
        return;
    }

    setGenerating(true);
    addLog('GENERATOR', `Starting video generation: Tigrizio${selectedPresenter}@${keyword}`, 'info');
    
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
        addLog('STEP-1', `Found tweets and generated script (${result.data.script.wordCount} words)`, 'success');
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
    
    addLog('APPROVAL', 'Script generated - Waiting for your approval', 'warning');
    addLog('SCRIPT', `Generated ${wordCount} words script`, 'info');
}

async function approveScript() {
    if (!currentSessionId) return;
    
    hideScriptApproval();
    addLog('APPROVAL', 'Script approved - Starting video generation', 'success');
    
    const result = await apiCall(`/approve/${currentSessionId}`, 'POST');
    
    if (result.success) {
        addLog('STEP-3', 'Creating audio with ElevenLabs...', 'info');
        addLog('STEP-4', 'Generating video with Hedra AI (8-10 minutes)...', 'info');
        addLog('INFO', result.data.message, 'success');
        
        // Simulate completion after estimated time
        setTimeout(() => {
            addLog('COMPLETED', 'Video generation completed successfully!', 'success');
            updateStats();
        }, 10000);
    } else {
        addLog('ERROR', result.error, 'error');
    }
    
    currentSessionId = null;
}

async function rejectScript() {
    if (!currentSessionId) return;
    
    hideScriptApproval();
    addLog('APPROVAL', 'Script rejected - Regenerating...', 'warning');
    
    const result = await apiCall(`/reject/${currentSessionId}`, 'POST');
    
    if (result.success) {
        showScriptApproval(
            selectedPresenter,
            document.getElementById('keywordInput').value,
            result.data.script.text,
            result.data.script.wordCount
        );
        addLog('STEP-2', 'New script generated successfully', 'success');
    } else {
        addLog('ERROR', result.error, 'error');
        currentSessionId = null;
    }
}

async function regenerateScript() {
    await rejectScript(); // Same logic as reject
}

async function cancelGeneration() {
    if (!currentSessionId) {
        hideScriptApproval();
        return;
    }
    
    hideScriptApproval();
    
    const result = await apiCall(`/cancel/${currentSessionId}`, 'POST');
    
    if (result.success) {
        addLog('APPROVAL', 'Generation cancelled - No tokens spent', 'info');
    } else {
        addLog('ERROR', result.error, 'error');
    }
    
    currentSessionId = null;
}

function hideScriptApproval() {
    document.getElementById('scriptApprovalSection').classList.add('d-none');
}

async function toggleAutoScraping() {
    const newState = !isAutoScrapingActive;
    
    const result = await apiCall('/toggle-scraping', 'POST', { enable: newState });
    
    if (result.success) {
        isAutoScrapingActive = newState;
        updateScrapingUI();
        addLog('SCRAPING', result.data.message, 'success');
    } else {
        addLog('ERROR', result.error, 'error');
    }
}

function updateScrapingUI() {
    const btn = document.getElementById('toggleScrapingBtn');
    const status = document.getElementById('scrapingStatus');
    const statusText = document.getElementById('scrapingStatusText');
    
    if (isAutoScrapingActive) {
        btn.textContent = 'Disable Auto Scraping';
        btn.classList.remove('btn-tigrizio');
        btn.classList.add('btn-secondary-tigrizio');
        status.className = 'status-indicator status-active';
        statusText.textContent = 'Active (Every 3h)';
    } else {
        btn.textContent = 'Enable Auto Scraping';
        btn.classList.remove('btn-secondary-tigrizio');
        btn.classList.add('btn-tigrizio');
        status.className = 'status-indicator status-inactive';
        statusText.textContent = 'Inactive';
    }
}

async function performManualScraping() {
    const btn = document.getElementById('manualScrapingBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner me-2"></span>Scraping...';
    
    addLog('SCRAPING', 'Starting manual scraping...', 'info');
    
    const result = await apiCall('/manual-scraping', 'POST');
    
    btn.disabled = false;
    btn.textContent = 'Manual Scraping';
    
    if (result.success) {
        addLog('SCRAPING', `Completed: ${result.data.newTweetsSaved} new tweets, ${result.data.vipTweetsDetected} VIP`, 'success');
        await loadStats(); // Refresh stats
    } else {
        addLog('ERROR', result.error, 'error');
    }
}

async function loadStats() {
    const result = await apiCall('/stats');
    
    if (result.success) {
        const stats = result.data;
        
        animateNumber('totalTweets', stats.totalTweets);
        animateNumber('vipTweets', stats.vipTweets);
        animateNumber('activeSessions', stats.activeSessions);
        animateNumber('videosGenerated', stats.videosGenerated || 0);
        
        // Update scraping status
        isAutoScrapingActive = stats.isAutoScrapingActive;
        updateScrapingUI();
        
        addLog('STATS', 'Statistics updated successfully', 'success');
    } else {
        addLog('ERROR', `Failed to load stats: ${result.error}`, 'error');
    }
}

async function loadVipTweets() {
    addLog('API', 'Loading VIP tweets...', 'info');
    
    const result = await apiCall('/vip-tweets');
    
    if (result.success) {
        result.data.tweets.forEach((tweet, index) => {
            addLog(`VIP-${index + 1}`, `[${tweet.keyword?.toUpperCase()}] ${tweet.content}`, 'success');
        });
        addLog('API', 'VIP tweets loaded successfully', 'success');
    } else {
        addLog('ERROR', result.error, 'error');
    }
}

async function loadRecentTweets() {
    addLog('API', 'Loading recent tweets...', 'info');
    
    const result = await apiCall('/recent-tweets');
    
    if (result.success) {
        result.data.tweets.forEach((tweet, index) => {
            const vipIcon = tweet.isVip ? '[VIP]' : '';
            addLog(`RECENT-${index + 1}`, `${vipIcon} ${tweet.content} (${tweet.hoursAgo}h ago)`, 'info');
        });
        addLog('API', 'Recent tweets loaded successfully', 'success');
    } else {
        addLog('ERROR', result.error, 'error');
    }
}

async function checkConnection() {
    updateConnectionStatus('connecting');
    
    const result = await apiCall('/health');
    
    if (result.success) {
        updateConnectionStatus('connected');
        addLog('SYSTEM', 'Connected to Tigrizio backend', 'success');
    } else {
        updateConnectionStatus('disconnected');
        addLog('SYSTEM', 'Failed to connect to backend', 'error');
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
    // Force refresh stats after operations
    setTimeout(loadStats, 1000);
}

// ===============================
// PERIODIC TASKS
// ===============================

// Auto-refresh stats every 2 minutes
setInterval(loadStats, 120000);

// Check connection every 30 seconds
setInterval(() => {
    apiCall('/health').then(result => {
        if (result.success) {
            updateConnectionStatus('connected');
        } else {
            updateConnectionStatus('disconnected');
        }
    });
}, 30000);

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

window.addEventListener('error', function(e) {
    addLog('ERROR', `JavaScript error: ${e.message}`, 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    addLog('ERROR', `Unhandled promise rejection: ${e.reason}`, 'error');
});