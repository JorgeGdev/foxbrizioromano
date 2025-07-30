// ===============================
// TIGRIZIO - IMAGE PROCESSOR
// Procesamiento de imágenes para Hedra AI
// ===============================

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class TigrizioImageProcessor {
    constructor() {
        this.hedraApiKey = process.env.HEDRA_API_KEY;
        this.baseUrl = 'https://api.hedra.com/web-app/public';
        this.imagesDir = path.join(__dirname, '../assets/images');
        
        console.log('📸 Tigrizio Image Processor iniciado');
    }

    // ===============================
    // CARGAR IMAGEN DESDE ASSETS (PASO 0)
    // ===============================
    async cargarImagen(imageName, sessionId) {
        try {
            console.log(`📸 [${sessionId}] Cargando imagen: ${imageName}`);
            
            // Construir path de la imagen
            const imagePath = path.join(this.imagesDir, `${imageName}.png`);
            
            // Verificar que el archivo existe
            try {
                await fs.access(imagePath);
            } catch (error) {
                throw new Error(`Imagen no encontrada: ${imagePath}`);
            }
            
            // Leer el archivo
            const imageBuffer = await fs.readFile(imagePath);
            const imageSize = (imageBuffer.length / 1024).toFixed(2);
            
            console.log(`✅ [${sessionId}] Imagen cargada: ${imagePath} (${imageSize} KB)`);
            
            return {
                success: true,
                buffer: imageBuffer,
                nombre: imageName,
                archivo: imagePath,
                tamaño: imageSize + ' KB',
                tamañoBytes: imageBuffer.length
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error cargando imagen:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================
    // CREAR IMAGEN ASSET EN HEDRA (PASO 1)
    // ===============================
    async crearImagenAsset(imageBuffer, imageName, sessionId) {
        try {
            console.log(`🎬 [${sessionId}] Creando imagen asset en Hedra...`);
            
            // Convertir imagen a base64
            const imageBase64 = imageBuffer.toString('base64');
            
            const response = await axios.post(
                `${this.baseUrl}/assets`,
                {
                    name: `tigrizio-${imageName}.png`,
                    type: 'image',
                    data: imageBase64
                },
                {
                    headers: {
                        'X-Api-Key': this.hedraApiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // 2 MINUTOS
                }
            );

            const imageAssetId = response.data.id;
            console.log(`✅ [${sessionId}] Imagen asset creada: ${imageAssetId}`);

            return {
                id: imageAssetId,
                type: 'image',
                name: `tigrizio-${imageName}.png`,
                metadata: response.data
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error creando imagen asset:`, error.response?.status || error.message);
            if (error.response) {
                console.error(`📝 Hedra Error:`, error.response.data);
            }
            throw new Error(`Error creando imagen asset: ${error.message}`);
        }
    }

    // ===============================
    // SUBIR IMAGEN FILE A HEDRA (PASO 2)
    // ===============================
    async subirImagenFile(imageBuffer, imageAssetId, imageName, sessionId) {
        try {
            console.log(`🎬 [${sessionId}] Subiendo imagen file a Hedra...`);
            
            // Crear FormData con el archivo
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: `tigrizio-${imageName}.png`,
                contentType: 'image/png'
            });
            
            const response = await axios.post(
                `${this.baseUrl}/assets/${imageAssetId}/upload`,
                formData,
                {
                    headers: {
                        'X-Api-Key': this.hedraApiKey,
                        ...formData.getHeaders()
                    },
                    timeout: 120000 // 2 MINUTOS
                }
            );

            console.log(`✅ [${sessionId}] Imagen file subida exitosamente`);

            return {
                id: imageAssetId,
                type: 'image',
                uploaded: true,
                uploadData: response.data
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error subiendo imagen file:`, error.response?.status || error.message);
            if (error.response) {
                console.error(`📝 Hedra Error:`, error.response.data);
            }
            throw new Error(`Error subiendo imagen file: ${error.message}`);
        }
    }

    // ===============================
    // PROCESAR IMAGEN COMPLETA (FUNCIÓN PRINCIPAL)
    // ===============================
    async procesarImagen(imageName, sessionId) {
        try {
            console.log(`📸 [${sessionId}] Iniciando proceso completo de imagen...`);

            // PASO 0: Cargar imagen desde carpeta local
            const imagenData = await this.cargarImagen(imageName, sessionId);
            
            if (!imagenData.success) {
                throw new Error(imagenData.error);
            }
            
            // PASO 1: Crear imagen asset en Hedra
            const imagenAsset = await this.crearImagenAsset(imagenData.buffer, imageName, sessionId);
            
            // PASO 2: Subir imagen file a Hedra
            const imagenCompleta = await this.subirImagenFile(imagenData.buffer, imagenAsset.id, imageName, sessionId);
            
            console.log(`✅ [${sessionId}] Imagen completamente procesada para Hedra: ${imagenCompleta.id}`);

            return {
                success: true,
                imageAssetId: imagenCompleta.id,
                type: 'image',
                uploaded: true,
                
                // Datos de la imagen local
                nombre: imagenData.nombre,
                archivo: imagenData.archivo,
                tamaño: imagenData.tamaño,
                tamañoBytes: imagenData.tamañoBytes,
                
                // Datos de Hedra
                metadata: imagenAsset.metadata,
                uploadData: imagenCompleta.uploadData
            };

        } catch (error) {
            console.error(`❌ [${sessionId}] Error en proceso de imagen:`, error.message);
            
            return {
                success: false,
                error: error.message,
                sessionId: sessionId
            };
        }
    }

    // ===============================
    // VERIFICAR IMÁGENES DISPONIBLES
    // ===============================
    async verificarImagenesDisponibles() {
        try {
            const archivos = await fs.readdir(this.imagesDir);
            
            const imagenesDisponibles = archivos
                .filter(archivo => archivo.endsWith('.png'))
                .map(archivo => archivo.replace('.png', ''));
            
            console.log(`📸 Imágenes disponibles: ${imagenesDisponibles.join(', ')}`);
            
            return {
                success: true,
                imagenes: imagenesDisponibles,
                total: imagenesDisponibles.length
            };
            
        } catch (error) {
            console.error('❌ Error verificando imágenes:', error.message);
            return {
                success: false,
                error: error.message,
                imagenes: []
            };
        }
    }

    // ===============================
    // VALIDAR IMAGEN
    // ===============================
    async validarImagen(imageName, sessionId) {
        try {
            console.log(`🔍 [${sessionId}] Validando imagen: ${imageName}`);
            
            // Verificar que existe
            const imagePath = path.join(this.imagesDir, `${imageName}.png`);
            
            try {
                await fs.access(imagePath);
            } catch (error) {
                return {
                    valida: false,
                    error: `Imagen no encontrada: ${imageName}.png`,
                    sugerencias: await this.obtenerSugerencias()
                };
            }
            
            // Verificar tamaño
            const stats = await fs.stat(imagePath);
            const sizeKB = stats.size / 1024;
            
            if (sizeKB < 1) {
                return {
                    valida: false,
                    error: 'Imagen demasiado pequeña (menos de 1KB)'
                };
            }
            
            if (sizeKB > 10000) { // 10MB
                return {
                    valida: false,
                    error: 'Imagen demasiado grande (más de 10MB)'
                };
            }
            
            console.log(`✅ [${sessionId}] Imagen válida: ${imageName} (${Math.round(sizeKB)} KB)`);
            
            return {
                valida: true,
                nombre: imageName,
                sizeKB: Math.round(sizeKB),
                archivo: imagePath
            };
            
        } catch (error) {
            console.error(`❌ [${sessionId}] Error validando imagen:`, error.message);
            return {
                valida: false,
                error: error.message
            };
        }
    }

    // ===============================
    // OBTENER SUGERENCIAS DE IMÁGENES
    // ===============================
    async obtenerSugerencias() {
        try {
            const resultado = await this.verificarImagenesDisponibles();
            
            if (resultado.success && resultado.imagenes.length > 0) {
                return resultado.imagenes.slice(0, 5); // Máximo 5 sugerencias
            }
            
            return [];
            
        } catch (error) {
            return [];
        }
    }

    // ===============================
    // INFORMACIÓN DE LA IMAGEN
    // ===============================
    async obtenerInfoImagen(imageName, sessionId) {
        try {
            const validacion = await this.validarImagen(imageName, sessionId);
            
            if (!validacion.valida) {
                return validacion;
            }
            
            const imagePath = path.join(this.imagesDir, `${imageName}.png`);
            const stats = await fs.stat(imagePath);
            
            return {
                success: true,
                nombre: imageName,
                archivo: imagePath,
                sizeKB: Math.round(stats.size / 1024),
                sizeBytes: stats.size,
                fechaModificacion: stats.mtime,
                extension: 'png',
                tipo: 'image/png'
            };
            
        } catch (error) {
            console.error(`❌ [${sessionId}] Error obteniendo info:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = TigrizioImageProcessor;