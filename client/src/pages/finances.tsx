import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
// Removed unused Button import
import { Input } from "@/components/ui/input";
// Removed unused imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailySummary } from "@/components/finances/daily-summary";
import { TransactionList } from "@/components/finances/transaction-list";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

// Remove unused schema as buttons are no longer needed

export default function Finances() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState("sales");

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
  });

  // Set the default branch for branch managers
  useState(() => {
    if (user && user.role === "branch_manager" && user.branchId) {
      setSelectedBranch(user.branchId.toString());
    } else if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id.toString());
    }
  });

  // Remove unused form as buttons are no longer needed

  // Update selected date based on date range
  useState(() => {
    const today = new Date();
    let newDate = today.toISOString().split("T")[0];
    
    switch (dateRange) {
      case "today":
        newDate = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        newDate = yesterday.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        newDate = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        newDate = monthStart.toISOString().split("T")[0];
        break;
      case "year":
        const yearStart = new Date(today.getFullYear(), 0, 1);
        newDate = yearStart.toISOString().split("T")[0];
        break;
      case "custom":
        newDate = customStartDate;
        break;
      default:
        newDate = today.toISOString().split("T")[0];
    }
    
    if (newDate !== selectedDate) {
      setSelectedDate(newDate);
    }
  }, [dateRange, customStartDate]);

  // Remove unused functions as buttons are no longer needed

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Branch Financial Tracking</h2>
      </div>

      {/* Branch selector and date */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Branch</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={user?.role === "branch_manager"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch: any) => (
                    <SelectItem 
                      key={branch.id} 
                      value={branch.id.toString()}
                      disabled={user?.role === "branch_manager" && user?.branchId !== branch.id}
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Financial Summary */}
      {selectedBranch && (
        <DailySummary 
          branchId={parseInt(selectedBranch)} 
          date={new Date(selectedDate)} 
        />
      )}

      {/* Daily transactions */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b">
            <TabsList className="bg-transparent">
              <TabsTrigger
                value="sales"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Sales
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sales" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              type="income"
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
              type="expense"
            />
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <TransactionList
              branchId={selectedBranch ? parseInt(selectedBranch) : 0}
              date={selectedDate}
            />
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
}
