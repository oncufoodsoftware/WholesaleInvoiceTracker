import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage, InvoiceFilters } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { 
  insertInvoiceSchema, 
  insertBranchSchema,
  insertSupplierSchema,
  insertFinancialTransactionSchema,
  insertUserSchema,
  insertUserActionSchema,
  actionTypeEnum
} from "@shared/schema";

// Setup multer storage for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ 
  storage: storage2,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PNG, and JPG files are allowed'));
    }
  }
});

// Helper function to log user actions
const logUserAction = async (req: Request, actionType: typeof actionTypeEnum.enumValues[number], entityType: string, entityId?: number, details?: string) => {
  if (!req.user || !req.user.id) return;
  
  try {
    await storage.logUserAction({
      userId: req.user.id,
      actionType,
      entityType,
      entityId,
      details: details || JSON.stringify(req.body),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.error('Error logging user action:', error);
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Access the middleware for role-based access control
  const requireRole = app.locals.requireRole;

  // Branch API endpoints
  app.get('/api/branches', async (req, res) => {
    try {
      const branches = await storage.getAllBranches();
      res.json(branches);
    } catch (err) {
      res.status(500).json({ message: `Error fetching branches: ${err}` });
    }
  });

  app.get('/api/branches/:id', async (req, res) => {
    try {
      const branch = await storage.getBranch(parseInt(req.params.id));
      if (!branch) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      res.json(branch);
    } catch (err) {
      res.status(500).json({ message: `Error fetching branch: ${err}` });
    }
  });

  app.post('/api/branches', requireRole(['admin']), async (req, res) => {
    try {
      const branchData = insertBranchSchema.parse(req.body);
      const newBranch = await storage.createBranch(branchData);
      res.status(201).json(newBranch);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error creating branch: ${err}` });
    }
  });

  app.put('/api/branches/:id', requireRole(['admin']), async (req, res) => {
    try {
      const branchData = insertBranchSchema.partial().parse(req.body);
      const updatedBranch = await storage.updateBranch(parseInt(req.params.id), branchData);
      if (!updatedBranch) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      res.json(updatedBranch);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error updating branch: ${err}` });
    }
  });

  app.delete('/api/branches/:id', requireRole(['admin']), async (req, res) => {
    try {
      const success = await storage.deleteBranch(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: `Error deleting branch: ${err}` });
    }
  });

  // Supplier API endpoints
  app.get('/api/suppliers', async (req, res) => {
    try {
      // Get all suppliers
      const suppliers = await storage.getAllSuppliers();
      
      // If summary flag is not set, return just the suppliers
      if (req.query.includeSummary !== 'true') {
        return res.json(suppliers);
      }
      
      // Get all invoices to calculate debt
      const invoices = await storage.getAllInvoices();
      
      // Calculate total and outstanding amounts per supplier
      const supplierSummaries = {};
      
      // Initialize summaries for all suppliers
      for (const supplier of suppliers) {
        supplierSummaries[supplier.id] = {
          ...supplier,
          totalAmount: 0,
          outstandingAmount: 0
        };
      }
      
      // Calculate from invoices
      for (const invoice of invoices) {
        if (supplierSummaries[invoice.supplierId]) {
          supplierSummaries[invoice.supplierId].totalAmount += invoice.amount;
          if (invoice.status !== 'paid') {
            supplierSummaries[invoice.supplierId].outstandingAmount += invoice.amount;
          }
        }
      }
      
      // Convert to array
      const suppliersWithSummary = Object.values(supplierSummaries);
      
      res.json(suppliersWithSummary);
    } catch (err) {
      res.status(500).json({ message: `Error fetching suppliers: ${err}` });
    }
  });

  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const supplier = await storage.getSupplier(parseInt(req.params.id));
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.json(supplier);
    } catch (err) {
      res.status(500).json({ message: `Error fetching supplier: ${err}` });
    }
  });

  app.post('/api/suppliers', requireRole(['admin', 'accountant']), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const newSupplier = await storage.createSupplier(supplierData);
      res.status(201).json(newSupplier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error creating supplier: ${err}` });
    }
  });

  app.put('/api/suppliers/:id', requireRole(['admin', 'accountant']), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const updatedSupplier = await storage.updateSupplier(parseInt(req.params.id), supplierData);
      if (!updatedSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.json(updatedSupplier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error updating supplier: ${err}` });
    }
  });

  app.delete('/api/suppliers/:id', requireRole(['admin']), async (req, res) => {
    try {
      const success = await storage.deleteSupplier(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: `Error deleting supplier: ${err}` });
    }
  });

  // Invoice API endpoints
  app.get('/api/invoices', async (req, res) => {
    try {
      // Check if user is branch manager and limit to their branch
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        const invoices = await storage.getInvoicesByBranch(req.user.branchId);
        return res.json(invoices);
      }
      
      // For admin and accountant, return all invoices
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ message: `Error fetching invoices: ${err}` });
    }
  });

  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user is branch manager and can access this invoice
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (invoice.branchId !== req.user.branchId) {
          return res.status(403).json({ message: 'Forbidden: Access to this invoice is restricted' });
        }
      }
      
      res.json(invoice);
    } catch (err) {
      res.status(500).json({ message: `Error fetching invoice: ${err}` });
    }
  });

  app.post('/api/invoices/filter', async (req, res) => {
    try {
      const filters: InvoiceFilters = req.body;
      
      // Validate dates if present
      if (filters.startDate) filters.startDate = new Date(filters.startDate);
      if (filters.endDate) filters.endDate = new Date(filters.endDate);
      
      // Restrict branch managers to their branch
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        filters.branchId = req.user.branchId;
      }
      
      const invoices = await storage.filterInvoices(filters);
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ message: `Error filtering invoices: ${err}` });
    }
  });

  app.post('/api/invoices', upload.single('invoiceFile'), async (req, res) => {
    try {
      // Add file URL if a file was uploaded
      let fileUrl = undefined;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
      }

      // Parse invoice data
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        invoiceDate: new Date(req.body.invoiceDate),
        amount: parseFloat(req.body.amount),
        supplierId: parseInt(req.body.supplierId),
        branchId: parseInt(req.body.branchId),
        createdBy: req.user?.id,
        fileUrl
      });
      
      // If branch manager, can only create for their branch
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (invoiceData.branchId !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only create invoices for your own branch' 
          });
        }
      }
      
      const newInvoice = await storage.createInvoice(invoiceData);
      res.status(201).json(newInvoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error creating invoice: ${err}` });
    }
  });

  app.put('/api/invoices/:id', upload.single('invoiceFile'), async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Check if invoice exists
      const existingInvoice = await storage.getInvoice(invoiceId);
      if (!existingInvoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Check if user can update this invoice (branch managers can only update their own branch)
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (existingInvoice.branchId !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only update invoices for your own branch' 
          });
        }
      }
      
      // Add file URL if a file was uploaded
      let fileUrl = existingInvoice.fileUrl;
      if (req.file) {
        // If replacing existing file, delete old one
        if (existingInvoice.fileUrl) {
          const oldFilePath = path.join(process.cwd(), existingInvoice.fileUrl);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        fileUrl = `/uploads/${req.file.filename}`;
      }

      // Parse invoice data
      let invoiceData: any = { ...req.body };
      if (req.body.invoiceDate) invoiceData.invoiceDate = new Date(req.body.invoiceDate);
      if (req.body.amount) invoiceData.amount = parseFloat(req.body.amount);
      if (req.body.supplierId) invoiceData.supplierId = parseInt(req.body.supplierId);
      if (req.body.branchId) invoiceData.branchId = parseInt(req.body.branchId);
      if (fileUrl) invoiceData.fileUrl = fileUrl;
      
      const validatedData = insertInvoiceSchema.partial().parse(invoiceData);
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, validatedData);
      res.json(updatedInvoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error updating invoice: ${err}` });
    }
  });

  app.delete('/api/invoices/:id', requireRole(['admin', 'accountant']), async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Check if invoice exists
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Delete associated file if exists
      if (invoice.fileUrl) {
        const filePath = path.join(process.cwd(), invoice.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      const success = await storage.deleteInvoice(invoiceId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: `Error deleting invoice: ${err}` });
    }
  });

  // Financial transaction API endpoints
  app.get('/api/financial-transactions/daily', async (req, res) => {
    try {
      const { branchId, date } = req.query;
      
      if (!branchId || !date) {
        return res.status(400).json({ message: 'Branch ID and date are required' });
      }
      
      // Branch managers can only access their own branch data
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (parseInt(branchId as string) !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only access data for your own branch' 
          });
        }
      }
      
      const transactions = await storage.getDailyTransactions(
        parseInt(branchId as string), 
        new Date(date as string)
      );
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ message: `Error fetching daily transactions: ${err}` });
    }
  });

  app.get('/api/financial-transactions/summary/daily', async (req, res) => {
    try {
      const { branchId, date } = req.query;
      
      if (!branchId || !date) {
        return res.status(400).json({ message: 'Branch ID and date are required' });
      }
      
      // Branch managers can only access their own branch data
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (parseInt(branchId as string) !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only access data for your own branch' 
          });
        }
      }
      
      const summary = await storage.getSummarizedDailyTransactions(
        parseInt(branchId as string), 
        new Date(date as string)
      );
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: `Error fetching daily summary: ${err}` });
    }
  });

  app.get('/api/financial-transactions/summary/monthly', async (req, res) => {
    try {
      const { branchId, year, month } = req.query;
      
      if (!branchId || !year || !month) {
        return res.status(400).json({ 
          message: 'Branch ID, year, and month are required' 
        });
      }
      
      // Branch managers can only access their own branch data
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (parseInt(branchId as string) !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only access data for your own branch' 
          });
        }
      }
      
      const summary = await storage.getMonthlySummary(
        parseInt(branchId as string), 
        parseInt(year as string), 
        parseInt(month as string)
      );
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: `Error fetching monthly summary: ${err}` });
    }
  });

  app.post('/api/financial-transactions', async (req, res) => {
    try {
      let transactionData = {
        ...req.body,
        branchId: parseInt(req.body.branchId),
        date: new Date(req.body.date),
        amount: parseFloat(req.body.amount),
        recordedBy: req.user?.id
      };
      
      // Branch managers can only create transactions for their branch
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (transactionData.branchId !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only record transactions for your own branch' 
          });
        }
      }
      
      const validatedData = insertFinancialTransactionSchema.parse(transactionData);
      const newTransaction = await storage.createFinancialTransaction(validatedData);
      res.status(201).json(newTransaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error creating financial transaction: ${err}` });
    }
  });

  app.put('/api/financial-transactions/:id', async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      
      // Get existing transaction
      const existingTransaction = await storage.getFinancialTransaction(transactionId);
      if (!existingTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Branch managers can only update transactions for their branch
      if (req.isAuthenticated() && req.user?.role === 'branch_manager' && req.user?.branchId) {
        if (existingTransaction.branchId !== req.user.branchId) {
          return res.status(403).json({ 
            message: 'Forbidden: You can only update transactions for your own branch' 
          });
        }
      }
      
      let transactionData: any = { ...req.body };
      if (req.body.branchId) transactionData.branchId = parseInt(req.body.branchId);
      if (req.body.date) transactionData.date = new Date(req.body.date);
      if (req.body.amount) transactionData.amount = parseFloat(req.body.amount);
      
      const validatedData = insertFinancialTransactionSchema.partial().parse(transactionData);
      const updatedTransaction = await storage.updateFinancialTransaction(transactionId, validatedData);
      
      res.json(updatedTransaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error updating financial transaction: ${err}` });
    }
  });

  app.delete('/api/financial-transactions/:id', requireRole(['admin', 'accountant']), async (req, res) => {
    try {
      const success = await storage.deleteFinancialTransaction(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: `Error deleting financial transaction: ${err}` });
    }
  });

  // User management API endpoints - Admin only
  app.get('/api/users', requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: `Error fetching users: ${err}` });
    }
  });

  app.post('/api/users', requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(userData.password);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error creating user: ${err}` });
    }
  });

  app.put('/api/users/:id', requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      
      // If updating password, hash it
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(updatedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: err.errors });
      }
      res.status(500).json({ message: `Error updating user: ${err}` });
    }
  });

  app.delete('/api/users/:id', requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting self
      if (req.user?.id === userId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: `Error deleting user: ${err}` });
    }
  });

  // User actions API endpoints
  app.get('/api/user-actions', requireRole(['admin']), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const actions = await storage.getUserActions(limit);
      res.json(actions);
    } catch (err) {
      res.status(500).json({ message: `Error fetching user actions: ${err}` });
    }
  });
  
  app.get('/api/user-actions/user/:userId', requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const actions = await storage.getUserActionsByUser(userId, limit);
      res.json(actions);
    } catch (err) {
      res.status(500).json({ message: `Error fetching user actions: ${err}` });
    }
  });
  
  app.get('/api/user-actions/entity/:entityType', requireRole(['admin']), async (req, res) => {
    try {
      const entityType = req.params.entityType;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const actions = await storage.getUserActionsByEntityType(entityType, limit);
      res.json(actions);
    } catch (err) {
      res.status(500).json({ message: `Error fetching user actions: ${err}` });
    }
  });
  
  app.get('/api/user-actions/entity/:entityType/:entityId', requireRole(['admin']), async (req, res) => {
    try {
      const entityType = req.params.entityType;
      const entityId = parseInt(req.params.entityId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const actions = await storage.getUserActionsByEntityId(entityType, entityId, limit);
      res.json(actions);
    } catch (err) {
      res.status(500).json({ message: `Error fetching user actions: ${err}` });
    }
  });
  
  // Dashboard summary API endpoint
  app.get('/api/dashboard/summary', async (req, res) => {
    try {
      // Get total and outstanding invoice amounts by branch
      const invoices = await storage.getAllInvoices();
      
      // Calculate total invoice amount and outstanding amount per branch
      const branchSummary = {};
      const supplierSummary = {};
      let totalInvoiceAmount = 0;
      let totalOutstandingAmount = 0;
      
      // Process all invoices
      for (const invoice of invoices) {
        // Add to total
        totalInvoiceAmount += invoice.amount;
        
        // Add to outstanding if not paid
        if (invoice.status !== 'paid') {
          totalOutstandingAmount += invoice.amount;
        }
        
        // Branch summary
        if (!branchSummary[invoice.branchId]) {
          const branch = await storage.getBranch(invoice.branchId);
          branchSummary[invoice.branchId] = {
            id: invoice.branchId,
            name: branch?.name || `Branch ${invoice.branchId}`,
            totalAmount: 0,
            outstandingAmount: 0
          };
        }
        
        branchSummary[invoice.branchId].totalAmount += invoice.amount;
        if (invoice.status !== 'paid') {
          branchSummary[invoice.branchId].outstandingAmount += invoice.amount;
        }
        
        // Supplier summary
        if (!supplierSummary[invoice.supplierId]) {
          const supplier = await storage.getSupplier(invoice.supplierId);
          supplierSummary[invoice.supplierId] = {
            id: invoice.supplierId,
            name: supplier?.name || `Supplier ${invoice.supplierId}`,
            totalAmount: 0,
            outstandingAmount: 0
          };
        }
        
        supplierSummary[invoice.supplierId].totalAmount += invoice.amount;
        if (invoice.status !== 'paid') {
          supplierSummary[invoice.supplierId].outstandingAmount += invoice.amount;
        }
      }
      
      // Convert to arrays
      const branchData = Object.values(branchSummary);
      const supplierData = Object.values(supplierSummary);
      
      // Sort by outstanding amount (highest first)
      branchData.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
      supplierData.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
      
      res.json({
        totalInvoiceAmount,
        totalOutstandingAmount,
        branchData,
        supplierData
      });
    } catch (err) {
      res.status(500).json({ message: `Error fetching dashboard summary: ${err}` });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    next();
  }, express.static(uploadDir));

  const httpServer = createServer(app);

  return httpServer;
}
