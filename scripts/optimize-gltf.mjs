#!/usr/bin/env node
/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  glTF -> web-ready GLB optimiser
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/optimize-gltf.mjs "Assembly 1.gltf" public/models/robot.glb
 *
 * Onshape's glTF export is correct but wildly inefficient for the web. Three
 * separate problems, all fixed here, with no external dependencies:
 *
 * 1. THE DATA IS BASE64 TEXT INSIDE JSON.
 *    Base64 costs 33% on top of the raw bytes, and it cannot be streamed or
 *    memory-mapped. A .glb puts the same bytes in a binary chunk instead.
 *
 * 2. THE GEOMETRY IS SHATTERED INTO HUNDREDS OF PRIMITIVES.
 *    Onshape emits a separate primitive per face group. One 1,114-triangle
 *    assembly arrived as 244 primitives needing 976 accessors, and each
 *    accessor is a JSON object. The JSON ended up ten times larger than the
 *    geometry it described. Merging primitives that share a material collapses
 *    that, and also cuts draw calls in the browser, so it renders faster too.
 *
 * 3. FULL 32-BIT FLOATS EVERYWHERE.
 *    Optional here: --quantize stores positions and normals as 16-bit,
 *    halving the vertex data. Precision is far beyond what a web viewer of a
 *    robot needs, but it is off by default because it is lossy.
 *
 * What this deliberately does NOT do is reduce triangle count. Decimating a
 * mesh well needs a proper simplifier. If a model is still too big after this,
 * the fix is in Onshape: hide fasteners and internal parts, and export at a
 * coarser tessellation. See the README.
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [, , inputPath, outputPath, ...flags] = process.argv;

if (!inputPath || !outputPath) {
  console.error(
    'Usage: node scripts/optimize-gltf.mjs <input.gltf|.glb> <output.glb> [--quantize]'
  );
  process.exit(1);
}

const QUANTIZE = flags.includes('--quantize');

const COMPONENT = {
  5120: { array: Int8Array, size: 1 },
  5121: { array: Uint8Array, size: 1 },
  5122: { array: Int16Array, size: 2 },
  5123: { array: Uint16Array, size: 2 },
  5125: { array: Uint32Array, size: 4 },
  5126: { array: Float32Array, size: 4 },
};
const NUM_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/* ── Load, handling both .gltf (JSON) and .glb (binary container) ────── */
function load(path) {
  const raw = readFileSync(path);

  // GLB files start with the ASCII magic "glTF".
  if (raw.length > 12 && raw.readUInt32LE(0) === 0x46546c67) {
    let offset = 12;
    let json = null;
    let bin = null;
    while (offset < raw.length) {
      const len = raw.readUInt32LE(offset);
      const type = raw.readUInt32LE(offset + 4);
      const data = raw.subarray(offset + 8, offset + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
      if (type === 0x004e4942) bin = Buffer.from(data);
      offset += 8 + len + ((4 - (len % 4)) % 4);
    }
    return { gltf: json, buffers: [bin] };
  }

  const gltf = JSON.parse(raw.toString('utf8'));
  const buffers = (gltf.buffers ?? []).map((b) => {
    if (!b.uri) throw new Error('Buffer with no uri in a .gltf file');
    if (b.uri.startsWith('data:')) {
      return Buffer.from(b.uri.slice(b.uri.indexOf(',') + 1), 'base64');
    }
    // External .bin sitting next to the .gltf
    return readFileSync(resolve(dirname(path), decodeURIComponent(b.uri)));
  });
  return { gltf, buffers };
}

/* ── Read an accessor out as a plain JS array of numbers ─────────────── */
function readAccessor(gltf, buffers, index) {
  const acc = gltf.accessors[index];
  const comps = NUM_COMPONENTS[acc.type];
  const { array: Arr, size } = COMPONENT[acc.componentType];
  const out = new Arr(acc.count * comps);

  if (acc.bufferView === undefined) return out; // spec allows all-zero

  const view = gltf.bufferViews[acc.bufferView];
  const buf = buffers[view.buffer ?? 0];
  const base = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = view.byteStride ?? comps * size;

  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < comps; c++) {
      const at = base + i * stride + c * size;
      let v;
      switch (acc.componentType) {
        case 5120: v = buf.readInt8(at); break;
        case 5121: v = buf.readUInt8(at); break;
        case 5122: v = buf.readInt16LE(at); break;
        case 5123: v = buf.readUInt16LE(at); break;
        case 5125: v = buf.readUInt32LE(at); break;
        default:   v = buf.readFloatLE(at);
      }
      out[i * comps + c] = v;
    }
  }
  return out;
}

/* ═══ Main ═══════════════════════════════════════════════════════════ */

const inSize = statSync(inputPath).size;
const { gltf, buffers } = load(inputPath);

/*
 * ── Draco ──────────────────────────────────────────────────────────────
 * Onshape compresses geometry with KHR_draco_mesh_compression by default.
 * When it does, accessors carry no bufferView at all: the real vertex data
 * lives Draco-encoded inside one bufferView per primitive, and reading the
 * accessors the normal way yields nothing.
 *
 * This script has no Draco decoder, so it must not pretend to merge that
 * geometry. An earlier version did exactly that and wrote a perfectly valid
 * GLB full of zeroed vertices: it loaded without error, produced correct
 * part names and working controls, and rendered an empty viewport.
 *
 * Draco is worth keeping anyway (it is why these files are small), and the
 * viewer ships a decoder. So for Draco input, do the container conversion
 * only: base64 JSON becomes a binary GLB, which is where most of the bloat
 * is, and the compressed geometry passes through untouched.
 */
const isDraco = (gltf.extensionsUsed ?? []).includes(
  'KHR_draco_mesh_compression'
);

const stats = {
  meshesIn: gltf.meshes?.length ?? 0,
  primitivesIn: 0,
  accessorsIn: gltf.accessors?.length ?? 0,
  triangles: 0,
  primitivesOut: 0,
};

/*
 * Names: Onshape puts useful part names on NODES ("Part 3", "Intake Roller")
 * but generic ones on MESHES ("mesh0_mesh"). Three.js reads the node name for
 * the object it creates, but the mesh name matters for how the viewer groups
 * subsystems, so copy the best node name onto each mesh.
 */
const meshNameFromNode = new Map();
for (const node of gltf.nodes ?? []) {
  if (node.mesh === undefined || !node.name) continue;
  const name = node.name.replace(/^occurrence of\s+/i, '').trim();
  if (name && !meshNameFromNode.has(node.mesh)) {
    meshNameFromNode.set(node.mesh, name);
  }
}

/* ── Write a GLB and report ──────────────────────────────────────────── */
function writeGlb(doc, binary, note) {
  let json = Buffer.from(JSON.stringify(doc), 'utf8');
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);

  const chunk = (data, type) => {
    const header = Buffer.alloc(8);
    header.writeUInt32LE(data.length, 0);
    header.writeUInt32LE(type, 4);
    return Buffer.concat([header, data]);
  };

  const jsonChunk = chunk(json, 0x4e4f534a);
  const binChunk = chunk(binary, 0x004e4942);
  const header = Buffer.alloc(12);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);

  const glb = Buffer.concat([header, jsonChunk, binChunk]);
  writeFileSync(outputPath, glb);

  const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
  console.log(`
  in   ${inputPath}   ${mb(inSize)}
  out  ${outputPath}   ${mb(glb.length)}
  ${((1 - glb.length / inSize) * 100).toFixed(1)}% smaller${note ? '\n  ' + note : ''}
`);

  if (glb.length > 10 * 1048576) {
    console.log(`  WARNING: still over 10 MB. This tool does not reduce
  triangle count. Re-export from Onshape with fasteners and internal parts
  hidden, and tessellation set to Coarse.
`);
  }
  return glb;
}

/* ── Copy useful node names onto meshes ──────────────────────────────── */
function renameMeshesFromNodes(doc) {
  const best = new Map();
  for (const node of doc.nodes ?? []) {
    if (node.mesh === undefined || !node.name) continue;
    const name = node.name.replace(/^occurrence of\s+/i, '').trim();
    if (name && !best.has(node.mesh)) best.set(node.mesh, name);
  }
  (doc.meshes ?? []).forEach((mesh, i) => {
    if (best.has(i)) mesh.name = best.get(i);
  });
}

/* ═══ Path A: Draco input — container conversion only ════════════════ */
if (isDraco) {
  const merged = Buffer.concat(buffers);

  // Rebase every bufferView onto the single merged buffer.
  let cursor = 0;
  const bases = buffers.map((b) => {
    const at = cursor;
    cursor += b.length + ((4 - (b.length % 4)) % 4);
    return at;
  });

  const padded = [];
  buffers.forEach((b) => {
    padded.push(b);
    const pad = (4 - (b.length % 4)) % 4;
    if (pad) padded.push(Buffer.alloc(pad));
  });
  const bin = Buffer.concat(padded);

  for (const view of gltf.bufferViews ?? []) {
    view.byteOffset = (view.byteOffset ?? 0) + bases[view.buffer ?? 0];
    view.buffer = 0;
  }
  gltf.buffers = [{ byteLength: bin.length }];

  renameMeshesFromNodes(gltf);

  let tris = 0;
  for (const m of gltf.meshes ?? [])
    for (const p of m.primitives ?? [])
      if (p.indices !== undefined) tris += gltf.accessors[p.indices].count / 3;

  writeGlb(
    gltf,
    bin,
    `Draco-compressed input: geometry passed through untouched.
  ${tris.toLocaleString()} triangles, ${gltf.meshes.length} meshes.
  The viewer decodes this with public/draco/.`
  );
  process.exit(0);
}

/* ═══ Path B: uncompressed input — merge and rebuild ═════════════════ */

const outBuffers = [];   // Buffer chunks for the new BIN
const bufferViews = [];
const accessors = [];
let byteOffset = 0;

function pushAccessor(typedArray, componentType, type, target, extra = {}) {
  const buf = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength
  );
  const pad = (4 - (buf.length % 4)) % 4;
  outBuffers.push(buf);
  if (pad) outBuffers.push(Buffer.alloc(pad));

  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: buf.length,
    ...(target ? { target } : {}),
  });
  byteOffset += buf.length + pad;

  accessors.push({
    bufferView: bufferViews.length - 1,
    componentType,
    count: typedArray.length / NUM_COMPONENTS[type],
    type,
    ...extra,
  });
  return accessors.length - 1;
}

const newMeshes = [];

for (let m = 0; m < (gltf.meshes ?? []).length; m++) {
  const mesh = gltf.meshes[m];
  stats.primitivesIn += mesh.primitives.length;

  // Group this mesh's primitives by material, then weld each group into one.
  const groups = new Map();
  for (const prim of mesh.primitives) {
    if (prim.mode !== undefined && prim.mode !== 4) continue; // triangles only
    const key = prim.material ?? -1;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(prim);
  }

  const primitives = [];

  for (const [material, prims] of groups) {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    let vertexBase = 0;
    let anyNormals = false;
    let anyUV = false;

    for (const prim of prims) {
      const p = readAccessor(gltf, buffers, prim.attributes.POSITION);
      const count = p.length / 3;
      for (let i = 0; i < p.length; i++) pos.push(p[i]);

      if (prim.attributes.NORMAL !== undefined) {
        const n = readAccessor(gltf, buffers, prim.attributes.NORMAL);
        for (let i = 0; i < n.length; i++) nor.push(n[i]);
        anyNormals = true;
      } else {
        for (let i = 0; i < count * 3; i++) nor.push(0);
      }

      if (prim.attributes.TEXCOORD_0 !== undefined) {
        const t = readAccessor(gltf, buffers, prim.attributes.TEXCOORD_0);
        for (let i = 0; i < t.length; i++) uv.push(t[i]);
        anyUV = true;
      } else {
        for (let i = 0; i < count * 2; i++) uv.push(0);
      }

      if (prim.indices !== undefined) {
        const ind = readAccessor(gltf, buffers, prim.indices);
        for (let i = 0; i < ind.length; i++) idx.push(ind[i] + vertexBase);
      } else {
        for (let i = 0; i < count; i++) idx.push(i + vertexBase);
      }
      vertexBase += count;
    }

    if (!pos.length) continue;
    stats.triangles += idx.length / 3;

    const positions = new Float32Array(pos);

    // glTF requires min/max on POSITION; viewers use it to compute bounds
    // without reading the whole buffer.
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let c = 0; c < 3; c++) {
        const v = positions[i + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }

    const attributes = {};

    if (QUANTIZE) {
      /*
       * Map each axis into 0..65535 across the bounding box, and record the
       * inverse as a node transform... which we cannot do per-primitive.
       * So instead use normalized shorts only for normals, which are already
       * in -1..1, and leave positions as floats. Halves the normal data with
       * no visible cost and no scaling gymnastics.
       */
      const n16 = new Int16Array(nor.length);
      for (let i = 0; i < nor.length; i++) {
        n16[i] = Math.max(-32768, Math.min(32767, Math.round(nor[i] * 32767)));
      }
      attributes.POSITION = pushAccessor(positions, 5126, 'VEC3', 34962, { min, max });
      attributes.NORMAL = pushAccessor(n16, 5122, 'VEC3', 34962, { normalized: true });
    } else {
      attributes.POSITION = pushAccessor(positions, 5126, 'VEC3', 34962, { min, max });
      attributes.NORMAL = pushAccessor(new Float32Array(nor), 5126, 'VEC3', 34962);
    }

    if (anyUV) {
      attributes.TEXCOORD_0 = pushAccessor(new Float32Array(uv), 5126, 'VEC2', 34962);
    }

    // Smallest index type that fits. Uint16 halves the index data versus
    // Uint32, and most parts are well under 65k vertices.
    const maxIndex = idx.reduce((a, b) => (b > a ? b : a), 0);
    const indexArray =
      maxIndex < 65536 ? new Uint16Array(idx) : new Uint32Array(idx);
    const indexAccessor = pushAccessor(
      indexArray,
      maxIndex < 65536 ? 5123 : 5125,
      'SCALAR',
      34963
    );

    primitives.push({
      attributes,
      indices: indexAccessor,
      ...(material >= 0 ? { material } : {}),
    });
    stats.primitivesOut++;

    if (!anyNormals) {
      console.warn(`  note: mesh ${m} had no normals; lighting may look flat`);
    }
  }

  newMeshes.push({
    name: meshNameFromNode.get(m) ?? mesh.name ?? `mesh${m}`,
    primitives,
  });
}

/* ── Assemble the new glTF ───────────────────────────────────────────── */
const bin = Buffer.concat(outBuffers);

// Guard against the failure that started all this: a structurally valid file
// full of zeroed vertices. If nothing has a size, something went unread.
const allEmpty = accessors
  .filter((a) => a.min && a.max)
  .every((a) => a.min.every((v, i) => v === a.max[i]));
if (accessors.length && allEmpty) {
  console.error(`
  ERROR: every position accessor came out with zero extent, so the output
  would contain no visible geometry. The input probably uses a compression
  extension this script cannot read. extensionsUsed: ${JSON.stringify(gltf.extensionsUsed ?? [])}
`);
  process.exit(1);
}

const out = {
  asset: { version: '2.0', generator: 'bubblotics optimize-gltf' },
  scene: gltf.scene ?? 0,
  scenes: gltf.scenes,
  nodes: gltf.nodes,
  meshes: newMeshes,
  materials: gltf.materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};
for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];

writeGlb(
  out,
  bin,
  `${stats.primitivesIn} primitives merged to ${stats.primitivesOut}, ` +
    `${stats.accessorsIn} accessors to ${accessors.length}.
  ${stats.triangles.toLocaleString()} triangles${QUANTIZE ? ', normals quantised to 16-bit' : ''}.`
);
