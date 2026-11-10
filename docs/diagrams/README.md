# Diagram sources

The README diagrams are generated from these [Archify](https://github.com/tt-a1i/archify) specifications:

| Source | Image |
|---|---|
| `architecture.json` | `../assets/architecture-{light,dark}.png` |
| `wayfinding.json` | `../assets/wayfinding-{light,dark}.png` |
| `install.json` | `../assets/install-{light,dark}.png` |

Every node carries a role icon so you can tell at a glance what each point is (notes, generator, cards, table, body files, rules, agent, search):

- `architecture.json` uses `"node_style": "tile"`: each component is a square icon tile with its name and description underneath.
- `wayfinding.json` and `install.json` use `"node_style": "icon"`: each workflow node shows its role icon on the left.
- The `icon` field names one of the bundled [Lucide](https://lucide.dev) icons (ISC License).

These fields come from a local patch of Archify maintained by Woka (2.17.0-dev with icon tiles); upstream Archify does not read them yet and rejects unknown fields. With upstream Archify, delete `node_style` and every `icon` field to get the plain box style.

To regenerate, validate and render each source (`archify deliver <type> <source>.json <source>.html --quality showcase`, where `<type>` is `architecture` or `workflow`), open the HTML, and export the diagram in the light and dark themes at 2x.
