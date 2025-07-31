// ===============================
// TIGRIZIO - AUTH MANAGER
// Sistema de autenticación JWT
// ===============================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

class AuthManager {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'tigrizio-super-secret-key-2025';
        this.usersFile = path.join(__dirname, '../config/users.json');
        this.users = [];
        this.loadUsers();
    }

    // ===============================
    // CARGAR USUARIOS DESDE ARCHIVO
    // ===============================
    async loadUsers() {
        try {
            const userData = await fs.readFile(this.usersFile, 'utf8');
            this.users = JSON.parse(userData);
            console.log('✅ Usuarios cargados correctamente');
        } catch (error) {
            console.log('⚠️ Archivo de usuarios no encontrado, creando usuarios por defecto...');
            await this.createDefaultUsers();
        }
    }

    // ===============================
    // CREAR USUARIOS POR DEFECTO
    // ===============================
    async createDefaultUsers() {
        try {
            // Crear directorio config si no existe
            const configDir = path.dirname(this.usersFile);
            await fs.mkdir(configDir, { recursive: true });

            // Usuarios por defecto
            const defaultUsers = [
                {
                    id: 1,
                    username: 'admin',
                    email: 'admin@tigrizio.com',
                    password: await bcrypt.hash('admin123', 10),
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    active: true
                },
                {
                    id: 2,
                    username: 'demo',
                    email: 'demo@tigrizio.com', 
                    password: await bcrypt.hash('demo123', 10),
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    active: true
                }
            ];

            this.users = defaultUsers;
            await fs.writeFile(this.usersFile, JSON.stringify(defaultUsers, null, 2));
            console.log('✅ Usuarios por defecto creados');
            console.log('👤 Admin: admin / admin123');
            console.log('👤 Demo: demo / demo123');

        } catch (error) {
            console.error('❌ Error creando usuarios por defecto:', error);
        }
    }

    // ===============================
    // AUTENTICAR USUARIO
    // ===============================
    async authenticate(username, password) {
        try {
            const user = this.users.find(u => u.username === username && u.active);
            
            if (!user) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            const validPassword = await bcrypt.compare(password, user.password);
            
            if (!validPassword) {
                return { success: false, error: 'Contraseña incorrecta' };
            }

            // Actualizar último login
            user.lastLogin = new Date().toISOString();
            await this.saveUsers();

            // Generar token JWT
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role 
                },
                this.jwtSecret,
                { expiresIn: '24h' }
            );

            return { 
                success: true, 
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    lastLogin: user.lastLogin
                }
            };

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            return { success: false, error: 'Error interno de autenticación' };
        }
    }

    // ===============================
    // VERIFICAR TOKEN JWT
    // ===============================
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            const user = this.users.find(u => u.id === decoded.id && u.active);
            
            if (!user) {
                return { success: false, error: 'Usuario no válido' };
            }

            return { 
                success: true, 
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            };

        } catch (error) {
            return { success: false, error: 'Token inválido o expirado' };
        }
    }

    // ===============================
    // MIDDLEWARE DE AUTENTICACIÓN
    // ===============================
    requireAuth(req, res, next) {
        const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token de autenticación requerido' });
        }

        const verification = this.verifyToken(token);
        
        if (!verification.success) {
            return res.status(401).json({ error: verification.error });
        }

        req.user = verification.user;
        next();
    }

    // ===============================
    // MIDDLEWARE DE ROL ADMIN
    // ===============================
    requireAdmin(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.redirect('/access-denied');
            
        }
        next();
    }

    // ===============================
    // CREAR NUEVO USUARIO
    // ===============================
    async createUser(userData) {
        try {
            // Verificar si el usuario ya existe
            const existingUser = this.users.find(u => 
                u.username === userData.username || u.email === userData.email
            );

            if (existingUser) {
                return { success: false, error: 'Usuario o email ya existe' };
            }

            // Crear nuevo usuario
            const newUser = {
                id: Math.max(...this.users.map(u => u.id), 0) + 1,
                username: userData.username,
                email: userData.email,
                password: await bcrypt.hash(userData.password, 10),
                role: userData.role || 'user',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                active: true
            };

            this.users.push(newUser);
            await this.saveUsers();

            return { 
                success: true, 
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    createdAt: newUser.createdAt
                }
            };

        } catch (error) {
            console.error('❌ Error creando usuario:', error);
            return { success: false, error: 'Error interno creando usuario' };
        }
    }

    // ===============================
    // OBTENER TODOS LOS USUARIOS
    // ===============================
    getUsers() {
        return this.users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            active: user.active
        }));
    }

    // ===============================
    // ACTUALIZAR USUARIO
    // ===============================
    async updateUser(userId, updates) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            // Actualizar campos permitidos
            const allowedFields = ['email', 'role', 'active'];
            allowedFields.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    this.users[userIndex][field] = updates[field];
                }
            });

            // Actualizar contraseña si se proporciona
            if (updates.password) {
                this.users[userIndex].password = await bcrypt.hash(updates.password, 10);
            }

            await this.saveUsers();

            return { success: true, message: 'Usuario actualizado correctamente' };

        } catch (error) {
            console.error('❌ Error actualizando usuario:', error);
            return { success: false, error: 'Error interno actualizando usuario' };
        }
    }

    // ===============================
    // ELIMINAR USUARIO
    // ===============================
    async deleteUser(userId) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            // No permitir eliminar el admin principal
            if (this.users[userIndex].id === 1) {
                return { success: false, error: 'No se puede eliminar el administrador principal' };
            }

            this.users.splice(userIndex, 1);
            await this.saveUsers();

            return { success: true, message: 'Usuario eliminado correctamente' };

        } catch (error) {
            console.error('❌ Error eliminando usuario:', error);
            return { success: false, error: 'Error interno eliminando usuario' };
        }
    }

    // ===============================
    // GUARDAR USUARIOS EN ARCHIVO
    // ===============================
    async saveUsers() {
        try {
            await fs.writeFile(this.usersFile, JSON.stringify(this.users, null, 2));
        } catch (error) {
            console.error('❌ Error guardando usuarios:', error);
        }
    }

    // ===============================
    // GENERAR HASH DE CONTRASEÑA
    // ===============================
    async generatePasswordHash(password) {
        return await bcrypt.hash(password, 10);
    }

    // ===============================
    // ESTADÍSTICAS DE USUARIOS
    // ===============================
    getUserStats() {
        const total = this.users.length;
        const active = this.users.filter(u => u.active).length;
        const admins = this.users.filter(u => u.role === 'admin').length;
        const users = this.users.filter(u => u.role === 'user').length;

        return {
            total,
            active,
            inactive: total - active,
            admins,
            users,
            lastUsers: this.users
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(u => ({
                    username: u.username,
                    createdAt: u.createdAt,
                    role: u.role
                }))
        };
    }
}

module.exports = AuthManager;