import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { uploadPhoto } from '../../api/photos';
import { Button } from '../../styles/components';

const HiddenInput = styled.input`
  display: none;
`;

export default function PhotoUploadButton({ tripId, legId, nodeId, stopId, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const onPick = () => inputRef.current && inputRef.current.click();

  const onChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (tripId) formData.append('trip_id', String(tripId));
    if (legId) formData.append('leg_id', String(legId));
    if (nodeId) formData.append('node_id', String(nodeId));
    if (stopId) formData.append('stop_id', String(stopId));

    try {
      setUploading(true);
      const res = await uploadPhoto(formData);
      onUploaded && onUploaded(res);
    } catch (e) {
      console.error('Upload failed', e);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <HiddenInput ref={inputRef} type="file" accept="image/*" onChange={onChange} />
      <Button onClick={onPick} variant="secondary" size="sm" disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload Photos'}
      </Button>
    </>
  );
}
