import { NextRequest, NextResponse } from 'next/server';
import { addEmailToMailchimp } from '../../../../lib/mailchimp';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, tags } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('🔍 Mailchimp subscribe request:', { email, firstName, lastName, tags });

    const result = await addEmailToMailchimp(email, firstName, lastName, tags);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Successfully subscribed to newsletter' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Mailchimp subscribe API error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}