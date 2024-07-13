import React, {useRef, useState, useEffect} from 'react';
import {
    Box, VStack, Text, Button, Image, Progress, Heading, Flex, HStack, keyframes, useToast,
    AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay
} from '@chakra-ui/react';
import Webcam from 'react-webcam';
import {Hands} from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';
import * as drawingUtils from '@mediapipe/drawing_utils';
import Confetti from 'react-confetti';
import {useNavigate} from 'react-router-dom';
import CountdownCircleTimer from "./components/CountdownCircleTimer";
import WordStepper from "./components/WordStepper";
import {useDispatch} from "react-redux";
import {callGetWordImageAPI} from "./apis/GameAPICalls";
import axios from 'axios';

function HandDetection({totalQuestions, questionArr, posesPerQuestion, questions}) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const toast = useToast();

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraRef = useRef(null);

    const [questionNumber, setQuestionNumber] = useState(1);
    const [poseNumber, setPoseNumber] = useState(1);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [answeredQuestions, setAnsweredQuestions] = useState(0);

    const [countdown, setCountdown] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    // 새로운 state 추가
    const [isWrongAnswer, setIsWrongAnswer] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const cancelRef = React.useRef();

    const flash = keyframes`
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    `;

    useEffect(() => {
        dispatch(callGetWordImageAPI(poseNumber))
    }, [poseNumber, dispatch]);

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
            cameraRef.current = new cam.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current && webcamRef.current.video) {
                        await hands.send({image: webcamRef.current.video});
                    }
                },
                width: 640,
                height: 480
            });
            cameraRef.current.start();
        }

        return () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
        };
    }, []);

    const onResults = (results) => {
        if (!webcamRef.current || !webcamRef.current.video) return;

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
                    setIsFlashing(true);
                    setTimeout(() => {
                        setIsFlashing(false);
                    }, 300);

                    clearInterval(timer);
                    captureImage();
                    return null;
                }
                return prevCount - 1;
            });
        }, 1000);
    };

    const captureImage = async () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setCapturedImage(imageSrc);

        try {
            const imageBlob = await fetch(imageSrc).then(res => res.blob());

            const formData = new FormData();
            formData.append('file', imageBlob, 'capture.jpg');
            formData.append('wordNo', poseNumber.toString());
            formData.append('wordDes', questionNumber.toString());

            const response = await axios.post('http://localhost:8000/answerfile/', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Server response:', response.data);

            if (response.data.isSimilar) {
                nextPose(true);
            } else {
                setIsWrongAnswer(true);
                setIsAlertOpen(true);
            }

            if (response.data.image) {
                setCapturedImage(`data:image/png;base64,${response.data.image}`);
            } else {
                console.error('Server did not return image data');
                toast({
                    title: "이미지 로드 실패",
                    description: "서버에서 이미지 데이터를 받지 못했습니다.",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }

        } catch (error) {
            console.error('Error sending image to server:', error);
            toast({
                title: "오류 발생",
                description: "서버에 이미지를 전송하는 중 오류가 발생했습니다.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            setIsWrongAnswer(true);
            setIsAlertOpen(true);
        }
    };

    const nextPose = (isCorrect) => {
        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        }
        if (poseNumber < posesPerQuestion[questionNumber - 1]) {
            setPoseNumber(prev => prev + 1);
        } else {
            nextQuestion();
        }
        setCapturedImage(null);
    };

    const nextQuestion = () => {
        setAnsweredQuestions(prev => prev + 1);
        if (questionNumber < totalQuestions) {
            setQuestionNumber(prev => prev + 1);
            setPoseNumber(1);
        } else {
            navigate('/finish', {state: {correctAnswers, totalQuestions}});
        }
    };

    const skipQuestion = () => {
        setAnsweredQuestions(prev => prev + 1);
        if (questionNumber < totalQuestions) {
            setQuestionNumber(prev => prev + 1);
            setPoseNumber(1);
        } else {
            navigate('/finish', {state: {correctAnswers, totalQuestions}});
        }
    };

    // 틀렸을 때 다시 시도하는 함수
    const retryPose = () => {
        setCapturedImage(null);
        setIsWrongAnswer(false);
        setIsAlertOpen(false);
    };

    return (
        <VStack spacing={5} align="center" w="100%" p={5}>
            <Flex w="100%" h="60px" justifyContent="space-between" alignItems="center">
                <Heading fontSize={30} fontWeight="600">문제 {questionNumber}.</Heading>
                <Flex bg="blueGray.50" w="80%" h="100%" borderRadius="5px" fontWeight="600" alignItems="center"
                      justifyContent="center">{questions[questionNumber - 1]}</Flex>
            </Flex>

            <Box borderRadius="md" w="100%" maxW="640px" position="relative">
                <Text mb={4}>
                    맞춘 문제 수: {correctAnswers}/{answeredQuestions} ({answeredQuestions > 0 ? (correctAnswers / answeredQuestions * 100).toFixed(1) : 0}%)
                </Text>
                <WordStepper
                    questionNumber={questionNumber}
                    posesPerQuestion={posesPerQuestion}
                    poseNumber={poseNumber}
                />

                <Progress value={answeredQuestions} max={totalQuestions} mb={4} display="none"/>
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
                        <Image src={capturedImage} alt="Captured"/>
                    )}
                    {countdown && (
                        <Box position='absolute' top='0' right='0' p={4}>
                            <CountdownCircleTimer seconds={countdown} totalSeconds={3}/>
                        </Box>
                    )}
                    {isFlashing && (
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            width="100%"
                            height="100%"
                            bg="white"
                            animation={`${flash} 0.3s ease-out`}
                        />
                    )}
                </Box>
                {!capturedImage && !isWrongAnswer && (
                    <HStack justifyContent="space-between" mt={4}>
                        <Button onClick={skipQuestion}>문제 건너뛰기</Button>
                        <Button onClick={startCountdown} isDisabled={countdown !== null}>
                            사진 찍기
                        </Button>
                    </HStack>
                )}
                {isWrongAnswer && (
                    <HStack justifyContent="space-between" mt={4}>
                        <Button onClick={skipQuestion}>문제 건너뛰기</Button>
                        <Button onClick={retryPose} colorScheme="blue">
                            다시 시도
                        </Button>
                    </HStack>
                )}
            </Box>

            <AlertDialog
                isOpen={isAlertOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsAlertOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            틀렸습니다!
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            정답과 일치하지 않습니다. 다시 시도해보세요.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsAlertOpen(false)}>
                                확인
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight}/>}
        </VStack>
    );
}

export default HandDetection;