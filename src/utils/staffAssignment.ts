import type { Department } from '@/types';

/** Map DB department names to app Department values (matches authService.mapDeptName). */
export function normalizeStaffDepartment(name?: string | null): Department | undefined {
  if (!name) return undefined;
  const map: Record<string, Department> = {
    'Front Desk': 'Front Desk',
    Management: 'Front Desk',
    Housekeeping: 'Housekeeping',
    Maintenance: 'Maintenance',
    'Food & Beverage': 'Food & Beverage',
    Concierge: 'Concierge',
    'Spa & Wellness': 'Spa & Wellness',
    'Pool & Recreation': 'Concierge',
  };
  return map[name] ?? (name as Department);
}

export function staffMatchesRequestDepartment(
  staffDepartmentName: string | undefined,
  requestDepartment: Department,
): boolean {
  return normalizeStaffDepartment(staffDepartmentName) === requestDepartment;
}
