import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  CameraOff,
  Target,
  CheckCircle,
  X,
  RotateCcw,
  Home,
  Lightbulb,
  Timer,
  Trophy,
  AlertCircle
} from 'lucide-react';


export default function ARGameComponent({
  game,
  gameData,
  rules = [],
  content = {},
  onGameComplete,
  onExit,
  isPaused = false
}) {
  // Camera and AR state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  // Game state
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [gameProgress, setGameProgress] = useState([]);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Current task state
  const [currentTask, setCurrentTask] = useState(null);
  const [taskOptions, setTaskOptions] = useState([]);
  const [userAnswer, setUserAnswer] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Timer
  const timerRef = useRef(null);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('המצלמה אינה נתמכת בדפדפן זה');
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      setCameraPermission('granted');
      setCameraError(null);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      setCameraError(error.message);
      setCameraPermission('denied');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);

    return imageData;
  }, []);

  // Load current task based on active rule
  const loadCurrentTask = useCallback(async () => {
    if (!rules[currentRuleIndex]) return;

    const rule = rules[currentRuleIndex];

    try {
      // Load content for the rule
      const ruleContent = await GameRulesService.loadContentForRule(rule, game.id);

      // Generate task based on rule type
      const task = await generateTaskFromRule(rule, ruleContent);
      setCurrentTask(task);

      // Generate options if needed
      if (task.options) {
        setTaskOptions(task.options);
      }
    } catch (error) {
      console.error('Error loading task:', error);
    }
  }, [currentRuleIndex, rules, game.id]);

  // Generate task from rule and content
  const generateTaskFromRule = async (rule, ruleContent) => {
    const config = JSON.parse(rule.validation_config);

    switch (rule.rule_type) {
      case 'ar_object_detection':
        return generateObjectDetectionTask(rule, ruleContent, config);
      case 'ar_scavenger_hunt':
        return generateScavengerHuntTask(rule, ruleContent, config);
      case 'image_word_match':
        return generateImageWordMatchTask(rule, ruleContent, config);
      default:
        return generateGenericTask(rule, ruleContent, config);
    }
  };

  const generateObjectDetectionTask = (rule, ruleContent, config) => {
    const words = ruleContent.Word || [];
    const images = ruleContent.Image || [];

    if (words.length === 0 && images.length === 0) {
      return { type: 'error', message: 'אין תוכן זמין למשימה זו' };
    }

    const targetItem = words[Math.floor(Math.random() * words.length)] ||
                      images[Math.floor(Math.random() * images.length)];

    return {
      type: 'object_detection',
      target: targetItem,
      instruction: `מצא בסביבה: ${targetItem.text || targetItem.name}`,
      timeLimit: config.difficulty_settings?.medium?.time_limit || 60,
      scoring: config.scoring
    };
  };

  const generateScavengerHuntTask = (rule, ruleContent, config) => {
    const words = ruleContent.Word || [];
    const itemsCount = config.difficulty_settings?.medium?.items_count || 5;
    const huntItems = words.slice(0, itemsCount);

    return {
      type: 'scavenger_hunt',
      items: huntItems,
      currentItem: 0,
      instruction: `ציד אוצרות - מצא ${huntItems.length} פריטים`,
      timeLimit: config.difficulty_settings?.medium?.time_limit || 300,
      scoring: config.scoring
    };
  };

  const generateImageWordMatchTask = (rule, ruleContent, config) => {
    const words = ruleContent.Word || [];
    const images = ruleContent.Image || [];

    if (words.length === 0 || images.length === 0) {
      return { type: 'error', message: 'נדרשות מילים ותמונות למשימה זו' };
    }

    const targetImage = images[Math.floor(Math.random() * images.length)];
    const correctWord = words[0]; // In real implementation, find related word
    const wrongWords = words.slice(1, config.max_options || 4);
    const allOptions = [correctWord, ...wrongWords].sort(() => 0.5 - Math.random());

    return {
      type: 'image_word_match',
      target: targetImage,
      correctAnswer: correctWord,
      options: allOptions,
      instruction: 'מצא את העצם בתמונה ובחר את המילה המתאימה',
      timeLimit: config.difficulty_settings?.medium?.time_limit || 30,
      scoring: config.scoring
    };
  };

  const generateGenericTask = (rule, ruleContent, config) => {
    return {
      type: 'generic',
      instruction: rule.description,
      timeLimit: 60,
      scoring: config.scoring || { correct: 10, incorrect: 0 }
    };
  };

  // Handle task completion
  const handleTaskComplete = useCallback(async (answer) => {
    if (!currentTask || !rules[currentRuleIndex]) return;

    const rule = rules[currentRuleIndex];

    try {
      // Validate answer using GameRulesService
      const validation = await GameRulesService.validateRuleExecution(
        rule,
        answer,
        content
      );

      const taskResult = {
        ruleIndex: currentRuleIndex,
        rule: rule,
        task: currentTask,
        answer: answer,
        validation: validation,
        timeElapsed: timeElapsed
      };

      // Update progress
      setGameProgress(prev => [...prev, taskResult]);

      // Update score
      if (validation.valid) {
        setScore(prev => prev + (validation.score || 0));
      }

      // Move to next rule or complete game
      if (currentRuleIndex < rules.length - 1) {
        setCurrentRuleIndex(prev => prev + 1);
      } else {
        // Game completed
        setGameCompleted(true);
        const finalScore = score + (validation.valid ? validation.score || 0 : 0);
        onGameComplete({
          score: finalScore,
          progress: [...gameProgress, taskResult],
          timeElapsed: timeElapsed
        });
      }
    } catch (error) {
      console.error('Error handling task completion:', error);
    }
  }, [currentTask, rules, currentRuleIndex, content, timeElapsed, score, gameProgress, onGameComplete]);

  // Handle photo capture and submit
  const handleCaptureAndSubmit = useCallback(() => {
    const photoData = capturePhoto();
    if (!photoData) return;

    // For AR object detection, the photo itself is the answer
    if (currentTask?.type === 'object_detection') {
      handleTaskComplete({
        type: 'photo',
        photo: photoData,
        target: currentTask.target,
        timestamp: Date.now()
      });
    }
  }, [capturePhoto, currentTask, handleTaskComplete]);

  // Handle option selection
  const handleOptionSelect = useCallback((option) => {
    if (currentTask?.type === 'image_word_match') {
      handleTaskComplete({
        type: 'selection',
        selected_option: option,
        correct_answer: currentTask.correctAnswer
      });
    }
  }, [currentTask, handleTaskComplete]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, gameCompleted, isPaused]);

  // Load task when rule changes
  useEffect(() => {
    if (gameStarted && rules.length > 0) {
      loadCurrentTask();
    }
  }, [gameStarted, currentRuleIndex, loadCurrentTask, rules.length]);

  // Initialize camera when component mounts
  useEffect(() => {
    if (gameStarted) {
      initializeCamera();
    }

    return () => {
      stopCamera();
    };
  }, [gameStarted, initializeCamera, stopCamera]);

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setTimeElapsed(0);
    setScore(0);
    setCurrentRuleIndex(0);
    setGameProgress([]);
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render camera view
  const renderCameraView = () => {
    if (cameraPermission === 'denied' || cameraError) {
      return (
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-center text-white">
            <CameraOff className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">אין גישה למצלמה</p>
            <p className="text-sm">{cameraError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={initializeCamera}
            >
              נסה שוב
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="bg-black/70 text-white px-3 py-2 rounded">
              <div className="text-sm">זמן: {formatTime(timeElapsed)}</div>
            </div>
            <div className="bg-black/70 text-white px-3 py-2 rounded">
              <div className="text-sm">ניקוד: {score}</div>
            </div>
          </div>

          {/* Task instruction */}
          {currentTask && (
            <div className="absolute bottom-20 left-4 right-4">
              <div className="bg-black/70 text-white p-4 rounded text-center">
                <p className="text-lg font-semibold">{currentTask.instruction}</p>
                {currentTask.target && (
                  <p className="text-sm mt-1">
                    חפש: {currentTask.target.text || currentTask.target.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="absolute top-16 left-4 right-4">
            <div className="bg-black/70 text-white px-3 py-2 rounded">
              <div className="text-sm mb-1">
                שלב {currentRuleIndex + 1} מתוך {rules.length}
              </div>
              <Progress
                value={(currentRuleIndex / rules.length) * 100}
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Camera capture button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          {currentTask?.type === 'object_detection' && (
            <Button
              onClick={handleCaptureAndSubmit}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full text-lg"
            >
              <Camera className="w-6 h-6 mr-2" />
              צלם
            </Button>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  };

  // Render game options (for non-camera tasks)
  const renderGameOptions = () => {
    if (!currentTask || currentTask.type === 'object_detection') return null;

    if (currentTask.type === 'image_word_match' && taskOptions.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {taskOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-lg"
              onClick={() => handleOptionSelect(option)}
            >
              {option.text}
            </Button>
          ))}
        </div>
      );
    }

    return null;
  };

  // Main render
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center gap-2 justify-center">
              <Camera className="w-8 h-8" />
              {game.title}
            </CardTitle>
            <p className="text-gray-600">משחק מציאות רבודה</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                המשחק דורש גישה למצלמה של המכשיר
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>כללי משחק:</span>
                <Badge>{rules.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>תוכן זמין:</span>
                <Badge>{Object.values(content).reduce((sum, items) => sum + items.length, 0)}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={startGame} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                התחל משחק
              </Button>
              <Button variant="outline" onClick={onExit}>
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center gap-2 justify-center">
              <Trophy className="w-8 h-8" />
              משחק הושלם!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-4xl font-bold text-green-500">{score}</div>
            <p className="text-gray-600">ניקוד סופי</p>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>זמן כולל:</span>
                <span>{formatTime(timeElapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span>משימות הושלמו:</span>
                <span>{gameProgress.length} / {rules.length}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={startGame} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                שחק שוב
              </Button>
              <Button variant="outline" onClick={onExit}>
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        {/* Camera view */}
        {renderCameraView()}

        {/* Game options */}
        {renderGameOptions()}

        {/* Game controls */}
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => setShowHint(!showHint)}>
            <Lightbulb className="w-4 h-4 mr-1" />
            רמז
          </Button>

          <div className="text-white text-sm">
            {currentRuleIndex + 1} / {rules.length}
          </div>

          <Button variant="outline" size="sm" onClick={onExit}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Hint */}
        {showHint && currentTask && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              {currentTask.hint || 'תסתכל בסביבה ומצא את העצם המבוקש'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}