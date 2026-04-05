import AuthModel from '../models/auth.js';
import CommentModel from '../models/comments.js';
import FollowModel from '../models/follow.js';
import LikeModel from '../models/like.js';
import PostModel from '../models/post.js';
import RefreshTokenModel from '../models/refreshToken.js';
import UserModel from '../models/user.js';

const post_model = new PostModel();
const user_model = new UserModel();
const comment_model = new CommentModel();
const like_model = new LikeModel();
const follow_model = new FollowModel();
const auth_model = new AuthModel();
const refresh_token_model = new RefreshTokenModel();

export {
  auth_model,
  comment_model,
  follow_model,
  like_model,
  post_model,
  refresh_token_model,
  user_model,
};
