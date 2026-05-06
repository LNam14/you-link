import { NextRequest, NextResponse } from "next/server";
import { checkAuthOptional } from "@/lib/utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERPER_ENDPOINT = "https://google.serper.dev/search";
const RESULTS_TARGET = 50;
const BATCH_SIZE = 10;
const PAGE_COUNT = 5;

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
};

type SerperResponse = {
  organic?: SerperOrganic[];
  message?: string;
  error?: string;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const user = checkAuthOptional(request);
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const apiKey = (process.env.SERPER_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Thiếu SERPER_API_KEY trên server (https://serper.dev)." },
      { status: 503 },
    );
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Thiếu từ khóa (q)." }, { status: 400 });
  }

  try {
    const pages = await Promise.all(
      Array.from({ length: PAGE_COUNT }, async (_, index) => {
        const page = index + 1;
        const res = await fetch(SERPER_ENDPOINT, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          body: JSON.stringify({
            q,
            num: BATCH_SIZE,
            page,
          }),
        });

        const data = (await res.json()) as SerperResponse;

        if (!res.ok) {
          const raw = [data.message, data.error].find(
            (x): x is string => typeof x === "string" && x.trim() !== "",
          );
          if (res.status === 401 || raw === "Unauthorized") {
            throw new Error(
              "Serper từ chối (401): kiểm tra SERPER_API_KEY trong .env.local và restart server.",
            );
          }
          throw new Error(raw ?? `Serper trả về HTTP ${res.status}.`);
        }

        const items = Array.isArray(data.organic) ? data.organic : [];
        return items.map((item, itemIndex) => ({
          ...item,
          _globalPosition: (page - 1) * BATCH_SIZE + (item.position ?? itemIndex + 1),
        }));
      }),
    );

    const organic = pages.flat();
    const seen = new Set<string>();
    const rows: Array<SerperOrganic & { _globalPosition: number }> = [];

    const sorted = [...organic].sort(
      (a, b) => a._globalPosition - b._globalPosition,
    );

    for (const item of sorted) {
      const link = (item.link || "").trim();
      if (!link || seen.has(link)) continue;
      seen.add(link);
      rows.push(item);
      if (rows.length >= RESULTS_TARGET) break;
    }

    const results = rows.map((item, i) => {
      const link = (item.link || "").trim();
      return {
        rank: i + 1,
        title: item.title || "",
        link,
        snippet: item.snippet || "",
        displayLink: hostFromUrl(link),
      };
    });

    return NextResponse.json({ query: q, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
