import { Metadata } from 'next';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { getAllPosts, getAllCategories } from '@/lib/blog-loader';
import BlogListingClient from './BlogListingClient';

export const metadata: Metadata = {
  title: 'AI Video Editing Blog - Tips, Trends & Tutorials | Tailored Labs',
  description: 'Learn about AI video editing, save time on video production, and master automated editing techniques. Expert tips for content creators.',
  keywords: 'ai video editor, automated video editing, video production tips, content creator tools, ai video editing software',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'AI Video Editing Blog - Tips, Trends & Tutorials',
    description: 'Learn about AI video editing, save time on video production, and master automated editing techniques.',
    type: 'website',
    url: 'https://tailoredlabs.com/blog',
    siteName: 'Tailored Labs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Editing Blog - Tips, Trends & Tutorials',
    description: 'Learn about AI video editing, save time on video production, and master automated editing techniques.',
    creator: '@tailoredlabs',
  },
  alternates: {
    canonical: 'https://tailoredlabs.com/blog',
  },
};

export default function BlogPage() {
  const blogPosts = getAllPosts();
  const categories = getAllCategories();

  return (
    <BlogListingClient 
      initialPosts={blogPosts} 
      categories={categories}
    />
  );
}