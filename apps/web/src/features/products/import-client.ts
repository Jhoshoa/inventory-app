// Client-safe API functions for CSV import.
// These call the Next.js API proxy (/api/products/import) instead of
// the backend directly, avoiding the need for server-only modules.

import type { ImportJob, ImportJobListResponse } from "./types";

export async function importProductsCsv(file: File): Promise<ImportJob> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/products/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || body.message || "Error al importar productos");
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    total_rows: data.total_rows,
    imported_count: data.imported_count,
    error_count: data.error_count,
    errors: data.errors || [],
    filename: data.filename,
    created_at: data.created_at,
    completed_at: data.completed_at,
  };
}

export async function getImportJob(jobId: string): Promise<ImportJob | null> {
  const response = await fetch(`/api/products/import/${jobId}`);

  if (!response.ok) return null;

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    total_rows: data.total_rows,
    imported_count: data.imported_count,
    error_count: data.error_count,
    errors: data.errors || [],
    filename: data.filename,
    created_at: data.created_at,
    completed_at: data.completed_at,
  };
}

export async function listImportJobs(): Promise<ImportJob[]> {
  const response = await fetch("/api/products/import");

  if (!response.ok) return [];

  const data: ImportJobListResponse = await response.json();
  return data.items;
}
