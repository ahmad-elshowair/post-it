import { FC } from 'react';
import { Link } from 'react-router-dom';
import { TOnlineFriendProps } from '../../types/TUser';
import './onlineFriend.css';
export const OnlineFriend: FC<TOnlineFriendProps> = ({ first_name, picture, user_name }) => {
  return (
    <li className="my-3 online-friend">
      <Link
        to={`/profile/${user_name}`}
        className="right-bar-friends-list-friend"
        rel="noopener noreferrer"
      >
        <img src={picture} alt="profile" className="right-bar-friends-list-img" />
        <h5 className="right-bar-friends-list-text text-capitalize">{first_name}</h5>
      </Link>
    </li>
  );
};
