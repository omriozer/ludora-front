import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, HandMetal, GripHorizontal, MicOff } from 'lucide-react';

// Import sound files
import clappingSound from '@/assets/sounds/effects/clapping.mp3';
import fireworksSound from '@/assets/sounds/effects/fireworks.mp3';
import shhhSound from '@/assets/sounds/effects/shhhh.mp3';

const ClassroomEffectMenu = ({
	display = false,
	effectsToExclude = [],
	layout = 'horizontal',
	mode = 'floating', // 'floating' or 'embedded'
	onClose = null
}) => {
	const [activeEffect, setActiveEffect] = useState(null);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const menuRef = useRef(null);

	// Audio and animation management
	const currentAudioRef = useRef(null);
	const currentAnimationElementsRef = useRef([]);
	const effectTimeoutRef = useRef(null);

	// Function to stop current effect
	const stopCurrentEffect = () => {
		// Stop audio
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current.currentTime = 0;
			currentAudioRef.current = null;
		}

		// Clear fireworks timeouts if they exist
		if (currentAnimationElementsRef.current?.timeouts) {
			currentAnimationElementsRef.current.timeouts.forEach(timeout => {
				clearTimeout(timeout);
			});
		}

		// Remove animation elements
		currentAnimationElementsRef.current.forEach(element => {
			if (element && element.parentNode) {
				element.parentNode.removeChild(element);
			}
		});
		currentAnimationElementsRef.current = [];

		// Clear main effect timeout
		if (effectTimeoutRef.current) {
			clearTimeout(effectTimeoutRef.current);
			effectTimeoutRef.current = null;
		}

		// Reset active state
		setActiveEffect(null);
	};

	// Define all available effects
	const allEffects = [
		{
			id: 'clapping',
			name: 'מחיאות כפיים',
			icon: HandMetal,
			action: () => handleEffectAction('clapping')
		},
		{
			id: 'fireworks',
			name: 'זיקוקים',
			icon: Sparkles,
			action: () => handleEffectAction('fireworks')
		},
		{
			id: 'shhhh',
			name: 'שקט בבקשה',
			icon: MicOff,
			action: () => handleEffectAction('shhhh')
		}
	];

	// Handle effect button clicks
	const handleEffectAction = (effectId) => {
		// If same effect is active, stop it
		if (activeEffect === effectId) {
			stopCurrentEffect();
			return;
		}

		// Stop any current effect before starting new one
		stopCurrentEffect();

		// Start new effect
		if (effectId === 'clapping') {
			triggerClappingEffect();
		} else if (effectId === 'fireworks') {
			triggerFireworksEffect();
		} else if (effectId === 'shhhh') {
			triggerShhhhEffect();
		}
	};

	// Filter out excluded effects
	const availableEffects = allEffects.filter(effect =>
		!effectsToExclude.includes(effect.id)
	);

	// Drag functionality (only for floating mode)
	const handleMouseDown = (e) => {
		if (mode === 'floating' && e.target.closest('.drag-handle')) {
			setIsDragging(true);
			const rect = menuRef.current.getBoundingClientRect();
			setDragOffset({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top
			});
		}
	};

	const handleMouseMove = (e) => {
		if (isDragging) {
			const newX = e.clientX - dragOffset.x;
			const newY = e.clientY - dragOffset.y;

			// Keep menu within viewport bounds
			const menuWidth = menuRef.current?.offsetWidth || 320;
			const menuHeight = menuRef.current?.offsetHeight || 100;
			const maxX = window.innerWidth - menuWidth;
			const maxY = window.innerHeight - menuHeight;

			setPosition({
				x: Math.max(0, Math.min(newX, maxX)),
				y: Math.max(0, Math.min(newY, maxY))
			});
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Add global mouse events for dragging (only for floating mode)
	useEffect(() => {
		if (mode === 'floating' && isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [mode, isDragging, dragOffset]);

	// Sound playing helper function
	const playSound = (soundFile, onLoadedMetadata, onEnded) => {
		try {
			const audio = new Audio(soundFile);
			audio.volume = 0.6; // Set moderate volume

			// Store reference for stopping
			currentAudioRef.current = audio;

			// Set up event listeners
			if (onLoadedMetadata) {
				audio.addEventListener('loadedmetadata', onLoadedMetadata);
			}

			if (onEnded) {
				audio.addEventListener('ended', onEnded);
			}

			audio.play().catch(error => {
				console.warn('Could not play sound:', error);
				// Reset reference if play failed
				currentAudioRef.current = null;
			});

			return audio;
		} catch (error) {
			console.warn('Error creating audio:', error);
			return null;
		}
	};

	const triggerClappingEffect = () => {
		console.log('🎉 Triggering clapping effect!');
		setActiveEffect('clapping');

		// Create improved clapping visual effect with 3 emojis from bottom
		const animationElements = createImprovedClappingEffect();

		// Play clapping sound with proper event handling
		const audio = playSound(
			clappingSound,
			// onLoadedMetadata: Use actual audio duration
			function() {
				const duration = this.duration * 1000; // Convert to milliseconds
				console.log(`Clapping audio duration: ${duration}ms`);

				// Clear any existing timeout
				if (effectTimeoutRef.current) {
					clearTimeout(effectTimeoutRef.current);
				}

				// Set timeout based on actual audio duration
				effectTimeoutRef.current = setTimeout(() => {
					stopCurrentEffect();
				}, duration);
			},
			// onEnded: Clean up when audio ends
			() => {
				console.log('Clapping audio ended');
				stopCurrentEffect();
			}
		);

		        // Store animation elements for cleanup
				currentAnimationElementsRef.current = animationElements;
			};
		
			const triggerShhhhEffect = () => {
				console.log('🤫 Triggering shhhh effect!');
				setActiveEffect('shhhh');
		
				// Create shhhh visual effect
				const animationElements = createShhhhVisualEffect();
		
				// Play shhh sound with proper event handling
				const audio = playSound(
					shhhSound,
					// onLoadedMetadata: Use actual audio duration
					function() {
						const duration = this.duration * 1000; // Convert to milliseconds
						console.log(`Shhh audio duration: ${duration}ms`);
		
						// Clear any existing timeout
						if (effectTimeoutRef.current) {
							clearTimeout(effectTimeoutRef.current);
						}
		
						// Set timeout based on actual audio duration
						effectTimeoutRef.current = setTimeout(() => {
							stopCurrentEffect();
						}, duration);
					},
					// onEnded: Clean up when audio ends
					() => {
						console.log('Shhh audio ended');
						stopCurrentEffect();
					}
				);
		
				// Store animation elements for cleanup
				currentAnimationElementsRef.current = animationElements;
			};
		
	const triggerFireworksEffect = () => {
		console.log('🎆 Triggering fireworks effect!');
		setActiveEffect('fireworks');

		// Create enhanced fireworks visual effect
		const animationElements = createEnhancedFireworksEffect();

		// Play fireworks sound with proper event handling
		const audio = playSound(
			fireworksSound,
			// onLoadedMetadata: Use actual audio duration
			function() {
				const duration = this.duration * 1000; // Convert to milliseconds
				console.log(`Fireworks audio duration: ${duration}ms`);

				// Clear any existing timeout
				if (effectTimeoutRef.current) {
					clearTimeout(effectTimeoutRef.current);
				}

				// Set timeout based on actual audio duration
				effectTimeoutRef.current = setTimeout(() => {
					stopCurrentEffect();
				}, duration);
			},
			// onEnded: Clean up when audio ends
			() => {
				console.log('Fireworks audio ended');
				stopCurrentEffect();
			}
		);

		// Store animation elements for cleanup
		currentAnimationElementsRef.current = animationElements;
	};

	const createImprovedClappingEffect = () => {
		const presentationArea = document.querySelector('[data-presentation-area]') || document.body;
		const clappingDuration = 10000; // Use long duration - audio will control actual ending
		const animationElements = [];

		// Create 3 clapping emojis rising from the bottom - centered as a group and synchronized
		const screenWidth = window.innerWidth;
		const centerX = screenWidth / 2;
		const emojiSpacing = 100; // Space between emojis

		for (let i = 0; i < 3; i++) {
			const clappingEmoji = document.createElement('div');
			clappingEmoji.textContent = '👏';
			clappingEmoji.classList.add('classroom-effect-element'); // Mark as effect element

			// Position emojis in a centered line: left, center, right
			const offsetX = (i - 1) * emojiSpacing; // -100, 0, +100

			clappingEmoji.style.cssText = `
				position: fixed;
				font-size: 80px;
				z-index: 9999;
				pointer-events: none;
				left: ${centerX + offsetX}px;
				bottom: -80px;
				transform: translateX(-50%);
				animation: clappingRiseAndFade ${clappingDuration}ms ease-out forwards;
			`;

			presentationArea.appendChild(clappingEmoji);
			animationElements.push(clappingEmoji);
		}

		return animationElements;
	};

	const createEnhancedFireworksEffect = () => {
		const presentationArea = document.querySelector('[data-presentation-area]') || document.body;
		const animationElements = [];
		const timeouts = [];

		// Create a simpler fireworks effect that can be easily cleaned up
		const colors = ['#ff0040', '#ff4080', '#ff8000', '#ffff00', '#00ff80', '#0080ff', '#8000ff', '#ff00ff'];
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;

		// Create multiple firework bursts
		for (let burst = 0; burst < 6; burst++) {
			const centerX = (screenWidth / 7) * (burst + 1);
			const centerY = screenHeight * (0.3 + Math.random() * 0.4);

			// Create particles for each burst
			for (let i = 0; i < 30; i++) {
				const particle = document.createElement('div');
				particle.classList.add('classroom-effect-element');

				const color = colors[Math.floor(Math.random() * colors.length)];
				const angle = (i / 30) * 2 * Math.PI;
				const distance = 80 + Math.random() * 120;

				const finalX = centerX + Math.cos(angle) * distance;
				const finalY = centerY + Math.sin(angle) * distance;

				particle.style.cssText = `
					position: fixed;
					width: 8px;
					height: 8px;
					background: ${color};
					left: ${centerX}px;
					top: ${centerY}px;
					border-radius: 50%;
					z-index: 9999;
					box-shadow: 0 0 15px ${color};
					transition: all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
					opacity: 1;
				`;

				presentationArea.appendChild(particle);
				animationElements.push(particle);

				// Animate particle outward
				const timeout1 = setTimeout(() => {
					particle.style.left = finalX + 'px';
					particle.style.top = finalY + 'px';
					particle.style.opacity = '0';
					particle.style.transform = 'scale(0.3)';
				}, burst * 500 + i * 10);

				timeouts.push(timeout1);
			}

			// Create central flash for each burst
			const flash = document.createElement('div');
			flash.classList.add('classroom-effect-element');
			flash.style.cssText = `
				position: fixed;
				width: 150px;
				height: 150px;
				background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,215,0,0.4) 30%, transparent 70%);
				left: ${centerX - 75}px;
				top: ${centerY - 75}px;
				z-index: 9998;
				border-radius: 50%;
				transform: scale(0);
				transition: all 0.5s ease-out;
				opacity: 0;
			`;

			presentationArea.appendChild(flash);
			animationElements.push(flash);

			// Animate flash
			const timeout2 = setTimeout(() => {
				flash.style.transform = 'scale(1)';
				flash.style.opacity = '1';

				const timeout3 = setTimeout(() => {
					flash.style.opacity = '0';
					flash.style.transform = 'scale(2)';
				}, 200);

				timeouts.push(timeout3);
			}, burst * 500);

			timeouts.push(timeout2);
		}

		// Store timeouts for cleanup
		animationElements.timeouts = timeouts;
		return animationElements;
	};

	const createShhhhVisualEffect = () => {
		const presentationArea = document.querySelector('[data-presentation-area]') || document.body;
		const animationElements = [];

		const container = document.createElement('div');
		container.classList.add('classroom-effect-element');
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			display: flex;
			flex-direction: column;
			align-items: center;
			z-index: 9999;
			animation: shhhFadeInOut 3s ease-in-out forwards;
		`;

		const emoji = document.createElement('div');
		emoji.textContent = '🤫';
		emoji.style.cssText = `
			font-size: 180px; /* Made bigger */
			text-shadow: 4px 4px 8px rgba(0,0,0,0.7);
		`;

		const text = document.createElement('div');
		text.textContent = 'שקט בבקשה!';
		text.style.cssText = `
			font-size: 60px; /* Made bigger */
			font-weight: bold; /* Made bolder */
			color: white;
			text-shadow: 4px 4px 8px rgba(0,0,0,0.7); /* Enhanced shadow */
			margin-top: 20px;
		`;

		container.appendChild(emoji);
		container.appendChild(text);
		presentationArea.appendChild(container);
		animationElements.push(container);

		return animationElements;
	};

	const createCelebrationEffect = (emoji, effectType) => {
		// Create multiple emoji elements for the effect
		const numberOfEmojis = effectType === 'fireworks' ? 15 : 20;
		const presentationArea = document.querySelector('[data-presentation-area]') || document.body;

		for (let i = 0; i < numberOfEmojis; i++) {
			const emojiElement = document.createElement('div');
			emojiElement.textContent = emoji;
			emojiElement.style.cssText = `
				position: fixed;
				font-size: ${Math.random() * 20 + 30}px;
				z-index: 9999;
				pointer-events: none;
				animation: ${effectType === 'fireworks' ? 'fireworkAnimation' : 'clappingAnimation'} ${effectType === 'fireworks' ? '3s' : '2s'} ease-out forwards;
				left: ${Math.random() * window.innerWidth}px;
				top: ${Math.random() * window.innerHeight}px;
			`;

			presentationArea.appendChild(emojiElement);

			// Remove element after animation
			setTimeout(() => {
				if (emojiElement.parentNode) {
					emojiElement.parentNode.removeChild(emojiElement);
				}
			}, effectType === 'fireworks' ? 3000 : 2000);
		}
	};

	// Add CSS animations if they don't exist
	const addAnimationStyles = () => {
		const styleId = 'classroom-effects-styles';
		if (!document.getElementById(styleId)) {
			const style = document.createElement('style');
			style.id = styleId;
			style.textContent = `
				@keyframes clappingAnimation {
					0% {
						opacity: 1;
						transform: scale(0.5) rotate(0deg);
					}
					50% {
						opacity: 1;
						transform: scale(1.2) rotate(180deg);
					}
					100% {
						opacity: 0;
						transform: scale(0.8) rotate(360deg) translateY(-50px);
					}
				}

				@keyframes clappingRiseAndFade {
					0% {
						opacity: 1;
						transform: translateY(0) scale(0.8);
					}
					20% {
						opacity: 1;
						transform: translateY(-50px) scale(1);
					}
					50% {
						opacity: 1;
						transform: translateY(-150px) scale(1.1);
					}
					80% {
						opacity: 0.8;
						transform: translateY(-250px) scale(1);
					}
					100% {
						opacity: 0;
						transform: translateY(-350px) scale(0.9);
					}
				}

				@keyframes fireworkAnimation {
					0% {
						opacity: 1;
						transform: scale(0.3) rotate(0deg);
					}
					25% {
						opacity: 1;
						transform: scale(1.5) rotate(90deg);
					}
					50% {
						opacity: 1;
						transform: scale(1.8) rotate(180deg);
					}
					75% {
						opacity: 0.7;
						transform: scale(1.2) rotate(270deg);
					}
					100% {
						opacity: 0;
						transform: scale(0.5) rotate(360deg) translateY(-100px);
					}
				}

				@keyframes trailFade {
					0% {
						opacity: 0.6;
						transform: scale(1);
					}
					100% {
						opacity: 0;
						transform: scale(0.3);
					}
				}

				@keyframes sparkleEffect {
					0% {
						opacity: 0;
						transform: scale(0.5) rotate(0deg);
					}
					20% {
						opacity: 1;
						transform: scale(1.2) rotate(72deg);
					}
					50% {
						opacity: 1;
						transform: scale(1) rotate(180deg);
					}
					80% {
						opacity: 0.8;
						transform: scale(1.1) rotate(288deg);
					}
					100% {
						opacity: 0;
						transform: scale(0.2) rotate(360deg);
					}
				}

				@keyframes secondaryBurst {
					0% {
						opacity: 1;
						transform: scale(1);
					}
					50% {
						opacity: 1;
						transform: scale(1.3);
					}
					100% {
						opacity: 0;
						transform: scale(0.5);
					}
				}

				@keyframes explosionFlash {
					0% {
						opacity: 0;
						transform: scale(0.5);
					}
					50% {
						opacity: 1;
						transform: scale(1.2);
					}
					100% {
						opacity: 0;
						transform: scale(2);
					}
				}

				@keyframes shhhFadeInOut {
					0% {
						opacity: 0;
					}
					20% {
						opacity: 1;
					}
					80% {
						opacity: 1;
					}
					100% {
						opacity: 0;
					}
				}
			`;
			document.head.appendChild(style);
		}
	};

	// Add animations when component mounts
	useEffect(() => {
		addAnimationStyles();
	}, []);

	// Clean up effects when component unmounts or becomes hidden
	useEffect(() => {
		if (!display) {
			stopCurrentEffect();
		}
	}, [display]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCurrentEffect();
		};
	}, []);

	if (!display) return null;

	// Embedded mode - simpler rendering without floating container
	if (mode === 'embedded') {
		return (
			<div className={`${
				layout === 'horizontal' ? 'flex flex-row gap-2' : 'flex flex-col gap-2'
			}`}>
				{availableEffects.map((effect) => {
					const IconComponent = effect.icon;
					const isActive = activeEffect === effect.id;

					return (
						<Button
							key={effect.id}
							onClick={effect.action}
							variant="ghost"
							size="sm"
							className={`
								flex items-center justify-center gap-1 h-8 px-2 text-white
								${isActive
									? 'bg-gradient-to-r from-red-500/50 to-orange-500/50 border-red-400/50 hover:from-red-400/60 hover:to-orange-400/60'
									: 'bg-black/40 border-gray-600/30 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20'
								}
								border rounded-md backdrop-blur-sm
								transition-all duration-300
								${isActive ? 'animate-pulse shadow-lg shadow-red-500/30' : ''}
							`}
							title={isActive ? `לחץ לעצירת ${effect.name}` : `לחץ להפעלת ${effect.name}`}
						>
							<IconComponent className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} />
							{layout === 'horizontal' && (
								<span className="text-xs font-medium">
									{isActive ? 'עצור' : effect.name}
								</span>
							)}
						</Button>
					);
				})}
			</div>
		);
	}

	// Floating mode - original full rendering
	return (
		<div
			ref={menuRef}
			onMouseDown={handleMouseDown}
			className={`bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl rounded-2xl border-2 border-gray-600/30 shadow-2xl shadow-purple-500/20 p-4 ${
				layout === 'horizontal' ? 'flex flex-row gap-3' : 'flex flex-col gap-3'
			} ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
			style={{
				minWidth: layout === 'horizontal' ? '320px' : '200px',
				position: 'fixed',
				left: `${position.x}px`,
				top: `${position.y}px`,
				zIndex: 9999,
				userSelect: isDragging ? 'none' : 'auto'
			}}
		>
			{/* Header with drag handle */}
			<div className={`${layout === 'vertical' ? 'mb-2' : 'mr-3 flex items-center'} flex items-center gap-2`}>
				<div
					className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-purple-300 transition-colors p-1"
					title="גרור לזיזוז התפריט"
				>
					<GripHorizontal className="w-4 h-4" />
				</div>
				<div className="text-white font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
					אפקטי כיתה
				</div>
			</div>

			{/* Effects List */}
			<div className={`${
				layout === 'horizontal'
					? 'flex flex-row gap-2 flex-1'
					: 'flex flex-col gap-2'
			}`}>
				{availableEffects.map((effect) => {
					const IconComponent = effect.icon;
					const isActive = activeEffect === effect.id;

					return (
						<Button
							key={effect.id}
							onClick={effect.action}
							variant="ghost"
							size="sm"
							className={`
								flex items-center justify-center gap-2 h-12 px-4 text-white
								${isActive
									? 'bg-gradient-to-r from-red-500/50 to-orange-500/50 border-red-400/50 hover:from-red-400/60 hover:to-orange-400/60'
									: 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30'
								}
								border rounded-xl
								transition-all duration-300 transform hover:scale-105
								${isActive ? 'animate-pulse shadow-lg shadow-red-500/30' : ''}
								${layout === 'horizontal' ? 'flex-1' : 'w-full'}
							`}
							title={isActive ? `לחץ לעצירת ${effect.name}` : `לחץ להפעלת ${effect.name}`}
						>
							<IconComponent className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} />
							<span className="text-xs font-medium">
								{isActive ? 'עצור' : effect.name}
							</span>
						</Button>
					);
				})}
			</div>

			{/* Close button for vertical layout */}
			{layout === 'vertical' && onClose && (
				<Button
					onClick={onClose}
					variant="ghost"
					size="sm"
					className="mt-2 text-gray-400 hover:text-white text-xs"
				>
					סגור
				</Button>
			)}
		</div>
	);
};

export default ClassroomEffectMenu;