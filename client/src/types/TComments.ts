export type TComment = {
  comment_id?: string;
  content: string;
  post_id?: string;
  user_id: string;
  parent_comment_id?: string;
  created_at?: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  user_name?: string;
};

export type TCommentListProps = Pick<TComment, 'post_id'>;

export type TCommentFormProps = {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  initialValue?: string;
  placeholder?: string;
  buttonText?: string;
};

export type TCommentProps = {
  comment: TComment;
  onReply: (comment_id: string, content: string) => Promise<void>;
  onUpdate: (comment_id: string, content: string) => Promise<void>;
  onDelete: (comment_id: string) => Promise<void>;
  replies?: TComment[];
  showReplies?: boolean;
};

export type TDeleteConfirmationProps = {
  isOpen: boolean;
  itemType: 'comment' | 'reply';
  onCancel: () => void;
  onConfirm: () => void;
};
