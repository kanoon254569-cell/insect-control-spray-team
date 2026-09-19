import crypto from 'crypto';

export function formatThailandDateTime() {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date());
}

export async function sendLineNotification(message: string) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetUserId = process.env.LINE_TARGET_USER_ID;

  if (!accessToken || !targetUserId) {
    console.warn('LINE notification is not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: targetUserId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE API error:', response.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('LINE notification error:', error);
    return false;
  }
}

export function verifyLineSignature(body: string, signature: string) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret || !signature) return false;

  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}