# Draco decoder

These two files decompress Draco-compressed geometry in a `.glb`.

Onshape's glTF export uses `KHR_draco_mesh_compression` by default, which is
good (it makes the files far smaller) but means the browser needs this
decoder to read them. Without it the model loads as an empty scene: no
error, just nothing on screen.

They are copied verbatim from `node_modules/three/examples/jsm/libs/draco/gltf/`.
They live in `public/` because the browser fetches them at runtime by URL, and
they are only downloaded when a page actually shows a hologram.

**If you upgrade `three` and models stop loading, re-copy them:**

    cp node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm \
       node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js \
       public/draco/

Do not edit them by hand.
