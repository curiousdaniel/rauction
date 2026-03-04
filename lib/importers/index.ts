import { fallbackHeuristicImporter } from "@/lib/importers/fallbackHeuristic";
import { jsonLdEventImporter } from "@/lib/importers/jsonLdEvent";
import { openGraphImporter } from "@/lib/importers/openGraph";
import type { ImportResult, Importer } from "@/lib/importers/types";

const importers: Importer[] = [jsonLdEventImporter, openGraphImporter, fallbackHeuristicImporter];

export async function runAuctionImport(url: URL, html: string): Promise<ImportResult> {
  const active = importers.find((importer) => importer.canHandle(url, html)) ?? fallbackHeuristicImporter;
  return active.parse(url, html);
}
