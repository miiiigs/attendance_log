export type MobileScreen = 'home' | 'scan' | 'history' | 'profile';

export interface MobileEmployee {
  id: string;
  name: string;
  username: string;
  email: string;
  department: string;
  status: 'active' | 'inactive';
}

export interface MobileAttendanceRecord {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: 'present' | 'late' | 'absent';
}

export interface ScanResult {
  type: 'in' | 'out';
  time: string;
  date: string;
}
