# Personalized Email Campaign Script

This script generates personalized emails for all Tailored Labs users based on their activity level and engagement.

## Features

- **Smart User Categorization**: Automatically categorizes users based on activity:
  - `new_user` - Signed up but no projects
  - `project_creator` - Created projects but no videos  
  - `video_uploader` - Uploaded videos but no active editing
  - `timeline_editor` - Actively editing but hasn't used AI
  - `ai_user` - Power user using AI features
  - `active_user` - General active user

- **Personalized Content**: Each email is tailored to the user's specific journey and needs
- **Activity Metrics**: Tracks projects, videos, AI usage, timeline activity
- **CSV Export**: Generates ready-to-import CSV for email services

## Usage

### Generate CSV for Email Campaign
```bash
npm run email:csv
```
This creates a file like `personalized-emails-2025-01-02.csv` with all user data and personalized content.

### Preview Emails in Console
```bash
npm run email:preview
```
This shows what the emails will look like without generating a file.

## CSV Output Format

The CSV includes these columns:
- **Email** - User's email address
- **Name** - User's display name  
- **Category** - User activity category
- **Projects** - Number of projects created
- **Videos** - Number of videos uploaded
- **Days Since Signup** - Account age
- **Subject** - Personalized email subject
- **Body** - Full personalized email content

## Email Template Features

All emails include:
- ✅ Personal greeting from Adrian (founder)
- ✅ Activity-specific guidance and next steps
- ✅ Product Hunt celebration (#10 ranking!)
- ✅ Slack community invitation
- ✅ Open Zoom call invitation for feedback
- ✅ Direct email support offer
- ✅ Encouraging tone highlighting the journey

## Sample Email Categories

### New User (No Projects)
- **Focus**: Getting started, first project creation
- **Offer**: Personal 15-minute walkthrough
- **CTA**: Create first project, upload videos

### Project Creator (Projects but No Videos)
- **Focus**: Video uploading guidance
- **Offer**: Upload tutorial video
- **CTA**: Upload first video clips

### Video Uploader (Videos but No Timeline)
- **Focus**: AI editing introduction
- **Offer**: AI demo session
- **CTA**: Try AI timeline generation

### Timeline Editor (Manual Editing)
- **Focus**: AI feature introduction
- **Offer**: AI workflow demo
- **CTA**: Try AI editing tools

### AI User (Power User)
- **Focus**: Advanced features, feedback collection
- **Offer**: Beta access, product roadmap input
- **CTA**: Product Hunt review, feedback call

## Requirements

- Node.js 18+
- Supabase service role key in `.env.local`
- Database access to user profiles and activity data

## Environment Variables

Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Importing to Email Services

### Gmail
1. Open Gmail → Compose
2. Use mail merge add-on (like "Yet Another Mail Merge")
3. Import the CSV file
4. Map columns to email fields

### Mailchimp
1. Create new campaign
2. Import CSV as audience
3. Use email and subject columns for personalization

### SendGrid
1. Upload CSV as contact list
2. Create dynamic template
3. Map CSV columns to template variables

## Safety Features

- **Read-only database queries** - No data modification
- **Email validation** - Skips users without valid emails
- **Error handling** - Continues processing if individual users fail
- **Progress tracking** - Shows real-time processing status
- **Stats reporting** - Provides campaign overview

## Support

The script includes comprehensive error handling and logging. If you encounter issues:

1. Check your environment variables
2. Verify database connection
3. Review console output for specific errors
4. Contact adrian@tailoredlabs.com for support

---

**🚀 Celebrating #10 on Product Hunt with personalized outreach to our amazing users!**