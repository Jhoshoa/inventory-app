import { proxyInventoryImportUpload } from "@/lib/api/import-upload";

export async function POST(request: Request) {
  return proxyInventoryImportUpload(request);
}
