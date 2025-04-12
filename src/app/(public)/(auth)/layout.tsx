import Image from "next/image";
import Link from "next/link";
import AuthBg from "/public/images/auth-bg.svg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="absolute z-30 w-full">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between md:h-20">
            {/* Site branding */}
            <div className="mr-4 shrink-0">
              <Link href="/" className="flex items-center space-x-1 text-4xl font-bold group">
                {/* Chữ "You" */}
                <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 group-hover:drop-shadow-lg">
                  You
                </span>

                {/* Biểu tượng Link */}
                <span className="relative flex items-center justify-center w-8 h-8">
                  <svg
                    className="w-6 h-6 text-gray-900 transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-=20-1.72-1.71" />
                  </svg>
                </span>

                {/* Chữ "Link" */}
                <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 group-hover:drop-shadow-lg">
                  Link
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex grow">
        <div
          className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/3"
          aria-hidden="true"
        >
          <div className="h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500 opacity-70 blur-[160px]"></div>
        </div>

        {/* Content */}
        <div className="w-full">
          <div className="flex h-full flex-col justify-center before:min-h-[4rem] before:flex-1 after:flex-1 md:before:min-h-[5rem]">
            <div className="px-4 sm:px-6">
              <div className="mx-auto w-full max-w-sm">
                <div className="py-16 md:py-20">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>

        <>
          {/* Right side */}
          <div className="relative my-6 mr-6 hidden w-[572px] shrink-0 overflow-hidden rounded-2xl lg:block">
            {/* Background */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -ml-24 -translate-x-1/2 -translate-y-1/2 bg-blue-50"
              aria-hidden="true"
            >
              <Image
                src={AuthBg}
                className="max-w-none"
                width={1285}
                height={1684}
                alt="Auth bg"
              />
            </div>
            {/* Illustration */}
            <div className="absolute left-32 top-1/2 w-[500px] -translate-y-1/2">
              <div className="aspect-video w-full rounded-2xl bg-gray-900 px-5 py-3 shadow-xl transition duration-300">
                <div className="relative mb-8 flex items-center justify-between before:block before:h-[9px] before:w-[41px] before:bg-[length:16px_9px] before:[background-image:radial-gradient(circle_at_4.5px_4.5px,_theme(colors.gray.600)_4.5px,_transparent_0)] after:w-[41px]">
                  <span className="text-[13px] font-medium text-white">
                    ylink.shop
                  </span>
                </div>
                <div className="font-mono text-sm text-gray-500 transition duration-300 [&_span]:opacity-0">
                  <span className="animate-[code-1_10s_infinite] text-gray-200">
                    Backlink an toàn và hiệu quả
                  </span>{" "}
                  <span className="animate-[code-2_10s_infinite]">

                  </span>
                  <br />
                  <span className="animate-[code-3_10s_infinite]">
                    Được xây dựng từ các website có uy tín, đảm bảo tăng cường hiệu quả SEO mà không lo rủi ro.
                  </span>{" "}
                  <span className="animate-[code-4_10s_infinite]">

                  </span>
                  <br />
                  <br />
                  <span className="animate-[code-5_10s_infinite] text-gray-200">
                    Chiến lược tối ưu SEO
                  </span>
                  <br />
                  <span className="animate-[code-6_10s_infinite]">
                    Đội ngũ chuyên gia giàu kinh nghiệm sẽ xây dựng chiến lược backlink và guest post phù hợp với mục tiêu của bạn.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      </main>
    </>
  );
}
