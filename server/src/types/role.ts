export type TRole = {
  role_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type TPermission = {
  permission_id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
};

export type TUserRole = {
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
};

export type TRoleWithPermissions = TRole & {
  permissions: TPermission[];
};
