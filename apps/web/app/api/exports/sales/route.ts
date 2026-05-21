import { proxyCsvExport } from "@/lib/api/exports";

export async function GET(request: Request) {
  return proxyCsvExport(request, "sales.csv");
}
