import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Lightbulb, TrendingUp, DollarSign, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialTip {
  id: string;
  title: string;
  content: string;
  icon: "lightbulb" | "trending" | "dollar" | "target" | "zap";
  category: "general" | "invoices" | "cash-flow" | "suppliers" | "analytics" | "optimization";
  playfulness: "fun" | "encouraging" | "insightful";
}

interface FinancialTipTooltipProps {
  category?: FinancialTip["category"];
  className?: string;
  variant?: "default" | "compact" | "prominent";
  children?: React.ReactNode;
}

const financialTips: FinancialTip[] = [
  {
    id: "cash-flow-1",
    title: "💰 Cash Flow Magic",
    content: "Track your cash flow daily like checking your phone - it's that important! A healthy cash flow means happy business days ahead.",
    icon: "dollar",
    category: "cash-flow",
    playfulness: "fun"
  },
  {
    id: "invoices-1", 
    title: "⚡ Invoice Ninja Tips",
    content: "Send invoices faster than a lightning bolt! The quicker you invoice, the sooner you get paid. Your future self will thank you!",
    icon: "zap",
    category: "invoices",
    playfulness: "encouraging"
  },
  {
    id: "suppliers-1",
    title: "🎯 Supplier Relationships",
    content: "Treat your suppliers like gold - they're your business partners! Good relationships often lead to better payment terms and priority service.",
    icon: "target",
    category: "suppliers", 
    playfulness: "insightful"
  },
  {
    id: "analytics-1",
    title: "📊 Data Detective Mode",
    content: "Your numbers tell stories! Look for patterns in your best-performing periods and replicate those winning strategies.",
    icon: "trending",
    category: "analytics",
    playfulness: "fun"
  },
  {
    id: "general-1",
    title: "💡 Smart Money Moves",
    content: "Small, consistent improvements compound over time. Even a 1% improvement each month leads to significant growth by year-end!",
    icon: "lightbulb",
    category: "general",
    playfulness: "encouraging"
  },
  {
    id: "optimization-1",
    title: "🚀 Efficiency Boost",
    content: "Automate repetitive tasks wherever possible. Time saved on admin work is time gained for growing your business!",
    icon: "zap",
    category: "optimization",
    playfulness: "insightful"
  },
  {
    id: "cash-flow-2", 
    title: "🌊 Ride the Cash Wave",
    content: "Seasonal businesses should plan for dry spells during wet seasons. Build cash reserves when times are good!",
    icon: "trending",
    category: "cash-flow",
    playfulness: "fun"
  },
  {
    id: "invoices-2",
    title: "🎯 Payment Target Practice", 
    content: "Set payment terms that work for you! Don't be afraid to ask for partial payments upfront for large orders.",
    icon: "target",
    category: "invoices",
    playfulness: "encouraging"
  },
  {
    id: "suppliers-2",
    title: "💎 Supplier Gem Strategy",
    content: "Diversify your supplier base like a smart investor. Having backup suppliers prevents single points of failure in your supply chain.",
    icon: "lightbulb",
    category: "suppliers",
    playfulness: "insightful"
  },
  {
    id: "analytics-2",
    title: "🔍 Profit Magnifying Glass",
    content: "Focus on profit margins, not just revenue. A $1000 sale with 50% margin beats a $1500 sale with 20% margin every time!",
    icon: "dollar",
    category: "analytics",
    playfulness: "fun"
  }
];

const iconMap = {
  lightbulb: Lightbulb,
  trending: TrendingUp, 
  dollar: DollarSign,
  target: Target,
  zap: Zap
};

export function FinancialTipTooltip({ 
  category = "general", 
  className, 
  variant = "default",
  children 
}: FinancialTipTooltipProps) {
  const [currentTip, setCurrentTip] = useState<FinancialTip | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Filter tips by category, fallback to general if no category-specific tips
    const categoryTips = financialTips.filter(tip => tip.category === category);
    const tipsToUse = categoryTips.length > 0 ? categoryTips : financialTips.filter(tip => tip.category === "general");
    
    // Select a random tip
    const randomTip = tipsToUse[Math.floor(Math.random() * tipsToUse.length)];
    setCurrentTip(randomTip);
  }, [category]);

  if (!currentTip) return null;

  const IconComponent = iconMap[currentTip.icon];

  const triggerVariants = {
    default: "w-5 h-5 text-muted-foreground hover:text-primary cursor-help transition-colors",
    compact: "w-4 h-4 text-muted-foreground hover:text-primary cursor-help transition-colors", 
    prominent: "w-6 h-6 text-blue-500 hover:text-blue-600 cursor-help transition-colors animate-pulse"
  };

  const tooltipVariants = {
    default: "max-w-xs",
    compact: "max-w-sm",
    prominent: "max-w-md"
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center", className)}>
            {children || <HelpCircle className={triggerVariants[variant]} />}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800",
            tooltipVariants[variant]
          )}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-full">
                <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                {currentTip.title}
              </h4>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              {currentTip.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium capitalize">
                {currentTip.category.replace('-', ' ')} Tip
              </span>
              <button
                onClick={() => {
                  // Cycle to next tip in category
                  const categoryTips = financialTips.filter(tip => tip.category === category);
                  const tipsToUse = categoryTips.length > 0 ? categoryTips : financialTips.filter(tip => tip.category === "general");
                  const currentIndex = tipsToUse.findIndex(tip => tip.id === currentTip.id);
                  const nextIndex = (currentIndex + 1) % tipsToUse.length;
                  setCurrentTip(tipsToUse[nextIndex]);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Next Tip →
              </button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quick access component for specific tip categories
export function InvoiceTipTooltip(props: Omit<FinancialTipTooltipProps, 'category'>) {
  return <FinancialTipTooltip {...props} category="invoices" />;
}

export function CashFlowTipTooltip(props: Omit<FinancialTipTooltipProps, 'category'>) {
  return <FinancialTipTooltip {...props} category="cash-flow" />;
}

export function SupplierTipTooltip(props: Omit<FinancialTipTooltipProps, 'category'>) {
  return <FinancialTipTooltip {...props} category="suppliers" />;
}

export function AnalyticsTipTooltip(props: Omit<FinancialTipTooltipProps, 'category'>) {
  return <FinancialTipTooltip {...props} category="analytics" />;
}

export function OptimizationTipTooltip(props: Omit<FinancialTipTooltipProps, 'category'>) {
  return <FinancialTipTooltip {...props} category="optimization" />;
}