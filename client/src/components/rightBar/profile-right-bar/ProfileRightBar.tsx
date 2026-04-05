import { FC, useEffect, useState } from 'react';
import { FaExclamationCircle, FaHome, FaMapMarkerAlt, FaRegGrinHearts } from 'react-icons/fa';
import { useSecureApi } from '../../../hooks/useSecureApi';
import { TFriendsCardProps, TProfileRightBarProps } from '../../../types/TUser';
import { FriendCard } from './friendCard/FriendCard';
import './profileRightBar.css';

const ProfileRightBar: FC<TProfileRightBarProps> = ({
  user_id,
  bio,
  city,
  home_town,
  marital_status,
}) => {
  const [friends, setFriends] = useState<TFriendsCardProps[]>([]);
  const { get, isLoading, error } = useSecureApi();

  useEffect(() => {
    const getFriends = async () => {
      if (!user_id) return;
      try {
        const response = await get(`/users/friends/${user_id}?is_online=false`);
        if (response?.success && response.data) {
          setFriends(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch friends', error);
      }
    };
    getFriends();
  }, [user_id, get]);

  return (
    <section className="profile-right-bar mb-3">
      <h3 className="bio-header">Bio</h3>
      <article className="right-bar-bio mb-3">
        <p className="bio-text ps-3 m-0">{bio || 'No Bio!'}</p>
      </article>

      <h3 className="info-header">Info</h3>
      <article className="right-bar-info mb-3">
        <div className="d-flex flex-column ps-3">
          <p className="info-box">
            <span className="info-key">
              <FaHome />
            </span>
            <span className="info-value">{city || 'No City!'}</span>
          </p>

          <p className="info-box">
            <span className="info-key">
              <FaMapMarkerAlt />
            </span>
            <span className="info-value">{home_town || 'No Hometown!'}</span>
          </p>
          <p className="m-0 info-box">
            <span className="info-key">
              <FaRegGrinHearts />
            </span>
            <span className="info-value">{marital_status || 'No Marital Status!'}</span>
          </p>
        </div>
      </article>
      <h3 className="friends-header">Friends</h3>
      <article className="right-bar__friends d-flex justify-content-center align-items-center">
        {isLoading ? (
          <div className="d-flex justify-content-center ">
            <div className="spinner-border spinner-border-sm text-warning" role="status">
              <span className="visually-hidden">Loading Friends...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <p className="d-flex align-items-center">
              <FaExclamationCircle />
              <span>Failed to load friends</span>
            </p>
          </div>
        ) : friends.length > 0 ? (
          <div className="d-flex flex-wrap gap-2">
            {friends.map((friend) => (
              <FriendCard key={friend?.user_id} {...friend} />
            ))}
          </div>
        ) : (
          <h5 className="m-0 text-muted">No friends yet</h5>
        )}
      </article>
    </section>
  );
};
export default ProfileRightBar;
