import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/client",
    // Keep the hand-maintained compatibility exports in custom.ts.
    clean: false,
  },
  plugins: [
    "legacy/axios",
    {
      name: "@hey-api/sdk",
      // NOTE: this doesn't allow tree-shaking
      asClass: true,
      operationId: true,
      classNameBuilder: "{{name}}Service",
      methodNameBuilder: (operation) => {
        // @ts-expect-error
        const summary: string = operation.summary || ""
        const words = summary.split(/[^A-Za-z0-9]+/).filter(Boolean)
        if (words.length > 0) {
          return words
            .map((word, index) =>
              index === 0
                ? word.charAt(0).toLowerCase() + word.slice(1)
                : word.charAt(0).toUpperCase() + word.slice(1),
            )
            .join("")
        }
        // @ts-expect-error
        const id: string = operation.id || "operation"
        return id.charAt(0).toLowerCase() + id.slice(1)
      },
    },
    {
      name: "@hey-api/schemas",
      type: "json",
    },
  ],
})
