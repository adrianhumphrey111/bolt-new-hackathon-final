# Blog Post Management System

This directory contains blog posts for the Tailored Labs blog. Each post is stored as a markdown file with YAML frontmatter for metadata.

## Structure

```
blog-posts/
├── README.md                    # This file
├── posts/
│   ├── ai-video-editor-youtube-2024.md
│   ├── ai-video-editing-beginners-guide.md
│   └── ...
├── templates/
│   ├── blog-post-template.md   # Template for new posts
│   └── seo-guidelines.md       # SEO best practices
└── drafts/
    └── ...                     # Work-in-progress posts
```

## Creating New Posts

1. Copy the template from `templates/blog-post-template.md`
2. Fill in the frontmatter metadata
3. Write your content in markdown
4. Save to `posts/` directory
5. Run `npm run build-blog` to update the website

## Frontmatter Fields

```yaml
---
title: "Your Blog Post Title"
slug: "your-blog-post-slug"
excerpt: "Brief description for SEO and previews"
date: "2024-01-15"
category: "Guide" # Tools, Guide, Comparison, Social Media, Tips, Trends
tags: ["ai video editor", "youtube", "content creation"]
author: "Author Name"
readTime: "8 min"
seoKeywords: "ai video editor, youtube editing, video automation"
published: true
---
```

## SEO Keywords to Target

Based on search volume and relevance:

### High Priority (Monthly Search Volume 1000+)
- "ai video editor" (22,200)
- "free ai video editor" (1,600)
- "best ai video editor" (1,600)
- "ai video editor free" (1,600)
- "ai video editor tools" (590)
- "ai video editor app" (590)

### Medium Priority (Monthly Search Volume 100-1000)
- "ai video editor for youtube" (260)
- "ai video editor mac" (260)
- "ai video editor software" (210)
- "ai video editor reddit" (210)
- "ai video editor for reels" (170)
- "ai video editor for tiktok" (140)

### Long-tail Keywords (Lower volume but high intent)
- "how to use ai video editor"
- "which ai video editor is best"
- "ai video editor for beginners"
- "ai video editor vs traditional editing"

## Content Guidelines

### Writing Style
- Write for content creators who want to save time
- Focus on practical benefits and ROI
- Use specific time/money savings examples
- Include step-by-step instructions
- Address common concerns and objections

### Technical Depth
- Explain AI/ML concepts at a high level
- Don't reveal proprietary implementation details
- Focus on user benefits, not technical specifications
- Use analogies to make complex concepts accessible

### Call-to-Action Strategy
- Primary CTA: "Start Free Trial"
- Secondary CTA: Newsletter signup
- Tertiary CTA: Related blog posts
- Include social proof and testimonials

## Collaboration Workflow

### For Claude Code Users

1. **Create new post:**
   ```bash
   # Copy template
   cp blog-posts/templates/blog-post-template.md blog-posts/drafts/new-post.md
   
   # Edit with Claude Code
   code blog-posts/drafts/new-post.md
   ```

2. **Review and publish:**
   ```bash
   # Move to posts directory when ready
   mv blog-posts/drafts/new-post.md blog-posts/posts/
   
   # Update the blog system
   npm run build-blog
   ```

### For Team Members

1. Create branch for new post
2. Add post to `drafts/` directory
3. Request review via pull request
4. Move to `posts/` after approval

## Blog Post Ideas Queue

### Immediate Priority
1. "Best AI Video Editor for YouTube in 2024" ✅
2. "AI Video Editing for Beginners: Complete Guide" ✅
3. "AI Video Editor vs Traditional Editing: Which is Better?"
4. "How to Save 4+ Hours Per Video with AI Editing"
5. "AI Video Editor for Social Media: Instagram, TikTok, YouTube Shorts"

### Coming Soon
- "10 AI Video Editing Prompts That Actually Work"
- "AI Video Editor Pricing Guide 2024"
- "Best Free AI Video Editors (Real Review)"
- "AI Video Editing for Podcasters"
- "Future of AI Video Editing: 2024 Trends"

## Performance Tracking

Track these metrics for each post:
- Organic traffic growth
- Keyword rankings
- Conversion to free trial
- Social shares and engagement
- Time on page and bounce rate

## Technical Notes

- Posts are processed by `/src/lib/blog-loader.ts`
- Metadata is extracted from frontmatter
- Content is rendered with proper SEO tags
- Auto-generated sitemaps include all posts
- Schema markup for articles is included

## Emergency Procedures

If the blog system breaks:
1. Check `/src/lib/blog-loader.ts` for errors
2. Verify all posts have valid frontmatter
3. Ensure no special characters in slugs
4. Check that all referenced images exist

---

*This system is designed to work seamlessly with Claude Code for efficient blog management and collaboration.*