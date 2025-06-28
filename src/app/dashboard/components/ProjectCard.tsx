'use client';

import { useState } from 'react';
import { FaVideo, FaTrash, FaEdit, FaPlay } from 'react-icons/fa';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Video {
  id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  videos?: Video[];
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenProject = () => {
    // For now, just open the editor - later we can add project-specific routing
    router.push(`/editor?project=${project.id}`);
  };

  return (
    <div
      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-700 hover:border-gray-600"
      onClick={handleOpenProject}
    >
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1 truncate">
            {project.title}
          </h3>
          {project.description && (
            <p className="text-gray-400 text-sm line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
            title="Delete project"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FaVideo size={12} />
            <span>{project.videos?.length || 0} videos</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            project.status === 'active' 
              ? 'bg-green-600 text-green-100' 
              : 'bg-gray-600 text-gray-100'
          }`}>
            {project.status}
          </span>
        </div>
        <span>Created {formatDate(project.created_at)}</span>
      </div>

      {/* Video Thumbnails */}
      {project.videos && project.videos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Recent Videos:</p>
          <div className="space-y-1">
            {project.videos.slice(0, 3).map((video) => (
              <div
                key={video.id}
                className="flex items-center space-x-2 text-xs text-gray-400"
              >
                <FaVideo size={10} />
                <span className="truncate">{video.original_name}</span>
              </div>
            ))}
            {project.videos.length > 3 && (
              <p className="text-xs text-gray-500">
                +{project.videos.length - 3} more
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded">
          <FaVideo className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No videos yet</p>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2">
          <FaPlay size={12} />
          <span>Open Project</span>
        </button>
      </div>
    </div>
  );
}