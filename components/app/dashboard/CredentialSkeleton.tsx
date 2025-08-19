export default function CredentialSkeleton() {
  return (
    <div className="rounded-2xl overflow-visible mb-3 backdrop-blur-md border border-[rgba(191,174,153,0.3)] shadow-sm bg-white/55 dark:bg-[rgba(141,103,72,0.14)] dark:border-none dark:shadow-none animate-pulse">
      <div className="flex items-center px-4 py-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
        
        <div className="flex-1 ml-4 min-w-0">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          
          <div className="flex sm:hidden items-center gap-2">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}