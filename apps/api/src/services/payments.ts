import { timingSafeEqual } from 'crypto';
import { isProduction } from '../lib/helpers.js';

export type PaymentRequest = {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  returnUrl?: string;
};

export type PaymentResult = {
  providerRef: string;
  status: 'PENDING' | 'CONFIRMED';
  checkoutUrl?: string;
};

export interface PaymentGateway {
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
  verifyWebhook(payload: unknown, signature?: string): Promise<{ providerRef: string; confirmed: boolean }>;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

class MockGateway implements PaymentGateway {
  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    // Auto-confirm only in local development so raised amounts are demoable.
    // Production / Docker defaults to PENDING until a verified webhook arrives.
    const autoConfirm = !isProduction();
    return {
      providerRef: `mock_${input.reference}`,
      status: autoConfirm ? 'CONFIRMED' : 'PENDING',
      checkoutUrl: autoConfirm ? undefined : `https://pay.example.invalid/mock/${input.reference}`,
    };
  }

  async verifyWebhook(payload: unknown, signature?: string) {
    const secret = process.env.MOCK_WEBHOOK_SECRET?.trim();
    if (isProduction()) {
      if (!secret) throw new Error('Mock webhooks are disabled in production without MOCK_WEBHOOK_SECRET');
      if (!signature || !safeEqual(signature, secret)) throw new Error('Invalid mock webhook signature');
    } else if (secret && signature && !safeEqual(signature, secret)) {
      throw new Error('Invalid mock webhook signature');
    }

    const body = (payload ?? {}) as { providerRef?: string; confirmed?: boolean };
    if (!body.providerRef) throw new Error('providerRef is required');
    return { providerRef: body.providerRef, confirmed: body.confirmed !== false };
  }
}

class ZaadGateway implements PaymentGateway {
  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    if (!process.env.ZAAD_API_KEY) {
      return { providerRef: `zaad_demo_${input.reference}`, status: 'PENDING' };
    }
    throw new Error(
      'Configure ZAAD provider-specific endpoint, signing and merchant contract before production use.',
    );
  }

  async verifyWebhook(_payload: unknown, _signature?: string): Promise<{ providerRef: string; confirmed: boolean }> {
    throw new Error('Implement ZAAD signature verification using provider-issued documentation.');
  }
}

export function getGateway(name: string): PaymentGateway {
  if (name.toLowerCase() === 'zaad') return new ZaadGateway();
  if (name.toLowerCase() === 'mock') return new MockGateway();
  throw new Error(`Unsupported payment gateway: ${name}`);
}
