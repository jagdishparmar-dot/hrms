import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { selectCompanyAction } from "@/lib/appwrite/actions";
import { getCurrentUser, isPlatformAdminEmail } from "@/lib/appwrite/auth";
import { getCompanyById, listMembershipsForUser } from "@/lib/appwrite/tenant";

export default async function SelectCompanyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await listMembershipsForUser(user.$id);
  if (memberships.length === 0) {
    if (isPlatformAdminEmail(user.email || "")) redirect("/platform");
    redirect("/logout?reason=no-company");
  }
  if (memberships.length === 1) redirect("/dashboard");

  const companies = await Promise.all(
    memberships.map(async (m) => ({
      membership: m,
      company: await getCompanyById(m.companyId),
    })),
  );

  return (
    <AuthShell contentClassName="mx-auto flex w-full max-w-lg flex-col justify-center space-y-8 px-6 py-16 sm:px-0">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-medium">Select company</h1>
        <p className="text-sm text-muted-foreground">
          You belong to more than one workspace. Choose which to open.
        </p>
      </div>
      <ul className="space-y-3">
        {companies.map(({ membership, company }) => (
          <li key={membership.id}>
            <form action={selectCompanyAction}>
              <input type="hidden" name="companyId" value={membership.companyId} />
              <Button
                type="submit"
                variant="outline"
                className="h-auto w-full justify-between px-4 py-3 text-left"
              >
                <span>
                  <span className="block font-medium">
                    {company?.name || membership.companyId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {membership.role.replace("_", " ")}
                    {company?.slug ? ` · ${company.slug}` : ""}
                  </span>
                </span>
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
