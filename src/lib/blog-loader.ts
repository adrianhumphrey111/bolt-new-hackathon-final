import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  author: string;
  readTime: string;
  seoKeywords: string;
  published: boolean;
  metaDescription?: string;
  content: string;
}

const postsDirectory = path.join(process.cwd(), 'blog-posts/posts');

export function getAllPosts(): BlogPost[] {
  // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title,
        excerpt: data.excerpt,
        date: data.date,
        category: data.category,
        tags: data.tags || [],
        author: data.author,
        readTime: data.readTime,
        seoKeywords: data.seoKeywords,
        published: data.published || false,
        metaDescription: data.metaDescription,
        content,
      } as BlogPost;
    })
    .filter(post => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allPosts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      excerpt: data.excerpt,
      date: data.date,
      category: data.category,
      tags: data.tags || [],
      author: data.author,
      readTime: data.readTime,
      seoKeywords: data.seoKeywords,
      published: data.published || false,
      metaDescription: data.metaDescription,
      content,
    } as BlogPost;
  } catch (error) {
    console.error(`Error loading post ${slug}:`, error);
    return null;
  }
}

export function getPostsByCategory(category: string): BlogPost[] {
  const allPosts = getAllPosts();
  if (category === 'All') return allPosts;
  
  return allPosts.filter(post => post.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post => post.tags.includes(tag));
}

export function getRelatedPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();
  const currentPost = getPostBySlug(currentSlug);
  
  if (!currentPost) return [];

  // Find posts with similar tags or category
  const relatedPosts = allPosts
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      let relevanceScore = 0;
      
      // Same category gets higher score
      if (post.category === currentPost.category) {
        relevanceScore += 3;
      }
      
      // Common tags get score
      const commonTags = post.tags.filter(tag => currentPost.tags.includes(tag));
      relevanceScore += commonTags.length;
      
      return { ...post, relevanceScore };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return relatedPosts;
}

export function getAllCategories(): string[] {
  const allPosts = getAllPosts();
  const categories = new Set(allPosts.map(post => post.category));
  return ['All', ...Array.from(categories)];
}

export function getAllTags(): string[] {
  const allPosts = getAllPosts();
  const tags = new Set(allPosts.flatMap(post => post.tags));
  return Array.from(tags);
}

export function getPostsForSitemap(): Array<{ slug: string; date: string }> {
  const allPosts = getAllPosts();
  return allPosts.map(post => ({
    slug: post.slug,
    date: post.date,
  }));
}

// Search functionality
export function searchPosts(query: string): BlogPost[] {
  const allPosts = getAllPosts();
  const searchTerm = query.toLowerCase();
  
  return allPosts.filter(post => 
    post.title.toLowerCase().includes(searchTerm) ||
    post.excerpt.toLowerCase().includes(searchTerm) ||
    post.content.toLowerCase().includes(searchTerm) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

// Enhanced markdown processing helper
export function processMarkdown(content: string): string {
  let processed = content;
  
  // Process code blocks first (to avoid conflicts)
  processed = processed.replace(/```([\s\S]*?)```/g, '<pre class="blog-code-block"><code>$1</code></pre>');
  
  // Convert line breaks to placeholder
  processed = processed.replace(/\n/g, '{{BR}}');
  
  // Process headers with better hierarchy and spacing
  processed = processed.replace(/#### (.*?){{BR}}/g, '<h4 class="blog-h4">$1</h4>{{BR}}');
  processed = processed.replace(/### (.*?){{BR}}/g, '<h3 class="blog-h3">$1</h3>{{BR}}');
  processed = processed.replace(/## (.*?){{BR}}/g, '<h2 class="blog-h2">$1</h2>{{BR}}');
  processed = processed.replace(/# (.*?){{BR}}/g, '<h1 class="blog-h1">$1</h1>{{BR}}');
  
  // Process lists more elegantly with better spacing
  // Handle nested lists and maintain proper structure
  processed = processed.replace(/((?:- .*?{{BR}})+)/g, (match) => {
    const items = match.split('{{BR}}')
      .filter(item => item.trim())
      .map(item => {
        const content = item.replace(/^- /, '').trim();
        // Handle nested lists
        if (content.startsWith('**') && content.includes('**')) {
          const [boldPart, ...rest] = content.split('**');
          if (rest.length > 0) {
            return `<li class="blog-li"><strong class="blog-li-header">${boldPart}</strong>${rest.join('**')}</li>`;
          }
        }
        return `<li class="blog-li">${content}</li>`;
      })
      .join('\n');
    return `<ul class="blog-ul">\n${items}\n</ul>{{BR}}`;
  });
  
  processed = processed.replace(/((?:\d+\. .*?{{BR}})+)/g, (match) => {
    const items = match.split('{{BR}}')
      .filter(item => item.trim())
      .map(item => {
        const content = item.replace(/^\d+\. /, '').trim();
        return `<li class="blog-li-ordered">${content}</li>`;
      })
      .join('\n');
    return `<ol class="blog-ol">\n${items}\n</ol>{{BR}}`;
  });
  
  // Process emphasis and strong text
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="blog-strong">$1</strong>');
  processed = processed.replace(/\*(.*?)\*/g, '<em class="blog-em">$1</em>');
  
  // Process inline code
  processed = processed.replace(/`([^`]+)`/g, '<code class="blog-inline-code">$1</code>');
  
  // Process blockquotes
  processed = processed.replace(/> (.*?){{BR}}/g, '<blockquote class="blog-blockquote">$1</blockquote>{{BR}}');
  
  // Process links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="blog-link" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Process special highlight boxes
  processed = processed.replace(/\*\*Pro Tip:\*\*(.*?){{BR}}/g, '<div class="blog-tip-box"><strong>💡 Pro Tip:</strong>$1</div>{{BR}}');
  processed = processed.replace(/\*\*Important:\*\*(.*?){{BR}}/g, '<div class="blog-important-box"><strong>⚠️ Important:</strong>$1</div>{{BR}}');
  processed = processed.replace(/\*\*Note:\*\*(.*?){{BR}}/g, '<div class="blog-note-box"><strong>📝 Note:</strong>$1</div>{{BR}}');
  
  // Process step-by-step sections
  processed = processed.replace(/\*\*Step (\d+):\*\*(.*?){{BR}}/g, '<div class="blog-step-box"><strong class="blog-step-number">Step $1:</strong>$2</div>{{BR}}');
  
  // Process sub-sections (content between headers)
  processed = processed.replace(/\*\*([^*]+):\*\*(.*?)(?={{BR}}{{BR}}|$)/g, '<div class="blog-subsection"><h5 class="blog-subsection-title">$1</h5><div class="blog-subsection-content">$2</div></div>{{BR}}');
  
  // Split into paragraphs based on double line breaks
  const paragraphs = processed.split(/{{BR}}{{BR}}+/);
  processed = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    
    // Don't wrap if it's already an HTML element
    if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || 
        para.startsWith('<blockquote') || para.startsWith('<div') || para.startsWith('<pre')) {
      return para.replace(/{{BR}}/g, '');
    }
    
    // Replace single line breaks with spaces in paragraphs
    const cleanPara = para.replace(/{{BR}}/g, ' ').trim();
    return cleanPara ? `<p class="blog-p">${cleanPara}</p>` : '';
  }).filter(p => p).join('\n\n');
  
  return processed;
}