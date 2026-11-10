#!/usr/bin/env bash
# Rebuild the two review assets with Blender 4.3.2 and glTF Transform 4.5.1.
set -euo pipefail
if (( $# != 2 )); then
  printf 'Usage: %s <human_base_meshes_bundle.blend> <output-directory>\n' "$0" >&2
  exit 2
fi
here=$(cd -- "$(dirname -- "$0")" && pwd)
root=$(cd -- "$here/../../.." && pwd)
base=$(realpath -- "$1")
output=$(realpath -m -- "$2")
stock="$root/artifacts/survivor-camp-prototype/src/assets/characters/cast"
case "$output/" in
  "$stock/"*) printf 'Choose an output directory outside the production cast.\n' >&2; exit 2 ;;
esac
temp=$(mktemp -d)
trap 'rm -rf -- "$temp"' EXIT
mkdir -p -- "$output"
for id in 10 17; do
  file="survivor-$id.glb"
  "${GLTF_TRANSFORM:-gltf-transform}" dequantize "$stock/$file" "$temp/foundation.glb"
  OPENBLAS_NUM_THREADS=1 "${BLENDER:-blender}" -b -t 2 --python-exit-code 1 \
    --python "$here/author.py" -- "$base" "$temp/foundation.glb" "$temp/authored.glb" "$id"
  "${PYTHON:-python3}" "$here/bind_quantized.py" "$temp/foundation.glb" \
    "$temp/authored.glb" "$temp/bound.glb" "Survivor_$id"
  "${GLTF_TRANSFORM:-gltf-transform}" optimize "$temp/bound.glb" "$output/$file" \
    --compress meshopt --texture-compress webp --texture-size 384 \
    --simplify-ratio .47 --simplify-error .0055 --simplify-lock-border false \
    --join false --instance false --palette false --resample false
done
