// ===============================
// TIGRIZIO - SESSION MANAGER
// Manejo de sesiones pendientes de aprobación
// ===============================

class SessionManager {
  constructor() {
    this.pendingApprovals = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
    
    // Limpiar sesiones expiradas cada 10 minutos
    setInterval(() => {
      this.cleanExpiredSessions();
    }, 10 * 60 * 1000);
    
    console.log('📋 Session Manager iniciado');
  }

  // ===============================
  // CREAR NUEVA SESIÓN
  // ===============================
  createSession(sessionId, sessionData) {
    try {
      this.pendingApprovals.set(sessionId, {
        ...sessionData,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      });
      
      console.log(`✅ Sesión creada: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error creando sesión:', error);
      return false;
    }
  }

  // ===============================
  // OBTENER SESIÓN
  // ===============================
  getSession(sessionId) {
    const session = this.pendingApprovals.get(sessionId);
    
    if (!session) {
      console.log(`⚠️ Sesión no encontrada: ${sessionId}`);
      return null;
    }
    
    // Verificar si expiró
    if (Date.now() > session.expiresAt) {
      console.log(`⏰ Sesión expirada: ${sessionId}`);
      this.deleteSession(sessionId);
      return null;
    }
    
    return session;
  }

  // ===============================
  // VERIFICAR SI SESIÓN EXISTE
  // ===============================
  hasSession(sessionId) {
    return this.pendingApprovals.has(sessionId) && this.getSession(sessionId) !== null;
  }

  // ===============================
  // ELIMINAR SESIÓN
  // ===============================
  deleteSession(sessionId) {
    const deleted = this.pendingApprovals.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ Sesión eliminada: ${sessionId}`);
    }
    return deleted;
  }

  // ===============================
  // ACTUALIZAR SESIÓN
  // ===============================
  updateSession(sessionId, updates) {
    const session = this.getSession(sessionId);
    if (!session) return false;
    
    const updatedSession = {
      ...session,
      ...updates,
      timestamp: Date.now() // Actualizar timestamp
    };
    
    this.pendingApprovals.set(sessionId, updatedSession);
    console.log(`🔄 Sesión actualizada: ${sessionId}`);
    return true;
  }

  // ===============================
  // LIMPIAR SESIONES EXPIRADAS
  // ===============================
  cleanExpiredSessions() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [sessionId, session] of this.pendingApprovals.entries()) {
      if (now > session.expiresAt) {
        this.pendingApprovals.delete(sessionId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 Limpiadas ${expiredCount} sesiones expiradas`);
    }
  }

  // ===============================
  // OBTENER ESTADÍSTICAS
  // ===============================
  getStats() {
    const totalSessions = this.pendingApprovals.size;
    const now = Date.now();
    
    let activeSessions = 0;
    let expiringSoon = 0;
    
    for (const session of this.pendingApprovals.values()) {
      if (now < session.expiresAt) {
        activeSessions++;
        
        // Expira en menos de 5 minutos
        if (session.expiresAt - now < 5 * 60 * 1000) {
          expiringSoon++;
        }
      }
    }
    
    return {
      total: totalSessions,
      active: activeSessions,
      expiringSoon: expiringSoon,
      expired: totalSessions - activeSessions
    };
  }

  // ===============================
  // OBTENER TODAS LAS SESIONES ACTIVAS
  // ===============================
  getActiveSessions() {
    const activeSessions = [];
    const now = Date.now();
    
    for (const [sessionId, session] of this.pendingApprovals.entries()) {
      if (now < session.expiresAt) {
        activeSessions.push({
          sessionId,
          ...session,
          timeRemaining: session.expiresAt - now
        });
      }
    }
    
    return activeSessions;
  }

  // ===============================
  // GENERAR ID DE SESIÓN ÚNICO
  // ===============================
  generateSessionId(prefix = 'VIDEO') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  // ===============================
  // LIMPIAR TODAS LAS SESIONES
  // ===============================
  clearAllSessions() {
    const count = this.pendingApprovals.size;
    this.pendingApprovals.clear();
    console.log(`🧹 Todas las sesiones limpiadas: ${count}`);
    return count;
  }
}

module.exports = SessionManager;