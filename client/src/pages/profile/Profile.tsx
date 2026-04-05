import { useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { Feed } from '../../components/feed/Feed';
import LeftBar from '../../components/leftBar/leftBar';
import ProfileRightBar from '../../components/rightBar/profile-right-bar/ProfileRightBar';
import { Topbar } from '../../components/topbar/Topbar';
import config from '../../configs';
import useAuthState from '../../hooks/useAuthState';
import useAuthVerification from '../../hooks/useAuthVerification';
import { useSecureApi } from '../../hooks/useSecureApi';
import { TUser } from '../../types/TUser';
import './profile.css';

export const Profile = () => {
  const { user_name } = useParams<{ user_name: string }>();
  const navigate = useNavigate();

  const { checkAuthStatus } = useAuthVerification();
  const { user: currentUser } = useAuthState();
  const { get, post, del, isLoading: apiLoading, error } = useSecureApi();

  const [user, setUser] = useState<TUser | null>(null);
  const [isFollowed, setIsFollowed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);

  // CHECK AUTHENTICATION STATUS BEFORE MAKING AUTHENTICATED REQUESTS.
  useEffect(() => {
    const verifyUserAuth = async () => {
      try {
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated && !currentUser) {
          console.warn(' User not Authenticated, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth verification failed: ', error);
      } finally {
        setAuthChecked(true);
      }
    };

    if (!authChecked) {
      verifyUserAuth();
    }
  }, [navigate, currentUser, checkAuthStatus, authChecked]);

  const fetchAUser = useCallback(async () => {
    if (!user_name || !authChecked) {
      console.error('Missing user name or auth check not completed');
      return;
    }

    try {
      setIsLoading(true);
      const response = await get(`/users/${user_name}`);
      console.log('API RESPONSE', response);

      if (response?.success) {
        console.log('Setting user data:', response.data);

        const { data } = response;
        if (data) {
          setUser(data);
        }
      }
    } catch (error) {
      console.error(`Error Fetching user: ${error}`);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [user_name, authChecked, get]);

  const checkIsFollowed = useCallback(async () => {
    if (!user?.user_id || !authChecked || !currentUser || followCheckDone) {
      console.debug('Cannot check follow status - missing data:', {
        hasAuthBeenVerified: authChecked,
        hasUser: Boolean(user),
        hasToken: Boolean(currentUser),
        hasUserID: Boolean(user?.user_id),
        alreadyChecked: followCheckDone,
      });
      return;
    }

    // IF THE USER VIEWING THEIR PROFILE, SKIP THE FOLLOW CHECK.
    if (currentUser.user_id === user.user_id) {
      setFollowCheckDone(true);
      return;
    }

    try {
      const response = await get(`/follows/is-followed/${user.user_id}`);
      if (response?.success) {
        const { data } = response;
        if (data) {
          setIsFollowed(data);
          setFollowCheckDone(true);
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowed(false);
      setFollowCheckDone(true);
    }
  }, [currentUser, authChecked, user, followCheckDone, get]);

  const handleFollow = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isFollowed) {
        // UNFOLLOW USER
        const response = await del('/follows/unfollow', {
          data: { user_id_followed: user?.user_id },
        });

        if (response?.success) {
          setIsFollowed(false);

          // UPDATE FOLLOWER COUNT UI
          setUser((prevUser) => {
            if (prevUser) {
              return {
                ...prevUser,
                number_of_followers: Math.max(0, (prevUser.number_of_followers || 0) - 1),
              };
            }
            return prevUser;
          });
        }
      } else {
        // FOLLOW USER
        const response = await post('/follows/follow', {
          user_id_followed: user?.user_id,
        });

        if (response?.success) {
          setIsFollowed(true);

          // UPDATE FOLLOWER COUNT UI
          setUser((prevUser) => {
            if (prevUser) {
              return {
                ...prevUser,
                number_of_followers: Math.max(0, (prevUser.number_of_followers || 0) + 1),
              };
            }
            return prevUser;
          });
        }
      }
    } catch (error) {
      console.error(`Error updating follow status:`, error);
      // RESET FOLLOW CHECK STATUS TO FORCE A RE-CHECK.
      setFollowCheckDone(false);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowed, user, post, del]);

  // AUTOMATICALLY FETCH A USER WHEN AUTH IS CHECKED.
  useEffect(() => {
    if (authChecked) {
      fetchAUser();
    }
  }, [fetchAUser, authChecked]);

  // AUTOMATICALLY CHECK IF THE USER IS FOLLOWED WHEN USER DATA IS AVAILABLE.
  useEffect(() => {
    if (currentUser && user && authChecked && !followCheckDone) {
      checkIsFollowed();
    }
  }, [checkIsFollowed, currentUser, user, authChecked, followCheckDone]);

  const profileImageSrc = useMemo(() => {
    return user?.picture
      ? `${config.api_url}/images/avatars/${user?.picture}`
      : `${config.api_url}/images/no-avatar.png`;
  }, [user?.picture]);

  const CoverImageSrc = useMemo(() => {
    return user?.cover
      ? `${config.api_url}/images/avatars/${user?.cover}`
      : `${config.api_url}/images/no-cover.png`;
  }, [user?.cover]);

  if (!user) {
    return (
      <>
        <Topbar />
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: '80vh' }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">NO USER FOUND.</span>
          </div>
        </div>
        x
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Topbar />
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: '80vh' }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar />
      <section className="profile-container">
        <LeftBar />
        <section className="profile-right d-flex flex-column">
          <section className="profile-right-top">
            <figure className="profile-cover-container">
              <img height={370} width={'100%'} src={CoverImageSrc} alt="cover" />
            </figure>
            <article className="profile-info mb-3">
              <figure className="profile-image-container">
                <img className="profile-image" src={profileImageSrc} alt="profile" />
              </figure>
              <section className="d-flex flex-column">
                <h1 className="profile-info-name m-0 text-capitalize">{`${user?.first_name} ${user?.last_name}`}</h1>
                <span className="profile-info-username">@{user?.user_name}</span>
              </section>
              <article className="d-flex gap-3 follow-box">
                <div className="d-flex flex-column align-items-center">
                  <h6 className="fst-italic fw-bold">followings</h6>
                  <span>{user?.number_of_followings}</span>
                </div>
                <div className="d-flex flex-column align-items-center">
                  <h6 className="fst-italic fw-bold">followers</h6>
                  <span>{user?.number_of_followers}</span>
                </div>
              </article>
              {user?.user_name !== currentUser?.user_name && (
                <button
                  className={`${isFollowed ? 'follow-btn' : 'btn-post'}`}
                  onClick={handleFollow}
                  disabled={isLoading || apiLoading}
                >
                  {isLoading || apiLoading ? (
                    <>
                      <Spinner animation="border" variant="light" />
                    </>
                  ) : isFollowed ? (
                    'Unfollow'
                  ) : (
                    'Follow'
                  )}
                </button>
              )}
              {error && <p className="text-danger mt-2">{error.getUserFriendlyMessage()}</p>}
            </article>
          </section>
          <section className="profile-right-bottom d-flex">
            <Feed user_id={user?.user_id} />
            <ProfileRightBar {...user} />
          </section>
        </section>
      </section>
    </>
  );
};
