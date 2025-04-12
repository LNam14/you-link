import { usePathname, useRouter, useSearchParams } from "next/navigation";

const useQuery = () => {
  const searchParams = useSearchParams();
 const router = useRouter();
 const pathname = usePathname();
  const getQuery = (key: string) => {
    return searchParams.get(key);
  };

  const setQuery = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value) {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
   
    router.push(`${pathname}${query}`);
  };

  return { getQuery, setQuery };
};

export default useQuery;