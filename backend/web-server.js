// ===============================
// TIGRIZIO WEB SERVER - CON AUTENTICACIÓN JWT
// ===============================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');

// Importar módulos
const AuthManager = require('./auth-manager');
const SupabaseManager = require('./supabase-manager');
const TigrizioScriptGenerator = require('./script-generator');
const TigrizioVoiceGenerator = require('./voice-generator');
const TigrizioVideoGenerator = require('./video-generator');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar módulos
const auth = new AuthManager();
const db = new SupabaseManager();
const scriptGen = new TigrizioScriptGenerator();
const voiceGen = new TigrizioVoiceGenerator();
const videoGen = new TigrizioVideoGenerator();

// Almacenar sesiones en memoria
const activeSessions = new Map();

// ===============================
// SSE (SERVER-SENT EVENTS) PARA LOGS
// ===============================
let sseClients = [];

function sendSSELog(category, message, type = 'info') {
    const logData = {
        category,
        message,
        type,
        timestamp: new Date().toISOString()
    };
    
    // Enviar a todos los clientes SSE conectados
    sseClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(logData)}\n\n`);
        } catch (error) {
            // Cliente desconectado, remover de la lista
        }
    });
    
    console.log(`📡 [${category}] ${message}`);
}

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos (sin autenticación para login)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ===============================
// RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// ===============================

// Ruta principal - redirigir según autenticación
app.get('/', async (req, res) => {
    const token = req.cookies.authToken;
    
    if (token) {
        const verification = auth.verifyToken(token);
        if (verification.success) {
            return res.redirect('/dashboard');
        }
    }
    
    res.redirect('/login');
});

// Página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ===============================
// RUTAS DE AUTENTICACIÓN
// ===============================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username y password son requeridos'
            });
        }
        
        const result = await auth.authenticate(username, password);
        
        if (result.success) {
            // Configurar cookie con el token
            res.cookie('authToken', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 24 horas
                sameSite: 'strict'
            });
            
            sendSSELog('AUTH', `Usuario ${username} ha iniciado sesión`, 'success');
            
            res.json({
                success: true,
                message: 'Login exitoso',
                user: result.user
            });
        } else {
            sendSSELog('AUTH', `Intento de login fallido para ${username}`, 'warning');
            res.status(401).json({
                success: false,
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('authToken');
    sendSSELog('AUTH', 'Usuario ha cerrado sesión', 'info');
    res.json({ success: true, message: 'Logout exitoso' });
});

// Verificar token
app.get('/api/auth/verify', (req, res) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No hay token' });
    }
    
    const verification = auth.verifyToken(token);
    
    if (verification.success) {
        res.json({ success: true, user: verification.user });
    } else {
        res.clearCookie('authToken');
        res.status(401).json({ success: false, error: verification.error });
    }
});

// ===============================
// RUTA ACCESS-DENIED (SOLUCIÓN)
// ===============================
app.get('/access-denied', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/access-denied.html'));
});

// ===============================
// RUTAS PROTEGIDAS (CON AUTENTICACIÓN)
// ===============================

// Dashboard principal (protegido)
app.get('/dashboard', auth.requireAuth.bind(auth), (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Admin panel (solo admin)
app.get('/admin', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// SSE endpoint para logs (protegido)
app.get('/api/logs', auth.requireAuth.bind(auth), (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Enviar log de conexión
    res.write(`data: ${JSON.stringify({
        category: 'SYSTEM',
        message: `Bienvenido ${req.user.username} - Logs en tiempo real activados`,
        type: 'success',
        timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Agregar cliente a la lista
    sseClients.push(res);
    console.log(`🔌 Cliente SSE conectado: ${req.user.username}`);
    
    // Remover cliente cuando se desconecte
    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
        console.log(`🔌 Cliente SSE desconectado: ${req.user.username}`);
    });
});

// ===============================
// API ENDPOINTS PROTEGIDOS
// ===============================

app.get('/api/health', auth.requireAuth.bind(auth), (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tigrizio Web Server funcionando',
        timestamp: new Date().toISOString(),
        mode: 'web-auth',
        user: req.user.username
    });
});

app.get('/api/stats', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        sendSSELog('API', `${req.user.username} cargando estadísticas...`, 'info');
        
        const stats = await db.getStats();
        const userStats = auth.getUserStats();
        
        if (stats.success) {
            res.json({
                success: true,
                data: {
                    totalTweets: stats.stats.total,
                    vipTweets: stats.stats.vipCount,
                    totalLikes: stats.stats.totalLikes,
                    totalRetweets: stats.stats.totalRetweets,
                    activeSessions: activeSessions.size,
                    videosGenerated: 127,
                    totalUsers: userStats.total,
                    activeUsers: userStats.active
                }
            });
            
            sendSSELog('STATS', 'Estadísticas actualizadas', 'success');
        } else {
            res.status(500).json({ success: false, error: stats.error });
        }
    } catch (error) {
        console.error('❌ Error en /api/stats:', error);
        sendSSELog('ERROR', `Error cargando estadísticas: ${error.message}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/generate-video', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { presenter, keyword } = req.body;
        
        sendSSELog('GENERATOR', `${req.user.username} iniciando: Tigrizio${presenter}@${keyword}`, 'info');
        
        // Validaciones
        if (!presenter || !keyword) {
            sendSSELog('ERROR', 'Datos faltantes', 'error');
            return res.status(400).json({
                success: false,
                error: 'Presenter y keyword requeridos'
            });
        }
        
        if (presenter < 1 || presenter > 9) {
            return res.status(400).json({
                success: false,
                error: 'Presenter debe ser entre 1 y 9'
            });
        }
        
        sendSSELog('STEP-1', 'Buscando tweets en base de datos...', 'info');
        
        // Buscar tweets
        const searchResult = await db.searchTweetsByKeywords(keyword, 3);
        
        if (!searchResult.success || searchResult.tweets.length === 0) {
            sendSSELog('ERROR', `No se encontraron tweets para "${keyword}"`, 'error');
            return res.status(404).json({
                success: false,
                error: `No se encontraron tweets para "${keyword}"`,
                suggestions: [
                    'Intenta con términos más generales',
                    'Usa nombres de clubes famosos',
                    'Usa nombres de jugadores conocidos'
                ]
            });
        }
        
        sendSSELog('STEP-1', `Encontrados ${searchResult.tweets.length} tweets`, 'success');
        sendSSELog('STEP-2', 'Generando script con OpenAI GPT-4...', 'info');
        
        // Generar script
        const scriptResult = await scriptGen.generateScript(keyword);
        
        if (!scriptResult.success) {
            sendSSELog('ERROR', `Error generando script: ${scriptResult.error}`, 'error');
            return res.status(500).json({
                success: false,
                error: `Error generando script: ${scriptResult.error}`
            });
        }
        
        sendSSELog('STEP-2', `Script generado (${scriptResult.wordCount} palabras)`, 'success');
        
        // Crear sesión
        const sessionId = `WEB-${Date.now()}`;
        activeSessions.set(sessionId, {
            presenter,
            keyword,
            scriptResult,
            timestamp: Date.now(),
            userId: req.user.id,
            username: req.user.username
        });
        
        sendSSELog('APPROVAL', 'Script listo - Esperando aprobación', 'warning');
        
        res.json({
            success: true,
            sessionId: sessionId,
            script: {
                text: scriptResult.script,
                wordCount: scriptResult.wordCount,
                estimatedDuration: scriptResult.estimatedDuration,
                tweetsUsed: scriptResult.tweetsUsed
            },
            presenter: presenter,
            keyword: keyword
        });
        
    } catch (error) {
        console.error('❌ Error en /api/generate-video:', error);
        sendSSELog('ERROR', `Error en generación: ${error.message}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/approve/:sessionId', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        sendSSELog('APPROVAL', `${req.user.username} aprobó script - Iniciando generación`, 'success');
        
        const sessionData = activeSessions.get(sessionId);
        
        if (!sessionData) {
            sendSSELog('ERROR', 'Sesión no encontrada', 'error');
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada o expirada'
            });
        }
        
        // Verificar que el usuario puede aprobar esta sesión
        if (sessionData.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para aprobar esta sesión'
            });
        }
        
        // Respuesta inmediata
        res.json({
            success: true,
            message: 'Script aprobado - Iniciando generación',
            sessionId: sessionId,
            estimatedTime: '10-12 minutos'
        });
        
        // Ejecutar generación en background
        setImmediate(async () => {
            try {
                await generateVideoComplete(sessionData, sessionId);
            } catch (error) {
                console.error('❌ Error en generación:', error);
                sendSSELog('ERROR', `Error: ${error.message}`, 'error');
            } finally {
                activeSessions.delete(sessionId);
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /api/approve:', error);
        sendSSELog('ERROR', `Error en aprobación: ${error.message}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// GENERACIÓN DE VIDEO COMPLETA (CON LOGS SSE REALES)
// ===============================
async function generateVideoComplete(sessionData, sessionId) {
    const { presenter, keyword, scriptResult, username } = sessionData;
    
    try {
        sendSSELog('PIPELINE', `${username} - Iniciando pipeline de generación REAL...`, 'info');
        
        // PASO 1: Generar audio con ElevenLabs (REAL)
        sendSSELog('ELEVENLABS', 'Conectando con ElevenLabs API...', 'info');
        sendSSELog('STEP-3', 'Generando audio con voz italiana (GianP)...', 'info');
        
        const audioFileName = `tigrizio_${presenter}_${keyword.replace(/\s+/g, "_")}_${Date.now()}`;
        
        // Llamada REAL a ElevenLabs con logs
        const audioResult = await generateAudioWithLogs(scriptResult.script, audioFileName, sessionId);
        
        if (!audioResult.success) {
            throw new Error(`Error generando audio: ${audioResult.error}`);
        }
        
        sendSSELog('STEP-3', `Audio generado exitosamente: ${audioResult.fileSizeKB} KB, ~${audioResult.estimatedDuration}s`, 'success');
        
        // PASO 2: Generar video con Hedra (REAL)
        sendSSELog('HEDRA', 'Conectando con Hedra AI...', 'info');
        sendSSELog('STEP-4', 'Procesando imagen y audio para Hedra...', 'info');
        
        // Cargar audio buffer
        const audioPath = path.join(__dirname, '../assets/audio', audioResult.fileName);
        const audioBuffer = await fs.readFile(audioPath);
        
        sendSSELog('STEP-4', 'Assets preparados, enviando a Hedra...', 'info');
        sendSSELog('STEP-4', 'Video en cola de procesamiento (8-10 minutos)...', 'warning');
        
        // Llamada REAL a Hedra con logs
        const videoResult = await generateVideoWithLogs(audioBuffer, `tigrizio${presenter}`, sessionId, scriptResult.script);
        
        if (videoResult.success) {
            sendSSELog('COMPLETED', `¡Video generado exitosamente para ${username}!`, 'success');
            sendSSELog('FILES', `Video: ${videoResult.nombreArchivo}`, 'success');
            if (videoResult.caption) {
                sendSSELog('FILES', `Caption: ${videoResult.caption.nombreArchivo}`, 'success');
            }
            sendSSELog('SYSTEM', '¡Listo para descargar!', 'success');
        } else {
            throw new Error(videoResult.error);
        }
        
    } catch (error) {
        console.error(`❌ Error en generación [${sessionId}]:`, error);
        sendSSELog('ERROR', `Error para ${username}: ${error.message}`, 'error');
    }
}

// ===============================
// GENERAR AUDIO CON LOGS SSE
// ===============================
async function generateAudioWithLogs(script, fileName, sessionId) {
    try {
        sendSSELog('ELEVENLABS', 'Enviando script a ElevenLabs...', 'info');
        
        const audioResult = await voiceGen.generateAudio(script, fileName);
        
        if (audioResult.success) {
            sendSSELog('ELEVENLABS', 'Audio procesado correctamente', 'success');
            return audioResult;
        } else {
            sendSSELog('ELEVENLABS', `Error: ${audioResult.error}`, 'error');
            return audioResult;
        }
        
    } catch (error) {
        sendSSELog('ELEVENLABS', `Error de conexión: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// ===============================
// GENERAR VIDEO CON LOGS SSE
// ===============================
async function generateVideoWithLogs(audioBuffer, imageName, sessionId, script) {
    try {
        sendSSELog('HEDRA', 'Iniciando generación de video...', 'info');
        sendSSELog('HEDRA', 'Procesando audio e imagen...', 'info');
        
        const videoResult = await videoGen.generarVideoCompleto(audioBuffer, imageName, sessionId, script);
        
        if (videoResult.success) {
            sendSSELog('HEDRA', 'Video procesado exitosamente', 'success');
        } else {
            sendSSELog('HEDRA', `Error: ${videoResult.error}`, 'error');
        }
        
        return videoResult;
        
    } catch (error) {
        sendSSELog('HEDRA', `Error de conexión: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Otros endpoints (reject, cancel, etc.)
app.post('/api/reject/:sessionId', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = activeSessions.get(sessionId);
        
        if (!sessionData) {
            return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
        }
        
        // Verificar permisos
        if (sessionData.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sin permisos' });
        }
        
        // Regenerar script
        const newScriptResult = await scriptGen.generateScript(sessionData.keyword);
        
        if (!newScriptResult.success) {
            return res.status(500).json({
                success: false,
                error: `Error regenerando script: ${newScriptResult.error}`
            });
        }
        
        // Actualizar sesión
        sessionData.scriptResult = newScriptResult;
        activeSessions.set(sessionId, sessionData);
        
        res.json({
            success: true,
            sessionId: sessionId,
            script: {
                text: newScriptResult.script,
                wordCount: newScriptResult.wordCount,
                estimatedDuration: newScriptResult.estimatedDuration,
                tweetsUsed: newScriptResult.tweetsUsed
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /api/reject:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/cancel/:sessionId', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = activeSessions.get(sessionId);
        
        if (sessionData && (sessionData.userId !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ success: false, error: 'Sin permisos' });
        }
        
        activeSessions.delete(sessionId);
        
        res.json({
            success: true,
            message: 'Generación cancelada'
        });
        
    } catch (error) {
        console.error('❌ Error en /api/cancel:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMIN)
// ===============================

// Gestión de usuarios (solo admin)
app.get('/api/admin/users', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), (req, res) => {
    const users = auth.getUsers();
    res.json({ success: true, users });
});

app.post('/api/admin/users', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.createUser(req.body);
    res.json(result);
});

app.put('/api/admin/users/:userId', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.updateUser(parseInt(req.params.userId), req.body);
    res.json(result);
});

app.delete('/api/admin/users/:userId', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.deleteUser(parseInt(req.params.userId));
    res.json(result);
});

// ===============================
// HACER SENDSELOG DISPONIBLE GLOBALMENTE
// ===============================
global.sendSSELog = sendSSELog;

// ===============================
// INICIAR SERVIDOR WEB
// ===============================
app.listen(PORT, () => {
    console.log('🔐 ===============================');
    console.log('🔐 TIGRIZIO WEB SERVER - AUTENTICADO');
    console.log('🔐 ===============================');
    console.log(`🚀 Servidor web en puerto ${PORT}`);
    console.log(`🌐 Login: http://localhost:${PORT}/login`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`📡 Logs SSE: http://localhost:${PORT}/api/logs`);
    console.log('🔐 ===============================');
    
    sendSSELog('SYSTEM', 'Servidor web con autenticación iniciado', 'success');
});

// ===============================
// MANEJO DE ERRORES
// ===============================
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});