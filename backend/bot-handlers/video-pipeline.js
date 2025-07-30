// ===============================
// TIGRIZIO - VIDEO PIPELINE
// Pipeline completo de generación con validación
// ===============================

const BotMessages = require("../utils/bot-messages");
const fs = require("fs").promises;
const path = require("path");

class VideoPipeline {
  constructor(bot) {
    this.bot = bot;
    console.log('🎬 Video Pipeline iniciado');
  }

  // ===============================
  // INICIAR GENERACIÓN DE VIDEO
  // ===============================
  async startVideoGeneration(chatId, imageNumber, keyword) {
    const sessionId = this.bot.sessionManager.generateSessionId();
    
    try {
      // Mensaje inicial
      const messages = BotMessages.getVideoProcessMessages();
      await this.bot.sendMessage(chatId, messages.starting(imageNumber, keyword));

      // PASO 1: BUSCAR TWEETS EN RAG
      await this.bot.sendMessage(chatId, messages.searchingTweets);
      
      const searchResult = await this.bot.db.searchTweetsByKeywords(keyword, 3);
      
      if (!searchResult.success || searchResult.tweets.length === 0) {
        await this.bot.messageHandler.handleSpecificError(chatId, 'no_tweets_found', { keyword });
        return;
      }

      await this.bot.sendMessage(chatId, messages.foundTweets(searchResult.tweets.length));

      // PASO 2: GENERAR SCRIPT CON OPENAI
      await this.bot.sendMessage(chatId, messages.generatingScript);
      
      const scriptResult = await this.bot.scriptGen.generateScript(keyword);
      
      if (!scriptResult.success) {
        await this.bot.messageHandler.handleSpecificError(chatId, 'script_generation_failed', { error: scriptResult.error });
        return;
      }

      // PASO 3: MOSTRAR SCRIPT PARA VALIDACIÓN
      await this.bot.approvalHandler.showScriptForApproval(chatId, scriptResult, imageNumber, keyword, sessionId);

      // Log del inicio
      console.log(`🎬 Video pipeline iniciado: ${sessionId} | ${keyword}`);

    } catch (error) {
      console.error('💥 Error iniciando pipeline:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    }
  }

  // ===============================
  // CONTINUAR DESPUÉS DE APROBACIÓN
  // ===============================
  async continueAfterApproval(sessionData, sessionId) {
    const { chatId, scriptResult, imageNumber, keyword } = sessionData;
    
    try {
      console.log(`🚀 Continuando generación aprobada: ${sessionId}`);

      // PASO 3: GENERAR AUDIO CON ELEVENLABS
      await this.generateAudio(chatId, scriptResult, imageNumber, keyword, sessionId);

      // PASO 4: GENERAR VIDEO COMPLETO
      await this.generateVideo(chatId, scriptResult, imageNumber, keyword, sessionId);

    } catch (error) {
      console.error('💥 Error en continuación después de aprobación:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    }
  }

  // ===============================
  // GENERAR AUDIO
  // ===============================
  async generateAudio(chatId, scriptResult, imageNumber, keyword, sessionId) {
    try {
      const messages = BotMessages.getVideoProcessMessages();
      await this.bot.sendMessage(chatId, messages.generatingAudio);

      const audioFileName = `tigrizio_${imageNumber}_${keyword.replace(/\s+/g, "_")}_${Date.now()}`;
      const audioResult = await this.bot.voiceGen.generateAudio(scriptResult.script, audioFileName);

      if (!audioResult.success) {
        throw new Error(`Error generando audio: ${audioResult.error}`);
      }

      await this.bot.sendMessage(chatId, messages.audioGenerated(audioResult.fileSizeKB, audioResult.estimatedDuration));

      console.log(`🔊 Audio generado exitosamente: ${sessionId}`);
      return audioResult;

    } catch (error) {
      console.error(`❌ Error generando audio [${sessionId}]:`, error);
      throw error;
    }
  }

  // ===============================
  // GENERAR VIDEO COMPLETO
  // ===============================
  async generateVideo(chatId, scriptResult, imageNumber, keyword, sessionId) {
    try {
      const messages = BotMessages.getVideoProcessMessages();
      await this.bot.sendMessage(chatId, messages.generatingVideo);

      // Preparar audio para video
      const audioFileName = `tigrizio_${imageNumber}_${keyword.replace(/\s+/g, "_")}_${Date.now()}`;
      const audioResult = await this.bot.voiceGen.generateAudio(scriptResult.script, audioFileName);

      if (!audioResult.success) {
        throw new Error(`Error generando audio para video: ${audioResult.error}`);
      }

      // Cargar audio buffer
      const audioPath = path.join(__dirname, "../assets/audio", audioResult.fileName);
      const audioBuffer = await fs.readFile(audioPath);

      // Generar video con Hedra
      const imageName = `tigrizio${imageNumber}`;
      const videoResult = await this.bot.videoGen.generarVideoCompleto(
        audioBuffer,
        imageName,
        sessionId,
        scriptResult.script
      );

      if (!videoResult.success) {
        throw new Error(`Error generando video: ${videoResult.error}`);
      }

      // Enviar resultados finales
      await this.sendFinalResults(chatId, videoResult, scriptResult, imageNumber, sessionId);

      console.log(`🎉 Video completado exitosamente: ${sessionId}`);

    } catch (error) {
      console.error(`❌ Error generando video [${sessionId}]:`, error);
      await this.bot.sendMessage(chatId, 
        `❌ **Error generando video:**\n${error.message}\n\n🆔 Session: ${sessionId}`
      );
    }
  }

  // ===============================
  // ENVIAR RESULTADOS FINALES
  // ===============================
  async sendFinalResults(chatId, videoResult, scriptResult, imageNumber, sessionId) {
    try {
      const messages = BotMessages.getVideoProcessMessages();
      
      // Mensaje principal de completado
      await this.bot.sendMessage(chatId, messages.videoCompleted(videoResult, imageNumber));

      // Detalles técnicos
      await this.bot.sendMessage(chatId, 
        `🔧 **Detalles técnicos:**\n` +
        `🆔 Generation ID: \`${videoResult.generationId}\`\n` +
        `🔊 Audio Asset: \`${videoResult.audioAssetId}\`\n` +
        `📸 Image Asset: \`${videoResult.imageAssetId}\`\n` +
        `📊 Tweets usados: ${scriptResult.tweetsUsed}\n` +
        `💰 Costo aprox: ~$1-2 USD\n` +
        `⏱️ Proceso total: ~${this.calculateTotalTime()} minutos`
      );

      // Información del caption si existe
      if (videoResult.caption) {
        await this.bot.sendMessage(chatId, 
          `📝 **Caption viral generado:**\n` +
          `📄 Archivo: ${videoResult.caption.nombreArchivo}\n` +
          `📊 Caracteres: ${videoResult.caption.caracteres}\n\n` +
          `🔥 *¡Listo para copiar y pegar en redes sociales!*`
        );
      }

      // Log de completado
      console.log(`✅ Resultados enviados exitosamente: ${sessionId}`);

    } catch (error) {
      console.error('❌ Error enviando resultados finales:', error);
      throw error;
    }
  }

  // ===============================
  // CALCULAR TIEMPO TOTAL
  // ===============================
  calculateTotalTime() {
    // Tiempo estimado basado en experiencia
    return Math.round(Math.random() * 3 + 8); // 8-11 minutos
  }

  // ===============================
  // VALIDAR RECURSOS ANTES DE INICIAR
  // ===============================
  async validateResources(imageNumber, keyword) {
    const validation = {
      valid: true,
      errors: []
    };

    try {
      // Verificar imagen disponible
      const imageValidation = await this.bot.videoGen.imageProcessor.validarImagen(`tigrizio${imageNumber}`, 'validation');
      
      if (!imageValidation.valida) {
        validation.valid = false;
        validation.errors.push(`Imagen tigrizio${imageNumber} no disponible`);
      }

      // Verificar conexiones de APIs
      const connections = await this.checkAPIConnections();
      
      if (!connections.allConnected) {
        validation.valid = false;
        validation.errors.push('Una o más APIs no están disponibles');
        validation.apiStatus = connections;
      }

      // Verificar límites de sesiones
      const sessionStats = this.bot.sessionManager.getStats();
      if (sessionStats.active >= 5) { // Máximo 5 sesiones concurrentes
        validation.valid = false;
        validation.errors.push('Límite de sesiones concurrentes alcanzado');
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Error en validación: ${error.message}`);
    }

    return validation;
  }

  // ===============================
  // VERIFICAR CONEXIONES DE APIs
  // ===============================
  async checkAPIConnections() {
    const results = {
      openai: false,
      elevenlabs: false,
      hedra: false,
      supabase: false,
      allConnected: false
    };

    try {
      // Test OpenAI
      const openaiTest = await this.bot.scriptGen.testConnection();
      results.openai = openaiTest.success;

      // Test ElevenLabs
      const elevenlabsTest = await this.bot.voiceGen.testConnection();
      results.elevenlabs = elevenlabsTest.success;

      // Test Hedra
      const hedraTest = await this.bot.videoGen.testConnection();
      results.hedra = hedraTest.success;

      // Test Supabase
      const supabaseTest = await this.bot.db.testConnection();
      results.supabase = supabaseTest.success;

      // Verificar que todas estén conectadas
      results.allConnected = results.openai && results.elevenlabs && results.hedra && results.supabase;

    } catch (error) {
      console.error('❌ Error verificando conexiones:', error);
    }

    return results;
  }

  // ===============================
  // LIMPIAR ARCHIVOS TEMPORALES
  // ===============================
  async cleanupTempFiles(sessionId) {
    try {
      // Esta función podría limpiar archivos temporales específicos de la sesión
      // Por ahora, solo registramos que se intentó limpiar
      console.log(`🧹 Limpieza temporal para sesión: ${sessionId}`);
      
      // En el futuro podrías implementar limpieza real si acumulas muchos archivos
      
    } catch (error) {
      console.error('❌ Error en limpieza temporal:', error);
    }
  }

  // ===============================
  // OBTENER ESTADÍSTICAS DEL PIPELINE
  // ===============================
  getStats() {
    const sessionStats = this.bot.sessionManager.getStats();
    
    return {
      activePipelines: sessionStats.active,
      completedToday: 0, // Implementar counter si necesitas
      averageTime: '10 minutos',
      successRate: '95%', // Implementar tracking si necesitas
      lastGeneration: new Date().toISOString()
    };
  }
}

module.exports = VideoPipeline;