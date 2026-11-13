import type { UserRole } from "@/types/api";

import { roleRouteMap } from "@/features/auth/store";

export function getLoginRedirectRoute(
  role: UserRole,
  search: string,
): string {
  const roleHome = roleRouteMap[role];
  if (role !== "CANDIDATE") return roleHome;

  const returnTo = new URLSearchParams(search).get("returnTo");
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return roleHome;
  }

  try {
    const target = new URL(returnTo, window.location.origin);
    if (
      target.origin === window.location.origin &&
      /^\/vacancies\/[0-9a-f-]+$/i.test(target.pathname)
    ) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    return roleHome;
  }
  return roleHome;
}
