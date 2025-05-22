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
    // Get total outstanding balance
    const totalOutstandingQuery = branchId 
      ? sql`
          SELECT SUM(amount) as total 
          FROM supplier_branch_balances 
          WHERE branch_id = ${branchId}
        `
      : sql`
          SELECT SUM(amount) as total 
          FROM supplier_branch_balances
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
          AND transaction_type = 'expense'
          AND created_at > NOW() - INTERVAL '30 days'
          GROUP BY category
          ORDER BY total DESC
          LIMIT 3
        `
      : sql`
          SELECT category, SUM(amount) as total
          FROM financial_transactions
          WHERE transaction_type = 'expense'
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
    
    const prompt = `
      You are a financial advisor for a business management system. Generate 3-5 personalized financial tips
      based on the following business data:
      
      - Total outstanding balance to suppliers: £${businessData.totalOutstanding}
      - Recent invoice count (last 30 days): ${businessData.recentInvoiceCount}
      - Top expense categories: ${JSON.stringify(businessData.topExpenseCategories)}
      - Number of suppliers with balances over £1000: ${businessData.highBalanceSupplierCount}
      
      Provide specific, actionable financial advice that would help this business improve their financial situation.
      Format your response as a JSON array of tip objects with 'title' and 'description' fields.
      Keep titles short (3-5 words) and descriptions concise (1-2 sentences).
      Focus on practical advice related to managing supplier relationships, cash flow, and expense reduction.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are a financial advisor that specializes in small business financial management." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
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