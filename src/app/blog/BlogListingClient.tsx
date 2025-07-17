'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { trackBlogEvent } from '@/lib/analytics/gtag';
import { BlogPost } from '@/lib/blog-loader';

interface BlogListingClientProps {
  initialPosts: BlogPost[];
  categories: string[];
}

export default function BlogListingClient({ initialPosts, categories }: BlogListingClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredPosts, setFilteredPosts] = useState(initialPosts);

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    trackBlogEvent.filterContent('category', category);
    
    if (category === 'All') {
      setFilteredPosts(initialPosts);
    } else {
      setFilteredPosts(initialPosts.filter(post => post.category === category));
    }
  };

  const handlePostClick = (post: BlogPost) => {
    trackBlogEvent.viewPost(post.slug, post.title, post.category);
  };

  const handleCTAClick = (location: string) => {
    trackBlogEvent.ctaClick('blog_listing', 'free_trial', location);
  };

  const handleNewsletterSignup = () => {
    trackBlogEvent.newsletterSignup('blog_listing');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold hover:text-gray-300 transition-colors">
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
                onClick={() => handleCTAClick('header')}
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-all"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            AI Video Editing
            <br />
            <span className="text-gray-400">Insights & Tips</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Master AI video editing with expert guides, tutorials, and industry insights. 
            Learn how to save time and create professional content faster.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="pb-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  category === selectedCategory
                    ? 'bg-white text-black' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="pb-16 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-white">Latest Articles</h2>
            <p className="text-gray-400">Discover the latest in AI video editing</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                onClick={() => handlePostClick(post)}
                className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {post.readTime}
                    </div>
                  </div>
                  
                  <h2 className="text-lg font-bold mb-3 text-white group-hover:text-blue-400 transition-colors leading-tight">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                      Read Article
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            Stay Updated on AI Video Editing
          </h2>
          <p className="text-gray-400 mb-6">
            Get the latest tips, tools, and trends delivered to your inbox weekly.
          </p>
          <div className="flex max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-l-full text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
            <button 
              onClick={handleNewsletterSignup}
              className="bg-white text-black px-6 py-3 rounded-r-full font-medium hover:bg-gray-200 transition-all"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Try AI Video Editing?
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            Stop spending hours on tedious editing. Get professional results in minutes.
          </p>
          <Link
            href="/auth/signup"
            onClick={() => handleCTAClick('bottom_section')}
            className="bg-white text-black px-10 py-3 rounded-full text-lg font-semibold hover:bg-gray-200 transition-all inline-flex items-center space-x-2"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 10-minute free video included
          </p>
        </div>
      </section>
    </div>
  );
}