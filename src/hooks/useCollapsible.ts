'use client'

import { useState, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useCollapsible(
  storageKey: string,
  defaultExpanded: boolean = true,
  hideIfEmpty: boolean = false,
  isEmpty: boolean = false
) {
  const [isExpanded, setIsExpanded] = useLocalStorage<boolean>(
    `collapsible_${storageKey}`,
    defaultExpanded
  )

  useEffect(() => {
    if (hideIfEmpty && isEmpty) {
      setIsExpanded(false)
    }
  }, [hideIfEmpty, isEmpty, setIsExpanded])

  const toggle = () => setIsExpanded(!isExpanded)

  const shouldShow = !(hideIfEmpty && isEmpty)

  return {
    isExpanded: shouldShow ? isExpanded : false,
    toggle,
    shouldShow,
  }
}









