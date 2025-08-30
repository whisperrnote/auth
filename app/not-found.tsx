import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">Page not found</h1>
        <p className="text-gray-600 mb-6">We couldn’t find the page you’re looking for. Try one of the links below.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" passHref>
            <Button variant="ghost">Home</Button>
          </Link>
          <Link href="/dashboard" passHref>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
