export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400">Loading editor...</p>
        <p className="text-gray-500 text-sm">Setting up your video timeline</p>
      </div>
    </div>
  );
}