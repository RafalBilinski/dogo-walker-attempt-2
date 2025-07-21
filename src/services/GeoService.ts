import * as ngeohash from 'ngeohash';
import { GeoPoint, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  collection,
  query,
  getDocs,
  where,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

export interface GeoQueryResult<T extends DocumentData = DocumentData> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<T> | null;
}

export class GeoService {
  /**
   * Generate a geohash for a [lat, lng] point with the specified precision.
   */
  static generateGeohash(latitude: number, longitude: number, precision: number = 9): string {
    return ngeohash.encode(latitude, longitude, precision);
  }

  /**
   * Generate a geohash from a GeoPoint
   */
  static geoPointToHash(point: GeoPoint, precision: number = 9): string {
    return ngeohash.encode(point.latitude, point.longitude, precision);
  }

  /**
   * Calculate the neighboring geohashes for a given geohash
   */
  static getGeohashNeighbors(geohash: string): string[] {
    const neighbors = ngeohash.neighbors(geohash);
    return [...neighbors, geohash]; // Include the center geohash
  }

  /**
   * Calculate bounding box for a lat,lng point and radius in km
   */
  static getBoundingBox(latitude: number, longitude: number, radiusInKm: number) {
    const earthRadiusKm = 6371; // Earth's radius in km
    
    // Calculate lat/lon bounds
    const latDelta = radiusInKm / earthRadiusKm * (180 / Math.PI);
    const lonDelta = radiusInKm / (earthRadiusKm * Math.cos(latitude * Math.PI / 180)) * (180 / Math.PI);

    return {
      minLat: latitude - latDelta,
      maxLat: latitude + latDelta,
      minLng: longitude - lonDelta,
      maxLng: longitude + lonDelta
    };
  }

  /**
   * Get the geohash precision needed to achieve a certain accuracy in kilometers
   */
  static getPrecisionForRadius(radiusInKm: number): number {
    // This is an approximation - decrease precision as radius increases
    // For small areas, use higher precision
    if (radiusInKm <= 0.5) return 9; // ~5m
    if (radiusInKm <= 1) return 8;   // ~20m
    if (radiusInKm <= 5) return 7;   // ~80m
    if (radiusInKm <= 20) return 6;  // ~600m
    if (radiusInKm <= 100) return 5; // ~2.5km
    if (radiusInKm <= 500) return 4; // ~20km
    return 3;                        // ~80km
  }

  /**
   * Get nearby documents from a collection
   * @param collectionName Collection to query
   * @param latitude Center latitude
   * @param longitude Center longitude
   * @param radiusInKm Radius in kilometers
   * @param limitCount Maximum number of results
   * @param extraFilters Additional query filters
   * @param lastDoc Last document for pagination
   */
  static async getNearbyLocations<T extends DocumentData = DocumentData>(
    collectionName: string,
    latitude: number,
    longitude: number,
    radiusInKm: number,
    limitCount: number = 100,
    extraFilters: { field: string; operator: string; value: any }[] = [],
    lastDoc?: QueryDocumentSnapshot<T>,
    debug: boolean = false
  ): Promise<GeoQueryResult<T>> {
    // Get appropriate precision for the given radius
    const precision = this.getPrecisionForRadius(radiusInKm);
    if (debug) console.debug('[GeoService] Using precision', precision, 'for radius', radiusInKm, 'km');
    
    // Get center geohash
    const centerHash = this.generateGeohash(latitude, longitude, precision);
    
    // Get neighboring geohashes
    const geohashes = this.getGeohashNeighbors(centerHash);
    if (debug) console.debug('[GeoService] Center hash', centerHash, 'with neighbors', geohashes);
    
    const results: T[] = [];
    let lastDocument: QueryDocumentSnapshot<T> | null = null;
    
    // We'll need to filter client-side by actual distance
    const actualCenter = new GeoPoint(latitude, longitude);
    
    // Create query
    const baseQuery = collection(db, collectionName);

    // Query for each geohash prefix
    for (const geoPrefix of geohashes) {
      // Build query constraints - avoid composite index by filtering client-side
      let constraints: QueryConstraint[] = [
        where('geohash', '>=', geoPrefix),
        where('geohash', '<', geoPrefix + '\uf8ff'), // End of prefix
        limit(limitCount * 2) // Get more results to account for client-side filtering
      ];
      
      // Add pagination if lastDoc provided
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      // Only apply non-range filters to avoid composite index requirement
      // Range/inequality filters will be applied client-side
      const serverSideFilters = extraFilters.filter(filter => 
        filter.operator === '==' || filter.operator === 'in' || filter.operator === 'array-contains'
      );
      const clientSideFilters = extraFilters.filter(filter => 
        filter.operator !== '==' && filter.operator !== 'in' && filter.operator !== 'array-contains'
      );
      
      for (const filter of serverSideFilters) {
        constraints.push(where(filter.field, filter.operator as any, filter.value));
      }
      
      const q = query(baseQuery, ...constraints);
      if (debug) console.debug('[GeoService] Querying prefix', geoPrefix, 'constraints', constraints);
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
        if (debug) console.debug('[GeoService] Retrieved', querySnapshot.size, 'docs for prefix', geoPrefix);
      } catch (err) {
        console.error('[GeoService] Error fetching docs for prefix', geoPrefix, err);
        continue;
      }
      
      // Process results and apply client-side filters
      querySnapshot.forEach(doc => {
        const data = doc.data() as T;
        const docWithId = { id: doc.id, ...data } as T;
        
        // Apply client-side filters (like userId != currentUser)
        let passesClientFilters = true;
        for (const filter of clientSideFilters) {
          const fieldValue = (docWithId as any)[filter.field];
          switch (filter.operator) {
            case '!=':
              if (fieldValue === filter.value) passesClientFilters = false;
              break;
            case '>':
              if (fieldValue <= filter.value) passesClientFilters = false;
              break;
            case '>=':
              if (fieldValue < filter.value) passesClientFilters = false;
              break;
            case '<':
              if (fieldValue >= filter.value) passesClientFilters = false;
              break;
            case '<=':
              if (fieldValue > filter.value) passesClientFilters = false;
              break;
          }
        }
        
        if (passesClientFilters) {
          results.push(docWithId);
          lastDocument = doc as QueryDocumentSnapshot<T>;
        }
      });
      
      // Stop if we have enough results
      if (results.length >= limitCount) break;
    }
    
    // Post-process: filter by actual distance and sort
    return {
      data: this.filterByDistance(results, actualCenter, radiusInKm, limitCount),
      lastDoc: lastDocument
    };
  }
  
  /**
   * Filter locations by actual distance and sort by distance
   */
  private static filterByDistance<T extends DocumentData>(
    locations: T[],
    center: GeoPoint,
    radiusInKm: number,
    limit: number
  ): T[] {
    return locations
      .filter(loc => {
        if (!loc.position) return false;
        const position = loc.position as GeoPoint;
        const distance = this.calculateDistance(
          center.latitude,
          center.longitude,
          position.latitude,
          position.longitude
        );
        return distance <= radiusInKm;
      })
      .sort((a, b) => {
        const posA = a.position as GeoPoint;
        const posB = b.position as GeoPoint;
        const distA = this.calculateDistance(
          center.latitude,
          center.longitude,
          posA.latitude,
          posA.longitude
        );
        const distB = this.calculateDistance(
          center.latitude,
          center.longitude,
          posB.latitude,
          posB.longitude
        );
        return distA - distB;
      })
      .slice(0, limit);
  }
  
  /**
   * Calculate the distance between two points in kilometers using the Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
  
  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
