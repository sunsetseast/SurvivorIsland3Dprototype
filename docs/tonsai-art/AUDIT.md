# PR22 visual audit

Base: main / merged PR21 `7b93d544`. Fresh production captures: 12 native Player views plus two labeled inspection views, both quality profiles. The saved baseline build is immutable.

| Priority | Observed shortcoming | Visibility / cost | Correction |
| --- | --- | --- | --- |
| 1 | Southern cliff is connected and shaded correctly but its large lobes still read as rounded procedural forms | Beach, shoreline, distant views; moderate offline cost | Authored fracture sections and broken upper ridge; retain the established body-height envelope and cave |
| 2 | Repeated sand/litter tiles, broad uniform clearing color and dark trail margins | Most gameplay frames; small material cost | Rotated macro-detail sampling, albedo-led edge breakup, readable litter/soil and wet-sand roughness |
| 3 | Ocean normal field exposes a square/noisy repeating pattern and multiple regular foam bands | Most beach views; shader cost can decrease | Directional, warped wave slopes and restrained broken swash; retain sky uniforms and shoreline field |
| 4 | Canopy/juvenile sprays show broad dark planar edges | Camp and trails; offline cost with fixed triangle counts | Twist/cup existing sprays, mirror UVs and balance leaf fill; no extra plants or textures |

Preserve the successful northern/offshore scan shapes, shelter, territory, all trails, candidate IDs, collision/navigation, sky/cloud correction and atmosphere presets. No terrain-height change is needed: the existing height field already has appropriate subtle relief. The main ground defect is surface appearance.

References studied: QT Luong's Railay coast (`thai48237`) and jungle (`thai48270`) photographs, https://www.terragalleria.com/asia/thailand/railay/ ; NASA's Krabi coast https://science.nasa.gov/earth/earth-observatory/thailands-krabi-coast/ ; SIUE's illustrated tower-karst geology https://www.siue.edu/GEOGRAPHY/ONLINE/Gillespie.htm . They show fractured gray/oxide-stained walls, localized overhangs, pale sand with a narrow damp margin, quiet shallow water, and curved layered foliage. Reference images are not bundled or used as textures.
