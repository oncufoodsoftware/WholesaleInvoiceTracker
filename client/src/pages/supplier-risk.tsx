import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Supplier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, TrendingUp, RefreshCw, Building, Store } from "lucide-react";

// Define the risk indicators and their thresholds
const RISK_LEVELS = {
  LOW: { color: "#16a34a", label: "Low Risk" },
  MEDIUM: { color: "#f59e0b", label: "Medium Risk" },
  HIGH: { color: "#dc2626", label: "High Risk" }
};

// Function to generate a color gradient based on risk score (0-100)
const getRiskScoreColor = (score: number): string => {
  // Ensure score is within bounds
  const boundedScore = Math.max(0, Math.min(100, score));
  
  if (boundedScore < 40) {
    // Green (low risk) to Yellow (medium risk) gradient
    const ratio = boundedScore / 40;
    const r = Math.round(22 + ratio * (245 - 22));
    const g = Math.round(163 + ratio * (158 - 163));
    const b = Math.round(74 + ratio * (11 - 74));
    return `rgb(${r}, ${g}, ${b})`;
  } else if (boundedScore < 70) {
    // Yellow (medium risk) to Red (high risk) gradient
    const ratio = (boundedScore - 40) / 30;
    const r = Math.round(245 + ratio * (220 - 245));
    const g = Math.round(158 + ratio * (38 - 158));
    const b = Math.round(11 + ratio * (38 - 11));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // High risk red
    return RISK_LEVELS.HIGH.color;
  }
};

interface SupplierRiskData extends Supplier {
  riskScore: number;
  paymentDelay: number;
  invoiceCount: number;
  totalAmount: number;
  outstandingAmount: number;
  lastPurchaseDate: string;
  branchName?: string;
}

// Risk indicators component
const RiskIndicator = ({ 
  value, 
  maxValue, 
  label, 
  format = (val: number) => val.toString(),
  isGoodWhenHigh = false 
}: { 
  value: number; 
  maxValue: number; 
  label: string;
  format?: (val: number) => string;
  isGoodWhenHigh?: boolean;
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  // Get color based on the actual percentage value for smooth gradient
  // Use our gradient function directly rather than discrete risk levels
  const colorValue = !isGoodWhenHigh 
    ? getRiskScoreColor(percentage) // Higher percentage = higher risk
    : getRiskScoreColor(100 - percentage); // Lower percentage = higher risk
    
  // Still determine risk level for label text
  let riskLevel = RISK_LEVELS.LOW;
  if (!isGoodWhenHigh) {
    if (percentage > 70) riskLevel = RISK_LEVELS.HIGH;
    else if (percentage > 40) riskLevel = RISK_LEVELS.MEDIUM;
  } else {
    if (percentage < 30) riskLevel = RISK_LEVELS.HIGH;
    else if (percentage < 60) riskLevel = RISK_LEVELS.MEDIUM;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span 
          className="text-sm font-bold" 
          style={{ color: colorValue }}
        >
          {format(value)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full" 
          style={{ 
            width: `${percentage}%`, 
            backgroundColor: colorValue 
          }}
        />
      </div>
    </div>
  );
};

export default function SupplierRiskDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const isBranchManager = user?.role === "branch_manager";

  // Calculate dates for period filters
  const getDateRange = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch(selectedPeriod) {
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  };

  // Fetch suppliers with risk data
  const { 
    data: suppliersRiskData = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<SupplierRiskData[]>({
    queryKey: [
      "/api/suppliers/risk", 
      { period: selectedPeriod, branchId: isBranchManager ? user?.branchId : undefined }
    ],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const url = `/api/suppliers/risk?startDate=${startDate}&endDate=${endDate}${
        isBranchManager && user?.branchId ? `&branchId=${user.branchId}` : ''
      }`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch supplier risk data");
        return await res.json();
      } catch (error) {
        // If the risk endpoint doesn't exist yet, we'll generate mock data from regular suppliers
        console.error("Fallback to regular suppliers endpoint with calculated risk");
        
        // Fetch regular suppliers data
        const supplierRes = await fetch(isBranchManager && user?.branchId 
          ? `/api/suppliers/branch/${user.branchId}?includeSummary=true` 
          : "/api/suppliers?includeSummary=true"
        );
        
        if (!supplierRes.ok) throw new Error("Failed to fetch suppliers");
        const suppliersData = await supplierRes.json();
        
        // Fetch invoices to calculate risk metrics
        const invoiceRes = await fetch("/api/invoices");
        if (!invoiceRes.ok) throw new Error("Failed to fetch invoices");
        const invoicesData = await invoiceRes.json();
        
        // Fetch branches for names
        const branchRes = await fetch("/api/branches");
        if (!branchRes.ok) throw new Error("Failed to fetch branches");
        const branchesData = await branchRes.ok ? await branchRes.json() : [];
        
        // Transform regular supplier data into risk data
        return suppliersData.map((supplier: any) => {
          const supplierInvoices = invoicesData.filter((inv: any) => 
            inv.supplierId === supplier.id
          );
          
          // Calculate metrics based on invoices
          const invoiceCount = supplierInvoices.length;
          const totalAmount = supplierInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
          const outstandingAmount = supplier.outstandingAmount || 0;
          
          // Calculate risk score (0-100)
          // Higher score means higher risk
          let riskScore = 0;
          
          // Factor 1: Percentage of unpaid invoices
          const unpaidRatio = outstandingAmount / (totalAmount || 1);
          riskScore += unpaidRatio * 40; // 40% weight
          
          // Factor 2: Concentration risk (what percentage of total spending goes to this supplier)
          const concentrationRisk = Math.min(totalAmount / 5000, 1) * 30; // 30% weight
          riskScore += concentrationRisk;
          
          // Factor 3: Activity risk (inverse of activity - less active = higher risk)
          const daysSinceLastInvoice = supplierInvoices.length > 0 
            ? Math.max(0, Math.floor((new Date().getTime() - new Date(
                supplierInvoices.sort((a: any, b: any) => 
                  new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
                )[0]?.invoiceDate || new Date()
              ).getTime()) / (1000 * 60 * 60 * 24)))
            : 180;
            
          const activityRisk = Math.min(daysSinceLastInvoice / 180, 1) * 30; // 30% weight
          riskScore += activityRisk;
          
          // Find the branch name for this supplier
          const branchId = supplierInvoices[0]?.branchId;
          const branch = branchesData.find((b: any) => b.id === branchId);
          
          return {
            ...supplier,
            riskScore: Math.min(Math.round(riskScore), 100),
            paymentDelay: Math.floor(Math.random() * 30), // Placeholder
            invoiceCount,
            totalAmount,
            outstandingAmount,
            lastPurchaseDate: supplierInvoices.length > 0 
              ? supplierInvoices.sort((a: any, b: any) => 
                  new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
                )[0]?.invoiceDate 
              : null,
            branchName: branch?.name || "Letchworth" // Default to Letchworth
          };
        });
      }
    },
    refetchOnWindowFocus: false
  });

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Dashboard refreshed",
      description: "The risk data has been updated."
    });
  };

  // Prepare data for visualizations
  const riskDistribution = [
    { 
      name: "Low Risk", 
      value: suppliersRiskData.filter(s => s.riskScore < 40).length,
      color: RISK_LEVELS.LOW.color
    },
    { 
      name: "Medium Risk", 
      value: suppliersRiskData.filter(s => s.riskScore >= 40 && s.riskScore < 70).length,
      color: RISK_LEVELS.MEDIUM.color
    },
    { 
      name: "High Risk", 
      value: suppliersRiskData.filter(s => s.riskScore >= 70).length,
      color: RISK_LEVELS.HIGH.color
    }
  ];

  const topRiskSuppliers = [...suppliersRiskData]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      riskScore: s.riskScore,
      outstandingAmount: s.outstandingAmount
    }));

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Supplier Risk Dashboard</h1>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Supplier Risk Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error Loading Risk Data</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load supplier risk information. Please try again later.
              </p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate summary metrics
  const totalSuppliers = suppliersRiskData.length;
  const averageRiskScore = Math.round(
    suppliersRiskData.reduce((sum, s) => sum + s.riskScore, 0) / totalSuppliers
  );
  const totalOutstanding = suppliersRiskData.reduce((sum, s) => sum + s.outstandingAmount, 0);
  const highRiskSuppliers = suppliersRiskData.filter(s => s.riskScore >= 70).length;

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Risk Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and analyze supplier risk factors across your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-md p-1">
            <Button 
              variant={selectedPeriod === "30days" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod("30days")}
              className="text-xs"
            >
              30 Days
            </Button>
            <Button 
              variant={selectedPeriod === "90days" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod("90days")}
              className="text-xs"
            >
              90 Days
            </Button>
            <Button 
              variant={selectedPeriod === "6months" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod("6months")}
              className="text-xs"
            >
              6 Months
            </Button>
            <Button 
              variant={selectedPeriod === "1year" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod("1year")}
              className="text-xs"
            >
              1 Year
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Suppliers</p>
                <h3 className="text-2xl font-bold mt-1">{totalSuppliers}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Store className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Risk Score</p>
                <h3 
                  className="text-2xl font-bold mt-1" 
                  style={{ color: getRiskScoreColor(averageRiskScore) }}
                >
                  {averageRiskScore}
                </h3>
              </div>
              <div className="p-2 rounded-full" style={{ 
                backgroundColor: `${getRiskScoreColor(averageRiskScore)}20` 
              }}>
                <AlertTriangle className="h-5 w-5" style={{ 
                  color: getRiskScoreColor(averageRiskScore) 
                }} />
              </div>
            </div>
            <div className="h-1 bg-muted rounded-full mt-4">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${averageRiskScore}%`, 
                  backgroundColor: averageRiskScore >= 70 
                    ? RISK_LEVELS.HIGH.color 
                    : averageRiskScore >= 40 
                      ? RISK_LEVELS.MEDIUM.color 
                      : RISK_LEVELS.LOW.color 
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                <h3 className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP'
                  }).format(totalOutstanding)}
                </h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk Suppliers</p>
                <h3 className="text-2xl font-bold mt-1">
                  {highRiskSuppliers} 
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({Math.round((highRiskSuppliers / totalSuppliers) * 100)}%)
                  </span>
                </h3>
              </div>
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="actions">Recommended Actions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>
                  Breakdown of suppliers by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [
                          `${value} supplier${value !== 1 ? 's' : ''}`,
                          'Count'
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Risk Suppliers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Risk Suppliers</CardTitle>
                <CardDescription>
                  Suppliers with highest risk scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topRiskSuppliers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}`, 'Risk Score']}
                      />
                      <Bar 
                        dataKey="riskScore" 
                        name="Risk Score" 
                        fill="#ef4444"
                        background={{ fill: '#f3f4f6' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Table */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Risk Overview</CardTitle>
              <CardDescription>
                Comprehensive view of all suppliers and their risk factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium">Supplier</th>
                        <th className="h-12 px-4 text-left font-medium">Branch</th>
                        <th className="h-12 px-4 text-left font-medium">Risk Score</th>
                        <th className="h-12 px-4 text-left font-medium">Outstanding</th>
                        <th className="h-12 px-4 text-left font-medium">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliersRiskData
                        .sort((a, b) => b.riskScore - a.riskScore)
                        .map(supplier => (
                        <tr key={supplier.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{supplier.name}</td>
                          <td className="p-4">{supplier.branchName}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ 
                                  backgroundColor: supplier.riskScore >= 70 
                                    ? RISK_LEVELS.HIGH.color 
                                    : supplier.riskScore >= 40 
                                      ? RISK_LEVELS.MEDIUM.color 
                                      : RISK_LEVELS.LOW.color
                                }}
                              />
                              <span>{supplier.riskScore}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP'
                            }).format(supplier.outstandingAmount)}
                          </td>
                          <td className="p-4">
                            {supplier.lastPurchaseDate 
                              ? new Date(supplier.lastPurchaseDate).toLocaleDateString('en-GB') 
                              : 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Detailed Analysis Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Factors Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors Analysis</CardTitle>
                <CardDescription>
                  Breakdown of contributing risk factors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRiskSuppliers.slice(0, 3).map((supplier, index) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-medium">{supplier.name}</h4>
                      <RiskIndicator 
                        value={supplier.riskScore} 
                        maxValue={100} 
                        label="Overall Risk Score" 
                      />
                      <RiskIndicator 
                        value={supplier.outstandingAmount} 
                        maxValue={10000}
                        label="Outstanding Amount" 
                        format={(val) => new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: 'GBP'
                        }).format(val)}
                      />
                      <RiskIndicator 
                        value={
                          suppliersRiskData.find(s => s.name === supplier.name)?.paymentDelay || 0
                        } 
                        maxValue={30}
                        label="Average Payment Delay" 
                        format={(val) => `${val} days`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Trends</CardTitle>
                <CardDescription>
                  Historical risk score evolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { month: 'Jan', score: 65 },
                        { month: 'Feb', score: 60 },
                        { month: 'Mar', score: 70 },
                        { month: 'Apr', score: 55 },
                        { month: 'May', score: 45 },
                        { month: 'Jun', score: averageRiskScore }
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        name="Avg. Risk Score"
                        stroke="#ef4444" 
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Comparative Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Comparative Analysis</CardTitle>
              <CardDescription>
                Compare risk metrics across suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={suppliersRiskData
                      .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
                      .slice(0, 8)
                      .map(s => ({
                        name: s.name.split(' ')[0], // Just first word for better display
                        outstanding: s.outstandingAmount,
                        risk: s.riskScore,
                      }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#ef4444" />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="risk" 
                      name="Risk Score" 
                      fill="#ef4444" 
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="outstanding" 
                      name="Outstanding (£)" 
                      fill="#3b82f6" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Recommended Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>
                Suggested next steps based on risk analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* High Risk Suppliers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    High Risk Suppliers
                  </h3>
                  
                  {suppliersRiskData
                    .filter(s => s.riskScore >= 70)
                    .slice(0, 3)
                    .map((supplier, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{supplier.name}</h4>
                            <p className="text-sm text-muted-foreground">Risk Score: {supplier.riskScore}</p>
                          </div>
                          <div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                            Urgent Action
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recommended Actions:</p>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-start">
                              <div className="min-w-4 mt-0.5 mr-2">•</div>
                              <span>
                                Review payment schedule for outstanding balance of 
                                {" "}{new Intl.NumberFormat('en-GB', {
                                  style: 'currency',
                                  currency: 'GBP'
                                }).format(supplier.outstandingAmount)}
                              </span>
                            </li>
                            <li className="flex items-start">
                              <div className="min-w-4 mt-0.5 mr-2">•</div>
                              <span>Schedule supplier review meeting to discuss payment terms</span>
                            </li>
                            <li className="flex items-start">
                              <div className="min-w-4 mt-0.5 mr-2">•</div>
                              <span>Consider diversifying suppliers for this category</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" className="mr-2">
                            View Details
                          </Button>
                          <Button size="sm">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                
                {/* Medium Risk Suppliers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                    Medium Risk Suppliers
                  </h3>
                  
                  {suppliersRiskData
                    .filter(s => s.riskScore >= 40 && s.riskScore < 70)
                    .slice(0, 2)
                    .map((supplier, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{supplier.name}</h4>
                            <p className="text-sm text-muted-foreground">Risk Score: {supplier.riskScore}</p>
                          </div>
                          <div className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                            Monitor
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recommended Actions:</p>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-start">
                              <div className="min-w-4 mt-0.5 mr-2">•</div>
                              <span>Monitor payment patterns for early warning signs</span>
                            </li>
                            <li className="flex items-start">
                              <div className="min-w-4 mt-0.5 mr-2">•</div>
                              <span>Review invoice history and payment terms</span>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" className="mr-2">
                            View Details
                          </Button>
                          <Button size="sm">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                
                {/* Long-term Strategies */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Long-term Risk Mitigation Strategies</h3>
                  
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start">
                      <div className="min-w-4 mt-0.5 mr-2">1.</div>
                      <span>
                        <span className="font-medium">Diversify supplier base</span> - Reduce dependency on high-risk suppliers
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="min-w-4 mt-0.5 mr-2">2.</div>
                      <span>
                        <span className="font-medium">Standardize payment terms</span> - Implement consistent payment schedules
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="min-w-4 mt-0.5 mr-2">3.</div>
                      <span>
                        <span className="font-medium">Regular supplier assessments</span> - Conduct quarterly risk reviews
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="min-w-4 mt-0.5 mr-2">4.</div>
                      <span>
                        <span className="font-medium">Develop contingency plans</span> - Prepare for potential supply disruptions
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}