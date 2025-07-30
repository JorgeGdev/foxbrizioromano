// ===============================
// TIGRIZIO - MESSAGE HANDLER
// Manejo de mensajes principales (tigrizio[1-9]@keyword)
// ===============================

const BotMessages = require("../utils/bot-messages");

class MessageHandler {
  constructor(bot) {
    this.bot = bot;
    console.log('💬 Message Handler iniciado');
  }

  // ===============================
  // CONFIGURAR MANEJO DE MENSAJES
  // ===============================
  setupMessageHandler() {
    this.bot.bot.on("message", async (msg) => {
      // Ignorar comandos (ya manejados por CommandHandler)
      if (msg.text && msg.text.startsWith("/")) return;

      // Verificar autorización
      if (!this.isAuthorized(msg.chat.id)) {
        await this.bot.sendMessage(msg.chat.id, BotMessages.getAuthMessages().unauthorized);
        return;
      }

      // Procesar mensaje
      await this.processMessage(msg);
    });

    console.log('✅ Message Handler configurado');
  }

  // ===============================
  // VERIFICAR AUTORIZACIÓN
  // ===============================
  isAuthorized(chatId) {
    return chatId.toString() === this.bot.chatId;
  }

  // ===============================
  // PROCESAR MENSAJE PRINCIPAL
  // ===============================
  async processMessage(msg) {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text) return;

      // Detectar formato: tigrizio[1-9]@keyword
      const tigrizioMatch = text.match(/^tigrizio([1-9])@(.+)$/i);

      if (tigrizioMatch) {
        const imageNumber = tigrizioMatch[1];
        const keyword = tigrizioMatch[2].trim();

        // Validar entrada
        const validation = this.validateInput(imageNumber, keyword);
        if (!validation.valid) {
          await this.bot.sendMessage(chatId, validation.message);
          return;
        }

        // Iniciar proceso de generación con validación
        await this.bot.videoPipeline.startVideoGeneration(chatId, imageNumber, keyword);
      } else {
        // Mensaje no reconocido
        await this.bot.sendMessage(chatId, BotMessages.getUnknownCommandMessage());
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      await this.bot.sendMessage(msg.chat.id, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // VALIDAR ENTRADA
  // ===============================
  validateInput(imageNumber, keyword) {
    // Validar número de imagen
    const imgNum = parseInt(imageNumber);
    if (imgNum < 1 || imgNum > 9) {
      return {
        valid: false,
        message: `❌ **Número de presentador inválido**\n\n` +
                `💡 Usa números del 1 al 9: \`tigrizio[1-9]@keyword\`\n` +
                `📸 Ejemplo: \`tigrizio3@Real Madrid\``
      };
    }

    // Validar keyword
    if (!keyword || keyword.length < 2) {
      return {
        valid: false,
        message: `❌ **Keyword muy corta**\n\n` +
                `💡 Usa al menos 2 caracteres\n` +
                `📝 Ejemplos válidos:\n` +
                `• \`tigrizio${imageNumber}@Haaland\`\n` +
                `• \`tigrizio${imageNumber}@Real Madrid\`\n` +
                `• \`tigrizio${imageNumber}@transfer news\``
      };
    }

    // Validar longitud de keyword
    if (keyword.length > 50) {
      return {
        valid: false,
        message: `❌ **Keyword muy larga**\n\n` +
                `💡 Máximo 50 caracteres\n` +
                `📝 Usa términos más específicos como:\n` +
                `• Nombres de jugadores\n` +
                `• Nombres de clubes\n` +
                `• Términos cortos como "fichajes"`
      };
    }

    // Verificar caracteres válidos
    const validPattern = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validPattern.test(keyword)) {
      return {
        valid: false,
        message: `❌ **Caracteres no válidos en keyword**\n\n` +
                `💡 Solo se permiten:\n` +
                `• Letras y números\n` +
                `• Espacios\n` +
                `• Guiones (-) y puntos (.)\n\n` +
                `📝 Ejemplo válido: \`tigrizio${imageNumber}@Real-Madrid\``
      };
    }

    return { valid: true };
  }

  // ===============================
  // GENERAR SUGERENCIAS
  // ===============================
  async generateSuggestions(chatId) {
    try {
      // Obtener tweets VIP recientes para sugerencias
      const vipResult = await this.bot.db.getVipTweets(3);
      
      let message = `💡 **SUGERENCIAS BASADAS EN TWEETS VIP:**\n\n`;
      
      if (vipResult.success && vipResult.vipTweets.length > 0) {
        vipResult.vipTweets.forEach((tweet, index) => {
          // Extraer palabras clave del tweet
          const keywords = this.extractKeywords(tweet.content);
          const suggestion = keywords.length > 0 ? keywords[0] : 'transfer news';
          
          message += `${index + 1}. \`tigrizio${index + 1}@${suggestion}\`\n`;
          message += `   📰 ${tweet.content.substring(0, 60)}...\n\n`;
        });
      } else {
        message += `🔍 **Ejemplos generales:**\n`;
        message += `• \`tigrizio1@Haaland\`\n`;
        message += `• \`tigrizio2@Real Madrid\`\n`;
        message += `• \`tigrizio3@transfer news\`\n`;
        message += `• \`tigrizio4@here we go\`\n`;
        message += `• \`tigrizio5@Barcelona\`\n\n`;
      }
      
      message += `🎬 **¡Elige uno y empieza a crear!**`;
      
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('❌ Error generando sugerencias:', error);
    }
  }

  // ===============================
  // EXTRAER PALABRAS CLAVE
  // ===============================
  extractKeywords(text) {
    // Palabras clave comunes en fútbol
    const footballKeywords = [
      'real madrid', 'barcelona', 'manchester united', 'manchester city',
      'liverpool', 'arsenal', 'chelsea', 'tottenham', 'bayern munich',
      'psg', 'juventus', 'ac milan', 'inter milan', 'atletico madrid',
      'haaland', 'messi', 'ronaldo', 'mbappe', 'neymar', 'benzema',
      'lewandowski', 'salah', 'kane', 'transfer', 'fichaje', 'here we go',
      'official', 'confirmed', 'exclusive', 'breaking'
    ];

    const textLower = text.toLowerCase();
    const foundKeywords = [];

    for (const keyword of footballKeywords) {
      if (textLower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }

    return foundKeywords;
  }

  // ===============================
  // MANEJO DE ERRORES ESPECÍFICOS
  // ===============================
  async handleSpecificError(chatId, errorType, details = {}) {
    let message = '';

    switch (errorType) {
      case 'no_tweets_found':
        message = `❌ **No se encontraron tweets para "${details.keyword}"**\n\n` +
                 `💡 **Sugerencias:**\n` +
                 `• Usa términos más generales: \`transfer\`, \`fichajes\`\n` +
                 `• Nombres de clubes: \`Real Madrid\`, \`Barcelona\`\n` +
                 `• Nombres de jugadores: \`Haaland\`, \`Mbappe\`\n` +
                 `• Términos VIP: \`here we go\`, \`official\`\n\n` +
                 `🔄 O usa \`/vip\` para ver noticias importantes`;
        break;

      case 'script_generation_failed':
        message = `❌ **Error generando script**\n\n` +
                 `🔍 Encontramos tweets pero la IA falló\n` +
                 `💡 Intenta con términos diferentes o espera un momento\n\n` +
                 `🔄 Puedes intentar nuevamente con el mismo comando`;
        break;

      case 'session_limit_reached':
        message = `⚠️ **Límite de sesiones alcanzado**\n\n` +
                 `📋 Tienes demasiadas sesiones pendientes\n` +
                 `💡 Espera a que se completen o expiren\n\n` +
                 `👀 Usa \`/sessions\` para ver sesiones activas`;
        break;

      default:
        message = BotMessages.getErrorMessage(details.error || 'Error desconocido');
    }

    await this.bot.sendMessage(chatId, message);
  }

  // ===============================
  // ESTADÍSTICAS DE USO
  // ===============================
  logUsage(imageNumber, keyword, success = true) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      imageNumber,
      keyword,
      success,
      type: 'video_generation_request'
    };

    console.log(`📊 Uso registrado:`, logData);
    
    // Aquí podrías agregar logging a base de datos si necesitas métricas
  }
}

module.exports = MessageHandler;