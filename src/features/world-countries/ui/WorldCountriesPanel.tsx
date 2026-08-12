import type { HTMLAttributes, ReactNode } from 'react'

type PanelElement = 'section' | 'article'

export interface WorldCountriesPanelProps {
  as?: PanelElement
  children: ReactNode
  className?: string
  id?: string
  'aria-label'?: HTMLAttributes<HTMLElement>['aria-label']
  'aria-labelledby'?: HTMLAttributes<HTMLElement>['aria-labelledby']
  'aria-disabled'?: HTMLAttributes<HTMLElement>['aria-disabled']
}

/** Canonical contained World Countries surface, including standard rail panels. */
export function WorldCountriesPanel({
  as = 'section',
  children,
  className,
  ...attributes
}: WorldCountriesPanelProps) {
  const panelClassName = ['rounded-xl border border-zinc-800 bg-zinc-900 p-4', className]
    .filter(Boolean)
    .join(' ')
  const Element = as

  return (
    <Element {...attributes} className={panelClassName}>
      {children}
    </Element>
  )
}
