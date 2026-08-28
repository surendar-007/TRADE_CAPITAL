import fs from 'fs/promises';
import path from 'path';
import { 
  Supplier, 
  Buyer, 
  CapitalProvider, 
  Invoice, 
  FinancingRecord, 
  FinancingOffer, 
  AgentLog,
  User 
} from '../models/types';
import { 
  INITIAL_SUPPLIERS, 
  INITIAL_BUYERS, 
  INITIAL_PROVIDERS, 
  INITIAL_INVOICES, 
  INITIAL_LOGS 
} from './mockData';
import { AuthEngine } from '../engine/authEngine';

export interface DatabaseSchema {
  users?: User[];
  suppliers: Supplier[];
  buyers: Buyer[];
  providers: CapitalProvider[];
  invoices: Invoice[];
  offersMap: Record<string, FinancingOffer[]>;
  financingRecords: FinancingRecord[];
  logs: AgentLog[];
}

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export class Database {
  private static state: DatabaseSchema | null = null;
  private static savingPromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      try {
        const fileData = await fs.readFile(DB_FILE, 'utf-8');
        this.state = JSON.parse(fileData);
        if (this.state) {
          AuthEngine.ensureInitialUsers(this.state);
        }
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          // File does not exist, initialize with mock data
          this.state = {
            users: [],
            suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
            buyers: JSON.parse(JSON.stringify(INITIAL_BUYERS)),
            providers: JSON.parse(JSON.stringify(INITIAL_PROVIDERS)),
            invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
            offersMap: {},
            financingRecords: [],
            logs: JSON.parse(JSON.stringify(INITIAL_LOGS))
          };
          AuthEngine.ensureInitialUsers(this.state);
          await this.save();
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  static getState(): DatabaseSchema {
    if (!this.state) {
      throw new Error("Database not initialized");
    }
    return this.state;
  }

  static async save(): Promise<void> {
    if (!this.state) return;
    
    // Prevent overlapping saves causing file corruption
    if (this.savingPromise) {
      await this.savingPromise;
    }

    const stateToSave = JSON.stringify(this.state, null, 2);
    
    this.savingPromise = fs.writeFile(DB_FILE, stateToSave, 'utf-8')
      .then(() => { this.savingPromise = null; })
      .catch((err) => {
        this.savingPromise = null;
        console.error('Failed to save database:', err);
      });

    return this.savingPromise;
  }

  static async reset(): Promise<void> {
    const existingUsers = this.state?.users || [];
    this.state = {
      users: existingUsers,
      suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
      buyers: JSON.parse(JSON.stringify(INITIAL_BUYERS)),
      providers: JSON.parse(JSON.stringify(INITIAL_PROVIDERS)),
      invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
      offersMap: {},
      financingRecords: [],
      logs: JSON.parse(JSON.stringify(INITIAL_LOGS))
    };
    AuthEngine.ensureInitialUsers(this.state);
    await this.save();
  }
}
