
import { format } from 'date-fns';

export const formatters = {
  date: (date: string | Date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  },

  dateTime: (date: string | Date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  },

  currency: (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  percentage: (value: number) => {
    return `${Math.round(value)}%`;
  },

  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str: string, length: number = 50) => {
    return str.length > length ? `${str.substring(0, length)}...` : str;
  }
};
