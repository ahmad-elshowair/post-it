import { FC } from 'react';
import { Link } from 'react-router-dom';
import config from '../../../../configs';
import { TFriendsCardProps } from '../../../../types/TUser';
import './friendCard.css';

export const FriendCard: FC<TFriendsCardProps> = ({
  picture,
  first_name,
  user_name,
  is_online,
}) => {
  return (
    <Link to={`/profile/${user_name}`} className="friend-profile">
      <div className="friend-card d-flex flex-column align-items-center">
        <div className="friend-card__image mb-1 position-relative">
          <img
            className="img-thumbnail"
            src={
              picture
                ? `${config.api_url}/images/avatars/${picture}`
                : `${config.api_url}/images/no-avatar.png`
            }
            alt="avatar"
            height={80}
            width={80}
          />
          {is_online && (
            <span
              className="position-absolute rounded-circle bg-warning"
              style={{
                width: '20px',
                height: '20px',
                top: '0',
                left: '0',
              }}
            ></span>
          )}
        </div>
        <div className="friend-card__info">
          <h5 className="friend-card__name m-0 fs-6 text-capitalize">{first_name}</h5>
        </div>
      </div>
    </Link>
  );
};
