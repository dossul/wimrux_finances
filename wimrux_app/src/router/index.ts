import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth-store';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore(store);

    // Wait for initial session load if still in progress
    if (authStore.loading) {
      await new Promise<void>((resolve) => {
        const unwatch = authStore.$subscribe(() => {
          if (!authStore.loading) {
            unwatch();
            resolve();
          }
        });
        // Safety timeout
        setTimeout(() => { unwatch(); resolve(); }, 3000);
      });
    }

    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
    const isAuthRoute = to.matched.some((r) => r.meta.isAuthRoute);
    const requiredPermissions = to.meta.permissions;
    const requiredRoles = to.meta.roles;

    // Redirect logged-in users away from auth pages and landing
    if ((isAuthRoute || to.name === 'landing') && authStore.isAuthenticated) {
      return next({ name: 'dashboard' });
    }

    if (requiresAuth && !authStore.isAuthenticated) {
      return next({ name: 'login', query: { redirect: to.fullPath } });
    }

    // Permission-based guard (primary) — respects multi-role fusion
    if (requiredPermissions && requiredPermissions.length > 0 && !authStore.hasAnyPermission(requiredPermissions)) {
      return next({ name: 'dashboard' });
    }

    // Legacy role-based guard (fallback for routes without permissions)
    if (!requiredPermissions && requiredRoles && requiredRoles.length > 0 && !authStore.hasAnyRole(requiredRoles)) {
      return next({ name: 'dashboard' });
    }

    next();
  });

  return Router;
});
