import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp,
  doublePrecision, 
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'branch_manager', 'accountant']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'unpaid', 'partially_paid']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['standard', 'credit_note', 'cash']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'cash']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default('branch_manager'),
  branchId: integer("branch_id").references(() => branches.id),
});

// Branches table
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  location: text("location"),
  contactInfo: text("contact_info"),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceDate: timestamp("invoice_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  status: invoiceStatusEnum("status").notNull().default('unpaid'),
  type: invoiceTypeEnum("type").notNull().default('standard'),
  notes: text("notes"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Financial transactions table (for daily financial tracking)
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  date: timestamp("date").notNull(),
  type: transactionTypeEnum("type").notNull(),
  category: text("category"),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  description: text("description"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
});

// Define relations
export const branchRelations = {
  users: branches.users,
  invoices: branches.invoices,
  financialTransactions: branches.financialTransactions,
};

export const userRelations = {
  branch: users.branchId,
  createdInvoices: users.createdInvoices,
  recordedTransactions: users.recordedTransactions,
};

export const supplierRelations = {
  invoices: suppliers.invoices,
};

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
