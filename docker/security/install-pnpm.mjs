import { createHash } from "node:crypto"
import { writeFile } from "node:fs/promises"

// Registry integrity for the exact reviewed pnpm 11.3.0 artifact.
const expected = "LEA9ZZRScodnKx9wVjQ6H3w2NANqZ/+r/MKz11ldhDdo+HhxSNG1fPeVbJBga70ZKFfDY68Z6W0tDsnsV0HSFQ=="
const response = await fetch("https://registry.npmjs.org/pnpm/-/pnpm-11.3.0.tgz")
if (!response.ok) throw new Error(`pnpm download failed: ${response.status}`)
const body = Buffer.from(await response.arrayBuffer())
if (createHash("sha512").update(body).digest("base64") !== expected) {
  throw new Error("pnpm artifact integrity mismatch")
}
await writeFile("/tmp/pnpm.tgz", body, { flag: "wx" })
