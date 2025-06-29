import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, CreditCardIcon, FileTextIcon, FilterIcon, RefreshCwIcon } from "lucide-react";
import { format } from "date-fns";

export default function PaymentTracking() {
  // Get current user info
  const { data: user } = useQuery({ queryKey: ["/api/user"] });
    
  const [filters, setFilters] = useState({
    branchId: "all",
    startDate: "",
    endDate: "",
  });

  // Update branch filter when user data loads
  useEffect(() => {
    if (user && (user as any)?.role === 'branch_manager' && (user as any)?.branchId) {
      setFilters(prev => ({
        ...prev,
        branchId: (user as any).branchId.toString()
      }));
    }
  }, [user]);

  // Fetch branches for filter dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return await res.json();
    }
  });

  // Fetch payment tracking data
  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/payments/tracking", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.branchId && filters.branchId !== "all") queryParams.append("branchId", filters.branchId);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      const res = await fetch(`/api/payments/tracking?${queryParams}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch payment tracking data");
      return await res.json();
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    // Don't allow branch managers to change branch
    if (key === 'branchId' && (user as any)?.role === 'branch_manager') {
      return;
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const resetBranchId = (user as any)?.role === 'branch_manager' 
      ? (user as any).branchId?.toString() || "all"
      : "all";
      
    setFilters({
      branchId: resetBranchId,
      startDate: "",
      endDate: "",
    });
  };

  const totalAmount = payments.reduce((sum: number, payment: any) => sum + payment.totalAmount, 0);
  const bankTransferTotal = payments.reduce((sum: number, payment: any) => sum + (payment.bankTransferAmount || 0), 0);
  const chequeTotal = payments.reduce((sum: number, payment: any) => sum + (payment.chequeAmount || 0), 0);

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Payment Tracking</h2>
          <Badge variant="secondary">{payments.length} payments</Badge>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-1">
          <RefreshCwIcon className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payments.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{bankTransferTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((bankTransferTotal / totalAmount) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cheques</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{chequeTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((chequeTotal / totalAmount) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter payments by branch and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={filters.branchId}
                onValueChange={(value) => handleFilterChange("branchId", value)}
                disabled={(user as any)?.role === 'branch_manager'}
              >
                <SelectTrigger className={(user as any)?.role === 'branch_manager' ? 'opacity-60' : ''}>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(user as any)?.role === 'branch_manager' && (
                <p className="text-xs text-muted-foreground">
                  Branch selection is locked to your assigned branch
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Complete history of all bulk payments to suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCwIcon className="h-6 w-6 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found for the selected criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Bank Transfer</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead>Cheque No.</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{payment.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.branchName}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        £{payment.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payment.bankTransferAmount > 0 ? (
                          <div className="flex items-center gap-1">
                            <CreditCardIcon className="h-3 w-3 text-green-600" />
                            £{payment.bankTransferAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.chequeAmount > 0 ? (
                          <div className="flex items-center gap-1">
                            <FileTextIcon className="h-3 w-3 text-blue-600" />
                            £{payment.chequeAmount.toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.chequeNumber ? (
                          <Badge variant="secondary">{payment.chequeNumber}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.notes || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}