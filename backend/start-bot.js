// ===============================
// TIGRIZIO - INICIAR BOT COMPLETO
// ===============================

const TigrizioBot = require('./telegram-bot');

async function startTigrizioBot() {
    console.log('🐅 ===============================');
    console.log('🐅 INICIANDO TIGRIZIO BOT COMPLETO');
    console.log('🐅 ===============================');
    
    try {
        // Crear instancia del bot
        const bot = new TigrizioBot();
        
        // Iniciar el bot
        bot.start();
        
        console.log('✅ Bot iniciado correctamente');
        console.log('📱 Verifica tu Telegram - deberías recibir mensaje de inicio');
        console.log('🔧 Usa Ctrl+C para detener el bot');
        
        // Manejo elegante de cierre
        process.on('SIGINT', () => {
            console.log('\n🛑 Deteniendo Tigrizio Bot...');
            bot.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('\n🛑 Deteniendo Tigrizio Bot...');
            bot.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando el bot:', error.message);
        process.exit(1);
    }
}

// Iniciar si se ejecuta directamente
if (require.main === module) {
    startTigrizioBot().catch(console.error);
}

module.exports = { startTigrizioBot };