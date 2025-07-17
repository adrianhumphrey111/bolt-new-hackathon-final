import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Share2, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts, getRelatedPosts, processMarkdown } from '@/lib/blog-loader';
import BlogPostClient from './BlogPostClient';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post || !post.published) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${post.title} | Tailored Labs Blog`,
    description: post.metaDescription || post.excerpt,
    keywords: post.seoKeywords || post.tags.join(', '),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      url: `https://tailoredlabsai.com/blog/${slug}`,
      siteName: 'Tailored Labs',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      creator: '@tailoredlabsai',
    },
    alternates: {
      canonical: `https://tailoredlabsai.com/blog/${slug}`,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || !post.published) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, 2);

  return (
    <BlogPostClient 
      post={post} 
      relatedPosts={relatedPosts} 
    />
  );
}