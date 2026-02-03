"use client";

import { useEffect, useState } from "react";
import { useHeader } from "../contexts/HeaderContext";

const BASE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit";

/** Link "Xem chi tiết" cho từng nhóm sản phẩm (Entity, Blog, Edu GOV, PBN Thể thao, PBN VN) */
const DEMO_LINKS = {
  entity: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=1744630987#gid=1744630987",
  blog: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=1906408186#gid=1906408186",
  eduGov: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=321865837#gid=321865837",
  pbnTheThao: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=158465325#gid=158465325",
  pbnVn: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=462923322#gid=462923322",
  /** Bảng giá gói lẻ (dùng chung cho Entity) */
  bangGiaGoiLe: "https://docs.google.com/spreadsheets/d/1xuq584vh1Rf0fE61sss-rbhh82ibtgH6XFc3F6jS7Z8/edit?gid=1744630987#gid=1744630987",
} as const;

const HOT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/19YzSU1iW5rESFnv0X7tg9iuDr5McE59UdHlDSLo9oo8/edit?gid=80059916#gid=80059916";

type HotSiteRow = {
  site: string;
  soLuongBan: number;
  chuDe: string;
  dr: number;
  trafficTool: string;
};

type ProductItem = {
  name: string;
  price: string;
  demoUrl: string;
  features?: string[];
};

const ENTITY_PRODUCTS: ProductItem[] = [
  {
    name: "300 Social Entity",
    price: "2.538.000 ₫",
    demoUrl: DEMO_LINKS.bangGiaGoiLe,
    features: [
      "Bộ 12 Google Stacking",
      "Schema doanh nghiệp",
      "✅ ENTITY INDEX > 70%",
      "✅1 ĐỔI 1 NẾU LINK DIE-LỖI TRONG 30 NGÀY",
      "⏰ Hoàn thành 4 - 7 ngày",
    ],
  },
  {
    name: "KING TWO",
    price: "5.886.000 ₫",
    demoUrl: DEMO_LINKS.bangGiaGoiLe,
    features: [
      "500 Social Entity",
      "80 GOV- EDU",
      "20 BLOG 2.0",
      "50 Mozilla",
      "80 GG CHROME",
      "100 PODCAST",
      "✅ ENTITY INDEX > 70%",
      "✅1 ĐỔI 1 NẾU LINK DIE-LỖI TRONG 30 NGÀY",
      "⏰ Hoàn thành 4 - 7 ngày",
    ],
  },
  {
    name: "BEST SELLER Hanoi",
    price: "6.750.000 ₫",
    demoUrl: DEMO_LINKS.bangGiaGoiLe,
    features: [
      "500 Social Entity",
      "80 GOV- EDU",
      "20 BLOG 2.0",
      "50 Mozilla",
      "80 GG CHROME",
      "100 FORUM PROFILE",
      "100 PODCAST",
      "✅ ENTITY INDEX > 70%",
      "✅1 ĐỔI 1 NẾU LINK DIE-LỖI TRONG 30 NGÀY",
      "⏰ Hoàn thành 4 - 7 ngày",
    ],
  },
];

const BLOG_PRODUCTS: ProductItem[] = [
  {
    name: "2500 Link",
    price: "2.475.000 đ",
    demoUrl: DEMO_LINKS.blog,
    features: [
      "2500 blog comment",
      "Backlink về Ahref cực tốt",
      "Thời gian: 3 - 5 ngày",
    ],
  },
  {
    name: "100 bài",
    price: "2.250.000 đ",
    demoUrl: DEMO_LINKS.blog,
    features: [
      "Đăng 100 bài blog 2.0",
      "30 domain backlink khác nhau",
      "100 bài Content Unique, có hình ảnh",
      "Mỗi bài 500 - 1000 từ",
      "Thời gian: 5 - 7 ngày",
    ],
  },
  {
    name: "100 Link",
    price: "1.350.000 đ",
    demoUrl: DEMO_LINKS.blog,
    features: [
      "Đăng 100 bài backlink forum",
      "30 domain backlink khác nhau",
      "100 bài content unique",
      "Thời gian: 2 - 5 ngày",
    ],
  },
];

const EDU_GOV_PRODUCTS: ProductItem[] = [
  {
    name: "Edu Gov Loại 4",
    price: "2.250.000 đ",
    demoUrl: DEMO_LINKS.eduGov,
    features: ["50 Links", "Chất lượng - uy tín", "Thời gian: 2 - 4 ngày"],
  },
  {
    name: "Edu Gov Loại 5 (Edu dạng Comment)",
    price: "725.000 đ",
    demoUrl: DEMO_LINKS.eduGov,
    features: ["100 Links", "Chất lượng - uy tín", "Thời gian: 2 - 4 ngày"],
  },
];

const PBN_THE_THAO_PRODUCTS: ProductItem[] = [
  {
    name: "30 PBN THỂ THAO Sports",
    price: "2.100.000 ₫",
    demoUrl: DEMO_LINKS.pbnTheThao,
    features: [
      "- 30 PBN Thể Thao",
      "- Hỗ trợ chèn từ khóa SEO mong muốn",
      "✅Cam kết index 50 - 80%",
      "✅Cam kết Ref về Ahrefs và Semrush",
      "✅Thời gian bảo hành: 3 tháng",
      "✅Hỗ trợ tư vấn anchor text SEO hiệu quả",
    ],
  },
  {
    name: "⚡50 PBN MIX 5 chuyên thể thao",
    price: "2.800.000 ₫",
    demoUrl: DEMO_LINKS.pbnTheThao,
    features: [
      "- 10 Backlink Domain .UK.COM",
      "- 10 Backlink Domain .EDU",
      "- 10 Backlink Domain .COM",
      "- 10 Backlink Domain THỂ THAO",
      "- 10 Backlink Domain .IT.COM",
      "⚜️ Tặng kèm 200 link BLOG 2.0",
      "✅Cam kết index 60 - 80%",
      "✅Cam kết Ref về Ahrefs và Semrush",
      "✅ Thời gian bảo hành: 3 tháng",
    ],
  },
];

const PBN_VN_PRODUCTS: ProductItem[] = [
  {
    name: "⚡35 PBN DOMAIN VN",
    price: "2.600.000 đ",
    demoUrl: DEMO_LINKS.pbnVn,
    features: [
      "- 35 Backlink Domain VN",
      "- Hỗ trợ chèn từ khóa SEO mong muốn",
      "✅Cam kết index 60 - 80%",
      "✅Cam kết Ref về Ahrefs và Semrush",
      "✅Thời gian bảo hành: 3 tháng",
    ],
  },
  {
    name: "⚡55 PBN DOMAIN VN",
    price: "3.800.000 đ",
    demoUrl: DEMO_LINKS.pbnVn,
    features: [
      "- 55 Backlink Domain VN",
      "⚜️ Tặng kèm 200 link BLOG 2.0",
      "⚜️Tặng kèm 100 link Bookmarking",
      "- Hỗ trợ chèn từ khóa SEO mong muốn",
      "✅Cam kết index 60 - 80%",
      "✅Cam kết Ref về Ahrefs và Semrush",
      "✅Thời gian bảo hành: 3 tháng",
    ],
  },
];

const ACCENT_STYLES = {
  indigo: {
    card: "from-indigo-500/10 to-white border-indigo-300/60 hover:border-indigo-400 hover:shadow-indigo-200/50",
    badge: "text-indigo-700 bg-indigo-200/70",
    price: "text-indigo-600",
    bullet: "text-indigo-500",
    btn: "from-indigo-500 to-indigo-700 hover:shadow-indigo-400/50",
    dot: "bg-indigo-500 shadow-indigo-400/50 hover:bg-indigo-400",
  },
  amber: {
    card: "from-amber-500/10 to-white border-amber-300/60 hover:border-amber-400 hover:shadow-amber-200/50",
    badge: "text-amber-800 bg-amber-200/70",
    price: "text-amber-600",
    bullet: "text-amber-500",
    btn: "from-amber-500 to-orange-600 hover:shadow-amber-400/50",
    dot: "bg-amber-500 shadow-amber-400/50 hover:bg-amber-400",
  },
  teal: {
    card: "from-teal-500/10 to-white border-teal-300/60 hover:border-teal-400 hover:shadow-teal-200/50",
    badge: "text-teal-700 bg-teal-200/70",
    price: "text-teal-600",
    bullet: "text-teal-500",
    btn: "from-teal-500 to-teal-700 hover:shadow-teal-400/50",
    dot: "bg-teal-500 shadow-teal-400/50 hover:bg-teal-400",
  },
  orange: {
    card: "from-orange-500/10 to-white border-orange-300/60 hover:border-orange-400 hover:shadow-orange-200/50",
    badge: "text-orange-800 bg-orange-200/70",
    price: "text-orange-600",
    bullet: "text-orange-500",
    btn: "from-orange-500 to-amber-600 hover:shadow-orange-400/50",
    dot: "bg-orange-500 shadow-orange-400/50 hover:bg-orange-400",
  },
  emerald: {
    card: "from-emerald-500/10 to-white border-emerald-300/60 hover:border-emerald-400 hover:shadow-emerald-200/50",
    badge: "text-emerald-800 bg-emerald-200/70",
    price: "text-emerald-600",
    bullet: "text-emerald-500",
    btn: "from-emerald-500 to-teal-600 hover:shadow-emerald-400/50",
    dot: "bg-emerald-500 shadow-emerald-400/50 hover:bg-emerald-400",
  },
} as const;

type AccentKey = keyof typeof ACCENT_STYLES;

function ProductSlider({ products, accent = "indigo" }: { products: ProductItem[]; accent?: AccentKey }) {
  const [index, setIndex] = useState(0);
  const product = products[index % products.length];
  const s = ACCENT_STYLES[accent];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % products.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [products.length]);

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 min-h-[80px] px-3 py-2.5 bg-gradient-to-br rounded-lg overflow-hidden flex flex-col border transition-all shadow-sm hover:shadow-md ${s.card}`}>
        <div className="flex-none">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>BESTSELLER</span>
          <p className="font-bold text-gray-900 truncate text-sm mt-1">
            {product.name}
          </p>
          <p className={`text-sm font-black mt-1 ${s.price}`}>
            {product.price}
          </p>
        </div>
        {product.features && product.features.length > 0 && (
          <ul className="mt-2 space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide text-[11px] text-gray-700">
            {product.features.map((f, i) => (
              <li key={i} className="leading-snug flex items-start gap-1.5">
                <span className={`font-bold mt-0.5 shrink-0 ${s.bullet}`}>•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <a
        href={product.demoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-2 text-xs font-bold text-white hover:shadow-lg transition-all active:scale-95 ${s.btn}`}
      >
        Xem chi tiết
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                index % products.length === i
                  ? `w-2.5 h-2.5 shadow ${s.dot}`
                  : "bg-gray-300 w-2 h-2 hover:opacity-80"
              }`}
              aria-label={`Sản phẩm ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const HOT_PAGE_SIZE = 10;

export default function DashboardPage() {
  const { setHeaderData } = useHeader();
  const [hotSites, setHotSites] = useState<HotSiteRow[]>([]);
  const [hotPage, setHotPage] = useState(1);
  const [hotTotal, setHotTotal] = useState(0);
  const [hotTotalPages, setHotTotalPages] = useState(1);
  const [hotLoading, setHotLoading] = useState(true);
  const [hotError, setHotError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderData({
      title: "Trang chủ",
      tabs: null,
      activeTab: null,
      onTabChange: null,
      refreshButton: false,
      onRefresh: null,
      customControls: null,
    });
  }, [setHeaderData]);

  useEffect(() => {
    let cancelled = false;
    setHotLoading(true);
    setHotError(null);
    fetch(`/api/sheet/hot-sites?page=${hotPage}&limit=${HOT_PAGE_SIZE}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((json: { data: HotSiteRow[]; total: number; page: number; totalPages: number }) => {
        if (!cancelled) {
          setHotSites(json.data || []);
          setHotTotal(json.total ?? 0);
          setHotTotalPages(json.totalPages ?? 1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHotError(err?.message || "Không tải được dữ liệu");
          setHotSites([]);
        }
      })
      .finally(() => {
        if (!cancelled) setHotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotPage]);

  return (
    <div className="min-h-full bg-white">
      <div className="px-3 py-5 sm:px-4 lg:px-6">

        {/* Section 1: Bảng sản phẩm hot 70% + Sidebar 30% */}
        <section className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-transparent rounded-full" />
            <h2 className="text-xl font-bold text-gray-900 animate-title-blink shrink-0 capitalize">List site bán chạy</h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-[70%] overflow-hidden rounded-xl border-2 border-indigo-200/80 bg-white shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/40 hover:border-indigo-300 transition-all">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-transparent">
                      <th className="text-left py-2.5 px-3 font-bold text-indigo-900">Site</th>
                      <th className="text-left py-2.5 px-3 font-bold text-indigo-900">Chủ đề</th>
                      <th className="text-left py-2.5 px-3 font-bold text-indigo-900">DR</th>
                      <th className="text-left py-2.5 px-3 font-bold text-indigo-900">Traffic Tool</th>
                      <th className="text-right py-2.5 px-3 font-bold text-indigo-900">Số lượng bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          Đang tải...
                        </td>
                      </tr>
                    ) : hotError ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-red-600">
                          {hotError}
                        </td>
                      </tr>
                    ) : (
                      hotSites.map((row, i) => (
                        <tr
                          key={`${row.site}-${i}`}
                          className="border-b border-indigo-50/80 hover:bg-indigo-50/60 transition-all"
                        >
                          <td className="py-2 px-3 text-gray-800 font-semibold">{row.site}</td>
                          <td className="py-2 px-3 text-gray-600">{row.chuDe}</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-400/20 to-violet-400/10 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-300/50">
                              DR {row.dr}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600 font-medium">{row.trafficTool}</td>
                          <td className="py-2 px-3 text-right text-gray-800 tabular-nums font-bold">{row.soLuongBan.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-indigo-100 bg-indigo-50/30">
                <span className="text-xs text-gray-600">
                  {hotLoading || hotError ? null : `Trang ${hotPage}/${hotTotalPages} — ${hotTotal} site`}
                </span>
                <div className="flex items-center gap-2">
                  {hotTotalPages > 1 && !hotLoading && !hotError && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHotPage((p) => Math.max(1, p - 1))}
                        disabled={hotPage <= 1}
                        className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => setHotPage((p) => Math.min(hotTotalPages, p + 1))}
                        disabled={hotPage >= hotTotalPages}
                        className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                  <a
                    href={HOT_SHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-400/30 transition-all"
                  >
                    Xem chi tiết
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:w-[30%] flex flex-col gap-3">
              <div className="rounded-xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-400/20 via-teal-400/15 to-cyan-400/10 shadow-lg shadow-emerald-200/40 overflow-hidden flex-1 p-4 hover:shadow-emerald-300/30 transition-shadow">
                <h3 className="font-black text-base mb-3 text-emerald-800 animate-title-blink">📞 Hỗ trợ & Tư vấn</h3>
                <ul className="space-y-2 text-xs text-emerald-900/90">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>Nhận báo giá & tư vấn gói phù hợp</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>Hỗ trợ nhanh qua Zalo / Telegram</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>Giải đáp kỹ thuật Entity, PBN, Backlink</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>Cam kết bảo hành & đổi link theo gói</span>
                  </li>
                </ul>
                <a
                  href="https://t.me/stresstocryTT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-400/30 transition-all"
                >
                  Liên hệ ngay
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </a>
              </div>
              <div className="rounded-xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-400/25 via-orange-400/20 to-yellow-400/15 p-3 shadow-lg shadow-amber-200/40">
                <p className="text-xs font-bold text-amber-900">
                  🎁 <span className="block mt-1">Tặng kèm Bộ 12 Google Stacking & Schema doanh nghiệp khi đặt gói Entity.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Entity, Blog, Edu GOV */}
        <section className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent rounded-full" />
            <h2 className="text-xl font-bold text-gray-900 animate-title-blink shrink-0 capitalize">Dịch vụ Backlink
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-indigo-300/80 bg-gradient-to-b from-indigo-50/50 to-white shadow-lg shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/50 hover:border-indigo-400 transition-all p-4 flex flex-col group">
              <h3 className="text-base font-bold text-indigo-700 mb-3 pb-2 border-b-2 border-indigo-300 animate-title-blink">
                🏢 Entity
              </h3>
              <ProductSlider products={ENTITY_PRODUCTS} accent="indigo" />
            </div>
            <div className="rounded-xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/50 to-white shadow-lg shadow-amber-100/50 hover:shadow-xl hover:shadow-amber-200/50 hover:border-amber-400 transition-all p-4 flex flex-col group">
              <h3 className="text-base font-bold text-amber-700 mb-3 pb-2 border-b-2 border-amber-300 animate-title-blink">
                📝 Blog 2.0
              </h3>
              <ProductSlider products={BLOG_PRODUCTS} accent="amber" />
            </div>
            <div className="rounded-xl border-2 border-teal-300/80 bg-gradient-to-b from-teal-50/50 to-white shadow-lg shadow-teal-100/50 hover:shadow-xl hover:shadow-teal-200/50 hover:border-teal-400 transition-all p-4 flex flex-col group">
              <h3 className="text-base font-bold text-teal-700 mb-3 pb-2 border-b-2 border-teal-300 animate-title-blink">
                🎓 Edu GOV
              </h3>
              <ProductSlider products={EDU_GOV_PRODUCTS} accent="teal" />
            </div>
          </div>
        </section>

        {/* Section 3: PBN Thể thao, PBN VN */}
        <section className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-transparent rounded-full" />
            <h2 className="text-xl font-bold text-gray-900 animate-title-blink shrink-0 capitalize">Combo PBN</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border-2 border-orange-300/80 bg-gradient-to-b from-orange-50/50 to-white shadow-lg shadow-orange-100/50 hover:shadow-xl hover:shadow-orange-200/50 hover:border-orange-400 transition-all p-4 flex flex-col group">
              <h3 className="text-base font-bold text-orange-700 mb-3 pb-2 border-b-2 border-orange-300 animate-title-blink">
                ⚽ PBN Thể Thao
              </h3>
              <ProductSlider products={PBN_THE_THAO_PRODUCTS} accent="orange" />
            </div>
            <div className="rounded-xl border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-50/50 to-white shadow-lg shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-200/50 hover:border-emerald-400 transition-all p-4 flex flex-col group">
              <h3 className="text-base font-bold text-emerald-700 mb-3 pb-2 border-b-2 border-emerald-300 animate-title-blink">
                🇻🇳 PBN Việt Nam
              </h3>
              <ProductSlider products={PBN_VN_PRODUCTS} accent="emerald" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
