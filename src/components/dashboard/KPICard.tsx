'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

type KPIColor = 'blue' | 'violet' | 'green' | 'orange'

interface KPICardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: KPIColor
  onClick?: () => void
  href?: string
}

const colorGradients: Record<KPIColor, string> = {
  blue: 'from-[#3B82F6] to-[#3B82F6]',
  violet: 'from-[#8B5CF6] to-[#8B5CF6]',
  green: 'from-[#10B981] to-[#10B981]',
  orange: 'from-[#F59E0B] to-[#F59E0B]',
}

export default function KPICard({
  title,
  value,
  description,
  icon,
  color,
  onClick,
  href,
}: KPICardProps) {
  const router = useRouter()
  const gradient = colorGradients[color]

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else if (onClick) {
      onClick()
    }
  }

  const isClickable = !!onClick || !!href

  return (
    <Card
      variant="interactive"
      onClick={isClickable ? handleClick : undefined}
      className="group relative p-6 min-h-[160px] flex flex-col hover:scale-[1.02] transition-transform duration-200"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-200`}></div>
      
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              {title}
            </p>
            <p className="text-4xl font-bold text-[#111827] mb-2 group-hover:scale-105 transition-transform duration-200">
              {value}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {description}
            </p>
          </div>
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
            {icon}
          </div>
        </div>
        
        <div className="mt-auto h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-out`}
            style={{
              width: `${Math.min((value / 10) * 100, 100)}%`,
            }}
          ></div>
        </div>
      </div>
    </Card>
  )
}

