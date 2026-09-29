import { UsersRound } from "lucide-react";
import { Panel, PanelHeader, TABLE_SCROLL } from "@/components/data/panel";
import { InitialsAvatar } from "@/components/initials-avatar";
import { RoleBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_ONLY } from "@/lib/auth/roles";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { listUsers } from "@/server/services/users";
import { AddUserButton, EditUserButton, ToggleActiveButton } from "./user-dialogs";

export default async function UsersPage() {
  const me = await requireUser(ADMIN_ONLY);
  const users = await listUsers();

  return (
    <Panel>
      <PanelHeader
        title="Users"
        description="Staff accounts that can sign in to the system."
        icon={UsersRound}
        tone="indigo"
        actions={<AddUserButton />}
      />
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const id = String(u._id);
            const isSelf = id === me.id;
            const values = { _id: id, name: u.name, email: u.email, role: u.role, isActive: u.isActive };
            return (
              <TableRow key={id} className={cn(!u.isActive && "text-slate-400")}>
                <TableCell className="font-semibold text-slate-900">
                  <span className={cn("inline-flex items-center gap-2.5", !u.isActive && "opacity-50")}>
                    <InitialsAvatar name={u.name} />
                    {u.name}
                    {isSelf && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">You</span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <RoleBadge role={u.role} />
                </TableCell>
                <TableCell>{u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                <TableCell className="text-slate-600">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell className="text-slate-600">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ToggleActiveButton user={values} isSelf={isSelf} />
                    <EditUserButton user={values} isSelf={isSelf} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
