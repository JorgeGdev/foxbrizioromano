// ===============================
// TIGRIZIO - APPROVAL HANDLER
// Manejo de validación de scripts con botones
// ===============================

const BotMessages = require("../utils/bot-messages");

class ApprovalHandler {
  constructor(bot) {
    this.bot = bot;
    console.log('✅ Approval Handler iniciado');
  }

  // ===============================
  // CONFIGURAR MANEJO DE BOTONES
  // ===============================
  setupApprovalHandler() {
    this.bot.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallback(callbackQuery);
    });

    console.log('🔘 Callback handlers configurados');
  }

  // ===============================
  // MOSTRAR SCRIPT PARA APROBACIÓN
  // ===============================
  async showScriptForApproval(chatId, scriptResult, imageNumber, keyword, sessionId) {
    try {
      // Crear datos de sesión
      const sessionData = {
        scriptResult,
        imageNumber,
        keyword,
        chatId
      };

      // Guardar sesión
      const sessionCreated = this.bot.sessionManager.createSession(sessionId, sessionData);
      
      if (!sessionCreated) {
        throw new Error('No se pudo crear la sesión de aprobación');
      }

      // Crear mensaje de aprobación
      const message = BotMessages.getScriptApprovalMessage(scriptResult, imageNumber, keyword);
      const keyboard = BotMessages.getApprovalKeyboard(sessionId);

      await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });

      console.log(`📋 Script enviado para aprobación: ${sessionId}`);
      return true;

    } catch (error) {
      console.error('❌ Error mostrando script para aprobación:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
      return false;
    }
  }

  // ===============================
  // MANEJAR CALLBACK PRINCIPAL
  // ===============================
  async handleCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      // Verificar autorización
      if (chatId.toString() !== this.bot.chatId) {
        await this.bot.answerCallback(callbackQuery.id, BotMessages.getAuthMessages().unauthorized, true);
        return;
      }

      // Extraer acción y sessionId
      const [action, sessionId] = data.split('_');
      
      if (!sessionId) {
        await this.bot.answerCallback(callbackQuery.id, BotMessages.getAuthMessages().unknownAction);
        return;
      }

      // Verificar que la sesión existe
      const sessionData = this.bot.sessionManager.getSession(sessionId);
      if (!sessionData) {
        await this.bot.answerCallback(callbackQuery.id, BotMessages.getAuthMessages().sessionExpired, true);
        return;
      }

      // Procesar acción
      await this.processAction(action, sessionId, sessionData, callbackQuery);

    } catch (error) {
      console.error('❌ Error manejando callback:', error);
      await this.bot.answerCallback(callbackQuery.id, BotMessages.getAuthMessages().processingError, true);
    }
  }

  // ===============================
  // PROCESAR ACCIÓN ESPECÍFICA
  // ===============================
  async processAction(action, sessionId, sessionData, callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    switch (action) {
      case 'approve':
        await this.handleApprove(sessionId, sessionData, callbackQuery, chatId, messageId);
        break;
      
      case 'reject':
        await this.handleReject(sessionId, sessionData, callbackQuery, chatId, messageId);
        break;
      
      case 'regenerate':
        await this.handleRegenerate(sessionId, sessionData, callbackQuery, chatId, messageId);
        break;
      
      case 'cancel':
        await this.handleCancel(sessionId, callbackQuery, chatId, messageId);
        break;
      
      default:
        await this.bot.answerCallback(callbackQuery.id, BotMessages.getAuthMessages().unknownAction);
    }
  }

  // ===============================
  // MANEJAR APROBACIÓN
  // ===============================
  async handleApprove(sessionId, sessionData, callbackQuery, chatId, messageId) {
    try {
      // Confirmar aprobación
      await this.bot.answerCallback(callbackQuery.id, BotMessages.getCallbackResponses().approved);

      // Editar mensaje original
      await this.bot.editMessage(chatId, messageId, BotMessages.getApprovalMessages().approved);

      // Log de aprobación
      console.log(`✅ Script aprobado para sesión: ${sessionId}`);

      // Continuar con generación de video
      await this.bot.videoPipeline.continueAfterApproval(sessionData, sessionId);

    } catch (error) {
      console.error('❌ Error en aprobación:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    } finally {
      // Limpiar sesión
      this.bot.sessionManager.deleteSession(sessionId);
    }
  }

  // ===============================
  // MANEJAR RECHAZO
  // ===============================
  async handleReject(sessionId, sessionData, callbackQuery, chatId, messageId) {
    try {
      // Confirmar rechazo
      await this.bot.answerCallback(callbackQuery.id, BotMessages.getCallbackResponses().rejected);

      // Editar mensaje original
      await this.bot.editMessage(chatId, messageId, BotMessages.getApprovalMessages().rejected);

      // Log de rechazo
      console.log(`❌ Script rechazado para sesión: ${sessionId}`);

      // Regenerar script automáticamente
      await this.regenerateScript(sessionData, chatId);

    } catch (error) {
      console.error('❌ Error en rechazo:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    } finally {
      // Limpiar sesión
      this.bot.sessionManager.deleteSession(sessionId);
    }
  }

  // ===============================
  // MANEJAR REGENERACIÓN
  // ===============================
  async handleRegenerate(sessionId, sessionData, callbackQuery, chatId, messageId) {
    try {
      // Confirmar regeneración
      await this.bot.answerCallback(callbackQuery.id, BotMessages.getCallbackResponses().regenerating);

      // Editar mensaje original
      await this.bot.editMessage(chatId, messageId, BotMessages.getApprovalMessages().regenerating);

      // Log de regeneración
      console.log(`🔄 Regenerando script para sesión: ${sessionId}`);

      // Regenerar script
      await this.regenerateScript(sessionData, chatId);

    } catch (error) {
      console.error('❌ Error en regeneración:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    } finally {
      // Limpiar sesión
      this.bot.sessionManager.deleteSession(sessionId);
    }
  }

  // ===============================
  // MANEJAR CANCELACIÓN
  // ===============================
  async handleCancel(sessionId, callbackQuery, chatId, messageId) {
    try {
      // Confirmar cancelación
      await this.bot.answerCallback(callbackQuery.id, BotMessages.getCallbackResponses().cancelled);

      // Editar mensaje original
      await this.bot.editMessage(chatId, messageId, BotMessages.getApprovalMessages().cancelled);

      // Log de cancelación
      console.log(`🚫 Generación cancelada para sesión: ${sessionId}`);

    } catch (error) {
      console.error('❌ Error en cancelación:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message, sessionId));
    } finally {
      // Limpiar sesión
      this.bot.sessionManager.deleteSession(sessionId);
    }
  }

  // ===============================
  // REGENERAR SCRIPT
  // ===============================
  async regenerateScript(sessionData, chatId) {
    try {
      const { keyword, imageNumber } = sessionData;

      // Generar nuevo script
      await this.bot.sendMessage(chatId, `🎭 Regenerando script para "${keyword}"...`);
      
      const newScriptResult = await this.bot.scriptGen.generateScript(keyword);
      
      if (newScriptResult.success) {
        // Mostrar nuevo script para aprobación
        const newSessionId = this.bot.sessionManager.generateSessionId();
        await this.showScriptForApproval(chatId, newScriptResult, imageNumber, keyword, newSessionId);
        
        await this.bot.sendMessage(chatId, 
          `✅ **Nuevo script generado**\n\n` +
          `📊 ${newScriptResult.wordCount} palabras\n` +
          `🔄 Revisa el script arriba y decide`
        );
      } else {
        await this.bot.sendMessage(chatId, 
          `❌ **Error regenerando script**\n\n` +
          `${newScriptResult.error}\n\n` +
          `💡 Intenta con un término diferente`
        );
      }

    } catch (error) {
      console.error('❌ Error regenerando script:', error);
      await this.bot.sendMessage(chatId, BotMessages.getErrorMessage(error.message));
    }
  }

  // ===============================
  // VALIDAR SCRIPT QUALITY
  // ===============================
  validateScriptQuality(scriptResult) {
    const issues = [];

    // Verificar longitud
    if (scriptResult.wordCount < 70) {
      issues.push('Script muy corto (menos de 70 palabras)');
    }
    
    if (scriptResult.wordCount > 85) {
      issues.push('Script muy largo (más de 85 palabras)');
    }

    // Verificar contenido
    const script = scriptResult.script.toLowerCase();
    
    if (!script.includes('here we go') && !script.includes('oficial') && !script.includes('confirmado')) {
      issues.push('Script no contiene palabras de confirmación típicas');
    }

    // Verificar estructura emotiva
    if (!script.includes('!') && !script.includes('increíble') && !script.includes('bombazo')) {
      issues.push('Script carece de elementos emotivos');
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      quality: issues.length === 0 ? 'excellent' : issues.length <= 2 ? 'good' : 'poor'
    };
  }

  // ===============================
  // OBTENER SUGERENCIAS DE MEJORA
  // ===============================
  getImprovementSuggestions(scriptResult) {
    const validation = this.validateScriptQuality(scriptResult);
    
    if (validation.isValid) {
      return null;
    }

    let suggestions = `💡 **Sugerencias de mejora:**\n\n`;
    
    validation.issues.forEach((issue, index) => {
      suggestions += `${index + 1}. ${issue}\n`;
    });

    suggestions += `\n🔄 Puedes regenerar para obtener una mejor versión`;

    return suggestions;
  }

  // ===============================
  // ESTADÍSTICAS DE APROBACIÓN
  // ===============================
  logApprovalStats(action, sessionId, keyword) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      action,
      sessionId: sessionId.substring(0, 20) + '...', // Truncar para logs
      keyword,
      type: 'script_approval'
    };

    console.log(`📊 Aprobación registrada:`, logData);
  }
}

module.exports = ApprovalHandler;