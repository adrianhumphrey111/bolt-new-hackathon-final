import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog-loader'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  
  const blogPosts = posts.map((post) => ({
    url: `https://tailoredlabsai.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://tailoredlabsai.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://tailoredlabsai.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://tailoredlabsai.com/features',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://tailoredlabsai.com/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...blogPosts,
  ]
}