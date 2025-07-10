import { 
  users, 
  branches, 
  suppliers, 
  supplierBranches,
  invoices, 
  financialTransactions,
  userActions,
  supplierBranchBalances,
  roles,
  rolePermissions,
  supportTickets,
  invoicePayments,
  supplierPayments,
  directDebits,
  type User, 
  type InsertUser, 
  type Branch,
  type InsertBranch,
  type Supplier,
  type InsertSupplier,
  type SupplierBranch,
  type InsertSupplierBranch,
  type Invoice,
  type InsertInvoice,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type UserAction,
  type InsertUserAction,
  type SupplierBranchBalance,
  type InsertSupplierBranchBalance,
  type Role,
  type InsertRole,
  type RolePermission,
  type InsertRolePermission,
  type SupportTicket,
  type InsertSupportTicket,
  type InvoicePayment,
  type InsertInvoicePayment,
  type SupplierPayment,
  type InsertSupplierPayment,
  type DirectDebit,
  type InsertDirectDebit
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, like, or, inArray, count } from "drizzle-orm";
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
  getUserCountByRoleId(roleId: number): Promise<number>;
  
  // Role methods
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<boolean>;
  clearDefaultRoles(): Promise<void>;
  
  // Role Permission methods
  getRolePermissions(roleId: number): Promise<RolePermission[]>;
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  deleteRolePermissions(roleId: number): Promise<boolean>;

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
  getSuppliersByBranch(branchId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Supplier-Branch relationship methods
  getSupplierBranches(supplierId: number): Promise<SupplierBranch[]>;
  getBranchSuppliers(branchId: number): Promise<SupplierBranch[]>;
  addSupplierToBranch(supplierId: number, branchId: number, createdBy?: number): Promise<SupplierBranch>;
  removeSupplierFromBranch(supplierId: number, branchId: number): Promise<boolean>;
  getSupplierWithBranches(supplierId: number): Promise<{ supplier: Supplier; branches: Branch[] } | undefined>;
  getAllSuppliersWithBranches(branchId?: number): Promise<Array<{ supplier: Supplier; branches: Branch[] }>>;
  
  // Supplier-Branch Balance methods
  getSupplierBranchBalance(supplierId: number, branchId: number): Promise<SupplierBranchBalance | undefined>;
  getAllSupplierBranchBalances(): Promise<SupplierBranchBalance[]>;
  getSupplierBalances(supplierId: number): Promise<SupplierBranchBalance[]>;
  getBranchSupplierBalances(branchId: number): Promise<SupplierBranchBalance[]>;
  updateSupplierBranchBalance(supplierId: number, branchId: number, amountChange: number): Promise<SupplierBranchBalance>;

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

  // Support Ticket methods
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  getSupportTicketsByStatus(status: string): Promise<SupportTicket[]>;
  getSupportTicketsByUser(userId: number): Promise<SupportTicket[]>;
  getSupportTicketsByBranch(branchId: number): Promise<SupportTicket[]>;

  // Invoice Payment methods
  getInvoicePayment(id: number): Promise<InvoicePayment | undefined>;
  getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]>;
  createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment>;
  updateInvoicePayment(id: number, payment: Partial<InsertInvoicePayment>): Promise<InvoicePayment | undefined>;
  deleteInvoicePayment(id: number): Promise<boolean>;
  
  // Support Ticket methods
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  deleteSupportTicket(id: number): Promise<boolean>;

  // Supplier Payment methods
  processBulkPayment(payment: InsertSupplierPayment): Promise<{ paymentId: number; updatedInvoices: number[] }>;
  getSupplierPayments(supplierId: number, branchId?: number): Promise<SupplierPayment[]>;
  getAllPaymentTracking(branchId?: number, startDate?: Date, endDate?: Date): Promise<any[]>;

  // User actions methods
  logUserAction(action: InsertUserAction): Promise<UserAction>;
  getUserActions(limit?: number): Promise<UserAction[]>;
  getUserActionsByUser(userId: number, limit?: number): Promise<UserAction[]>;
  getUserActionsByEntityType(entityType: string, limit?: number): Promise<UserAction[]>;
  getUserActionsByEntityId(entityType: string, entityId: number, limit?: number): Promise<UserAction[]>;
  
  // Direct Debit methods
  getDirectDebits(branchId?: number): Promise<DirectDebit[]>;
  getDirectDebit(id: number): Promise<DirectDebit | undefined>;
  createDirectDebit(debit: InsertDirectDebit): Promise<DirectDebit>;
  updateDirectDebit(id: number, debit: Partial<InsertDirectDebit>): Promise<DirectDebit | undefined>;
  deleteDirectDebit(id: number): Promise<boolean>;

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

  async getSuppliersByBranch(branchId: number): Promise<Supplier[]> {
    const results = await db
      .select({ supplier: suppliers })
      .from(suppliers)
      .innerJoin(supplierBranches, eq(suppliers.id, supplierBranches.supplierId))
      .where(eq(supplierBranches.branchId, branchId));
    
    return results.map(r => r.supplier);
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
    // First delete any supplier-branch relationships
    await db.delete(supplierBranches).where(eq(supplierBranches.supplierId, id));
    
    // Delete any supplier-branch balances
    await db.delete(supplierBranchBalances).where(eq(supplierBranchBalances.supplierId, id));
    
    // Then delete the supplier
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id));
    return result.count > 0;
  }

  // Supplier-Branch relationship methods
  async getSupplierBranches(supplierId: number): Promise<SupplierBranch[]> {
    return db.select().from(supplierBranches).where(eq(supplierBranches.supplierId, supplierId));
  }

  async getBranchSuppliers(branchId: number): Promise<SupplierBranch[]> {
    return db.select().from(supplierBranches).where(eq(supplierBranches.branchId, branchId));
  }

  async addSupplierToBranch(supplierId: number, branchId: number, createdBy?: number): Promise<SupplierBranch> {
    const [relationship] = await db
      .insert(supplierBranches)
      .values({
        supplierId,
        branchId,
        createdBy
      })
      .returning();
    return relationship;
  }

  async removeSupplierFromBranch(supplierId: number, branchId: number): Promise<boolean> {
    const result = await db
      .delete(supplierBranches)
      .where(
        and(
          eq(supplierBranches.supplierId, supplierId),
          eq(supplierBranches.branchId, branchId)
        )
      );
    return result.count > 0;
  }

  async getSupplierWithBranches(supplierId: number): Promise<{ supplier: Supplier; branches: Branch[] } | undefined> {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) return undefined;

    const supplierBranchRels = await db
      .select({ branch: branches })
      .from(supplierBranches)
      .innerJoin(branches, eq(supplierBranches.branchId, branches.id))
      .where(eq(supplierBranches.supplierId, supplierId));

    return {
      supplier,
      branches: supplierBranchRels.map(r => r.branch)
    };
  }

  async getAllSuppliersWithBranches(branchId?: number): Promise<Array<{ supplier: Supplier; branches: Branch[] }>> {
    const allSuppliers = await this.getAllSuppliers();
    const result = [];

    for (const supplier of allSuppliers) {
      const supplierBranchRels = await db
        .select({ branch: branches })
        .from(supplierBranches)
        .innerJoin(branches, eq(supplierBranches.branchId, branches.id))
        .where(eq(supplierBranches.supplierId, supplier.id));

      const supplierBranches = supplierBranchRels.map(r => r.branch);
      
      // If branchId is specified, only include suppliers that work with that branch
      if (branchId && !supplierBranches.some(b => b.id === branchId)) {
        continue;
      }

      result.push({
        supplier,
        branches: supplierBranches
      });
    }

    return result;
  }

  // Supplier-Branch Balance Methods
  async getSupplierBranchBalance(supplierId: number, branchId: number): Promise<SupplierBranchBalance | undefined> {
    const [balance] = await db
      .select()
      .from(supplierBranchBalances)
      .where(
        and(
          eq(supplierBranchBalances.supplierId, supplierId),
          eq(supplierBranchBalances.branchId, branchId)
        )
      );
    return balance;
  }
  
  async getAllSupplierBranchBalances(): Promise<SupplierBranchBalance[]> {
    return db.select().from(supplierBranchBalances);
  }
  
  async getSupplierBalances(supplierId: number): Promise<SupplierBranchBalance[]> {
    return db
      .select()
      .from(supplierBranchBalances)
      .where(eq(supplierBranchBalances.supplierId, supplierId));
  }
  
  async getBranchSupplierBalances(branchId: number): Promise<SupplierBranchBalance[]> {
    return db
      .select()
      .from(supplierBranchBalances)
      .where(eq(supplierBranchBalances.branchId, branchId));
  }
  
  async updateSupplierBranchBalance(supplierId: number, branchId: number, amountChange: number): Promise<SupplierBranchBalance> {
    // Check if the balance record already exists
    const existingBalance = await this.getSupplierBranchBalance(supplierId, branchId);
    
    if (existingBalance) {
      // Update existing balance
      const [updatedBalance] = await db
        .update(supplierBranchBalances)
        .set({ 
          balance: existingBalance.balance + amountChange,
          lastUpdated: new Date()
        })
        .where(
          and(
            eq(supplierBranchBalances.supplierId, supplierId),
            eq(supplierBranchBalances.branchId, branchId)
          )
        )
        .returning();
      return updatedBalance;
    } else {
      // Create new balance record
      const [newBalance] = await db
        .insert(supplierBranchBalances)
        .values({
          supplierId,
          branchId,
          balance: amountChange
        })
        .returning();
      return newBalance;
    }
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
    // Create the invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    
    // Calculate the amount to adjust the supplier-branch balance
    const amountToAdjust = invoice.type === 'credit_note' 
      ? (invoice.amount - (invoice.paidAmount || 0)) * -1 
      : invoice.amount - (invoice.paidAmount || 0);
    
    // Update the supplier branch balance
    await this.updateSupplierBranchBalance(
      invoice.supplierId,
      invoice.branchId,
      amountToAdjust
    );
    
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    // Get the original invoice to calculate balance adjustments
    const originalInvoice = await this.getInvoice(id);
    if (!originalInvoice) return undefined;
    
    // Update the invoice
    const [updatedInvoice] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
      
    // If payment status or amount has changed, update supplier-branch balance
    if (invoice.paidAmount !== undefined || invoice.amount !== undefined || invoice.type !== undefined) {
      // Calculate the original balance impact
      const originalAmount = originalInvoice.type === 'credit_note' 
        ? (originalInvoice.amount - (originalInvoice.paidAmount || 0)) * -1 
        : originalInvoice.amount - (originalInvoice.paidAmount || 0);
      
      // Calculate the new balance impact
      const newAmount = updatedInvoice.type === 'credit_note' 
        ? (updatedInvoice.amount - (updatedInvoice.paidAmount || 0)) * -1 
        : updatedInvoice.amount - (updatedInvoice.paidAmount || 0);
      
      // Update the balance with the difference
      const amountDifference = newAmount - originalAmount;
      if (amountDifference !== 0) {
        await this.updateSupplierBranchBalance(
          updatedInvoice.supplierId,
          updatedInvoice.branchId,
          amountDifference
        );
      }
    }
    
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    // Get the invoice details before deleting to adjust balances
    const invoice = await this.getInvoice(id);
    if (!invoice) return false;
    
    // Calculate the balance impact that needs to be reversed
    const balanceImpact = invoice.type === 'credit_note' 
      ? (invoice.amount - (invoice.paidAmount || 0)) * -1 
      : invoice.amount - (invoice.paidAmount || 0);
      
    // Update the supplier-branch balance by reversing the impact
    await this.updateSupplierBranchBalance(
      invoice.supplierId,
      invoice.branchId,
      -balanceImpact // Negative to reverse the effect
    );
    
    // Delete the invoice
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

  async getSummarizedTransactionsByDateRange(branchId: number, startDate: Date, endDate: Date): Promise<DailyFinancialSummary> {
    const transactions = await this.getTransactionsByDateRange(branchId, startDate, endDate);
    
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

  // Role management methods
  async getUserCountByRoleId(roleId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.roleId!, roleId));
    return result[0]?.count || 0;
  }
  
  // Role methods
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }
  
  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  }
  
  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }
  
  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db
      .insert(roles)
      .values(role)
      .returning();
    return newRole;
  }
  
  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db
      .update(roles)
      .set({
        ...role,
        updatedAt: new Date()
      })
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }
  
  async deleteRole(id: number): Promise<boolean> {
    const result = await db
      .delete(roles)
      .where(eq(roles.id, id));
    return result.count > 0;
  }
  
  async clearDefaultRoles(): Promise<void> {
    await db
      .update(roles)
      .set({ isDefault: false })
      .where(eq(roles.isDefault, true));
  }
  
  // Role Permission methods
  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
  }
  
  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> {
    const [newPermission] = await db
      .insert(rolePermissions)
      .values(permission)
      .returning();
    return newPermission;
  }
  
  async deleteRolePermissions(roleId: number): Promise<boolean> {
    const result = await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    return result.count > 0;
  }

  // Support Ticket methods
  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket;
  }
  
  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return db.select().from(supportTickets);
  }
  
  async getSupportTicketsByStatus(status: string): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.status, status as any));
  }
  
  async getSupportTicketsByUser(userId: number): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId));
  }
  
  async getSupportTicketsByBranch(branchId: number): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.branchId, branchId));
  }
  
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }
  
  async updateSupportTicket(id: number, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        ...ticket,
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return updatedTicket;
  }
  
  async deleteSupportTicket(id: number): Promise<boolean> {
    const result = await db
      .delete(supportTickets)
      .where(eq(supportTickets.id, id));
    return result.count > 0;
  }

  // Invoice Payment methods
  async getInvoicePayment(id: number): Promise<InvoicePayment | undefined> {
    const [payment] = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.id, id));
    return payment;
  }

  async getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]> {
    return await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.paymentDate));
  }

  async createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment> {
    const [newPayment] = await db
      .insert(invoicePayments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async updateInvoicePayment(id: number, payment: Partial<InsertInvoicePayment>): Promise<InvoicePayment | undefined> {
    const [updatedPayment] = await db
      .update(invoicePayments)
      .set(payment)
      .where(eq(invoicePayments.id, id))
      .returning();
    return updatedPayment;
  }

  async deleteInvoicePayment(id: number): Promise<boolean> {
    const result = await db
      .delete(invoicePayments)
      .where(eq(invoicePayments.id, id));
    return result.count > 0;
  }

  // Security monitoring methods
  async getActiveSessions(): Promise<number> {
    try {
      // Count active user sessions from user_actions table
      const result = await db
        .select({ count: sql`count(*)` })
        .from(userActions)
        .where(
          and(
            eq(userActions.actionType, 'login'),
            gte(userActions.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        );
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return 0;
    }
  }

  async getFailedLoginAttempts(): Promise<number> {
    try {
      // Count failed login attempts in the last hour
      const result = await db
        .select({ count: sql`count(*)` })
        .from(userActions)
        .where(
          and(
            eq(userActions.actionType, 'failed_login'),
            gte(userActions.timestamp, new Date(Date.now() - 60 * 60 * 1000))
          )
        );
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting failed login attempts:', error);
      return 0;
    }
  }

  async getBlockedIPs(): Promise<number> {
    try {
      // Count unique IPs with security incidents
      const result = await db
        .select({ count: sql`count(distinct details)` })
        .from(userActions)
        .where(
          and(
            eq(userActions.actionType, 'security_incident'),
            gte(userActions.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        );
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting blocked IPs:', error);
      return 0;
    }
  }

  async getSuspiciousActivity(): Promise<number> {
    try {
      // Count suspicious activities in the last 24 hours
      const result = await db
        .select({ count: sql`count(*)` })
        .from(userActions)
        .where(
          and(
            or(
              eq(userActions.actionType, 'failed_login'),
              eq(userActions.actionType, 'security_incident')
            ),
            gte(userActions.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        );
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error getting suspicious activity:', error);
      return 0;
    }
  }

  async getSecurityThreats(): Promise<any[]> {
    try {
      // Get recent security incidents and threats
      const threats = await db
        .select({
          id: userActions.id,
          type: userActions.actionType,
          timestamp: userActions.timestamp,
          details: userActions.details,
          userId: userActions.userId
        })
        .from(userActions)
        .where(
          and(
            or(
              eq(userActions.actionType, 'security_incident'),
              eq(userActions.actionType, 'failed_login')
            ),
            gte(userActions.timestamp, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(userActions.timestamp))
        .limit(50);

      return threats;
    } catch (error) {
      console.error('Error getting security threats:', error);
      return [];
    }
  }

  // Bulk Payment Processing Methods
  async processBulkPayment(payment: InsertSupplierPayment): Promise<{ paymentId: number; updatedInvoices: number[] }> {
    try {
      // Start a database transaction
      const result = await db.transaction(async (tx) => {
        // Create the supplier payment record
        const [supplierPayment] = await tx
          .insert(supplierPayments)
          .values(payment)
          .returning();

        // Get unpaid invoices for this supplier and branch, ordered by date (oldest first)
        const unpaidInvoices = await tx
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.supplierId, payment.supplierId),
              eq(invoices.branchId, payment.branchId),
              or(
                eq(invoices.status, 'unpaid'),
                eq(invoices.status, 'partially_paid')
              )
            )
          )
          .orderBy(asc(invoices.invoiceDate));

        let remainingAmount = payment.totalAmount;
        const updatedInvoices: number[] = [];

        // Distribute payment across invoices (FIFO - oldest first)
        for (const invoice of unpaidInvoices) {
          if (remainingAmount <= 0) break;

          const outstandingAmount = invoice.amount - (invoice.paidAmount || 0);
          if (outstandingAmount <= 0) continue;

          const paymentAmount = Math.min(remainingAmount, outstandingAmount);
          const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
          
          // Determine payment types for this invoice
          let bankTransferAmount = 0;
          let chequeAmount = 0;
          
          if (payment.bankTransferAmount && payment.bankTransferAmount > 0) {
            bankTransferAmount = Math.min(paymentAmount, payment.bankTransferAmount - (payment.totalAmount - remainingAmount - paymentAmount));
            bankTransferAmount = Math.max(0, bankTransferAmount);
          }
          
          if (payment.chequeAmount && payment.chequeAmount > 0 && paymentAmount > bankTransferAmount) {
            chequeAmount = paymentAmount - bankTransferAmount;
          } else if (!payment.bankTransferAmount) {
            chequeAmount = paymentAmount;
          } else if (!payment.chequeAmount) {
            bankTransferAmount = paymentAmount;
          }

          // Create individual invoice payment records
          if (bankTransferAmount > 0) {
            await tx.insert(invoicePayments).values({
              invoiceId: invoice.id,
              paymentType: 'bank_transfer',
              amount: bankTransferAmount,
              paymentDate: payment.paymentDate,
              notes: `Bulk payment - Bank Transfer`,
              recordedBy: payment.recordedBy
            });
          }

          if (chequeAmount > 0) {
            await tx.insert(invoicePayments).values({
              invoiceId: invoice.id,
              paymentType: 'cheque',
              amount: chequeAmount,
              chequeNumber: payment.chequeNumber,
              paymentDate: payment.paymentDate,
              notes: `Bulk payment - Cheque ${payment.chequeNumber}`,
              recordedBy: payment.recordedBy
            });
          }

          // Update invoice paid amount and status
          const newStatus = newPaidAmount >= invoice.amount ? 'paid' : 'partially_paid';
          
          await tx
            .update(invoices)
            .set({
              paidAmount: newPaidAmount,
              status: newStatus
            })
            .where(eq(invoices.id, invoice.id));

          updatedInvoices.push(invoice.id);
          remainingAmount -= paymentAmount;
        }

        // Update supplier branch balance
        const currentBalance = await tx
          .select()
          .from(supplierBranchBalances)
          .where(
            and(
              eq(supplierBranchBalances.supplierId, payment.supplierId),
              eq(supplierBranchBalances.branchId, payment.branchId)
            )
          );

        if (currentBalance.length > 0) {
          await tx
            .update(supplierBranchBalances)
            .set({
              balance: currentBalance[0].balance - payment.totalAmount,
              lastUpdated: new Date()
            })
            .where(
              and(
                eq(supplierBranchBalances.supplierId, payment.supplierId),
                eq(supplierBranchBalances.branchId, payment.branchId)
              )
            );
        } else {
          await tx.insert(supplierBranchBalances).values({
            supplierId: payment.supplierId,
            branchId: payment.branchId,
            balance: -payment.totalAmount
          });
        }

        return { paymentId: supplierPayment.id, updatedInvoices };
      });

      return result;
    } catch (error) {
      console.error('Error processing bulk payment:', error);
      throw new Error(`Failed to process bulk payment: ${error}`);
    }
  }

  async getSupplierPayments(supplierId: number, branchId?: number): Promise<SupplierPayment[]> {
    try {
      let query = db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, supplierId));
      
      if (branchId) {
        query = query.where(eq(supplierPayments.branchId, branchId));
      }
      
      const payments = await query.orderBy(desc(supplierPayments.paymentDate));
      return payments;
    } catch (error) {
      console.error('Error getting supplier payments:', error);
      return [];
    }
  }

  async getAllPaymentTracking(branchId?: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let whereConditions = [];

      if (branchId) {
        whereConditions.push(eq(supplierPayments.branchId, branchId));
      }
      
      if (startDate) {
        whereConditions.push(gte(supplierPayments.paymentDate, startDate));
      }
      
      if (endDate) {
        whereConditions.push(lte(supplierPayments.paymentDate, endDate));
      }

      const payments = await db
        .select({
          id: supplierPayments.id,
          supplierId: supplierPayments.supplierId,
          supplierName: suppliers.name,
          branchId: supplierPayments.branchId,
          branchName: branches.name,
          totalAmount: supplierPayments.totalAmount,
          bankTransferAmount: supplierPayments.bankTransferAmount,
          chequeAmount: supplierPayments.chequeAmount,
          chequeNumber: supplierPayments.chequeNumber,
          paymentDate: supplierPayments.paymentDate,
          notes: supplierPayments.notes,
          recordedBy: supplierPayments.recordedBy,
          createdAt: supplierPayments.createdAt
        })
        .from(supplierPayments)
        .leftJoin(suppliers, eq(supplierPayments.supplierId, suppliers.id))
        .leftJoin(branches, eq(supplierPayments.branchId, branches.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(supplierPayments.paymentDate));

      return payments;
    } catch (error) {
      console.error('Error getting payment tracking:', error);
      return [];
    }
  }

  // Direct Debit methods
  async getDirectDebits(branchId?: number): Promise<DirectDebit[]> {
    try {
      let query = db
        .select({
          id: directDebits.id,
          branchId: directDebits.branchId,
          branchName: branches.name,
          recipientName: directDebits.recipientName,
          accountNumber: directDebits.accountNumber,
          sortCode: directDebits.sortCode,
          amount: directDebits.amount,
          frequency: directDebits.frequency,
          nextPaymentDate: directDebits.nextPaymentDate,
          description: directDebits.description,
          isActive: directDebits.isActive,
          createdAt: directDebits.createdAt,
          createdBy: directDebits.createdBy
        })
        .from(directDebits)
        .leftJoin(branches, eq(directDebits.branchId, branches.id));

      if (branchId) {
        query = query.where(eq(directDebits.branchId, branchId));
      }

      const debits = await query.orderBy(desc(directDebits.nextPaymentDate));
      return debits;
    } catch (error) {
      console.error('Error getting direct debits:', error);
      return [];
    }
  }

  async getDirectDebit(id: number): Promise<DirectDebit | undefined> {
    try {
      const [debit] = await db.select().from(directDebits).where(eq(directDebits.id, id));
      return debit || undefined;
    } catch (error) {
      console.error('Error getting direct debit:', error);
      return undefined;
    }
  }

  async createDirectDebit(debit: InsertDirectDebit): Promise<DirectDebit> {
    try {
      const [newDebit] = await db
        .insert(directDebits)
        .values(debit)
        .returning();
      return newDebit;
    } catch (error) {
      console.error('Error creating direct debit:', error);
      throw new Error(`Failed to create direct debit: ${error}`);
    }
  }

  async updateDirectDebit(id: number, debit: Partial<InsertDirectDebit>): Promise<DirectDebit | undefined> {
    try {
      const [updatedDebit] = await db
        .update(directDebits)
        .set(debit)
        .where(eq(directDebits.id, id))
        .returning();
      return updatedDebit;
    } catch (error) {
      console.error('Error updating direct debit:', error);
      return undefined;
    }
  }

  async deleteDirectDebit(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(directDebits)
        .where(eq(directDebits.id, id));
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting direct debit:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
