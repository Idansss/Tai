# Garment mockup research and asset record

Date: 2026-07-16

## Decision

Use a shared, layered 2D garment renderer for storefront previews. It combines a custom SVG
garment base, independent colour fill, clipped artwork, fabric grain, seams, folds, highlights,
shadows, and an ambient contact shadow. This keeps list previews lightweight and gives Product,
Design Studio, cart, and saved designs the same geometry and placement model.

A WebGL/3D implementation was rejected for this phase. Three.js can provide bump, normal,
ambient-occlusion, and displacement maps, but it also requires a properly licensed garment mesh,
UVs, material maps, lighting, lifecycle management, and a materially larger client payload. That
cost is not justified while the catalogue has no production garment scan/model assets. A strong
2D system is more consistent and maintainable than a weak generic 3D shirt.

## References reviewed

1. [Printful Design Maker](https://help.printful.com/hc/en-us/articles/360014067779-How-does-the-Design-Maker-work) — product-specific print areas, print-quality warnings, reusable templates, and separate 3D/mockup preview modes.
2. [Printful Custom Mockup Maker](https://www.printful.com/custom-mockup-maker) — consistent brand backgrounds and basic/custom mockup separation.
3. [Printful Mockup Generator](https://www.printful.com/ca/mockup-generator) — background control and realistic product-category output.
4. [Printify Product Creator](https://printify.com/product-creator/) — instant realistic preview, placement/scale controls, and variant context.
5. [Printify Product Creator guide](https://help.printify.com/hc/en-us/articles/4483617169809-How-do-I-use-the-Product-Creator) — colour variants, RGB/CMYK preview modes, and custom backgrounds.
6. [Printify apparel mockups](https://printify.com/mockup-generator/) — consistent front/back, flat-lay, hanging, and detail views.
7. [Gelato Mockup Studio](https://support.gelato.com/en/articles/8996338-how-do-i-use-the-mockup-studio-tool) — real-time layer preview, reusable projects, sizing, and scene control.
8. [Gelato Personalization Studio](https://support.gelato.com/en/articles/8996331-what-is-gelato-s-personalization-studio) — customer-facing live personalization previews.
9. [MDN SVG displacement maps](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap) — broadly available procedural distortion primitive.
10. [MDN SVG filter effects](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Filter_effects) — composable blur, lighting, and texture primitives.
11. [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) — 3D bump, AO, normal, and displacement-map requirements considered in the comparison.
12. [Three.js Texture](https://threejs.org/docs/pages/Texture.html) — texture colour-space, sharpness, and resource-lifecycle constraints.
13. [Fabric.js core concepts](https://fabricjs.com/docs/core-concepts/) — canvas image filters, gradients, shadows, and interaction model considered for an editor-oriented alternative.

## Production assets and licences

No external image, model, texture, or third-party mockup asset is shipped. The garment paths,
folds, seams, masks, gradients, texture, and shadows are original project code. The references
above are research only, so there is no asset attribution or commercial-use licence dependency.

### Approved photographic bases and supplied artwork

The storefront also ships two custom-created blank black Classic T-shirt bases under
`public/garments/classic-tee/{front,back}/base-black.png`. They were created specifically for this
project from the user-approved mockup direction; no stock photograph or third-party garment asset
is embedded. The 15 distinct “From Africa, to You” artwork files were supplied directly by the
project owner on 2026-07-16. Supplied images 7 and 11 were identical, so only one `cultural-soul`
catalogue asset is stored. Artwork pixels are composited without AI redrawing and remain separate
from the garment base.

## Follow-up for production photography

Replace or augment the procedural template when the studio supplies colour-calibrated front/back
photography or scans for each approved garment. Preserve the shared component API and template
coordinates so saved configurations and cart snapshots remain compatible.
