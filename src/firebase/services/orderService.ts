import { ref } from 'firebase/database';
import { database } from '@/lib/firebase';
import { listenToData, getDataSnapshot } from '../utils/firebaseUtils';
import { FirebaseError } from '../types';

interface Order {
  site: string;
  [key: string]: any;
}

interface SiteOrderCount {
  site: string;
  count: number;
}

export const getTop10OrderedSites = async (): Promise<SiteOrderCount[]> => {
  return new Promise((resolve, reject) => {
    const ordersRef = ref(database, 'orders');
    
    listenToData({
      ref: ordersRef,
      callback: (snapshot) => {
        const orders = getDataSnapshot(snapshot) as { [key: string]: Order };
        
        // Create a map to count orders per site
        const siteCountMap = new Map<string, number>();
        
        // Count orders for each site
        Object.values(orders).forEach((order) => {
          if (order.site) {
            const currentCount = siteCountMap.get(order.site) || 0;
            siteCountMap.set(order.site, currentCount + 1);
          }
        });
        
        // Convert map to array and sort by count
        const topSites = Array.from(siteCountMap.entries())
          .map(([site, count]) => ({ site, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        resolve(topSites);
      },
      errorCallback: (error) => {
        console.error('Error fetching top ordered sites:', error);
        reject(error);
      }
    });
  });
}; 