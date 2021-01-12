import React, { FunctionComponent } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { from, Observable } from 'rxjs';

interface ImportFileProps {
  show: boolean;
  onCancel?: () => void
  onSelect?: (arg: Observable<string>) => void;
};

/**
 * 
 */
export const ImportFile: FunctionComponent<ImportFileProps> = ({ show, onCancel, onSelect }) => {

  function onFileChange(file: Blob) {
    if (onSelect) {
      onSelect(from(file.text()));
    }
  }

  return (
    <Modal size="lg" show={show} onHide={() => { if (onCancel) { onCancel(); } }}>
      <Modal.Header closeButton>
        <Modal.Title>Import definitions from file ?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>The definitions will be imported from the selected file.</p>
        <Form>
          <Form.File
            label="Import file"
            custom
            onChange={(ev: any) => onFileChange(ev.target.files[0])}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => { if (onCancel) { onCancel(); } }}>Cancel</Button>
      </Modal.Footer>
    </Modal >
  );
}
