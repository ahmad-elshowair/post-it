import React from 'react';
import { Modal } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';
import { TDeleteConfirmationProps } from '../../types/TComments';

const DeleteConfirmation: React.FC<TDeleteConfirmationProps> = ({
  isOpen,
  itemType,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      show={isOpen}
      backdrop="static"
      keyboard={false}
      onHide={onCancel}
      centered
      className="border-0"
    >
      <Modal.Header closeButton className="py-2 border-0">
        <Modal.Title className="text-start w-100">
          Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex align-items-center justify-content-center flex-column">
          <FaExclamationTriangle size={80} className="text-warning mb-4" />
          <h5 className="fs-4">Are you sure?</h5>
          {itemType === 'comment' && (
            <p className="text-muted">All replies to this comment will also be deleted.</p>
          )}
          <p className="text-danger fw-bold">This action cannot be undone!</p>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button onClick={onCancel} className="btn btn-outline-secondary border-0">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn btn-danger border-0">
          Delete
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmation;
