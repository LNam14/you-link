"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import HotTableComponent, { type Column } from "@/components/table/HotTable";
import Handsontable from "handsontable";

type SerpRow = {
  rank: number;
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
};

export default function TopGooglePage() {
  const { setHeaderData } = useHeader();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SerpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const columns = useMemo<Column[]>(() => {
    const linkRenderer: NonNullable<Column["renderer"]> = (
      instance: Handsontable,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string | number,
      value: unknown,
      cellProperties?: Handsontable.CellMeta,
    ) => {
      Handsontable.renderers.TextRenderer(
        instance,
        td,
        row,
        col,
        prop,
        value,
        (cellProperties ?? {}) as Handsontable.CellProperties,
      );
      const href = String(value || "").trim();
      td.textContent = "";
      if (!href) return td;

      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "text-blue-700 hover:underline";
      a.textContent = href;
      td.appendChild(a);
      return td;
    };

    const domainRenderer: NonNullable<Column["renderer"]> = (
      instance: Handsontable,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string | number,
      value: unknown,
      cellProperties?: Handsontable.CellMeta,
    ) => {
      Handsontable.renderers.TextRenderer(
        instance,
        td,
        row,
        col,
        prop,
        value,
        (cellProperties ?? {}) as Handsontable.CellProperties,
      );
      const label = String(value || "").trim();
      const rowLink = String(
        instance.getDataAtRowProp(row, "link") ?? "",
      ).trim();
      const href =
        rowLink ||
        (label ? `https://${label.replace(/^www\./i, "")}` : "");
      td.textContent = "";
      if (!href) return td;

      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "text-green-800 hover:underline";
      a.textContent = label || new URL(href).hostname.replace(/^www\./i, "");
      td.appendChild(a);
      return td;
    };

    return [
      { data: "rank", title: "Top", readOnly: true, width: 70, type: "numeric" },
      { data: "title", title: "Tiêu đề", readOnly: true, width: 300 },
      {
        data: "displayLink",
        title: "Domain",
        readOnly: true,
        width: 180,
        renderer: domainRenderer,
      },
      { data: "link", title: "Link", readOnly: true, width: 380, renderer: linkRenderer },
      { data: "snippet", title: "Mô tả", readOnly: true, width: 420 },
    ];
  }, []);

  useEffect(() => {
    setHeaderData({
      title: "Top 50 Google",
      subTitle:
        "Nhập từ khóa để xem tối đa 50 kết quả web (qua Serper / Google SERP).",
      refreshButton: false,
    });
  }, [setHeaderData]);

  const search = useCallback(async () => {
    const q = keyword.trim();
    if (!q) {
      toast.error("Vui lòng nhập từ khóa.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const url = `/api/google-top?q=${encodeURIComponent(q)}`;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth-token")
          : null;
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { credentials: "include", headers });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không lấy được dữ liệu.");
        return;
      }
      setResults(Array.isArray(data.results) ? data.results : []);
      setLastQuery(data.query ?? q);
      if (!data.results?.length) {
        toast.message("Không có kết quả cho từ khóa này.");
      }
    } catch {
      toast.error("Lỗi mạng hoặc server.");
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
            aria-hidden
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
            placeholder="Nhập từ khóa (keyword)..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            disabled={loading}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} aria-hidden />
              Đang tìm...
            </>
          ) : (
            <>
              <Search size={18} aria-hidden />
              Tìm top 50
            </>
          )}
        </button>
      </div>

      {lastQuery && results.length > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          Kết quả cho <span className="font-medium text-gray-900">{lastQuery}</span>{" "}
          — {results.length} trang
        </p>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
        <HotTableComponent
          data={results}
          columns={columns}
          readOnly
          colHeaders
          rowHeaders={false}
          contextMenuOptions={{ showAddRow: false, showRemoveRow: false }}
          copyPaste={false}
          fillHandle={false}
          stretchH="all"
          manualRowResize={false}
        />
      </div>

      {!loading && lastQuery && results.length === 0 && (
        <p className="text-center text-gray-500 py-12">Không có kết quả.</p>
      )}
    </div>
  );
}
