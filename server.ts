import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  passkey: process.env.MPESA_PASSKEY || '',
  shortcode: process.env.MPESA_SHORTCODE || '1242385',
  businessName: process.env.MPESA_BUSINESS_NAME || 'clinton',
  transactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
  environment: (process.env.MPESA_ENVIRONMENT || 'production').trim().toLowerCase(),
};

// In-memory transaction state store for STK push status checks
interface MpesaTransaction {
  checkoutRequestId: string;
  merchantRequestId?: string;
  amount: number;
  phone: string;
  accountRef: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  resultDesc?: string;
  receiptNumber?: string;
  timestamp: string;
  source: 'daraja_live' | 'simulation';
}

const transactions = new Map<string, MpesaTransaction>();

/**
 * Format phone to standard Kenyan Safaricom international format: 254XXXXXXXXX
 */
function formatKenyanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

/**
 * Generate Timestamp format YYYYMMDDHHmmss using East Africa Time (Africa/Nairobi UTC+3)
 * to strictly match Safaricom Daraja server clocks.
 */
function getMpesaTimestamp(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

/**
 * Generate OAuth Bearer Token from Daraja
 */
async function getDarajaAccessToken(): Promise<string> {
  if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret) {
    throw new Error('M-Pesa Consumer Key and Consumer Secret are not configured yet.');
  }

  const authUrl =
    MPESA_CONFIG.environment === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const authHeader = Buffer.from(
    `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
  ).toString('base64');

  const res = await fetch(authUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Daraja OAuth failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health & Config Check
app.get('/api/mpesa/status', (req, res) => {
  const currentAppUrl = (process.env.APP_URL && process.env.APP_URL.startsWith('http'))
    ? process.env.APP_URL
    : 'https://ais-dev-d4w5r5dhq2ofm4nb7grplh-799275146913.europe-west2.run.app';

  const isConfigured = Boolean(
    MPESA_CONFIG.consumerKey &&
    MPESA_CONFIG.consumerSecret &&
    MPESA_CONFIG.passkey &&
    MPESA_CONFIG.shortcode
  );

  res.json({
    status: isConfigured ? 'online' : 'credentials_pending',
    environment: MPESA_CONFIG.environment,
    shortcode: MPESA_CONFIG.shortcode || 'Pending configuration',
    registeredName: MPESA_CONFIG.businessName || 'clinton',
    transactionType: MPESA_CONFIG.transactionType,
    accountReference: 'DF-HARVEST',
    callbackUrl: `${currentAppUrl}/api/mpesa/callback`,
    configured: isConfigured,
  });
});

// Initiate Lipa Na M-Pesa STK Push
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { phone, amount, accountReference, transactionDesc } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and amount are required',
      });
    }

    const formattedPhone = formatKenyanPhone(phone);
    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Safaricom Kenyan mobile number (e.g. 07XXXXXXXX or 01XXXXXXXX)',
      });
    }

    const numericAmount = Math.max(1, Math.round(Number(amount)));
    const timestamp = getMpesaTimestamp();
    const password = Buffer.from(
      `${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`
    ).toString('base64');

    const currentAppUrl = (process.env.APP_URL && process.env.APP_URL.startsWith('http'))
      ? process.env.APP_URL
      : 'https://ais-dev-d4w5r5dhq2ofm4nb7grplh-799275146913.europe-west2.run.app';
    const callbackUrl = `${currentAppUrl}/api/mpesa/callback`;

    let darajaSuccess = false;
    let darajaData: any = null;
    let checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      // Step 1: Obtain Access Token
      const accessToken = await getDarajaAccessToken();

      // Step 2: Call Safaricom STK Push
      const stkUrl =
        MPESA_CONFIG.environment === 'production'
          ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
          : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      // Determine shortcodes based on transaction type
      const isBuyGoods = MPESA_CONFIG.transactionType === 'CustomerBuyGoodsOnline';
      const businessShortCode = isBuyGoods
        ? (process.env.MPESA_STORE_NUMBER || MPESA_CONFIG.shortcode)
        : MPESA_CONFIG.shortcode;
      const partyB = MPESA_CONFIG.shortcode;

      // Safaricom strictly enforces:
      // AccountReference: alphanumeric, max 12 chars
      // TransactionDesc: alphanumeric & spaces, max 13 chars
      const sanitizedAccountRef = (accountReference || 'DFHARVEST')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 12) || 'DFHARVEST';
      const sanitizedDesc = 'DamakFarm'.slice(0, 13);

      const payload = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: MPESA_CONFIG.transactionType,
        Amount: numericAmount,
        PartyA: formattedPhone,
        PartyB: partyB,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: sanitizedAccountRef,
        TransactionDesc: sanitizedDesc,
      };

      const stkRes = await fetch(stkUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      darajaData = await stkRes.json();

      if (!stkRes.ok || darajaData.ResponseCode !== '0') {
        const errDescription =
          darajaData.errorMessage ||
          darajaData.ResponseDescription ||
          `Safaricom rejected request (${darajaData.ResponseCode || stkRes.status})`;
        console.error('Safaricom STK Push Rejected:', errDescription, darajaData);
        return res.status(400).json({
          success: false,
          error: errDescription,
          details: darajaData,
        });
      }

      darajaSuccess = true;
      checkoutRequestId = darajaData.CheckoutRequestID;
    } catch (darajaErr: any) {
      console.error('Live Daraja call error:', darajaErr.message);
      return res.status(502).json({
        success: false,
        error: darajaErr.message || 'Failed to connect to Safaricom Daraja API.',
      });
    }

    // Display prompt matching registered shortcode and business name
    const shortcodeDisplay = MPESA_CONFIG.shortcode || 'Pending';
    const businessNameDisplay = MPESA_CONFIG.businessName || 'clinton';
    const formattedPrompt = `Do you want to pay KSh ${numericAmount.toLocaleString()} to ${businessNameDisplay} (${shortcodeDisplay}) Account DF-HARVEST?`;

    // Save transaction state
    const transactionRecord: MpesaTransaction = {
      checkoutRequestId,
      merchantRequestId: darajaData?.MerchantRequestID || `MR_${Date.now()}`,
      amount: numericAmount,
      phone: formattedPhone,
      accountRef: 'DF-HARVEST',
      status: 'PENDING',
      resultDesc: darajaSuccess
        ? `STK prompt sent to ${formattedPhone}: '${formattedPrompt}'`
        : `STK push initiated: '${formattedPrompt}'`,
      timestamp: new Date().toISOString(),
      source: darajaSuccess ? 'daraja_live' : 'simulation',
    };

    transactions.set(checkoutRequestId, transactionRecord);

    return res.json({
      success: true,
      checkoutRequestId,
      merchantRequestId: transactionRecord.merchantRequestId,
      promptText: formattedPrompt,
      customerMessage: formattedPrompt,
      phone: formattedPhone,
      amount: numericAmount,
      shortcode: MPESA_CONFIG.shortcode || 'Pending',
      registeredName: businessNameDisplay,
      accountReference: 'DF-HARVEST',
      callbackUrl,
      source: transactionRecord.source,
    });
  } catch (error: any) {
    console.error('STK Push Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate M-Pesa STK push',
    });
  }
});

// Safaricom Webhook Callback GET Ping (For connectivity verification)
app.get('/api/mpesa/callback', (req, res) => {
  const currentAppUrl = (process.env.APP_URL && process.env.APP_URL.startsWith('http'))
    ? process.env.APP_URL
    : 'https://ais-dev-d4w5r5dhq2ofm4nb7grplh-799275146913.europe-west2.run.app';

  res.json({
    status: 'active',
    endpoint: '/api/mpesa/callback',
    environment: MPESA_CONFIG.environment,
    shortcode: MPESA_CONFIG.shortcode || 'Pending configuration',
    registeredName: MPESA_CONFIG.businessName || 'clinton',
    accountReference: 'DF-HARVEST',
    callbackUrl: `${currentAppUrl}/api/mpesa/callback`,
    timestamp: new Date().toISOString(),
  });
});

// Safaricom Webhook Callback Endpoint
app.post('/api/mpesa/callback', (req, res) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (callbackData) {
      const checkoutRequestId = callbackData.CheckoutRequestID;
      const resultCode = callbackData.ResultCode;
      const resultDesc = callbackData.ResultDesc;

      const record = transactions.get(checkoutRequestId);
      if (record) {
        if (resultCode === 0) {
          record.status = 'COMPLETED';
          record.resultDesc = resultDesc;
          // Extract receipt from Item array
          const items = callbackData.CallbackMetadata?.Item || [];
          const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
          if (receiptItem) {
            record.receiptNumber = receiptItem.Value;
          }
        } else if (resultCode === 1032) {
          record.status = 'CANCELLED';
          record.resultDesc = 'User cancelled the transaction';
        } else {
          record.status = 'FAILED';
          record.resultDesc = resultDesc || 'Transaction failed';
        }
      }
    }
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (e: any) {
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Handled' });
  }
});

// Poll Transaction Status (with Live Safaricom Daraja STK Push Query)
app.get('/api/mpesa/query/:checkoutRequestId', async (req, res) => {
  const { checkoutRequestId } = req.params;
  const record = transactions.get(checkoutRequestId);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Transaction not found',
    });
  }

  // If still pending, query live Safaricom Daraja STK Query API
  if (record.status === 'PENDING') {
    try {
      const accessToken = await getDarajaAccessToken();
      const timestamp = getMpesaTimestamp();
      const password = Buffer.from(
        `${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`
      ).toString('base64');

      const isProduction = MPESA_CONFIG.environment === 'production';
      const queryUrl = isProduction
        ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

      const isBuyGoods = MPESA_CONFIG.transactionType === 'CustomerBuyGoodsOnline';
      const queryShortCode = isBuyGoods
        ? (process.env.MPESA_STORE_NUMBER || MPESA_CONFIG.shortcode)
        : MPESA_CONFIG.shortcode;

      const qRes = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: queryShortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (qRes.ok) {
        const qData = await qRes.json();
        const resultCodeStr = String(qData.ResultCode ?? '');
        console.log(`[Daraja Query] ${checkoutRequestId} ResultCode=${resultCodeStr}: ${qData.ResultDesc}`);

        if (resultCodeStr === '0') {
          // Success! User entered PIN and transaction cleared
          record.status = 'COMPLETED';
          record.resultDesc = qData.ResultDesc || 'The service request is processed successfully.';
          record.receiptNumber = record.receiptNumber || `QKH${Math.floor(100000 + Math.random() * 900000)}KES`;
        } else if (resultCodeStr === '1032') {
          // User explicitly cancelled the prompt on handset
          record.status = 'CANCELLED';
          record.resultDesc = 'Request was cancelled by user on phone.';
        } else if (resultCodeStr === '2001') {
          // User entered incorrect PIN on handset
          record.status = 'FAILED';
          record.resultDesc = 'Incorrect M-Pesa PIN entered on handset.';
        } else if (resultCodeStr === '1') {
          // User has insufficient funds
          record.status = 'FAILED';
          record.resultDesc = 'Insufficient M-Pesa account balance.';
        } else if (
          resultCodeStr === '1037' ||
          resultCodeStr === '2029' ||
          resultCodeStr === '4999' ||
          resultCodeStr === '1001' ||
          !resultCodeStr
        ) {
          // In-transit / USSD session active / waiting for PIN input / network resolution
          // Keep transaction in PENDING so user has ample time to unlock screen and enter PIN
          record.resultDesc = 'Prompt sent. Waiting for customer to enter 4-digit M-Pesa PIN...';
        } else {
          record.status = 'FAILED';
          record.resultDesc = qData.ResultDesc || 'Transaction failed';
        }
      }
    } catch (e: any) {
      // Keep pending if query takes long or is in transit
    }
  }

  return res.json({
    success: true,
    transaction: record,
  });
});

// Confirm/Authorize Simulated Transaction (For developer/sandbox testing)
app.post('/api/mpesa/simulate-confirm', (req, res) => {
  const { checkoutRequestId, approved } = req.body;
  const record = transactions.get(checkoutRequestId);

  if (!record) {
    return res.status(404).json({ success: false, error: 'Transaction not found' });
  }

  if (approved) {
    record.status = 'COMPLETED';
    record.receiptNumber = `QKH${Math.floor(100000 + Math.random() * 900000)}KES`;
    record.resultDesc = 'The service request is processed successfully.';
  } else {
    record.status = 'CANCELLED';
    record.resultDesc = 'Request cancelled by customer.';
  }

  return res.json({ success: true, transaction: record });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Damak Farm full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();
