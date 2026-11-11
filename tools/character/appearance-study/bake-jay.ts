// Run from the pinned Ara checkout with this file under its scripts directory.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { AssetLibrary } from '../src/core/assets';
import { garmentById } from '../src/core/garments';
import { cm, REGION } from '../src/core/garments/body';
import { cloth, isTrunk, shellPart } from '../src/core/garments/kit';
import { buildHuman } from '../src/core/human';
import { DEFAULT_PARAMS, yearsToAge, type HumanParams } from '../src/core/params';
import { exportCharacter } from '../src/export';

const output = resolve(process.argv[2]);
const cache = resolve(output, 'ara-assets');
const curl = promisify(execFile);
const library = await new AssetLibrary({
  read: async path => {
    const destination = resolve(cache, path);
    try {
      return new Uint8Array(await readFile(destination));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const url = new URL(path, 'https://ara3dgen.com/assets/').href;
    const { stdout } = await curl('curl', ['-fLsS', '--retry', '1', '--max-time', '32', url], {
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
    });
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, stdout);
    return new Uint8Array(stdout);
  },
}).init();

garmentById.set('jay_boardshorts', {
  id: 'jay_boardshorts',
  label: 'Boardshorts',
  slot: 'bottom',
  patterns: ['solid'],
  color: '#64646a',
  color2: '#606369',
  build: (geometry, style) => shellPart(geometry, {
    covers: vertex => (isTrunk(vertex) && vertex.t < .22)
      || (vertex.region === REGION.upperleg && vertex.t < .78),
    offset: vertex => cm(.92 + (vertex.region === REGION.upperleg ? .88 * vertex.t : 0)),
    tile: .26,
    relax: 5,
  }, cloth(geometry, 'Boardshorts', style)).map(part => ({ ...part, hides: undefined })),
});

const appearance: HumanParams = {
  ...DEFAULT_PARAMS,
  name: 'Survivor_2',
  seed: 2,
  gender: 1,
  age: yearsToAge(27),
  muscle: .63,
  weight: .38,
  height: .51,
  proportions: .86,
  caucasian: .64,
  african: .18,
  asian: .18,
  skin: 'young_caucasian_male2',
  skinTint: '#e2ba96',
  eyes: 'brown',
  eyebrows: 'eyebrow005',
  eyelashes: 'none',
  hair: 'ponytail01',
  hairTint: '#897162',
  outfit: 'none',
  top: 'none',
  bottom: 'jay_boardshorts',
  underwear: false,
  shoes: 'none',
  detail: 'medium',
  faceBones: false,
  rig: 'game',
  facialHair: 'none',
  faceShapes: false,
  speechShapes: false,
  modifiers: {},
  expression: 'neutral',
  animations: false,
  garmentStyles: { jay_boardshorts: { pattern: 'solid', color: '#646872' } },
};

const character = await buildHuman(library, appearance);
const asset = await exportCharacter(library, character, 'glb');
await writeFile(resolve(output, 'jay-foundation.glb'), asset.data);
console.log(character.height, character.rig?.bones.length, character.mesh.materials.map(material => material.name));
