import { AxiosError } from "axios";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createSecureApi } from "../hooks/useSecureApi";
import { getCsrf, syncAllAuthTokensFromCookies } from "../services/storage";
import { TPagination, TPost } from "../types/TPost";

interface PostState {
  posts: TPost[];
  pagination: TPagination;
  isLoading: boolean;
}

interface PostActions {
  setPosts: (posts: TPost[]) => void;
  addPost: (newPost: TPost) => void;
  removePost: (post_id: string) => void;
  refreshPosts: (
    user_id?: string,
    cursor?: string,
    append?: boolean,
    limit?: number,
  ) => Promise<void>;
}

const usePostStore = create<PostState & PostActions>()(
  immer((set) => ({
    posts: [],
    pagination: {
      hasMore: false,
      nextCursor: undefined,
      previousCursor: undefined,
    },
    isLoading: false,

    setPosts: (posts) =>
      set((state) => {
        state.posts = posts;
      }),

    addPost: (newPost) =>
      set((state) => {
        state.posts.unshift(newPost);
      }),

    removePost: (post_id) =>
      set((state) => {
        state.posts = state.posts.filter((post) => post.post_id !== post_id);
      }),

    refreshPosts: async (user_id?, cursor?, append?, limit?) => {
      set((state) => {
        state.isLoading = true;
      });

      syncAllAuthTokensFromCookies();

      const csrf = getCsrf();
      if (!csrf) {
        console.error("CSRF token not found");
        set((state) => {
          state.isLoading = false;
        });
        return;
      }

      try {
        const { get } = createSecureApi();
        const params = new URLSearchParams();

        if (cursor) params.append("cursor", cursor);
        if (limit) params.append("limit", limit.toString());

        const queryString = params.toString() ? `?${params.toString()}` : "";

        const endpoint = user_id
          ? `/posts/user/${user_id}${queryString}`
          : `/posts/feed${queryString}`;

        const response = await get<{
          data: TPost[];
          pagination: TPagination;
        }>(endpoint);

        if (!response?.data) {
          console.error("Failed to fetch posts");
          set((state) => {
            state.isLoading = false;
          });
          return;
        }

        const { data, pagination: paginationData } = response;

        set((state) => {
          if (append && cursor) {
            const existingPostIds = new Set(
              state.posts.map((post) => post.post_id),
            );

            const uniquePosts = data.filter(
              (post: TPost) => !existingPostIds.has(post.post_id),
            );

            const duplicatesCount = data.length - uniquePosts.length;
            if (duplicatesCount > 0) {
              console.log(`Filtered out ${duplicatesCount} duplicate posts`);
            }

            state.posts.push(...uniquePosts);
          } else {
            state.posts = data;
          }

          state.pagination = paginationData;
          state.isLoading = false;
        });
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error("Error data:", axiosError.response.data);
          console.error("Error status:", axiosError.response.status);
        }
        set((state) => {
          state.isLoading = false;
        });
      }
    },
  })),
);

export default usePostStore;
