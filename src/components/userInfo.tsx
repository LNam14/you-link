import { getCookie } from "cookies-next";

export default function getUserInfo() {
    try {
        const userInfoCookie = getCookie('userInfo');

        if (!userInfoCookie) {
            throw new Error("Cookie 'userInfo' not found.");
        }

        const userInfo = JSON.parse(userInfoCookie as string);

        return userInfo;
    } catch (error) {
        return null; // Hoặc xử lý lỗi phù hợp
    }
}
