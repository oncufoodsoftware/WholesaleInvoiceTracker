import { Request, Response } from "express";
import { storage } from "./storage";
import { Invoice, FinancialTransaction } from "@shared/schema";

// Calculate monthly revenue from invoices
export async function getMonthlyRevenue(branchId?: number): Promise<any[]> {
  try {
    // Get all invoices
    let invoices: Invoice[];
    if (branchId) {
      invoices = await storage.getInvoicesByBranch(branchId);
    } else {
      invoices = await storage.getAllInvoices();
    }

    // Group invoices by month and year
    const monthlyRevenue = new Map<string, number>();
    
    // Get data for the past 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthlyRevenue.set(key, 0);
    }

    // Process invoices
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate);
      // Only include invoices from the last 12 months
      if (invoiceDate >= new Date(now.setMonth(now.getMonth() - 12))) {
        const key = invoiceDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        // Calculate amount based on invoice type (credit notes are negative)
        const amount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
        
        // Add to monthly total if the key exists
        if (monthlyRevenue.has(key)) {
          monthlyRevenue.set(key, monthlyRevenue.get(key)! + amount);
        }
      }
    });

    // Convert to sorted array for the response
    const result = Array.from(monthlyRevenue.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        // Sort by date (older first)
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return result;
  } catch (error) {
    console.error("Error calculating monthly revenue:", error);
    throw error;
  }
}

// Calculate monthly expenses
export async function getMonthlyExpenses(branchId?: number): Promise<any[]> {
  try {
    // Get all financial transactions
    let transactions: FinancialTransaction[];
    if (branchId) {
      // Get transactions for specific branch for the past year
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      transactions = await storage.getTransactionsByDateRange(branchId, startDate, new Date());
    } else {
      // We'll need all transactions and filter them later
      // This is a simplification - in a real app, you'd have a method to get all transactions by date range
      transactions = await storage.getAllFinancialTransactions();
    }

    // Filter only expense transactions
    const expenses = transactions.filter(tx => tx.type === 'expense');

    // Group expenses by month and year
    const monthlyExpenses = new Map<string, number>();
    
    // Get data for the past 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthlyExpenses.set(key, 0);
    }

    // Process expenses
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      // Only include expenses from the last 12 months
      if (expenseDate >= new Date(now.setMonth(now.getMonth() - 12))) {
        const key = expenseDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        // Add to monthly total if the key exists
        if (monthlyExpenses.has(key)) {
          monthlyExpenses.set(key, monthlyExpenses.get(key)! + expense.amount);
        }
      }
    });

    // Convert to sorted array for the response
    const result = Array.from(monthlyExpenses.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        // Sort by date (older first)
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return result;
  } catch (error) {
    console.error("Error calculating monthly expenses:", error);
    throw error;
  }
}

// Get expense categories distribution
export async function getExpenseCategoriesDistribution(branchId?: number): Promise<any[]> {
  try {
    // Get all financial transactions
    let transactions: FinancialTransaction[];
    if (branchId) {
      // Get transactions for specific branch for the past year
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      transactions = await storage.getTransactionsByDateRange(branchId, startDate, new Date());
    } else {
      // This is a simplification - in a real app, you'd have a method to get all transactions by date range
      transactions = await storage.getAllFinancialTransactions();
    }

    // Filter only expense transactions
    const expenses = transactions.filter(tx => tx.type === 'expense');

    // Group expenses by category
    const categoryDistribution = new Map<string, number>();
    
    // Process expenses
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      
      if (categoryDistribution.has(category)) {
        categoryDistribution.set(category, categoryDistribution.get(category)! + expense.amount);
      } else {
        categoryDistribution.set(category, expense.amount);
      }
    });

    // Convert to array for the response
    const result = Array.from(categoryDistribution.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount (highest first)

    return result;
  } catch (error) {
    console.error("Error calculating expense categories:", error);
    throw error;
  }
}

// Get supplier payment history
export async function getSupplierPaymentHistory(supplierId: number): Promise<any[]> {
  try {
    // Get all invoices for the supplier
    const invoices = await storage.getInvoicesBySupplier(supplierId);
    
    // Group invoices by month
    const monthlyPayments = new Map<string, { total: number, paid: number }>();
    
    // Get data for the past 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthlyPayments.set(key, { total: 0, paid: 0 });
    }

    // Process invoices
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate);
      // Only include invoices from the last 12 months
      if (invoiceDate >= new Date(now.setMonth(now.getMonth() - 12))) {
        const key = invoiceDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        
        // Add to monthly totals if the key exists
        if (monthlyPayments.has(key)) {
          const current = monthlyPayments.get(key)!;
          const invoiceAmount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
          
          monthlyPayments.set(key, {
            total: current.total + invoiceAmount,
            paid: current.paid + (invoice.paidAmount || 0)
          });
        }
      }
    });

    // Convert to sorted array for the response
    const result = Array.from(monthlyPayments.entries())
      .map(([month, data]) => ({ 
        month, 
        total: data.total,
        paid: data.paid,
        outstanding: data.total - data.paid
      }))
      .sort((a, b) => {
        // Sort by date (older first)
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return result;
  } catch (error) {
    console.error("Error calculating supplier payment history:", error);
    throw error;
  }
}

// Get branch performance comparison
export async function getBranchPerformanceMetrics(): Promise<any[]> {
  try {
    // Get all branches
    const branches = await storage.getAllBranches();
    
    // Get all invoices
    const allInvoices = await storage.getAllInvoices();
    
    const branchMetrics = await Promise.all(branches.map(async branch => {
      // Filter invoices for this branch
      const branchInvoices = allInvoices.filter(invoice => invoice.branchId === branch.id);
      
      // Calculate total revenue
      const revenue = branchInvoices.reduce((sum, invoice) => {
        const amount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
        return sum + amount;
      }, 0);
      
      // Calculate outstanding amount
      const outstanding = branchInvoices.reduce((sum, invoice) => {
        if (invoice.status !== 'paid') {
          const outstandingAmount = invoice.type === 'credit_note' 
            ? -(invoice.amount - (invoice.paidAmount || 0))
            : (invoice.amount - (invoice.paidAmount || 0));
          return sum + outstandingAmount;
        }
        return sum;
      }, 0);
      
      // Get financial transactions for this branch
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const transactions = await storage.getTransactionsByDateRange(branch.id, startDate, new Date());
      
      // Calculate total expenses
      const expenses = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      // Calculate profit
      const profit = revenue - expenses;
      
      // Calculate profit margin
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return {
        id: branch.id,
        name: branch.name,
        revenue,
        expenses,
        profit,
        profitMargin,
        outstanding
      };
    }));
    
    return branchMetrics;
  } catch (error) {
    console.error("Error calculating branch performance metrics:", error);
    throw error;
  }
}

// Return analytics data for a specific branch or all branches
export async function getAnalyticsData(req: Request, res: Response) {
  try {
    // Check if we need to filter by branch
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    
    // Get revenue data
    const revenue = await getMonthlyRevenue(branchId);
    
    // Get expense data
    const expenses = await getMonthlyExpenses(branchId);
    
    // Get expense categories
    const expenseCategories = await getExpenseCategoriesDistribution(branchId);
    
    // Get branch performance metrics
    const branchMetrics = await getBranchPerformanceMetrics();
    
    // Get top suppliers with outstanding amounts
    const suppliers = await storage.getAllSuppliers();
    const allInvoices = await storage.getAllInvoices();
    
    const supplierMetrics = suppliers.map(supplier => {
      // Get all invoices for this supplier
      const supplierInvoices = allInvoices.filter(invoice => invoice.supplierId === supplier.id);
      
      // Calculate total and outstanding amounts
      const total = supplierInvoices.reduce((sum, invoice) => {
        const amount = invoice.type === 'credit_note' ? -invoice.amount : invoice.amount;
        return sum + amount;
      }, 0);
      
      const outstanding = supplierInvoices.reduce((sum, invoice) => {
        if (invoice.status !== 'paid') {
          const outstandingAmount = invoice.type === 'credit_note' 
            ? -(invoice.amount - (invoice.paidAmount || 0))
            : (invoice.amount - (invoice.paidAmount || 0));
          return sum + outstandingAmount;
        }
        return sum;
      }, 0);
      
      // Calculate payment score (0-10)
      const paymentScore = total > 0 ? Math.min(10, Math.round((1 - outstanding / total) * 10)) : 10;
      
      return {
        id: supplier.id,
        name: supplier.name,
        total,
        outstanding,
        paymentScore
      };
    });
    
    // Sort suppliers by outstanding amount (highest first)
    const topSuppliers = supplierMetrics
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);
    
    res.json({
      revenue,
      expenses,
      expenseCategories,
      branchMetrics,
      topSuppliers
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ message: `Error fetching analytics data: ${error}` });
  }
}

// Fetch revenue forecast data
export async function getRevenueForecast(req: Request, res: Response) {
  try {
    // Check if we need to filter by branch
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    
    // Get revenue data
    const revenue = await getMonthlyRevenue(branchId);
    
    // Get expense data
    const expenses = await getMonthlyExpenses(branchId);
    
    res.json({
      revenue,
      expenses
    });
  } catch (error) {
    console.error("Error fetching revenue forecast data:", error);
    res.status(500).json({ message: `Error fetching revenue forecast data: ${error}` });
  }
}