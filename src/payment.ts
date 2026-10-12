export interface ReceiptMetadata {
  amount: number | null;
  payerName: string | null;
  transferTime: string | null;
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function buildPromptPayPayload(phone: string, amount: number) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const amountString = String(Math.round(amount));
  const payload = [
    '000201',
    '010211',
    '29370016A000000677010111',
    '01130066',
    `0214${cleanPhone}`,
    '5303764',
    `540${amountString.padStart(2, '0')}`,
    '5802TH',
    '5909NP Place',
    '6007'
  ].join('');

  return payload;
}

export function extractReceiptMetadata(text: string): ReceiptMetadata {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const normalized = lines.join(' ');
  const amountSource = lines.find((line) => /(?:จำนวน(?:เงิน)?|ยอด(?:โอน|เงิน)?|amount|total|เงินบาท|baht|thb|฿)/i.test(line)) ?? normalized;
  const amountMatch = amountSource.match(
    /(?:จำนวน(?:เงิน)?|ยอด(?:โอน|เงิน)?|amount|total|เงินบาท|baht|thb)\s*[:\-]?\s*(?:฿\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i
  ) ?? amountSource.match(/฿\s*([0-9][0-9,]*(?:\.\d{1,2})?)/);
  const payerLine = lines.find((line) => /(?:โอนเงินจาก|ผู้โอน|ชื่อผู้โอน|from|sender)/i.test(line)) ?? '';
  const payerMatch = payerLine.match(/(?:โอนเงินจาก|ผู้โอน|ชื่อผู้โอน|from|sender)\s*[:\-]?\s*([ก-๙A-Za-z][ก-๙A-Za-z .'-]{1,79})/i);
  const timeMatch = normalized.match(/(?:เวลา|time)\s*[:\-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i)
    ?? normalized.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);

  return {
    amount: amountMatch ? parseAmount(amountMatch[1]) : null,
    payerName: payerMatch ? payerMatch[1].trim() : null,
    transferTime: timeMatch ? timeMatch[1] : null
  };
}
