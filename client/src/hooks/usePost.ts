import usePostStore from '../stores/usePostStore';

export const usePost = () => {
  const posts = usePostStore((s) => s.posts);
  const pagination = usePostStore((s) => s.pagination);
  const isLoading = usePostStore((s) => s.isLoading);
  const addPost = usePostStore((s) => s.addPost);
  const removePost = usePostStore((s) => s.removePost);
  const refreshPosts = usePostStore((s) => s.refreshPosts);
  const setPosts = usePostStore((s) => s.setPosts);

  return {
    posts,
    pagination,
    isLoading,
    addPost,
    removePost,
    refreshPosts,
    setPosts,
  };
};
