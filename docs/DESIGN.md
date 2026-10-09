# Theme Name: Diplahan Operations
# Vibe & Description: A desktop-first emergency operations interface with a burgundy navigation rail, bright work surfaces, compact status colors, and information arranged for quick scanning.

# Color
""- Primary Background: #FAFAFA;
- Secondary Background / Cards: #FFFFFF.
- Primary Text: #22252B.
- Secondary Text: #626873.
- Border: #DDE0E5 (1px).
- Signal Color: #80192D burgundy, with distinct red, amber, and green severity states.

# Font
- Heading & Body: Montserrat (url: https://resource-static.bj.bcebos.com/fonts/Montserrat-VariableFont_wght.woff2)
# Animation
## Elemental animation
- The animation is minimalist and linear. Elements slide into place along the grid lines;
##Entrance animation
- There is no bouncing or elasticity effect; the page scrolls naturally like a document with an ease-out effect.
## Transition animation
- Use a fade-in or slight shift when loading content;
## Animation implementation
- The project integrates the tailwindcss-intersect plugin, which allows you to achieve animation effects when elements enter the viewport in a manner similar to the following:
opacity-0 intersect:opacity-100 transition duration-700
-Animations can also be achieved using motion/react.

# Layout
- Content is organized into clear modules. Ample white space is used to distinguish different sections.
- Prefers left-aligned text and structured image layouts, avoiding decorative misalignments.

# Elements
- Prefers minimalist linear charts with uniform stroke thickness and no fill.
- Shadow ≈ 0, border ≤ 1px, minimizes the button's visual impact; main button ≠ large color block, emphasizes text more.

## GIS and Location Services
- OpenStreetMap tiles are the free default web basemap and require visible attribution.
- Browser Geolocation API provides device location; production deployments must use HTTPS and request permission.
- QGIS projects can be published through QGIS Server WMS and overlaid by setting `VITE_QGIS_WMS_URL` and `VITE_QGIS_WMS_LAYERS`.
- The local Diplahan municipal outline is simplified geoBoundaries ADM3 data sourced from NAMRIA, PSA, and OCHA Philippines under CC BY 3.0 IGO. It is a municipality boundary, not barangay divisions.
- The resident map requests alternatives from the public OSRM demo router and filters out routes within 120 meters of active, reported landslide points. Reports are not verified road closures, and public routing services are not a production availability guarantee; staff must confirm conditions before dispatch.