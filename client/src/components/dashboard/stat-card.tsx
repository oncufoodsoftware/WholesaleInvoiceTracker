import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    text: string;
  };
  iconColorClass?: string;
  iconBgClass?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  iconColorClass = "text-primary",
  iconBgClass = "bg-primary/10"
}: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {trend && (
            <p className={cn(
              "text-xs flex items-center",
              trend.direction === "up" ? "text-success" : 
              trend.direction === "down" ? "text-destructive" : 
              "text-muted-foreground"
            )}>
              <span className="material-icons text-sm">
                {trend.direction === "up" ? "arrow_upward" : 
                trend.direction === "down" ? "arrow_downward" : 
                "remove"}
              </span>
              <span>{trend.value} {trend.text}</span>
            </p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", iconBgClass)}>
          <span className={cn("material-icons", iconColorClass)}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}
