import { useEffect, useState } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';
import config from '../../../configs';
import useAuthState from '../../../hooks/useAuthState';
import { useSecureApi } from '../../../hooks/useSecureApi';
import { TOnlineFriendProps } from '../../../types/TUser';
import { OnlineFriend } from '../../online/OnlineFriend';
import './homeRightBar.css';

export const HomeRightBar = () => {
  const { user } = useAuthState();
  const { get, isLoading, error } = useSecureApi();

  const [onlineFriends, setOnlineFriends] = useState<TOnlineFriendProps[]>([]);

  useEffect(() => {
    const fetchOnlineFriends = async () => {
      if (!user?.user_id) return;
      try {
        const response = await get(`/users/friends/${user.user_id}/?is_online=true`);

        if (response?.success && response.data) {
          setOnlineFriends(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch online friends', error);
      }
    };
    fetchOnlineFriends();
  }, [user?.user_id, get]);

  return (
    <aside className="home-right-bar pe-4">
      <section className="right-bar-friends">
        <h4 className="right-bar-friends-heading">Online Friends</h4>
        {isLoading ? (
          <div className="d-flex justify-content-center ">
            <div className="spinner-border spinner-border-sm text-warning" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <p className="d-flex align-items-center">
              <FaExclamationCircle />
              <span>Failed to load online friends</span>
            </p>
          </div>
        ) : (
          <ul className="right-bar-friends-list">
            {onlineFriends.length > 0 ? (
              onlineFriends.map((user) => (
                <OnlineFriend
                  key={user.user_id!}
                  first_name={user.first_name!}
                  picture={user.picture! || `${config.api_url}/images/no-avatar.png`}
                  user_name={user.user_name!}
                />
              ))
            ) : (
              <li className="text-muted fst-italic p-2">No friends online at the moment</li>
            )}
          </ul>
        )}
      </section>
    </aside>
  );
};
