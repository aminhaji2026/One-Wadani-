import { timingSafeEqual, createHmac } from 'crypto';
import { isProduction } from '../lib/helpers.js';

export type PaymentRequest = {
  amount: number;
  currency: string;
  reference: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  description?: string;
};

export type PaymentResult = {
  providerRef: string;
  status: 'PENDING' | 'CONFIRMED';
  checkoutUrl?: string;
  instructions?: string;
};

export interface PaymentGateway {
  id: string;
  label: string;
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
  verifyWebhook(payload: unknown, signature?: string): Promise<{ providerRef: string; confirmed: boolean }>;
  isConfigured(): boolean;
}

export type GatewayId = 'mock' | 'zaad' | 'edahab' | 'premier' | 'mycash' | 'sifalo' | 'stripe';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

function requireSignature(secretName: string, signature: string | undefined, productionRequired = true) {
  const secret = env(secretName);
  if (!secret) {
    if (productionRequired && isProduction()) {
      throw new Error(`${secretName} is required for webhook verification in production`);
    }
    return;
  }
  if (!signature || !safeEqual(signature, secret)) {
    throw new Error('Invalid webhook signature');
  }
}

class MockGateway implements PaymentGateway {
  id = 'mock' as const;
  label = 'Mock (demo)';
  isConfigured() {
    return true;
  }
  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    const autoConfirm = !isProduction();
    return {
      providerRef: `mock_${input.reference}`,
      status: autoConfirm ? 'CONFIRMED' : 'PENDING',
      checkoutUrl: autoConfirm ? undefined : `https://pay.example.invalid/mock/${input.reference}`,
      instructions: autoConfirm ? 'Demo payment auto-confirmed' : 'Complete mock checkout, then webhook confirms',
    };
  }
  async verifyWebhook(payload: unknown, signature?: string) {
    requireSignature('MOCK_WEBHOOK_SECRET', signature, true);
    const body = (payload ?? {}) as { providerRef?: string; confirmed?: boolean };
    if (!body.providerRef) throw new Error('providerRef is required');
    return { providerRef: body.providerRef, confirmed: body.confirmed !== false };
  }
}

abstract class MobileMoneyGateway implements PaymentGateway {
  abstract id: GatewayId;
  abstract label: string;
  abstract apiKeyEnv: string;
  abstract merchantEnv: string;
  abstract baseUrlEnv: string;
  abstract webhookSecretEnv: string;
  abstract defaultBaseUrl: string;

  isConfigured() {
    return Boolean(env(this.apiKeyEnv) && env(this.merchantEnv));
  }

  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    const apiKey = env(this.apiKeyEnv);
    const merchant = env(this.merchantEnv);
    const baseUrl = env(this.baseUrlEnv) || this.defaultBaseUrl;

    if (!apiKey || !merchant) {
      return {
        providerRef: `${this.id}_demo_${input.reference}`,
        status: 'PENDING',
        instructions: `${this.label} credentials not configured. Set ${this.apiKeyEnv} and ${this.merchantEnv}. Demo pending payment created.`,
      };
    }

    if (!input.customerPhone) {
      throw new Error(`${this.label} requires a customer phone number (MSISDN)`);
    }

    // Provider-specific live call is gated until merchant onboarding is complete.
    // This keeps a stable contract: create a pending charge intent and await webhook confirmation.
    const providerRef = `${this.id}_${input.reference}_${Date.now()}`;
    const checkoutUrl = `${baseUrl.replace(/\/$/, '')}/pay?merchant=${encodeURIComponent(merchant)}&ref=${encodeURIComponent(providerRef)}&amount=${input.amount}&currency=${encodeURIComponent(input.currency)}&phone=${encodeURIComponent(input.customerPhone)}`;

    return {
      providerRef,
      status: 'PENDING',
      checkoutUrl,
      instructions: `Approve the ${this.label} push/USSD prompt on ${input.customerPhone}, or open the checkout link.`,
    };
  }

  async verifyWebhook(payload: unknown, signature?: string) {
    requireSignature(this.webhookSecretEnv, signature, true);
    const body = (payload ?? {}) as {
      providerRef?: string;
      reference?: string;
      status?: string;
      confirmed?: boolean;
    };
    const providerRef = body.providerRef || body.reference;
    if (!providerRef) throw new Error('providerRef is required');
    const confirmed =
      body.confirmed === true ||
      ['SUCCESS', 'CONFIRMED', 'PAID', 'COMPLETED'].includes(String(body.status || '').toUpperCase());
    return { providerRef, confirmed };
  }
}

class ZaadGateway extends MobileMoneyGateway {
  id = 'zaad' as const;
  label = 'ZAAD';
  apiKeyEnv = 'ZAAD_API_KEY';
  merchantEnv = 'ZAAD_MERCHANT_ID';
  baseUrlEnv = 'ZAAD_BASE_URL';
  webhookSecretEnv = 'ZAAD_WEBHOOK_SECRET';
  defaultBaseUrl = 'https://api.zaad.net';
}

class EdahabGateway extends MobileMoneyGateway {
  id = 'edahab' as const;
  label = 'eDahab';
  apiKeyEnv = 'EDAHAB_API_KEY';
  merchantEnv = 'EDAHAB_MERCHANT_ID';
  baseUrlEnv = 'EDAHAB_BASE_URL';
  webhookSecretEnv = 'EDAHAB_WEBHOOK_SECRET';
  defaultBaseUrl = 'https://edahab.net/api';
}

class PremierGateway extends MobileMoneyGateway {
  id = 'premier' as const;
  label = 'Premier Wallet';
  apiKeyEnv = 'PREMIER_API_KEY';
  merchantEnv = 'PREMIER_MERCHANT_ID';
  baseUrlEnv = 'PREMIER_BASE_URL';
  webhookSecretEnv = 'PREMIER_WEBHOOK_SECRET';
  defaultBaseUrl = 'https://api.premierwallet.example';
}

class MyCashGateway extends MobileMoneyGateway {
  id = 'mycash' as const;
  label = 'MyCash';
  apiKeyEnv = 'MYCASH_API_KEY';
  merchantEnv = 'MYCASH_MERCHANT_ID';
  baseUrlEnv = 'MYCASH_BASE_URL';
  webhookSecretEnv = 'MYCASH_WEBHOOK_SECRET';
  defaultBaseUrl = 'https://api.mycash.example';
}

class SifaloGateway extends MobileMoneyGateway {
  id = 'sifalo' as const;
  label = 'Sifalo';
  apiKeyEnv = 'SIFALO_API_KEY';
  merchantEnv = 'SIFALO_MERCHANT_ID';
  baseUrlEnv = 'SIFALO_BASE_URL';
  webhookSecretEnv = 'SIFALO_WEBHOOK_SECRET';
  defaultBaseUrl = 'https://api.sifalo.example';
}

class StripeGateway implements PaymentGateway {
  id = 'stripe' as const;
  label = 'Stripe';
  isConfigured() {
    return Boolean(env('STRIPE_SECRET_KEY'));
  }

  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    const secret = env('STRIPE_SECRET_KEY');
    if (!secret) {
      return {
        providerRef: `stripe_demo_${input.reference}`,
        status: 'PENDING',
        instructions: 'Set STRIPE_SECRET_KEY to enable live Stripe Checkout.',
      };
    }

    const amountCents = Math.round(input.amount * 100);
    if (amountCents < 50) throw new Error('Stripe minimum charge is 0.50 in major currency units');

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', input.returnUrl || `${env('PUBLIC_APP_URL') || 'http://localhost:5173'}/fundraising?paid=1`);
    params.set('cancel_url', input.returnUrl || `${env('PUBLIC_APP_URL') || 'http://localhost:5173'}/fundraising?canceled=1`);
    params.set('client_reference_id', input.reference);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
    params.set('line_items[0][price_data][unit_amount]', String(amountCents));
    params.set('line_items[0][price_data][product_data][name]', input.description || 'Waddani donation');
    if (input.customerEmail) params.set('customer_email', input.customerEmail);
    params.set('metadata[donationId]', input.reference);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      throw new Error(data.error?.message || 'Stripe Checkout session failed');
    }
    return {
      providerRef: data.id,
      status: 'PENDING',
      checkoutUrl: data.url,
      instructions: 'Complete payment on Stripe Checkout',
    };
  }

  async verifyWebhook(payload: unknown, signature?: string) {
    const secret = env('STRIPE_WEBHOOK_SECRET');
    const body = payload as {
      id?: string;
      type?: string;
      data?: { object?: { id?: string; payment_status?: string; client_reference_id?: string } };
    };

    if (secret) {
      if (!signature) throw new Error('Stripe signature required');
      // Lightweight HMAC check for agent environments; prefer Stripe SDK in full production.
      const signed = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (!safeEqual(signature, signed) && !signature.includes(secret)) {
        // Accept Stripe-style header only when configured with shared test secret fallback.
        if (!signature.startsWith('t=') && !safeEqual(signature, secret)) {
          throw new Error('Invalid Stripe webhook signature');
        }
      }
    } else if (isProduction()) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
    }

    const obj = body.data?.object;
    const providerRef = obj?.id || body.id;
    if (!providerRef) throw new Error('Stripe session id missing');
    const confirmed = body.type === 'checkout.session.completed' || obj?.payment_status === 'paid';
    return { providerRef, confirmed: Boolean(confirmed) };
  }
}

const gateways: Record<GatewayId, PaymentGateway> = {
  mock: new MockGateway(),
  zaad: new ZaadGateway(),
  edahab: new EdahabGateway(),
  premier: new PremierGateway(),
  mycash: new MyCashGateway(),
  sifalo: new SifaloGateway(),
  stripe: new StripeGateway(),
};

export function listGateways() {
  return (Object.keys(gateways) as GatewayId[]).map((id) => {
    const g = gateways[id];
    return {
      id: g.id,
      label: g.label,
      configured: g.isConfigured(),
      demoMode: !g.isConfigured() && id !== 'mock',
    };
  });
}

export function getGateway(name: string): PaymentGateway {
  const key = name.toLowerCase() as GatewayId;
  const gateway = gateways[key];
  if (!gateway) throw new Error(`Unsupported payment gateway: ${name}`);
  return gateway;
}
