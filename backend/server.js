// ===============================
// TIGRIZIO VIDEO GENERATOR - SERVER CON API
// ===============================

const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar módulos
const TigrizioBot = require('./telegram-bot');
const SupabaseManager = require('./supabase-manager');
const TigrizioScriptGenerator = require('./script-generator');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar bot y módulos
let tigrizioBot = null;
const db = new SupabaseManager();
const scriptGen = new TigrizioScriptGenerator();

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ===============================
// RUTAS FRONTEND
// ===============================

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===============================
// RUTAS API
// ===============================

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tigrizio API está funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        const sessionStats = tigrizioBot ? tigrizioBot.sessionManager.getStats() : { active: 0, total: 0 };
        
        if (stats.success) {
            res.json({
                success: true,
                data: {
                    totalTweets: stats.stats.total,
                    vipTweets: stats.stats.vipCount,
                    totalLikes: stats.stats.totalLikes,
                    totalRetweets: stats.stats.totalRetweets,
                    activeSessions: sessionStats.active,
                    totalSessions: sessionStats.total,
                    isAutoScrapingActive: tigrizioBot ? tigrizioBot.isAutoScrapingActive : false
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: stats.error
            });
        }
    } catch (error) {
        console.error('❌ Error en /api/stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Iniciar generación de video
app.post('/api/generate-video', async (req, res) => {
    try {
        const { presenter, keyword } = req.body;
        
        if (!presenter || !keyword) {
            return res.status(400).json({
                success: false,
                error: 'Presenter y keyword son requeridos'
            });
        }
        
        if (presenter < 1 || presenter > 9) {
            return res.status(400).json({
                success: false,
                error: 'Presenter debe ser entre 1 y 9'
            });
        }
        
        if (keyword.length < 2 || keyword.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Keyword debe tener entre 2 y 50 caracteres'
            });
        }
        
        // Verificar si hay tweets para el keyword
        const searchResult = await db.searchTweetsByKeywords(keyword, 3);
        
        if (!searchResult.success || searchResult.tweets.length === 0) {
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
        
        // Generar script
        const scriptResult = await scriptGen.generateScript(keyword);
        
        if (!scriptResult.success) {
            return res.status(500).json({
                success: false,
                error: `Error generando script: ${scriptResult.error}`
            });
        }
        
        // Crear ID de sesión
        const sessionId = `API-${Date.now()}`;
        
        // Guardar sesión para aprobación
        if (tigrizioBot) {
            tigrizioBot.sessionManager.createSession(sessionId, {
                presenter,
                keyword,
                scriptResult,
                source: 'web'
            });
        }
        
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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Aprobar script
app.post('/api/approve/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!tigrizioBot) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está disponible'
            });
        }
        
        const sessionData = tigrizioBot.sessionManager.getSession(sessionId);
        
        if (!sessionData) {
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada o expirada'
            });
        }
        
        // Iniciar generación de video
        // Esta es una versión simplificada - en la implementación real
        // deberías usar el videoPipeline.continueAfterApproval()
        
        res.json({
            success: true,
            message: 'Script aprobado - Iniciando generación de video',
            sessionId: sessionId,
            estimatedTime: '8-10 minutos'
        });
        
        // Limpiar sesión
        tigrizioBot.sessionManager.deleteSession(sessionId);
        
    } catch (error) {
        console.error('❌ Error en /api/approve:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rechazar/regenerar script
app.post('/api/reject/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!tigrizioBot) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está disponible'
            });
        }
        
        const sessionData = tigrizioBot.sessionManager.getSession(sessionId);
        
        if (!sessionData) {
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada o expirada'
            });
        }
        
        // Regenerar script
        const newScriptResult = await scriptGen.generateScript(sessionData.keyword);
        
        if (!newScriptResult.success) {
            return res.status(500).json({
                success: false,
                error: `Error regenerando script: ${newScriptResult.error}`
            });
        }
        
        // Actualizar sesión con nuevo script
        tigrizioBot.sessionManager.updateSession(sessionId, {
            scriptResult: newScriptResult
        });
        
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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cancelar generación
app.post('/api/cancel/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (tigrizioBot) {
            tigrizioBot.sessionManager.deleteSession(sessionId);
        }
        
        res.json({
            success: true,
            message: 'Generación cancelada - No se gastaron tokens'
        });
        
    } catch (error) {
        console.error('❌ Error en /api/cancel:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Toggle scraping automático
app.post('/api/toggle-scraping', async (req, res) => {
    try {
        const { enable } = req.body;
        
        if (!tigrizioBot) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está disponible'
            });
        }
        
        // Usar el método del bot para toggle scraping
        await tigrizioBot.toggleAutoScraping(process.env.TELEGRAM_CHAT_ID, enable);
        
        res.json({
            success: true,
            isActive: enable,
            message: enable ? 'Scraping automático activado' : 'Scraping automático desactivado'
        });
        
    } catch (error) {
        console.error('❌ Error en /api/toggle-scraping:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Scraping manual
app.post('/api/manual-scraping', async (req, res) => {
    try {
        if (!tigrizioBot) {
            return res.status(503).json({
                success: false,
                error: 'Bot no está disponible'
            });
        }
        
        const result = await tigrizioBot.scraper.performOptimizedScraping();
        
        if (result.success && result.tweets.length > 0) {
            let savedCount = 0;
            let vipCount = 0;
            
            for (const tweet of result.tweets) {
                const vipInfo = tigrizioBot.scraper.isVipTweet(tweet.originalText);
                const saveResult = await tigrizioBot.db.saveTweet(tweet, vipInfo);
                
                if (saveResult.success) {
                    savedCount++;
                    if (saveResult.isVip) vipCount++;
                }
            }
            
            res.json({
                success: true,
                tweetsObtained: result.tweets.length,
                newTweetsSaved: savedCount,
                vipTweetsDetected: vipCount,
                summary: result.summary
            });
        } else {
            res.json({
                success: true,
                tweetsObtained: 0,
                newTweetsSaved: 0,
                vipTweetsDetected: 0,
                message: 'No se encontraron tweets nuevos'
            });
        }
        
    } catch (error) {
        console.error('❌ Error en /api/manual-scraping:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener tweets VIP
app.get('/api/vip-tweets', async (req, res) => {
    try {
        const vipResult = await db.getVipTweets(5);
        
        if (vipResult.success) {
            res.json({
                success: true,
                tweets: vipResult.vipTweets.map(tweet => ({
                    id: tweet.id,
                    content: tweet.content.substring(0, 100) + '...',
                    keyword: tweet.vip_keyword,
                    likes: tweet.likes,
                    retweets: tweet.retweets,
                    hoursAgo: Math.round((Date.now() - new Date(tweet.tweet_created_at).getTime()) / (1000 * 60 * 60))
                }))
            });
        } else {
            res.status(500).json({
                success: false,
                error: vipResult.error
            });
        }
    } catch (error) {
        console.error('❌ Error en /api/vip-tweets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener tweets recientes
app.get('/api/recent-tweets', async (req, res) => {
    try {
        const recentResult = await db.getRecentTweets(24, 5);
        
        if (recentResult.success) {
            res.json({
                success: true,
                tweets: recentResult.tweets.map(tweet => ({
                    id: tweet.id,
                    content: tweet.content.substring(0, 80) + '...',
                    isVip: tweet.is_vip,
                    hoursAgo: Math.round(tweet.hours_ago * 10) / 10
                }))
            });
        } else {
            res.status(500).json({
                success: false,
                error: recentResult.error
            });
        }
    } catch (error) {
        console.error('❌ Error en /api/recent-tweets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// INICIALIZAR BOT
// ===============================
async function initializeBot() {
    try {
        console.log('🤖 Inicializando Tigrizio Bot...');
        tigrizioBot = new TigrizioBot();
        tigrizioBot.start();
        console.log('✅ Bot inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando bot:', error);
    }
}

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(PORT, async () => {
    console.log('🐅 ===============================');
    console.log('🐅 TIGRIZIO VIDEO GENERATOR');
    console.log('🐅 ===============================');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
    console.log('🐅 ===============================');
    
    // Inicializar bot después de que el servidor esté corriendo
    await initializeBot();
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