// app/editor/page.tsx
import EditorPageClient from '../../components/EditorPageClient'

export default function EditorPage({ searchParams }: { searchParams: { project?: string } }) {
  const projectId = searchParams.project ?? null
  return <EditorPageClient projectId={projectId} />
}