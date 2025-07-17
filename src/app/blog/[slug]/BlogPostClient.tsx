'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Share2, ArrowRight } from 'lucide-react';
import { trackBlogEvent, trackScrollDepth, trackTimeOnPage, trackSEOMetrics } from '@/lib/analytics/gtag';
import { BlogPost, processMarkdown } from '@/lib/blog-loader';
import '../blog-content.css';

interface BlogPostClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostClient({ post, relatedPosts }: BlogPostClientProps) {
  const [processedContent, setProcessedContent] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setProcessedContent(processMarkdown(post.content));
  }, [post.content]);

  useEffect(() => {
    if (!isClient) return;
    
    // Track blog post view
    trackBlogEvent.viewPost(post.slug, post.title, post.category);
    
    // Track SEO metrics
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q') || urlParams.get('search') || undefined;
    trackSEOMetrics(post.slug, referrer, searchQuery);
    
    // Set up scroll tracking
    const cleanupScroll = trackScrollDepth(post.slug);
    
    // Set up time tracking
    const cleanupTime = trackTimeOnPage(post.slug);
    
    // Cleanup on unmount
    return () => {
      cleanupScroll?.();
      cleanupTime?.();
    };
  }, [isClient, post.slug, post.title, post.category]);

  const handleCTAClick = (ctaType: 'free_trial' | 'newsletter' | 'related_post', location: string) => {
    trackBlogEvent.ctaClick(post.slug, ctaType, location);
  };

  const handleSocialShare = (platform: string) => {
    trackBlogEvent.socialShare(post.slug, platform);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
              Tailored Labs
            </Link>
            <div className="flex items-center space-x-8">
              <Link href="/features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="text-white font-medium">
                Blog
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => handleCTAClick('free_trial', 'header')}
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>

          {/* Article Container */}
          <article className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            {/* Article Header */}
            <header className="p-6 pb-4 border-b border-gray-800">
              {/* Author Info Bar */}
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={`https://ui-avatars.com/api/?name=Adrian+Humphrey&background=3b82f6&color=ffffff&size=48&rounded=true`}
                  alt="Adrian Humphrey"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-white">Adrian Humphrey</span>
                    <span className="text-gray-600">•</span>
                    <time className="text-sm text-gray-400">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </time>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {post.readTime}
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => handleSocialShare('twitter')}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Share on Twitter"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
                {post.title}
              </h1>

              {/* Excerpt */}
              <p className="text-lg text-gray-400 leading-relaxed">
                {post.excerpt}
              </p>
            </header>

            {/* Article Content */}
            <div className="p-6">
              <div className="blog-content prose prose-lg prose-gray dark:prose-invert max-w-none">
                {isClient && processedContent ? (
                  <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                ) : (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-12 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            Ready to Try AI Video Editing?
          </h2>
          <p className="text-gray-400 mb-6">
            Stop spending hours on tedious editing. Get professional results in minutes.
          </p>
          <Link
            href="/auth/signup"
            onClick={() => handleCTAClick('free_trial', 'mid_article')}
            className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all inline-flex items-center space-x-2"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 10-minute free video included
          </p>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-16 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-white">Keep Reading</h2>
            <p className="text-gray-400">More insights on AI video editing</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.slug}
                href={`/blog/${relatedPost.slug}`}
                onClick={() => handleCTAClick('related_post', 'bottom_section')}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                    {relatedPost.category}
                  </span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {relatedPost.readTime}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white group-hover:text-blue-400 transition-colors leading-tight">
                  {relatedPost.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {relatedPost.excerpt}
                </p>
                <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                  Read Article
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
          
          {/* Browse All Posts CTA */}
          <div className="text-center mt-12">
            <Link
              href="/blog"
              className="inline-flex items-center px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700 hover:border-gray-600"
            >
              Browse All Articles
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}