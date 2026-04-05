import { useState } from 'react';
import { FaLaugh, FaPhotoVideo, FaVideo } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import config from '../../configs';
import useAuthState from '../../hooks/useAuthState';
import { ModalPost } from '../modalPost/ModalPost';
import './share.css';
export const Share = () => {
  const { user } = useAuthState();
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <aside className="share-post">
      <section className="input-bar">
        <Link to={`/profile/${user?.user_name}`}>
          <img
            src={
              user?.picture
                ? `${config.api_url}/images/avatars/${user.picture}`
                : `${config.api_url}/images/no-avatar.png`
            }
            alt="profile"
            className="rounded-circle"
          />
        </Link>

        <button type="button" className="btn btn-outline" onClick={handleShow}>
          what is in your mind, {user?.first_name}
        </button>
      </section>
      <hr />
      <section className="buttons-bar">
        <button type="button" className="btn">
          <FaVideo className="icon" />
          Live Video
        </button>
        <button type="button" className="btn">
          <FaPhotoVideo className="icon" /> Photo/Video
        </button>
        <button type="button" className="btn">
          <FaLaugh className="icon" /> Feeling
        </button>
      </section>
      <ModalPost handleClose={handleClose} show={show} />
    </aside>
  );
};
