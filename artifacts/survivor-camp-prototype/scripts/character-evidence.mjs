/** Inspection camera only affects the screenshot render. Gameplay keeps its native camera. */
export async function captureCharacter(page, out, name, angle, rootName) {
  const pose = await page.evaluate(({ angle, rootName }) => {
    const q = window.hubQA;
    const { scene, camera } = q.s;
    const root = scene.getObjectByName(rootName);
    const model = root.getObjectByName('skinned-survivor');
    const heading = rootName === 'exploration-player' ? q.io.dbg.face : root.rotation.y;
    const action = model?.parent?.userData.action;
    const low = ['crawl', 'climb'].includes(action ?? root.userData.locomotion?.state);
    const focus = root.getWorldPosition(camera.position.clone());
    focus.y += low ? 0.52 : 0.89;
    const azimuth = heading + angle;
    const distance = low ? 3.2 : 3.55;
    const position = camera.position.clone(), rotation = camera.quaternion.clone();
    camera.position.set(
      focus.x + Math.sin(azimuth) * distance,
      focus.y + (low ? 0.65 : 0.24),
      focus.z + Math.cos(azimuth) * distance,
    );
    camera.lookAt(focus);
    const start = performance.now();
    q.render(scene, camera);
    const renderSubmissionMs = performance.now() - start;
    camera.position.copy(position);
    camera.quaternion.copy(rotation);
    camera.updateMatrixWorld();
    const hand = model?.getObjectByName('LeftHand');
    const toe = model?.getObjectByName('LeftToeBase');
    return {
      action, heading, renderSubmissionMs,
      limbPose: ['LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'].map(
        (bone) => model?.getObjectByName(bone)?.quaternion.toArray(),
      ),
      hand: hand?.getWorldPosition(camera.position.clone()).toArray(),
      toe: toe?.getWorldPosition(camera.position.clone()).toArray(),
      calls: q.s.gl.info.render.calls, triangles: q.s.gl.info.render.triangles,
      ...q.s.gl.info.memory,
    };
  }, { angle, rootName });
  await page.locator('canvas[data-engine]').screenshot({ path: `${out}/character-${name}.jpg`, type: 'jpeg', quality: 86 });
  return pose;
}
