import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog-loader'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  
  const blogPosts = posts.map((post) => ({
    url: `https://tailoredlabs.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://tailoredlabs.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://tailoredlabs.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://tailoredlabs.com/features',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://tailoredlabs.com/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...blogPosts,
  ]
}