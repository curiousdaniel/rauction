"use client";

import { useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
};

type ImportPayload = {
  provider: string;
  confidence: number;
  warnings: string[];
  data: Partial<{
    title: string;
    description: string;
    auctionUrl: string;
    moreInfoUrl: string;
    locationCity: string;
    locationRegion: string;
    auctionType: "ONLINE" | "LIVE";
    startAt: string;
    endAt: string;
    imageUrls: string[];
  }>;
};

type AuctionFormState = {
  clientId: string;
  title: string;
  description: string;
  auctionType: "ONLINE" | "LIVE";
  scheduledAt: string;
  startAt: string;
  endAt: string;
  auctionUrl: string;
  moreInfoUrl: string;
  locationCity: string;
  locationRegion: string;
  imageUrls: string;
  featuredItems: string;
};

function toDateTimeLocal(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const h = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function AuctionForm({ clients }: { clients: ClientOption[] }) {
  const [mode, setMode] = useState<"manual" | "import">("import");
  const [importUrl, setImportUrl] = useState("");
  const [importMeta, setImportMeta] = useState<{ provider: string; confidence: number; warnings: string[] } | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState<AuctionFormState>({
    clientId: clients[0]?.id ?? "",
    title: "",
    description: "",
    auctionType: "ONLINE",
    scheduledAt: "",
    startAt: "",
    endAt: "",
    auctionUrl: "",
    moreInfoUrl: "",
    locationCity: "",
    locationRegion: "",
    imageUrls: "",
    featuredItems: "",
  });

  const canImport = useMemo(() => /^https?:\/\//i.test(importUrl), [importUrl]);

  function updateForm<K extends keyof AuctionFormState>(key: K, value: AuctionFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImport() {
    setImportError("");
    setImporting(true);
    setImportMeta(null);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: importUrl }),
      });

      const payload = (await response.json()) as ImportPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed");
      }

      setImportMeta({
        provider: payload.provider,
        confidence: payload.confidence,
        warnings: payload.warnings ?? [],
      });

      setForm((prev) => ({
        ...prev,
        title: payload.data.title ?? prev.title,
        description: payload.data.description ?? prev.description,
        auctionUrl: payload.data.auctionUrl ?? importUrl,
        moreInfoUrl: payload.data.moreInfoUrl ?? prev.moreInfoUrl,
        locationCity: payload.data.locationCity ?? prev.locationCity,
        locationRegion: payload.data.locationRegion ?? prev.locationRegion,
        auctionType: payload.data.auctionType ?? prev.auctionType,
        startAt: payload.data.startAt ? toDateTimeLocal(payload.data.startAt) : prev.startAt,
        endAt: payload.data.endAt ? toDateTimeLocal(payload.data.endAt) : prev.endAt,
        imageUrls: payload.data.imageUrls?.length ? payload.data.imageUrls.join("\n") : prev.imageUrls,
      }));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <form className="card" method="POST" action="/api/auctions">
      <div className="modeSwitch">
        <button
          type="button"
          className={mode === "import" ? "tabButton activeTab" : "tabButton"}
          onClick={() => setMode("import")}
        >
          Import from URL
        </button>
        <button
          type="button"
          className={mode === "manual" ? "tabButton activeTab" : "tabButton"}
          onClick={() => setMode("manual")}
        >
          Manual Entry
        </button>
      </div>

      {mode === "import" ? (
        <div className="importPanel">
          <label htmlFor="importUrl">Auction URL</label>
          <div className="importRow">
            <input
              id="importUrl"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              placeholder="https://example.com/auction/.../bidgallery/"
            />
            <button type="button" onClick={handleImport} disabled={!canImport || importing}>
              {importing ? "Fetching..." : "Fetch"}
            </button>
          </div>
          {importMeta ? (
            <div className="importMeta">
              <p>
                Provider: <strong>{importMeta.provider}</strong> | Confidence:{" "}
                <strong>{importMeta.confidence}</strong>
              </p>
              {importMeta.warnings.length > 0 ? (
                <ul className="inlineList">
                  {importMeta.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p>No warnings from importer.</p>
              )}
            </div>
          ) : null}
          {importError ? <p className="errorText">{importError}</p> : null}
        </div>
      ) : null}

      <label htmlFor="clientId">Client</label>
      <select
        id="clientId"
        name="clientId"
        value={form.clientId}
        onChange={(event) => updateForm("clientId", event.target.value)}
        required
      >
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>

      <label htmlFor="title">Post Title</label>
      <input id="title" name="title" value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        rows={5}
        value={form.description}
        onChange={(event) => updateForm("description", event.target.value)}
        required
      />

      <div className="formGrid2">
        <div>
          <label htmlFor="auctionType">Auction Type</label>
          <select
            id="auctionType"
            name="auctionType"
            value={form.auctionType}
            onChange={(event) => updateForm("auctionType", event.target.value as "ONLINE" | "LIVE")}
          >
            <option value="ONLINE">ONLINE</option>
            <option value="LIVE">LIVE</option>
          </select>
        </div>
        <div>
          <label htmlFor="scheduledAt">Scheduled At (optional for ONLINE)</label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) => updateForm("scheduledAt", event.target.value)}
          />
        </div>
      </div>

      <div className="formGrid2">
        <div>
          <label htmlFor="startAt">Start At</label>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => updateForm("startAt", event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="endAt">End At (required for ONLINE)</label>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => updateForm("endAt", event.target.value)}
          />
        </div>
      </div>

      <label htmlFor="auctionUrl">Auction URL</label>
      <input
        id="auctionUrl"
        name="auctionUrl"
        type="url"
        value={form.auctionUrl}
        onChange={(event) => updateForm("auctionUrl", event.target.value)}
        required
      />

      <label htmlFor="moreInfoUrl">More Info URL (optional)</label>
      <input
        id="moreInfoUrl"
        name="moreInfoUrl"
        type="url"
        value={form.moreInfoUrl}
        onChange={(event) => updateForm("moreInfoUrl", event.target.value)}
      />

      <div className="formGrid2">
        <div>
          <label htmlFor="locationCity">City</label>
          <input
            id="locationCity"
            name="locationCity"
            value={form.locationCity}
            onChange={(event) => updateForm("locationCity", event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="locationRegion">State / Region</label>
          <input
            id="locationRegion"
            name="locationRegion"
            value={form.locationRegion}
            onChange={(event) => updateForm("locationRegion", event.target.value)}
            required
          />
        </div>
      </div>

      <label htmlFor="imageUrls">Image URLs (one per line, min 3)</label>
      <textarea
        id="imageUrls"
        name="imageUrls"
        rows={4}
        value={form.imageUrls}
        onChange={(event) => updateForm("imageUrls", event.target.value)}
        required
      />

      <label htmlFor="featuredItems">Featured Items (optional, one per line)</label>
      <textarea
        id="featuredItems"
        name="featuredItems"
        rows={3}
        value={form.featuredItems}
        onChange={(event) => updateForm("featuredItems", event.target.value)}
      />

      <div className="actionsRow">
        <button type="submit" name="submitAction" value="saveDraft">
          Save Draft
        </button>
        <button type="submit" name="submitAction" value="queue">
          Save and Queue
        </button>
      </div>
    </form>
  );
}
