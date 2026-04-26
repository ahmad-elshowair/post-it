export interface IFeedPost {
  post_id?: string;
  description?: string;
  updated_at?: Date;
  image?: string;
  number_of_likes?: number;
  number_of_comments?: number;
  user_id?: string;
  user_name?: string;
  picture?: string;
  first_name?: string;
  last_name?: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}
