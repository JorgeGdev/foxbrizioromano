// ===============================
// TIGRIZIO FRONTEND - CON SSE (SERVER-SENT EVENTS)
// Más simple y confiable que WebSockets
// ===============================

// Configuration
const API_BASE_URL = '/api';

// SSE connection
let eventSource = null;

// Global variables
let selectedPresenter = null;
let currentSessionId = null;

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
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
    eventSource = new EventSource("/api/logs");

    eventSource.onopen = function () {
      addLog("SSE", "Conectado - Logs en tiempo real activados", "success");
      updateConnectionStatus("connected");
    };

    eventSource.onmessage = function (event) {
      const logData = JSON.parse(event.data);
      addLog(logData.category, logData.message, logData.type);
    };

    eventSource.onerror = function () {
      addLog("SSE", "Error de conexión SSE", "error");
      updateConnectionStatus("disconnected");
    };
  } catch (error) {
    console.error("Error inicializando SSE:", error);
    addLog("ERROR", "Error inicializando logs en tiempo real", "error");
  }
}

function initializeDashboard() {
  addLog(
    "SYSTEM",
    "Dashboard inicializado - Esperando conexión SSE...",
    "info"
  );
  selectPresenter(1);
  setTimeout(loadFiles, 3000);
}

function setupEventListeners() {
  // Presenter selection
  document.querySelectorAll(".presenter-card").forEach((card) => {
    card.addEventListener("click", function () {
      const presenter = this.dataset.presenter;
      selectPresenter(presenter);
    });
  });

  // Generate video button
  document
    .getElementById("generateBtn")
    .addEventListener("click", generateVideo);

  // Enter key on keyword input
  document
    .getElementById("keywordInput")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        generateVideo();
      }
    });

  // Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      generateVideo();
    }

    if (e.key === "Escape") {
      const approvalSection = document.getElementById("scriptApprovalSection");
      if (!approvalSection.classList.contains("d-none")) {
        cancelGeneration();
      }
    }
  });
}

// ===============================
// API COMMUNICATION FUNCTIONS
// ===============================

async function apiCall(endpoint, method = "GET", data = null) {
  try {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (response.ok) {
      return { success: true, data: result };
    } else {
      addLog("API", `${endpoint} falló: ${result.error}`, "error");
      return {
        success: false,
        error: result.error,
        suggestions: result.suggestions,
      };
    }
  } catch (error) {
    addLog("API", `${endpoint} error: ${error.message}`, "error");
    updateConnectionStatus("disconnected");
    return { success: false, error: error.message };
  }
}

// ===============================
// CORE FUNCTIONS
// ===============================

function selectPresenter(number) {
  document.querySelectorAll(".presenter-card").forEach((card) => {
    card.classList.remove("selected");
  });

  document
    .querySelector(`[data-presenter="${number}"]`)
    .classList.add("selected");
  selectedPresenter = number;

  addLog("USER", `Seleccionado Tigrizio ${number}`, "info");
}

async function generateVideo() {
  const keyword = document.getElementById("keywordInput").value.trim();

  if (!selectedPresenter) {
    addLog("ERROR", "Selecciona un presentador primero", "error");
    return;
  }

  if (!keyword) {
    addLog("ERROR", "Ingresa una palabra clave", "error");
    return;
  }

  if (keyword.length < 2) {
    addLog("ERROR", "Palabra clave muy corta (mínimo 2 caracteres)", "error");
    return;
  }

  setGenerating(true);
  addLog(
    "GENERATOR",
    `Iniciando: Tigrizio${selectedPresenter}@${keyword}`,
    "info"
  );

  const result = await apiCall("/generate-video", "POST", {
    presenter: selectedPresenter,
    keyword: keyword,
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
    addLog(
      "APPROVAL",
      `Script (${result.data.script.wordCount} palabras) - Esperando aprobación`,
      "warning"
    );
  } else {
    addLog("ERROR", result.error, "error");
    if (result.suggestions) {
      result.suggestions.forEach((suggestion) => {
        addLog("TIP", suggestion, "warning");
      });
    }
  }
}

function showScriptApproval(presenter, keyword, script, wordCount) {
  document.getElementById(
    "approvalPresenter"
  ).textContent = `Tigrizio ${presenter}`;
  document.getElementById("approvalKeyword").textContent = keyword;
  document.getElementById("approvalWordCount").textContent = wordCount;
  document.getElementById("approvalScript").textContent = script;

  document.getElementById("scriptApprovalSection").classList.remove("d-none");

  addLog("SCRIPT", `Script de ${wordCount} palabras listo`, "info");
}

async function approveScript() {
  if (!currentSessionId) return;

  hideScriptApproval();
  addLog("APPROVAL", "Script aprobado por el usuario", "success");

  const result = await apiCall(`/approve/${currentSessionId}`, "POST");

  if (result.success) {
    addLog(
      "PIPELINE",
      "Generación REAL iniciada - Logs en tiempo real",
      "info"
    );
    // Los logs del proceso vendrán por SSE automáticamente

    setTimeout(() => {
      updateStats();
    }, 15000);
  } else {
    addLog("ERROR", result.error, "error");
  }

  currentSessionId = null;
}

async function rejectScript() {
  if (!currentSessionId) return;

  hideScriptApproval();
  addLog("APPROVAL", "Script rechazado - Regenerando", "warning");

  const result = await apiCall(`/reject/${currentSessionId}`, "POST");

  if (result.success) {
    showScriptApproval(
      selectedPresenter,
      document.getElementById("keywordInput").value,
      result.data.script.text,
      result.data.script.wordCount
    );
    addLog("REGENERATION", "Nuevo script generado", "success");
  } else {
    addLog("ERROR", result.error, "error");
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

  const result = await apiCall(`/cancel/${currentSessionId}`, "POST");

  if (result.success) {
    addLog("APPROVAL", "Generación cancelada", "info");
  } else {
    addLog("ERROR", result.error, "error");
  }

  currentSessionId = null;
}

function hideScriptApproval() {
  document.getElementById("scriptApprovalSection").classList.add("d-none");
}

async function loadStats() {
  const result = await apiCall("/stats");

  if (result.success) {
    const stats = result.data;

    animateNumber("totalTweets", stats.totalTweets);
    animateNumber("vipTweets", stats.vipTweets);
    animateNumber("activeSessions", stats.activeSessions);
    animateNumber("videosGenerated", stats.videosGenerated || 0);
  } else {
    addLog("ERROR", `Error cargando estadísticas: ${result.error}`, "error");
  }
}

async function checkConnection() {
  updateConnectionStatus("connecting");

  const result = await apiCall("/health");

  if (result.success) {
    updateConnectionStatus("connected");
  } else {
    updateConnectionStatus("disconnected");
    addLog("SYSTEM", "Error conectando al backend", "error");
  }
}

// ===============================
// UI HELPER FUNCTIONS
// ===============================

function setGenerating(isGenerating) {
  const btn = document.getElementById("generateBtn");
  const text = document.getElementById("generateText");
  const spinner = document.getElementById("generateSpinner");

  btn.disabled = isGenerating;

  if (isGenerating) {
    text.textContent = "Generating...";
    spinner.classList.remove("d-none");
  } else {
    text.textContent = "Generate Video";
    spinner.classList.add("d-none");
  }
}

function addLog(category, message, type = "info") {
  const container = document.getElementById("logsContainer");
  const timestamp = new Date().toLocaleTimeString();

  const logEntry = document.createElement("div");
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
  const indicator = document.getElementById("connectionStatus");
  const text = document.getElementById("connectionText");

  switch (status) {
    case "connected":
      indicator.className = "status-indicator status-active";
      text.textContent = "Connected";
      break;
    case "connecting":
      indicator.className = "status-indicator status-processing";
      text.textContent = "Connecting...";
      break;
    case "disconnected":
      indicator.className = "status-indicator status-inactive";
      text.textContent = "Disconnected";
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

window.addEventListener("beforeunload", () => {
  if (eventSource) {
    eventSource.close();
  }
});

window.addEventListener("error", function (e) {
  addLog("ERROR", `JavaScript error: ${e.message}`, "error");
});

window.addEventListener("unhandledrejection", function (e) {
  addLog("ERROR", `Unhandled promise rejection: ${e.reason}`, "error");
});

// ===============================
// LOGOUT FUNCTION
// ===============================
async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  } catch (error) {
    console.error("Error en logout:", error);
    // Forzar redirect aunque falle
    window.location.href = "/login";
  }
}

function goToAdmin() {
  window.location.href = "/admin";
}

// ===============================
// SISTEMA DE MANEJO DE ARCHIVOS
// Agregar al FINAL de app.js
// ===============================

// ===============================
// CARGAR ARCHIVOS GENERADOS
// ===============================
async function loadFiles() {
  try {
    const result = await apiCall("/files");

    if (result.success) {
      displayFiles(result.data.files);
      updateFileCounts(result.data);
      addLog(
        "FILES",
        `Archivos cargados: ${result.data.totalVideos} videos, ${result.data.totalAudios} audios`,
        "info"
      );
    } else {
      addLog("ERROR", `Error cargando archivos: ${result.error}`, "error");
    }
  } catch (error) {
    addLog("ERROR", `Error en loadFiles: ${error.message}`, "error");
  }
}

// ===============================
// MOSTRAR ARCHIVOS EN LA INTERFAZ
// ===============================
function displayFiles(files) {
  displayVideoFiles(files.videos);
  displayAudioFiles(files.audios);
  displayCaptionFiles(files.captions);
}

function displayVideoFiles(videos) {
  const container = document.getElementById("videosList");

  if (videos.length === 0) {
    container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-video fa-2x mb-2"></i>
                <p>No videos generated yet</p>
                <small>Generate your first video to see it here</small>
            </div>
        `;
    return;
  }

  container.innerHTML = videos
    .map(
      (file) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    📊 ${file.size} MB • 
                    📅 ${new Date(file.created).toLocaleDateString()} • 
                    🕐 ${new Date(file.created).toLocaleTimeString()}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-tigrizio btn-file" onclick="downloadFile('video', '${
                  file.name
                }')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-outline-danger btn-file" onclick="deleteFile('video', '${
                  file.name
                }')" title="Admin only">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function displayAudioFiles(audios) {
  const container = document.getElementById("audiosList");

  if (audios.length === 0) {
    container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-music fa-2x mb-2"></i>
                <p>No audios generated yet</p>
            </div>
        `;
    return;
  }

  container.innerHTML = audios
    .map(
      (file) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    📊 ${file.size} MB • 
                    📅 ${new Date(file.created).toLocaleDateString()}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-tigrizio btn-file" onclick="downloadFile('audio', '${
                  file.name
                }')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-outline-danger btn-file" onclick="deleteFile('audio', '${
                  file.name
                }')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function displayCaptionFiles(captions) {
  const container = document.getElementById("captionsList");

  if (captions.length === 0) {
    container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-file-text fa-2x mb-2"></i>
                <p>No captions generated yet</p>
            </div>
        `;
    return;
  }

  container.innerHTML = captions
    .map(
      (file) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    📅 ${new Date(file.created).toLocaleDateString()}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-tigrizio btn-file" onclick="downloadFile('caption', '${
                  file.name
                }')">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-outline-danger btn-file" onclick="deleteFile('caption', '${
                  file.name
                }')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// ===============================
// ACTUALIZAR CONTADORES
// ===============================
function updateFileCounts(data) {
  const videosCount = document.getElementById("videosCount");
  const audiosCount = document.getElementById("audiosCount");
  const captionsCount = document.getElementById("captionsCount");

  if (videosCount) videosCount.textContent = data.totalVideos;
  if (audiosCount) audiosCount.textContent = data.totalAudios;
  if (captionsCount) captionsCount.textContent = data.totalCaptions;
}

// ===============================
// DESCARGAR ARCHIVO
// ===============================
async function downloadFile(type, filename) {
  try {
    addLog("DOWNLOAD", `Descargando ${type}: ${filename}`, "info");

    // Crear enlace temporal para descarga
    const downloadUrl = `/api/download/${type}/${encodeURIComponent(filename)}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("DOWNLOAD", `Descarga iniciada: ${filename}`, "success");
  } catch (error) {
    addLog("ERROR", `Error descargando: ${error.message}`, "error");
  }
}

// ===============================
// ELIMINAR ARCHIVO (SOLO ADMIN)
// ===============================
async function deleteFile(type, filename) {
  if (!confirm(`¿Estás seguro de eliminar ${filename}?`)) {
    return;
  }

  try {
    const result = await apiCall(
      `/files/${type}/${encodeURIComponent(filename)}`,
      "DELETE"
    );

    if (result.success) {
      addLog("DELETE", `Archivo eliminado: ${filename}`, "warning");
      refreshFiles(); // Recargar lista
    } else {
      addLog("ERROR", `Error eliminando archivo: ${result.error}`, "error");
    }
  } catch (error) {
    addLog("ERROR", `Error eliminando archivo: ${error.message}`, "error");
  }
}

// ===============================
// REFRESCAR ARCHIVOS
// ===============================
async function refreshFiles() {
  addLog("FILES", "Refrescando lista de archivos...", "info");
  await loadFiles();
}

// ===============================
// MODIFICAR initializeDashboard PARA CARGAR ARCHIVOS
// ===============================
// Buscar la función initializeDashboard existente y agregar esta línea al final:
// setTimeout(loadFiles, 3000);

// ===============================
// AUTO-REFRESH ARCHIVOS
// ===============================
setInterval(loadFiles, 60000); // Cada 1 minuto
