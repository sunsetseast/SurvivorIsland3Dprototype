import { useMemo } from 'react';
import * as THREE from 'three';
import { Flora } from './Flora';
import { BeachProps, CampProps, Fire, Logs, Signs, Trough, Well } from './Camp';
import { Shelter } from './Shelter';
import { Ocean, Sky, SUN_DIR, Terrain } from './Terrain';
import { Player } from './Player';
import { Contestants } from './Contestants';

const TARGET: [number, number, number] = [-6, 0, -30];

export function Scene() {
  const pos = [TARGET[0] + SUN_DIR.x * 70, SUN_DIR.y * 70, TARGET[2] + SUN_DIR.z * 70] as [number, number, number];
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...TARGET); return o; }, []);
  return (
    <>
      <primitive object={target} />
      <color attach="background" args={['#f0d4a2']} />
      <fog attach="fog" args={['#ecd3a4', 40, 150]} />
      <hemisphereLight args={['#c4e4ee', '#c9a06a', 1.5]} />
      <directionalLight position={pos} target={target} intensity={2.4} color="#ffd6a0" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-38} shadow-camera-right={38} shadow-camera-top={38} shadow-camera-bottom={-38}
        shadow-camera-near={10} shadow-camera-far={150} shadow-bias={-0.0006} shadow-normalBias={0.04} />
      <Sky />
      <Terrain />
      <Ocean />
      <Flora />
      <Fire />
      <Logs />
      <CampProps />
      <BeachProps />
      <Well />
      <Trough />
      <Shelter />
      <Signs />
      <Player />
      <Contestants />
    </>
  );
}
