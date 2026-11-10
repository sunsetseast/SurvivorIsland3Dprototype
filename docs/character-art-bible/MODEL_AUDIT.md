# Production model audit

[Start here](README.md) · [Cast matrix](CAST_MATRIX.md) · [Art direction](ART_DIRECTION.md)

## Evidence and scope

The audit starts at `3b37dcd5daf85583eff83a4650c212d1d070efc2`, the merge of PR #34. The runtime registry reads all 18 production GLBs from the cast manifest. All 18 payloads and their primitive and material structures were inspected. Git comparison against merged PR #30 (`350652d948114b06a178a8114cde0159cc850f43`) shows 17 identical GLBs. Ozzy is the sole replacement and uses the PR #32 control. PR #34 added comparison renders and study scripts. Its studies are separate from the shipping GLBs. [Registry](../../artifacts/survivor-camp-prototype/src/game/character/survivorModels.ts) · [Cast manifest](../../artifacts/survivor-camp-prototype/src/game/character/cast.json) · [Production baseline contact sheet](../cast-migration/evidence/cast-contact-sheet.jpg) · [Current Ozzy control, top row](../ozzy-likeness/evidence/studio.jpg)

The contact sheet supplies full-body and face views for IDs 2–18. The newer studio comparisons supply oblique views for Ozzy, Rob, Cirie and Sandra. The audit identifies visible shape, shading and wardrobe issues under those render conditions. Obscured and back-facing details remain open where there is only one view. File statistics describe the asset payload. They are independent of real-device frame rate, texture residency and total scene draw calls.

## All 18 production assets

The last column is the primary correction for review. The linked sheet contains the face, hair, body, costume and accessory checklist. Primitive counts include repeated material slots.

| ID and checklist | Bytes | Triangles | Primitives | Primary correction and finish issue |
| --- | ---: | ---: | ---: | --- |
| 1 · [Ozzy Lusth](characters/01-ozzy-lusth.md) | 489,460 | 22,768 | 13 | Lower and separate the molded curl clumps, preserve the cord kit and rebuild the brow, orbit, cheek and mouth transition. |
| 2 · [Jay Starrett](characters/02-jay-starrett.md) | 437,048 | 9,004 | 12 | Replace the smooth black fringe and teal kit with irregular waves, red pocket tank and forehead Buff. Shape cheek and narrow chin independently. |
| 3 · [Natalie Anderson](characters/03-natalie-anderson.md) | 520,580 | 12,272 | 10 | Widen and strengthen the silhouette, rebuild the face, add highlighted lengths and fit aqua over violet. Replace the neck wrap with the head Buff. |
| 4 · [Boston Rob Mariano](characters/04-boston-rob-mariano.md) | 512,712 | 18,998 | 15 | Use a dark Boston cap with a legible B, reduce coarse beard volume, broaden the middle and add the gold pendant and fitted cargo silhouette. |
| 5 · [Andrea Boehlke](characters/05-andrea-boehlke.md) | 445,056 | 11,156 | 10 | Replace uniform yellow groom surfaces and flat teal tank. Shape swept-back hair, V neckline, denim hems and blue neck Buff. |
| 6 · [Jeremy Collins](characters/06-jeremy-collins.md) | 450,280 | 11,250 | 10 | Shape the upper cheeks and close beard. Replace cobalt cloth and flat red tank with a Bayon Buff and draped short-sleeve tee. Verify right shoulder mark. |
| 7 · [Yul Kwon](characters/07-yul-kwon.md) | 447,800 | 9,838 | 9 | Rebuild lids and long jaw under the upright crop. Replace the stock dark top and blue shorts with pale tank and dark bottoms. |
| 8 · [Kim Spradlin](characters/08-kim-spradlin.md) | 450,380 | 11,152 | 10 | Keep tall limb proportions, separate lightened hair into directional layers and change the solid tank and cargos into the deep-V swim kit. |
| 9 · [Tony Vlachos](characters/09-tony-vlachos.md) | 406,012 | 9,724 | 9 | Shape the shaved scalp and beard shadow, show the left shoulder tattoo, and replace the fatigue pattern with red swim shorts. |
| 10 · [Cirie Fields](characters/10-cirie-fields.md) | 457,660 | 11,360 | 11 | Rebuild fuller torso and limbs, lower the gathered braids and fit the turquoise draped tank with multicolor trim. Replace camo and warm cloth. |
| 11 · [Sandra Diaz-Twine](characters/11-sandra-diaz-twine.md) | 443,780 | 10,340 | 11 | Replace the berry tank and generic blue wrap. Sculpt cheek, jaw and adult fullness and fit the red polo collar, placket and Dakal Buff. |
| 12 · [Kelley Wentworth](characters/12-kelley-wentworth.md) | 472,808 | 11,480 | 11 | Separate strand mass from the flat yellow shape and build the defined chin. Fit aqua and black straps, black shorts and green Ta Keo cloth. |
| 13 · [Parvati Shallow](characters/13-parvati-shallow.md) | 478,392 | 10,368 | 10 | Correct the swept hair and compressed face. Replace the flat teal garment with animal-print halter layers and a purple torso Buff. |
| 14 · [Michele Fitzgerald](characters/14-michele-fitzgerald.md) | 493,688 | 12,240 | 10 | Strengthen the cheek and chin, shape the low bun and change ochre and teal to bright yellow and draping patterned trousers. |
| 15 · [Wendell Holland](characters/15-wendell-holland.md) | 584,952 | 17,134 | 12 | Raise the irregular curl crown, reduce dense beard geometry, and trade the rust and olive stock kit for cobalt and light denim. |
| 16 · [Tyson Apostol](characters/16-tyson-apostol.md) | 473,960 | 11,848 | 10 | Build the longer narrower frame and profile. Replace the generic solid top, loose hair and orange cloth with camo/lime tank, low tie and Galang Buff. |
| 17 · [Carolyn Wiger](characters/17-carolyn-wiger.md) | 487,344 | 12,450 | 11 | Keep loose blonde length and vary root-to-tip shading. Add proven asymmetric tattoo zones, buttoned plum top and tied grid shirt. |
| 18 · [Russell Hantz](characters/18-russell-hantz.md) | 563,164 | 20,580 | 11 | Restore stocky mass, low brow and chin patch. Replace the thick dark beard and forehead band with a pinched fedora and pale field shirt. |

## Repeated visual problems

- **Face construction** · Several heads share a flat eye-to-cheek transition, simple rounded muzzle and similar closed mouth seam. A changed eyebrow or skin tint rarely survives the picker camera without distinct orbital, cheek and jaw anatomy.
- **Body and silhouette** · Repeated torso taper, similarly spaced limbs and the shared tall dark footwear make the cast read as a uniform set. Cut and fit each garment to the intended body. Compare natural shoulder slopes, limb ratios and different kinds of fullness in the same camera.
- **Materials** · Repeated tank, cargo, fatigue, footwear and wrap materials flatten the wardrobe into color changes. Visible skin in the controls often lacks local color and highlight differentiation. Hair can read as polished panels or a solid cap. Large beard meshes add cost and obscure jaw shape. Establish cloth-specific roughness, groom direction and natural face tones before adding texture detail.
- **Identity marks** · A season name in the roster, a Buff color or a painted chest graphic cannot establish the garment itself. Verify logo placement, neckline, pocket shape and each side of visible ink independently.

## Earlier Blender studies

| Study | Retain for future work | Rework before appearance approval |
| --- | --- | --- |
| [Ozzy, PR #31 and PR #32 control](../blender-character-art/evidence/blender-portraits.jpg) | Full topology, skinning, shirtless charcoal kit, cord and lighter stubble. | Crown mass is too tightly cropped and uniformly bright. Improve curls, brow socket transition, jaw and mouth. |
| [Ozzy, PR #33](../ozzy-likeness/evidence/studio.jpg) | Broader lip anatomy and fuller nape. Hair cards improved perimeter softness. | The strips visibly overlap and primary cheek and lid shapes still read generically. Keep candidate separate from the PR #32 production control. |
| [Boston Rob, PR #34](../cast-art-renaissance/evidence/boston-rob.jpg) | Shorter goatee, distinct eyes and a more visible brow under brim. | Wrong red cap and unresolved cap mark. Jaw and cheek remain generic and torso still reads narrow. Change fit, chin, cap material and S22 layers. |
| [Cirie, PR #34](../cast-art-renaissance/evidence/cirie.jpg) | More torso mass, modeled eye and directed scalp groom. | Incised-looking braid channels, high knot, warm wrap and tightly fitted light cover. Replace with the S20 braid and outfit brief, and keep fuller shoulder and thigh volumes. |
| [Sandra, PR #34](../cast-art-renaissance/evidence/sandra.jpg) | Asymmetric cheek and hair experiments and separate lids. | Repeated hair ribbons and light skin finish, generic orbits and incorrect tank and wrap. Build the S40 polo state with matching compact body and gathered hair. |

The three PR #34 studies are unrigged. They can inform sculpt critique, with animation and runtime evidence deferred to the approved production phase. [Prior study notes](../cast-art-renaissance/README.md) · [Ozzy review and validation](../ozzy-likeness/PROGRESS.md)
