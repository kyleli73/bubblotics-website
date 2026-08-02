# 3D models for the hologram viewer

Put exported `.glb` files here, then point at one from a robot's markdown:

    hologramModel: '/models/voyager.glb'
    hologramCaption: 'Competition assembly as of provincials.'

Note the path starts at `/models/`, with no `public` in it. Files in
`public/` are served exactly as they are, which is what you want for a model:
Astro must not try to process it.

Leave the field out and the hologram section simply does not appear on that
robot's page.

## Keep the file small

**Aim for under 5 MB. Treat 10 MB as a hard ceiling.** Every visitor who
scrolls to that section downloads the whole thing, and plenty of them are on
a phone on venue wifi.

A raw Onshape export of a full robot assembly can easily be 50 MB or more,
because it includes every fastener, every internal gear, and far more
triangles than a web viewer needs. Before exporting:

- Hide fasteners, bearings, and anything buried inside a gearbox. Nobody can
  see them in the viewer, and they can be most of the file.
- Export the top-level assembly, not every part studio.
- Lower the export tessellation quality. "Coarse" or "medium" is plenty at
  the size this renders.

If it is still large after that, run it through
[gltf-transform](https://gltf-transform.dev) or
[gltfpack](https://meshoptimizer.org/gltf/), which routinely cut a model by
80-90% with no visible difference at web scale.

## Naming parts so the subsystem list works

The viewer builds its subsystem buttons from the mesh names in the file, and
groups them by the first word. So parts named

    Intake-Roller-1, Intake-Plate-2, Drivetrain-Wheel-3

produce two buttons: **Intake** and **Drivetrain**.

Parts named `Part1`, `Part2`, `Part3` produce one useless **Part** button. If
you want the isolation feature to be worth anything, name things properly in
Onshape before exporting. That is good practice in the CAD anyway.
