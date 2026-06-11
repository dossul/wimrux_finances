---
description: Create a new Quasar page with stub content and register it in the router
---

# Create a new Quasar page

## Steps

1. **Determine page details** from the user:
   - Page name (e.g. `ClientsPage`)
   - Route path (e.g. `/clients`)
   - Route name (e.g. `clients`)
   - Page title in French (e.g. `Clients`)
   - Parent folder under `src/pages/` (e.g. `clients`)
   - Required roles (e.g. `['admin', 'caissier']`)

2. **Create the Vue file** at `wimrux_app/src/pages/{folder}/{PageName}.vue`:
```vue
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">{{ pageTitle }}</div>
      <q-space />
      <!-- Add action buttons here -->
    </div>
    <div class="text-grey-7">Module en cours de développement...</div>
  </q-page>
</template>

<script setup lang="ts">
// Add imports and logic here
</script>
```

3. **Register the route** in `wimrux_app/src/router/routes.ts`:
   - Add the route inside the main layout children array
   - Include `meta: { title: '...', roles: [...] }`
   - Use lazy import: `component: () => import('pages/{folder}/{PageName}.vue')`

4. **Add navigation item** (if needed) in `wimrux_app/src/layouts/MainLayout.vue`:
   - Add entry to `navItems` array with label, icon, route, and roles

5. **Verify** the dev server compiles without errors.
