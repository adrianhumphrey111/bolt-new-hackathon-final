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

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/auth/login');
  }

  // Fetch project details and verify ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (projectError || !project) {
    console.error('Error fetching project:', projectError);
    redirect('/dashboard');
  }

  return (
    <div className="h-screen w-screen">
      {/* Pass project information to the VideoEditor */}
      <VideoEditor projectId={projectId} />
      
      {/* Screen reader only project info */}
      <div className="sr-only">
        Currently editing project: {project.title}
      </div>
    </div>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditorPageProps) {
  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .single();

  return {
    title: project?.title ? `Editing ${project.title}` : 'Video Editor',
    description: 'AI-powered video timeline editor',
  };
}