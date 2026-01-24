import { defaultSkipLinks, type SkipLink } from '@/lib/accessibility'

// ============================================================================
// SKIP LINKS COMPONENT
// Provides keyboard-accessible skip links for screen reader users
// ============================================================================

interface SkipLinksProps {
  /** Custom skip links (uses defaults if not provided) */
  links?: SkipLink[]
}

/**
 * SkipLinks - Accessible skip links for keyboard navigation
 * Hidden by default, visible on focus
 * 
 * @example
 * // In App.tsx or layout
 * <SkipLinks />
 * 
 * // Then add id attributes to target elements:
 * <main id="main-content">...</main>
 * <nav id="main-navigation">...</nav>
 * <input id="search" />
 */
export function SkipLinks({ links = defaultSkipLinks }: SkipLinksProps) {
  return (
    <div className="skip-links">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="
            sr-only focus:not-sr-only
            focus:absolute focus:top-4 focus:left-4 focus:z-9999
            focus:px-4 focus:py-2
            focus:bg-primary focus:text-primary-foreground
            focus:rounded-md focus:shadow-lg
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            text-sm font-medium
          "
          onClick={(e) => {
            const target = document.getElementById(link.id)
            if (target) {
              e.preventDefault()
              target.focus()
              target.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default SkipLinks
