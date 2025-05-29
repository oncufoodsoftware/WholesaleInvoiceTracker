import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage, InvoiceFilters } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./auth";
import { registerRoleRoutes } from "./role-routes";
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
  insertSupportTicketSchema,
  actionTypeEnum,
  supportTicketStatusEnum,
  supportTicketPriorityEnum
} from "@shared/schema";
import { getAnalyticsData, getRevenueForecast } from "./analytics";
import { getSupplierRiskData, getRiskHistory } from "./risk-analytics";
import { getFinancialTips } from "./ai-service";

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
  
  // Register role management routes
  registerRoleRoutes(app);
  
  // Access the middleware for role-based access control
  const requireRole = app.locals.requireRole;

  // Branch API endpoints
  app.get('/api/branches', async (req, res) => {
    try {
      const branches = await storage.getAllBranches();
      
      // Check if we need to include supplier balances
      if (req.query.withSupplierBalances === 'true') {
        const branchesWithBalances = await Promise.all(branches.map(async (branch) => {
          // Get all balances for this branch
          const balances = await storage.getBranchSupplierBalances(branch.id);
          
          // Get supplier details for each balance
          const supplierBalances = await Promise.all(balances.map(async (balance) => {
            const supplier = await storage.getSupplier(balance.supplierId);
            return {
              ...balance,
              supplierName: supplier?.name || 'Unknown Supplier'
            };
          }));
          
          return {
            ...branch,
            supplierBalances
          };
        }));
        
        return res.json(branchesWithBalances);
      }
      
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

  // Helper function to calculate supplier summaries with debt information
  const calculateSupplierSummaries = async (suppliers, invoices) => {
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
        // Calculate amount based on invoice type (credit notes are negative)
        const calculatedAmount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
        
        // Update total amount - always track this for reporting
        supplierSummaries[invoice.supplierId].totalAmount += calculatedAmount;
        
        // Update outstanding amount based on requirements:
        // 1. Include all Standard invoices (regardless of payment status)
        // 2. Include all Cash invoices (regardless of payment status)
        // 3. Subtract Credit Notes from the balance
        
        if (invoice.type === 'standard' || invoice.type === 'cash') {
          // Include all standard and cash invoices in outstanding amount
          supplierSummaries[invoice.supplierId].outstandingAmount += invoice.amount;
        } else if (invoice.type === 'credit_note') {
          // Subtract credit notes from outstanding amount
          supplierSummaries[invoice.supplierId].outstandingAmount -= invoice.amount;
        }
      }
    }
    
    // Convert to array
    return Object.values(supplierSummaries);
  };

  // Supplier API endpoints
  app.get('/api/suppliers', async (req, res) => {
    try {
      // Get all suppliers
      const suppliers = await storage.getAllSuppliers();
      
      // Get all invoices for balances
      const allInvoices = await storage.getAllInvoices();
      
      // Check if we need to include branch balances
      if (req.query.withBranchBalances === 'true') {
        const suppliersWithBalances = await Promise.all(suppliers.map(async (supplier) => {
          // Get all balances for this supplier
          let balances = await storage.getSupplierBalances(supplier.id);
          
          // Force balance update if requested or if no balances exist
          const forceUpdate = req.query.forceBalanceUpdate === 'true' || balances.length === 0;
          
          // Get all invoices for this supplier
          const supplierInvoices = allInvoices.filter(inv => inv.supplierId === supplier.id);
          
          // If we have invoices, always regenerate balances to ensure they're up to date
          if (supplierInvoices.length > 0) {
            // Create a map of branch balances from invoices
            const branchBalanceMap = new Map<number, number>();
            
            // Calculate balance per branch
            for (const invoice of supplierInvoices) {
              const branchId = invoice.branchId;
              const currentBalance = branchBalanceMap.get(branchId) || 0;
              
              // Add to balance based on invoice type and status
              // For standard invoices: always add to balance (regardless of payment status)
              // For cash invoices: always add to balance (regardless of payment status)
              // For credit notes: always subtract from balance
              let amountToAdd = 0;
              
              if (invoice.type === 'standard' || invoice.type === 'cash') {
                amountToAdd = invoice.amount;
              } else if (invoice.type === 'credit_note') {
                amountToAdd = -invoice.amount;
              }
              
              if (amountToAdd !== 0) {
                branchBalanceMap.set(branchId, currentBalance + amountToAdd);
              }
            }
            
            // If we're doing a forced update, delete existing balances first
            if (balances.length > 0) {
              // Reset existing balances if forcing update
              for (const balance of balances) {
                // Use updateSupplierBranchBalance with 0 to reset the balance
                await storage.updateSupplierBranchBalance(supplier.id, balance.branchId, -balance.balance);
              }
            }
            
            // Create branch balances from the map
            for (const [branchId, balance] of Array.from(branchBalanceMap.entries())) {
              if (balance !== 0) {
                // Create or update balance in database
                await storage.updateSupplierBranchBalance(supplier.id, branchId, balance);
              }
            }
            
            // Fetch the newly created balances
            balances = await storage.getSupplierBalances(supplier.id);
          }
          
          // Get branch details for each balance
          const branchBalances = await Promise.all(balances.map(async (balance) => {
            const branch = await storage.getBranch(balance.branchId);
            return {
              ...balance,
              branchName: branch?.name || 'Unknown Branch'
            };
          }));
          
          return {
            ...supplier,
            branchBalances
          };
        }));
        
        return res.json(suppliersWithBalances);
      }
      
      // If summary flag is not set, return just the suppliers
      if (req.query.includeSummary !== 'true') {
        return res.json(suppliers);
      }
      
      // Get all invoices to calculate debt
      const invoices = await storage.getAllInvoices();
      
      // Calculate summaries
      const suppliersWithSummary = await calculateSupplierSummaries(suppliers, invoices);
      
      res.json(suppliersWithSummary);
    } catch (err) {
      res.status(500).json({ message: `Error fetching suppliers: ${err}` });
    }
  });
  
  // Get suppliers for a specific branch - for branch managers
  app.get('/api/suppliers/branch/:branchId', async (req, res) => {
    try {
      const branchId = parseInt(req.params.branchId);
      
      // If user is branch manager, validate they're accessing their own branch
      if (req.user && req.user.role === 'branch_manager' && req.user.branchId !== branchId) {
        return res.status(403).json({ 
          message: 'You do not have permission to access suppliers for this branch' 
        });
      }
      
      // Get all suppliers
      const allSuppliers = await storage.getAllSuppliers();
      
      // Filter suppliers by branch
      const branchSuppliers = allSuppliers.filter(supplier => supplier.branchId === branchId);
      
      // If summary flag is not set, return just the suppliers
      if (req.query.includeSummary !== 'true') {
        return res.json(branchSuppliers);
      }
      
      // Get branch invoices to calculate debt
      const branchInvoices = await storage.getInvoicesByBranch(branchId);
      
      // Calculate summaries
      const suppliersWithSummary = await calculateSupplierSummaries(branchSuppliers, branchInvoices);
      
      res.json(suppliersWithSummary);
    } catch (err) {
      res.status(500).json({ message: `Error fetching branch suppliers: ${err}` });
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
      if (req.body.paidAmount) invoiceData.paidAmount = parseFloat(req.body.paidAmount);
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
      // Check if we need to filter by branch
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;
      
      // Get invoices - either all or filtered by branch
      let invoices;
      if (branchId) {
        invoices = await storage.getInvoicesByBranch(branchId);
      } else {
        invoices = await storage.getAllInvoices();
      }
      
      // Calculate total invoice amount and outstanding amount per branch
      const branchSummary = {};
      const supplierSummary = {};
      let totalInvoiceAmount = 0;
      let totalOutstandingAmount = 0;
      
      // Process all invoices
      for (const invoice of invoices) {
        // Calculate amount based on invoice type (credit notes are negative)
        const calculatedAmount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
        const paidAmount = invoice.paidAmount || 0;
        const outstandingAmount = invoice.type === 'credit_note' 
          ? -(invoice.amount - paidAmount) // Credit note outstanding is negative
          : (invoice.amount - paidAmount); // Normal invoice outstanding is positive
        
        // Add to totals
        totalInvoiceAmount += calculatedAmount;
        
        // Add to outstanding if not paid
        if (invoice.status !== 'paid') {
          totalOutstandingAmount += outstandingAmount;
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
        
        branchSummary[invoice.branchId].totalAmount += calculatedAmount;
        if (invoice.status !== 'paid') {
          branchSummary[invoice.branchId].outstandingAmount += outstandingAmount;
        }
        
        // Supplier summary - only include suppliers related to the filtered branch if branchId is provided
        if (invoice.supplierId && (!branchId || invoice.branchId === branchId)) {
          if (!supplierSummary[invoice.supplierId]) {
            const supplier = await storage.getSupplier(invoice.supplierId);
            supplierSummary[invoice.supplierId] = {
              id: invoice.supplierId,
              name: supplier?.name || `Supplier ${invoice.supplierId}`,
              totalAmount: 0,
              outstandingAmount: 0
            };
          }
          
          supplierSummary[invoice.supplierId].totalAmount += calculatedAmount;
          if (invoice.status !== 'paid') {
            supplierSummary[invoice.supplierId].outstandingAmount += outstandingAmount;
          }
        }
      }
      
      // Convert to arrays
      let branchData = Object.values(branchSummary);
      let supplierData = Object.values(supplierSummary);
      
      // Sort by outstanding amount (highest first)
      branchData.sort((a: any, b: any) => b.outstandingAmount - a.outstandingAmount);
      supplierData.sort((a: any, b: any) => b.outstandingAmount - a.outstandingAmount);
      
      // If we're filtering by branch, we should only include that branch in the branch data
      if (branchId) {
        branchData = branchData.filter((branch: any) => branch.id === branchId);
      }
      
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
  
  // Advanced Financial Analytics API Endpoints
  app.get('/api/analytics', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Call the analytics data function from analytics.ts
      await getAnalyticsData(req, res);
    } catch (err) {
      res.status(500).json({ message: `Error fetching analytics data: ${err}` });
    }
  });
  
  app.get('/api/reports/revenue', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Call the revenue forecast function from analytics.ts
      await getRevenueForecast(req, res);
    } catch (err) {
      res.status(500).json({ message: `Error fetching revenue forecast data: ${err}` });
    }
  });
  
  // Advanced analytics forecast endpoint
  app.get('/api/analytics/forecast', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Call the revenue forecast function from analytics.ts with forecast flag
      const forecastRequest = { ...req, query: { ...req.query, forecast: 'true' } };
      await getRevenueForecast(forecastRequest, res);
    } catch (err) {
      res.status(500).json({ message: `Error fetching analytics forecast data: ${err}` });
    }
  });
  
  // Financial tips endpoint - AI-powered personalized financial advice
  app.get('/api/financial-tips', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Get branch ID from query parameters if present
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      
      // Branch managers can only see tips for their branch
      if (req.user?.role === 'branch_manager' && req.user?.branchId && branchId !== req.user.branchId) {
        return res.status(403).json({ 
          message: 'You can only access financial tips for your own branch'
        });
      }
      
      // Call the financial tips service function
      await getFinancialTips(req, res);
    } catch (err) {
      res.status(500).json({ message: `Error generating financial tips: ${err}` });
    }
  });
  
  // Supplier Risk Dashboard API Endpoints
  app.get('/api/suppliers/risk', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Call the supplier risk data function from risk-analytics.ts
      await getSupplierRiskData(req, res);
    } catch (err) {
      res.status(500).json({ message: `Error fetching supplier risk data: ${err}` });
    }
  });
  
  app.get('/api/suppliers/risk/history/:supplierId', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Call the risk history function from risk-analytics.ts
      await getRiskHistory(req, res);
    } catch (err) {
      res.status(500).json({ message: `Error fetching supplier risk history: ${err}` });
    }
  });

  // Reports API Endpoints
  app.get('/api/reports/sales', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }

      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const period = req.query.period || 'year';
      
      // Generate dummy monthly sales data for the past 12 months
      const monthlyData = [];
      const categories = {
        'Groceries': 0,
        'Beverages': 0,
        'Snacks': 0,
        'Produce': 0
      };
      
      // Get real invoices from the database
      const invoices = await storage.getAllInvoices();
      
      // Prepare monthly data (for the chart)
      for (let i = 0; i < 12; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        
        // Filter invoices for the month if we have real data
        const monthInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.invoiceDate);
          return invoiceDate.getMonth() === month.getMonth() && 
                 invoiceDate.getFullYear() === month.getFullYear() &&
                 (branchId ? invoice.branchId === branchId : true);
        });
        
        // Calculate total for the month
        const total = monthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        
        monthlyData.unshift({
          month: month.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          total: total
        });
      }
      
      // Get branch data for comparison chart
      const branches = await storage.getAllBranches();
      const branchSales = [];
      
      for (const branch of branches) {
        // Filter invoices for this branch
        const branchInvoices = invoices.filter(invoice => invoice.branchId === branch.id);
        const total = branchInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        
        branchSales.push({
          name: branch.name,
          total: total
        });
      }
      
      // Sort branches by sales (highest first)
      branchSales.sort((a, b) => b.total - a.total);
      
      res.json({
        monthlySales: monthlyData,
        branchSales: branchSales,
        categoryDistribution: Object.keys(categories).map(category => ({
          category,
          value: Math.floor(Math.random() * 5000) + 1000 // We'll use random data for categories
        }))
      });
    } catch (err) {
      res.status(500).json({ message: `Error generating sales report: ${err}` });
    }
  });
  
  app.get('/api/reports/transactions', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const period = req.query.period || 'year';
      
      // Get real invoices and financial transactions from the database
      const invoices = await storage.getAllInvoices();
      
      // Filter by branch if specified
      const filteredInvoices = branchId 
        ? invoices.filter(invoice => invoice.branchId === branchId)
        : invoices;
      
      // Paginate the transactions
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedTransactions = filteredInvoices.slice(startIndex, endIndex);
      
      // Get all branches
      const branches = await storage.getAllBranches();
      
      // Map to the format needed by the frontend
      const transactions = paginatedTransactions.map(invoice => {
        // Get branch name
        const branch = branches.find(b => b.id === invoice.branchId);
        return {
          id: invoice.id,
          reference: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          description: `Invoice - ${invoice.invoiceNumber}`,
          branch: branch ? branch.name : 'Unknown Branch',
          category: invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1).replace('_', ' '),
          amount: invoice.amount,
          status: invoice.status
        };
      });
      
      res.json({
        transactions,
        pagination: {
          total: filteredInvoices.length,
          page,
          limit,
          totalPages: Math.ceil(filteredInvoices.length / limit)
        }
      });
    } catch (err) {
      res.status(500).json({ message: `Error fetching transaction report: ${err}` });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    next();
  }, express.static(uploadDir));

  // Support Ticket API Endpoints
  app.get('/api/support-tickets', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Get all support tickets or filter by different criteria
      let tickets;
      
      if (req.query.status) {
        tickets = await storage.getSupportTicketsByStatus(req.query.status as string);
      } else if (req.query.userId) {
        tickets = await storage.getSupportTicketsByUser(Number(req.query.userId));
      } else if (req.query.branchId) {
        tickets = await storage.getSupportTicketsByBranch(Number(req.query.branchId));
      } else {
        tickets = await storage.getAllSupportTickets();
      }
      
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ message: `Error fetching support tickets: ${err}` });
    }
  });
  
  // Get a single support ticket
  app.get('/api/support-tickets/:id', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      const ticketId = Number(req.params.id);
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ message: `Error fetching support ticket: ${err}` });
    }
  });
  
  // Create a new support ticket (One-Click Support Ticket Generator)
  app.post('/api/support-tickets', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Validate the request body
      const validationResult = insertSupportTicketSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid support ticket data', 
          errors: validationResult.error.format() 
        });
      }
      
      // Create the support ticket
      const ticket = await storage.createSupportTicket({
        ...validationResult.data,
        userId: req.user.id,
        status: validationResult.data.status || 'open'
      });
      
      // Log the user action
      await storage.logUserAction({
        userId: req.user.id,
        actionType: 'create',
        entityType: 'support_ticket',
        entityId: ticket.id,
        details: `Created support ticket: ${ticket.title}`
      });
      
      res.status(201).json(ticket);
    } catch (err) {
      res.status(500).json({ message: `Error creating support ticket: ${err}` });
    }
  });
  
  // Update a support ticket
  app.patch('/api/support-tickets/:id', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      const ticketId = Number(req.params.id);
      
      // Check if ticket exists
      const existingTicket = await storage.getSupportTicket(ticketId);
      if (!existingTicket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Validate the request body
      const validationResult = insertSupportTicketSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid support ticket data', 
          errors: validationResult.error.format() 
        });
      }
      
      // Update the ticket
      const updatedTicket = await storage.updateSupportTicket(ticketId, {
        ...validationResult.data
      });
      
      // Log the user action
      await storage.logUserAction({
        userId: req.user.id,
        actionType: 'update',
        entityType: 'support_ticket',
        entityId: ticketId,
        details: `Updated support ticket: ${existingTicket.title}`
      });
      
      res.json(updatedTicket);
    } catch (err) {
      res.status(500).json({ message: `Error updating support ticket: ${err}` });
    }
  });
  
  // Delete a support ticket
  app.delete('/api/support-tickets/:id', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      const ticketId = Number(req.params.id);
      
      // Check if ticket exists
      const existingTicket = await storage.getSupportTicket(ticketId);
      if (!existingTicket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }
      
      // Delete the ticket
      const result = await storage.deleteSupportTicket(ticketId);
      
      if (result) {
        // Log the user action
        await storage.logUserAction({
          userId: req.user.id,
          actionType: 'delete',
          entityType: 'support_ticket',
          entityId: ticketId,
          details: `Deleted support ticket: ${existingTicket.title}`
        });
        
        res.json({ message: 'Support ticket deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete support ticket' });
      }
    } catch (err) {
      res.status(500).json({ message: `Error deleting support ticket: ${err}` });
    }
  });
  
  // One-Click Support Ticket Generator endpoint
  app.post('/api/support-tickets/generate', async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).send("Unauthorized");
      }
      
      // Extract context information from request body
      const { pageContext, errorDetails, userAction, priority } = req.body;
      
      if (!pageContext) {
        return res.status(400).json({ message: 'Page context is required' });
      }
      
      // Generate ticket title based on context
      let title = `Support needed on ${pageContext} page`;
      if (errorDetails?.type) {
        title = `${errorDetails.type} error on ${pageContext} page`;
      }
      
      // Generate ticket description with all available context
      let description = `User encountered an issue while on the ${pageContext} page.\n\n`;
      
      if (userAction) {
        description += `User action: ${userAction}\n\n`;
      }
      
      if (errorDetails) {
        description += `Error details:\n${JSON.stringify(errorDetails, null, 2)}\n\n`;
      }
      
      description += `Browser: ${req.headers['user-agent']}\n`;
      description += `Timestamp: ${new Date().toISOString()}\n`;
      
      // Create the support ticket with auto-generated content
      const ticket = await storage.createSupportTicket({
        title,
        description,
        userId: req.user.id,
        branchId: req.user.branchId,
        status: 'open',
        priority: priority || 'medium'
      });
      
      // Log the user action
      await storage.logUserAction({
        userId: req.user.id,
        actionType: 'create',
        entityType: 'support_ticket',
        entityId: ticket.id,
        details: `Auto-generated support ticket from ${pageContext} page`
      });
      
      res.status(201).json({
        success: true,
        message: 'Support ticket generated successfully',
        ticket
      });
    } catch (err) {
      res.status(500).json({ 
        success: false,
        message: `Error generating support ticket: ${err}` 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
