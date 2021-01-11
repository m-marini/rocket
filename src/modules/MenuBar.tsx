import React, { FunctionComponent } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import {version, homepage} from '../../package.json';

/**
 * 
 */
export const MenuBar: FunctionComponent<Readonly<{
  onImport?: () => void;
  onReplay?: () => void;
}>> = ({ onImport, onReplay }) => {
  return (
    <Navbar variant="dark" bg="dark" expand="lg" >
      <Navbar.Brand href="http://www.mmarini.org">www.mmarini.org</Navbar.Brand>
      <Navbar.Toggle aria-controls="navbar-nav" />
      <Navbar.Collapse id="navbar-nav">
        <Nav className="mr-auto">
          <Nav.Link href={homepage}>Rocket {version}</Nav.Link>
          <Nav.Link onClick={() => { if (onImport) { onImport(); } }}>
            Import
          </Nav.Link>
          <Nav.Link onClick={() => { if (onReplay) { onReplay(); } }}>
            Replay
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}
