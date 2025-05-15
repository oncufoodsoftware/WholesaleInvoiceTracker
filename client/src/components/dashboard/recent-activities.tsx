import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  id: number;
  type: "invoice" | "payment" | "update" | "alert";
  message: string;
  timestamp: string;
  iconBg: string;
  icon: string;
}

// This would normally come from an API
const demoActivities: Activity[] = [
  {
    id: 1,
    type: "invoice",
    message: "New invoice INV-2023-056 added by Mark Wilson",
    timestamp: "24 Oct 2023, 14:35",
    iconBg: "bg-primary/10",
    icon: "receipt"
  },
  {
    id: 2,
    type: "payment",
    message: "Payment of $3,420.50 received for invoice INV-2023-055",
    timestamp: "22 Oct 2023, 10:22",
    iconBg: "bg-success/10",
    icon: "payments"
  },
  {
    id: 3,
    type: "update",
    message: "Sarah Johnson updated daily financial report for Downtown Branch",
    timestamp: "21 Oct 2023, 16:45",
    iconBg: "bg-warning/10",
    icon: "edit_note"
  },
  {
    id: 4,
    type: "alert",
    message: "Overdue payment reminder sent for invoice INV-2023-054",
    timestamp: "20 Oct 2023, 09:15",
    iconBg: "bg-destructive/10",
    icon: "report_problem"
  }
];

export function RecentActivities() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/activities"],
    enabled: false // Disable actual API call for now
  });

  // Use demo data for now
  const activities = data || demoActivities;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Recent Activities</CardTitle>
        <Link 
          href="#" // This would link to a full activities page
          className="text-primary text-sm flex items-center hover:underline"
        >
          <span>View All</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          // Skeleton loading state
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activities</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className={`h-8 w-8 rounded-full ${activity.iconBg} flex items-center justify-center`}>
                <span className={`material-icons text-sm ${activity.type === "invoice" ? "text-primary" : 
                                 activity.type === "payment" ? "text-success" : 
                                 activity.type === "update" ? "text-warning" : 
                                 "text-destructive"}`}>
                  {activity.icon}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
