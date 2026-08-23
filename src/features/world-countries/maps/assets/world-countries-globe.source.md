# World Countries globe geography provenance

`world-countries-globe.geojson` is a compiled presentation artifact for the
World Countries orthographic overview renderer.

- **Source project:** Natural Earth, Admin 0 – Countries, 1:50m cultural
  vectors, version 5.1.1.
- **Source reference:** [Natural Earth 1:50m cultural vectors](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/)
  and the source GeoJSON in the
  [natural-earth-vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson).
- **Source snapshot checksum:** SHA-256
  `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb` for the
  raw GeoJSON used to compile this artifact.
- **Source status:** Natural Earth vector data is public domain under its
  [terms of use](https://www.naturalearthdata.com/about/terms-of-use/).
- **Transformation:** the published 1:50m geometry is already simplified for
  world/regional display. The source FeatureCollection was filtered to the
  app's 200 canonical Countries, retained as Polygon/MultiPolygon geometry,
  stripped of unrelated source properties, and given immutable runtime
  properties `{ countryId, sourceName, sourceIdentity }`. No runtime fetch,
  simplification, or display-name matching is performed.
- **Runtime artifact:** 200 features, 2,119,971 bytes in this checkout.
- **Canonical mapping exceptions used during compilation:** `Türkiye` →
  `Turkey`; `United States` → `United States of America`; `Czechia` → `Czech
  Republic`; `China` → `People's Republic of China`; `Timor-Leste` → `East
  Timor`; `Micronesia` → `Federated States of Micronesia`; `Cabo Verde` → `Cape
  Verde`; `Gambia` → `The Gambia`; `Côte d'Ivoire` → `Ivory Coast`; and
  `Bahamas` → `The Bahamas`.
- **Source identity exceptions retained in the artifact:** Palestine uses
  `PSX`, Taiwan uses `TWN`, and Kosovo uses `KOS`. These are adapter metadata;
  canonical Country IDs remain feature-owned and unchanged.
