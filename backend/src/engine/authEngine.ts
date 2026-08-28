import crypto from 'crypto';
import { User, UserSafeProfile, Supplier } from '../models/types';
import { DatabaseSchema } from '../data/db';

export interface SessionData {
  token: string;
  userId: string;
  supplierId: string;
  createdAt: number;
  expiresAt: number;
}

export class AuthEngine {
  private static sessions: Map<string, SessionData> = new Map();
  // 24-hour session expiry
  private static readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

  public static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  public static verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const computed = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  public static createSession(user: User): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    this.sessions.set(token, {
      token,
      userId: user.id,
      supplierId: user.supplierId,
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION_MS
    });
    return token;
  }

  public static getSession(token: string): SessionData | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  public static removeSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  public static toSafeProfile(user: User, supplier?: Supplier): UserSafeProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      supplierId: user.supplierId,
      supplierName: supplier?.name || 'Enterprise Supplier',
      createdAt: user.createdAt
    };
  }

  public static ensureInitialUsers(state: DatabaseSchema): void {
    if (!state.users) {
      state.users = [];
    }

    // Default Demo Supplier Account linked to Apex Precision Engineering Ltd (sup-001)
    const demoEmail = 'demo.supplier@apex.com';
    let demoUser = state.users.find(u => u.email.toLowerCase() === demoEmail.toLowerCase());

    if (!demoUser) {
      const salt = this.generateSalt();
      demoUser = {
        id: 'usr-demo-apex',
        email: demoEmail,
        passwordHash: this.hashPassword('Password@123', salt),
        salt,
        name: 'Rajesh Sharma',
        phone: '+91 98765 43210',
        role: 'SUPPLIER',
        supplierId: 'sup-001',
        createdAt: new Date().toISOString()
      };
      state.users.push(demoUser);
    }

    // Ensure existing suppliers have linked users if needed
    const otherSuppliers = [
      { id: 'sup-002', email: 'biopharma@tradecapital.com', name: 'Dr. Ananya Roy' },
      { id: 'sup-003', email: 'techfab@tradecapital.com', name: 'Vikram Mehta' }
    ];

    otherSuppliers.forEach(sup => {
      const exists = state.users?.some(u => u.email.toLowerCase() === sup.email.toLowerCase());
      if (!exists && state.suppliers.some(s => s.id === sup.id)) {
        const salt = this.generateSalt();
        state.users?.push({
          id: `usr-${sup.id}`,
          email: sup.email,
          passwordHash: this.hashPassword('Password@123', salt),
          salt,
          name: sup.name,
          role: 'SUPPLIER',
          supplierId: sup.id,
          createdAt: new Date().toISOString()
        });
      }
    });
  }
}
