import { useEffect, useState } from 'react';
import {
  FaCalendarCheck,
  FaDesktop,
  FaExclamationCircle,
  FaRss,
  FaUserFriends,
  FaUsers,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import config from '../../configs';
import { useSecureApi } from '../../hooks/useSecureApi';
import { TUser } from '../../types/TUser';
import { Friend } from '../friend/Friend';
import './leftBar.css';

const LeftBar = () => {
  const [users, setUsers] = useState<TUser[]>([]);
  const { get, isLoading, error } = useSecureApi();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await get(`/users/unknowns`);
        if (response?.success) {
          const { data } = response;
          if (data) {
            setUsers(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch unknown users', error);
      }
    };
    fetchUsers();
  }, [get]);

  return (
    <aside className="sidebar">
      <section className="sidebar-content">
        <div className="list-group">
          <Link to="/" className="list-group-item list-group-item-action">
            <FaRss className="list-item-icon" />
            <span className="list-item-text">Feed</span>
          </Link>

          <Link to="#friends" className="list-group-item list-group-item-action">
            <FaUserFriends className="list-item-icon" />
            <span className="list-item-text">Friends</span>
          </Link>
          <Link to="#groups" className="list-group-item list-group-item-action">
            <FaUsers className="list-item-icon" />
            <span className="list-item-text">Groups</span>
          </Link>
          <Link to="#watch" className="list-group-item list-group-item-action">
            <FaDesktop className="list-item-icon" />
            <span className="list-item-text">Watch</span>
          </Link>

          <Link to="#events" className="list-group-item list-group-item-action">
            <FaCalendarCheck className="list-item-icon" />
            <span className="list-item-text">Events</span>
          </Link>
        </div>
        <section className="ps-3 mt-4 pb-3">
          <h4 className="">People you may know</h4>
          <hr />
          {isLoading ? (
            <div className="d-flex justify-content-center my-3 ">
              <div className="spinner-border spinner-border-sm text-warning" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger">
              <p className="d-flex align-items-center">
                <FaExclamationCircle />
                <span>Failed to load suggestions of users</span>
              </p>
            </div>
          ) : (
            <></>
          )}
          <ul className="right-bar-friends-list">
            {users.length > 0 ? (
              users.map((user) => (
                <Friend
                  key={user.user_id}
                  user_name={user.user_name}
                  name={`${user.first_name}  ${user.last_name}`}
                  picture={
                    user.picture
                      ? `${config.api_url}/images/avatars/${user.picture}`
                      : `${config.api_url}/images/no-avatar.png`
                  }
                />
              ))
            ) : (
              <li className="text-muted fst-italic p-2">No suggestions</li>
            )}
          </ul>
        </section>
      </section>
    </aside>
  );
};
export default LeftBar;
