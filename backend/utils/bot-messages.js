// ===============================
// TIGRIZIO - BOT MESSAGES
// Mensajes predefinidos y templates
// ===============================

class BotMessages {
  
  // ===============================
  // MENSAJES DE BIENVENIDA
  // ===============================
  static getWelcomeMessage() {
    return `🐅 **BIENVENIDO A TIGRIZIO BOT MODULAR**

🎬 *Generador automático de videos de fútbol*
📱 *Arquitectura escalable con validación*

**🚀 COMANDO PRINCIPAL:**
• \`tigrizio[1-9]@keyword\` - Video con aprobación previa

**📊 COMANDOS DE INFO:**
• \`/stats\` - Estadísticas del sistema
• \`/vip\` - Tweets VIP recientes
• \`/recent\` - Tweets recientes
• \`/imagenes\` - Ver presentadores disponibles

**🔄 SCRAPING:**
• \`/scrape\` - Scraping manual
• \`/auto on/off\` - Scraping automático
• \`/help\` - Ayuda completa

**💡 EJEMPLO COMPLETO:**
\`tigrizio3@Real Madrid\`

*Nuevo: Aprobarás el script antes de generar*
*Optimización de tokens garantizada*

¡Listo para crear contenido viral! 🔥⚽`;
  }

  // ===============================
  // MENSAJE DE AYUDA COMPLETA
  // ===============================
  static getHelpMessage() {
    return `📚 **GUÍA COMPLETA TIGRIZIO BOT MODULAR**

**🎬 PIPELINE CON VALIDACIÓN:**
\`tigrizio[1-9]@keyword\` - Proceso completo:
1. 🔍 Busca tweets en RAG
2. 🎭 Genera script con OpenAI
3. ⏸️ **PAUSA - Apruebes script**
4. 🔊 Crea audio con ElevenLabs
5. 🎬 Produce video con Hedra
6. 📝 Genera caption viral

**📋 EJEMPLOS:**
• \`tigrizio1@Haaland\` - Video con presentador 1
• \`tigrizio5@Barcelona fichajes\` - Más específico
• \`tigrizio9@transfer news\` - Términos generales

**⚡ VALIDACIÓN DE SCRIPTS:**
• ✅ **APROBAR** - Continúa generación
• ❌ **RECHAZAR** - Regenera script
• 🔄 **REGENERAR** - Nuevo script
• 🚫 **CANCELAR** - Aborta todo

**📊 INFORMACIÓN:**
• \`/stats\` - Estado completo + sesiones
• \`/vip\` - Tweets importantes (HERE WE GO, etc.)
• \`/recent\` - Tweets últimas 24h
• \`/imagenes\` - Ver presentadores

**🔄 SCRAPING:**
• \`/scrape\` - Traer tweets manualmente
• \`/auto on\` - Scraping cada 3h automático
• \`/auto off\` - Desactivar scraping

**⏰ TIEMPOS OPTIMIZADOS:**
• Script + Validación: ~1 minuto
• Audio: ~1-2 minutos
• Video: ~8-10 minutos
• Total: ~10-12 minutos

**💰 OPTIMIZACIÓN DE COSTOS:**
• Sin aprobación = $0 gastado
• Con aprobación = $1-2 USD
• Control total de gastos

**🏗️ ARQUITECTURA:**
• Modular y escalable
• Manejo de sesiones robusto
• Timeouts automáticos

¿Listo para crear contenido épico optimizado? 🚀`;
  }

  // ===============================
  // MENSAJE DE ERROR GENÉRICO
  // ===============================
  static getErrorMessage(error, sessionId = null) {
    let message = `💥 **Error en el sistema:**\n❌ ${error}`;
    
    if (sessionId) {
      message += `\n\n🆔 Session: ${sessionId}`;
    }
    
    message += `\n💡 Intenta nuevamente en unos minutos`;
    
    return message;
  }

  // ===============================
  // MENSAJE DE COMANDO NO RECONOCIDO
  // ===============================
  static getUnknownCommandMessage() {
    return `🤔 No entiendo ese comando.\n\n` +
           `💡 Usa: \`tigrizio[1-9]@keyword\`\n` +
           `📚 O /help para ver todos los comandos`;
  }

  // ===============================
  // MENSAJES DE VALIDACIÓN DE SCRIPT
  // ===============================
  static getScriptApprovalMessage(scriptResult, imageNumber, keyword) {
    return `📝 **SCRIPT GENERADO - REQUIERE APROBACIÓN**\n\n` +
           `🎬 **Presentador:** Tigrizio ${imageNumber}\n` +
           `🔍 **Keyword:** "${keyword}"\n` +
           `📊 **Palabras:** ${scriptResult.wordCount}\n` +
           `⏱️ **Duración estimada:** ~${scriptResult.estimatedDuration}s\n\n` +
           `📋 **SCRIPT:**\n` +
           `"${scriptResult.script}"\n\n` +
           `💰 **Costo estimado:** $1-2 USD\n` +
           `⚡ **Tiempo restante:** ~8-10 minutos\n\n` +
           `**¿Aprobar este script para generar el video?**`;
  }

  // ===============================
  // BOTONES DE APROBACIÓN
  // ===============================
  static getApprovalKeyboard(sessionId) {
    return {
      inline_keyboard: [
        [
          { text: '✅ APROBAR - Generar Video', callback_data: `approve_${sessionId}` },
          { text: '❌ RECHAZAR - Regenerar', callback_data: `reject_${sessionId}` }
        ],
        [
          { text: '🔄 REGENERAR SCRIPT', callback_data: `regenerate_${sessionId}` },
          { text: '🚫 CANCELAR TODO', callback_data: `cancel_${sessionId}` }
        ]
      ]
    };
  }

  // ===============================
  // MENSAJES DE ESTADOS DE APROBACIÓN
  // ===============================
  static getApprovalMessages() {
    return {
      approved: `✅ **SCRIPT APROBADO**\n\n` +
               `🎬 Iniciando generación de video completo...\n` +
               `⏳ Tiempo estimado: 8-10 minutos`,
      
      rejected: `❌ **SCRIPT RECHAZADO**\n\n` +
               `🎭 Regenerando script con IA...\n` +
               `⏳ Un momento por favor...`,
      
      regenerating: `🔄 **REGENERANDO SCRIPT**\n\n` +
                   `🎭 Creando nueva versión...\n` +
                   `⏳ Un momento por favor...`,
      
      cancelled: `🚫 **GENERACIÓN CANCELADA**\n\n` +
                `✅ No se generó contenido\n` +
                `💰 No se gastaron tokens\n\n` +
                `💡 Usa: \`tigrizio[1-9]@keyword\` para intentar nuevamente`
    };
  }

  // ===============================
  // MENSAJES DE PROCESO DE VIDEO
  // ===============================
  static getVideoProcessMessages() {
    return {
      starting: (imageNumber, keyword) => 
        `🐅 **TIGRIZIO ROMANO - GENERACIÓN CON VALIDACIÓN**\n\n` +
        `🎬 Presentador: Tigrizio ${imageNumber}\n` +
        `🔍 Keyword: "${keyword}"\n` +
        `⚡ Iniciando búsqueda y generación de script...\n\n` +
        `📋 *Primero aprobarás el script antes de generar video*`,
      
      searchingTweets: `🔍 **PASO 1/2:** Buscando tweets relacionados...`,
      
      foundTweets: (count) => 
        `✅ **Encontrados ${count} tweets relevantes**\n` +
        `📊 Procediendo a generar script...`,
      
      generatingScript: `🎭 **PASO 2/2:** Generando script épico con IA...`,
      
      generatingAudio: `🔊 **PASO 3/5:** Creando audio con voz napolitana...`,
      
      audioGenerated: (fileSizeKB, estimatedDuration) =>
        `✅ **Audio generado:** ${fileSizeKB} KB\n` +
        `🎵 Duración: ~${estimatedDuration}s\n\n` +
        `🎬 Procediendo a crear video...`,
      
      generatingVideo: `🎬 **PASO 4/5:** Generando video con Hedra AI...\n\n` +
                      `⚠️ *Este paso puede tomar 8-10 minutos*\n` +
                      `📱 Recibirás notificaciones del progreso`,
      
      videoCompleted: (videoResult, imageNumber) =>
        `🎉 **¡VIDEO ÉPICO COMPLETADO!**\n\n` +
        `🎬 **Archivo:** ${videoResult.nombreArchivo}\n` +
        `📊 **Tamaño:** ${videoResult.tamaño}\n` +
        `⏱️ **Proceso:** ${videoResult.duracionProceso}\n` +
        `🎭 **Presentador:** Tigrizio ${imageNumber}\n\n` +
        `🔗 **Archivos creados:**\n` +
        `📹 Video: assets/videos/\n` +
        `📝 Caption: assets/captions/\n` +
        `🔊 Audio: assets/audio/\n\n` +
        `🚀 **¡Listo para redes sociales!**`
    };
  }

  // ===============================
  // MENSAJES DE SCRAPING
  // ===============================
  static getScrapingMessages() {
    return {
      starting: `🔍 Iniciando scraping manual...`,
      
      completed: (tweetsCount, savedCount, vipCount, summary) =>
        `✅ **SCRAPING COMPLETADO**\n\n` +
        `📊 **Resultados:**\n` +
        `• Tweets obtenidos: **${tweetsCount}**\n` +
        `• Tweets nuevos guardados: **${savedCount}**\n` +
        `• Tweets VIP detectados: **${vipCount}**\n\n` +
        `${summary}`,
      
      noTweets: (summary) => summary,
      
      error: (error) => `❌ Error en scraping: ${error}`
    };
  }

  // ===============================
  // MENSAJES DE AUTORIZACIÓN
  // ===============================
  static getAuthMessages() {
    return {
      unauthorized: `❌ No autorizado para usar este bot.`,
      sessionExpired: `❌ Sesión expirada o no encontrada`,
      unknownAction: `❌ Acción no reconocida`,
      processingError: `❌ Error procesando respuesta`
    };
  }

  // ===============================
  // CALLBACKS DE RESPUESTA
  // ===============================
  static getCallbackResponses() {
    return {
      approved: `✅ Script aprobado - Iniciando generación`,
      rejected: `❌ Script rechazado - Regenerando`,
      regenerating: `🔄 Regenerando script...`,
      cancelled: `🚫 Generación cancelada`
    };
  }
}

module.exports = BotMessages;