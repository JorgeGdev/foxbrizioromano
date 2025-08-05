// ===============================
// TIGRIZIO - GENERADOR DE SCRIPTS ÉPICOS
// Versión completa y perfecta sin errores
// ===============================

const OpenAI = require('openai');
const SupabaseManager = require('./supabase-manager');
require('dotenv').config();

class TigrizioScriptGenerator {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.db = new SupabaseManager();
        
        // TU PROMPT EXACTO (PERFECTO!)
        this.tigrizioPrompt = `Eres **Tigrizio Romano**, un periodista deportivo mitad tigre, mitad napolitano, que habla español pero con un fuerte acento italiano experto en dar noticias de fútbol de forma confiable, directa y con estilo único. Tu voz es inconfundible: elegante, precisa, con frases icónicas como "¡Es ufficiale!" y otras expresiones en italiano si quedan naturales.

🎯 TU MISIÓN:
Transformar noticias reales de fútbol en **scripts hablados** de EXACTAMENTE 75 a 80 palabras, optimizados para síntesis de voz o reels. Solo puedes usar información **proveniente de la base de datos**. Si no hay información en la base, debes indicarlo con respeto. Está PROHIBIDO inventar o asumir datos.

🎙 ESTILO DE TIGRIZIO:
- Tonalidad EMOCIONADA y dramática, fuerte acento italiano como si fuera la noticia más importante del año
- Hablas con la PASIÓN de alguien que vive y respira fútbol las 24 horas
- Cada frase debe transmitir EMOCIÓN auténtica, como Fabrizio cuando anuncia un fichaje épico

📋 ESTRUCTURA OBLIGATORIA (75-80 palabras):
1. **HOOK (0-3 segundos / 15-20 palabras):**
   - palabras de alto impacto: "¡INCREÍBLE!", "¡BOMBAZO!", "¡HISTÓRICO!" etc.
   - Menciona al protagonista del fichaje o movimiento
   - Genera expectativa: traspaso, renovación, conflicto, etc.

2. **CORE (3-17 segundos / 45-55 palabras):**
   - Detalles específicos, SOLO si están en base de datos:
     - Nombre de clubes, montos, fechas, tipo de contrato (préstamo, compra), duración
     - Contexto relevant (relación con otros jugadores o clubes, impacto)
   - Usa lenguaje profesional y cronológico, directo

3. **CTA (18-20 segundos / 5 palabras):**
   - cierre claro, directo, tipo Fabrizio:
     - "Here we go"
     - "¡Es ufficiale!"
     - "Increible!"

📛 PROHIBIDO:
- ❌ Inventar datos, fichajes, contextos o montos que no estén explícitamente en la base
- ❌ Asumir cosas por lógica o intuición
- ❌ Usar noticias pasadas si no están en la base

✅ SI HAY NOTICIA EN BASE DE DATOS:
Crear script siguiendo estructura Hook + Core + CTA

🚫 SI NO HAY INFORMACIÓN EN LA BASE:
Debes responder exactamente:
"Lo siento, no tenemos noticias de [tema] en este momento. Mantente atento."

📌 REGLAS CRÍTICAS:
- CONTEO: 75-80 palabras exactas
- DURACIÓN: Menos de 20 segundos
- PRECISIÓN: Solo hechos reales de la base de datos
- FORMATO: Hook + Core + CTA (solo uno de cada uno, nunca se repite)

FORMATO DE SALIDA:
Solo el script final (texto narrado), sin explicaciones ni encabezados.`;

        console.log('🎭 Tigrizio Script Generator iniciado');
    }

    // ===============================
    // GENERAR SCRIPT ÉPICO (TU LÓGICA!)
    // ===============================
    async generateScript(keyword, threshold = 0.25, limit = 3) {
        try {
            console.log(`🔍 Generando script para: "${keyword}"`);
            
            // 1. Buscar tweets relacionados en la base RAG
            const searchResult = await this.searchRelatedTweets(keyword, threshold, limit);
            
            if (!searchResult.success) {
                return {
                    success: false,
                    error: 'Error buscando en la base de datos',
                    details: searchResult.error
                };
            }
            
            const tweets = searchResult.tweets;
            console.log(`📊 Tweets encontrados: ${tweets.length}`);
            
            // 2. Si no hay tweets, respuesta estándar
            if (tweets.length === 0) {
                return {
                    success: true,
                    script: `Lo siento, no tenemos noticias de ${keyword} en este momento. Mantente atento.`,
                    wordCount: 0,
                    tweetsUsed: 0,
                    type: 'no_results'
                };
            }
            
            // 3. Crear contexto para OpenAI (EXACTO COMO TU PYTHON)
            const context = this.buildContext(tweets);
            const userPrompt = this.buildUserPrompt(keyword, context);
            
            console.log('🧠 Enviando prompt a OpenAI...');
            
            // 4. Llamar a OpenAI con tu lógica exacta (SIN TIMEOUT!)
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: this.tigrizioPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            });
            
            const script = response.choices[0].message.content.trim(); // .trim() no .strip()
            const wordCount = script.split(/\s+/).length;
            
            console.log(`✅ Script generado: ${wordCount} palabras`);
            
            return {
                success: true,
                script: script,
                wordCount: wordCount,
                tweetsUsed: tweets.length,
                type: 'success',
                isOptimalLength: wordCount >= 75 && wordCount <= 80,
                estimatedDuration: Math.round(wordCount / 4), // ~4 palabras por segundo
                tweetsData: tweets.map(t => ({
                    id: t.id,
                    content: t.content.substring(0, 100) + '...',
                    isVip: t.is_vip
                }))
            };
            
        } catch (error) {
            console.error('💥 Error generando script:', error.message);
            return {
                success: false,
                error: 'Error interno generando script',
                details: error.message
            };
        }
    }

    // ===============================
    // BUSCAR TWEETS RELACIONADOS
    // ===============================
    async searchRelatedTweets(keyword, threshold = 0.25, limit = 3) {
        try {
            // Usar búsqueda por keywords como backup del RAG
            const result = await this.db.searchTweetsByKeywords(keyword, limit);
            
            if (result.success) {
                return {
                    success: true,
                    tweets: result.tweets
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('❌ Error buscando tweets:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // CONSTRUIR CONTEXTO (TU FORMATO EXACTO!)
    // ===============================
    buildContext(tweets) {
        let context = "INFORMACIÓN DE LA BASE DE DATOS:\n\n";
        
        tweets.forEach((tweet, index) => {
            context += `Tweet ${index + 1}:\n`;
            context += `${tweet.content}\n`;
            context += `Fecha: ${tweet.tweet_created_at || 'N/A'}\n`;
            if (tweet.is_vip) {
                context += `VIP: ${tweet.vip_keyword || 'Sí'}\n`;
            }
            context += '\n';
        });
        
        return context;
    }

    // ===============================
    // CONSTRUIR PROMPT DE USUARIO (TU FORMATO!)
    // ===============================
    buildUserPrompt(keyword, context) {
        return `Tema solicitado: ${keyword}

${context}

Basándote ÚNICAMENTE en la información de la base de datos proporcionada arriba, genera un script de Tigrizio Romano de exactamente 75-80 palabras sobre "${keyword}".`;
    }

    // ===============================
    // GENERAR MÚLTIPLES VARIACIONES
    // ===============================
    async generateMultipleScripts(keyword, variations = 3) {
        try {
            console.log(`🎭 Generando ${variations} variaciones para: "${keyword}"`);
            
            const results = [];
            
            for (let i = 0; i < variations; i++) {
                console.log(`📝 Generando variación ${i + 1}/${variations}...`);
                
                const result = await this.generateScript(keyword);
                
                if (result.success) {
                    results.push({
                        variation: i + 1,
                        script: result.script,
                        wordCount: result.wordCount,
                        isOptimal: result.isOptimalLength
                    });
                    
                    // Pequeña pausa entre llamadas
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    results.push({
                        variation: i + 1,
                        error: result.error
                    });
                }
            }
            
            return {
                success: true,
                keyword: keyword,
                variations: results,
                total: variations
            };
            
        } catch (error) {
            console.error('❌ Error generando múltiples scripts:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // VALIDAR SCRIPT (TU LÓGICA DE CALIDAD!)
    // ===============================
    validateScript(script) {
        const words = script.split(/\s+/);
        const wordCount = words.length;
        
        // Detectar estructura Hook + Core + CTA
        const hasExclamation = /[¡!]/.test(script);
        const hasQuestion = /[¿?]/.test(script);
        const hasImpactWords = /(increíble|bombazo|histórico|here we go|ufficiale|oficial)/i.test(script);
        
        return {
            wordCount: wordCount,
            isOptimalLength: wordCount >= 75 && wordCount <= 80,
            estimatedDuration: Math.round(wordCount / 4),
            hasHook: hasExclamation && hasImpactWords,
            hasCTA: hasQuestion,
            qualityScore: this.calculateQualityScore(script, wordCount, hasExclamation, hasQuestion, hasImpactWords)
        };
    }

    // ===============================
    // CALCULAR PUNTUACIÓN DE CALIDAD
    // ===============================
    calculateQualityScore(script, wordCount, hasExclamation, hasQuestion, hasImpactWords) {
        let score = 0;
        
        // Longitud óptima (40%)
        if (wordCount >= 75 && wordCount <= 80) score += 40;
        else if (wordCount >= 70 && wordCount <= 85) score += 30;
        else if (wordCount >= 65 && wordCount <= 90) score += 20;
        
        // Estructura (30%)
        if (hasExclamation) score += 15;
        if (hasQuestion) score += 15;
        
        // Impacto (30%)
        if (hasImpactWords) score += 30;
        
        return Math.min(score, 100);
    }

    // ===============================
    // TEST DE CONEXIÓN OPENAI (CORRECTO!)
    // ===============================
    async testConnection() {
        try {
            console.log('🔬 Probando conexión con OpenAI...');
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "user", content: "Responde solo: 'Tigrizio connected'" }
                ],
                max_tokens: 10
            });
            
            const result = response.choices[0].message.content;
            console.log('✅ OpenAI conectado:', result);
            
            return { success: true, message: result };
            
        } catch (error) {
            console.error('❌ Error conectando con OpenAI:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TigrizioScriptGenerator;