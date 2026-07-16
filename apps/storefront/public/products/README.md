# Product photos (optional)

Drop a garment/product photo here to override the printed-artwork image on a
product card and product page:

    public/products/<product-slug>.jpg     (.jpg / .png / .webp)

An approved front/back pair can instead use:

    public/products/<product-slug>-front.png
    public/products/<product-slug>-back.png

The product card uses the front image and the product page's view control switches
between both. `market-day-classic-tee` is the first approved pair.

If no file exists, the card shows the artwork printed on that product instead —
so this folder is optional. Product slugs are the product URL ids
(e.g. `midnight-in-lagos-classic-tee`).

Shared photographic garment bases live under `public/garments/<template>/<view>/`.
The renderer composites the original `public/artworks/<slug>` file over the base,
so a new artwork does not require another baked product photograph.
