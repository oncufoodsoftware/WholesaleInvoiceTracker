import { 
  users, 
  branches, 
  suppliers, 
  invoices, 
  financialTransactions,
  userActions,
  type User, 
  type InsertUser, 
  type Branch,
  type InsertBranch,
  type Supplier,
  type InsertSupplier,
  type Invoice,
  type InsertInvoice,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type UserAction,
  type InsertUserAction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, like, or, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByBranch(branchId: number): Promise<User[]>;

  // Branch methods
  getBranch(id: number): Promise<Branch | undefined>;
  getBranchByName(name: string): Promise<Branch | undefined>;
  getAllBranches(): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<boolean>;

  // Supplier methods
  getSupplier(id: number): Promise<Supplier | undefined>;
  getAllSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByBranch(branchId: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getInvoicesByType(type: string): Promise<Invoice[]>;
  getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]>;
  getInvoicesBySupplier(supplierId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  filterInvoices(filters: InvoiceFilters): Promise<Invoice[]>;

  // Financial transaction methods
  getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined>;
  getAllFinancialTransactions(): Promise<FinancialTransaction[]>;
  getDailyTransactions(branchId: number, date: Date): Promise<FinancialTransaction[]>;
  getSummarizedDailyTransactions(branchId: number, date: Date): Promise<DailyFinancialSummary>;
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction | undefined>;
  deleteFinancialTransaction(id: number): Promise<boolean>;
  getTransactionsByDateRange(branchId: number, startDate: Date, endDate: Date): Promise<FinancialTransaction[]>;
  getMonthlySummary(branchId: number, year: number, month: number): Promise<MonthlySummary>;

  // User actions methods
  logUserAction(action: InsertUserAction): Promise<UserAction>;
  getUserActions(limit?: number): Promise<UserAction[]>;
  getUserActionsByUser(userId: number, limit?: number): Promise<UserAction[]>;
  getUserActionsByEntityType(entityType: string, limit?: number): Promise<UserAction[]>;
  getUserActionsByEntityId(entityType: string, entityId: number, limit?: number): Promise<UserAction[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

// Type for invoice filters
export interface InvoiceFilters {
  supplierId?: number;
  branchId?: number;
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// Types for financial summaries
export interface DailyFinancialSummary {
  totalSales: number;
  cardPayments: number;
  cashPayments: number;
  totalExpenses: number;
  expenseCategories: { [category: string]: number };
  netBalance: number;
}

export interface MonthlySummary {
  totalSales: number;
  totalExpenses: number;
  netBalance: number;
  salesByDay: { [day: string]: number };
  expensesByDay: { [day: string]: number };
  expensesByCategory: { [category: string]: number };
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day in ms
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.count > 0;
  }

  async getUsersByBranch(branchId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.branchId, branchId));
  }

  // Branch methods
  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch || undefined;
  }

  async getBranchByName(name: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.name, name));
    return branch || undefined;
  }

  async getAllBranches(): Promise<Branch[]> {
    return db.select().from(branches);
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db
      .insert(branches)
      .values(branch)
      .returning();
    return newBranch;
  }

  async updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch | undefined> {
    const [updatedBranch] = await db
      .update(branches)
      .set(branch)
      .where(eq(branches.id, id))
      .returning();
    return updatedBranch;
  }

  async deleteBranch(id: number): Promise<boolean> {
    const result = await db
      .delete(branches)
      .where(eq(branches.id, id));
    return result.count > 0;
  }

  // Supplier methods
  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db
      .insert(suppliers)
      .values(supplier)
      .returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
    return result.count > 0;
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoicesByBranch(branchId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.branchId, branchId)).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.status, status)).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoicesByType(type: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.type, type)).orderBy(desc(invoices.invoiceDate));
  }

  async getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    return db.select().from(invoices)
      .where(
        and(
          gte(invoices.invoiceDate, startDate),
          lte(invoices.invoiceDate, endDate)
        )
      )
      .orderBy(desc(invoices.invoiceDate));
  }

  async getInvoicesBySupplier(supplierId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.supplierId, supplierId)).orderBy(desc(invoices.invoiceDate));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id));
    return result.count > 0;
  }

  async filterInvoices(filters: InvoiceFilters): Promise<Invoice[]> {
    let query = db.select().from(invoices);
    
    const conditions = [];
    
    if (filters.supplierId) {
      conditions.push(eq(invoices.supplierId, filters.supplierId));
    }
    
    if (filters.branchId) {
      conditions.push(eq(invoices.branchId, filters.branchId));
    }
    
    if (filters.status) {
      conditions.push(eq(invoices.status, filters.status));
    }
    
    if (filters.type) {
      conditions.push(eq(invoices.type, filters.type));
    }
    
    if (filters.startDate && filters.endDate) {
      conditions.push(
        and(
          gte(invoices.invoiceDate, filters.startDate),
          lte(invoices.invoiceDate, filters.endDate)
        )
      );
    }
    
    if (filters.search) {
      conditions.push(
        or(
          like(invoices.invoiceNumber, `%${filters.search}%`),
          like(invoices.notes, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        query = query.where(conditions[0]);
      } else {
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(invoices.invoiceDate));
  }

  // Financial transaction methods
  async getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined> {
    const [transaction] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id));
    return transaction || undefined;
  }
  
  async getAllFinancialTransactions(): Promise<FinancialTransaction[]> {
    const transactions = await db.select().from(financialTransactions);
    return transactions;
  }

  async getDailyTransactions(branchId: number, date: Date): Promise<FinancialTransaction[]> {
    // Set the start and end of day for the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return db.select().from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.branchId, branchId),
          gte(financialTransactions.date, startOfDay),
          lte(financialTransactions.date, endOfDay)
        )
      )
      .orderBy(desc(financialTransactions.date));
  }

  async getSummarizedDailyTransactions(branchId: number, date: Date): Promise<DailyFinancialSummary> {
    const transactions = await this.getDailyTransactions(branchId, date);
    
    // Initialize summary object
    const summary: DailyFinancialSummary = {
      totalSales: 0,
      cardPayments: 0,
      cashPayments: 0,
      totalExpenses: 0,
      expenseCategories: {},
      netBalance: 0
    };
    
    // Calculate totals
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.totalSales += transaction.amount;
        if (transaction.paymentMethod === 'card') {
          summary.cardPayments += transaction.amount;
        } else if (transaction.paymentMethod === 'cash') {
          summary.cashPayments += transaction.amount;
        }
      } else if (transaction.type === 'expense') {
        summary.totalExpenses += transaction.amount;
        const category = transaction.category || 'Uncategorized';
        summary.expenseCategories[category] = (summary.expenseCategories[category] || 0) + transaction.amount;
      }
    });
    
    summary.netBalance = summary.totalSales - summary.totalExpenses;
    
    return summary;
  }

  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db
      .insert(financialTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction | undefined> {
    const [updatedTransaction] = await db
      .update(financialTransactions)
      .set(transaction)
      .where(eq(financialTransactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteFinancialTransaction(id: number): Promise<boolean> {
    const result = await db
      .delete(financialTransactions)
      .where(eq(financialTransactions.id, id));
    return result.count > 0;
  }

  async getTransactionsByDateRange(branchId: number, startDate: Date, endDate: Date): Promise<FinancialTransaction[]> {
    return db.select().from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.branchId, branchId),
          gte(financialTransactions.date, startDate),
          lte(financialTransactions.date, endDate)
        )
      )
      .orderBy(desc(financialTransactions.date));
  }

  async getMonthlySummary(branchId: number, year: number, month: number): Promise<MonthlySummary> {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    
    const transactions = await this.getTransactionsByDateRange(branchId, startDate, endDate);
    
    // Initialize summary object
    const summary: MonthlySummary = {
      totalSales: 0,
      totalExpenses: 0,
      netBalance: 0,
      salesByDay: {},
      expensesByDay: {},
      expensesByCategory: {}
    };
    
    // Process transactions
    transactions.forEach(transaction => {
      const day = transaction.date.getDate().toString();
      
      if (transaction.type === 'income') {
        summary.totalSales += transaction.amount;
        summary.salesByDay[day] = (summary.salesByDay[day] || 0) + transaction.amount;
      } else if (transaction.type === 'expense') {
        summary.totalExpenses += transaction.amount;
        summary.expensesByDay[day] = (summary.expensesByDay[day] || 0) + transaction.amount;
        
        const category = transaction.category || 'Uncategorized';
        summary.expensesByCategory[category] = (summary.expensesByCategory[category] || 0) + transaction.amount;
      }
    });
    
    summary.netBalance = summary.totalSales - summary.totalExpenses;
    
    return summary;
  }

  // User actions methods
  async logUserAction(action: InsertUserAction): Promise<UserAction> {
    const [newAction] = await db
      .insert(userActions)
      .values(action)
      .returning();
    return newAction;
  }

  async getUserActions(limit: number = 100): Promise<UserAction[]> {
    return db
      .select()
      .from(userActions)
      .orderBy(desc(userActions.timestamp))
      .limit(limit);
  }

  async getUserActionsByUser(userId: number, limit: number = 100): Promise<UserAction[]> {
    return db
      .select()
      .from(userActions)
      .where(eq(userActions.userId, userId))
      .orderBy(desc(userActions.timestamp))
      .limit(limit);
  }

  async getUserActionsByEntityType(entityType: string, limit: number = 100): Promise<UserAction[]> {
    return db
      .select()
      .from(userActions)
      .where(eq(userActions.entityType, entityType))
      .orderBy(desc(userActions.timestamp))
      .limit(limit);
  }

  async getUserActionsByEntityId(entityType: string, entityId: number, limit: number = 100): Promise<UserAction[]> {
    return db
      .select()
      .from(userActions)
      .where(
        and(
          eq(userActions.entityType, entityType),
          eq(userActions.entityId, entityId)
        )
      )
      .orderBy(desc(userActions.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
