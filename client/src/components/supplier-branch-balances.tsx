import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

type BranchBalance = {
  branchId: number;
  branchName: string;
  amount: number;
};

interface SupplierBranchBalancesProps {
  balances: BranchBalance[];
}

export function SupplierBranchBalances({ balances }: SupplierBranchBalancesProps) {
  // Sort balances by branch name alphabetically
  const sortedBalances = [...balances].sort((a, b) => 
    a.branchName.localeCompare(b.branchName)
  );
  
  return (
    <div className="mt-2 space-y-1">
      <h4 className="text-sm font-semibold border-b pb-1">Branch Breakdown</h4>
      
      {sortedBalances.length > 0 ? (
        sortedBalances.map((balance) => (
          <div key={balance.branchId} className="flex justify-between items-center">
            <span className="text-xs">{balance.branchName}:</span>
            <span className={`text-xs font-medium ${balance.amount > 0 ? 'text-destructive' : balance.amount < 0 ? 'text-green-600' : ''}`}>
              £{Math.abs(balance.amount).toFixed(2)}
            </span>
          </div>
        ))
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-xs">No branch details available</span>
        </div>
      )}
    </div>
  );
}