    // Global variables
    let selectedPresenter = null;
    let currentSessionId = null;
    let isAutoScrapingActive = false;
    let wsConnection = null;

    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', function() {
      initializeDashboard();
      setupEventListeners();
      loadStats();
      updateConnectionStatus('connecting');
    });

    function initializeDashboard() {
      addLog('SYSTEM', 'Dashboard initialized successfully', 'info');
      
      // Select first presenter by default
      selectPresenter(1);
      
      // Load initial data
      setTimeout(() => {
        updateConnectionStatus('connected');
        addLog('API', 'Connected to Tigrizio backend', 'success');
      }, 1000);
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
    }

    function selectPresenter(number) {
      // Remove previous selection
      document.querySelectorAll('.presenter-card').forEach(card => {
        card.classList.remove('selected');
      });
      
      // Add selection to clicked card
      document.querySelector(`[data-presenter="${number}"]`).classList.add('selected');
      selectedPresenter = number;
      
      addLog('USER', `Selected Tigrizio ${number} as presenter`, 'info');
    }

    function generateVideo() {
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

      // Start generation process
      setGenerating(true);
      currentSessionId = `VIDEO-${Date.now()}`;
      
      addLog('GENERATOR', `Starting video generation: Tigrizio${selectedPresenter}@${keyword}`, 'info');
      addLog('STEP-1', 'Searching for related tweets...', 'info');
      
      // Simulate the process (replace with actual API calls)
      setTimeout(() => {
        addLog('STEP-1', 'Found 3 relevant tweets', 'success');
        addLog('STEP-2', 'Generating script with OpenAI...', 'info');
        
        setTimeout(() => {
          showScriptApproval(selectedPresenter, keyword, "¡INCREÍBLE! Erling Haaland está muy cerca de firmar una extensión con Manchester City. HERE WE GO - Las negociaciones están en fase final y el anuncio podría llegar esta semana. ¿Será esta la noticia que todos esperábamos?", 79);
        }, 2000);
      }, 1500);
    }

    function showScriptApproval(presenter, keyword, script, wordCount) {
      setGenerating(false);
      
      // Update approval section
      document.getElementById('approvalPresenter').textContent = `Tigrizio ${presenter}`;
      document.getElementById('approvalKeyword').textContent = keyword;
      document.getElementById('approvalWordCount').textContent = wordCount;
      document.getElementById('approvalScript').textContent = script;
      
      // Show approval section
      document.getElementById('scriptApprovalSection').classList.remove('d-none');
      
      addLog('APPROVAL', 'Script generated - Waiting for your approval', 'warning');
      addLog('SCRIPT', `Generated ${wordCount} words script`, 'info');
    }

    function approveScript() {
      hideScriptApproval();
      addLog('APPROVAL', 'Script approved - Starting video generation', 'success');
      addLog('STEP-3', 'Creating audio with ElevenLabs...', 'info');
      
      setTimeout(() => {
        addLog('STEP-3', 'Audio generated: 156 KB, ~20s duration', 'success');
        addLog('STEP-4', 'Generating video with Hedra AI (8-10 minutes)...', 'info');
        
        setTimeout(() => {
          addLog('STEP-4', 'Video generation completed successfully!', 'success');
          addLog('COMPLETED', 'Video ready: tigrizio_video_12345.mp4 (2.1 MB)', 'success');
        }, 8000);
      }, 3000);
    }

    function rejectScript() {
      hideScriptApproval();
      addLog('APPROVAL', 'Script rejected - Regenerating automatically', 'warning');
      addLog('STEP-2', 'Regenerating script with OpenAI...', 'info');
      
      setTimeout(() => {
        showScriptApproval(selectedPresenter, document.getElementById('keywordInput').value, "¡BOMBAZO! Las últimas horas han sido decisivas para Erling Haaland y Manchester City. Fuentes cercanas confirman que el acuerdo está prácticamente cerrado. El noruego seguirá vistiendo la camiseta celeste. ¿Qué opinas de esta decisión?", 75);
      }, 2000);
    }

    function regenerateScript() {
      hideScriptApproval();
      addLog('APPROVAL', 'Regenerating script...', 'info');
      
      setTimeout(() => {
        showScriptApproval(selectedPresenter, document.getElementById('keywordInput').value, "¡HISTÓRICO! Erling Haaland renueva con Manchester City hasta 2029. El atacante noruego firma el contrato más lucrativo de la historia del club. Las cifras son astronómicas y confirman su compromiso a largo plazo. ¿Será suficiente para conquistar Europa?", 81);
      }, 2000);
    }

    function cancelGeneration() {
      hideScriptApproval();
      addLog('APPROVAL', 'Generation cancelled - No tokens spent', 'info');
      addLog('SYSTEM', 'Ready for new video generation', 'info');
    }

    function hideScriptApproval() {
      document.getElementById('scriptApprovalSection').classList.add('d-none');
    }

    function toggleAutoScraping() {
      isAutoScrapingActive = !isAutoScrapingActive;
      
      const btn = document.getElementById('toggleScrapingBtn');
      const status = document.getElementById('scrapingStatus');
      const statusText = document.getElementById('scrapingStatusText');
      
      if (isAutoScrapingActive) {
        btn.textContent = 'Disable Auto Scraping';
        btn.classList.remove('btn-tigrizio');
        btn.classList.add('btn-secondary-tigrizio');
        status.className = 'status-indicator status-active';
        statusText.textContent = 'Active (Every 3h)';
        addLog('SCRAPING', 'Auto scraping enabled - Every 3 hours during EU hours', 'success');
      } else {
        btn.textContent = 'Enable Auto Scraping';
        btn.classList.remove('btn-secondary-tigrizio');
        btn.classList.add('btn-tigrizio');
        status.className = 'status-indicator status-inactive';
        statusText.textContent = 'Inactive';
        addLog('SCRAPING', 'Auto scraping disabled', 'info');
      }
    }

    function performManualScraping() {
      addLog('SCRAPING', 'Starting manual scraping...', 'info');
      
      const btn = document.getElementById('manualScrapingBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner me-2"></span>Scraping...';
      
      setTimeout(() => {
        addLog('SCRAPING', 'Scraping completed: 7 new tweets, 3 VIP', 'success');
        addLog('DATABASE', 'Tweets saved to Supabase with embeddings', 'success');
        btn.disabled = false;
        btn.textContent = 'Manual Scraping';
        
        // Update stats
        updateStats();
      }, 3000);
    }

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

    function loadStats() {
      addLog('API', 'Loading system statistics...', 'info');
      
      // Simulate API call (replace with actual fetch to your backend)
      setTimeout(() => {
        // Update stats with animation
        animateNumber('totalTweets', 43);
        animateNumber('vipTweets', 18);
        animateNumber('activeSessions', 2);
        animateNumber('videosGenerated', 127);
        
        addLog('STATS', 'Statistics updated successfully', 'success');
      }, 500);
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
      // Increment stats after successful operations
      const totalTweets = parseInt(document.getElementById('totalTweets').textContent);
      const vipTweets = parseInt(document.getElementById('vipTweets').textContent);
      
      animateNumber('totalTweets', totalTweets + 7);
      animateNumber('vipTweets', vipTweets + 3);
    }

    function loadVipTweets() {
      addLog('API', 'Loading VIP tweets...', 'info');
      
      setTimeout(() => {
        addLog('VIP-1', '[HERE WE GO] Haaland extension with Man City confirmed', 'success');
        addLog('VIP-2', '[OFFICIAL] Mbappe joins Real Madrid - Deal completed', 'success');
        addLog('VIP-3', '[EXCLUSIVE] Barcelona close to signing Joao Felix', 'success');
        addLog('API', 'VIP tweets loaded successfully', 'success');
      }, 1000);
    }

    function loadRecentTweets() {
      addLog('API', 'Loading recent tweets...', 'info');
      
      setTimeout(() => {
        addLog('RECENT-1', 'Arsenal monitoring Osimhen situation closely', 'info');
        addLog('RECENT-2', 'Liverpool interested in Benfica midfielder', 'info');
        addLog('RECENT-3', 'Chelsea preparing bid for Brighton defender', 'info');
        addLog('RECENT-4', 'Man United scouting Bundesliga talents', 'info');
        addLog('API', 'Recent tweets loaded successfully', 'success');
      }, 1000);
    }

    // Simulated real-time updates
    function simulateRealTimeUpdates() {
      setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every 30 seconds
          const updates = [
            { category: 'TWITTER', message: 'New tweet detected from Fabrizio Romano', type: 'info' },
            { category: 'VIP', message: 'HERE WE GO tweet detected - Transfer confirmed', type: 'success' },
            { category: 'SYSTEM', message: 'Database updated with new embeddings', type: 'success' },
            { category: 'API', message: 'Health check completed - All systems operational', type: 'success' }
          ];
          
          const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
          addLog(randomUpdate.category, randomUpdate.message, randomUpdate.type);
        }
      }, 30000); // Every 30 seconds
    }

    // API Communication Functions (replace these with actual API calls)
    async function callAPI(endpoint, method = 'GET', data = null) {
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
        
        // Replace with your actual backend URL
        const response = await fetch(`http://localhost:3000/api${endpoint}`, options);
        const result = await response.json();
        
        if (response.ok) {
          addLog('API', `${endpoint} completed successfully`, 'success');
          return result;
        } else {
          addLog('API', `${endpoint} failed: ${result.error}`, 'error');
          return null;
        }
      } catch (error) {
        addLog('API', `${endpoint} error: ${error.message}`, 'error');
        return null;
      }
    }

    // Real API integration functions (uncomment and modify when ready)
    /*
    async function generateVideoAPI() {
      const data = {
        presenter: selectedPresenter,
        keyword: document.getElementById('keywordInput').value
      };
      
      return await callAPI('/generate-video', 'POST', data);
    }

    async function toggleScrapingAPI() {
      return await callAPI('/toggle-scraping', 'POST', { enable: !isAutoScrapingActive });
    }

    async function getStatsAPI() {
      return await callAPI('/stats');
    }

    async function approveScriptAPI() {
      return await callAPI(`/approve/${currentSessionId}`, 'POST');
    }
    */

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Ctrl + Enter to generate video
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        generateVideo();
      }
      
      // Escape to cancel/hide approval
      if (e.key === 'Escape') {
        const approvalSection = document.getElementById('scriptApprovalSection');
        if (!approvalSection.classList.contains('d-none')) {
          cancelGeneration();
        }
      }
    });

    // Start simulated real-time updates
    setTimeout(simulateRealTimeUpdates, 5000);

    // Auto-refresh stats every 2 minutes
    setInterval(loadStats, 120000);