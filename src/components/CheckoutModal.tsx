import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle2, MapPin, Calendar, Clock, CreditCard, Banknote, 
  ShieldCheck, Printer, ArrowRight, Smartphone, RefreshCw, AlertCircle, 
  Check, Loader2, Sparkles, Phone, Lock
} from 'lucide-react';
import { CartItem, OrderConfirmation } from '../types/farm';
import { useCurrency } from '../context/CurrencyContext';

interface StkPushResponse {
  success: boolean;
  checkoutRequestId: string;
  promptText?: string;
  customerMessage?: string;
  error?: string;
}

interface TransactionResponse {
  success: boolean;
  transaction?: {
    status: string;
    resultDesc?: string;
    receiptNumber?: string;
    accountRef?: string;
    phone?: string;
  };
  error?: string;
}

const PAYMENT_API_UNAVAILABLE =
  'M-Pesa checkout is unavailable on this GitHub Pages site because it only hosts static files, not the Node.js payment API. Deploy the payment server to enable STK Push, or choose Pay at Farm Gate.';

async function readApiJson<T>(response: Response): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(PAYMENT_API_UNAVAILABLE);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error('The payment service returned an invalid response. Please try again or choose Pay at Farm Gate.');
  }
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  defaultFulfillment: 'pickup' | 'delivery';
  onOrderCompleted: (order: OrderConfirmation) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  defaultFulfillment,
  onOrderCompleted,
}) => {
  const { formatPrice, currency, convertPrice } = useCurrency();
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>(defaultFulfillment);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pickupSlot, setPickupSlot] = useState('Saturday 10:00 AM - 1:00 PM');
  const [notes, setNotes] = useState('');
  
  // Payment Method: Default to Lipa Na M-Pesa Online (STK Push) as requested
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cod' | 'card'>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');

  // STK Push Prompt State
  const [isStkPromptOpen, setIsStkPromptOpen] = useState(false);
  const [stkStatus, setStkStatus] = useState<'initiating' | 'waiting' | 'success' | 'failed'>('initiating');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [stkMessage, setStkMessage] = useState('');
  const [stkError, setStkError] = useState<string | null>(null);
  const [simulatedPin, setSimulatedPin] = useState('');
  const [activeReceiptNumber, setActiveReceiptNumber] = useState<string | null>(null);
  
  // Post-order state
  const [confirmedOrder, setConfirmedOrder] = useState<OrderConfirmation | null>(null);
  const pollingTimerRef = useRef<any>(null);

  // Sync mpesaPhone with customer phone if empty
  useEffect(() => {
    if (!mpesaPhone && phone) {
      setMpesaPhone(phone);
    }
  }, [phone, mpesaPhone]);

  // Clean up polling timer
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const shippingFee = fulfillmentType === 'pickup' ? 0 : subtotal >= 60 ? 0 : 8.5;
  const total = subtotal + shippingFee;

  // Convert to Kenyan Shillings for Safaricom M-Pesa STK push
  const totalInKES = currency === 'KES' ? convertPrice(total) : Math.round(total * 130);

  // -------------------------------------------------------------
  // M-Pesa STK Push Initiator
  // -------------------------------------------------------------
  const initiateMpesaStkPush = async (targetPhone: string, orderRef: string = 'DF-HARVEST') => {
    setIsStkPromptOpen(true);
    setStkStatus('initiating');
    setStkError(null);
    setCountdown(60);
    setStkMessage('Connecting to Safaricom Daraja Gateway...');
    setSimulatedPin('');

    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          amount: totalInKES,
          accountReference: 'DFHARVEST',
          transactionDesc: 'DamakFarm',
        }),
      });

      const data = await readApiJson<StkPushResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch M-Pesa STK Push prompt');
      }

      setCheckoutRequestId(data.checkoutRequestId);
      setStkStatus('waiting');
      setStkMessage(
        data.promptText ||
        data.customerMessage ||
        `Do you want to pay KSh ${totalInKES.toLocaleString()} to clinton (1242385) Account DF-HARVEST?`
      );

      // Start countdown
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start Polling for transaction status with a 4s initial delay to allow USSD prompt dispatch
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      
      const pollQuery = async () => {
        try {
          const queryRes = await fetch(`/api/mpesa/query/${data.checkoutRequestId}`);
          const queryData = await readApiJson<TransactionResponse>(queryRes);

          if (queryData.success && queryData.transaction) {
            if (queryData.transaction.status === 'COMPLETED') {
              clearInterval(pollingTimerRef.current);
              clearInterval(countdownInterval);
              finalizeMpesaOrder(orderRef, targetPhone, queryData.transaction.receiptNumber);
            } else if (queryData.transaction.status === 'CANCELLED' || queryData.transaction.status === 'FAILED') {
              clearInterval(pollingTimerRef.current);
              clearInterval(countdownInterval);
              setStkStatus('failed');
              setStkError(queryData.transaction.resultDesc || 'M-Pesa transaction was cancelled or failed.');
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message === PAYMENT_API_UNAVAILABLE) {
            clearInterval(pollingTimerRef.current);
            clearInterval(countdownInterval);
            setStkStatus('failed');
            setStkError(error.message);
          }
        }
      };

      // Initial query after 4 seconds, then repeat every 3.5 seconds
      setTimeout(() => {
        pollQuery();
        pollingTimerRef.current = setInterval(pollQuery, 3500);
      }, 4000);

    } catch (err: unknown) {
      setStkStatus('failed');
      setStkError(err instanceof Error ? err.message : 'Could not reach M-Pesa gateway. Please check phone number and retry.');
    }
  };

  // Finalize order after successful M-Pesa authorization
  const finalizeMpesaOrder = (orderRef: string, paidPhone: string, receiptNo?: string) => {
    const generatedReceipt = receiptNo || `QKH${Math.floor(100000 + Math.random() * 900000)}KES`;
    setActiveReceiptNumber(generatedReceipt);
    setStkStatus('success');

    const newOrder: OrderConfirmation = {
      orderId: orderRef,
      customerName: name,
      email,
      phone,
      fulfillmentType,
      address: fulfillmentType === 'delivery' ? address : undefined,
      pickupSlot: fulfillmentType === 'pickup' ? pickupSlot : undefined,
      notes: notes || undefined,
      paymentMethod: 'mpesa',
      mpesaReceiptNumber: generatedReceipt,
      mpesaPhone: paidPhone,
      items: [...cartItems],
      subtotal,
      shippingFee,
      total,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTimeout(() => {
      setIsStkPromptOpen(false);
      setConfirmedOrder(newOrder);
      onOrderCompleted(newOrder);
    }, 1500);
  };

  // Allow sandbox simulated confirmation for instant verification
  const handleSimulatePinAuthorize = async () => {
    if (!checkoutRequestId) {
      setStkStatus('failed');
      setStkError('No active M-Pesa transaction is available to authorize.');
      return;
    }
    try {
      const res = await fetch('/api/mpesa/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestId, approved: true }),
      });
      const data = await readApiJson<TransactionResponse>(res);
      if (!res.ok || !data.success || !data.transaction) {
        throw new Error(data.error || 'The payment service could not authorize this transaction.');
      }
      finalizeMpesaOrder(
        data.transaction.accountRef || 'DF-HARVEST',
        data.transaction.phone || mpesaPhone || phone,
        data.transaction.receiptNumber
      );
    } catch (error) {
      setStkStatus('failed');
      setStkError(error instanceof Error ? error.message : 'The payment service could not authorize this transaction.');
    }
  };

  const handleCancelStk = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setIsStkPromptOpen(false);
    setStkStatus('initiating');
  };

  // Standard Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    if (fulfillmentType === 'delivery' && !address) return;

    if (paymentMethod === 'mpesa') {
      const targetPhone = mpesaPhone || phone;
      initiateMpesaStkPush(targetPhone, 'DF-HARVEST');
      return;
    }

    const randomRef = `DF-${Math.floor(1000 + Math.random() * 9000)}`;

    // COD or Card
    const newOrder: OrderConfirmation = {
      orderId: randomRef,
      customerName: name,
      email,
      phone,
      fulfillmentType,
      address: fulfillmentType === 'delivery' ? address : undefined,
      pickupSlot: fulfillmentType === 'pickup' ? pickupSlot : undefined,
      notes: notes || undefined,
      paymentMethod,
      items: [...cartItems],
      subtotal,
      shippingFee,
      total,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setConfirmedOrder(newOrder);
    onOrderCompleted(newOrder);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-[#FCFAF6] rounded-2xl border-2 border-emerald-300 shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-200 flex items-center justify-between bg-gradient-to-r from-emerald-100 via-emerald-50 to-amber-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#164E2D] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block">
                Damak Farmstead Checkout
              </span>
              <h2 className="font-serif text-xl font-bold text-[#113824]">
                {confirmedOrder ? 'Order Confirmed & Logged' : 'Complete Your Farm Order'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="p-1.5 text-emerald-900 hover:bg-emerald-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          /* Confirmation State with Itemized Receipt */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center py-5 bg-gradient-to-b from-emerald-50 to-[#FCFAF6] rounded-2xl border-2 border-emerald-200 p-4 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-1 animate-in zoom-in-75 duration-300" />
              <h3 className="font-serif text-2xl font-bold text-[#113824]">
                Thank You, {confirmedOrder.customerName}!
              </h3>
              <p className="text-xs text-[#3E5244] max-w-md mx-auto leading-relaxed">
                Your order is confirmed and scheduled for morning picking from living soil terraces.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-3 py-1 bg-white border border-emerald-300 rounded-lg font-mono text-xs font-bold text-[#113824] shadow-2xs">
                  Order Reference #{confirmedOrder.orderId}
                </span>

                {confirmedOrder.paymentMethod === 'mpesa' && (
                  <span className="px-3 py-1 bg-[#0F6B2C] text-white rounded-lg font-mono text-xs font-bold shadow-2xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>M-Pesa: {confirmedOrder.mpesaReceiptNumber}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Receipt Details */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 space-y-3 text-xs shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
                <span className="text-[#55695C]">Payment Status:</span>
                <span className="font-bold">
                  {confirmedOrder.paymentMethod === 'mpesa' ? (
                    <span className="text-[#0F6B2C] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Paid via Lipa Na M-Pesa STK Push ({confirmedOrder.mpesaPhone})</span>
                    </span>
                  ) : confirmedOrder.paymentMethod === 'cod' ? (
                    <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pay on Collection at Farm Gate
                    </span>
                  ) : (
                    <span className="text-emerald-800 font-semibold">Online Card / Wallet</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
                <span className="text-[#55695C]">Fulfillment Method:</span>
                <span className="font-bold text-[#113824]">
                  {confirmedOrder.fulfillmentType === 'pickup'
                    ? `Farm Gate Pickup (${confirmedOrder.pickupSlot})`
                    : `Insulated Delivery to ${confirmedOrder.address}`}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
                <span className="text-[#55695C]">Contact:</span>
                <span className="font-bold text-[#113824]">
                  {confirmedOrder.email} · {confirmedOrder.phone}
                </span>
              </div>

              {/* Items summary */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-2">
                  Itemized Farm Manifest
                </span>
                <div className="space-y-1.5 bg-[#FAF8F5] p-3 rounded-xl border border-emerald-100">
                  {confirmedOrder.items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[#284E36] font-medium">
                        {item.quantity}× {item.product.name}
                      </span>
                      <span className="font-mono tabular-nums text-[#113824] font-semibold">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-[#55695C]">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">
                    {formatPrice(confirmedOrder.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#55695C]">
                  <span>Fulfillment Fee:</span>
                  <span className="font-mono tabular-nums">
                    {confirmedOrder.shippingFee === 0 ? 'FREE' : formatPrice(confirmedOrder.shippingFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-serif text-base font-bold text-[#113824] pt-2 border-t border-emerald-200">
                  <span>Total Amount:</span>
                  <span className="font-mono text-lg text-emerald-800 font-extrabold">
                    {formatPrice(confirmedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Farm pickup instructions */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-[#3E5244]">
              <span className="font-bold block text-[#113824] mb-1">
                Damak Farm Pickup & Care Instructions:
              </span>
              <p className="leading-relaxed text-[11px]">
                Located at <strong>1482 Valley Pasture Road, Ridgefield</strong>. Present Order Ref <strong>#{confirmedOrder.orderId}</strong> at the gate office. For live animals, please bring a well-ventilated carrier.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#164E2D] hover:bg-[#113824] rounded-xl cursor-pointer shadow-sm"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Fulfillment Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 block mb-2">
                1. Select Fulfillment Method
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    fulfillmentType === 'pickup'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-emerald-100 text-[#4E6738] hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="font-serif text-sm">Farm Gate Pickup</span>
                  </div>
                  <span className="text-[11px] text-[#55695C] block">
                    Free · Ready in 2 hours at Ridgefield
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    fulfillmentType === 'delivery'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-emerald-100 text-[#4E6738] hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="font-serif text-sm">Insulated Delivery</span>
                  </div>
                  <span className="text-[11px] text-[#55695C] block">
                    {subtotal >= 60 ? 'Free over ' + formatPrice(60) : formatPrice(8.5) + ' flat'}
                  </span>
                </button>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                2. Contact & Fulfillment Info
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#113824] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Kipkorir"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#113824] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samuel@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#113824] mb-1">
                  Primary Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (!mpesaPhone) setMpesaPhone(e.target.value);
                  }}
                  className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {fulfillmentType === 'delivery' ? (
                <div>
                  <label className="block text-[11px] font-bold text-[#113824] mb-1">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Street address, Estate, Apartment / Gate No."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-[#113824] mb-1">
                    Farm Gate Pickup Slot
                  </label>
                  <select
                    value={pickupSlot}
                    onChange={(e) => setPickupSlot(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="Friday 10:00 AM - 1:00 PM">Friday 10:00 AM - 1:00 PM</option>
                    <option value="Friday 2:00 PM - 5:00 PM">Friday 2:00 PM - 5:00 PM</option>
                    <option value="Saturday 10:00 AM - 1:00 PM">Saturday 10:00 AM - 1:00 PM</option>
                    <option value="Saturday 2:00 PM - 5:00 PM">Saturday 2:00 PM - 5:00 PM</option>
                    <option value="Sunday 11:00 AM - 3:00 PM">Sunday 11:00 AM - 3:00 PM</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#113824] mb-1">
                  Special Notes or Handling (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leave at front porch, or bringing own carrier for live guinea fowl"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs text-[#113824] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Payment Choice — Lipa Na M-Pesa Online STK Push */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                  3. Select Payment Option
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  Instant Kenyan Mobile Payment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Lipa Na M-Pesa STK Push */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                    paymentMethod === 'mpesa'
                      ? 'bg-[#E8F8EC] border-[#0F6B2C] text-[#0A471C] shadow-sm ring-1 ring-[#0F6B2C]'
                      : 'bg-white border-emerald-200 text-[#3E5244] hover:bg-emerald-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-[#0F6B2C] flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Lipa Na M-Pesa</span>
                    </span>
                    <span className="bg-[#0F6B2C] text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                      STK PUSH
                    </span>
                  </div>
                  <span className="text-[11px] text-[#255231] block font-medium">
                    Phone Prompt · Paybill 1242385 (clinton)
                  </span>
                </button>

                {/* Pay on Collection */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'bg-emerald-50 border-emerald-700 text-emerald-950 shadow-sm'
                      : 'bg-white border-emerald-200 text-[#3E5244] hover:bg-emerald-50/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pay at Farm Gate</span>
                  </div>
                  <span className="text-[11px] text-[#55695C] block">
                    Cash or Card upon pickup
                  </span>
                </button>

                {/* Card / Online */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-emerald-50 border-emerald-700 text-emerald-950 shadow-sm'
                      : 'bg-white border-emerald-200 text-[#3E5244] hover:bg-emerald-50/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Card / Wallet</span>
                  </div>
                  <span className="text-[11px] text-[#55695C] block">
                    Visa, Mastercard, Bank
                  </span>
                </button>
              </div>

              {/* M-PESA PHONE NUMBER INPUT BOX (WHEN M-PESA IS SELECTED) */}
              {paymentMethod === 'mpesa' && (
                <div className="p-4 bg-gradient-to-r from-[#EAF8EE] to-[#F2FCF5] rounded-2xl border-2 border-[#0F6B2C]/40 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F6B2C] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F6B2C] animate-pulse" />
                      <span>Safaricom M-Pesa STK Push Number</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#0F6B2C] font-extrabold bg-white px-2 py-0.5 rounded border border-[#0F6B2C]/20">
                      Amount: KSh {totalInKES.toLocaleString()}
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-emerald-900">
                      🇰🇪 +254
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712 345 678 or 0112 345 678"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      className="w-full pl-18 pr-3 py-2.5 bg-white border-2 border-[#0F6B2C]/40 rounded-xl text-xs font-mono font-bold text-[#113824] focus:outline-none focus:border-[#0F6B2C] focus:ring-1 focus:ring-[#0F6B2C]"
                    />
                  </div>

                  <p className="text-[11px] text-[#255231] leading-relaxed">
                    💡 An instant SIM Toolkit prompt will display on this phone. Enter your 4-digit M-Pesa PIN when prompted to authorize <strong>KSh {totalInKES.toLocaleString()}</strong> to <strong>clinton (Paybill 1242385)</strong> Account <strong>DF-HARVEST</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Total breakdown & Action Button */}
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div>
                <span className="text-[#55695C] block">
                  {cartItems.length} items · {fulfillmentType === 'pickup' ? 'Free Farm Gate Pickup' : 'Insulated Courier'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-lg font-bold text-[#113824]">
                    Total: {formatPrice(total)}
                  </span>
                  {currency !== 'KES' && (
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      (≈ KSh {totalInKES.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={`py-3 px-6 rounded-xl font-bold text-xs text-white transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                  paymentMethod === 'mpesa'
                    ? 'bg-gradient-to-r from-[#0F6B2C] to-[#1E8A3E] hover:from-[#0A4E20] hover:to-[#0F6B2C] shadow-emerald-950/20'
                    : 'bg-[#164E2D] hover:bg-[#113824]'
                }`}
              >
                {paymentMethod === 'mpesa' ? (
                  <>
                    <Smartphone className="w-4 h-4 text-emerald-200" />
                    <span>Send M-Pesa STK Prompt (KSh {totalInKES.toLocaleString()})</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Farm Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUTHENTIC MOBILE SAFARICOM M-PESA STK PUSH PROMPT POPUP */}
      {/* ------------------------------------------------------------- */}
      {isStkPromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-sm bg-[#0C1F12] text-white rounded-3xl border-2 border-[#0F6B2C] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Safaricom Header Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6B2C] to-[#1E8A3E] flex items-center justify-center text-white shadow-sm font-black text-sm tracking-wider">
                  M
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Safaricom M-Pesa</span>
                    <span className="text-[9px] bg-emerald-700/80 text-emerald-100 font-mono px-1.5 py-0.5 rounded">
                      LIVE STK
                    </span>
                  </h3>
                  <span className="text-[11px] text-emerald-300 block font-mono">
                    clinton · Paybill 1242385 · Damak Farm
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelStk}
                className="p-1.5 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Realistic Phone STK Push Prompt Dialog */}
            <div className="bg-[#061309] rounded-2xl border border-emerald-600/50 p-4 space-y-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-mono">
                  <Smartphone className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>Prompt sent to mobile handset:</span>
                </span>
                <span className="font-mono font-bold text-white bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-700">
                  {mpesaPhone || phone}
                </span>
              </div>

              {/* Exact Safaricom SIM Toolkit Mobile Prompt Notice */}
              <div className="bg-gradient-to-b from-[#183F25] to-[#122E1B] p-4 rounded-xl border border-emerald-400/60 shadow-md space-y-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Awaiting Action on Your Handset</span>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-emerald-500/40 text-left space-y-1.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block font-bold">
                    Handset Screen Prompt:
                  </span>
                  <p className="text-xs sm:text-[13px] font-semibold text-white leading-relaxed font-sans">
                    Do you want to pay <strong className="text-amber-300 font-mono">KSh {totalInKES.toLocaleString()}</strong> to <strong className="text-emerald-200">clinton (1242385)</strong> Account <strong className="text-emerald-200">DF-HARVEST</strong>?
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-center gap-2 text-xs text-emerald-200">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-left">
                    Enter your <strong>4-digit M-Pesa PIN</strong> on your mobile phone screen to authorize.
                  </span>
                </div>
              </div>

              {/* Live Status indicator */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <div className="flex items-center gap-2">
                  {stkStatus === 'waiting' ? (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : stkStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-[11px] text-emerald-200">
                    {stkStatus === 'waiting'
                      ? 'Waiting for M-Pesa network confirmation...'
                      : stkStatus === 'success'
                      ? 'Payment authorized successfully!'
                      : 'Connecting to Safaricom Daraja...'}
                  </span>
                </div>

                <span className="font-mono text-xs font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-emerald-800">
                  {countdown}s
                </span>
              </div>
            </div>

            {/* Error message if failed */}
            {stkError && (
              <div className="p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-xs text-red-200 space-y-1 animate-in fade-in">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>STK Push Notice</span>
                </p>
                <p className="text-[11px]">{stkError}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCancelStk}
                  className="py-2.5 bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => initiateMpesaStkPush(mpesaPhone || phone)}
                  className="py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Prompt</span>
                </button>
              </div>

              {/* Informational note on Safaricom shortcode */}
              <div className="pt-1 text-[10px] text-emerald-400/80 text-center leading-tight">
                <span>Direct STK to phone via Paybill <strong>1242385</strong> registered as <strong>clinton</strong>. Account: <strong>DF-HARVEST</strong>.</span>
              </div>

              <div className="text-center pt-1">
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleSimulatePinAuthorize}
                    className="text-[10px] text-emerald-500/40 hover:text-emerald-400/80 transition-colors cursor-pointer underline"
                  >
                    (Demo/Preview only: Instant Authorize)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
