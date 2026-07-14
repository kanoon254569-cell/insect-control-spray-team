export interface ReceiptMetadata {
  amount: number | null;
  payerName: string | null;
  transferTime: string | null;
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
  const normalized = text.replace(/\s+/g, ' ').trim();
  const amountMatch = normalized.match(/(?:จำนวน|amount)\s*[: ]*([0-9,]+)\s*(บาท|baht)?/i);
  const payerMatch = normalized.match(/(?:จาก|from)\s+(.{2,40})/i);
  const timeMatch = normalized.match(/(\d{1,2}:\d{2}(?:\s*\d{2}:\d{2})?)/);

  return {
    amount: amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null,
    payerName: payerMatch ? payerMatch[1].trim() : null,
    transferTime: timeMatch ? timeMatch[1] : null
  };
}
