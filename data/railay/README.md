# Railay geographical source data

Retrieved 27 October 2026 from the OpenStreetMap API:

`https://api.openstreetmap.org/api/0.6/map?bbox=98.825,7.998,98.853,8.026`

`osm-natural-features.json` retains only natural-feature ways and relevant cave/viewpoint/peak nodes, with source IDs and way versions. Coordinates are WGS84 longitude, latitude. Complete ways extend beyond the requested bounds. No buildings, roads, resorts, infrastructure, satellite imagery or map tiles are imported.

© OpenStreetMap contributors. Database rights: [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/), [attribution](https://www.openstreetmap.org/copyright). This directory and the OSM-derived geography/elevation grid in `src/game/railay` constitute the openly available derived geographical database. The original environment code/art retains the repository's MIT terms. OSM sources may themselves have imagery tags; this project imports the contributed OSM vectors, never the referenced imagery.

Regenerate from a saved raw OSM XML response at repository root:

```sh
python data/railay/extract-osm.py /path/to/source.osm
cd artifacts/survivor-camp-prototype
node --import tsx scripts/bake-railay.mjs
```

The extractor joins coastline ways by exact shared node IDs, retains their vertices, and closes the mainland well north of the playable extent. That closure is an extraction boundary, not a claimed shoreline. Offshore polygons are retained only where mapped south of the peninsula. Small rocks below the grid scale are visual context. Authored karst footprints, vegetation zones, trails and elevations live separately in `geography.ts` / `terrain.ts`.

Coordinate conversion: origin **98.838° E, 8.011° N**, sphere radius **6,371,008.8 m**. X = (longitude − origin longitude) × radians × radius × cos(origin latitude); Z = (origin latitude − latitude) × radians × radius. Y is metres above the nominal game water datum. No arbitrary scene scaling; 1 unit = 1 metre.

Playable extraction: X/Z **−2100 to +1500 m**, 6 m height samples, 300 m rendering chunks. The fixed coordinate origin is independent of rendering LOD. A coarse, explicitly authored far mainland backdrop continues north of the gameplay boundary and is not GIS-certified terrain.
