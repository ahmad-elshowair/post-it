import { FC, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { BsPencil, BsThreeDots, BsTrash } from 'react-icons/bs';
import { Link } from 'react-router-dom';
import configs from '../../configs';
import useAuthState from '../../hooks/useAuthState';
import { TCommentProps } from '../../types/TComments';
import { formatRelativeTime } from '../../utils/dateUtils';
import CommentForm from './CommentForm';
import DeleteConfirmation from './DeleteConfirmation';

const Comment: FC<TCommentProps> = ({
  comment,
  onReply,
  onUpdate,
  onDelete,
  showReplies = false,
  replies = [],
}) => {
  const { user } = useAuthState();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyList, setShowReplyList] = useState(showReplies);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const directReplies = replies.filter((r) => r.parent_comment_id === comment.comment_id);
  const hasReplies = directReplies.length > 0;

  const handleSubmitReply = async (content: string) => {
    await onReply(comment.comment_id!, content);
    setIsReplying(false);
  };

  const handleSubmitEdit = async (content: string) => {
    await onUpdate(comment.comment_id!, content);
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = () => {
    onDelete(comment.comment_id!);
    setShowDeleteModal(false);
  };

  const toggleReplyList = () => {
    setShowReplyList(!showReplyList);
  };

  const formattedDate = formatRelativeTime(comment.updated_at!);

  return (
    <div className="d-flex mb-3">
      <div className="me-2">
        <Link to={`/profile/${comment.user_name}`}>
          <img
            src={
              comment.picture
                ? `${configs.api_url}/images/avatars/${comment.picture}`
                : `${configs.api_url}/images/no-avatar.png`
            }
            alt={`${comment.first_name} ${comment.last_name} avatar`}
            className="comment-avatar"
          />
        </Link>
      </div>

      <div className="flex-grow-1">
        <div className="comment-bubble">
          {!isEditing ? (
            <>
              <div className="comment-header">
                <Link
                  to={`/profile/${comment.user_name}`}
                  className="comment-author text-capitalize fw-bold"
                >
                  {comment.first_name} {comment.last_name}
                </Link>
              </div>
              <p className="comment-content m-0">{comment.content}</p>
            </>
          ) : (
            <CommentForm
              initialValue={comment.content}
              onSubmit={handleSubmitEdit}
              onCancel={() => setIsEditing(false)}
            />
          )}
        </div>

        <div className="d-flex align-items-center mt-1">
          <div className="comment-actions">
            {!isEditing && !isReplying && (
              <>
                <button
                  className="btn btn-sm text-muted p-0 me-2 border-0"
                  onClick={() => setIsReplying(true)}
                >
                  Reply
                </button>
                <span className="text-muted small comment-date"> {formattedDate}</span>
              </>
            )}
          </div>
          {!isEditing && !isReplying && user?.user_id === comment.user_id && (
            <div className="ms-auto">
              <Dropdown align="end">
                <Dropdown.Toggle as="button" className="btn btn-sm p-o bg-transparent border-0">
                  <BsThreeDots className="text-muted fw-bold" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setIsEditing(true)}>
                    <BsPencil className="me-2 text-success fs-5" />
                    <span className="small text-success fw-bold">Edit</span>
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleDeleteClick} className="text-danger">
                    <BsTrash className="me-2 text-danger fs-5" />
                    <span className="small text-danger fw-bold">Delete</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}
        </div>

        {isReplying && (
          <div className="mt-2">
            <CommentForm
              onSubmit={handleSubmitReply}
              onCancel={() => setIsReplying(false)}
              placeholder="Write a reply..."
            />
          </div>
        )}

        {hasReplies && (
          <div className="comment-replies mt-2">
            {!showReplyList && (
              <button className="btn btn-sm text-warning p-0 border-0" onClick={toggleReplyList}>
                View {directReplies.length} {directReplies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}

            {showReplyList && (
              <>
                <button
                  className="btn btn-sm text-warning p-0 mb-2 border-0"
                  onClick={toggleReplyList}
                >
                  Hide replies
                </button>
                <div className="replies-container">
                  {directReplies.map((reply) => (
                    <Comment
                      key={reply.comment_id}
                      comment={reply}
                      onReply={onReply}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      replies={replies}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <DeleteConfirmation
        isOpen={showDeleteModal}
        itemType={comment.parent_comment_id ? 'reply' : 'comment'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default Comment;
