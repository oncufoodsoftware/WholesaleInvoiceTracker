import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchPerformance {
  id: number;
  name: string;
  amount: number;
  percentage: number;
}

export function BranchPerformance() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["/api/branches"],
  });

  // This would be a separate query in a real application
  // For now, we'll create sample data based on branches
  const branchPerformance: BranchPerformance[] = branches ? 
    branches.map((branch: any, index: number) => {
      const multiplier = 1 - (index * 0.15); // Decreasing values for each branch
      return {
        id: branch.id,
        name: branch.name,
        amount: Math.round(50000 * multiplier * 100) / 100,
        percentage: Math.round(100 * multiplier)
      };
    }) : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Branch Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          // Skeleton loading state
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : branchPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branch data available.</p>
        ) : (
          branchPerformance.map((branch) => (
            <div key={branch.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{branch.name}</span>
                <span className="font-medium">${branch.amount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${branch.percentage}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
