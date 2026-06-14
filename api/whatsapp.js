// api/whatsapp.js — NairaCoach WhatsApp Bot
// Handles text, images, voice notes, PDFs and documents

const VERIFY_TOKEN = 'nairacoach_webhook_2024';
const CLAUDE_KEY   = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;   // for Whisper STT
const SUPA_URL     = 'https://advjtxyypcpnrdknbxdf.supabase.co';
const SUPA_KEY     = process.env.SUPABASE_SERVICE_KEY;
const WA_TOKEN     = process.env.WHATSAPP_TOKEN;
const PHONE_ID     = process.env.WHATSAPP_PHONE_ID;

const SUPA_HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
};

// ── Supabase helpers ──────────────────────────────────────
async function supaGet(table, filter) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  });
  return res.ok ? res.json() : [];
}

async function supaPost(table, data) {
  return fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  });
}

async function supaPatch(table, filter, data) {
  return fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...SUPA_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  });
}

// ── User management ───────────────────────────────────────
async function getOrCreateUser(phone) {
  const rows = await supaGet('whatsapp_users', `phone=eq.${phone}&select=*`);
  if (rows.length > 0) return rows[0];
  const newUser = { phone, name: 'Champion', created_at: new Date().toISOString() };
  await supaPost('whatsapp_users', newUser);
  return newUser;
}

async function getUserContext(phone) {
  const [expenses, incomes] = await Promise.all([
    supaGet('wa_expenses', `phone=eq.${phone}&order=created_at.desc&limit=50&select=*`),
    supaGet('wa_incomes',  `phone=eq.${phone}&order=created_at.desc&limit=10&select=*`),
  ]);
  const totalSpent  = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalIncome = incomes.reduce((s, i)  => s + (i.amount || 0), 0);
  const bycat = expenses.reduce((a, e) => {
    a[e.category] = (a[e.category] || 0) + e.amount;
    return a;
  }, {});
  return { expenses, incomes, totalSpent, totalIncome, bycat };
}

// ── Download WhatsApp media ───────────────────────────────
async function downloadMedia(mediaId) {
  // Step 1: get media URL
  const metaRes = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    { headers: { 'Authorization': `Bearer ${WA_TOKEN}` } }
  );
  const { url, mime_type } = await metaRes.json();

  // Step 2: download the actual file
  const fileRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${WA_TOKEN}` }
  });
  const buffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, mime_type, buffer };
}

// ── Claude: parse text message ────────────────────────────
async function parseTextWithClaude(message, context, userName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: buildSystemPrompt(userName, context),
      messages: [{ role: 'user', content: message }]
    })
  });
  return extractJSON(await res.json());
}

// ── Claude Vision: parse image ────────────────────────────
async function parseImageWithClaude(base64, mimeType, context, userName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: buildSystemPrompt(userName, context, 'image'),
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 }
          },
          {
            type: 'text',
            text: 'This is a receipt, payment screenshot or transaction image sent by a Nigerian user. Extract all transaction details and return JSON.'
          }
        ]
      }]
    })
  });
  return extractJSON(await res.json());
}

// ── Claude: parse extracted text (PDF/doc) ────────────────
async function parseTextDocWithClaude(extractedText, docType, context, userName) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: buildSystemPrompt(userName, context, docType),
      messages: [{
        role: 'user',
        content: `This is text extracted from a ${docType} sent by a Nigerian user. Extract all transactions and return JSON.\n\n---\n${extractedText.slice(0, 6000)}`
      }]
    })
  });
  return extractJSON(await res.json());
}

// ── Whisper: transcribe voice note ────────────────────────
async function transcribeVoice(buffer, mimeType) {
  const ext = mimeType.includes('ogg') ? 'ogg'
            : mimeType.includes('mp4') ? 'mp4'
            : mimeType.includes('mpeg') ? 'mp3' : 'ogg';

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), `voice.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('prompt', 'Nigerian English financial transaction. Amounts in naira. Examples: spent five hundred on food, bought airtime for two hundred naira, transport cost one thousand.');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: formData
  });
  const data = await res.json();
  return data.text || '';
}

// ── Extract text from PDF ─────────────────────────────────
async function extractPDFText(base64) {
  // Use Claude's document reading capability
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: 'Extract all financial transactions from this PDF. Return as JSON array: [{date,description,amount,type:"debit"|"credit"}]. Nigerian context — amounts in naira.'
          }
        ]
      }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || '[]';
}

// ── Build Claude system prompt ────────────────────────────
function buildSystemPrompt(userName, context, mode = 'text') {
  const isImage = mode === 'image';
  const isPDF   = mode === 'pdf';
  const isMulti = isPDF;

  return `You are NairaCoach, a friendly Nigerian personal finance AI on WhatsApp.
User name: ${userName}.
This month: spent ₦${context.totalSpent.toLocaleString()}, income ₦${context.totalIncome.toLocaleString()}.
Top categories: ${Object.entries(context.bycat).map(([k,v])=>`${k} ₦${v.toLocaleString()}`).join(', ')}.

${isImage ? 'The user sent an IMAGE — extract transaction details from the receipt/screenshot.' : ''}
${isPDF   ? 'The user sent a PDF — it may contain MULTIPLE transactions. Extract all of them.' : ''}

Reply ONLY with valid JSON:
${isMulti ? `{
  "intent": "log_multiple",
  "transactions": [{"amount":number,"category":string,"note":string,"date":string}],
  "reply": "WhatsApp reply confirming what was logged"
}` : `{
  "intent": "log_expense"|"log_income"|"log_multiple"|"check_balance"|"get_tip"|"get_report"|"set_name"|"chat",
  "amount": number or null,
  "category": "Food|Transport|Bills|Health|Shopping|Entertainment|Education|Savings|Other" or null,
  "note": string or null,
  "transactions": [] or [{amount,category,note,date}],
  "reply": "friendly WhatsApp reply (2-3 sentences max, use emojis, Nigerian tone)"
}`}

Categories: Food, Transport, Bills (airtime/data/DSTV/utilities), Health, Shopping, Entertainment, Education, Savings, Other.
"1k" = 1000, "5k" = 5000, "recharge/airtime/data" = Bills, "bus/keke/okada/uber" = Transport.
For images/screenshots: look for OPay, PalmPay, Kuda, Moniepoint, GTBank etc.
Always reply warmly. Keep WhatsApp replies short and encouraging.`;
}

// ── Extract JSON from Claude response ────────────────────
function extractJSON(data) {
  const text = data.content?.[0]?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  try { return match ? JSON.parse(match[0]) : null; }
  catch { return null; }
}

// ── Log single expense ────────────────────────────────────
async function logExpense(phone, amount, category, note, date) {
  return supaPost('wa_expenses', {
    phone, amount, category: category || 'Other',
    note: note || category || 'Expense',
    date: date || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString()
  });
}

async function logIncome(phone, amount, note) {
  return supaPost('wa_incomes', {
    phone, amount, note: note || 'Income',
    date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString()
  });
}

// ── Format report message ─────────────────────────────────
function buildReport(context, userName) {
  const top = Object.entries(context.bycat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `  • ${k}: ₦${v.toLocaleString()}`)
    .join('\n');
  const balance = context.totalIncome - context.totalSpent;
  return `📊 *${userName}'s Report*\n\n💰 Income: ₦${context.totalIncome.toLocaleString()}\n💸 Spent: ₦${context.totalSpent.toLocaleString()}\n${balance >= 0 ? '✅' : '🔴'} Balance: ₦${Math.abs(balance).toLocaleString()} ${balance >= 0 ? 'saved' : 'overspent'}\n\n🏆 Top Spending:\n${top || '  No expenses yet'}\n\nKeep going ${userName}! 🇳🇬`;
}

// ── Send WhatsApp message ─────────────────────────────────
async function sendMessage(to, text) {
  return fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
}

// ── MAIN HANDLER ──────────────────────────────────────────
export default async function handler(req, res) {
  // Webhook verification
  if (req.method === 'GET') {
    const { 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') return res.status(405).end();

  // Always return 200 immediately (WhatsApp requires fast response)
  res.status(200).json({ ok: true });

  try {
    const entry   = req.body?.entry?.[0];
    const change  = entry?.changes?.[0]?.value;
    const msg     = change?.messages?.[0];
    if (!msg) return;

    const phone   = msg.from;
    const msgType = msg.type; // text | image | audio | document | video
    const user    = await getOrCreateUser(phone);
    const context = await getUserContext(phone);
    const name    = user.name || 'Champion';

    let parsed    = null;
    let replyText = '';

    // ── TEXT MESSAGE ─────────────────────────────────────
    if (msgType === 'text') {
      const text = msg.text.body.trim();

      // Built-in commands (no AI needed)
      if (/^(report|statement|summary)$/i.test(text)) {
        return sendMessage(phone, buildReport(context, name));
      }
      if (/^(balance|bal)$/i.test(text)) {
        const bal = context.totalIncome - context.totalSpent;
        return sendMessage(phone, `💰 Balance: ₦${Math.abs(bal).toLocaleString()} ${bal >= 0 ? '✅ available' : '🔴 overspent'}\nIncome: ₦${context.totalIncome.toLocaleString()} | Spent: ₦${context.totalSpent.toLocaleString()}`);
      }
      if (/^(help|\?)$/i.test(text)) {
        return sendMessage(phone, `🤖 *NairaCoach Commands*\n\n💬 Just talk naturally:\n  "spent 500 on food"\n  "bought airtime 200"\n  "transport 150"\n\n📸 Send images:\n  Receipts, OPay/PalmPay screenshots\n\n📄 Send PDF:\n  Bank statements, invoices\n\n🎤 Send voice note:\n  Just say what you spent\n\n📊 Type *report* for your summary\n💰 Type *balance* to check balance`);
      }

      parsed = await parseTextWithClaude(text, context, name);
    }

    // ── IMAGE (receipt, screenshot) ───────────────────────
    else if (msgType === 'image') {
      await sendMessage(phone, '📸 Reading your image...');
      const { base64, mime_type } = await downloadMedia(msg.image.id);
      parsed = await parseImageWithClaude(base64, mime_type, context, name);
      if (!parsed) {
        return sendMessage(phone, "❌ Couldn't read that image. Try a clearer photo or just type the amount.");
      }
    }

    // ── VOICE NOTE ────────────────────────────────────────
    else if (msgType === 'audio') {
      await sendMessage(phone, '🎤 Listening to your voice note...');
      const { buffer, mime_type } = await downloadMedia(msg.audio.id);
      const transcript = await transcribeVoice(buffer, mime_type);
      if (!transcript) {
        return sendMessage(phone, "❌ Couldn't hear that clearly. Try again or type it out.");
      }
      // Show what was heard then parse it
      parsed = await parseTextWithClaude(transcript, context, name);
      if (parsed) parsed.reply = `🎤 Heard: "${transcript}"\n\n${parsed.reply}`;
    }

    // ── PDF DOCUMENT ──────────────────────────────────────
    else if (msgType === 'document') {
      const doc = msg.document;
      const mime = doc.mime_type || '';

      await sendMessage(phone, '📄 Reading your document...');
      const { base64, mime_type } = await downloadMedia(doc.id);

      if (mime.includes('pdf')) {
        // Claude reads PDF natively
        const pdfText = await extractPDFText(base64);
        parsed = await parseTextDocWithClaude(pdfText, 'pdf', context, name);
      } else if (mime.includes('text') || mime.includes('csv')) {
        // Plain text / CSV
        const text = Buffer.from(base64, 'base64').toString('utf-8');
        parsed = await parseTextDocWithClaude(text, 'document', context, name);
      } else {
        return sendMessage(phone, '📄 I can read PDF files and CSV bank exports. Send me a PDF bank statement or invoice!');
      }
    }

    // ── VIDEO (ignore for now) ────────────────────────────
    else if (msgType === 'video') {
      return sendMessage(phone, "🎥 I can't process videos yet, but I can read images, voice notes and PDF files!");
    }

    // ── Unsupported ───────────────────────────────────────
    else {
      return sendMessage(phone, "👋 Send me a text, voice note, receipt photo or PDF bank statement!");
    }

    if (!parsed) {
      return sendMessage(phone, "❌ Something went wrong. Please try again.");
    }

    // ── HANDLE INTENTS ────────────────────────────────────

    // Single expense
    if (parsed.intent === 'log_expense' && parsed.amount > 0) {
      await logExpense(phone, parsed.amount, parsed.category, parsed.note, null);
    }

    // Single income
    if (parsed.intent === 'log_income' && parsed.amount > 0) {
      await logIncome(phone, parsed.amount, parsed.note);
    }

    // Multiple transactions (PDF bank statement)
    if (parsed.intent === 'log_multiple' && parsed.transactions?.length > 0) {
      const logs = parsed.transactions.filter(t => t.amount > 0);
      await Promise.all(logs.map(t =>
        logExpense(phone, t.amount, t.category, t.note, t.date)
      ));
      const total = logs.reduce((s, t) => s + t.amount, 0);
      replyText = parsed.reply || `✅ Logged ${logs.length} transactions totalling ₦${total.toLocaleString()}!`;
    }

    // Set name
    if (parsed.intent === 'set_name' && parsed.note) {
      await supaPatch('whatsapp_users', `phone=eq.${phone}`, { name: parsed.note });
    }

    // Report
    if (parsed.intent === 'get_report') {
      const fresh = await getUserContext(phone);
      return sendMessage(phone, buildReport(fresh, name));
    }

    // Send reply
    const finalReply = replyText || parsed.reply || "✅ Got it!";
    await sendMessage(phone, finalReply);

  } catch (e) {
    console.error('NairaCoach WhatsApp error:', e.message, e.stack);
  }
}
