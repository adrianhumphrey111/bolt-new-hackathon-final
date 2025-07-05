import crypto from 'crypto';

interface MailchimpConfig {
  apiKey: string;
  audienceId?: string;
  serverPrefix: string;
}

function getMailchimpConfig(): MailchimpConfig {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID; // Optional now
  
  if (!apiKey) {
    throw new Error('Mailchimp API key must be set in environment variables');
  }

  // Extract server prefix from API key (e.g., 'us1' from 'abc123-us1')
  const serverPrefix = apiKey.split('-')[1];
  if (!serverPrefix) {
    throw new Error('Invalid Mailchimp API key format');
  }

  return {
    apiKey,
    audienceId,
    serverPrefix,
  };
}

async function getDefaultAudienceId(apiKey: string, serverPrefix: string): Promise<string | null> {
  try {
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch Mailchimp lists');
      return null;
    }

    const data = await response.json();
    
    // Return the first list ID (usually the default audience)
    if (data.lists && data.lists.length > 0) {
      return data.lists[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching default audience:', error);
    return null;
  }
}

function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

export async function addEmailToMailchimp(
  email: string, 
  firstName?: string, 
  lastName?: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getMailchimpConfig();
    
    // Get audience ID - use provided one or fetch the default
    let audienceId = config.audienceId;
    if (!audienceId) {
      console.log('🔍 No audience ID provided, fetching default audience...');
      audienceId = await getDefaultAudienceId(config.apiKey, config.serverPrefix);
      
      if (!audienceId) {
        return { 
          success: false, 
          error: 'No Mailchimp audience found. Please create an audience in your Mailchimp account.' 
        };
      }
      
      console.log('✅ Using default audience:', audienceId);
    }
    
    const subscriberHash = getSubscriberHash(email);
    const url = `https://${config.serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;
    
    const memberData = {
      email_address: email,
      status_if_new: 'subscribed',
      status: 'subscribed',
      merge_fields: {
        ...(firstName && { FNAME: firstName }),
        ...(lastName && { LNAME: lastName }),
      },
      ...(tags && tags.length > 0 && { tags: tags.map(tag => ({ name: tag, status: 'active' })) })
    };

    console.log('🔍 Adding email to Mailchimp:', { email, audienceId, tags });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Mailchimp API error:', responseData);
      
      // If user is already subscribed, consider it a success
      if (responseData.title === 'Member Exists') {
        console.log('✅ Email already exists in Mailchimp - updating');
        return { success: true };
      }
      
      return { 
        success: false, 
        error: responseData.detail || responseData.title || 'Failed to add email to Mailchimp' 
      };
    }

    console.log('✅ Successfully added email to Mailchimp:', responseData.email_address);
    return { success: true };

  } catch (error) {
    console.error('❌ Mailchimp integration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Mailchimp integration failed' 
    };
  }
}

export async function removeEmailFromMailchimp(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getMailchimpConfig();
    
    // Get audience ID - use provided one or fetch the default
    let audienceId = config.audienceId;
    if (!audienceId) {
      console.log('🔍 No audience ID provided, fetching default audience...');
      audienceId = await getDefaultAudienceId(config.apiKey, config.serverPrefix);
      
      if (!audienceId) {
        return { 
          success: false, 
          error: 'No Mailchimp audience found. Please create an audience in your Mailchimp account.' 
        };
      }
    }
    
    const subscriberHash = getSubscriberHash(email);
    const url = `https://${config.serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;
    
    console.log('🔍 Removing email from Mailchimp:', email);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unsubscribed'
      }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      console.error('❌ Mailchimp unsubscribe error:', responseData);
      return { 
        success: false, 
        error: responseData.detail || responseData.title || 'Failed to unsubscribe from Mailchimp' 
      };
    }

    console.log('✅ Successfully unsubscribed email from Mailchimp');
    return { success: true };

  } catch (error) {
    console.error('❌ Mailchimp unsubscribe error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Mailchimp unsubscribe failed' 
    };
  }
}