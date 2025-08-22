import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Paths that require Admin or Staff role
const privatePaths = ["/manage", "/dashboard", "/extort"]
// Paths only for unauthenticated users
const unAuthPaths = ["/login"]
// Paths accessible by everyone (authenticated or not)
const publicPaths = ["/", "/gp-text"]

function getUserInfoFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null
  try {
    return JSON.parse(cookieValue)
  } catch (error) {
    console.error("Error parsing userInfo cookie:", error)
    return null
  }
}

function clearAllCookies(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url))

  // Get all cookie names
  const cookieNames = Array.from(request.cookies.getAll()).map((cookie) => cookie.name)

  // Delete each cookie
  cookieNames.forEach((name) => {
    response.cookies.delete(name)
  })

  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const NewAccessTokenDisV1 = request.cookies.get("NewAccessTokenDisV1")?.value
  const userInfo = getUserInfoFromCookie(request.cookies.get("userInfo")?.value)

  // Check for inconsistent cookie state
  const hasNewAccessTokenDisV1 = !!NewAccessTokenDisV1
  const hasUserInfo = !!userInfo

  // If only one of the cookies exists (inconsistent state), clear all cookies
  if ((hasNewAccessTokenDisV1 && !hasUserInfo) || (!hasNewAccessTokenDisV1 && hasUserInfo)) {
    return clearAllCookies(request)
  }

  // Check if the current path is a private path
  const isPrivatePath = privatePaths.some((path) => pathname.startsWith(path))
  const isUnAuthPath = unAuthPaths.some((path) => pathname.startsWith(path))
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // If not logged in and not accessing a public or unAuth path, redirect to login
  if (!NewAccessTokenDisV1 && !isPublicPath && !isUnAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Prevent logged-in users from accessing login page
  if (isUnAuthPath && NewAccessTokenDisV1) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Check role for private paths - only Admin and Staff can access
  if (isPrivatePath) {
    // If no user info or invalid role, redirect to home
    if (!userInfo || !["Admin", "Nhân viên"].includes(userInfo?.role)) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

// Make sure the matcher catches all relevant paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico).*)"],
}
