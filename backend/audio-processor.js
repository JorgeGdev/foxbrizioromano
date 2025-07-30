// ===============================
// TIGRIZIO - AUDIO PROCESSOR
// Procesamiento de audio para Hedra AI
// ===============================

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class TigrizioAudioProcessor {
    constructor() {
        this.hedraApiKey = process.env.HEDRA_API_KEY;
        this.baseUrl = 'https://api.hedra.com/web-app/public';
        
        console.log('🔊 Tigrizio Audio Processor iniciado');
    }

    // ===============================
    // CREAR AUDIO ASSET EN HEDRA (PASO 1)
    // ===============================
    async crearAudioAsset(audioBuffer, sessionId) {
        try {
            console.log(`🎬 [${sessionId}] Creando audio asset en Hedra...`);
            
            // Convertir audio a base64
            const audioBase64 = audioBuffer.toString('base64');
            
            const response = await axios.post(
                `${this.baseUrl}/assets`,
                {
                    name: 'tigrizio-audio',
                    type: 'audio',
                    data: audioBase64
                },
                {
                    headers: {
                        'X-Api-Key': this.hedraApiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // 2 MINUTOS
                }
            );

            const audioAssetId = response.data.id;
            console.log(`✅ [${sessionId}] Audio asset creado: ${audioAssetId}`);

            return {
                id: audioAssetId,
                type: 'audio',
                name: 'tigrizio-audio',
                metadata: response.data
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error creando audio asset:`, error.response?.status || error.message);
            if (error.response) {
                console.error(`📝 Hedra Error:`, error.response.data);
            }
            throw new Error(`Error creando audio asset: ${error.message}`);
        }
    }

    // ===============================
    // SUBIR AUDIO FILE A HEDRA (PASO 2)
    // ===============================
    async subirAudioFile(audioBuffer, audioAssetId, sessionId) {
        try {
            console.log(`🎬 [${sessionId}] Subiendo audio file a Hedra...`);
            
            // Crear FormData con el archivo
            const formData = new FormData();
            formData.append('file', audioBuffer, {
                filename: 'tigrizio-audio.mp3',
                contentType: 'audio/mpeg'
            });
            
            const response = await axios.post(
                `${this.baseUrl}/assets/${audioAssetId}/upload`,
                formData,
                {
                    headers: {
                        'X-Api-Key': this.hedraApiKey,
                        ...formData.getHeaders()
                    },
                    timeout: 120000 // 2 MINUTOS
                }
            );

            console.log(`✅ [${sessionId}] Audio file subido exitosamente`);

            return {
                id: audioAssetId,
                type: 'audio',
                uploaded: true,
                uploadData: response.data
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error subiendo audio file:`, error.response?.status || error.message);
            if (error.response) {
                console.error(`📝 Hedra Error:`, error.response.data);
            }
            throw new Error(`Error subiendo audio file: ${error.message}`);
        }
    }

    // ===============================
    // PROCESAR AUDIO COMPLETO (FUNCIÓN PRINCIPAL)
    // ===============================
    async procesarAudio(audioBuffer, sessionId) {
        try {
            console.log(`🔊 [${sessionId}] Iniciando proceso completo de audio...`);

            // PASO 1: Crear audio asset en Hedra
            const audioAsset = await this.crearAudioAsset(audioBuffer, sessionId);
            
            // PASO 2: Subir audio file a Hedra
            const audioCompleto = await this.subirAudioFile(audioBuffer, audioAsset.id, sessionId);
            
            console.log(`✅ [${sessionId}] Audio completamente procesado para Hedra: ${audioCompleto.id}`);

            return {
                success: true,
                audioAssetId: audioCompleto.id,
                type: 'audio',
                uploaded: true,
                metadata: audioAsset.metadata,
                uploadData: audioCompleto.uploadData,
                bufferSize: Math.round(audioBuffer.length / 1024) + ' KB'
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error en proceso de audio:`, error.message);
            
            return {
                success: false,
                error: error.message,
                sessionId: sessionId
            };
        }
    }

    // ===============================
    // GUARDAR AUDIO EN ASSETS (OPCIONAL)
    // ===============================
    async guardarAudio(audioBuffer, fileName, sessionId) {
        try {
            console.log(`💾 [${sessionId}] Guardando audio: ${fileName}`);
            
            // Asegurar que el directorio existe
            const audioDir = path.join(__dirname, '../assets/audio');
            await fs.mkdir(audioDir, { recursive: true });
            
            // Crear nombre con timestamp si no se proporciona
            if (!fileName) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                fileName = `tigrizio_audio_${timestamp}.mp3`;
            }
            
            // Asegurar extensión .mp3
            if (!fileName.endsWith('.mp3')) {
                fileName += '.mp3';
            }
            
            const audioPath = path.join(audioDir, fileName);
            
            // Guardar archivo
            await fs.writeFile(audioPath, audioBuffer);
            
            const stats = await fs.stat(audioPath);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            console.log(`✅ [${sessionId}] Audio guardado: ${fileName} (${fileSizeKB} KB)`);
            
            return {
                success: true,
                fileName: fileName,
                filePath: audioPath,
                fileSizeKB: fileSizeKB
            };
            
        } catch (error) {
            console.error(`❌ [${sessionId}] Error guardando audio:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // CALCULAR INFORMACIÓN DEL AUDIO
    // ===============================
    calcularInfoAudio(audioBuffer, script = '') {
        const bufferSizeKB = Math.round(audioBuffer.length / 1024);
        const palabras = script ? script.split(' ').length : 0;
        const duracionEstimada = palabras > 0 ? Math.round(palabras / 2.5) : 0;
        
        return {
            bufferSizeKB: bufferSizeKB,
            palabras: palabras,
            duracionEstimada: duracionEstimada,
            script: script.substring(0, 100) + (script.length > 100 ? '...' : '')
        };
    }

    // ===============================
    // VALIDAR AUDIO BUFFER
    // ===============================
    validarAudioBuffer(audioBuffer) {
        if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
            return {
                valido: false,
                error: 'Audio buffer inválido o no proporcionado'
            };
        }
        
        const sizeKB = audioBuffer.length / 1024;
        
        if (sizeKB < 1) {
            return {
                valido: false,
                error: 'Audio demasiado pequeño (menos de 1KB)'
            };
        }
        
        if (sizeKB > 10000) { // 10MB
            return {
                valido: false,
                error: 'Audio demasiado grande (más de 10MB)'
            };
        }
        
        return {
            valido: true,
            sizeKB: Math.round(sizeKB)
        };
    }
}

module.exports = TigrizioAudioProcessor;