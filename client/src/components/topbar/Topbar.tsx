import { FaBell, FaComment, FaHome, FaSearch, FaSignOutAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import config from '../../configs';
import useAuthState from '../../hooks/useAuthState';
import { logoutUser } from '../../services/auth';
import './topbar.css';

export const Topbar = () => {
  const { user } = useAuthState();

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <nav className="navbar fixed-top">
      <section className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src={`${config.api_url}/images/post_it.png`} alt="Post It logo" height={60} />
        </Link>
        <form role="search" className="nav-search">
          <FaSearch className="ms-3" />
          <input
            type="search"
            aria-label="search"
            placeholder="search post it"
            className="form-control"
          />
        </form>
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link active" aria-current="page" href="/">
              <FaHome />
            </a>
            <span className="icon-badge">1</span>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#notifications">
              <FaBell />
            </a>
            <span className="icon-badge">1</span>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#messages">
              <FaComment />
            </a>
            <span className="icon-badge">1</span>
          </li>
        </ul>
        <article className="dropdown">
          <figure
            className="avatar dropdown-toggle"
            id="profileDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <img
              height={36}
              width={36}
              alt="avatar"
              src={
                user?.picture
                  ? `${config.api_url}/images/avatars/${user.picture}`
                  : `${config.api_url}/images/no-avatar.png`
              }
              className="rounded-circle"
            />
          </figure>
          <ul
            className="dropdown-menu shadow-sm border-0 dropdown-menu-end gap-1"
            aria-labelledby="profileDropdown"
          >
            <li>
              <Link className="dropdown-item" to={`/profile/${user?.user_name} `}>
                <div className="d-flex align-content-center">
                  <img
                    height={30}
                    width={30}
                    alt="avatar"
                    src={
                      user?.picture
                        ? `${config.api_url}/images/avatars/${user.picture}`
                        : `${config.api_url}/images/no-avatar.png`
                    }
                    className="rounded-circle me-2"
                  />
                  <span className="fw-bold text-capitalize">
                    {user?.first_name} {user?.last_name}
                  </span>
                </div>
              </Link>
            </li>
            <li className="">
              <button
                type="button"
                className="dropdown-item d-flex justify-content-between"
                onClick={handleLogout}
              >
                <span className="text-secondary fw-medium">Logout</span>
                <FaSignOutAlt className="ms-2" />
              </button>
            </li>
          </ul>
        </article>
      </section>
    </nav>
  );
};
