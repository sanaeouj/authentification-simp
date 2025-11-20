/**
 * Génère une couleur cohérente basée sur un hash d'une chaîne
 * Utilisé pour les avatars avec initiales
 */
export function getColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    'from-[#3B82F6] to-[#2563EB]', // Blue
    'from-[#8B5CF6] to-[#7C3AED]', // Violet
    'from-[#10B981] to-[#059669]', // Green
    'from-[#F59E0B] to-[#D97706]', // Orange
    'from-[#EF4444] to-[#DC2626]', // Red
    'from-[#06B6D4] to-[#0891B2]', // Cyan
    'from-[#EC4899] to-[#DB2777]', // Pink
    'from-[#6366F1] to-[#4F46E5]', // Indigo
  ]

  return colors[Math.abs(hash) % colors.length]
}









