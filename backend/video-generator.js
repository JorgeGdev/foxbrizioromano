// ===============================
// TIGRIZIO - VIDEO GENERATOR (ROBUSTO)
// Basado en tu lógica épica de video-creator.js
// ===============================

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const TigrizioAudioProcessor = require("./audio-processor");
const TigrizioImageProcessor = require("./image-processor");
const OpenAI = require('openai'); 
require("dotenv").config();

class TigrizioVideoGenerator {
  constructor() {
    this.hedraApiKey = process.env.HEDRA_API_KEY;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseUrl = "https://api.hedra.com/web-app/public";
    this.openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

    this.audioProcessor = new TigrizioAudioProcessor();
    this.imageProcessor = new TigrizioImageProcessor();

    console.log("Tigrizio Video Generator (Robusto) iniciado");
  }


  // ===============================
// GENERAR CAPTION VIRAL CON OPENAI (NUEVO!)
// ===============================
async generarCaptionConOpenAI(script, imageName, sessionId) {
  try {
    await this.logAndNotify(sessionId, "🤖 Generando caption viral con OpenAI...");

    // Prompt épico para caption viral
    const captionPrompt = `Eres un experto en crear contenido viral para redes sociales (Instagram, TikTok, YouTube Shorts).

SCRIPT DE VIDEO DE FÚTBOL:
"${script}"

TAREA: Crear un caption súper atractivo y viral para este video de fútbol.

REQUISITOS OBLIGATORIOS:
- Hook potente en las primeras palabras que enganche INMEDIATAMENTE
- Lenguaje natural, como si fueras un creator de fútbol real
- Genera curiosidad y ganas de comentar
- Máximo 150 palabras total
- Exactamente 5 hashtags relevantes y populares
- Un call-to-action al final que invite a comentar
- Tono: emocionante, cercano, ligeramente controversial para generar debate

ESTILO:
- Usa emojis estratégicamente (no spam)
- Preguntas directas al público
- Frases que generen opiniones divididas
- Lenguaje de redes actual

ESTRUCTURA:
1. HOOK (primera línea super impactante)
2. DESARROLLO (contexto emocionante)
3. DEBATE/PREGUNTA (genera controversia sana)
4. HASHTAGS (5 exactamente)
5. CTA (call to action)

EJEMPLO DE ESTILO:
"🚨 ESTO NO LO VIO NADIE VENIR...

[jugador] acaba de hacer el movimiento más inesperado del año. Cuando creías que ya todo estaba decidido en el mercado, aparece ESTA bomba.

¿Genio o locura? ¿El fichaje que cambia todo o el error más caro de la historia?

#TransferNews #Football #BreakingNews #Fichajes #HereWeGo

¿De qué lado estás? 👇"

IMPORTANTE: Solo devuelve el caption final, sin explicaciones.`;

    // Llamar a OpenAI
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Eres un experto creator de contenido viral de fútbol en redes sociales." },
        { role: "user", content: captionPrompt }
      ],
      temperature: 0.8, // Más creatividad
      max_tokens: 300
    });

    const captionGenerated = response.choices[0].message.content.trim();

    await this.logAndNotify(sessionId, `✅ Caption viral generado: ${captionGenerated.length} caracteres`);

    return {
      success: true,
      caption: captionGenerated,
      caracteres: captionGenerated.length,
      source: 'openai'
    };

  } catch (error) {
    console.error(`Error generando caption con OpenAI [${sessionId}]:`, error);
    await this.logAndNotify(sessionId, `⚠️ Error en caption, usando backup...`);

    // Fallback caption simple si OpenAI falla
    const backupCaption = `🔥 ${script.substring(0, 50)}...\n\n¿Qué opinas de este movimiento?\n\n#Football #TransferNews #BreakingNews #Fichajes #HereWeGo\n\n¡Comenta tu opinión! 👇`;

    return {
      success: true,
      caption: backupCaption,
      caracteres: backupCaption.length,
      source: 'fallback'
    };
  }
}

// ===============================
// GENERAR CAPTION PARA REDES SOCIALES (ACTUALIZADO!)
// ===============================
async generarCaption(script, imageName, sessionId) {
  try {
    // Usar OpenAI para generar caption inteligente
    const captionResult = await this.generarCaptionConOpenAI(script, imageName, sessionId);
    
    if (captionResult.success) {
      return captionResult.caption;
    } else {
      throw new Error('Error generando caption con OpenAI');
    }

  } catch (error) {
    console.error('Error en generación de caption:', error);
    
    // Fallback caption manual como último recurso
    return `🚨 ${script.substring(0, 80)}...\n\n¿Qué piensas?\n\n#Football #TransferNews #BreakingNews\n\n¡Comenta! 👇`;
  }
}






  // ===============================
  // LOGS DUAL (CONSOLE + TELEGRAM) - TU LÓGICA!
  // ===============================
  async logAndNotify(sessionId, message, sendToTelegram = true) {
    const fullMessage = `[${sessionId}] ${message}`;
    console.log(fullMessage);

    // Si existe función global de SSE, usarla para web
    if (typeof global.sendSSELog === "function") {
      global.sendSSELog("HEDRA", message, "info");
    }

    /*
    if (sendToTelegram && this.botToken && this.chatId) {
        try {
            await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                chat_id: this.chatId,
                text: fullMessage,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.log('No se pudo enviar a Telegram:', error.message);
        }
    }
    */
  }

  // ===============================
  // SINCRONIZAR ASSETS (TU LÓGICA CRÍTICA!)
  // ===============================
  async sincronizarAssets(audioData, imagenData, sessionId) {
    try {
      await this.logAndNotify(
        sessionId,
        "🔄 SINCRONIZANDO ASSETS - Crítico para Hedra"
      );
      await this.logAndNotify(
        sessionId,
        `📸 Imagen Asset ID: ${imagenData.imageAssetId}`
      );
      await this.logAndNotify(
        sessionId,
        `🔊 Audio Asset ID: ${audioData.audioAssetId}`
      );

      // Verificar que ambos assets estén listos
      if (!audioData.audioAssetId || !imagenData.imageAssetId) {
        throw new Error("Assets no están listos para sincronización");
      }

      // Esperar para que Hedra procese completamente (TU LÓGICA!)
      await this.logAndNotify(
        sessionId,
        "⏳ Esperando procesamiento de Hedra (30s)..."
      );
      await new Promise((resolve) => setTimeout(resolve, 30000));

      await this.logAndNotify(
        sessionId,
        "✅ Assets sincronizados correctamente"
      );

      return {
        imageAssetId: imagenData.imageAssetId,
        audioAssetId: audioData.audioAssetId,
        duracionEstimada: 20, // 20 segundos fijo
        sincronizado: true,
      };
    } catch (error) {
      await this.logAndNotify(
        sessionId,
        `❌ Error en sincronización: ${error.message}`
      );
      throw error;
    }
  }

  // ===============================
  // CREAR VIDEO CON HEDRA (TU PROMPT NAPOLITANO!)
  // ===============================
  async crearVideo(assetsSync, sessionId) {
    try {
      await this.logAndNotify(sessionId, "🎬 Creando video con Hedra AI...");

      const videoRequest = {
        type: "video",
        ai_model_id: "d1dd37a3-e39a-4854-a298-6510289f9cf2",
        start_keyframe_id: assetsSync.imageAssetId,
        audio_id: assetsSync.audioAssetId,
        generated_video_inputs: {
          text_prompt: `PERSONAJE: Joven periodista deportivo napolitano. expresión cálida y cercana. Lleva camiseta casual (cuello redondo), sin maquillaje pesado. Apariencia natural, profesional y amigable.

ACTUACIÓN INICIAL (Segundos 0 a 3): Comienza en posición neutra, con mirada directa a cámara y una sonrisa sutil. Postura relajada, gesto acogedor, transmite confianza.

EVOLUCIÓN EMOCIONAL (Segundos 3 a 20):
Segundos 3 a 8: Aumenta la energía gradualmente. Usa cejas y ojos para enfatizar. Gesto de manos leve al marcar puntos importantes.
Segundos 8 a 15: Voz más apasionada, expresión facial intensa, gestos naturales con las manos. Sonrisa sincera cuando menciona algo positivo o emocionante.
Segundos 15 a 20: Termina con emoción, mirada curiosa e invitadora, como si animara al espectador a seguir la historia.

ESTILO VERBAL: Conversacional y napolitano, con pasión controlada. Habla como si contara una historia a un amigo en la calle, pero con claridad y profesionalismo. Transiciones suaves entre ideas.

EXPRESIÓN CORPORAL: Movimientos sutiles de cabeza y manos. Todo natural, espontáneo pero bien contenido. Nada exagerado.

ILUMINACIÓN Y AMBIENTE: Luz suave, cálida y natural, favoreciendo su tono de piel. Fondo: calle napolitana con ambiente realista. Setup profesional pero con toque de creador de contenido desde casa.

CÁMARA: Toma vertical (9:16), desde pecho hacia arriba. Encuadre a nivel de ojos. El personaje permanece centrado y enfocado durante todo el clip.

SINCRONIZACIÓN CRÍTICA: El inicio debe ser fluido, sin cortes bruscos. La boca y las expresiones comienzan en el momento justo. La emoción sube de forma natural. El video debe sentirse real, no robótico.`,
          resolution: "720p",
          aspect_ratio: "9:16",
          duration_ms: 20000,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/generations`,
        videoRequest,
        {
          headers: {
            "X-Api-Key": this.hedraApiKey,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const generationId = response.data.asset_id;
      await this.logAndNotify(
        sessionId,
        `🎬 Video iniciado en Hedra: ${generationId}`
      );

      return {
        generationId: generationId,
        status: "processing",
        estimatedTime: "3-5 minutos",
      };
    } catch (error) {
      await this.logAndNotify(
        sessionId,
        `❌ Error creando video: ${error.response?.status || error.message}`
      );
      throw new Error(`Error creando video: ${error.message}`);
    }
  }

  // ===============================
  // VERIFICAR ESTADO DEL VIDEO (TU LÓGICA!)
  // ===============================
  async verificarEstadoVideo(generationId, sessionId) {
    try {
      await this.logAndNotify(
        sessionId,
        `🔍 Verificando estado del video: ${generationId}`,
        false
      );

      const response = await axios.get(
        `${this.baseUrl}/assets?type=video&ids=${generationId}`,
        {
          headers: {
            "X-Api-Key": this.hedraApiKey,
          },
          timeout: 30000,
        }
      );

      const videoData = response.data[0];
      const status = videoData?.status || "unknown";

      await this.logAndNotify(
        sessionId,
        `📊 Estado del video: ${status}`,
        false
      );

      return {
        status: status,
        ready: status === "completed",
        url: videoData?.asset?.url || null,
        error: videoData?.error || null,
      };
    } catch (error) {
      await this.logAndNotify(
        sessionId,
        `❌ Error verificando estado: ${error.message}`
      );
      throw error;
    }
  }

  // ===============================
  // DESCARGAR VIDEO FINAL (TU LÓGICA ROBUSTA!)
  // ===============================
  async descargarVideo(videoUrl, sessionId) {
    try {
      await this.logAndNotify(sessionId, "📥 Descargando video final...");

      const response = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 120000, // 2 minutos
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.data || response.data.byteLength === 0) {
        throw new Error("Video descargado está vacío");
      }

      await this.logAndNotify(
        sessionId,
        `📊 Video descargado: ${response.data.byteLength} bytes`
      );

      // Crear nombre con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const nombreVideo = `tigrizio_video_${timestamp}.mp4`;

      // Guardar video
      const videoDir = path.join(__dirname, "../assets/videos");
      await fs.mkdir(videoDir, { recursive: true });

      const videoPath = path.join(videoDir, nombreVideo);
      await fs.writeFile(videoPath, Buffer.from(response.data));

      // Verificar archivo
      const stats = await fs.stat(videoPath);
      const videoSize = (stats.size / (1024 * 1024)).toFixed(2);

      await this.logAndNotify(
        sessionId,
        `✅ Video guardado: ${videoPath} (${videoSize} MB)`
      );

      return {
        archivo: videoPath,
        nombreArchivo: nombreVideo,
        tamaño: videoSize + " MB",
        buffer: Buffer.from(response.data),
        url: videoUrl,
      };
    } catch (error) {
      await this.logAndNotify(
        sessionId,
        `❌ Error descargando video: ${error.message}`
      );
      throw error;
    }
  }

  // ===============================
  // GENERAR VIDEO COMPLETO (TU LÓGICA ÉPICA!)
  // ===============================
  async generarVideoCompleto(audioBuffer, imageName, sessionId, script = "") {
    try {
      await this.logAndNotify(
        sessionId,
        "🎬 INICIANDO CREACIÓN DE VIDEO COMPLETO",
        true
      );

      // PASO 1: Procesar audio e imagen EN PARALELO
      await this.logAndNotify(
        sessionId,
        "🚀 Procesando audio e imagen en paralelo...",
        true
      );

      const [audioData, imagenData] = await Promise.all([
        this.audioProcessor.procesarAudio(audioBuffer, sessionId),
        this.imageProcessor.procesarImagen(imageName, sessionId),
      ]);

      if (!audioData.success) {
        throw new Error(`Error procesando audio: ${audioData.error}`);
      }

      if (!imagenData.success) {
        throw new Error(`Error procesando imagen: ${imagenData.error}`);
      }

      // PASO 2: Sincronizar assets (TU LÓGICA CRÍTICA!)
      const assetsSync = await this.sincronizarAssets(
        audioData,
        imagenData,
        sessionId
      );

      // PASO 3: Crear video en Hedra
      const videoGeneration = await this.crearVideo(assetsSync, sessionId);

      // PASO 4: Esperar 5 minutos (tiempo estimado de Hedra)
      await this.logAndNotify(
        sessionId,
        "⏳ Esperando generación de video (5 minutos)...",
        true
      );
      await new Promise((resolve) => setTimeout(resolve, 300000)); // 5 minutos

      // PASO 5: Verificar estado hasta que esté listo (15 INTENTOS - TU LÓGICA!)
      let intentos = 0;
      let videoListo = false;
      let videoUrl = null;
      const maxIntentos = 15;

      while (!videoListo && intentos < maxIntentos) {
        const estado = await this.verificarEstadoVideo(
          videoGeneration.generationId,
          sessionId
        );

        if (estado.ready && estado.url) {
          videoListo = true;
          videoUrl = estado.url;
          await this.logAndNotify(sessionId, "🎉 ¡Video listo! URL obtenida");
        } else if (estado.error) {
          throw new Error(`Error en Hedra: ${estado.error}`);
        } else {
          await this.logAndNotify(
            sessionId,
            `⏳ Video aún procesando... intento ${intentos + 1}/${maxIntentos}`,
            intentos % 3 === 0 // Solo cada 3 intentos a Telegram
          );
          await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 segundos
          intentos++;
        }
      }

      // PASO 6: DESCARGA FORZADA (TU LÓGICA ÉPICA!)
      if (!videoListo) {
        await this.logAndNotify(
          sessionId,
          "⚠️ Timeout en verificaciones, intentando descarga directa..."
        );

        const estadoFinal = await this.verificarEstadoVideo(
          videoGeneration.generationId,
          sessionId
        );
        if (estadoFinal.url) {
          videoUrl = estadoFinal.url;
          videoListo = true;
          await this.logAndNotify(
            sessionId,
            "✅ Video encontrado en intento final"
          );
        } else {
          await this.logAndNotify(
            sessionId,
            `❌ Video no completado tras ${intentos} intentos.`
          );
          await this.logAndNotify(
            sessionId,
            `🆔 ID para rescate manual: ${videoGeneration.generationId}`
          );
          throw new Error(
            `Video no completado tras ${intentos} intentos. ID: ${videoGeneration.generationId}`
          );
        }
      }

      // PASO 7: Descargar video final
      const videoFinal = await this.descargarVideo(videoUrl, sessionId);

      // PASO 8: Generar caption para redes sociales
      let captionData = null;
      try {
        await this.logAndNotify(
          sessionId,
          "📱 Generando caption para redes sociales..."
        );

        const captionText = await this.generarCaption(script, imageName, sessionId);
        const captionFileName = videoFinal.nombreArchivo.replace(
          ".mp4",
          "_caption.txt"
        );
        const captionPath = path.join(
          __dirname,
          "../assets/captions",
          captionFileName
        );

        // Crear directorio si no existe
        await fs.mkdir(path.dirname(captionPath), { recursive: true });

        // Guardar caption
        await fs.writeFile(captionPath, captionText);

        captionData = {
          archivo: captionPath,
          nombreArchivo: captionFileName,
          caracteres: captionText.length,
          texto: captionText,
        };

        await this.logAndNotify(
          sessionId,
          `📝 Caption guardado: ${captionData.caracteres} caracteres`
        );
      } catch (error) {
        await this.logAndNotify(
          sessionId,
          `⚠️ Error generando caption: ${error.message}`
        );
      }

      await this.logAndNotify(
        sessionId,
        "🎉 VIDEO Y CAPTION COMPLETADOS EXITOSAMENTE",
        true
      );

      return {
        success: true,
        archivo: videoFinal.archivo,
        nombreArchivo: videoFinal.nombreArchivo,
        tamaño: videoFinal.tamaño,
        generationId: videoGeneration.generationId,
        duracionProceso: "~8 minutos",
        audioAssetId: audioData.audioAssetId,
        imageAssetId: imagenData.imageAssetId,
        imageName: imageName,
        script: script,
        caption: captionData,
        sessionId: sessionId,
      };
    } catch (error) {
      await this.logAndNotify(
        sessionId,
        `💥 Error en proceso completo: ${error.message}`,
        true
      );

      return {
        success: false,
        error: error.message,
        sessionId: sessionId,
      };
    }
  }

  // ===============================
  // TEST DE CONEXIÓN HEDRA (CORREGIDO)
  // ===============================
  async testConnection() {
    try {
      console.log("Probando conexión con Hedra...");

      // Usar endpoint correcto de Hedra
      const response = await axios.get(
        `${this.baseUrl}/assets?type=image&limit=1`,
        {
          headers: {
            "X-Api-Key": this.hedraApiKey,
          },
          timeout: 10000,
        }
      );

      console.log("Hedra conectado correctamente");

      return {
        success: true,
        message: "Conectado a Hedra AI",
      };
    } catch (error) {
      console.error("Error conectando con Hedra:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Hedra Error:", error.response.data);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = TigrizioVideoGenerator;
