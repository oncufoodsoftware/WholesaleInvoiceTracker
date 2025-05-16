import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Trophy, TrendingUp, Star } from 'lucide-react';
import { useAchievements, AchievementTrigger } from '@/hooks/use-achievements';

export function AchievementDemo() {
  const { checkAchievement } = useAchievements();

  const triggerAchievements = {
    task: () => {
      checkAchievement(AchievementTrigger.INVOICE_CREATED);
    },
    milestone: () => {
      checkAchievement(AchievementTrigger.SUPPLIER_COUNT_MILESTONE, { count: 5 });
    },
    financial: () => {
      checkAchievement(AchievementTrigger.SALES_MILESTONE, { 
        value: 50000,
        period: 'this month'
      });
    },
    improvement: () => {
      checkAchievement(AchievementTrigger.SUPPLIER_RISK_REDUCED, {
        reduction: 15,
        supplier: 'Allgoods Ltd'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Demo</CardTitle>
        <CardDescription>Test the contextual achievement celebration system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={triggerAchievements.task}
            variant="outline"
            className="flex items-center gap-2 h-auto py-4"
          >
            <Star className="h-5 w-5 text-yellow-500" />
            <div className="text-left">
              <p className="font-medium">Task Completion</p>
              <p className="text-xs text-muted-foreground">Created new invoice</p>
            </div>
          </Button>

          <Button 
            onClick={triggerAchievements.milestone}
            variant="outline" 
            className="flex items-center gap-2 h-auto py-4"
          >
            <Trophy className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <p className="font-medium">Milestone Reached</p>
              <p className="text-xs text-muted-foreground">5 suppliers added</p>
            </div>
          </Button>

          <Button 
            onClick={triggerAchievements.financial}
            variant="outline"
            className="flex items-center gap-2 h-auto py-4"
          >
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <div className="text-left">
              <p className="font-medium">Financial Goal</p>
              <p className="text-xs text-muted-foreground">£50,000 in sales</p>
            </div>
          </Button>

          <Button 
            onClick={triggerAchievements.improvement}
            variant="outline"
            className="flex items-center gap-2 h-auto py-4"
          >
            <Award className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <p className="font-medium">System Improvement</p>
              <p className="text-xs text-muted-foreground">Reduced supplier risk</p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}