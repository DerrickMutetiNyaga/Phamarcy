"use client";

import { Search, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { PrescriptionUploadDialog } from "@/components/prescription-upload-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { thumbnailUrl } from "@/lib/images";

export interface AttachedPrescription {
  _id: string;
  customerName: string;
  phone: string;
  imageUrl: string;
  reviewedAt: string | null;
  createdAt: string;
}

interface PrescriptionPanelProps {
  rxItemNames: string[];
  attached: AttachedPrescription | null;
  onAttach: (p: AttachedPrescription | null) => void;
  customerName?: string;
  customerPhone?: string;
}

export function PrescriptionPanel({ rxItemNames, attached, onAttach, customerName, customerPhone }: PrescriptionPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AttachedPrescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ rows: AttachedPrescription[] }>(
        `/api/prescriptions?status=verified&q=${encodeURIComponent(q)}`
      );
      setRows(res.rows);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(query), 250);
    return () => clearTimeout(t);
  }, [open, query, load]);

  if (rxItemNames.length === 0 && !attached) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
      {rxItemNames.length > 0 && (
        <p className="text-xs text-amber-800">
          <span className="font-medium">Prescription required</span> for {rxItemNames.join(", ")}.
        </p>
      )}
      {attached ? (
        <div className="mt-2 flex items-center justify-between rounded border border-amber-200 bg-white px-2.5 py-1.5">
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-gray-900">
              {attached.customerName} <span className="font-normal text-gray-500">{attached.phone}</span>
            </p>
            <p className="text-gray-500">Verified {formatDateTime(attached.reviewedAt ?? attached.createdAt)}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Detach prescription" onClick={() => onAttach(null)} className="text-gray-500">
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) setQuery(customerPhone ?? "");
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="mt-2 w-full border-amber-300 bg-white">
              Attach verified prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Attach prescription</DialogTitle>
              <DialogDescription>Only prescriptions verified by a pharmacist can be attached.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search patient name or phone"
                  className="pl-8"
                />
              </div>
              <PrescriptionUploadDialog
                initialName={customerName}
                initialPhone={customerPhone}
                onUploaded={() => void load(query)}
                trigger={
                  <Button variant="outline">
                    <Upload className="size-4" />
                    Upload new
                  </Button>
                }
              />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200">
              {error ? (
                <p className="px-3 py-6 text-center text-[13px] text-red-600">{error}</p>
              ) : loading && rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-gray-500">Loading...</p>
              ) : rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-gray-500">
                  No verified prescriptions found. Newly uploaded prescriptions appear here once a pharmacist verifies them.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <li key={r._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                      <a href={r.imageUrl} target="_blank" rel="noreferrer" className="size-10 shrink-0 overflow-hidden rounded border border-gray-200">
                        <Image src={thumbnailUrl(r.imageUrl, 80)} alt="" width={40} height={40} className="size-10 object-cover" />
                      </a>
                      <div className="min-w-0 flex-1 text-[13px]">
                        <p className="truncate font-medium text-gray-900">{r.customerName}</p>
                        <p className="text-xs text-gray-500">
                          {r.phone} · verified {formatDateTime(r.reviewedAt ?? r.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          onAttach(r);
                          setOpen(false);
                        }}
                      >
                        Attach
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
