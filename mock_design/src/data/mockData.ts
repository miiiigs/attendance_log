import type { Person, AttendanceRecord } from '../types';

export function generateUsername(firstName: string, lastName: string): string {
  const f = firstName.toLowerCase().replace(/\s/g, '');
  const l = lastName.toLowerCase().replace(/\s/g, '').slice(0, 8);
  return `${f[0]}${l}`;
}

export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function getFullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

export const TODAY = '2026-08-16';

export const INITIAL_PEOPLE: Person[] = [
  { id: '1', username: 'jdelacruz', firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan.delacruz@company.com', status: 'Active', createdAt: '2025-03-01' },
  { id: '2', username: 'msantos', firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@company.com', status: 'Active', createdAt: '2025-03-01' },
  { id: '3', username: 'preyes', firstName: 'Pedro', lastName: 'Reyes', email: 'pedro.reyes@company.com', status: 'Inactive', createdAt: '2025-03-05' },
  { id: '4', username: 'acruz', firstName: 'Anna', lastName: 'Cruz', email: 'anna.cruz@company.com', status: 'Active', createdAt: '2025-03-08' },
  { id: '5', username: 'kgarcia', firstName: 'Kevin', lastName: 'Garcia', email: 'kevin.garcia@company.com', status: 'Active', createdAt: '2025-03-10' },
  { id: '6', username: 'pmendoza', firstName: 'Paolo', lastName: 'Mendoza', email: 'paolo.mendoza@company.com', status: 'Active', createdAt: '2025-03-12' },
  { id: '7', username: 'acruz2', firstName: 'Angela', lastName: 'Cruz', email: 'angela.cruz@company.com', status: 'Active', createdAt: '2025-03-14' },
  { id: '8', username: 'mbautista', firstName: 'Michael', lastName: 'Bautista', email: 'michael.bautista@company.com', status: 'Active', createdAt: '2025-03-18' },
  { id: '9', username: 'sramos', firstName: 'Sofia', lastName: 'Ramos', email: 'sofia.ramos@company.com', status: 'Active', createdAt: '2025-03-20' },
  { id: '10', username: 'dflores', firstName: 'Daniel', lastName: 'Flores', email: 'daniel.flores@company.com', status: 'Active', createdAt: '2025-03-22' },
  { id: '11', username: 'paquino', firstName: 'Patricia', lastName: 'Aquino', email: 'patricia.aquino@company.com', status: 'Active', createdAt: '2025-04-01' },
  { id: '12', username: 'jvillanueva', firstName: 'Jose', lastName: 'Villanueva', email: 'jose.villanueva@company.com', status: 'Active', createdAt: '2025-04-03' },
  { id: '13', username: 'ctorres', firstName: 'Carla', lastName: 'Torres', email: 'carla.torres@company.com', status: 'Active', createdAt: '2025-04-07' },
  { id: '14', username: 'rcastillo', firstName: 'Ramon', lastName: 'Castillo', email: 'ramon.castillo@company.com', status: 'Active', createdAt: '2025-04-10' },
  { id: '15', username: 'lgonzales', firstName: 'Liza', lastName: 'Gonzales', email: 'liza.gonzales@company.com', status: 'Active', createdAt: '2025-04-12' },
  { id: '16', username: 'mdelosreyes', firstName: 'Mark', lastName: 'Delos Reyes', email: 'mark.delosreyes@company.com', status: 'Active', createdAt: '2025-04-15' },
  { id: '17', username: 'jnavarro', firstName: 'Jasmine', lastName: 'Navarro', email: 'jasmine.navarro@company.com', status: 'Active', createdAt: '2025-04-18' },
  { id: '18', username: 'rsalazar', firstName: 'Roberto', lastName: 'Salazar', email: 'roberto.salazar@company.com', status: 'Inactive', createdAt: '2025-05-02' },
  { id: '19', username: 'cenriquez', firstName: 'Cristina', lastName: 'Enriquez', email: 'cristina.enriquez@company.com', status: 'Active', createdAt: '2025-05-05' },
  { id: '20', username: 'focampo', firstName: 'Francis', lastName: 'Ocampo', email: 'francis.ocampo@company.com', status: 'Active', createdAt: '2025-05-08' },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', personId: '1', date: TODAY, timeIn: '8:02 AM', timeOut: '5:04 PM', status: 'Completed' },
  { id: 'a2', personId: '2', date: TODAY, timeIn: '8:11 AM', timeOut: null, status: 'Late' },
  { id: 'a3', personId: '3', date: TODAY, timeIn: null, timeOut: null, status: 'Not Yet Logged' },
  { id: 'a4', personId: '4', date: TODAY, timeIn: '7:56 AM', timeOut: '5:01 PM', status: 'Completed' },
  { id: 'a5', personId: '5', date: TODAY, timeIn: '7:58 AM', timeOut: null, status: 'On Time' },
  { id: 'a6', personId: '6', date: TODAY, timeIn: '8:00 AM', timeOut: '5:05 PM', status: 'Completed' },
  { id: 'a7', personId: '7', date: TODAY, timeIn: '8:18 AM', timeOut: null, status: 'Late' },
  { id: 'a8', personId: '8', date: TODAY, timeIn: '8:03 AM', timeOut: null, status: 'On Time' },
  { id: 'a9', personId: '9', date: TODAY, timeIn: '8:07 AM', timeOut: '5:00 PM', status: 'Completed' },
  { id: 'a10', personId: '10', date: TODAY, timeIn: null, timeOut: null, status: 'Not Yet Logged' },
  { id: 'a11', personId: '11', date: TODAY, timeIn: '7:55 AM', timeOut: '5:10 PM', status: 'Completed' },
  { id: 'a12', personId: '12', date: TODAY, timeIn: '8:00 AM', timeOut: null, status: 'On Time' },
  { id: 'a13', personId: '13', date: TODAY, timeIn: '8:22 AM', timeOut: null, status: 'Late' },
  { id: 'a14', personId: '14', date: TODAY, timeIn: '7:50 AM', timeOut: '5:15 PM', status: 'Completed' },
  { id: 'a15', personId: '15', date: TODAY, timeIn: '8:04 AM', timeOut: null, status: 'On Time' },
  { id: 'a16', personId: '16', date: TODAY, timeIn: null, timeOut: null, status: 'Not Yet Logged' },
  { id: 'a17', personId: '17', date: TODAY, timeIn: '8:01 AM', timeOut: '5:02 PM', status: 'Completed' },
  { id: 'a18', personId: '18', date: TODAY, timeIn: null, timeOut: null, status: 'Not Yet Logged' },
  { id: 'a19', personId: '19', date: TODAY, timeIn: '7:59 AM', timeOut: null, status: 'On Time' },
  { id: 'a20', personId: '20', date: TODAY, timeIn: '8:33 AM', timeOut: null, status: 'Late' },
];

export const WEEKLY_DATA = [
  { day: 'Mon', date: 'Aug 11', count: 16 },
  { day: 'Tue', date: 'Aug 12', count: 17 },
  { day: 'Wed', date: 'Aug 13', count: 18 },
  { day: 'Thu', date: 'Aug 14', count: 17 },
  { day: 'Fri', date: 'Aug 15', count: 16 },
  { day: 'Sat', date: 'Aug 16', count: 4 },
  { day: 'Sun', date: 'Aug 17', count: 0 },
];

export const PERSON_RECENT_ATTENDANCE: AttendanceRecord[] = [
  { id: 'h1', personId: '1', date: '2026-08-16', timeIn: '8:02 AM', timeOut: '5:04 PM', status: 'Completed' },
  { id: 'h2', personId: '1', date: '2026-08-15', timeIn: '8:05 AM', timeOut: '5:01 PM', status: 'Completed' },
  { id: 'h3', personId: '1', date: '2026-08-14', timeIn: '8:15 AM', timeOut: '5:03 PM', status: 'Late' },
  { id: 'h4', personId: '1', date: '2026-08-13', timeIn: '7:58 AM', timeOut: '5:00 PM', status: 'Completed' },
  { id: 'h5', personId: '1', date: '2026-08-12', timeIn: '8:01 AM', timeOut: '5:02 PM', status: 'Completed' },
  { id: 'h6', personId: '1', date: '2026-08-11', timeIn: null, timeOut: null, status: 'Not Yet Logged' },
  { id: 'h7', personId: '1', date: '2026-08-08', timeIn: '7:55 AM', timeOut: '5:00 PM', status: 'Completed' },
];
