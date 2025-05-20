import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AchievementPopup, AchievementProps } from '../components/ui/achievement-popup';

// Define achievement types
export type AchievementType = 'task' | 'milestone' | 'financial' | 'improvement';

// Define achievement triggers
export enum AchievementTrigger {
  // Invoice related
  INVOICE_CREATED = 'invoice_created',
  INVOICES_COUNT_MILESTONE = 'invoices_count_milestone',
  INVOICE_VALUE_MILESTONE = 'invoice_value_milestone',
  ALL_INVOICES_PAID = 'all_invoices_paid',
  
  // Financial related
  POSITIVE_CASH_FLOW = 'positive_cash_flow',
  SALES_MILESTONE = 'sales_milestone',
  COST_REDUCTION = 'cost_reduction',
  
  // Supplier related
  SUPPLIER_ADDED = 'supplier_added',
  SUPPLIER_RISK_REDUCED = 'supplier_risk_reduced',
  SUPPLIER_COUNT_MILESTONE = 'supplier_count_milestone',
  
  // Branch related
  BRANCH_ADDED = 'branch_added',
  BRANCH_PERFORMANCE = 'branch_performance',
  
  // User related
  LOGIN_STREAK = 'login_streak',
  FIRST_REPORT = 'first_report',
  USER_ADDED = 'user_added'
}

// Stored achievement data
interface AchievementRecord {
  id: string;
  trigger: AchievementTrigger;
  timestamp: number;
  data?: any;
}

// Context data structure
interface AchievementContextType {
  achievements: AchievementRecord[];
  triggerAchievement: (
    trigger: AchievementTrigger, 
    title: string, 
    description: string,
    type: AchievementType,
    data?: any
  ) => void;
  checkAchievement: (trigger: AchievementTrigger, data?: any) => void;
  dismissCurrentAchievement: () => void;
}

// Create context
const AchievementContext = createContext<AchievementContextType | null>(null);

// Achievement thresholds and conditions
const achievementConditions = {
  [AchievementTrigger.INVOICES_COUNT_MILESTONE]: (count: number) => 
    [10, 50, 100, 500].includes(count),
  
  [AchievementTrigger.INVOICE_VALUE_MILESTONE]: (value: number) => 
    [1000, 5000, 10000, 50000, 100000].some(milestone => value >= milestone && value < milestone * 1.1),
  
  [AchievementTrigger.SALES_MILESTONE]: (sales: number) => 
    [5000, 20000, 50000, 100000].some(milestone => sales >= milestone && sales < milestone * 1.1),
  
  [AchievementTrigger.SUPPLIER_COUNT_MILESTONE]: (count: number) => 
    [5, 10, 25, 50].includes(count),
  
  [AchievementTrigger.LOGIN_STREAK]: (days: number) => 
    [3, 7, 14, 30].includes(days)
};

// Provider component
export function AchievementProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<{
    props: Omit<AchievementProps, 'onClose'>;
    id: string;
  } | null>(null);

  // Load achievements from localStorage on mount
  useEffect(() => {
    const storedAchievements = localStorage.getItem('achievements');
    if (storedAchievements) {
      try {
        setAchievements(JSON.parse(storedAchievements));
      } catch (e) {
        console.error('Failed to parse stored achievements', e);
        localStorage.removeItem('achievements');
      }
    }
  }, []);

  // Save achievements to localStorage when they change
  useEffect(() => {
    try {
      // Limit the size of achievements if needed
      const achievementsToStore = achievements.slice(-20); // Store only the most recent 20 achievements
      localStorage.setItem('achievements', JSON.stringify(achievementsToStore));
    } catch (error) {
      console.error('Failed to save achievements to localStorage', error);
      // If quota exceeded, try to clear some space
      try {
        localStorage.removeItem('achievements');
        // Try to save a smaller subset
        const reducedAchievements = achievements.slice(-10); // Only store most recent 10
        localStorage.setItem('achievements', JSON.stringify(reducedAchievements));
      } catch (innerError) {
        console.error('Could not save achievements even after cleanup', innerError);
      }
    }
  }, [achievements]);

  // Trigger an achievement
  const triggerAchievement = (
    trigger: AchievementTrigger,
    title: string,
    description: string,
    type: AchievementType,
    data?: any
  ) => {
    const id = `${trigger}_${Date.now()}`;
    
    // Add to achievement history
    setAchievements(prev => [
      ...prev,
      {
        id,
        trigger,
        timestamp: Date.now(),
        data
      }
    ]);

    // Show the achievement notification
    setCurrentAchievement({
      props: {
        title, 
        description,
        type
      },
      id
    });
  };

  // Check if an achievement should be triggered based on conditions
  const checkAchievement = (trigger: AchievementTrigger, data?: any) => {
    switch (trigger) {
      case AchievementTrigger.INVOICE_CREATED:
        triggerAchievement(
          trigger,
          'Invoice Created!',
          'You\'ve successfully created a new invoice.',
          'task'
        );
        break;
        
      case AchievementTrigger.INVOICES_COUNT_MILESTONE:
        if (data && achievementConditions[trigger](data.count)) {
          triggerAchievement(
            trigger,
            `${data.count} Invoices Milestone!`,
            `You've reached ${data.count} invoices in the system. Great record keeping!`,
            'milestone',
            data
          );
        }
        break;
        
      case AchievementTrigger.INVOICE_VALUE_MILESTONE:
        if (data && achievementConditions[trigger](data.value)) {
          // Find the closest milestone value
          const milestone = [1000, 5000, 10000, 50000, 100000]
            .find(m => data.value >= m && data.value < m * 1.1);
            
          if (milestone) {
            triggerAchievement(
              trigger,
              `£${milestone.toLocaleString()} Invoice Value!`,
              `You've just processed an invoice worth over £${milestone.toLocaleString()}!`,
              'financial',
              data
            );
          }
        }
        break;
        
      case AchievementTrigger.ALL_INVOICES_PAID:
        triggerAchievement(
          trigger,
          'All Caught Up!',
          'All invoices are marked as paid. Outstanding financial management!',
          'financial'
        );
        break;
        
      case AchievementTrigger.POSITIVE_CASH_FLOW:
        triggerAchievement(
          trigger,
          'Positive Cash Flow!',
          `Your business is showing positive cash flow for ${data?.period || 'this period'}.`,
          'financial',
          data
        );
        break;
        
      case AchievementTrigger.SALES_MILESTONE:
        if (data && achievementConditions[trigger](data.value)) {
          // Find the closest milestone value
          const milestone = [5000, 20000, 50000, 100000]
            .find(m => data.value >= m && data.value < m * 1.1);
            
          if (milestone) {
            triggerAchievement(
              trigger,
              `£${milestone.toLocaleString()} in Sales!`,
              `You've reached £${milestone.toLocaleString()} in ${data.period || 'sales'}!`,
              'financial',
              data
            );
          }
        }
        break;
        
      case AchievementTrigger.COST_REDUCTION:
        if (data && data.percentage >= 5) {
          triggerAchievement(
            trigger,
            'Cost Reduction Champion!',
            `You've reduced expenses by ${data.percentage}% compared to ${data.comparedTo || 'previous period'}.`,
            'improvement',
            data
          );
        }
        break;
        
      case AchievementTrigger.SUPPLIER_ADDED:
        triggerAchievement(
          trigger,
          'New Supplier Added!',
          'You\'ve successfully added a new supplier to your network.',
          'task'
        );
        break;
        
      case AchievementTrigger.SUPPLIER_RISK_REDUCED:
        if (data && data.reduction >= 10) {
          triggerAchievement(
            trigger,
            'Risk Reducer!',
            `You've reduced supplier risk by ${data.reduction}% for ${data.supplier || 'a supplier'}.`,
            'improvement',
            data
          );
        }
        break;
        
      case AchievementTrigger.SUPPLIER_COUNT_MILESTONE:
        if (data && achievementConditions[trigger](data.count)) {
          triggerAchievement(
            trigger,
            `${data.count} Suppliers Milestone!`,
            `You're now working with ${data.count} suppliers. Your business is growing!`,
            'milestone',
            data
          );
        }
        break;
        
      case AchievementTrigger.BRANCH_ADDED:
        triggerAchievement(
          trigger,
          'New Branch Opened!',
          'You\'ve successfully added a new branch to your business.',
          'milestone'
        );
        break;
        
      case AchievementTrigger.BRANCH_PERFORMANCE:
        if (data && data.increase >= 10) {
          triggerAchievement(
            trigger,
            'Branch Performance Star!',
            `${data.branch || 'A branch'} has improved performance by ${data.increase}%!`,
            'improvement',
            data
          );
        }
        break;
        
      case AchievementTrigger.LOGIN_STREAK:
        if (data && achievementConditions[trigger](data.days)) {
          triggerAchievement(
            trigger,
            `${data.days}-Day Streak!`,
            `You've logged in for ${data.days} consecutive days. Dedication pays off!`,
            'improvement',
            data
          );
        }
        break;
        
      case AchievementTrigger.FIRST_REPORT:
        triggerAchievement(
          trigger,
          'First Report Generated!',
          'You\'ve generated your first financial report. Knowledge is power!',
          'task'
        );
        break;
        
      case AchievementTrigger.USER_ADDED:
        triggerAchievement(
          trigger,
          'Team Growing!',
          'You\'ve added a new user to the system. Your team is expanding!',
          'milestone'
        );
        break;
        
      default:
        console.warn(`No handler for achievement trigger: ${trigger}`);
    }
  };

  const dismissCurrentAchievement = () => {
    setCurrentAchievement(null);
  };

  return (
    <AchievementContext.Provider 
      value={{ 
        achievements, 
        triggerAchievement, 
        checkAchievement,
        dismissCurrentAchievement
      }}
    >
      {children}
      
      {currentAchievement && (
        <AchievementPopup
          {...currentAchievement.props}
          onClose={dismissCurrentAchievement}
        />
      )}
    </AchievementContext.Provider>
  );
}

// Hook for using achievements
export function useAchievements() {
  const context = useContext(AchievementContext);
  
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  
  return context;
}