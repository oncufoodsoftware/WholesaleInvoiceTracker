import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a date string to DD/MM/YYYY format
export function formatDate(dateString: string | Date): string {
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format a date to YYYY-MM-DD for input[type="date"]
export function formatDateForInput(dateString?: string | Date): string {
  const date = dateString ? (dateString instanceof Date ? dateString : new Date(dateString)) : new Date();
  return date.toISOString().split('T')[0];
}
