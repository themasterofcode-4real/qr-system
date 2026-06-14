export const USERS = {
  JOSEPHROYALTY: { name: 'Dr. Joseph Royalty, M.D., PhD', id: 4, role: 'Surgeon', department: 'Cardiology' },
  DONNASMITH: { name: 'Donna Jean Negri-Smith', id: 1, role: 'Department of Household Enforcement', department: 'Leadership' },
  GREGORYSMITH: { name: 'Gregory Vaun Smith', id: 2, role: 'Lead Recreation and Entertainment Officer', department: 'Recreation' },
  JOSEPHNEGRI: { name: 'Joseph Paul Negri Junior', id: 3, role: 'Medical and Technical Support', department: 'IT' },
} as const;
export type InternalName = keyof typeof USERS;
export type UserRecord = (typeof USERS)[InternalName];
export const DESTINATIONS = ['LIVING_ROOM','BATHROOM','MASTER_BEDROOM','KITCHEN','EXITING_HOUSE'] as const;
export type Destination = (typeof DESTINATIONS)[number];
export type ResultType = 'GRANTED' | 'DENIED';
export type LogEvent = 'STARTUP'|'SHUTDOWN'|'SCAN_ATTEMPT'|'ACCESS_GRANTED'|'ACCESS_DENIED'|'INVALID_QR'|'UNKNOWN_USER'|'ADMIN_LOGIN'|'ADMIN_LOGOUT'|'CAMERA_FAILURE'|'EMAIL_FAILURE'|'SYSTEM_ONLINE';
export type AccessLog = { id:string; timestamp:string; event:LogEvent; name?:string; userId?:number; role?:string; department?:string; destination?:Destination; result?:ResultType; reason?:string; details?:string };
export function parseQr(raw: string): { ok: true; user: UserRecord; internalName: InternalName } | { ok: false; reason: 'invalid' | 'unknown' } {
  const parts = raw.trim().split('|').reduce<Record<string,string>>((acc, p) => { const [k,...v]=p.split(':'); if(k&&v.length) acc[k.trim().toUpperCase()]=v.join(':').trim(); return acc; }, {});
  if (!parts.ID || !parts.NAME || !/^\d+$/.test(parts.ID)) return { ok:false, reason:'invalid' };
  const internalName = parts.NAME.toUpperCase() as InternalName;
  const user = USERS[internalName];
  if (!user) return { ok:false, reason:'unknown' };
  if (user.id !== Number(parts.ID)) return { ok:false, reason:'invalid' };
  return { ok:true, user, internalName };
}
export function evaluateAccess(destination: Destination, date = new Date()): { granted: boolean; reason?: string } {
  if (destination === 'KITCHEN') { const hour = date.getHours(); if (hour >= 20 || hour < 6) return { granted:false, reason:'Kitchen access restricted between 8 PM and 6 AM.' }; }
  return { granted:true };
}
export function makeLog(event: LogEvent, patch: Partial<AccessLog> = {}): AccessLog { return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), event, ...patch }; }
