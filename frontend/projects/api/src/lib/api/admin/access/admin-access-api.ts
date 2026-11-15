import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminList,
  AdminRole,
  AdminRolesView,
  AdminRow,
  AuditPage,
  AuditQuery,
} from '../../../models/admin';

/** The audit log and Admins & roles (docs/detailed-designs/admin-access). */
export interface AdminAccessApi {
  audit(query: AuditQuery): Observable<AuditPage>;
  /** The CSV of the entries the query matches; recorded as an export (L2-120 AC4). */
  exportAudit(query: AuditQuery): Observable<Blob>;
  admins(): Observable<AdminList>;
  /** What each role can do, with the number of admins in each (L2-086 AC4). */
  roles(): Observable<AdminRolesView>;
  /** 400 `email_invalid`, `email_not_staff` or `admin_exists` on `email`; 503 `invite_not_sent`. */
  addAdmin(email: string, role: AdminRole): Observable<AdminRow>;
  /** 400 `cannot_change_own_role`; 409 `last_owner`. */
  changeRole(adminId: string, role: AdminRole, reason: string | null): Observable<AdminRow>;
  /** 400 `cannot_remove_self`; 409 `last_owner`. */
  removeAdmin(adminId: string, reason: string | null): Observable<void>;
}

export const ADMIN_ACCESS_API = new InjectionToken<AdminAccessApi>('AdminAccessApi');

function auditParams(query: AuditQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params = params.set(key, value);
  }
  return params;
}

@Injectable()
export class HttpAdminAccessApi implements AdminAccessApi {
  private readonly http = inject(HttpClient);

  audit(query: AuditQuery): Observable<AuditPage> {
    return this.http.get<AuditPage>('/api/admin/audit', { params: auditParams(query) });
  }

  exportAudit(query: AuditQuery): Observable<Blob> {
    return this.http.get('/api/admin/audit/export', {
      params: auditParams(query),
      responseType: 'blob',
    });
  }

  admins(): Observable<AdminList> {
    return this.http.get<AdminList>('/api/admin/admins');
  }

  roles(): Observable<AdminRolesView> {
    return this.http.get<AdminRolesView>('/api/admin/roles');
  }

  addAdmin(email: string, role: AdminRole): Observable<AdminRow> {
    return this.http.post<AdminRow>('/api/admin/admins', { email, role });
  }

  changeRole(adminId: string, role: AdminRole, reason: string | null): Observable<AdminRow> {
    return this.http.put<AdminRow>(`/api/admin/admins/${adminId}/role`, { role, reason });
  }

  removeAdmin(adminId: string, reason: string | null): Observable<void> {
    return this.http.post<void>(`/api/admin/admins/${adminId}/remove`, { reason });
  }
}
