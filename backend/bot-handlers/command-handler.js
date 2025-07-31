// ===============================
// TIGRIZIO - COMMAND HANDLER
// Manejo de todos los comandos del bot
// ===============================

const BotMessages = require("../utils/bot-messages");

class CommandHandler {
  constructor(bot) {
    this.bot = bot;
    console.log('⚡ Command Handler iniciado');
  }

  // ===============================
  // CONFIGURAR TODOS LOS COMANDOS
  // ===============================
  setupCommands() {
    // Comando de inicio
    this.bot.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg.chat.id);
    });

    // Comando de ayuda
    this.bot.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg.chat.id);
    });

    // Comando de estadísticas
    this.bot.bot.onText(/\/stats/, async (msg) => {
      await this.handleStats(msg.chat.id);
    });

    // Comando de scraping manual
    this.bot.bot.onText(/\/scrape/, async (msg) => {
      await this.handleScrape(msg.chat.id);
    });

    // Comando para tweets VIP
    this.bot.bot.onText(/\/vip/, async (msg) => {
      await this.handleVip(msg.chat.id);
    });

    // Comando para tweets recientes
    this.bot.bot.onText(/\/recent/, async (msg) => {
      await this.handleRecent(msg.chat.id);
    });

    // Activar/desactivar scraping automático
    this.bot.bot.onText(/\/auto (on|off)/, async (msg, match) => {
      const action = match[1];
      await this.handleAutoScraping(msg.chat.id, action === "on");
    });

    // Comando para listar imágenes disponibles
    this.bot.bot.onText(/\/imagenes/, async (msg) => {
      await this.handleImages(msg.chat.id);
    });

    // Comando para estadísticas de sesiones
    this.bot.bot.onText(/\/sessions/, async (msg) => {
      await this.handleSessions(msg.chat.id);
    });

    // ✅ COMANDO /urgent - SCRAPING URGENTE
    this.bot.bot.onText(/\/urgent/, async (msg) => {
        await this.handleUrgentScraping(msg.chat.id);
    });

    console.log('✅ Comandos configurados');
  }

  // ===============================
  // COMANDO /start
  // ===============================
  async handleStart(chatId) {
    try {
      await this.bot.sendMessage(chatId, BotMessages.getWelcomeMessage());
    } catch (error) {
      console.error('❌ Error en /start:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /help
  // ===============================
  async handleHelp(chatId) {
    try {
      await this.bot.sendMessage(chatId, BotMessages.getHelpMessage());
    } catch (error) {
      console.error('❌ Error en /help:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /stats
  // ===============================
  async handleStats(chatId) {
    try {
      await this.bot.sendMessage(chatId, "📊 Calculando estadísticas...");

      const stats = await this.bot.db.getStats();
      const sessionStats = this.bot.sessionManager.getStats();

      if (stats.success) {
        const isActive = this.bot.scraper.isActiveHours();
        const autoStatus = this.bot.isAutoScrapingActive ? "🟢 ACTIVO" : "🔴 INACTIVO";

        const message = `📊 **ESTADÍSTICAS TIGRIZIO MODULAR**

**📱 BASE DE DATOS:**
• Total tweets: **${stats.stats.total}**
• Tweets VIP: **${stats.stats.vipCount}** (${Math.round(
          (stats.stats.vipCount / stats.stats.total) * 100
        )}%)
• Total likes: **${stats.stats.totalLikes.toLocaleString()}**
• Total retweets: **${stats.stats.totalRetweets.toLocaleString()}**
• Engagement total: **${(
          stats.stats.totalLikes + stats.stats.totalRetweets
        ).toLocaleString()}**

**⏰ SISTEMA:**
• Horario activo: **${isActive ? "🟢 SÍ" : "🔴 NO"}**
• Scraping automático: **${autoStatus}**
• Pipeline modular: **🟢 OPERATIVO**

**📋 SESIONES:**
• Sesiones activas: **${sessionStats.active}**
• Expirando pronto: **${sessionStats.expiringSoon}**
• Total en memoria: **${sessionStats.total}**

**🎬 CAPACIDADES:**
• Scripts con validación: ✅
• Audio síntesis: ✅
• Video generación: ✅
• Caption viral: ✅
• Arquitectura modular: ✅

**🎯 LISTO PARA:**
\`tigrizio[1-9]@keyword\` → Script → Validación → Video`;

        await this.bot.sendMessage(chatId, message);
      } else {
        await this.bot.sendMessage(chatId, `❌ Error obteniendo estadísticas: ${stats.error}`);
      }
    } catch (error) {
      console.error('❌ Error en /stats:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /scrape
  // ===============================
  async handleScrape(chatId) {
    try {
      await this.bot.sendMessage(chatId, BotMessages.getScrapingMessages().starting);

      const result = await this.bot.scraper.performOptimizedScraping();

      if (result.success && result.tweets.length > 0) {
        let savedCount = 0;
        let vipCount = 0;

        for (const tweet of result.tweets) {
          const vipInfo = this.bot.scraper.isVipTweet(tweet.originalText);
          const saveResult = await this.bot.db.saveTweet(tweet, vipInfo);

          if (saveResult.success) {
            savedCount++;
            if (saveResult.isVip) vipCount++;
          }
        }

        const message = BotMessages.getScrapingMessages().completed(
          result.tweets.length, 
          savedCount, 
          vipCount, 
          result.summary
        );
        
        await this.bot.sendMessage(chatId, message);
      } else if (result.success && result.tweets.length === 0) {
        await this.bot.sendMessage(chatId, BotMessages.getScrapingMessages().noTweets(result.summary));
      } else {
        await this.bot.sendMessage(chatId, BotMessages.getScrapingMessages().error(result.error));
      }
    } catch (error) {
      console.error('❌ Error en /scrape:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /vip
  // ===============================
  async handleVip(chatId) {
    try {
      const vipResult = await this.bot.db.getVipTweets(5);

      if (vipResult.success && vipResult.vipTweets.length > 0) {
        let message = `🚨 **ÚLTIMOS TWEETS VIP**\n\n`;

        vipResult.vipTweets.forEach((tweet, index) => {
          const shortContent = tweet.content.length > 100 
            ? tweet.content.substring(0, 100) + "..."
            : tweet.content;

          message += `**${index + 1}.** [${tweet.vip_keyword?.toUpperCase()}]\n`;
          message += `${shortContent}\n`;
          message += `💫 ${tweet.likes} ❤️ | ${tweet.retweets} 🔄\n\n`;
        });

        message += `🎬 *Usa: tigrizio[1-9]@keyword para generar video*`;
        await this.bot.sendMessage(chatId, message);
      } else {
        await this.bot.sendMessage(chatId, "📭 No hay tweets VIP recientes");
      }
    } catch (error) {
      console.error('❌ Error en /vip:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /recent
  // ===============================
  async handleRecent(chatId) {
    try {
      const recentResult = await this.bot.db.getRecentTweets(24, 5);

      if (recentResult.success && recentResult.tweets.length > 0) {
        let message = `📱 **TWEETS RECIENTES (24H)**\n\n`;

        recentResult.tweets.forEach((tweet, index) => {
          const shortContent = tweet.content.length > 80 
            ? tweet.content.substring(0, 80) + "..."
            : tweet.content;

          const vipIcon = tweet.is_vip ? "🚨" : "📰";
          const hoursAgo = Math.round(tweet.hours_ago * 10) / 10;

          message += `**${index + 1}.** ${vipIcon} *${hoursAgo}h atrás*\n`;
          message += `${shortContent}\n\n`;
        });

        message += `🎬 *Usa: tigrizio[1-9]@keyword para generar video*`;
        await this.bot.sendMessage(chatId, message);
      } else {
        await this.bot.sendMessage(chatId, "📭 No hay tweets recientes");
      }
    } catch (error) {
      console.error('❌ Error en /recent:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /auto
  // ===============================
  async handleAutoScraping(chatId, enable) {
    try {
      await this.bot.toggleAutoScraping(chatId, enable);
    } catch (error) {
      console.error('❌ Error en /auto:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /imagenes
  // ===============================
  async handleImages(chatId) {
    try {
      const imageResult = await this.bot.videoGen.imageProcessor.verificarImagenesDisponibles();

      if (imageResult.success && imageResult.imagenes.length > 0) {
        let message = `📸 **PRESENTADORES DISPONIBLES**\n\n`;

        imageResult.imagenes.forEach((img, index) => {
          message += `🎭 **${img}** - Para usar: \`${img}@keyword\`\n`;
        });

        message += `\n💡 **Ejemplo:** \`tigrizio3@Real Madrid\``;
        message += `\n🔄 **Nuevo:** Script con validación previa`;

        await this.bot.sendMessage(chatId, message);
      } else {
        await this.bot.sendMessage(chatId, "❌ No hay imágenes disponibles");
      }
    } catch (error) {
      console.error('❌ Error en /imagenes:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /sessions
  // ===============================
  async handleSessions(chatId) {
    try {
      const sessionStats = this.bot.sessionManager.getStats();
      const activeSessions = this.bot.sessionManager.getActiveSessions();

      let message = `📋 **SESIONES ACTIVAS**\n\n`;
      message += `📊 **Estadísticas:**\n`;
      message += `• Total: ${sessionStats.total}\n`;
      message += `• Activas: ${sessionStats.active}\n`;
      message += `• Expirando pronto: ${sessionStats.expiringSoon}\n`;
      message += `• Expiradas: ${sessionStats.expired}\n\n`;

      if (activeSessions.length > 0) {
        message += `🔄 **Sesiones pendientes:**\n`;
        
        activeSessions.forEach((session, index) => {
          const timeLeft = Math.round(session.timeRemaining / (60 * 1000)); // minutos
          message += `${index + 1}. \`${session.sessionId.substring(0, 20)}...\`\n`;
          message += `   📝 ${session.keyword || 'N/A'} | ⏰ ${timeLeft}min\n`;
        });
      } else {
        message += `✅ No hay sesiones pendientes`;
      }

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('❌ Error en /sessions:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // COMANDO /urgent - SCRAPING URGENTE
  // ===============================
  async handleUrgentScraping(chatId) {
    try {
      await this.bot.sendMessage(chatId, "🚨 **SCRAPING URGENTE INICIADO**\n\n⏰ Buscando tweets de últimas 12 horas...");
      
      // Usar el scraper existente con parámetros específicos para urgente
      const tweets = await this.bot.scraper.getRecentTweets(12);
      
      if (!tweets || tweets.length === 0) {
        await this.bot.sendMessage(chatId, 
          "📭 **No hay tweets nuevos**\n\nNo se encontraron tweets en las últimas 12 horas.");
        return;
      }

      let savedCount = 0;
      let vipCount = 0;

      for (const tweet of tweets) {
        const vipInfo = this.bot.scraper.isVipTweet(tweet.originalText);
        const saveResult = await this.bot.db.saveTweet(tweet, vipInfo);
        
        if (saveResult.success) {
          savedCount++;
          if (saveResult.isVip) vipCount++;
        }
      }

      const summary = `🚨 **SCRAPING URGENTE COMPLETADO**

📊 **Resultados últimas 12h:**
• 🆕 ${savedCount} tweets nuevos
• 🚨 ${vipCount} tweets VIP
• ⏰ Scraping completo en tiempo real

💡 **Próximos pasos:**
• Usa \`tigrizio[1-9]@keyword\` para generar videos
• Revisa /vip para noticias urgentes`;

      await this.bot.sendMessage(chatId, summary);

    } catch (error) {
      console.error('❌ Error en /urgent:', error);
      await this.bot.sendMessage(chatId, 
        `❌ **Error en scraping urgente:** ${error.message}`);
    }
  }
}

module.exports = CommandHandler;