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

test('extractReceiptMetadata supports common Thai receipt labels and decimals', () => {
  const result = extractReceiptMetadata('ผู้โอน: นางสาวมาลี ใจดี\nยอดโอน ฿1,250.50\nเวลา: 09:45:12');
  assert.equal(result.amount, 1250.5);
  assert.equal(result.payerName, 'นางสาวมาลี ใจดี');
  assert.equal(result.transferTime, '09:45:12');
});

test('extractReceiptMetadata does not mistake an unlabeled date for an amount', () => {
  const result = extractReceiptMetadata('วันที่ 12/10/2026\nเวลา 14:30');
  assert.equal(result.amount, null);
  assert.equal(result.payerName, null);
  assert.equal(result.transferTime, '14:30');
});
