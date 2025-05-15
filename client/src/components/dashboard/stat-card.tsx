import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
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
              "text-xs flex items-center mt-1",
              trend.direction === "up" ? "text-emerald-500" : 
              trend.direction === "down" ? "text-red-500" : 
              "text-muted-foreground"
            )}>
              {trend.direction === "up" && <ArrowUp className="h-3 w-3 mr-1" />}
              {trend.direction === "down" && <ArrowDown className="h-3 w-3 mr-1" />}
              {trend.direction === "neutral" && <Minus className="h-3 w-3 mr-1" />}
              <span>{trend.value} {trend.text}</span>
            </p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", iconBgClass)}>
          <div className={cn(iconColorClass)}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}
