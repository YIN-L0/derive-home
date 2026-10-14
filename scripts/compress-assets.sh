#!/bin/sh
# Shrink every .glb under public/assets for the headset: meshopt geometry, WebP textures (max 2048 px).
# Runs in place; the uncompressed originals stay on the main branch (tag v1-web).
# Meshes are not joined or renamed, because DeriveScene removes the UCX_* collision hulls by name.
set -e
for f in $(find public/assets -name '*.glb'); do
  npx gltf-transform optimize "$f" "$f.tmp.glb" \
    --compress meshopt --texture-compress webp --texture-size 2048 \
    --join false --flatten false --instance false --palette false --simplify false
  mv "$f.tmp.glb" "$f"
done
du -sh public/assets/*
