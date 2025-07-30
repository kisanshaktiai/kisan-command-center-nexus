
interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  position: 'before' | 'after';
}

interface RegionConfig {
  currency: CurrencyConfig;
  numberLocale: string;
  dateLocale: string;
}

const CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    position: 'before'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    position: 'before'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU',
    position: 'before'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    position: 'before'
  }
};

const REGIONS: Record<string, RegionConfig> = {
  IN: {
    currency: CURRENCIES.INR,
    numberLocale: 'en-IN',
    dateLocale: 'en-IN'
  },
  US: {
    currency: CURRENCIES.USD,
    numberLocale: 'en-US',
    dateLocale: 'en-US'
  },
  GB: {
    currency: CURRENCIES.GBP,
    numberLocale: 'en-GB',
    dateLocale: 'en-GB'
  },
  EU: {
    currency: CURRENCIES.EUR,
    numberLocale: 'en-EU',
    dateLocale: 'en-EU'
  }
};

class CurrencyService {
  private static instance: CurrencyService;
  private currentRegion: string = 'IN'; // Default to India
  private currentCurrency: CurrencyConfig = CURRENCIES.INR;

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  constructor() {
    this.detectRegion();
  }

  private detectRegion(): void {
    try {
      // Try to detect region from browser locale
      const browserLocale = navigator.language || 'en-IN';
      const countryCode = browserLocale.split('-')[1] || 'IN';
      
      if (REGIONS[countryCode]) {
        this.currentRegion = countryCode;
        this.currentCurrency = REGIONS[countryCode].currency;
      } else {
        // Default to India for now
        this.currentRegion = 'IN';
        this.currentCurrency = CURRENCIES.INR;
      }
    } catch (error) {
      console.warn('Could not detect region, defaulting to India:', error);
      this.currentRegion = 'IN';
      this.currentCurrency = CURRENCIES.INR;
    }
  }

  formatCurrency(amount: number, options?: {
    currency?: string;
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }): string {
    const {
      currency = this.currentCurrency.code,
      showSymbol = true,
      minimumFractionDigits = 0,
      maximumFractionDigits = 2
    } = options || {};

    const currencyConfig = CURRENCIES[currency] || this.currentCurrency;
    const locale = currencyConfig.locale;

    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: currencyConfig.code,
        minimumFractionDigits,
        maximumFractionDigits
      });

      return formatter.format(amount);
    } catch (error) {
      console.warn('Currency formatting failed, using fallback:', error);
      // Fallback formatting
      const formattedNumber = amount.toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits
      });
      
      return showSymbol 
        ? `${currencyConfig.symbol}${formattedNumber}`
        : formattedNumber;
    }
  }

  formatCompactCurrency(amount: number, options?: {
    currency?: string;
    showSymbol?: boolean;
  }): string {
    const {
      currency = this.currentCurrency.code,
      showSymbol = true
    } = options || {};

    const currencyConfig = CURRENCIES[currency] || this.currentCurrency;

    // Convert to compact format
    let compactAmount: number;
    let suffix: string;

    if (amount >= 10000000) { // 1 Crore
      compactAmount = amount / 10000000;
      suffix = 'Cr';
    } else if (amount >= 100000) { // 1 Lakh
      compactAmount = amount / 100000;
      suffix = 'L';
    } else if (amount >= 1000) { // 1 Thousand
      compactAmount = amount / 1000;
      suffix = 'K';
    } else {
      compactAmount = amount;
      suffix = '';
    }

    const formattedAmount = compactAmount.toFixed(compactAmount % 1 === 0 ? 0 : 1);
    const symbol = showSymbol ? currencyConfig.symbol : '';
    
    return `${symbol}${formattedAmount}${suffix}`;
  }

  getCurrencySymbol(currencyCode?: string): string {
    const currency = currencyCode ? CURRENCIES[currencyCode] : this.currentCurrency;
    return currency?.symbol || '₹';
  }

  getCurrentCurrency(): CurrencyConfig {
    return this.currentCurrency;
  }

  setCurrency(currencyCode: string): void {
    if (CURRENCIES[currencyCode]) {
      this.currentCurrency = CURRENCIES[currencyCode];
      // Store in localStorage for persistence
      localStorage.setItem('preferred_currency', currencyCode);
    }
  }

  getSupportedCurrencies(): CurrencyConfig[] {
    return Object.values(CURRENCIES);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const locale = REGIONS[this.currentRegion]?.numberLocale || 'en-IN';
    
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch (error) {
      console.warn('Number formatting failed, using fallback:', error);
      return value.toLocaleString();
    }
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();

// Export utility functions for easy use
export const formatCurrency = (amount: number, options?: Parameters<typeof currencyService.formatCurrency>[1]) => 
  currencyService.formatCurrency(amount, options);

export const formatCompactCurrency = (amount: number, options?: Parameters<typeof currencyService.formatCompactCurrency>[1]) => 
  currencyService.formatCompactCurrency(amount, options);

export const getCurrencySymbol = (currencyCode?: string) => 
  currencyService.getCurrencySymbol(currencyCode);

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  currencyService.formatNumber(value, options);

export { CurrencyService, type CurrencyConfig, type RegionConfig };
