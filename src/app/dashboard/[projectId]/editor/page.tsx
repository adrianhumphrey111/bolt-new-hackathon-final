import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VideoEditor } from '../../../../components/VideoEditor';

interface EditorPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  // For server-side, we'll just pass the projectId to the client component
  // The client component will handle authentication checks
  
  return (
    <div className="h-screen w-screen">
      {/* Pass project information to the VideoEditor */}
      <VideoEditor projectId={projectId} />
    </div>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditorPageProps) {
  const { projectId } = await params;
  
  return {
    title: 'Video Editor',
    description: 'AI-powered video timeline editor',
  };
}