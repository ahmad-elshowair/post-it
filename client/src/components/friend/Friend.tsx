import { Link } from 'react-router-dom';
import './friend.css';
export const Friend = ({
  name,
  picture,
  user_name,
}: {
  name?: string;
  picture?: string;
  user_name?: string;
}) => {
  return (
    <li className="my-3 friend">
      <Link
        className="right-bar-friends-list-friend"
        to={`/profile/${user_name}`}
        rel="noopener noreferrer"
      >
        <img src={picture} alt="profile" className="right-bar-friends-list-img" />
        <h5 className="right-bar-friends-list-text text-capitalize">{name}</h5>
      </Link>
    </li>
  );
};
