import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPromptPayPayload, extractReceiptMetadata } from './payment';

test('buildPromptPayPayload creates a PromptPay-compatible payload', () => {
  const payload = buildPromptPayPayload('0661327370', 12000);
  assert.match(payload, /^000201/);
  assert.match(payload, /0661327370/);
});

test('extractReceiptMetadata parses amount and payer name from OCR text', () => {
  const result = extractReceiptMetadata('โอนเงินจาก นายสมชาย\nจำนวน 12000 บาท\nเวลา 14:30 01/07/2026');
  assert.equal(result.amount, 12000);
  assert.match(result.payerName || '', /สมชาย/);
  assert.match(result.transferTime || '', /14:30/);
});
