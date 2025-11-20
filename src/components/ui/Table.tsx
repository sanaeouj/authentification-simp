import React from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
  variant?: 'default' | 'bordered' | 'striped'
  size?: 'sm' | 'md' | 'lg'
}

export function Table({ 
  children, 
  variant = 'default', 
  size = 'md',
  className,
  ...props 
}: TableProps) {
  const variantStyles = {
    default: '',
    bordered: 'border-collapse',
    striped: '',
  }

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table
        className={cn(
          'w-full',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

export function TableHeader({ children, className, ...props }: TableHeaderProps) {
  return (
      <thead
        className={cn(
          'bg-slate-50 border-b border-slate-200',
          className
        )}
        {...props}
      >
        {children}
      </thead>
    )
  }

  interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode
  }

  export function TableBody({ children, className, ...props }: TableBodyProps) {
    return (
      <tbody
        className={cn(
          'divide-y divide-slate-200',
          className
        )}
        {...props}
      >
        {children}
      </tbody>
    )
  }

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
  hover?: boolean
  clickable?: boolean
}

export function TableRow({ 
  children, 
  hover = true, 
  clickable = false,
  className,
  ...props 
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        hover && 'hover:bg-slate-50',
        clickable && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

export function TableHead({ children, className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-black uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

export function TableCell({ children, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-black',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

