
export interface Visitor {
  id: string;
  name: string;
  idNumber: string;
  licensePlate: string;
  houseNumber: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'IN' | 'OUT';
  photo?: string;
  purpose?: string;
}

export interface VillageStats {
  totalToday: number;
  currentlyInside: number;
  totalOut: number;
}

// จะดึงจากชีตแทนในเวอร์ชันล่าสุด
export const FALLBACK_HOUSES = [
  "101/1", "101/2", "101/5", "102/10", "103/4", "105/1", "105/9"
];
