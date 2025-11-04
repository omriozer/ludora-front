import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Clock } from 'lucide-react';

const Timer = ({
	// Props for external control
	defaultTime = 300, // 5 minutes in seconds
	allowTimeChange = true,
	onPlay = null,
	onPause = null,
	onStop = null,
	onTimeUpdate = null,
	isExternallyRunning = false, // New prop to sync with external state

	// Display props
	isCompact = false,
	className = '',
	style = {},

	// Drag props
	isDraggable = true,
	onDragEnd = null,
}) => {
	const [time, setTime] = useState(defaultTime);
	const [originalTime, setOriginalTime] = useState(defaultTime);
	const [isRunning, setIsRunning] = useState(isExternallyRunning);
	const [inputMinutes, setInputMinutes] = useState(Math.floor(defaultTime / 60));
	const [inputSeconds, setInputSeconds] = useState(defaultTime % 60);

	const intervalRef = useRef(null);
	const dragRef = useRef(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

	// Resize functionality for running timer
	const [timerSize, setTimerSize] = useState(128); // Default size when running
	const [isResizing, setIsResizing] = useState(false);
	const [resizeStart, setResizeStart] = useState({ size: 128, x: 0, y: 0 });
	const MIN_SIZE = 80;
	const MAX_SIZE = 300;

	// Update time when defaultTime prop changes
	useEffect(() => {
		if (!isRunning) {
			setTime(defaultTime);
			setOriginalTime(defaultTime);
			setInputMinutes(Math.floor(defaultTime / 60));
			setInputSeconds(defaultTime % 60);
		}
	}, [defaultTime, isRunning]);

	// Sync external running state with internal state
	useEffect(() => {
		setIsRunning(isExternallyRunning);
	}, [isExternallyRunning]);

	// Timer countdown effect
	useEffect(() => {
		if (isRunning && time > 0) {
			intervalRef.current = setInterval(() => {
				setTime((prev) => {
					const newTime = prev - 1;
					if (onTimeUpdate) {
						onTimeUpdate(newTime);
					}
					if (newTime <= 0) {
						setIsRunning(false);
						if (onStop) onStop();
					}
					return newTime;
				});
			}, 1000);
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isRunning, time, onTimeUpdate, onStop]);

	// Format time display
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	// Calculate current time phase (for color coding)
	const getTimePhase = (currentTime, totalTime) => {
		if (totalTime <= 0) return 'safe';
		const percentage = (currentTime / totalTime) * 100;

		if (percentage > 25) return 'safe';     // Green zone
		if (percentage > 10) return 'warning';  // Yellow zone
		return 'danger';                        // Red zone
	};

	// Get timer colors based on time phase
	const getTimerColors = (phase) => {
		switch (phase) {
			case 'safe':
				return {
					text: 'text-green-400',
					bg: 'from-green-900/95 via-green-800/95 to-green-900/95',
					border: 'border-green-600/30',
					progress: 'stroke-green-400',
					glow: 'shadow-green-500/20'
				};
			case 'warning':
				return {
					text: 'text-yellow-400',
					bg: 'from-yellow-900/95 via-yellow-800/95 to-yellow-900/95',
					border: 'border-yellow-600/30',
					progress: 'stroke-yellow-400',
					glow: 'shadow-yellow-500/20'
				};
			case 'danger':
				return {
					text: 'text-red-400',
					bg: 'from-red-900/95 via-red-800/95 to-red-900/95',
					border: 'border-red-600/30',
					progress: 'stroke-red-400',
					glow: 'shadow-red-500/20'
				};
			default:
				return {
					text: 'text-white',
					bg: 'from-gray-900/95 via-black/95 to-gray-900/95',
					border: 'border-gray-600/30',
					progress: 'stroke-gray-400',
					glow: 'shadow-gray-500/20'
				};
		}
	};

	// Calculate elapsed and remaining time
	const elapsedTime = originalTime - time;
	const remainingTime = time;
	const currentPhase = getTimePhase(remainingTime, originalTime);
	const colors = getTimerColors(currentPhase);
	const progressPercentage = originalTime > 0 ? ((elapsedTime / originalTime) * 100) : 0;

	// Circular progress component
	const CircularProgress = ({ percentage, strokeColor, size = 120, isRunning = false }) => {
		const radius = (size - 8) / 2;
		const circumference = radius * 2 * Math.PI;
		const strokeDasharray = `${circumference} ${circumference}`;
		const strokeDashoffset = circumference - (percentage / 100) * circumference;

		return (
			<div className="relative">
				{/* White background circle when running */}
				{isRunning && (
					<div
						className="absolute inset-0 bg-white rounded-full shadow-lg"
						style={{
							width: size,
							height: size,
						}}
					/>
				)}
				<svg
					className="absolute inset-0 transform -rotate-90"
					width={size}
					height={size}
				>
					{/* Background circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke="currentColor"
						strokeWidth={isRunning ? "2" : "3"}
						fill="transparent"
						className={isRunning ? "text-gray-300" : "text-gray-700/50"}
					/>
					{/* Progress circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke="currentColor"
						strokeWidth={isRunning ? "6" : "3"}
						fill="transparent"
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						className={`${strokeColor} transition-all duration-1000 ease-in-out`}
						strokeLinecap="round"
					/>
				</svg>
			</div>
		);
	};

	// Handle input changes
	const handleTimeInputChange = () => {
		const newTime = (inputMinutes * 60) + inputSeconds;
		setTime(newTime);
		setOriginalTime(newTime);
	};

	// Control functions
	const handlePlay = () => {
		setIsRunning(true);
		if (onPlay) onPlay();
	};

	const handlePause = () => {
		setIsRunning(false);
		if (onPause) onPause();
	};

	const handleStop = () => {
		setIsRunning(false);
		setTime(originalTime);
		if (onStop) onStop();
	};

	// Resize functionality
	const handleResizeStart = (e) => {
		if (!isRunning) return;

		e.stopPropagation(); // Prevent drag from starting
		setIsResizing(true);
		setResizeStart({
			size: timerSize,
			x: e.clientX,
			y: e.clientY,
		});

		const handleResizeMove = (e) => {
			const deltaX = e.clientX - resizeStart.x;
			const deltaY = e.clientY - resizeStart.y;
			const delta = (deltaX + deltaY) / 2; // Average of both directions

			const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, resizeStart.size + delta));
			setTimerSize(newSize);
		};

		const handleResizeEnd = () => {
			setIsResizing(false);
			document.removeEventListener('mousemove', handleResizeMove);
			document.removeEventListener('mouseup', handleResizeEnd);
		};

		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	};

	// Drag functionality
	const handleMouseDown = (e) => {
		if (!isDraggable || !dragRef.current || isResizing) return;

		// Check if click is on resize handle
		if (e.target.classList.contains('resize-handle')) {
			return; // Let resize handle take precedence
		}

		setIsDragging(true);
		const rect = dragRef.current.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		const offsetY = e.clientY - rect.top;

		// Store the initial offset in the state
		setDragOffset({
			x: offsetX,
			y: offsetY,
		});

		const handleMouseMove = (e) => {
			if (dragRef.current) {
				// Use the stored offset from state
				const newX = e.clientX - offsetX;
				const newY = e.clientY - offsetY;

				// Smooth dragging with transform instead of left/top
				dragRef.current.style.left = `${newX}px`;
				dragRef.current.style.top = `${newY}px`;
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			if (onDragEnd && dragRef.current) {
				const rect = dragRef.current.getBoundingClientRect();
				onDragEnd({ x: rect.left, y: rect.top });
			}
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	if (isCompact) {
		return (
			<div className={`flex items-center gap-3 bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 border ${colors.border} ${colors.glow} shadow-lg transition-all duration-300 ${className}`} style={style}>
				{/* Icon with background */}
				<div className={`w-6 h-6 rounded-full flex items-center justify-center ${colors.text.replace('text-', 'bg-')}/20`}>
					<Clock className={`w-3 h-3 ${colors.text}`} />
				</div>

				{/* Time display */}
				<span className={`${colors.text} text-sm font-mono font-bold tracking-wide`}>
					{formatTime(time)}
				</span>

				{/* Running indicator */}
				{isRunning && (
					<div className={`w-1.5 h-1.5 ${colors.text.replace('text-', 'bg-')} rounded-full animate-pulse`}></div>
				)}

				{/* Progress ring for compact mode */}
				{originalTime > 0 && (
					<div className="relative w-4 h-4">
						<svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 16 16">
							<circle
								cx="8"
								cy="8"
								r="6"
								stroke="currentColor"
								strokeWidth="1.5"
								fill="transparent"
								className="text-gray-600/40"
							/>
							<circle
								cx="8"
								cy="8"
								r="6"
								stroke="currentColor"
								strokeWidth="1.5"
								fill="transparent"
								strokeDasharray={`${2 * Math.PI * 6}`}
								strokeDashoffset={`${2 * Math.PI * 6 * (1 - progressPercentage / 100)}`}
								className={`${colors.progress} transition-all duration-1000`}
								strokeLinecap="round"
							/>
						</svg>
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			ref={dragRef}
			className={`${isRunning ? 'bg-transparent' : `bg-gradient-to-br ${colors.bg} backdrop-blur-xl rounded-3xl border-2 ${colors.border} shadow-2xl ${colors.glow}`} ${isRunning ? 'p-0' : 'p-8'} select-none ${isDragging || isResizing ? 'transition-none' : 'transition-all duration-300'} ${isRunning ? '' : 'min-w-[320px]'} ${isDraggable && !isResizing ? 'cursor-move' : ''} ${!isRunning ? 'hover:scale-105' : ''} ${className}`}
			style={{
				position: isDraggable ? 'absolute' : 'relative',
				...style,
			}}
			onMouseDown={isDraggable ? handleMouseDown : undefined}
		>
			{/* Timer Display with Circular Progress */}
			<div className={`text-center ${isRunning ? 'mb-4' : 'mb-6'}`}>
				{/* Circular Progress Ring */}
				<div
					className={`relative mx-auto ${isRunning ? 'mb-4' : 'mb-6'}`}
					style={{
						width: isRunning ? `${timerSize}px` : '144px',
						height: isRunning ? `${timerSize}px` : '144px',
					}}
				>
					<CircularProgress
						percentage={progressPercentage}
						strokeColor={colors.progress}
						size={isRunning ? timerSize : 144}
						isRunning={isRunning}
					/>
					{/* Main time display in center */}
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<div
							className={`font-mono font-bold ${isRunning ? 'text-gray-800' : colors.text} tracking-wider drop-shadow-lg`}
							style={{
								fontSize: isRunning ? `${Math.max(18, timerSize / 4)}px` : '24px'
							}}
						>
							{formatTime(time)}
						</div>
						{isRunning && (
							<div
								className={`bg-gray-800 rounded-full animate-pulse mt-1 shadow-lg`}
								style={{
									width: Math.max(4, timerSize / 85) + 'px',
									height: Math.max(4, timerSize / 85) + 'px'
								}}
							></div>
						)}
					</div>

					{/* Invisible resize zone around the white circle (only when running) */}
					{isRunning && (
						<div
							className="resize-handle absolute inset-0 rounded-full cursor-grab hover:cursor-grabbing"
							style={{
								// Extend the clickable area slightly beyond the white circle
								margin: '-8px',
								zIndex: 10,
							}}
							onMouseDown={handleResizeStart}
							title="לחץ וגרור לשינוי גודל הטיימר"
						>
							{/* Hover indicator - subtle glow around white circle */}
							<div className="absolute inset-2 rounded-full border-2 border-gray-400/30 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
						</div>
					)}

					{/* Subtle outer glow ring */}
					{!isRunning && (
						<div className={`absolute inset-0 rounded-full ${colors.text.replace('text-', 'bg-')}/5 blur-sm`}></div>
					)}
				</div>


				{/* Time Input (only when not running and allowed) */}
				{!isRunning && allowTimeChange && (
					<div className="bg-gray-800/20 rounded-2xl p-6 mb-6 border border-gray-700/30">
						<div className="text-sm text-gray-300 text-center mb-4 font-medium">הגדרת משך הטיימר</div>
						<div className="flex items-center justify-center gap-4">
							<div className="text-center">
								<div className="text-xs text-gray-400 mb-3 font-medium">שניות</div>
								<input
									type="number"
									min="0"
									max="59"
									value={inputSeconds}
									onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
									onBlur={handleTimeInputChange}
									className={`w-16 h-12 text-center bg-gray-900/50 text-white rounded-xl border-2 ${colors.border} text-lg font-mono font-bold focus:ring-2 focus:ring-${colors.text.replace('text-', '')}/50 focus:border-transparent transition-all hover:bg-gray-800/50`}
								/>
							</div>
							<span className={`text-2xl font-bold ${colors.text} mt-6 px-4`}>:</span>
							<div className="text-center">
								<div className="text-xs text-gray-400 mb-3 font-medium">דקות</div>
								<input
									type="number"
									min="0"
									max="59"
									value={inputMinutes}
									onChange={(e) => setInputMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
									onBlur={handleTimeInputChange}
									className={`w-16 h-12 text-center bg-gray-900/50 text-white rounded-xl border-2 ${colors.border} text-lg font-mono font-bold focus:ring-2 focus:ring-${colors.text.replace('text-', '')}/50 focus:border-transparent transition-all hover:bg-gray-800/50`}
								/>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Controls */}
			<div className={`flex items-center justify-center ${isRunning ? 'gap-3' : 'gap-4'}`}>
				{/* Play/Pause Button (hide if external onPlay/onPause provided) */}
				{!isRunning && !onPlay && (
					<Button
						onClick={handlePlay}
						size="lg"
						className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
					>
						<Play className="w-5 h-5 mr-2" />
						התחל
					</Button>
				)}

				{isRunning && !onPause && (
					<Button
						onClick={handlePause}
						size="sm"
						className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-full w-12 h-12 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 p-0 flex items-center justify-center"
					>
						<Pause className="w-5 h-5" />
					</Button>
				)}

				{/* Stop Button (hide if external onStop provided) */}
				{isRunning && !onStop && (
					<Button
						onClick={handleStop}
						size="sm"
						className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-full w-12 h-12 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 p-0 flex items-center justify-center"
					>
						<Square className="w-5 h-5" />
					</Button>
				)}

				{/* External action buttons */}
				{onPlay && !isRunning && (
					<Button
						onClick={onPlay}
						size="lg"
						className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
					>
						<Play className="w-5 h-5 mr-2" />
						התחל
					</Button>
				)}

				{onPause && isRunning && (
					<Button
						onClick={onPause}
						size="sm"
						className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-full w-12 h-12 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 p-0 flex items-center justify-center"
					>
						<Pause className="w-5 h-5" />
					</Button>
				)}

				{onStop && isRunning && (
					<Button
						onClick={onStop}
						size="sm"
						className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-full w-12 h-12 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 p-0 flex items-center justify-center"
					>
						<Square className="w-5 h-5" />
					</Button>
				)}
			</div>

			{/* Progress Bar (only when not running) */}
			{!isRunning && originalTime > 0 && (
				<div className="mt-4">
					<div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
						<div
							className={`h-full ${colors.text.replace('text-', 'bg-')} transition-all duration-1000 rounded-full`}
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default Timer;