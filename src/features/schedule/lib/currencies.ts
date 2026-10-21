export const PAYMENT_CURRENCIES = [
  'RUB',
  'USD',
  'EUR',
  'GBP',
  'KZT',
  'BYN',
  'UAH',
  'AED',
] as const;

export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

export const DEFAULT_PAYMENT_CURRENCY: PaymentCurrency = 'RUB';

export type MoneyByCurrency = {
  currency: string;
  amount: number;
};

export const PAYMENT_CURRENCY_LABELS: Record<PaymentCurrency, string> = {
  RUB: '₽ RUB',
  USD: '$ USD',
  EUR: '€ EUR',
  GBP: '£ GBP',
  KZT: '₸ KZT',
  BYN: 'Br BYN',
  UAH: '₴ UAH',
  AED: 'د.إ AED',
};
