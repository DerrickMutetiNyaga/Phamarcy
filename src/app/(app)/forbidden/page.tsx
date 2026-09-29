import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/data/panel";
import { Button } from "@/components/ui/button";
import { homeForRole, ROLE_LABELS } from "@/lib/auth/roles";
import { requireUser } from "@/server/auth";

export default async function ForbiddenPage() {
  const user = await requireUser();
  return (
    <Panel className="mx-auto mt-8 max-w-md">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-red-500" />
      <div className="flex flex-col items-center px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
          <ShieldAlert className="size-7" />
        </span>
        <h2 className="mt-4 text-base font-bold text-slate-900">Access restricted</h2>
        <p className="mt-1 text-[13px] text-slate-600">
          The <span className="font-semibold text-slate-800">{ROLE_LABELS[user.role]}</span> role does not have access to that page.
        </p>
        <Button asChild className="mt-5">
          <Link href={homeForRole(user.role)}>Go to home</Link>
        </Button>
      </div>
    </Panel>
  );
}
