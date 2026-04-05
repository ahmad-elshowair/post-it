import { FC, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaInfo } from 'react-icons/fa';
import { usePost } from '../../hooks/usePost';
import { useSecureApi } from '../../hooks/useSecureApi';
import { DeletePostModalProps } from '../../types/TPost';

const DeletePostModal: FC<DeletePostModalProps> = ({ post_id, show, onHide }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { removePost } = usePost();
  const { del, error: apiError } = useSecureApi();

  const deletePost = async () => {
    if (!post_id) {
      console.error('Cannot delete post: Missing post ID');
      return;
    }
    try {
      setIsDeleting(true);
      const response = await del<{ success: boolean }>(`/posts/delete/${post_id}`);

      if (response?.success) {
        removePost(post_id);
        onHide();
      }
    } catch (error) {
      console.error('Failed to delete post', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      onHide={onHide}
      centered
      className="border-0"
    >
      <Modal.Header closeButton className="py-2 border-0">
        <Modal.Title className="text-start w-100">Delete Post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center justify-content-center flex-column">
          <FaInfo size={80} className="text-warning mb-4" />
          <h5 className="fs-4">Are you sure?</h5>
          <p className="text-muted">
            Are you sure you want to delete this post? This cannot be undone!
          </p>
          {apiError && <p className="alert alert-danger">{apiError.getUserFriendlyMessage()}</p>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          onClick={onHide}
          className="btn btn-outline-secondary border-0"
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button onClick={deletePost} className="btn btn-danger border-0" disabled={isDeleting}>
          {isDeleting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeletePostModal;
