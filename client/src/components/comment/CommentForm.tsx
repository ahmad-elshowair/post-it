import { FC, FormEvent, useEffect, useState } from 'react';
import { FaLocationArrow } from 'react-icons/fa';
import { TCommentFormProps } from '../../types/TComments';

const CommentForm: FC<TCommentFormProps> = ({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Write a comment...',
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentChanged, setContentChanged] = useState(false);

  useEffect(() => {
    setContentChanged(content.trim() !== initialValue.trim());
  }, [content, initialValue]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!content.trim() || (initialValue && !contentChanged)) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content);
      if (!initialValue) {
        setContent('');
      }
    } catch (error) {
      console.error('Error Submitting a comment: ', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || !content.trim() || (initialValue && !contentChanged);
  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <div className="position-relative">
        <textarea
          className="form-control mb-2"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={2}
          disabled={isSubmitting}
        />

        <button
          type="submit"
          className={`btn position-absolute send-button ${isDisabled ? 'btn-disabled' : ''}`}
          disabled={isDisabled as boolean}
        >
          {isSubmitting ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          ) : (
            <FaLocationArrow className="icon" />
          )}
        </button>
      </div>
      {onCancel && (
        <div className="d-flex justify-content-end mt-2">
          <button
            type="button"
            className="btn btn-sm border-0"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
};

export default CommentForm;
