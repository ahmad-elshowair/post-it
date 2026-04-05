export type TUser = {
  user_id?: string;
  user_name: string;
  email: string;
  password: string;
  picture?: string;
  cover?: string;
  is_admin?: boolean;
  bio?: string;
  city?: string;
  home_town?: string;
  created_at?: Date;
  updated_at?: Date;
  first_name: string;
  last_name: string;
  is_online?: boolean;
  number_of_followers?: number;
  number_of_followings?: number;
  marital_status?: string;
};

export type TLoginCredentials = Pick<TUser, 'email' | 'password'>;

export type TUnknownUser = Pick<
  TUser,
  'user_id' | 'picture' | 'first_name' | 'last_name' | 'user_name'
>;

export type TFriend = Pick<
  TUser,
  | 'user_id'
  | 'user_name'
  | 'picture'
  | 'first_name'
  | 'last_name'
  | 'is_online'
  | 'number_of_followers'
  | 'number_of_followings'
  | 'bio'
  | 'marital_status'
>;

export type TRegisterCredentials = Omit<
  TUser,
  | 'user_id'
  | 'created_at'
  | 'updated_at'
  | 'picture'
  | 'cover'
  | 'is_admin'
  | 'number_of_followers'
  | 'number_of_followings'
  | 'marital_status'
  | 'home_town'
  | 'city'
  | 'bio'
>;
export type TOnlineUser = {
  user_id?: string;
  first_name?: string;
  picture?: string;
};
