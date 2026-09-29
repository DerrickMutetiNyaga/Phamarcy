import Link from "next/link";
import { Panel } from "@/components/data/panel";
import { Button } from "@/components/ui/button";
import { homeForRole } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";

export default async function ForbiddenPage() {
  const user = await requireUser();
  return (
    <Panel className="mx-auto max-w-md px-6 py-8 text-center">
      <p className="text-[13px] text-gray-600">Your role does not have access to that page.</p>
      <Button asChild className="mt-4">
        <Link href={homeForRole(user.role)}>Go to home</Link>
      </Button>
    </Panel>
  );
}
