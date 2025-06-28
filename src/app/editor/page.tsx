'use client';

import { VideoEditor } from '../../components/VideoEditor';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function EditorPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const initializeEditor = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        setUser(session.user);

        // If a project ID is provided, fetch project details
        if (projectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', session.user.id) // Ensure user owns the project
            .single();

          if (projectError) {
            console.error('Error fetching project:', projectError);
            // Project not found or user doesn't own it, redirect to dashboard
            router.push('/dashboard');
            return;
          }

          setProject(projectData);
        }
      } catch (error) {
        console.error('Error initializing editor:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeEditor();
  }, [projectId, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading editor...</p>
          {projectId && <p className="text-gray-500 text-sm">Project: {projectId}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      {/* Pass project information to the VideoEditor */}
      <VideoEditor projectId={projectId} />
      
      {/* You can add project-specific UI elements here in the future */}
      {project && (
        <div className="sr-only">
          {/* Screen reader only project info */}
          Currently editing project: {project.title}
        </div>
      )}
    </div>
  );
}