# Diagram sources

The README diagrams are generated from these [Archify](https://github.com/tt-a1i/archify) specifications:

| Source | Image |
|---|---|
| `architecture.json` | `../assets/architecture-{light,dark}.png` |
| `wayfinding.json` | `../assets/wayfinding-{light,dark}.png` |
| `install.json` | `../assets/install-{light,dark}.png` |

To regenerate, validate and render each source with Archify (`archify deliver <type> <source>.json <source>.html --quality showcase`), open the HTML, and export the diagram in the light and dark themes at 2x.
