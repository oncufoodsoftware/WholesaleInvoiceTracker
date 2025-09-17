import OpenAI from "openai";
import { db } from "./db";
import { invoices, suppliers, branches, financialTransactions } from "@shared/schema";
import { sql } from "drizzle-orm";
import { Request, Response } from "express";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get business data summary for AI context
async function getBusinessDataSummary(branchId?: number) {
  try {
    // Get total outstanding balance from invoices instead of supplier_branch_balances
    // to avoid any schema issues
    const totalOutstandingQuery = branchId 
      ? sql`
          SELECT SUM(amount) as total 
          FROM invoices 
          WHERE branch_id = ${branchId}
          AND (status != 'paid' OR type = 'cash')
        `
      : sql`
          SELECT SUM(amount) as total 
          FROM invoices
          WHERE (status != 'paid' OR type = 'cash')
        `;
    
    const totalOutstandingResult = await db.execute(totalOutstandingQuery);
    const totalOutstanding = totalOutstandingResult.rows?.[0]?.total || 0;
    
    // Get recent invoice count
    const recentInvoicesQuery = branchId
      ? sql`
          SELECT COUNT(*) as count 
          FROM invoices 
          WHERE branch_id = ${branchId} 
          AND created_at > NOW() - INTERVAL '30 days'
        `
      : sql`
          SELECT COUNT(*) as count 
          FROM invoices 
          WHERE created_at > NOW() - INTERVAL '30 days'
        `;
    
    const recentInvoicesResult = await db.execute(recentInvoicesQuery);
    const recentInvoices = recentInvoicesResult.rows?.[0]?.count || 0;
    
    // Get top expense categories
    const topExpensesQuery = branchId
      ? sql`
          SELECT category, SUM(amount) as total
          FROM financial_transactions
          WHERE branch_id = ${branchId}
          AND type = 'expense'
          AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY category
          ORDER BY total DESC
          LIMIT 3
        `
      : sql`
          SELECT category, SUM(amount) as total
          FROM financial_transactions
          WHERE type = 'expense'
          AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY category
          ORDER BY total DESC
          LIMIT 3
        `;
    
    const topExpensesResult = await db.execute(topExpensesQuery);
    const topExpenses = topExpensesResult.rows || [];
    
    // Count suppliers with balances over £1000
    const highBalanceSuppliersQuery = branchId
      ? sql`
          SELECT COUNT(DISTINCT supplier_id) as count
          FROM supplier_branch_balances
          WHERE branch_id = ${branchId}
          AND amount > 1000
        `
      : sql`
          SELECT COUNT(DISTINCT supplier_id) as count
          FROM supplier_branch_balances
          WHERE amount > 1000
        `;
    
    const highBalanceSuppliersResult = await db.execute(highBalanceSuppliersQuery);
    const highBalanceSuppliers = highBalanceSuppliersResult.rows?.[0]?.count || 0;
    
    return {
      totalOutstanding: totalOutstanding || 0,
      recentInvoiceCount: recentInvoices || 0,
      topExpenseCategories: topExpenses || [],
      highBalanceSupplierCount: highBalanceSuppliers || 0
    };
  } catch (error) {
    console.error("Error getting business data summary:", error);
    return {
      totalOutstanding: 0,
      recentInvoiceCount: 0,
      topExpenseCategories: [],
      highBalanceSupplierCount: 0
    };
  }
}

// Generate personalized financial tips
export async function generateFinancialTips(branchId?: number) {
  try {
    const businessData = await getBusinessDataSummary(branchId);
    
    // We'll implement a different approach that doesn't rely on OpenAI API
    // for now, since we're experiencing rate limit issues
    
    // Generate financial tips based on business data without using OpenAI
    let tips = [];
    
    // Tip 1: Based on outstanding balance
    // Type safe checks for financial tips
    const outstandingBalance = typeof businessData.totalOutstanding === 'number' ? businessData.totalOutstanding : 0;
    if (outstandingBalance > 5000) {
      tips.push({
        title: "Review Outstanding Balances",
        description: "Your supplier outstanding balance is high. Consider negotiating payment terms or implementing a payment schedule."
      });
    } else {
      tips.push({
        title: "Maintain Supplier Relations",
        description: "Your supplier balances are at a healthy level. Continue maintaining good payment practices."
      });
    }
    
    // Tip 2: Based on expense categories
    tips.push({
      title: "Monitor Top Expenses",
      description: "Track your highest expense categories and look for potential areas to negotiate better prices or reduce costs."
    });
    
    // Tip 3: Based on high balance suppliers
    const highBalanceCount = typeof businessData.highBalanceSupplierCount === 'number' ? businessData.highBalanceSupplierCount : 0;
    if (highBalanceCount > 0) {
      tips.push({
        title: "Prioritize Large Payments",
        description: `You have ${highBalanceCount} supplier(s) with balances over £1000. Consider addressing these first.`
      });
    }
    
    // Tip 4: General cash flow advice
    tips.push({
      title: "Improve Cash Flow",
      description: "Create a weekly cash flow forecast to anticipate potential shortfalls and plan accordingly."
    });
    
    // Tip 5: Invoice management
    const recentInvoiceCount = typeof businessData.recentInvoiceCount === 'number' ? businessData.recentInvoiceCount : 0;
    if (recentInvoiceCount > 10) {
      tips.push({
        title: "Streamline Invoice Processing",
        description: "You're handling a high volume of invoices. Consider implementing automated processing to save time."
      });
    } else {
      tips.push({
        title: "Digitize Documentation",
        description: "Ensure all invoices are digitally stored and easily accessible for better financial tracking."
      });
    }
    
    // Skip OpenAI API call and return our generated tips
    const response = {
      choices: [
        {
          message: {
            content: JSON.stringify({ tips: tips.slice(0, 5) })
          }
        }
      ]
    };
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating financial tips:", error);
    // Return fallback tips if API fails
    return {
      tips: [
        {
          title: "Review Outstanding Balances",
          description: "Regularly review and prioritize outstanding supplier payments to maintain good relationships."
        },
        {
          title: "Track Expense Categories",
          description: "Monitor your top expense categories to identify potential areas for cost reduction."
        },
        {
          title: "Manage Cash Flow",
          description: "Create a weekly cash flow forecast to anticipate potential shortfalls and plan accordingly."
        }
      ]
    };
  }
}

// API endpoint handler
export async function getFinancialTips(req: Request, res: Response) {
  try {
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const tips = await generateFinancialTips(branchId);
    res.json(tips);
  } catch (error) {
    console.error("Error in financial tips endpoint:", error);
    res.status(500).json({ message: "Error generating financial tips", error: String(error) });
  }
}