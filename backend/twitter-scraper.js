// ===============================
// TIGRIZIO - TWITTER SCRAPER OPTIMIZADO
// Basado en la lógica inteligente de optimización de tokens
// ===============================

const axios = require('axios');
require('dotenv').config();

class TwitterScraper {
    constructor() {
        this.apiKey = process.env.TWITTERAPI_KEY;
        this.baseUrl = 'https://api.twitterapi.io';
        
        // Headers optimizados para TwitterAPI.io
        this.headers = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
        
        // Keywords VIP para alertas inmediatas (tu idea genial!)
        this.vipKeywords = [
            'here we go', 'done deal', 'breaking', 'official',
            'confirmed', 'exclusive', 'ufficiale', 'comunicado oficial',
            'agreement', 'medical', 'signed', 'contract'
        ];
        
        // Almacenar tweets del día para resúmenes
        this.dailyTweets = [];
    }

    // ===============================
    // VERIFICAR HORARIOS ACTIVOS (TU LÓGICA!)
    // 3PM-9AM NZ (evitar cuando Fabrizio duerme)
    // ===============================
    isActiveHours() {
        const now = new Date();
        const nzTime = new Date(now.toLocaleString("en-US", {timeZone: "Pacific/Auckland"}));
        const currentHour = nzTime.getHours();
        
        // Horario activo: 3PM-9AM NZ (15:00-09:00)
        const isActive = currentHour >= 15 || currentHour < 10;
        
        console.log(`⏰ Hora NZ: ${nzTime.toLocaleTimeString()} - Activo: ${isActive ? 'SÍ' : 'NO'}`);
        return isActive;
    }

    // ===============================
    // LIMPIAR TEXTO DE TWEETS (TU OPTIMIZACIÓN!)
    // Remover URLs, menciones, hashtags para optimizar tokens
    // ===============================
    cleanTweetText(text) {
        if (!text) return "";
        
        // Remover URLs, menciones, hashtags, emojis
        let cleanText = text
            .replace(/https?:\/\/\S+/g, '')           // URLs
            .replace(/@\w+/g, '')                     // Menciones
            .replace(/#(\w+)/g, '$1')                 // Hashtags (mantener palabra)
            .replace(/[^\w\s.,!?;:\-]/g, ' ')         // Emojis y caracteres especiales
            .replace(/\s+/g, ' ')                     // Espacios múltiples
            .trim();
        
        return cleanText;
    }

    // ===============================
    // DETECTAR TWEETS VIP (TU SISTEMA DE ALERTAS!)
    // ===============================
    isVipTweet(tweetText) {
        const textLower = tweetText.toLowerCase();
        
        for (const keyword of this.vipKeywords) {
            if (textLower.includes(keyword)) {
                return { isVip: true, keyword: keyword };
            }
        }
        
        return { isVip: false, keyword: null };
    }

    // ===============================
    // PROCESAR TWEETS (MÉTODO AUXILIAR REUTILIZABLE)
    // ===============================
    processTweets(tweets) {
        if (!tweets || tweets.length === 0) {
            return [];
        }

        const processedTweets = [];
        
        for (const tweet of tweets) {
            try {
                const originalText = tweet.text || '';
                const cleanText = this.cleanTweetText(originalText);
                
                // Solo incluir tweets con contenido útil
                if (cleanText.length > 10) {
                    const tweetData = {
                        id: tweet.id?.toString() || '',
                        text: cleanText,
                        originalText: originalText,
                        createdAt: new Date(tweet.createdAt || Date.now()),
                        retweets: tweet.retweetCount || 0,
                        likes: tweet.likeCount || 0,
                        timestamp: new Date().toISOString()
                    };
                    
                    processedTweets.push(tweetData);
                }
            } catch (error) {
                console.error(`❌ Error procesando tweet individual:`, error.message);
            }
        }

        return processedTweets;
    }

    // ===============================
    // OBTENER MÚLTIPLES TWEETS CON 1 LLAMADA (TU MEGA OPTIMIZACIÓN!)
    // ===============================
    async getMultipleTweets(count = 15) {
        try {
            console.log(`🐦 Obteniendo ${count} tweets con 1 sola llamada API...`);
            
            const response = await axios.get(`${this.baseUrl}/twitter/tweet/advanced_search`, {
                headers: this.headers,
                params: {
                    query: 'from:FabrizioRomano -is:retweet',
                    queryType: 'Latest',
                    count: count
                }
            });

            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = response.data;
            
            if (!data.tweets || data.tweets.length === 0) {
                console.log('❌ No se encontraron tweets');
                return [];
            }

            console.log(`✅ ${data.tweets.length} tweets obtenidos de la API`);
            
            // Usar el método processTweets reutilizable
            return this.processTweets(data.tweets);

        } catch (error) {
            console.error('❌ Error obteniendo múltiples tweets:', error.message);
            if (error.response) {
                console.error('📊 Status:', error.response.status);
                console.error('📝 Response:', error.response.data);
            }
            return [];
        }
    }

    // ===============================
    // OBTENER TWEETS RECIENTES (PARA COMANDO /urgent)
    // ===============================
    async getRecentTweets(hours = 12) {
        try {
            console.log(`🚨 Scraping últimas ${hours} horas para comando urgente...`);
            
            // Calcular fecha límite
            const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
            console.log(`📅 Buscando tweets desde: ${sinceDate.toISOString()}`);
            
            const response = await axios.get(`${this.baseUrl}/twitter/tweet/advanced_search`, {
                headers: this.headers,
                params: {
                    query: 'from:FabrizioRomano -is:retweet',
                    queryType: 'Latest',
                    count: 50, // Más tweets para capturar todo de las últimas 12h
                    since: sinceDate.toISOString()
                }
            });

            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = response.data;
            
            if (!data.tweets || data.tweets.length === 0) {
                console.log(`❌ No se encontraron tweets en las últimas ${hours} horas`);
                return [];
            }

            console.log(`✅ ${data.tweets.length} tweets encontrados en últimas ${hours}h`);
            
            // Filtrar tweets por fecha para asegurar que están dentro del rango
            const filteredTweets = data.tweets.filter(tweet => {
                const tweetDate = new Date(tweet.createdAt);
                return tweetDate >= sinceDate;
            });

            console.log(`🔍 ${filteredTweets.length} tweets después de filtro temporal`);
            
            // Usar el método processTweets reutilizable
            return this.processTweets(filteredTweets);

        } catch (error) {
            console.error(`❌ Error en scraping de últimas ${hours}h:`, error.message);
            if (error.response) {
                console.error('📊 Status:', error.response.status);
                console.error('📝 Response:', error.response.data);
            }
            return [];
        }
    }

    // ===============================
    // GENERAR RESUMEN INTELIGENTE (TU LÓGICA!)
    // ===============================
    generateIntelligentSummary(tweets, savedCount = 0) {
        const now = new Date();
        const nzTime = new Date(now.toLocaleString("en-US", {timeZone: "Pacific/Auckland"}));
        
        if (tweets.length === 0) {
            return `🐅 TIGRIZIO SCRAPING - ${nzTime.toLocaleTimeString()} NZ\n\n📭 No se encontraron tweets nuevos de Fabrizio Romano.`;
        }

        let summary = `🐅 TIGRIZIO SCRAPING COMPLETADO - ${nzTime.toLocaleTimeString()} NZ\n\n`;
        summary += `📊 RESULTADOS:\n`;
        summary += `• 🆕 ${savedCount} tweets nuevos guardados\n`;
        summary += `• 🧠 Embeddings creados para búsqueda IA\n`;
        summary += `• 🎬 Listos para generar videos\n\n`;

        // Detectar tweets VIP
        const vipTweets = tweets.filter(tweet => this.isVipTweet(tweet.originalText).isVip);
        
        if (vipTweets.length > 0) {
            summary += `🚨 TWEETS VIP DETECTADOS (${vipTweets.length}):\n`;
            vipTweets.slice(0, 3).forEach((tweet, index) => {
                const vipInfo = this.isVipTweet(tweet.originalText);
                const shortText = tweet.text.length > 100 ? tweet.text.substring(0, 100) + '...' : tweet.text;
                summary += `${index + 1}. [${vipInfo.keyword.toUpperCase()}] ${shortText}\n`;
            });
            summary += '\n';
        }

        // Top tweets por engagement
        const topTweets = tweets
            .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets))
            .slice(0, 3);

        summary += `📰 TOP TWEETS:\n`;
        topTweets.forEach((tweet, index) => {
            const shortText = tweet.text.length > 120 ? tweet.text.substring(0, 120) + '...' : tweet.text;
            summary += `${index + 1}. ${shortText}\n`;
            summary += `   ❤️ ${tweet.likes} | 🔄 ${tweet.retweets}\n`;
        });

        summary += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
        summary += `🎬 Para generar video: tigrizio[1-9]@keyword\n`;
        summary += `⏰ Próximo scraping: En 3 horas`;

        return summary;
    }

    // ===============================
    // PROCESO COMPLETO OPTIMIZADO (TU LÓGICA COMPLETA!)
    // ===============================
    async performOptimizedScraping() {
        try {
            console.log('🐅 ===============================');
            console.log('🐅 SCRAPING OPTIMIZADO INICIADO');
            console.log('🐅 ===============================');

            // Verificar horarios activos
            if (!this.isActiveHours()) {
                const message = '⏰ Horario inactivo - Fabrizio probablemente durmiendo';
                console.log(message);
                return {
                    success: true,
                    message: message,
                    tweets: [],
                    summary: message,
                    timestamp: new Date().toISOString()
                };
            }

            // Obtener múltiples tweets con 1 llamada (TU OPTIMIZACIÓN!)
            const tweets = await this.getMultipleTweets(15);
            
            if (tweets.length === 0) {
                const message = 'No se obtuvieron tweets nuevos';
                return {
                    success: true,
                    message: message,
                    tweets: [],
                    summary: message,
                    timestamp: new Date().toISOString()
                };
            }

            // Agregar tweets al almacén diario
            this.dailyTweets.push(...tweets.map(tweet => ({
                cleanText: tweet.text,
                originalText: tweet.originalText,
                likes: tweet.likes,
                retweets: tweet.retweets,
                timestamp: new Date()
            })));

            // Generar resumen inteligente
            const summary = this.generateIntelligentSummary(tweets, tweets.length);
            
            console.log('\n📋 RESUMEN GENERADO:');
            console.log(summary);

            return {
                success: true,
                tweets: tweets,
                summary: summary,
                vipTweets: tweets.filter(tweet => this.isVipTweet(tweet.originalText).isVip),
                dailyTweets: this.dailyTweets,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error en scraping optimizado:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // ===============================
    // GENERAR ALERTA VIP (TU SISTEMA!)
    // ===============================
    generateVipAlert(tweet) {
        const vipInfo = this.isVipTweet(tweet.originalText);
        const nzTime = new Date().toLocaleString("en-US", {timeZone: "Pacific/Auckland"});
        
        return `🚨 ALERTA VIP - Fabrizio Romano\n\n` +
               `🔥 Keyword detectado: ${vipInfo.keyword.toUpperCase()}\n\n` +
               `📰 Tweet:\n${tweet.originalText.length > 200 ? tweet.originalText.substring(0, 200) + '...' : tweet.originalText}\n\n` +
               `⏰ Tiempo: ${nzTime}\n\n` +
               `🎬 Usa: tigrizio[1-9]@keyword para generar video`;
    }
}

module.exports = TwitterScraper;