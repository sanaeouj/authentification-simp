'use client'

import React from 'react'
import { useCollapsible } from '@/hooks/useCollapsible'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface CollapsibleSectionProps {
  title: string
  count?: number
  defaultExpanded?: boolean
  hideIfEmpty?: boolean
  isEmpty?: boolean
  children: React.ReactNode
  className?: string
}

export default function CollapsibleSection({
  title,
  count,
  defaultExpanded = true,
  hideIfEmpty = false,
  isEmpty = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const { isExpanded, toggle, shouldShow } = useCollapsible(
    title.toLowerCase().replace(/\s+/g, '_'),
    defaultExpanded,
    hideIfEmpty,
    isEmpty
  )

  if (!shouldShow) {
    return null
  }

  return (
    <section className={`mb-6 ${className}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#E5E7EB] hover:bg-[#F5F7FA] transition-colors duration-200 group"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="px-2 py-1 text-xs font-bold rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
              {count}
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </section>
  )
}









