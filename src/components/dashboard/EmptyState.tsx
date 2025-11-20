import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description: string
  illustration?: React.ReactNode
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export default function EmptyState({
  title,
  description,
  illustration,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-8">
      {illustration && (
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-[#3B82F6]/10 mb-6">
          {illustration}
        </div>
      )}
      <h3 className="text-xl font-bold text-[#111827] mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto">{description}</p>
      {action && (
        <div>
          {action.href ? (
            <Link href={action.href}>
              <Button size="lg">{action.label}</Button>
            </Link>
          ) : (
            <Button size="lg" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

