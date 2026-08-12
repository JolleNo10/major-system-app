import type { ReactNode } from 'react'

export interface GeographyBreadcrumbItem {
  label: ReactNode
  onSelect?: () => void
  current?: boolean
}

export function GeographyBreadcrumbs({
  items,
}: {
  items: readonly GeographyBreadcrumbItem[]
}) {
  return (
    <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden="true" className="text-zinc-700">/</span>}
            {item.onSelect ? (
              <button type="button" onClick={item.onSelect} className="text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                {item.label}
              </button>
            ) : (
              <span aria-current={item.current ? 'page' : undefined} className={item.current ? 'text-cyan-300' : 'text-zinc-500'}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
