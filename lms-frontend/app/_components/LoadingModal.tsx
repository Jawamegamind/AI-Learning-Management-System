'use client';

import React from 'react';
import { Modal, Card, Typography, CircularProgress } from '@mui/joy';

interface LoadingModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  open,
  title = 'Please wait',
  subtitle = 'This might take a few seconds...',
}) => {
  return (
    <Modal open={open} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card
        variant="soft"
        color="primary"
        sx={{ p: 3, minWidth: 300, textAlign: 'center', borderRadius: 'md' }}
      >
        <Typography level="title-lg" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size="lg" />
        </div>
      </Card>
    </Modal>
  );
};

export default LoadingModal;
