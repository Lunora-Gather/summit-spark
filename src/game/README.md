# game

Target home for room data, progression, player state, and gameplay-domain boundaries.

The first safe extraction target is room/training data, not physics:

- room maps
- room names and target times
- skill tags and labels
- room guides, purposes, and route lines
- Style and Expert contracts
- Route contract definitions
- Feel replay fixture metadata

Before moving any data here, keep `tools/check-data-contracts.js` passing. After moving data, update the checks to prefer the new data source and keep the old runtime behavior unchanged.

Do not move collision, dash, wall, crumble, prism, wind, or relay behavior here until data extraction has landed cleanly.
