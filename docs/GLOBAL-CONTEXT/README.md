# AKTERA Context System — How to Use

This folder contains the recommended AKTERA context system for humans and AI assistants.

## Recommended usage

### For a general AI conversation

Start with:

- `AKTERA_CONTEXT_INDEX.md`
- `AKTERA_AI_OPERATING_CONTEXT.md`

Then load only the domain files relevant to the task.

### For product work

Load:

- `AKTERA_PRODUCT.md`
- `AKTERA_CURRENT_STATE.md`
- optionally `AKTERA_VISION.md`

### For coding work

Load:

- `AKTERA_CONTEXT_INDEX.md`
- `AKTERA_AI_OPERATING_CONTEXT.md`
- `AKTERA_CURRENT_STATE.md`
- `AKTERA_TECHNICAL.md`

Then inspect the actual repository.

### For business work

Load:

- `AKTERA_VISION.md`
- `AKTERA_BUSINESS.md`
- `AKTERA_DECISIONS.md`

### For strategic/product decisions

Load:

- `AKTERA_VISION.md`
- `AKTERA_PRODUCT.md`
- `AKTERA_BUSINESS.md`
- `AKTERA_DECISIONS.md`

## Maintenance rule

The most important file to update frequently is:

`AKTERA_CURRENT_STATE.md`

The second most important is:

`AKTERA_DECISIONS.md`

The vision and product-model files should change more slowly.

The technical file should change when architecture or engineering doctrine changes.

The business file should change as customer discovery and market evidence improve.

## Important

Do not paste every file into every AI prompt by default.

Use the index and load context according to the task.

Do not keep passwords, API keys, service credentials, production tokens, or demo credentials in this folder.
