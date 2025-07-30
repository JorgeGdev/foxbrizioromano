// ===============================
// TIGRIZIO - GENERADOR DE VOZ ÉPICA
// Síntesis de voz con ElevenLabs
// ===============================

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class TigrizioVoiceGenerator {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.voiceId = process.env.ELEVENLABS_VOICE_ID;
        this.voiceName = process.env.ELEVENLABS_VOICE_NAME || 'Gioele Mediterraneo';
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        
        // Configuración de voz optimizada para Tigrizio
        this.voiceSettings = {
            stability: 0.45,           // Estabilidad alta para profesionalismo
            similarity_boost: 0.95,   // Mantener consistencia de voz
            style: 1.0,              // Expresividad para el estilo Tigrizio
            use_speaker_boost: true   // Mejorar claridad
        };
        
        console.log('🔊 Tigrizio Voice Generator iniciado');
        console.log(`🎙️ Voz: ${this.voiceName}`);
    }

    // ===============================
    // GENERAR AUDIO DESDE SCRIPT
    // ===============================
    async generateAudio(script, outputFileName = null) {
        try {
            console.log('🎙️ Generando audio de Tigrizio...');
            console.log(`📝 Script (${script.split(' ').length} palabras): ${script.substring(0, 100)}...`);
            
            // Preparar nombre del archivo
            if (!outputFileName) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                outputFileName = `tigrizio_${timestamp}.mp3`;
            }
            
            // Asegurar que termine en .mp3
            if (!outputFileName.endsWith('.mp3')) {
                outputFileName += '.mp3';
            }
            
            const outputPath = path.join(__dirname, '../assets/audio', outputFileName);
            
            // Llamar a ElevenLabs API
            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${this.voiceId}`,
                {
                    text: script,
                    model_id: "eleven_multilingual_v2", // Mejor para italiano/español
                    voice_settings: this.voiceSettings
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    responseType: 'arraybuffer'
                }
            );
            
            // Guardar archivo de audio
            await fs.writeFile(outputPath, response.data);
            
            // Obtener información del archivo
            const stats = await fs.stat(outputPath);
            const fileSizeKB = Math.round(stats.size / 1024);
            
            console.log('✅ Audio generado exitosamente');
            console.log(`📁 Archivo: ${outputFileName}`);
            console.log(`📊 Tamaño: ${fileSizeKB} KB`);
            console.log(`🎵 Duración estimada: ~${Math.round(script.split(' ').length / 2.5)}s`);
            
            return {
                success: true,
                audioPath: outputPath,
                fileName: outputFileName,
                fileSizeKB: fileSizeKB,
                estimatedDuration: Math.round(script.split(' ').length / 2.5),
                script: script,
                voiceUsed: this.voiceName
            };
            
        } catch (error) {
            console.error('❌ Error generando audio:', error.message);
            
            // Error específico de ElevenLabs
            if (error.response) {
                console.error('📊 Status:', error.response.status);
                console.error('📝 ElevenLabs Error:', error.response.data);
            }
            
            return {
                success: false,
                error: 'Error generando audio',
                details: error.message,
                status: error.response?.status
            };
        }
    }

    // ===============================
    // VERIFICAR CARACTERES DISPONIBLES
    // ===============================
    async checkCharacterUsage() {
        try {
            console.log('📊 Verificando uso de caracteres...');
            
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            
            const usage = response.data.subscription;
            const charactersUsed = usage.character_count;
            const charactersLimit = usage.character_limit;
            const remainingCharacters = charactersLimit - charactersUsed;
            const percentageUsed = Math.round((charactersUsed / charactersLimit) * 100);
            
            console.log('📊 USO DE CARACTERES:');
            console.log(`   • Usados: ${charactersUsed.toLocaleString()}`);
            console.log(`   • Límite: ${charactersLimit.toLocaleString()}`);
            console.log(`   • Restantes: ${remainingCharacters.toLocaleString()}`);
            console.log(`   • Porcentaje usado: ${percentageUsed}%`);
            
            return {
                success: true,
                charactersUsed: charactersUsed,
                charactersLimit: charactersLimit,
                remainingCharacters: remainingCharacters,
                percentageUsed: percentageUsed,
                canGenerate: remainingCharacters > 100 // Necesita al menos 100 caracteres
            };
            
        } catch (error) {
            console.error('❌ Error verificando uso:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // LISTAR VOCES DISPONIBLES
    // ===============================
    async listAvailableVoices() {
        try {
            console.log('🎙️ Obteniendo voces disponibles...');
            
            const response = await axios.get(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            
            const voices = response.data.voices;
            
            console.log(`🎙️ VOCES DISPONIBLES (${voices.length}):`);
            voices.forEach((voice, index) => {
                const ageGender = `${voice.labels?.age || 'Unknown'} ${voice.labels?.gender || 'Unknown'}`;
                console.log(`   ${index + 1}. ${voice.name} (${ageGender}) - ${voice.voice_id}`);
            });
            
            // Buscar nuestra voz configurada
            const currentVoice = voices.find(v => v.voice_id === this.voiceId);
            if (currentVoice) {
                console.log(`\n✅ Voz actual: ${currentVoice.name} (${currentVoice.voice_id})`);
            }
            
            return {
                success: true,
                voices: voices,
                currentVoice: currentVoice
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo voces:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // GENERAR MÚLTIPLES AUDIOS
    // ===============================
    async generateMultipleAudios(scripts, baseFileName = 'tigrizio') {
        try {
            console.log(`🎙️ Generando ${scripts.length} audios...`);
            
            const results = [];
            
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const fileName = `${baseFileName}_v${i + 1}`;
                
                console.log(`\n🎭 Audio ${i + 1}/${scripts.length}:`);
                
                const result = await this.generateAudio(script, fileName);
                results.push({
                    variation: i + 1,
                    ...result
                });
                
                // Pausa entre llamadas para no saturar la API
                if (i < scripts.length - 1) {
                    console.log('⏳ Pausa de 2s...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`\n🎉 ${successCount}/${scripts.length} audios generados exitosamente`);
            
            return {
                success: true,
                results: results,
                totalGenerated: successCount,
                totalAttempted: scripts.length
            };
            
        } catch (error) {
            console.error('❌ Error generando múltiples audios:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // TEST DE CONEXIÓN ELEVENLABS
    // ===============================
    async testConnection() {
        try {
            console.log('🔬 Probando conexión con ElevenLabs...');
            
            // Verificar que la API key funciona
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            
            const userData = response.data;
            console.log('✅ ElevenLabs conectado correctamente');
            console.log(`👤 Usuario: ${userData.subscription?.tier || 'Free'}`);
            console.log(`🎙️ Voz configurada: ${this.voiceName} (${this.voiceId})`);
            
            return {
                success: true,
                user: userData,
                voiceId: this.voiceId,
                voiceName: this.voiceName
            };
            
        } catch (error) {
            console.error('❌ Error conectando con ElevenLabs:', error.message);
            if (error.response) {
                console.error('📊 Status:', error.response.status);
                console.error('📝 Error data:', error.response.data);
            }
            
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    // ===============================
    // CALCULAR COSTO ESTIMADO
    // ===============================
    calculateEstimatedCost(script) {
        const characterCount = script.length;
        
        // Precios aproximados de ElevenLabs (pueden cambiar)
        const costPer1000Chars = 0.30; // USD por 1000 caracteres (aprox)
        const estimatedCost = (characterCount / 1000) * costPer1000Chars;
        
        return {
            characterCount: characterCount,
            estimatedCostUSD: Math.round(estimatedCost * 10000) / 10000, // 4 decimales
            isExpensive: estimatedCost > 0.10 // Más de 10 centavos
        };
    }
}

module.exports = TigrizioVoiceGenerator;