export type PaymentRequest={amount:number;currency:string;reference:string;customerPhone?:string;returnUrl?:string};
export type PaymentResult={providerRef:string;status:'PENDING'|'CONFIRMED';checkoutUrl?:string};
export interface PaymentGateway{createPayment(input:PaymentRequest):Promise<PaymentResult>;verifyWebhook(payload:unknown,signature?:string):Promise<{providerRef:string;confirmed:boolean}>;}
class MockGateway implements PaymentGateway{
 async createPayment(i:PaymentRequest){return {providerRef:`mock_${i.reference}`,status:'CONFIRMED' as const};}
 async verifyWebhook(p:any){return {providerRef:p?.providerRef ?? 'mock_unknown',confirmed:true};}
}
class ZaadGateway implements PaymentGateway{
 async createPayment(i:PaymentRequest){
   if(!process.env.ZAAD_API_KEY) return {providerRef:`zaad_demo_${i.reference}`,status:'PENDING'};
   throw new Error('Configure ZAAD provider-specific endpoint, signing and merchant contract before production use.');
 }
 async verifyWebhook(_payload:unknown,_signature?:string){throw new Error('Implement ZAAD signature verification using provider-issued documentation.');}
}
export function getGateway(name:string):PaymentGateway { if(name.toLowerCase()==='zaad') return new ZaadGateway(); return new MockGateway(); }
