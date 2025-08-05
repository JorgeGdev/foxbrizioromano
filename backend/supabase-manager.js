// ===============================
// TIGRIZIO - SUPABASE MANAGER
// Maneja la conexión con la base optimizada
// ===============================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseManager {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        
        console.log('🗄️ Supabase Manager iniciado');
    }

    // ===============================
    // VERIFICAR SI TWEET YA EXISTE (evitar duplicados)
    // ===============================
    async tweetExists(tweetId) {
    try {
        // ✅ DEBUG: Log para ver qué ID se está buscando
        console.log(`🔍 Verificando duplicado: ${tweetId} (${typeof tweetId})`);
        
        if (!tweetId || tweetId === '') {
            console.log('⚠️ ID vacío o nulo, considerando como no existente');
            return false;
        }
        
        const { data, error } = await this.supabase
            .from('fabrizio_tweets')
            .select('id, tweet_id')
            .eq('tweet_id', tweetId.toString()) // Asegurar string
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
            console.error('❌ Error en tweetExists:', error.message);
            throw error;
        }

        const exists = data !== null;
        console.log(`📊 Tweet ${tweetId} existe: ${exists ? 'SÍ' : 'NO'}`);
        
        return exists;
        
    } catch (error) {
        console.error('❌ Error verificando duplicado:', error.message);
        // En caso de error, asumir que NO existe para evitar perder tweets
        return false;
    }
}

    // ===============================
    // GUARDAR TWEET CON METADATOS VIP
    // ===============================
    async saveTweet(tweetData, vipInfo = null) {
        try {
            // Verificar duplicado primero
            const exists = await this.tweetExists(tweetData.id);
            if (exists) {
                console.log(`⚠️ Tweet ${tweetData.id} ya existe, saltando...`);
                return { success: false, reason: 'duplicate', id: tweetData.id };
            }

            // Preparar datos para inserción
            const insertData = {
                tweet_id: tweetData.id,
                content: tweetData.text,
                original_content: tweetData.originalText,
                tweet_created_at: tweetData.createdAt,
                likes: tweetData.likes || 0,
                retweets: tweetData.retweets || 0,
                is_vip: vipInfo ? vipInfo.isVip : false,
                vip_keyword: vipInfo ? vipInfo.keyword : null
            };

            // Insertar en base de datos
            const { data, error } = await this.supabase
                .from('fabrizio_tweets')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log(`✅ Tweet guardado con ID: ${data.id} ${vipInfo?.isVip ? '🚨 VIP' : ''}`);
            
            return { 
                success: true, 
                data: data, 
                isVip: vipInfo?.isVip || false,
                keyword: vipInfo?.keyword || null
            };

        } catch (error) {
            console.error('❌ Error guardando tweet:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===============================
    // OBTENER TWEETS RECIENTES
    // ===============================
    async getRecentTweets(hoursBack = 24, limit = 20) {
        try {
            const { data, error } = await this.supabase
                .rpc('get_recent_tweets_enhanced', {
                    hours_back: hoursBack,
                    limit_count: limit
                });

            if (error) throw error;

            console.log(`📊 Obtenidos ${data.length} tweets recientes`);
            return { success: true, tweets: data };

        } catch (error) {
            console.error('❌ Error obteniendo tweets recientes:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===============================
    // OBTENER SOLO TWEETS VIP
    // ===============================
    async getVipTweets(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .rpc('get_vip_tweets_enhanced', {
                    limit_count: limit
                });

            if (error) throw error;

            console.log(`🚨 Obtenidos ${data.length} tweets VIP`);
            return { success: true, vipTweets: data };

        } catch (error) {
            console.error('❌ Error obteniendo tweets VIP:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===============================
    // BUSCAR TWEETS POR KEYWORDS (backup del RAG)
    // ===============================
    async searchTweetsByKeywords(keywords, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .rpc('search_tweets_by_keywords', {
                    search_keywords: keywords,
                    limit_count: limit
                });

            if (error) throw error;

            console.log(`🔍 Encontrados ${data.length} tweets para: "${keywords}"`);
            return { success: true, tweets: data };

        } catch (error) {
            console.error('❌ Error buscando por keywords:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===============================
    // OBTENER ESTADÍSTICAS GENERALES
    // ===============================
    async getStats() {
        try {
            const { data, error } = await this.supabase
                .from('fabrizio_tweets')
                .select('id, is_vip, tweet_created_at, likes, retweets');

            if (error) throw error;

            const stats = {
                total: data.length,
                vipCount: data.filter(t => t.is_vip).length,
                totalLikes: data.reduce((sum, t) => sum + (t.likes || 0), 0),
                totalRetweets: data.reduce((sum, t) => sum + (t.retweets || 0), 0),
                latestTweet: data.length > 0 ? 
                    Math.max(...data.map(t => new Date(t.tweet_created_at).getTime())) : null
            };

            console.log(`📊 Stats: ${stats.total} tweets, ${stats.vipCount} VIP`);
            return { success: true, stats };

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===============================
    // TEST DE CONEXIÓN
    // ===============================
    async testConnection() {
        try {
            // Consulta simple para probar conexión
            const { data, error, count } = await this.supabase
                .from('fabrizio_tweets')
                .select('id', { count: 'exact' })
                .limit(1);

            if (error) throw error;

            console.log('✅ Conexión a Supabase exitosa');
            console.log(`📊 Total tweets en base: ${count || 0}`);
            return { success: true, message: 'Conectado correctamente', count: count || 0 };

        } catch (error) {
            console.error('❌ Error de conexión:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = SupabaseManager;