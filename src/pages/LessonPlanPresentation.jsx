import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
	ArrowLeft,
	ArrowRight,
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	AlertCircle,
	SkipBack,
	SkipForward,
	Timer,
	Clock,
	Sparkles,
} from 'lucide-react';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import TimerComponent from '@/components/ui/Timer';
import ClassroomEffectMenu from '@/components/ui/ClassroomEffectMenu';
import { getApiBase } from '@/utils/api.js';
import { apiRequest } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import logoSm from '../assets/images/logo_sm.png';
import '@/styles/presentation.css';

export default function LessonPlanPresentation() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const lessonPlanId = searchParams.get('id');
	const { currentUser, isAuthenticated } = useUser();

	// Presentation state
	const [presentationData, setPresentationData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [hasAccess, setHasAccess] = useState(false);

	// Slideshow state
	const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [slides, setSlides] = useState([]);
	const [audioFiles, setAudioFiles] = useState([]);
	const [renderedSlides, setRenderedSlides] = useState([]);
	const [isRenderingSlides, setIsRenderingSlides] = useState(false);

	// Smart preloading state
	const [preloadedSlides, setPreloadedSlides] = useState(new Set());
	const [isPreloadingWindow, setIsPreloadingWindow] = useState(false);
	const [preloadProgress, setPreloadProgress] = useState(0);
	const [slideBlobUrls, setSlideBlobUrls] = useState(new Map()); // Cache blob URLs for instant switching

	// Timer state
	const [isTimerVisible, setIsTimerVisible] = useState(false);
	const [timerPosition, setTimerPosition] = useState(() => {
		// Safe window dimensions check for SSR
		if (typeof window !== 'undefined') {
			return {
				x: window.innerWidth / 2 - 160, // Center horizontally (timer width ~320px)
				y: window.innerHeight / 2 - 200  // Center vertically (timer height ~400px)
			};
		}
		return { x: 400, y: 200 }; // Fallback values
	});
	const [isTimerRunning, setIsTimerRunning] = useState(false);
	const [timerTime, setTimerTime] = useState(300); // 5 minutes default

	// Classroom effects state (always visible in embedded mode)
	const [isEffectsEnabled, setIsEffectsEnabled] = useState(true);

	// Refs
	const presentationRef = useRef(null);
	const audioRef = useRef(null);
	const slideContainerRef = useRef(null);

	useEffect(() => {
		if (!lessonPlanId) {
			setError('מזהה תוכנית שיעור חסר');
			setIsLoading(false);
			return;
		}

		// Wait for user authentication to be loaded
		if (currentUser !== null || !isAuthenticated) {
			loadPresentationData();
		}
	}, [lessonPlanId, currentUser, isAuthenticated]);

	const loadPresentationData = async () => {
		setIsLoading(true);
		setError(null);

		try {
			clog('🎭 Loading lesson plan SVG presentation data:', lessonPlanId);

			// Check authentication using UserContext
			if (!isAuthenticated || !currentUser) {
				throw new Error('נדרשת הרשמה לצפייה בפרזנטציה');
			}

			const token = localStorage.getItem('token') || localStorage.getItem('authToken');
			if (!token) {
				throw new Error('נדרשת הרשמה לצפייה בפרזנטציה');
			}

			// Load SVG slides using the new API
			const slidesData = await apiRequest(`/svg-slides/${lessonPlanId}`, {
				method: 'GET',
			});

			if (!slidesData.success) {
				if (slidesData.status === 403) {
					setHasAccess(false);
					setError('אין לך גישה לפרזנטציה זו');
				} else if (slidesData.status === 404) {
					setError('לא נמצאו שקפים עבור תוכנית שיעור זו');
				} else {
					throw new Error(slidesData.message || 'שגיאה בטעינת השקפים');
				}
				setIsLoading(false);
				return;
			}
			clog('🎭 SVG slides data loaded:', slidesData);

			if (!slidesData.success || !slidesData.data.slides || slidesData.data.slides.length === 0) {
				setError('לא נמצאו שקפים עבור תוכנית שיעור זו');
				setIsLoading(false);
				return;
			}

			// Process SVG slides for display
			const svgSlides = slidesData.data.slides.map((slide, index) => ({
				id: slide.id,
				filename: slide.title || slide.filename || `שקף ${index + 1}`,
				type: 'svg',
				slideNumber: index + 1,
				url: `${getApiBase()}/assets/download/lesson-plan-slide/${lessonPlanId}/${slide.id}`,
				slideOrder: slide.slide_order || index + 1,
			}));

			// Also load lesson plan data for audio files and title
			let lessonPlanData = null;
			let audioFilesData = [];

			try {
				const lessonPlanResponse = await apiRequest(`/entities/lesson-plan/${lessonPlanId}`, {
					method: 'GET',
				});

				if (lessonPlanResponse.success) {
					lessonPlanData = lessonPlanResponse;

					// Extract audio files from lesson plan data
					if (lessonPlanData.file_configs?.files) {
						const audioFiles = lessonPlanData.file_configs.files
							.filter((file) => file.file_role === 'audio')
							.map((file, index) => ({
								id: `audio-${index}`,
								url: `${getApiBase()}/assets/download/file/${file.file_id}`,
								filename: file.filename,
								role: 'audio',
							}));

						audioFilesData = audioFiles;
					}
				}
			} catch (audioError) {
				cerror('Could not load audio files:', audioError);
				// Continue without audio
			}

			setPresentationData({
				lessonPlan: lessonPlanData,
				slides: svgSlides,
			});
			setSlides(svgSlides);
			setAudioFiles(audioFilesData);
			setRenderedSlides(svgSlides); // SVG slides don't need rendering
			setHasAccess(true);

			// Auto-enter fullscreen mode
			setTimeout(() => {
				enterFullscreen();
			}, 1000);

			// Start full slide preloading for instant navigation
			setTimeout(() => {
				preloadAllSlides(svgSlides);
			}, 500); // Small delay to let initial rendering finish
		} catch (err) {
			cerror('Error loading SVG presentation data:', err);
			setError(err.message || 'שגיאה בטעינת הפרזנטציה');
		} finally {
			setIsLoading(false);
		}
	};

	// Preload all slides using fetch and blob URLs for instant navigation
	const preloadAllSlides = async (slidesToPreload) => {
		if (!slidesToPreload || slidesToPreload.length === 0) {
			return;
		}

		setIsPreloadingWindow(true);
		setPreloadProgress(0);

		clog('🚀 Starting full slide preloading for', slidesToPreload.length, 'slides (blob URLs for instant switching)');

		try {
			let completedCount = 0;
			const newBlobUrls = new Map();
			const token = localStorage.getItem('token') || localStorage.getItem('authToken');

			const preloadPromises = slidesToPreload.map(async (slide) => {
				try {
					// Fetch slide with authentication
					const response = await fetch(slide.url, {
						method: 'GET',
						headers: {
							Authorization: `Bearer ${token}`,
						},
					});

					if (!response.ok) {
						throw new Error(`Failed to fetch slide: ${response.status}`);
					}

					// Convert to blob and create object URL
					const blob = await response.blob();
					const blobUrl = URL.createObjectURL(blob);

					// Store blob URL for instant access
					newBlobUrls.set(slide.id, blobUrl);

					completedCount++;
					setPreloadedSlides((prev) => new Set([...prev, slide.id]));
					setPreloadProgress(completedCount / slidesToPreload.length);
					clog(`✅ Cached slide in memory ${completedCount}/${slidesToPreload.length}: ${slide.filename}`);

					return { slide, blobUrl };
				} catch (error) {
					completedCount++;
					setPreloadProgress(completedCount / slidesToPreload.length);
					cerror(`⚠️ Failed to cache slide: ${slide.filename}`, error);
					return { slide, blobUrl: null };
				}
			});

			await Promise.all(preloadPromises);

			// Update blob URLs state
			setSlideBlobUrls(newBlobUrls);

			clog(`🎉 Full slide preloading completed! ${newBlobUrls.size}/${slidesToPreload.length} slides cached in memory`);
		} catch (error) {
			cerror('Error during full slide preloading:', error);
		} finally {
			setIsPreloadingWindow(false);
			setPreloadProgress(1);
		}
	};

	// Slideshow Control Functions - Instant navigation (all slides preloaded)
	const nextSlide = () => {
		if (currentSlideIndex < renderedSlides.length - 1) {
			setCurrentSlideIndex(currentSlideIndex + 1);
		}
	};

	const prevSlide = () => {
		if (currentSlideIndex > 0) {
			setCurrentSlideIndex(currentSlideIndex - 1);
		}
	};

	const goToSlide = (index) => {
		if (index >= 0 && index < renderedSlides.length) {
			setCurrentSlideIndex(index);
		}
	};

	const togglePlay = () => {
		setIsPlaying((prev) => !prev);
	};

	const toggleMute = () => {
		setIsMuted((prev) => !prev);
		if (audioRef.current) {
			audioRef.current.muted = !isMuted;
		}
	};

	const toggleTimer = () => {
		setIsTimerVisible((prev) => !prev);
	};

	const handleTimerPlay = () => {
		setIsTimerRunning(true);
	};

	const handleTimerPause = () => {
		setIsTimerRunning(false);
	};

	const handleTimerStop = () => {
		setIsTimerRunning(false);
		setTimerTime(300); // Reset to default
	};

	const handleTimerTimeUpdate = (newTime) => {
		setTimerTime(newTime);
	};

	const handleTimerDragEnd = (position) => {
		setTimerPosition(position);
	};

	const enterFullscreen = async () => {
		if (presentationRef.current && !isFullscreen) {
			try {
				if (presentationRef.current.requestFullscreen) {
					await presentationRef.current.requestFullscreen();
				} else if (presentationRef.current.webkitRequestFullscreen) {
					await presentationRef.current.webkitRequestFullscreen();
				} else if (presentationRef.current.msRequestFullscreen) {
					await presentationRef.current.msRequestFullscreen();
				}
				setIsFullscreen(true);
			} catch (error) {
				cerror('Error entering fullscreen:', error);
			}
		}
	};

	const exitFullscreen = async () => {
		try {
			if (document.exitFullscreen) {
				await document.exitFullscreen();
			} else if (document.webkitExitFullscreen) {
				await document.webkitExitFullscreen();
			} else if (document.msExitFullscreen) {
				await document.msExitFullscreen();
			}
			setIsFullscreen(false);
		} catch (error) {
			cerror('Error exiting fullscreen:', error);
		}
	};

	const exitPresentation = () => {
		if (isFullscreen) {
			exitFullscreen();
		}
		navigate(`/product-details?type=lesson_plan&id=${lessonPlanId}`);
	};

	// Keyboard navigation
	useEffect(() => {
		const handleKeyPress = (e) => {
			if (!hasAccess || renderedSlides.length === 0) return;

			switch (e.key) {
				case 'ArrowRight':
				case ' ':
					e.preventDefault();
					nextSlide();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					prevSlide();
					break;
				case 'Escape':
					e.preventDefault();
					exitPresentation();
					break;
				case 'f':
				case 'F':
					e.preventDefault();
					if (isFullscreen) {
						exitFullscreen();
					} else {
						enterFullscreen();
					}
					break;
			}
		};

		document.addEventListener('keydown', handleKeyPress);
		return () => document.removeEventListener('keydown', handleKeyPress);
	}, [hasAccess, renderedSlides.length, currentSlideIndex, isFullscreen]);

	// Fullscreen change detection
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(
				!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
			);
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('msfullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('msfullscreenchange', handleFullscreenChange);
		};
	}, []);

	// Cleanup blob URLs on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			slideBlobUrls.forEach((blobUrl) => {
				URL.revokeObjectURL(blobUrl);
			});
		};
	}, [slideBlobUrls]);

	// Current slide data
	const currentSlide = renderedSlides[currentSlideIndex];

	if (isLoading || isPreloadingWindow) {
		return (
			<div className='fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center z-50'>
				<div className='text-center max-w-md px-6'>
					{/* Product Title */}
					{presentationData?.lessonPlan?.title && (
						<h1 className='text-3xl md:text-4xl font-bold text-white mb-8 leading-tight'>
							{presentationData.lessonPlan.title}
						</h1>
					)}

					{/* Loading Spinner */}
					<LudoraLoadingSpinner
						message={isPreloadingWindow ? 'מכין שקפים לצפייה מיידית...' : 'טוען פרזנטציה...'}
						status='loading'
						size='lg'
						theme='dark'
					/>

					{/* Progress Bar */}
					{isPreloadingWindow && preloadProgress > 0 && (
						<div className='mt-6'>
							<div className='w-full bg-gray-700 rounded-full h-2 mb-3'>
								<div
									className='bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out'
									style={{ width: `${preloadProgress * 100}%` }}
								/>
							</div>
							<p className='text-gray-300 text-sm'>{Math.round(preloadProgress * 100)}% מוכן</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	if (error && !hasAccess) {
		return (
			<div className='fixed inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6 z-50'>
				<div className='text-center max-w-md'>
					<div className='w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6'>
						<AlertCircle className='w-10 h-10 text-white' />
					</div>
					<h2 className='text-2xl font-bold text-white mb-4'>גישה נדרשת</h2>
					<p className='text-gray-300 mb-6'>{error}</p>
					<Button
						onClick={() => navigate(`/product-details?type=lesson_plan&id=${lessonPlanId}`)}
						className='bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3'
					>
						חזור לעמוד המוצר
					</Button>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='fixed inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6 z-50'>
				<div className='text-center max-w-md'>
					<div className='w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6'>
						<AlertCircle className='w-10 h-10 text-white' />
					</div>
					<h2 className='text-2xl font-bold text-white mb-4'>שגיאה</h2>
					<p className='text-gray-300 mb-6'>{error}</p>
					<Button
						onClick={() => navigate(`/product-details?type=lesson_plan&id=${lessonPlanId}`)}
						className='bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3'
					>
						חזור
					</Button>
				</div>
			</div>
		);
	}

	if (!hasAccess || renderedSlides.length === 0) {
		return (
			<div className='fixed inset-0 bg-black flex items-center justify-center z-50'>
				<div className='text-center text-white'>
					<h2 className='text-2xl font-bold mb-4'>אין קבצי פרזנטציה זמינים</h2>
					<Button
						onClick={() => navigate(`/product-details?type=lesson_plan&id=${lessonPlanId}`)}
						className='bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3'
					>
						חזור
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={presentationRef}
			className='fixed inset-0 bg-black z-50 flex flex-col'
		>
			{/* Main Presentation Area */}
			<div className='flex-1 relative overflow-hidden' data-presentation-area>
				{(isRenderingSlides || isLoading) && (
					<div className='absolute inset-0 bg-black/80 flex items-center justify-center z-10'>
						<LudoraLoadingSpinner
							message={isRenderingSlides ? 'עיבוד קבצי פרזנטציה...' : 'טוען פרזנטציה...'}
							status='loading'
							size='lg'
							theme='dark'
						/>
					</div>
				)}

				{currentSlide && !isRenderingSlides && (
					<div
						ref={slideContainerRef}
						className='w-full h-full bg-black flex items-center justify-center'
						style={{
							background: 'black',
							position: 'relative',
						}}
					>
						{currentSlide.type === 'svg' ? (
							<img
								src={slideBlobUrls.get(currentSlide.id) || currentSlide.url}
								alt={currentSlide.filename}
								className='max-w-full max-h-full object-contain'
								style={{
									width: 'auto',
									height: 'auto',
									maxWidth: '100%',
									maxHeight: '100%',
								}}
								onError={(e) => {
									cerror(`Error loading SVG slide: ${currentSlide.filename}`, e);
								}}
								onLoad={() => {
									const isCached = slideBlobUrls.has(currentSlide.id);
									clog(
										`✅ SVG slide displayed: ${currentSlide.filename} ${
											isCached ? '(from memory blob)' : '(direct from server)'
										}`
									);
								}}
							/>
						) : (
							<div
								className='slide-content-debug'
								style={{
									width: '100%',
									height: '100%',
									position: 'relative',
								}}
								data-slide-id={currentSlide.id}
								data-extraction-method={currentSlide.extractionMethod}
								dangerouslySetInnerHTML={{ __html: currentSlide.html || '' }}
							/>
						)}
					</div>
				)}

				{/* Ludora Logo */}
				<div className='absolute top-4 right-4'>
					<img
						src={logoSm}
						alt='Ludora'
						className='h-24 w-auto opacity-80 hover:opacity-100 transition-opacity'
					/>
				</div>

				{/* Draggable Timer Component */}
				{isTimerVisible && (
					<TimerComponent
						defaultTime={timerTime}
						allowTimeChange={!isTimerRunning}
						isCompact={false}
						isDraggable={true}
						isExternallyRunning={isTimerRunning}
						onPlay={handleTimerPlay}
						onPause={handleTimerPause}
						onStop={handleTimerStop}
						onTimeUpdate={handleTimerTimeUpdate}
						onDragEnd={handleTimerDragEnd}
						style={{
							left: timerPosition.x,
							top: timerPosition.y,
							zIndex: 1000,
						}}
					/>
				)}

			</div>

			{/* Control Bar */}
			<div className='bg-gradient-to-r from-slate-900/95 via-gray-900/95 to-slate-900/95 backdrop-blur-xl border-t border-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 shadow-2xl'>
				{/* Enhanced Progress Bar - Top Position */}
				<div className='relative h-1 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 overflow-hidden'>
					<div
						className='h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 shadow-lg shadow-blue-500/50 transition-all duration-500 ease-out relative'
						style={{
							width: `${renderedSlides.length > 0 ? ((currentSlideIndex + 1) / renderedSlides.length) * 100 : 0}%`,
						}}
					>
						<div className='absolute inset-0 bg-gradient-to-r from-blue-300 to-cyan-300 opacity-60 animate-pulse'></div>
					</div>
				</div>

				{/* Main Control Panel */}
				<div className='px-4 py-2'>
					<div className='flex items-center justify-between max-w-6xl mx-auto'>
						{/* Left Section - Slide Counter (only show when not fullscreen) */}
						<div className='flex items-center gap-3'>
							{!isFullscreen && (
								<div className='bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-600/30 shadow-inner'>
									<div className='text-center'>
										<div className='text-white font-semibold text-sm leading-none'>{currentSlideIndex + 1}</div>
										<div className='text-gray-400 text-xs font-medium'>מתוך {renderedSlides.length}</div>
									</div>
								</div>
							)}
						</div>

						{/* Center Section - Navigation Controls */}
						<div className='flex items-center justify-center gap-6'>
							<Button
								onClick={prevSlide}
								disabled={currentSlideIndex === 0}
								variant='ghost'
								size='sm'
								className='h-10 w-10 text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 rounded-lg bg-black/40 backdrop-blur-sm border border-gray-600/30 shadow-lg'
							>
								<SkipForward className='w-5 h-5' />
							</Button>

							{/* Center Title */}
							<div className='text-center min-w-max'>
								<div className='text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white leading-tight'>
									{presentationData?.lessonPlan?.title}
								</div>
							</div>

							<Button
								onClick={nextSlide}
								disabled={currentSlideIndex === renderedSlides.length - 1}
								variant='ghost'
								size='sm'
								className='h-10 w-10 text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 hover:text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 rounded-lg bg-black/40 backdrop-blur-sm border border-gray-600/30 shadow-lg'
							>
								<SkipForward className='w-5 h-5 rotate-180' />
							</Button>
						</div>

						{/* Right Section - Controls */}
						<div className='flex items-center gap-3'>
							{/* Timer and System Controls */}
							<div className='flex items-center bg-black/40 backdrop-blur-sm rounded-lg p-1 border border-gray-600/30 shadow-lg'>
								<Button
									onClick={toggleTimer}
									variant='ghost'
									size='sm'
									className={`h-8 w-8 text-white hover:bg-gradient-to-r hover:from-yellow-500/20 hover:to-orange-500/20 hover:text-yellow-200 transition-all duration-300 rounded-md ${
										isTimerRunning ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-200' : ''
									}`}
								>
									<Timer className={`w-4 h-4 ${isTimerRunning ? 'animate-pulse' : ''}`} />
								</Button>

								{/* Compact Timer Display (when running but not visible) */}
								{isTimerRunning && !isTimerVisible && (
									<TimerComponent
										defaultTime={timerTime}
										allowTimeChange={false}
										isCompact={true}
										isDraggable={false}
										isExternallyRunning={isTimerRunning}
										onTimeUpdate={handleTimerTimeUpdate}
									/>
								)}

								{audioFiles.length > 0 && (
									<Button
										onClick={toggleMute}
										variant='ghost'
										size='sm'
										className='h-8 w-8 text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 hover:text-pink-200 transition-all duration-300 rounded-md'
									>
										{isMuted ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
									</Button>
								)}

								<Button
									onClick={isFullscreen ? exitFullscreen : enterFullscreen}
									variant='ghost'
									size='sm'
									className='h-8 w-8 text-white hover:bg-gradient-to-r hover:from-green-500/20 hover:to-emerald-500/20 hover:text-emerald-200 transition-all duration-300 rounded-md'
								>
									<Maximize className='w-4 h-4' />
								</Button>
							</div>

							{/* Embedded Classroom Effects Menu */}
							{isEffectsEnabled && (
								<ClassroomEffectMenu
									display={true}
									effectsToExclude={[]}
									layout="horizontal"
									mode="embedded"
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Audio Element */}
			{audioFiles.length > 0 && (
				<audio
					ref={audioRef}
					src={audioFiles[0]?.url}
					muted={isMuted}
					loop
					autoPlay
				/>
			)}
		</div>
	);
}
