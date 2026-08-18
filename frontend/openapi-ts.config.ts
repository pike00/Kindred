import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "./openapi.json",
  output: "./src/client",
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
        const name: string = operation.name

        // The operation.name is in camelCase like "listContactsContactsGet"
        // We want to extract just the action part (e.g., "list", "create", "update", "delete")
        // by finding the service name and removing it along with the HTTP method suffix

        // @ts-expect-error
        const service: string = operation.service // e.g., "Contacts"

        if (service) {
          // Convert service to camelCase for matching
          const serviceCamel =
            service.charAt(0).toLowerCase() + service.slice(1)

          // Remove the service name from the middle of the operation name
          // e.g., "listContactsContactsGet" -> remove "Contacts" -> "listContactsGet"
          const withoutService = name.replace(serviceCamel, "")

          // Now remove the HTTP method suffix (Get, Post, Patch, Delete)
          const result = withoutService.replace(
            /(Get|Post|Patch|Delete|Put)$/,
            "",
          )

          if (result && result.length > 0) {
            return result.charAt(0).toLowerCase() + result.slice(1)
          }
        }

        return name.charAt(0).toLowerCase() + name.slice(1)
      },
    },
    {
      name: "@hey-api/schemas",
      type: "json",
    },
  ],
})
