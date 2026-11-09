# Quillstone knowledge base (synthetic example)

Quillstone is a fictional data-pipeline library invented for this example. Every module,
design document, and API in this folder is made up; any resemblance to a real project is accidental.

- `modules/`: one note per library module, with `depends_on`, `related`, and `design_docs` edges.
- `design/`: design documents that several modules cite. Two modules that cite the same design
  document are shared-evidence neighbors (two hops apart).

This README has no `id`, so the example config excludes it.
