export type PersonStatus = 'Active' | 'Inactive';
export type AttendanceStatus = 'On Time' | 'Late' | 'Not Yet Logged' | 'Completed';
export type Page = 'dashboard' | 'attendance' | 'people' | 'qr' | 'settings';

export interface Person {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  status: PersonStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: AttendanceStatus;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface QRState {
  active: boolean;
  generatedAt: string | null;
  expiresAt: string | null;
  seed: number;
}
