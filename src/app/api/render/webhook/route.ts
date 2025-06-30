import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature } from '@remotion/lambda/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Remotion-Signature');

    if (!signature || !process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Validate webhook signature
    const isValid = validateWebhookSignature({
      secret: process.env.WEBHOOK_SECRET!,
      body,
      signatureHeader: signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    console.log('🔔 Webhook received:', webhookData.type);

    switch (webhookData.type) {
      case 'render-progress':
        console.log(`📈 Render progress: ${Math.round(webhookData.progress * 100)}%`);
        // Here you could broadcast to connected clients via WebSocket
        // or store progress in database for real-time updates
        break;

      case 'render-success':
        console.log('✅ Render completed successfully:', webhookData.outputFile);
        // Notify user that render is complete
        break;

      case 'render-error':
        console.error('❌ Render failed:', webhookData.error);
        // Notify user about render failure
        break;

      default:
        console.log('Unknown webhook type:', webhookData.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}