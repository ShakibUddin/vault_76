import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth";

export default async function Home() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  redirect("/dashboard");
}
