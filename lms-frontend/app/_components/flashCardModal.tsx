import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

type FlashcardQA = { Q: string; A: string };
type FlashcardData = Record<string, FlashcardQA[]>;

interface FlashcardModalProps {
  open: boolean;
  onClose: () => void;
  flashcardData: FlashcardData;
}

function sanitizeFlashcardData(data: FlashcardData): FlashcardData {
    const cleanedData: FlashcardData = {};

    for (const [topic, qaList] of Object.entries(data)) {
      if (
        Array.isArray(qaList) &&
        qaList.length > 0 &&
        typeof qaList[0] === "object" &&
        "Q" in qaList[0] &&
        "A" in qaList[0]
      ) {
        cleanedData[topic] = qaList;
      }
    }

    return cleanedData;
  }

const FlashcardModal: React.FC<FlashcardModalProps> = ({ open, onClose, flashcardData }) => {
    flashcardData = sanitizeFlashcardData(flashcardData)
    console.log(flashcardData)
  const topics = Object.keys(flashcardData);
  const [topicIndex, setTopicIndex] = useState(0);
  const [qaIndex, setQaIndex] = useState(0);

  const currentTopic = topics[topicIndex];
  const currentFlashcards = flashcardData[currentTopic];
  const currentQA = currentFlashcards[qaIndex];

  const handleNext = () => {
    if (qaIndex < currentFlashcards.length - 1) {
      setQaIndex(qaIndex + 1);
    } else if (topicIndex < topics.length - 1) {
      setTopicIndex(topicIndex + 1);
      setQaIndex(0);
    }
  };

  const handlePrev = () => {
    if (qaIndex > 0) {
      setQaIndex(qaIndex - 1);
    } else if (topicIndex > 0) {
      const prevTopic = topics[topicIndex - 1];
      setTopicIndex(topicIndex - 1);
      setQaIndex(flashcardData[prevTopic].length - 1);
    }
  };

  const isFirst = topicIndex === 0 && qaIndex === 0;
  const isLast =
    topicIndex === topics.length - 1 &&
    qaIndex === flashcardData[topics[topicIndex]].length - 1;

  const handleClose = () => {
    setTopicIndex(0);
    setQaIndex(0);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} disableEnforceFocus>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          p: 4,
          outline: "none",
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h6" textAlign="center" gutterBottom>
          {currentTopic.replace(/\*/g, "")}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ minHeight: 100 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Q: {currentQA.Q}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            A: {currentQA.A}
          </Typography>
        </Box>

        <Stack direction="row" justifyContent="space-between" mt={4}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handlePrev}
            disabled={isFirst}
          >
            Prev
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={isLast}
          >
            Next
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default FlashcardModal;
// flashcards/flashcards_1746265657811.pdf