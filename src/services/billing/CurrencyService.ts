// Currency configuration and formatting service
export type SupportedCurrency = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  locale: string;
  decimalPlaces: number;
}

const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimalPlaces: 2
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    decimalPlaces: 2
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimalPlaces: 2
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimalPlaces: 2
  }
};

// Default currency for the application
const DEFAULT_CURRENCY: SupportedCurrency = 'INR';

class CurrencyService {
  private currentCurrency: SupportedCurrency = DEFAULT_CURRENCY;

  setCurrentCurrency(currency: SupportedCurrency) {
    this.currentCurrency = currency;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-currency', currency);
    }
  }

  getCurrentCurrency(): SupportedCurrency {
    // Try to get from localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-currency') as SupportedCurrency;
      if (stored && CURRENCY_CONFIGS[stored]) {
        this.currentCurrency = stored;
      }
    }
    return this.currentCurrency;
  }

  getCurrencyConfig(currency?: SupportedCurrency): CurrencyConfig {
    const curr = currency || this.getCurrentCurrency();
    return CURRENCY_CONFIGS[curr];
  }

  formatCurrency(amount: number, currency?: SupportedCurrency): string {
    const config = this.getCurrencyConfig(currency);
    
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: config.decimalPlaces,
        maximumFractionDigits: config.decimalPlaces
      }).format(amount || 0);
    } catch (error) {
      // Fallback formatting
      return `${config.symbol}${(amount || 0).toFixed(config.decimalPlaces)}`;
    }
  }

  formatAmount(amount: number, currency?: SupportedCurrency): string {
    const config = this.getCurrencyConfig(currency);
    return (amount || 0).toFixed(config.decimalPlaces);
  }

  getCurrencySymbol(currency?: SupportedCurrency): string {
    const config = this.getCurrencyConfig(currency);
    return config.symbol;
  }

  getAllCurrencies(): CurrencyConfig[] {
    return Object.values(CURRENCY_CONFIGS);
  }

  convertCurrency(amount: number, from: SupportedCurrency, to: SupportedCurrency, rates?: Record<string, number>): number {
    if (from === to) return amount;
    
    // If rates are provided, use them
    if (rates && rates[`${from}_${to}`]) {
      return amount * rates[`${from}_${to}`];
    }
    
    // Otherwise, return the original amount (would need exchange rate API in production)
    console.warn(`No exchange rate available for ${from} to ${to}`);
    return amount;
  }
}

export const currencyService = new CurrencyService();

// React hook for currency
import { useState, useEffect } from 'react';

export function useCurrency() {
  const [currency, setCurrency] = useState<SupportedCurrency>(currencyService.getCurrentCurrency());

  const updateCurrency = (newCurrency: SupportedCurrency) => {
    currencyService.setCurrentCurrency(newCurrency);
    setCurrency(newCurrency);
  };

  const formatCurrency = (amount: number, specificCurrency?: SupportedCurrency) => {
    return currencyService.formatCurrency(amount, specificCurrency || currency);
  };

  useEffect(() => {
    // Listen for currency changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-currency' && e.newValue) {
        setCurrency(e.newValue as SupportedCurrency);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    currency,
    setCurrency: updateCurrency,
    formatCurrency,
    currencySymbol: currencyService.getCurrencySymbol(currency),
    currencies: currencyService.getAllCurrencies()
  };
}
