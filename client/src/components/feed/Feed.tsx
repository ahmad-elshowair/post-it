import { FC, useEffect, useRef, useState } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';
import useAuthState from '../../hooks/useAuthState';
import { usePost } from '../../hooks/usePost';
import { TFeedProps } from '../../types/TPost';
import { Post } from '../post/Post';
import { Share } from '../share/Share';
import './feed.css';

export const Feed: FC<TFeedProps> = ({ user_id }) => {
  const { isAuthChecked, user: currentUser } = useAuthState();
  const { posts, refreshPosts, pagination, isLoading } = usePost();
  const initialLoadComplete = useRef(false);
  const [postsPerPage, setPostsPerPage] = useState<number>(5);

  useEffect(() => {
    if (!isAuthChecked) return;
    const fetchData = () => {
      if (isAuthChecked && !initialLoadComplete.current && !isLoading) {
        initialLoadComplete.current = true;
        refreshPosts(user_id, undefined, false, postsPerPage);
      }
    };

    fetchData();
  }, [isAuthChecked, user_id, isLoading, refreshPosts, postsPerPage]);

  const handleLoadMore = () => {
    if (pagination.hasMore && pagination.nextCursor && !isLoading) {
      refreshPosts(user_id, pagination.nextCursor, true, postsPerPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPostsPerPage(newLimit);
    initialLoadComplete.current = false;
  };

  return (
    <section className="feed">
      {(!user_id || user_id === currentUser?.user_id) && <Share />}

      {posts.length > 0 ? (
        <article className="posts-container">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-muted ps-2">Showing {posts.length} posts</small>
            <div className="dropdown">
              <button
                type="button"
                className="btn btn-sm dropdown-toggle border-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style={{ color: 'var(--main-color)' }}
              >
                {postsPerPage} posts per page
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                {[2, 5, 10, 20].map((limit) => (
                  <li key={limit}>
                    <button
                      className={`dropdown-item ${postsPerPage === limit ? 'fw-bold' : ''}`}
                      onClick={() => handleLimitChange(limit)}
                      style={{
                        color: postsPerPage === limit ? 'var(--gray-color-0)' : '',
                        backgroundColor: postsPerPage === limit ? 'var(--main-color)' : '',
                      }}
                    >
                      {limit} Posts
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {posts.map((post) => (
            <Post key={post.post_id} {...post} />
          ))}
          {pagination.hasMore && (
            <article className="d-flex justify-content-center my-4">
              <button
                className="btn btn-outline-warning border-0 rounded-pill px-4"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </article>
          )}
        </article>
      ) : (
        <article className="card shadow-sm border-0 p-4 text-center my-3">
          <div className="card-body">
            <BsEmojiSmile className="fs-1 text-muted mb-3" />
            <h5 className="card-title mb-2">No Posts Yet</h5>
            <p className="card-text text-muted">
              {user_id && user_id !== currentUser?.user_id
                ? "This user has't shared any posts yet!"
                : 'Your Feed is empty. Follow more users or create your first post!'}
            </p>
          </div>
        </article>
      )}
    </section>
  );
};
