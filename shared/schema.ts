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

// Define page permission types
export const pageAccessEnum = pgEnum('page_access', [
  'dashboard', 
  'invoices', 
  'suppliers', 
  'branches', 
  'risk_analysis',
  'reports',
  'users',
  'roles',
  'settings',
  'payment_tracking'
]);
export const invoiceStatusEnum = pgEnum('invoice_status', ['paid', 'unpaid', 'partially_paid']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['standard', 'credit_note', 'cash']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'cash']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const actionTypeEnum = pgEnum('action_type', ['create', 'update', 'delete', 'login', 'logout']);
export const supportTicketStatusEnum = pgEnum('support_ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
export const supportTicketPriorityEnum = pgEnum('support_ticket_priority', ['low', 'medium', 'high', 'critical']);
export const paymentTypeEnum = pgEnum('payment_type', ['bank_transfer', 'cheque']);
export const directDebitFrequencyEnum = pgEnum('direct_debit_frequency', ['weekly', 'monthly', 'quarterly', 'yearly']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default('branch_manager'), // Keep for backward compatibility
  roleId: integer("role_id").references(() => roles.id), // New field for custom roles
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
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  accountNumber: text("account_number"),
  shortCode: text("short_code"),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceDate: timestamp("invoice_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  paidAmount: doublePrecision("paid_amount").default(0),
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

// Invoice payments table (tracks individual payments for each invoice)
export const invoicePayments = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  amount: doublePrecision("amount").notNull(),
  chequeNumber: text("cheque_number"), // Only for cheque payments
  paymentDate: timestamp("payment_date").notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supplier payments table (tracks bulk payments to suppliers)
export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  bankTransferAmount: doublePrecision("bank_transfer_amount").default(0),
  chequeAmount: doublePrecision("cheque_amount").default(0),
  chequeNumber: text("cheque_number"), // For cheque payments
  paymentDate: timestamp("payment_date").notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: supportTicketStatusEnum("status").notNull().default('open'),
  priority: supportTicketPriorityEnum("priority").notNull().default('medium'),
  userId: integer("user_id").references(() => users.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  category: text("category"),
  screenshot: text("screenshot"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: integer("assigned_to").references(() => users.id),
});

// Direct Debits table
export const directDebits = pgTable("direct_debits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  recipientName: text("recipient_name").notNull(),
  accountNumber: text("account_number").notNull(),
  sortCode: text("sort_code").notNull(),
  amount: doublePrecision("amount").notNull(),
  frequency: directDebitFrequencyEnum("frequency").notNull(),
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
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
}).extend({
  branchId: z.number().optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({
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

// Supplier-Branch balances table to track balances for each supplier per branch
export const supplierBranchBalances = pgTable("supplier_branch_balances", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  balance: doublePrecision("balance").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Add schema for supplier-branch balances
export const insertSupplierBranchBalanceSchema = createInsertSchema(supplierBranchBalances).omit({
  id: true,
  lastUpdated: true,
});

// Roles and Permissions tables
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  page: pageAccessEnum("page").notNull(),
  canView: boolean("can_view").default(false),
  canCreate: boolean("can_create").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
});

// Creation schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
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

export type SupplierBranchBalance = typeof supplierBranchBalances.$inferSelect;
export type InsertSupplierBranchBalance = z.infer<typeof insertSupplierBranchBalanceSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;

export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;

export const insertDirectDebitSchema = createInsertSchema(directDebits).omit({ 
  id: true, 
  createdAt: true 
});

export type DirectDebit = typeof directDebits.$inferSelect;
export type InsertDirectDebit = z.infer<typeof insertDirectDebitSchema>;