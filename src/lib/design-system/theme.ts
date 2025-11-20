/**
 * Configuration du thème (clair/sombre)
 */

import { designTokens, darkModeTokens } from './tokens'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  mode: ThemeMode
  colors: typeof designTokens.colors
  spacing: typeof designTokens.spacing
  radius: typeof designTokens.radius
  shadows: typeof designTokens.shadows
  typography: typeof designTokens.typography
  transitions: typeof designTokens.transitions
}

export const lightTheme: ThemeConfig = {
  mode: 'light',
  ...designTokens,
}

export const darkTheme: ThemeConfig = {
  mode: 'dark',
  ...designTokens,
  colors: {
    ...designTokens.colors,
    // Override avec les couleurs du mode sombre si nécessaire
  },
}

export function getTheme(mode: ThemeMode = 'light'): ThemeConfig {
  return mode === 'dark' ? darkTheme : lightTheme
}

