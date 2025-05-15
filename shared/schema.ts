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
export const actionTypeEnum = pgEnum('action_type', ['create', 'update', 'delete', 'login', 'logout']);

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
  address: text("address").notNull(),
  contactNumber: text("contact_number").notNull(),
  manager: text("manager"),
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
  notes: text("notes"),
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

// The Drizzle relations need to be defined later when setting up relations in the database
// For now, we'll define types only and implement real relations when needed

// User actions for logging all activities
export const userActions = pgTable("user_actions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  entityType: text("entity_type").notNull(), // users, branches, invoices, etc
  entityId: integer("entity_id"), // Can be null for login/logout
  details: text("details"), // JSON string with details of the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserActionSchema = createInsertSchema(userActions).omit({
  id: true,
  timestamp: true,
});

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

export type UserAction = typeof userActions.$inferSelect;
export type InsertUserAction = z.infer<typeof insertUserActionSchema>;
