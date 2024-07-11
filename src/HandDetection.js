import React, { useRef, useState, useEffect } from 'react';
import {Box, VStack, Text, Button, Image, Progress, Heading, Flex} from '@chakra-ui/react';
import Webcam from 'react-webcam';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import * as drawingUtils from '@mediapipe/drawing_utils';
import Confetti from 'react-confetti';

function HandDetection() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [countdown, setCountdown] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [step, setStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  let camera = null;

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    if (typeof webcamRef.current !== "undefined" && webcamRef.current !== null) {
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await hands.send({image: webcamRef.current.video});
        },
        width: 640,
        height: 480
      });
      camera.start();
    }
  }, []);

   const onResults = (results) => {
    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawingUtils.drawConnectors(canvasCtx, landmarks, Hands.HAND_CONNECTIONS,
                                   {color: '#00FF00', lineWidth: 5});
        drawingUtils.drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
      }
    }
    canvasCtx.restore();
  }

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount === 1) {
          clearInterval(timer);
          captureImage();
          return null;
        }
        return prevCount - 1;
      });
    }, 1000);
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000); // 5초 후 색종이 효과 중지
  };

  const nextStep = () => {
    setStep(step + 1);
    setCapturedImage(null);
  };

  return (
    <VStack spacing={5} align="center" w="100%" p={5}>
      <Flex w="100%" h="60px" justifyContent="space-between" alignItems="center">
        <Heading fontSize={30} fontWeight="600">문제 1.</Heading>
        <Flex bg="blueGray.50" w="80%" h="100%" borderRadius="5px" fontWeight="600" alignItems="center" justifyContent="center">바나나</Flex>
      </Flex>
      <Box borderRadius="md" w="100%" maxW="640px">
        <Flex>
          <Text mb={4}>맞춘 문제 수: 0/10 (0%)</Text>
          <Box>
            <Button>STEP 1</Button>
            <Button>STEP 2</Button>
          </Box>
        </Flex>
        <Progress value={0} max={10} mb={4} display="none"/>
        <Box position="relative" width="100%" height="376.5px" borderRadius={5} overflow="hidden">
          {!capturedImage ? (
            <>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                }}
              />
            </>
          ) : (
            <Image src={capturedImage} alt="Captured" />
          )}
          {countdown && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="rgba(0,0,0,0.5)"
              color="white"
              fontSize="6xl"
              p={4}
              borderRadius="full"
            >
              {countdown}
            </Box>
          )}
        </Box>
        {!capturedImage ? (
          <Button mt={4} onClick={startCountdown} isDisabled={countdown !== null}>
            사진 찍기
          </Button>
        ) : (
          <Button mt={4} onClick={nextStep}>
            다음
          </Button>
        )}
      </Box>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}
    </VStack>
  );
}

export default HandDetection;