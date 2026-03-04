import type { AuctionDraft } from "@/lib/auctions/validation";

export type ImportResult = {
  provider: string;
  confidence: number;
  warnings: string[];
  data: Partial<AuctionDraft>;
  debug?: Record<string, unknown>;
};

export interface Importer {
  id: string;
  canHandle: (url: URL, html: string) => boolean;
  parse: (url: URL, html: string) => Promise<ImportResult>;
}
