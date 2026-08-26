const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

interface SharedTaskMarkerElements {
  group: SVGGElement
  marker: SVGCircleElement
  ring: SVGCircleElement
}

export interface TaskInteractionMarkerElements extends SharedTaskMarkerElements {
  hit: SVGCircleElement
}

function createSharedTaskMarkerElements(document: Document, countryId: string): SharedTaskMarkerElements {
  const group = document.createElementNS(SVG_NAMESPACE, 'g')
  const marker = document.createElementNS(SVG_NAMESPACE, 'circle')
  const ring = document.createElementNS(SVG_NAMESPACE, 'circle')
  marker.setAttribute('data-svg-map-task-marker', countryId)
  marker.setAttribute('data-svg-map-tiny-marker', countryId)
  marker.setAttribute('pointer-events', 'none')
  ring.setAttribute('data-svg-map-task-ring', countryId)
  ring.setAttribute('data-svg-map-tiny-ring', countryId)
  ring.setAttribute('pointer-events', 'none')
  return { group, marker, ring }
}

export function createTaskInteractionMarkerElements(
  document: Document,
  countryId: string,
  pointId: string,
  origin: 'derived' | 'synthetic',
): TaskInteractionMarkerElements {
  const elements = createSharedTaskMarkerElements(document, countryId)
  const hit = document.createElementNS(SVG_NAMESPACE, 'circle')
  elements.group.setAttribute('data-svg-map-task-interaction-point', pointId)
  elements.group.setAttribute('data-svg-map-tiny-country', countryId)
  elements.group.setAttribute('data-svg-map-task-interaction-source', origin)
  elements.marker.setAttribute('data-svg-map-task-interaction-marker', pointId)
  elements.ring.setAttribute('data-svg-map-task-interaction-ring', pointId)
  hit.setAttribute('data-svg-map-task-hit-target', countryId)
  hit.setAttribute('data-svg-map-task-interaction-hit-target', pointId)
  hit.setAttribute('data-svg-map-tiny-hit-target', countryId)
  hit.setAttribute('fill', 'transparent')
  hit.setAttribute('fill-opacity', '0')
  hit.setAttribute('stroke', 'none')
  hit.setAttribute('pointer-events', 'none')
  elements.group.append(elements.marker, elements.ring, hit)
  return { ...elements, hit }
}

export function createTaskRepresentativeMarkerElements(
  document: Document,
  countryId: string,
): SharedTaskMarkerElements {
  const elements = createSharedTaskMarkerElements(document, countryId)
  elements.group.setAttribute('data-svg-map-task-target', countryId)
  elements.group.setAttribute('data-svg-map-task-representative-target', countryId)
  elements.group.setAttribute('pointer-events', 'none')
  elements.group.append(elements.marker, elements.ring)
  return elements
}
