# 🐅 TIGRIZIO VIDEO GENERATOR

**Sistema automático de generación de videos deportivos con IA**  
*Pipeline completo: Twitter → Script → Audio → Video*

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Railway](https://img.shields.io/badge/Deploy-Railway-purple.svg)](https://railway.app)

---

## 🎬 ¿Qué es Tigrizio?

**Tigrizio Romano** es un sistema completo de automatización que genera videos profesionales de fútbol usando inteligencia artificial. Combina scraping de tweets, procesamiento con IA, síntesis de voz y generación de videos con presentadores virtuales.

### ✨ Características Principales

- 🤖 **Generación automática** con OpenAI GPT-4 + RAG
- 🎭 **9 presentadores virtuales** (Tigrizio 1-9) con Hedra AI
- 🔊 **Síntesis de voz italiana** con ElevenLabs
- 📱 **Bot de Telegram integrado** con pipeline completo
- 🗄️ **Base de datos inteligente** con Supabase + vectores
- ⏰ **Scraping automático** cada 3 horas en horarios Europa
- 📊 **Sistema VIP** para detectar noticias importantes
- 📝 **Captions automáticos** para redes sociales

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│ 📱 Telegram Bot (Control Center)                           │
│ Comando: tigrizio[1-9]@keyword → Video completo            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│ ⚡ Backend Pipeline (Node.js + Express)                    │
│ ┌─────────────────────────────────────────────────┐       │
│ │ 🐦 Scraper │ 🧠 Script │ 🔊 Audio │ 🎬 Video │       │
│ └─────────────────────────────────────────────────┘       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│ 🤖 Integraciones IA/API                                     │
│ TwitterAPI │ OpenAI │ ElevenLabs │ Hedra │ Supabase        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Cuentas en: OpenAI, ElevenLabs, Hedra, Supabase, TwitterAPI.io
- Bot de Telegram configurado

### 1. Clonar Repositorio

```bash
git clone https://github.com/tu-usuario/tigrizio-video-generator.git
cd tigrizio-video-generator
npm install
```

### 2. Configurar Variables de Entorno

Crear archivo `.env` en la raíz:

```env
# Telegram
TELEGRAM_BOT_TOKEN=tu_bot_token
TELEGRAM_CHAT_ID=tu_chat_id

# Supabase
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key

# OpenAI
OPENAI_API_KEY=tu_openai_key

# ElevenLabs
ELEVENLABS_API_KEY=tu_elevenlabs_key
ELEVENLABS_VOICE_ID=tu_voice_id
ELEVENLABS_VOICE_NAME=GianP

# Hedra
HEDRA_API_KEY=tu_hedra_key

# TwitterAPI.io
TWITTERAPI_KEY=tu_twitterapi_key

# Server
PORT=3000
NODE_ENV=production
```

### 3. Configurar Base de Datos

Ejecutar el script SQL en Supabase (ver `database/schema.sql`):

```sql
-- Crear tabla con vectores RAG y sistema VIP
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE fabrizio_tweets (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    -- ... resto del schema
);
```

### 4. Agregar Imágenes de Presentadores

Colocar las imágenes en `assets/images/`:
- `tigrizio1.png`
- `tigrizio2.png`
- ... hasta `tigrizio9.png`

---

## 🎮 Uso del Sistema

### Comandos del Bot de Telegram

| Comando | Descripción |
|---------|-------------|
| `tigrizio[1-9]@keyword` | **Generar video completo** (ej: `tigrizio3@haaland`) |
| `/stats` | Estadísticas del sistema |
| `/scrape` | Scraping manual de tweets |
| `/auto on/off` | Activar/desactivar scraping automático |
| `/vip` | Mostrar tweets VIP recientes |
| `/recent` | Mostrar tweets recientes |
| `/help` | Ayuda completa |

### Ejemplos de Generación

```
tigrizio1@real madrid        # Video sobre Real Madrid
tigrizio5@transfer news      # Noticias de fichajes
tigrizio9@here we go         # Tweets con "HERE WE GO"
```

### Pipeline de Generación (10-15 minutos)

1. 🔍 **Búsqueda en RAG**: Encuentra tweets relacionados
2. 🎭 **Script con IA**: Genera guión épico (75-80 palabras)
3. 🔊 **Audio**: Síntesis de voz italiana con ElevenLabs
4. 📸 **Imagen**: Procesa presentador seleccionado
5. 🎬 **Video**: Genera video final con Hedra AI
6. 📝 **Caption**: Crea descripción para redes sociales

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js + Express** - Servidor principal
- **Axios** - Cliente HTTP para APIs
- **dotenv** - Manejo de variables de entorno

### Inteligencia Artificial
- **OpenAI GPT-4** - Generación de scripts deportivos
- **ElevenLabs** - Síntesis de voz realista
- **Hedra AI** - Generación de videos con presentadores
- **Supabase Vector** - Base de datos RAG

### Automatización
- **node-telegram-bot-api** - Bot de Telegram
- **TwitterAPI.io** - Scraping de tweets de Fabrizio Romano
- **Cron Jobs** - Scraping automático cada 3 horas

---

## 📊 Sistema VIP

El sistema detecta automáticamente tweets importantes usando keywords:

```javascript
const vipKeywords = [
    'here we go', 'done deal', 'breaking', 'official',
    'confirmed', 'exclusive', 'ufficiale', 'comunicado oficial'
];
```

Los tweets VIP reciben prioridad y alertas instantáneas.

---

## 🚀 Despliegue en Railway

### 1. Preparar para Railway

```bash
# Agregar script de Railway en package.json
"railway-start": "node backend/start-bot.js"
```

### 2. Configurar Variables

En Railway, agregar todas las variables del `.env`

### 3. Deploy

```bash
railway login
railway init
railway up
```

### 4. Configurar Domain (Opcional)

Para el frontend web, Railway asignará un dominio automático.

---

## 📁 Estructura del Proyecto

tigrizio/
├── backend/
│   ├── bot-handlers/
│   │   ├── approval-handler.js      # ✅ Validación de scripts
│   │   ├── command-handler.js       # ⚡ /start, /stats, etc.
│   │   ├── message-handler.js       # 💬 tigrizio[1-9]@keyword
│   │   └── video-pipeline.js        # 🎬 Pipeline generación
│   ├── utils/
│   │   ├── bot-messages.js          # 📋 Templates de mensajes
│   │   └── session-manager.js       # 📋 Gestión de sesiones
│   ├── telegram-bot.js              # 🤖 Bot principal
│   ├── twitter-scraper.js           # 🐦 Scraping optimizado
│   ├── script-generator.js          # 🧠 OpenAI GPT-4
│   ├── voice-generator.js           # 🔊 ElevenLabs
│   ├── video-generator.js           # 🎞️ Hedra AI
│   ├── audio-processor.js           # 🔊 Procesamiento audio
│   ├── image-processor.js           # 📸 Procesamiento imágenes
│   ├── supabase-manager.js          # 🗄️ Base de datos
│   ├── auth-manager.js              # 🔐 JWT auth
│   ├── web-server.js                # 🌐 Web con autenticación
│   ├── server.js                    # 🌐 Web (bot mode)
│   └── combined-server.js           # 🚀 Servidor unificado
├── frontend/
│   ├── login.html                   # 🔐 Login web
│   ├── dashboard.html               # 📊 Dashboard
│   ├── admin.html                   # 👑 Panel admin
│   └── access-denied.html           # 🛡️ Acceso denegado
├── assets/
│   ├── images/tigrizio[1-9].png     # 🎭 Presentadores
│   ├── audio/                       # 🔊 Audios generados
│   ├── videos/                      # 🎬 Videos finales
│   └── captions/                    # 📝 Captions virales
├── database/schema.sql              # 🗃️ Schema Supabase
├── package.json                     # 📦 Dependencias
├── .env.example                     # 🔑 Template variables
└── README.md                        # 📖 Este archivo

---

## 🔧 Optimizaciones

### Tokens y Costos
- **Scraping inteligente**: Solo en horarios activos de Europa
- **RAG optimizado**: Búsqueda vectorial eficiente
- **Deduplicación**: Evita tweets repetidos
- **Caching**: Reutiliza assets cuando es posible

### Rendimiento
- **Procesamiento paralelo**: Audio e imagen simultáneos
- **Timeouts optimizados**: Manejo robusto de APIs
- **Reintentos automáticos**: Recuperación de errores
- **Logs duales**: Consola + Telegram para monitoreo

---

## 📈 Métricas del Sistema

- **Tiempo de generación**: 10-15 minutos por video
- **Calidad de audio**: 44.1kHz, italiano profesional
- **Resolución de video**: 720p, formato 9:16 (vertical)
- **Costo aproximado**: $1-2 USD por video
- **Tweets procesados**: Ilimitados con RAG
- **Uptime**: 99.9% en Railway

---

-- Ejecutar en Supabase:
CREATE TABLE fabrizio_tweets (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT UNIQUE,
    content TEXT NOT NULL,
    original_content TEXT,
    tweet_created_at TIMESTAMP,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    is_vip BOOLEAN DEFAULT FALSE,
    vip_keyword TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- **Fabrizio Romano** por ser la fuente de noticias más confiable del fútbol
- **OpenAI** por GPT-4 y embeddings
- **ElevenLabs** por síntesis de voz realista
- **Hedra AI** por generación de videos con IA
- **Railway** por hosting confiable

---

## 📞 Contacto

- 🌐 **GitHub**: [@tu-usuario](https://github.com/tu-usuario)
- 📧 **Email**: tu-email@ejemplo.com
- 💼 **LinkedIn**: [Tu Perfil](https://linkedin.com/in/tu-perfil)

---

<div align="center">

**⚽ Made with ❤️ for football fans worldwide ⚽**

*Si este proyecto te resultó útil, dale una ⭐ en GitHub*

</div>