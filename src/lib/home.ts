export function homeForRole(role?: string | null) {
  if (role === "ADMIN") return "/admin";
  if (role === "MANAGER") return "/manager/dashboard";
  return "/me";
}
