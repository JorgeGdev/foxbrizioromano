// ===============================
// TIGRIZIO - TELEGRAM BOT MODULAR FINAL
// Arquitectura escalable con validación completa
// ===============================

const TelegramBot = require("node-telegram-bot-api");
const TwitterScraper = require("./twitter-scraper");
const SupabaseManager = require("./supabase-manager");
const TigrizioScriptGenerator = require("./script-generator");
const TigrizioVoiceGenerator = require("./voice-generator");
const TigrizioVideoGenerator = require("./video-generator");

// Importar módulos especializados
const CommandHandler = require("./bot-handlers/command-handler");
const MessageHandler = require("./bot-handlers/message-handler");
const ApprovalHandler = require("./bot-handlers/approval-handler");
const VideoPipeline = require("./bot-handlers/video-pipeline");
const SessionManager = require("./utils/session-manager");

require("dotenv").config();

class TigrizioBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: true,
    });
    this.chatId = process.env.TELEGRAM_CHAT_ID;

    // Inicializar módulos core
    this.scraper = new TwitterScraper();
    this.db = new SupabaseManager();
    this.scriptGen = new TigrizioScriptGenerator();
    this.voiceGen = new TigrizioVoiceGenerator();
    this.videoGen = new TigrizioVideoGenerator();

    // Estado del scraping automático
    this.autoScrapingInterval = null;
    this.isAutoScrapingActive = false;

    // Inicializar manejadores especializados
    this.sessionManager = new SessionManager();
    this.commandHandler = new CommandHandler(this);
    this.messageHandler = new MessageHandler(this);
    this.approvalHandler = new ApprovalHandler(this);
    this.videoPipeline = new VideoPipeline(this);

    this.setupBotHandlers();

    console.log("🤖 Tigrizio Bot modular iniciado");
  }

  // ===============================
  // CONFIGURAR MANEJADORES DEL BOT
  // ===============================
  setupBotHandlers() {
    // Configurar comandos
    this.commandHandler.setupCommands();
    
    // Configurar manejo de mensajes
    this.messageHandler.setupMessageHandler();
    
    // Configurar botones de aprobación
    this.approvalHandler.setupApprovalHandler();

    console.log("✅ Manejadores configurados");
  }

  // ===============================
  // MÉTODOS PARA ACCESO DE MÓDULOS
  // ===============================
  
  // Enviar mensaje con formato
  async sendMessage(chatId, text, options = {}) {
    return await this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...options
    });
  }

  // Enviar mensaje al chat principal
  async sendToMainChat(text, options = {}) {
    return await this.sendMessage(this.chatId, text, options);
  }

  // Editar mensaje existente
  async editMessage(chatId, messageId, text, options = {}) {
    return await this.bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      ...options
    });
  }

  // Responder a callback query
  async answerCallback(callbackQueryId, text, showAlert = false) {
    return await this.bot.answerCallbackQuery(callbackQueryId, {
      text: text,
      show_alert: showAlert
    });
  }

  // ===============================
  // SCRAPING AUTOMÁTICO (MANTENIDO)
  // ===============================
  async toggleAutoScraping(chatId, enable) {
    if (enable) {
      if (this.isAutoScrapingActive) {
        await this.sendMessage(chatId, "⚠️ El scraping automático ya está activo");
        return;
      }

      this.autoScrapingInterval = setInterval(async () => {
        await this.performAutomaticScraping();
      }, 3 * 60 * 60 * 1000);

      this.isAutoScrapingActive = true;

      await this.sendMessage(chatId, 
        "🟢 **SCRAPING AUTOMÁTICO ACTIVADO**\n\n" +
        "⏰ Frecuencia: Cada 3 horas\n" +
        "🌍 Solo en horarios activos (Europa despierta)\n" +
        "📱 Recibirás notificaciones automáticas"
      );
    } else {
      if (!this.isAutoScrapingActive) {
        await this.sendMessage(chatId, "⚠️ El scraping automático ya está inactivo");
        return;
      }

      clearInterval(this.autoScrapingInterval);
      this.isAutoScrapingActive = false;

      await this.sendMessage(chatId, 
        "🔴 **SCRAPING AUTOMÁTICO DESACTIVADO**\n\n" +
        "📱 Usa /scrape para scraping manual"
      );
    }
  }

  async performAutomaticScraping() {
    try {
      console.log("🤖 Ejecutando scraping automático...");

      const result = await this.scraper.performOptimizedScraping();

      if (result.success && result.tweets.length > 0) {
        let savedCount = 0;
        let vipCount = 0;

        for (const tweet of result.tweets) {
          const vipInfo = this.scraper.isVipTweet(tweet.originalText);
          const saveResult = await this.db.saveTweet(tweet, vipInfo);

          if (saveResult.success) {
            savedCount++;
            if (saveResult.isVip) vipCount++;
          }
        }

        if (savedCount > 0) {
          const message = `🤖 **SCRAPING AUTOMÁTICO**\n\n${result.summary}`;
          await this.sendToMainChat(message);
        }
      }
    } catch (error) {
      console.error("❌ Error en scraping automático:", error);
    }
  }

  // ===============================
  // CONTROL DEL BOT
  // ===============================
  start() {
    console.log("🚀 Tigrizio Bot modular iniciado correctamente");
    this.sendToMainChat(
      "🐅 **TIGRIZIO BOT MODULAR INICIADO**\n\n" +
      "🏗️ *Nueva arquitectura escalable*\n" +
      "📋 *Sistema de validación de scripts*\n" +
      "⚡ *Optimización de tokens garantizada*\n\n" +
      "💡 Usa: `tigrizio[1-9]@keyword`\n" +
      "🔄 Nuevo: Aprobarás scripts antes de generar"
    );
  }

  stop() {
    if (this.autoScrapingInterval) {
      clearInterval(this.autoScrapingInterval);
    }
    this.bot.stopPolling();
    console.log("🛑 Tigrizio Bot detenido");
  }
}

module.exports = TigrizioBot;