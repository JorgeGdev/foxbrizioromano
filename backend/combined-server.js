// ===============================
// TIGRIZIO - SERVIDOR COMBINADO COMPLETO PARA RAILWAY
// Web + Bot en un solo proceso - Deploy desde GitHub
// ===============================

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;

// Importar módulos
const AuthManager = require('./auth-manager');
const SupabaseManager = require('./supabase-manager');
const TigrizioScriptGenerator = require('./script-generator');
const TigrizioVoiceGenerator = require('./voice-generator');
const TigrizioVideoGenerator = require('./video-generator');

// Solo importar bot si las variables están disponibles
let TigrizioBot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
        TigrizioBot = require('./telegram-bot');
    } catch (error) {
        console.log('⚠️ Bot no disponible, solo modo web');
    }
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales
let tigrizioBot = null;
let activeSessions = new Map();

// Inicializar módulos
const auth = new AuthManager();
const db = new SupabaseManager();
const scriptGen = new TigrizioScriptGenerator();
const voiceGen = new TigrizioVoiceGenerator();
const videoGen = new TigrizioVideoGenerator();

// ===============================
// SSE PARA LOGS EN TIEMPO REAL
// ===============================
let sseClients = [];

function sendSSELog(category, message, type = 'info') {
    const logData = {
        category,
        message,
        type,
        timestamp: new Date().toISOString()
    };
    
    // Enviar a clientes SSE
    sseClients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(logData)}\n\n`);
        } catch (error) {
            // Cliente desconectado
        }
    });
    
    console.log(`📡 [${category}] ${message}`);
}

// Hacer disponible globalmente
global.sendSSELog = sendSSELog;

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Headers de seguridad para Railway
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ===============================
// RUTAS PÚBLICAS
// ===============================

// Health check para Railway
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            web: 'running',
            bot: tigrizioBot ? 'running' : 'stopped',
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

// Ruta principal
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
            res.cookie('authToken', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
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
// RUTAS PROTEGIDAS
// ===============================

// Dashboard principal
app.get('/dashboard', auth.requireAuth.bind(auth), (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Nueva ruta para access denied
app.get('/access-denied', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/access-denied.html'));
});

// Admin panel
// Admin panel - FIXED
// Admin panel - SOLUCIÓN DEFINITIVA
app.get('/admin', auth.requireAuth.bind(auth), (req, res) => {
    if (req.user.role !== 'admin') {
        // Redirect en lugar de sendFile (más confiable)
        return res.redirect('/access-denied');
    }
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});




// SSE endpoint para logs
app.get('/api/logs', auth.requireAuth.bind(auth), (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    res.write(`data: ${JSON.stringify({
        category: 'SYSTEM',
        message: `Bienvenido ${req.user.username} - Logs en tiempo real activados`,
        type: 'success',
        timestamp: new Date().toISOString()
    })}\n\n`);
    
    sseClients.push(res);
    console.log(`🔌 Cliente SSE conectado: ${req.user.username}`);
    
    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
        console.log(`🔌 Cliente SSE desconectado: ${req.user.username}`);
    });
});

// ===============================
// API ENDPOINTS PRINCIPALES
// ===============================

app.get('/api/health', auth.requireAuth.bind(auth), (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tigrizio funcionando correctamente',
        timestamp: new Date().toISOString(),
        mode: 'combined-server',
        user: req.user.username,
        bot_status: tigrizioBot ? 'running' : 'stopped'
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
                    activeUsers: userStats.active,
                    botStatus: tigrizioBot ? 'running' : 'stopped'
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

// ===============================
// PIPELINE DE GENERACIÓN DE VIDEO COMPLETO
// ===============================

app.post('/api/generate-video', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { presenter, keyword } = req.body;
        
        sendSSELog('GENERATOR', `${req.user.username} iniciando: Tigrizio${presenter}@${keyword}`, 'info');
        
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
        
        const scriptResult = await scriptGen.generateScript(keyword);
        
        if (!scriptResult.success) {
            sendSSELog('ERROR', `Error generando script: ${scriptResult.error}`, 'error');
            return res.status(500).json({
                success: false,
                error: `Error generando script: ${scriptResult.error}`
            });
        }
        
        sendSSELog('STEP-2', `Script generado (${scriptResult.wordCount} palabras)`, 'success');
        
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

// ===============================
// RUTAS DE APROBACIÓN COMPLETAS
// ===============================

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
        
        // Verificar permisos
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
        
        sendSSELog('APPROVAL', `${req.user.username} rechazó script - Regenerando`, 'warning');
        
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
        sessionData.timestamp = Date.now();
        activeSessions.set(sessionId, sessionData);
        
        sendSSELog('REGENERATION', 'Nuevo script generado', 'success');
        
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
        sendSSELog('ERROR', `Error en rechazo: ${error.message}`, 'error');
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
        sendSSELog('APPROVAL', `${req.user.username} canceló generación`, 'info');
        
        res.json({
            success: true,
            message: 'Generación cancelada - No se gastaron tokens'
        });
        
    } catch (error) {
        console.error('❌ Error en /api/cancel:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// FUNCIÓN DE GENERACIÓN COMPLETA CON LOGS SSE
// ===============================
async function generateVideoComplete(sessionData, sessionId) {
    const { presenter, keyword, scriptResult, username } = sessionData;
    
    try {
        sendSSELog('PIPELINE', `${username} - Iniciando pipeline de generación REAL...`, 'info');
        
        // PASO 3: Generar audio con ElevenLabs
        sendSSELog('ELEVENLABS', 'Conectando con ElevenLabs API...', 'info');
        sendSSELog('STEP-3', 'Generando audio con voz italiana...', 'info');
        
        const audioFileName = `tigrizio_${presenter}_${keyword.replace(/\s+/g, "_")}_${Date.now()}`;
        const audioResult = await voiceGen.generateAudio(scriptResult.script, audioFileName);
        
        if (!audioResult.success) {
            throw new Error(`Error generando audio: ${audioResult.error}`);
        }
        
        sendSSELog('STEP-3', `Audio generado: ${audioResult.fileSizeKB} KB, ~${audioResult.estimatedDuration}s`, 'success');
        
        // PASO 4: Generar video con Hedra
        sendSSELog('HEDRA', 'Conectando con Hedra AI...', 'info');
        sendSSELog('STEP-4', 'Procesando imagen y audio para Hedra...', 'info');
        
        // Cargar audio buffer
        const audioPath = path.join(__dirname, '../assets/audio', audioResult.fileName);
        const audioBuffer = await fs.readFile(audioPath);
        
        sendSSELog('STEP-4', 'Assets preparados, enviando a Hedra...', 'info');
        sendSSELog('HEDRA', 'Video en procesamiento (8-10 minutos)...', 'warning');
        
        // Llamada REAL a Hedra
        const videoResult = await videoGen.generarVideoCompleto(audioBuffer, `tigrizio${presenter}`, sessionId, scriptResult.script);
        
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
// RUTAS DE ADMINISTRACIÓN
// ===============================

app.get('/api/admin/users', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), (req, res) => {
    const users = auth.getUsers();
    res.json({ success: true, users });
});

app.post('/api/admin/users', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.createUser(req.body);
    if (result.success) {
        sendSSELog('ADMIN', `Usuario ${req.body.username} creado por ${req.user.username}`, 'success');
    }
    res.json(result);
});

app.put('/api/admin/users/:userId', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.updateUser(parseInt(req.params.userId), req.body);
    if (result.success) {
        sendSSELog('ADMIN', `Usuario actualizado por ${req.user.username}`, 'success');
    }
    res.json(result);
});

app.delete('/api/admin/users/:userId', auth.requireAuth.bind(auth), auth.requireAdmin.bind(auth), async (req, res) => {
    const result = await auth.deleteUser(parseInt(req.params.userId));
    if (result.success) {
        sendSSELog('ADMIN', `Usuario eliminado por ${req.user.username}`, 'success');
    }
    res.json(result);
});

// ===============================
// INICIALIZAR BOT DE TELEGRAM (OPCIONAL)
// ===============================
async function initializeBot() {
    if (!TigrizioBot) {
        console.log('🤖 Bot de Telegram no disponible (variables faltantes)');
        sendSSELog('SYSTEM', 'Modo solo web - Bot de Telegram deshabilitado', 'warning');
        return false;
    }
    
    try {
        console.log('🤖 Inicializando Bot de Telegram...');
        tigrizioBot = new TigrizioBot();
        tigrizioBot.start();
        sendSSELog('SYSTEM', 'Bot de Telegram iniciado correctamente', 'success');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando bot:', error);
        sendSSELog('ERROR', `Error iniciando bot: ${error.message}`, 'error');
        return false;
    }
}

// ===============================
// INICIAR SERVIDOR COMBINADO
// ===============================
app.listen(PORT, async () => {
    console.log('🐅 ===============================');
    console.log('🐅 TIGRIZIO - SERVIDOR COMBINADO');
    console.log('🐅 RAILWAY DEPLOYMENT READY');
    console.log('🐅 ===============================');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 SSE: Activado para logs en tiempo real`);
    console.log('🐅 ===============================');
    
    // Intentar inicializar bot (opcional)
    const botStarted = await initializeBot();
    
    if (botStarted) {
        sendSSELog('SYSTEM', 'Servidor completo iniciado (Web + Bot)', 'success');
    } else {
        sendSSELog('SYSTEM', 'Servidor web iniciado correctamente', 'success');
    }
    
    console.log('✅ Listo para recibir requests');
});

// ===============================
// MANEJO DE ERRORES PARA RAILWAY
// ===============================
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    sendSSELog('ERROR', `Error crítico: ${error.message}`, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
    sendSSELog('ERROR', `Promesa rechazada: ${reason}`, 'error');
});

// Graceful shutdown para Railway
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor gracefully...');
    if (tigrizioBot) {
        tigrizioBot.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Railway shutdown signal recibido...');
    if (tigrizioBot) {
        tigrizioBot.stop();
    }
    process.exit(0);
});

// ===============================
// SISTEMA DE DESCARGA DE ARCHIVOS
// Agregar ANTES de: module.exports = { sendSSELog };
// ===============================

// ===============================
// LISTAR ARCHIVOS GENERADOS
// ===============================
app.get('/api/files', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const videosDir = path.join(__dirname, '../assets/videos');
        const audiosDir = path.join(__dirname, '../assets/audio');
        const captionsDir = path.join(__dirname, '../assets/captions');
        
        // Crear directorios si no existen
        await fs.mkdir(videosDir, { recursive: true });
        await fs.mkdir(audiosDir, { recursive: true });
        await fs.mkdir(captionsDir, { recursive: true });
        
        // Leer archivos
        const videos = await fs.readdir(videosDir).catch(() => []);
        const audios = await fs.readdir(audiosDir).catch(() => []);
        const captions = await fs.readdir(captionsDir).catch(() => []);
        
        // Obtener stats de archivos
        const getFileStats = async (dir, files) => {
            const fileStats = [];
            for (const file of files) {
                try {
                    const filePath = path.join(dir, file);
                    const stats = await fs.stat(filePath);
                    fileStats.push({
                        name: file,
                        size: Math.round(stats.size / (1024 * 1024) * 100) / 100, // MB
                        created: stats.birthtime,
                        type: path.extname(file).substring(1)
                    });
                } catch (error) {
                    // Skip files with errors
                }
            }
            return fileStats.sort((a, b) => new Date(b.created) - new Date(a.created));
        };
        
        const videoFiles = await getFileStats(videosDir, videos.filter(f => f.endsWith('.mp4')));
        const audioFiles = await getFileStats(audiosDir, audios.filter(f => f.endsWith('.mp3')));
        const captionFiles = await getFileStats(captionsDir, captions.filter(f => f.endsWith('.txt')));
        
        sendSSELog('FILES', `${req.user.username} listando archivos: ${videoFiles.length} videos`, 'info');
        
        res.json({
            success: true,
            files: {
                videos: videoFiles,
                audios: audioFiles,
                captions: captionFiles
            },
            totalVideos: videoFiles.length,
            totalAudios: audioFiles.length,
            totalCaptions: captionFiles.length
        });
        
    } catch (error) {
        console.error('❌ Error listando archivos:', error);
        sendSSELog('ERROR', `Error listando archivos: ${error.message}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// DESCARGAR VIDEO
// ===============================
app.get('/api/download/video/:filename', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Validar filename (seguridad)
        if (!filename || filename.includes('..') || !filename.endsWith('.mp4')) {
            return res.status(400).json({ success: false, error: 'Filename inválido' });
        }
        
        const videoPath = path.join(__dirname, '../assets/videos', filename);
        
        // Verificar que el archivo existe
        try {
            await fs.access(videoPath);
        } catch (error) {
            return res.status(404).json({ success: false, error: 'Video no encontrado' });
        }
        
        // Obtener stats del archivo
        const stats = await fs.stat(videoPath);
        const fileSizeMB = Math.round(stats.size / (1024 * 1024) * 100) / 100;
        
        sendSSELog('DOWNLOAD', `${req.user.username} descargando: ${filename} (${fileSizeMB}MB)`, 'success');
        
        // Headers para descarga
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        
        // Stream del archivo
        const fileStream = require('fs').createReadStream(videoPath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
            console.error('❌ Error streaming video:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Error descargando video' });
            }
        });
        
    } catch (error) {
        console.error('❌ Error descargando video:', error);
        sendSSELog('ERROR', `Error descarga: ${error.message}`, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// DESCARGAR AUDIO
// ===============================
app.get('/api/download/audio/:filename', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename || filename.includes('..') || !filename.endsWith('.mp3')) {
            return res.status(400).json({ success: false, error: 'Filename inválido' });
        }
        
        const audioPath = path.join(__dirname, '../assets/audio', filename);
        
        try {
            await fs.access(audioPath);
        } catch (error) {
            return res.status(404).json({ success: false, error: 'Audio no encontrado' });
        }
        
        const stats = await fs.stat(audioPath);
        
        sendSSELog('DOWNLOAD', `${req.user.username} descargando audio: ${filename}`, 'info');
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        
        const fileStream = require('fs').createReadStream(audioPath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('❌ Error descargando audio:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// DESCARGAR CAPTION
// ===============================
app.get('/api/download/caption/:filename', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename || filename.includes('..') || !filename.endsWith('.txt')) {
            return res.status(400).json({ success: false, error: 'Filename inválido' });
        }
        
        const captionPath = path.join(__dirname, '../assets/captions', filename);
        
        try {
            await fs.access(captionPath);
        } catch (error) {
            return res.status(404).json({ success: false, error: 'Caption no encontrado' });
        }
        
        sendSSELog('DOWNLOAD', `${req.user.username} descargando caption: ${filename}`, 'info');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = require('fs').createReadStream(captionPath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('❌ Error descargando caption:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===============================
// ELIMINAR ARCHIVO (SOLO ADMIN)
// ===============================
app.delete('/api/files/:type/:filename', auth.requireAuth.bind(auth), async (req, res) => {
    try {
        const { type, filename } = req.params;
        
        // Solo admins pueden eliminar archivos
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Solo admins pueden eliminar archivos' });
        }
        
        let filePath;
        let validExtensions;
        
        switch (type) {
            case 'video':
                filePath = path.join(__dirname, '../assets/videos', filename);
                validExtensions = ['.mp4'];
                break;
            case 'audio':
                filePath = path.join(__dirname, '../assets/audio', filename);
                validExtensions = ['.mp3'];
                break;
            case 'caption':
                filePath = path.join(__dirname, '../assets/captions', filename);
                validExtensions = ['.txt'];
                break;
            default:
                return res.status(400).json({ success: false, error: 'Tipo de archivo inválido' });
        }
        
        // Validaciones de seguridad
        const ext = path.extname(filename).toLowerCase();
        if (!validExtensions.includes(ext) || filename.includes('..')) {
            return res.status(400).json({ success: false, error: 'Filename inválido' });
        }
        
        // Eliminar archivo
        await fs.unlink(filePath);
        
        sendSSELog('DELETE', `${req.user.username} eliminó: ${filename}`, 'warning');
        
        res.json({ success: true, message: 'Archivo eliminado correctamente' });
        
    } catch (error) {
        console.error('❌ Error eliminando archivo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { sendSSELog };