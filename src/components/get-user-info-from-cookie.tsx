export function getUserInfoFromCookie(cookies: string | undefined): { role: string; status: string; active: number } | null {
    if (!cookies) return null;
    try {
        return JSON.parse(cookies) || null;
    } catch (error) {
        console.error('Error parsing userInfo cookie:', error);
        return null;
    }
}