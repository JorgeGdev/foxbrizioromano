// ===============================
// TIGRIZIO FRONTEND - PRODUCTION
// ===============================

const API_BASE_URL = '/api'; // Railway-friendly
let selectedPresenter = null;
let currentSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  setupEventListeners();
});

// ===============================
// CORE FUNCTIONS
// ===============================

function initializeDashboard() {
  selectPresenter(1);
}

function setupEventListeners() {
  // Presenter selection
  document.querySelectorAll('.presenter-card').forEach(card => {
    card.addEventListener('click', () => selectPresenter(card.dataset.presenter));
  });

  // Generate video
  document.getElementById('generateBtn').addEventListener('click', generateVideo);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) generateVideo();
    if (e.key === 'Escape') cancelGeneration();
  });
}

// ===============================
// GENERATION FLOW
// ===============================

async function generateVideo() {
  const keyword = document.getElementById('keywordInput').value.trim();
  
  if (!selectedPresenter || !keyword) {
    alert('⚠️ Select presenter and enter keyword');
    return;
  }

  setLoading(true);

  const result = await apiCall('/generate-video', 'POST', {
    presenter: selectedPresenter,
    keyword
  });

  if (result.success) {
    showScriptApproval(result.data);
  } else {
    alert(`❌ ${result.error}`);
  }

  setLoading(false);
}

async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: 'Connection failed' };
  }
}