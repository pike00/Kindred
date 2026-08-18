import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "@hey-api/client-axios",
  input: "./openapi.json",
  output: "./src/client",
  plugins: [
    {
      name: "@hey-api/sdk",
      // NOTE: this doesn't allow tree-shaking
      asClass: true,
      operationId: true,
      response: "body",
      classNameBuilder: "{{name}}Service",
      methodNameBuilder: (operation) => {
        const opStr = String(operation)
        if (opStr.includes("-")) {
          const parts = opStr.split("-")
          const action = parts.slice(1).join("-")
          const camel = action.replace(/_([a-z])/gi, (_, letter) =>
            letter.toUpperCase(),
          )
          if (camel && camel.length > 0) {
            return camel
          }
        }
        return opStr.replace(/_([a-z])/gi, (_, letter) => letter.toUpperCase())
      },
    },
    {
      name: "@hey-api/schemas",
      type: "json",
    },
  ],
})
