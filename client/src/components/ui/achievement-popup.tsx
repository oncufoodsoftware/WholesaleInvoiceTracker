import React, { useState, useEffect } from 'react';
import { Confetti } from './confetti';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Award, Trophy, Star, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AchievementProps {
  title: string;
  description: string;
  type: 'task' | 'milestone' | 'financial' | 'improvement';
  icon?: React.ReactNode;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export function AchievementPopup({
  title,
  description,
  type,
  icon,
  onClose,
  autoClose = true,
  autoCloseTime = 8000,
}: AchievementProps) {
  const [visible, setVisible] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        closeAchievement();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseTime]);

  const closeAchievement = () => {
    setVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Call onClose after animation ends
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'task':
        return <Star className="h-10 w-10 text-yellow-400" />;
      case 'milestone':
        return <Trophy className="h-10 w-10 text-amber-500" />;
      case 'financial':
        return <TrendingUp className="h-10 w-10 text-emerald-500" />;
      case 'improvement':
        return <Award className="h-10 w-10 text-blue-500" />;
      default:
        return <Award className="h-10 w-10 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'task':
        return 'bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-900/30';
      case 'milestone':
        return 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-900/30';
      case 'financial':
        return 'bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-900/30';
      case 'improvement':
        return 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/30';
      default:
        return 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/30';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'task':
        return 'border-yellow-300';
      case 'milestone':
        return 'border-amber-400';
      case 'financial':
        return 'border-emerald-400';
      case 'improvement':
        return 'border-blue-400';
      default:
        return 'border-blue-400';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50 max-w-sm"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            'relative overflow-hidden shadow-lg border-2',
            getBorderColor(),
            getBackgroundColor()
          )}>
            {showConfetti && <Confetti duration={2500} onComplete={() => setShowConfetti(false)} />}
            <div className="p-5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeAchievement}
                className="absolute right-2 top-2 h-6 w-6 rounded-full p-0 text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}