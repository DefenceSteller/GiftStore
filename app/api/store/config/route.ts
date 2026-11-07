import { NextResponse } from "next/server";
import { getServerStoreConfig } from "@/lib/store-config";

/** Public store config endpoint — used by client components to read DB-backed settings. */
export async function GET() {
  const config = await getServerStoreConfig();
  return NextResponse.json(config);
}