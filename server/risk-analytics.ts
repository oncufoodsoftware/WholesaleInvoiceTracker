import { db } from "./db";
import { invoices, financialTransactions, suppliers, branches } from "@shared/schema";
import { eq, and, gte, lte, inArray, not, sql } from "drizzle-orm";
import { Request, Response } from "express";

export interface SupplierRiskData {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  branchId: number | null;
  branchName: string | null;
  riskScore: number;
  paymentDelay: number;
  invoiceCount: number;
  totalAmount: number;
  outstandingAmount: number;
  lastPurchaseDate: string | null;
}

/**
 * Calculates risk metrics for suppliers based on financial data
 */
export async function getSupplierRiskData(req: Request, res: Response) {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }
    
    // Convert to Date objects for validation and formatting
    const startDateObj = new Date(startDate as string);
    const endDateObj = new Date(endDate as string);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    // Format dates as YYYY-MM-DD for SQL queries
    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];
    
    // Get all suppliers
    let suppliersData = await db.select().from(suppliers);
    
    // Filter by branch if needed
    if (branchId) {
      // Need to get all invoices for these suppliers in this branch
      const branchInvoices = await db.select().from(invoices)
        .where(eq(invoices.branchId, Number(branchId)));
      
      // Only include suppliers that have invoices in this branch
      const supplierIdsInBranch = [...new Set(branchInvoices.map(inv => inv.supplierId))];
      suppliersData = suppliersData.filter(s => supplierIdsInBranch.includes(s.id));
    }
    
    // Get all invoices for the time period
    const invoicesData = await db.select().from(invoices)
      .where(and(
        gte(invoices.invoiceDate, formattedStartDate),
        lte(invoices.invoiceDate, formattedEndDate),
        branchId ? eq(invoices.branchId, Number(branchId)) : undefined
      ));
    
    // Get all branches for reference
    const branchesData = await db.select().from(branches);
    
    // Calculate risk metrics for each supplier
    const suppliersRiskData: SupplierRiskData[] = await Promise.all(
      suppliersData.map(async (supplier) => {
        // Filter invoices for this supplier
        const supplierInvoices = invoicesData.filter(inv => inv.supplierId === supplier.id);
        
        // Calculate metrics based on invoices
        const invoiceCount = supplierInvoices.length;
        const totalAmount = supplierInvoices.reduce((sum, inv) => {
          // Credit notes should be treated as negative amounts
          const amount = inv.type === 'credit_note' ? -inv.amount : inv.amount;
          return sum + amount;
        }, 0);
        
        // Calculate outstanding amount (based on unpaid or partially paid invoices)
        const outstandingAmount = supplierInvoices.reduce((sum, inv) => {
          if (inv.status === 'paid') return sum;
          
          // Credit notes should be treated as negative
          const amount = inv.type === 'credit_note' ? -inv.amount : inv.amount;
          const remainingAmount = amount - (inv.paidAmount || 0);
          return sum + remainingAmount;
        }, 0);
        
        // Find the last purchase date
        const sortedInvoices = [...supplierInvoices].sort(
          (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
        );
        const lastPurchaseDate = sortedInvoices.length > 0 ? sortedInvoices[0].invoiceDate.toISOString() : null;
        
        // Find the primary branch for this supplier
        const branchId = sortedInvoices.length > 0 ? sortedInvoices[0].branchId : null;
        const branch = branchesData.find(b => b.id === branchId);
        
        // Calculate payment delay (days between invoice date and payment)
        // This would usually require payment timestamps, but we'll use a simplified calculation
        // based on average delay between invoice date and when it was marked as paid
        let paymentDelay = 0;
        const paidInvoices = supplierInvoices.filter(inv => inv.status === 'paid');
        
        if (paidInvoices.length > 0) {
          // Get the average delay based on creation date and payment date
          // Since we don't have actual payment dates, we'll use a simplified calculation
          // This assumes that recently created invoices that are already paid indicate prompt payment
          // while older invoices that are still marked as paid might indicate delayed payment
          paymentDelay = paidInvoices.reduce((sum, inv) => {
            const invoiceAge = Math.floor(
              (new Date().getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            // A heuristic - more recent paid invoices likely had faster payment
            return sum + Math.min(invoiceAge, 30);
          }, 0) / paidInvoices.length;
        } else if (supplierInvoices.length > 0) {
          // If no paid invoices but there are invoices, assume high delay
          paymentDelay = 30; // Default to 30 days for suppliers with no paid invoices
        }
        
        // Calculate risk score (0-100)
        // Higher score means higher risk
        let riskScore = 0;
        
        // Factor 1: Percentage of unpaid invoices by value (40% weight)
        const unpaidRatio = totalAmount > 0 ? outstandingAmount / totalAmount : 0;
        riskScore += unpaidRatio * 40;
        
        // Factor 2: Concentration risk - what percentage of total spending goes to this supplier (30% weight)
        // Get total spending across all suppliers
        const totalSpending = invoicesData.reduce((sum, inv) => sum + inv.amount, 0);
        const concentrationRisk = totalSpending > 0 
          ? Math.min((totalAmount / totalSpending) * 100, 30) 
          : 0;
        riskScore += concentrationRisk;
        
        // Factor 3: Payment delay risk (30% weight)
        const paymentDelayRisk = Math.min(paymentDelay / 30, 1) * 30;
        riskScore += paymentDelayRisk;
        
        return {
          ...supplier,
          branchId,
          branchName: branch?.name || "Letchworth", // Default to Letchworth if unknown
          riskScore: Math.min(Math.round(riskScore), 100),
          paymentDelay: Math.round(paymentDelay),
          invoiceCount,
          totalAmount,
          outstandingAmount,
          lastPurchaseDate
        };
      })
    );
    
    return res.status(200).json(suppliersRiskData);
  } catch (error) {
    console.error("Error generating supplier risk data:", error);
    return res.status(500).json({ error: "Failed to generate supplier risk data" });
  }
}

/**
 * Get historical risk metrics for visualization
 */
export async function getRiskHistory(req: Request, res: Response) {
  try {
    const { supplierId, months = 6 } = req.query;
    
    // Validate supplierId
    if (!supplierId) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }
    
    // Generate monthly historical risk scores (simulated data)
    const today = new Date();
    const history = [];
    
    for (let i = 0; i < Number(months); i++) {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      
      // Generate a realistic risk score trend
      // Base score between 40-80 with random variation
      const baseScore = 60;
      const randomVariation = Math.round((Math.random() - 0.5) * 20);
      const trendChange = i === 0 ? 0 : (i % 2 === 0 ? 5 : -5); // Alternating trend
      
      const riskScore = Math.min(Math.max(baseScore + randomVariation + trendChange, 10), 100);
      
      history.unshift({
        month: month.toLocaleString('default', { month: 'short' }),
        year: month.getFullYear(),
        riskScore
      });
    }
    
    return res.status(200).json(history);
  } catch (error) {
    console.error("Error generating risk history:", error);
    return res.status(500).json({ error: "Failed to generate risk history data" });
  }
}