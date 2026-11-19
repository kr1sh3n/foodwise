export type Role = 'PROVIDER' | 'STUDENT' | 'NGO';
export type Category = 'MEALS' | 'BAKERY' | 'SNACKS' | 'FRUITS_VEG' | 'DAIRY' | 'BEVERAGES' | 'DESSERTS';
export type Dietary = 'VEG' | 'NON_VEG' | 'VEGAN';
export type ListingStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED';

export interface User { id: string; name: string; email: string; role: Role; organization: string | null; phone: string | null; campus: string | null; createdAt: string }
export interface ProviderMini { id: string; name: string; organization: string | null; campus: string | null }
export interface Listing {
  id: string; providerId: string; provider?: ProviderMini; title: string; description: string; category: Category; dietary: Dietary;
  imageUrl: string | null; quantity: number; remaining: number; unit: string; kgPerUnit: number; preparedAt: string; pickupLocation: string;
  deadline: string; status: ListingStatus; createdAt: string; _count?: { requests: number };
}
export interface FoodRequest {
  id: string; listingId: string; requesterId: string; quantity: number; message: string | null; status: RequestStatus; pickupCode: string;
  createdAt: string; decidedAt: string | null; collectedAt: string | null;
  listing?: Pick<Listing, 'id' | 'title' | 'imageUrl' | 'category' | 'unit' | 'pickupLocation' | 'deadline' | 'status' | 'remaining' | 'kgPerUnit' | 'providerId'> & { provider: { name: string; organization: string | null } };
  requester?: { id: string; name: string; role: Role; organization: string | null; campus: string | null };
}
export interface Notification { id: string; type: string; title: string; body: string; link: string | null; read: boolean; createdAt: string }
export interface Impact {
  totals: { meals: number; kg: number; co2: number; collections: number; vendors: number; recipients: number; activeListings: number; totalListings: number; expiredListings: number; rescueRate: number };
  weekly: { week: string; meals: number; kg: number; co2: number }[];
  byCategory: { category: Category; meals: number; kg: number }[];
  co2PerKg: number;
}
export interface LeaderRow { id: string; name: string; organization: string | null; campus: string | null; role?: Role; rank: number; meals: number; kg: number; co2: number; pickups: number; listings: number; points: number }
