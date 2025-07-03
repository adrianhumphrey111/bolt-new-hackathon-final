#!/usr/bin/env node

/**
 * Personalized Email Campaign Script for Tailored Labs
 * 
 * This script queries the database for all users and sends personalized emails
 * based on their activity level and engagement with the platform.
 * 
 * Usage: node scripts/send-personalized-emails.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const OUTPUT_FORMAT = process.env.OUTPUT_FORMAT || 'csv'; // 'csv', 'console'
const FROM_EMAIL = 'adrian@tailoredlabs.com';
const SLACK_INVITE_URL = 'https://join.slack.com/t/tailoredlabs/shared_invite/your-invite-link';
const PRODUCT_HUNT_URL = 'https://www.producthunt.com/posts/tailored-labs';

/**
 * Get comprehensive user data with activity metrics
 */
async function getUsersWithActivity() {
  try {
    // First get all users from auth.users since profiles might not exist for all users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return [];
    }

    console.log(`Found ${authUsers.users.length} auth users`);

    // Then get their activity data
    const usersWithActivity = [];
    
    for (const authUser of authUsers.users) {
      try {
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // Get projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', authUser.id);

        // Get videos for this user's projects
        const projectIds = projects?.map(p => p.id) || [];
        let videos = [];
        if (projectIds.length > 0) {
          const { data: videosData } = await supabase
            .from('videos')
            .select('*')
            .in('project_id', projectIds);
          videos = videosData || [];
        }

        // Get timeline configurations
        let timelines = [];
        if (projectIds.length > 0) {
          const { data: timelinesData } = await supabase
            .from('timeline_configurations')
            .select('*')
            .in('project_id', projectIds);
          timelines = timelinesData || [];
        }

        // Get usage logs
        const { data: usageLogs } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('user_id', authUser.id);

        // Get EDL jobs
        const { data: edlJobs } = await supabase
          .from('edl_generation_jobs')
          .select('*')
          .eq('user_id', authUser.id);

        usersWithActivity.push({
          id: authUser.id,
          email: authUser.email,
          username: profile?.username,
          full_name: profile?.full_name,
          created_at: authUser.created_at,
          projects: projects || [],
          videos: videos || [],
          timelines: timelines || [],
          usage_logs: usageLogs || [],
          edl_jobs: edlJobs || []
        });

      } catch (userError) {
        console.error(`Error processing user ${authUser.id}:`, userError);
        // Still add the user with minimal data
        usersWithActivity.push({
          id: authUser.id,
          email: authUser.email,
          username: null,
          full_name: null,
          created_at: authUser.created_at,
          projects: [],
          videos: [],
          timelines: [],
          usage_logs: [],
          edl_jobs: []
        });
      }
    }

    // Process and enrich user data
    return usersWithActivity.map(user => {
      const projects = user.projects || [];
      const videos = user.videos || [];
      const timelines = user.timelines || [];
      const usageLogs = user.usage_logs || [];
      const edlJobs = user.edl_jobs || [];

      return {
        ...user,
        metrics: {
          projectCount: projects.length,
          videoCount: videos.length,
          timelineCount: timelines.length,
          totalVideoDuration: videos.reduce((sum, v) => sum + (v.duration || 0), 0),
          aiUsageCount: usageLogs.filter(l => l.action_type && l.action_type.includes('ai_')).length,
          edlJobCount: edlJobs.length,
          hasUploadedVideos: videos.length > 0,
          hasCreatedProjects: projects.length > 0,
          hasActiveTimelines: timelines.some(t => t.is_active),
          daysSinceSignup: Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
          lastActivity: getLastActivity(usageLogs, projects, videos)
        }
      };
    });
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

/**
 * Determine user's last activity date
 */
function getLastActivity(usageLogs, projects, videos) {
  const dates = [
    ...usageLogs.map(l => l.created_at),
    ...projects.map(p => p.created_at),
    ...videos.map(v => v.created_at)
  ].filter(Boolean);

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null;
}

/**
 * Categorize users based on their activity level
 */
function categorizeUser(user) {
  const { metrics } = user;

  if (metrics.projectCount === 0) {
    return 'new_user'; // Signed up but hasn't created anything
  } else if (metrics.projectCount > 0 && metrics.videoCount === 0) {
    return 'project_creator'; // Created projects but no videos
  } else if (metrics.videoCount > 0 && !metrics.hasActiveTimelines) {
    return 'video_uploader'; // Uploaded videos but no active editing
  } else if (metrics.hasActiveTimelines && metrics.edlJobCount === 0) {
    return 'timeline_editor'; // Actively editing but hasn't used AI
  } else if (metrics.edlJobCount > 0) {
    return 'ai_user'; // Power user using AI features
  } else {
    return 'active_user'; // General active user
  }
}

/**
 * Generate personalized email content based on user category and activity
 */
function generateEmailContent(user) {
  const category = categorizeUser(user);
  const name = user.full_name || user.username || 'there';
  const firstName = name.split(' ')[0];

  const baseContent = {
    subject: '',
    body: ''
  };

  // Common footer for all emails
  const footer = `

🚀 **We just hit #10 on Product Hunt!** If you haven't checked it out yet, we'd love your support: ${PRODUCT_HUNT_URL}

💬 **Join our community:** Connect with other creators in our Slack: ${SLACK_INVITE_URL}

📞 **Want to shape the future of Tailored Labs?** I'm hosting an open Zoom call with users to discuss what features you'd like to see next. Just reply "ZOOM" and I'll send you the details!

Need help with anything? Just reply to this email - I read every single one.

Cheers,
Adrian
Founder, Tailored Labs
adrian@tailoredlabs.com

P.S. Thanks for being part of this journey. With 57 users like you, we're building something special! 🎬`;

  switch (category) {
    case 'new_user':
      return {
        subject: `Hey ${firstName}! Ready to create your first video project? 🎬`,
        body: `Hi ${name}!

Thanks for signing up for Tailored Labs! I'm Adrian, the founder, and I personally welcome every new user.

I noticed you haven't created your first project yet - no worries! Getting started can feel overwhelming. Here's what I recommend:

1. **Click "New Project"** - Give it any name (you can change it later)
2. **Upload a few video clips** - Even phone videos work great
3. **Try our AI editor** - Just describe what kind of video you want to make

I've helped hundreds of users get started, and I'm here to help you too. If you run into ANY issues or have questions, just reply to this email.

**Want me to personally walk you through it?** I do 15-minute screen shares with new users. Just reply "HELP" and we'll set it up.${footer}`
      };

    case 'project_creator':
      return {
        subject: `${firstName}, let's get some videos into your project! 📹`,
        body: `Hi ${name}!

I see you created ${user.metrics.projectCount} project${user.metrics.projectCount > 1 ? 's' : ''} - awesome start! 

The next step is uploading some video clips. Here's what works best:

• **Phone videos** - Perfect for getting started
• **Screen recordings** - Great for tutorials
• **Any MP4/MOV files** - We handle the rest

Once you upload clips, our AI can automatically:
- Cut and arrange your footage
- Create smooth transitions  
- Build a narrative structure

**Stuck on uploading?** I've seen users get confused by this step. Reply "UPLOAD" and I'll send you a quick video walkthrough.${footer}`
      };

    case 'video_uploader':
      return {
        subject: `${firstName}, your videos are uploaded! Time for the magic ✨`,
        body: `Hi ${name}!

Great job uploading ${user.metrics.videoCount} video${user.metrics.videoCount > 1 ? 's' : ''}! That's ${Math.round(user.metrics.totalVideoDuration / 60)} minutes of content to work with.

Now comes the fun part - let our AI editor turn your footage into a polished video:

1. **Open your timeline editor**
2. **Click "Generate with AI"** 
3. **Describe your vision** (e.g., "Create a 2-minute highlight reel with upbeat pacing")
4. **Watch the magic happen**

The AI will analyze your footage and create professional cuts, transitions, and pacing automatically.

**Never used AI video editing before?** No problem! I can personally show you how it works. Just reply "DEMO" and I'll set up a quick call.${footer}`
      };

    case 'timeline_editor':
      return {
        subject: `${firstName}, you're editing like a pro! Have you tried the AI? 🤖`,
        body: `Hi ${name}!

I love seeing active creators like you! You've got ${user.metrics.timelineCount} timeline${user.metrics.timelineCount > 1 ? 's' : ''} going and you're clearly comfortable with the editor.

Since you're already editing, you might love our AI features:

• **Smart Cut Suggestions** - AI analyzes your content and suggests the best cuts
• **Auto-Narrative Building** - Describe your story, AI arranges the clips
• **Transition Optimization** - AI picks the perfect transitions for your style

Most manual editors save 70% of their time once they try the AI tools.

**Curious about AI editing but not sure where to start?** I can show you exactly how our power users combine manual control with AI assistance. Reply "AI DEMO" for a personal walkthrough.${footer}`
      };

    case 'ai_user':
      return {
        subject: `${firstName}, you're a Tailored Labs power user! 🔥`,
        body: `Hi ${name}!

Wow! You've used our AI editor ${user.metrics.edlJobCount} time${user.metrics.edlJobCount > 1 ? 's' : ''} and created ${user.metrics.projectCount} project${user.metrics.projectCount > 1 ? 's' : ''}. You're exactly the kind of creator we built this for!

Since you're a power user, I'd love to:

1. **Get your feedback** - What's working? What's not?
2. **Show you beta features** - You get first access to new AI tools
3. **Learn your workflow** - How can we make you even more efficient?

**Want to influence our product roadmap?** As a power user, your input is incredibly valuable. Reply "FEEDBACK" and I'll set up a 20-minute call to pick your brain.

Also, since you're crushing it with our tools, would you mind leaving us a review on Product Hunt? We just hit #10 and user reviews really help: ${PRODUCT_HUNT_URL}${footer}`
      };

    default:
      return {
        subject: `${firstName}, thanks for being part of the Tailored Labs journey! 🎬`,
        body: `Hi ${name}!

It's been ${user.metrics.daysSinceSignup} days since you joined Tailored Labs, and I wanted to personally reach out.

Whether you're just getting started or you're already creating amazing videos, I'm here to help. As the founder, I personally support every user.

**Having any issues?** Reply with your question - I respond to every email.
**Want to see what's coming next?** We're building some incredible new AI features.
**Just want to chat?** I love hearing from creators and learning about your projects.${footer}`
      };
  }
}

/**
 * Get user email from user object (already fetched)
 */
function getUserEmail(user) {
  return user.email || null;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCsvField(field) {
  if (field == null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Generate CSV output
 */
function generateCsv(emailData) {
  const headers = [
    'Email',
    'Name', 
    'Category',
    'Projects',
    'Videos', 
    'Days Since Signup',
    'Subject',
    'Body'
  ];

  const rows = emailData.map(item => [
    escapeCsvField(item.email),
    escapeCsvField(item.name),
    escapeCsvField(item.category),
    escapeCsvField(item.metrics.projectCount),
    escapeCsvField(item.metrics.videoCount),
    escapeCsvField(item.metrics.daysSinceSignup),
    escapeCsvField(item.content.subject),
    escapeCsvField(item.content.body)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Generating personalized email campaign...');
  
  try {
    // Get all users with their activity data
    console.log('📊 Fetching user data...');
    const users = await getUsersWithActivity();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    // Generate stats
    const stats = {
      total: users.length,
      byCategory: {},
      totalProjects: 0,
      totalVideos: 0
    };

    users.forEach(user => {
      const category = categorizeUser(user);
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.totalProjects += user.metrics.projectCount;
      stats.totalVideos += user.metrics.videoCount;
    });

    console.log('\n📈 User Stats:');
    console.log(`Total Users: ${stats.total}`);
    console.log(`Total Projects: ${stats.totalProjects}`);
    console.log(`Total Videos: ${stats.totalVideos}`);
    console.log('\nUser Categories:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    // Generate personalized content for each user
    console.log('\n📧 Generating personalized emails...');
    const emailData = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Get user email
        const email = getUserEmail(user);
        if (!email) {
          console.log(`\n⚠️  No email found for user ${user.id}`);
          errorCount++;
          continue;
        }

        const category = categorizeUser(user);
        const content = generateEmailContent(user);
        const name = user.full_name || user.username || 'User';

        emailData.push({
          email,
          name,
          category,
          metrics: user.metrics,
          content
        });

        successCount++;
        process.stdout.write('✅');
        
      } catch (error) {
        console.error(`\nError processing user ${user.id}:`, error.message);
        errorCount++;
        process.stdout.write('❌');
      }
    }

    console.log(`\n\n📊 Email generation complete!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (emailData.length === 0) {
      console.log('No emails to generate. Exiting.');
      return;
    }

    // Output based on format
    if (OUTPUT_FORMAT === 'csv') {
      const fs = require('fs');
      const csv = generateCsv(emailData);
      const filename = `personalized-emails-${new Date().toISOString().split('T')[0]}.csv`;
      
      fs.writeFileSync(filename, csv);
      console.log(`\n📄 CSV file saved: ${filename}`);
      console.log(`\nTo send emails, import this CSV into your email service (Gmail, Mailchimp, etc.)`);
      
    } else {
      // Console output for preview
      emailData.forEach((item, index) => {
        console.log('\n' + '='.repeat(80));
        console.log(`EMAIL ${index + 1}/${emailData.length}`);
        console.log(`TO: ${item.email} (${item.name})`);
        console.log(`CATEGORY: ${item.category}`);
        console.log(`PROJECTS: ${item.metrics.projectCount} | VIDEOS: ${item.metrics.videoCount}`);
        console.log(`SUBJECT: ${item.content.subject}`);
        console.log('\nBODY:');
        console.log(item.content.body);
        console.log('='.repeat(80));
      });
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getUsersWithActivity,
  categorizeUser,
  generateEmailContent,
  generateCsv,
  getUserEmail
};