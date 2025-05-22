import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialTip {
  title: string;
  description: string;
}

interface FinancialTipsResponse {
  tips: FinancialTip[];
}

export function FinancialTipsSidebar() {
  const { user } = useAuth();
  
  // Set branch ID parameter based on user role
  const branchId = user?.role === 'branch_manager' ? user?.branchId : undefined;
  
  // Fetch financial tips from API
  const { data, isLoading, error } = useQuery<FinancialTipsResponse>({
    queryKey: ['/api/financial-tips', branchId],
    enabled: !!user, // Only fetch if user is logged in
  });

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
            <Skeleton className="h-4 w-36" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-3 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5 mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
            Financial Insights
          </CardTitle>
          <CardDescription>
            Unable to load financial tips
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground">
            We're having trouble connecting to our AI service. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
            Financial Insights
          </CardTitle>
          <Badge variant="outline" className="text-xs">AI Powered</Badge>
        </div>
        <CardDescription>
          Personalized financial tips for your business
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="all">All Tips</TabsTrigger>
            <TabsTrigger value="actionable">Actionable</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {data?.tips?.map((tip, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <h4 className="text-sm font-medium flex items-center text-primary">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {tip.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {tip.description}
                </p>
              </div>
            ))}
            
            {data?.tips?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No financial tips available at the moment. Check back later.
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="actionable" className="mt-0">
            {data?.tips?.slice(0, 2).map((tip, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <h4 className="text-sm font-medium flex items-center text-primary">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {tip.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {tip.description}
                </p>
              </div>
            ))}
            
            {data?.tips?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No actionable tips available at the moment. Check back later.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}