import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "am_admin_auth";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const expected = process.env.ADMIN_PASSWORD;
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(expected && token && token === expected);
}
