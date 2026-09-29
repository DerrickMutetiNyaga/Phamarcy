import Image from "next/image";
import { Suspense } from "react";
import { ListToolbar } from "@/components/data/list-toolbar";
import { Pagination } from "@/components/data/pagination";
import { EmptyState, Panel, TABLE_SCROLL } from "@/components/data/panel";
import { TableSkeleton } from "@/components/data/table-skeleton";
import { PrescriptionStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { thumbnailUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { PRESCRIPTION_STATUS_LABELS, PRESCRIPTION_STATUSES } from "@/lib/validators/prescription";
import { requireUser } from "@/server/auth";
import { dateRangeParam, oneOf, pageParam, param, type SearchParams } from "@/server/query";
import { listPrescriptions } from "@/server/services/prescriptions";
import { DeletePrescriptionButton, ReviewPrescriptionDialog, UploadPrescriptionButton } from "./prescription-actions";

async function PrescriptionsTable({ sp }: { sp: SearchParams }) {
  const result = await listPrescriptions({
    q: param(sp, "q"),
    status: oneOf(sp, "status", PRESCRIPTION_STATUSES),
    range: dateRangeParam(sp),
    page: pageParam(sp),
  });
  const filtered = ["q", "status", "from", "to"].some((k) => param(sp, k));

  if (result.total === 0) {
    return (
      <Panel>
        {filtered ? (
          <EmptyState message="No prescriptions match these filters." />
        ) : (
          <EmptyState message="No prescriptions uploaded yet." action={<UploadPrescriptionButton label="Upload your first prescription" />} />
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <Table containerClassName={TABLE_SCROLL}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Image</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reviewed</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((r) => (
            <TableRow key={r._id} className={cn(r.status === "pending" && "bg-violet-50/40")}>
              <TableCell>
                <a
                  href={r.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block size-10 overflow-hidden rounded-lg bg-violet-50 ring-1 ring-violet-200 transition-transform hover:scale-105"
                >
                  <Image src={thumbnailUrl(r.imageUrl, 80)} alt={`Prescription for ${r.customerName}`} width={40} height={40} className="size-10 object-cover" />
                </a>
              </TableCell>
              <TableCell className="font-semibold text-slate-900">{r.customerName}</TableCell>
              <TableCell className="tabular-nums">{r.phone}</TableCell>
              <TableCell className="max-w-64 truncate text-slate-600">{r.notes || "-"}</TableCell>
              <TableCell className="text-slate-600">
                {formatDateTime(r.createdAt)}
                <p className="text-xs text-slate-400">{r.uploadedByName}</p>
              </TableCell>
              <TableCell>
                <PrescriptionStatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-slate-600">
                {r.reviewedAt ? (
                  <>
                    {formatDateTime(r.reviewedAt)}
                    <p className="max-w-48 truncate text-xs text-slate-400" title={r.reviewNote}>
                      {r.reviewedByName}
                      {r.reviewNote ? `: ${r.reviewNote}` : ""}
                    </p>
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <ReviewPrescriptionDialog row={r} />
                  <DeletePrescriptionButton id={r._id} name={r.customerName} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </Panel>
  );
}

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(INVENTORY_ROLES);
  const sp = await searchParams;
  return (
    <div className="space-y-4">
      <ListToolbar
        searchPlaceholder="Search patient name or phone"
        dateRange
        exportHref="/api/prescriptions"
        filters={[
          {
            key: "status",
            placeholder: "Any status",
            width: "w-36",
            options: PRESCRIPTION_STATUSES.map((s) => ({ value: s, label: PRESCRIPTION_STATUS_LABELS[s] })),
          },
        ]}
      >
        <UploadPrescriptionButton />
      </ListToolbar>
      <Suspense key={JSON.stringify(sp)} fallback={<TableSkeleton columns={8} />}>
        <PrescriptionsTable sp={sp} />
      </Suspense>
    </div>
  );
}
