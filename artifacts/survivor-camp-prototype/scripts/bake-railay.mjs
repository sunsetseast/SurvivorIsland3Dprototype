// Run from the application: node --import tsx scripts/bake-railay.mjs
import {writeFileSync} from 'node:fs';
import {GRID,SIZE,naturalHeight} from '../src/game/railay/terrain.ts';
import {COAST,inside,edgeDistance} from '../src/game/railay/geography.ts';
const height=[],shore=[];
for(let j=0;j<SIZE;j++)for(let i=0;i<SIZE;i++){
 const x=GRID.min+i*GRID.step,z=GRID.min+j*GRID.step;
 height.push(Math.round((naturalHeight(x,z)+40)*100));
 shore.push(Math.round(edgeDistance(x,z,COAST)*(inside(x,z,COAST)?1:-1)*10));
}
writeFileSync(new URL('../src/game/railay/height-grid.json',import.meta.url),JSON.stringify({height,shore}));
console.log(`Baked ${SIZE}² samples at ${GRID.step} m. Geographic source: OSM + documented authored elevations.`);
