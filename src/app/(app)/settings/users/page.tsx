import { Panel, PanelHeader, TABLE_SCROLL } from "@/components/data/panel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_ONLY, ROLE_LABELS } from "@/lib/auth/roles";
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
      <PanelHeader title="Users" description="Staff accounts that can sign in to the system." actions={<AddUserButton />} />
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
              <TableRow key={id} className={cn(!u.isActive && "text-gray-400")}>
                <TableCell className="font-medium">
                  {u.name}
                  {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-500">(you)</span>}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>{u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                <TableCell className="text-gray-600">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                <TableCell className="text-gray-600">{formatDate(u.createdAt)}</TableCell>
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
