import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductAPI } from '@/services/apiClient';
import { Game } from '@/services/entities';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { useUser } from '@/contexts/UserContext';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import GameTypeSelector from '@/components/game/GameTypeSelector';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';
import { MemoryGameSettingsDigital, MemoryGameSettingsOffline } from '@/components/game/settings';
import { Play, Edit, ArrowRight, Monitor, FileText, Lock } from 'lucide-react';

export default function GameSettings() {
	const { gameId } = useParams();
	const navigate = useNavigate();
	const { settings } = useUser();

	const [gameProduct, setGameProduct] = useState(null);
	const [gameEntity, setGameEntity] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [showGameTypeSelector, setShowGameTypeSelector] = useState(false);

	useEffect(() => {
		loadGameData();
	}, [gameId]);

	const loadGameData = async () => {
		setIsLoading(true);
		setError(null);

		try {
			clog('🎮 Loading game data for product ID:', gameId);

			// Load the product first
			const product = await ProductAPI.findById(gameId);
			clog('🎮 Loaded product:', product);

			// Verify this is actually a game product
			if (product.product_type !== 'game') {
				throw new Error('המוצר שנבחר אינו משחק');
			}

			setGameProduct(product);

			// If the product has an entity_id, load the game entity as well
			if (product.entity_id) {
				try {
					clog('🎮 Loading game entity for entity_id:', product.entity_id);
					const gameEntity = await Game.findById(product.entity_id);
					setGameEntity(gameEntity);
					clog('🎮 Loaded game entity:', gameEntity);
				} catch (gameError) {
					cerror('⚠️ Could not load game entity:', gameError);
					// Don't fail the whole page if game entity doesn't exist
					// This is normal for products that don't have a game entity yet
				}
			} else {
				clog('🎮 Product has no entity_id, skipping game entity load');
			}
		} catch (error) {
			cerror('❌ Error loading game data:', error);
			setError(error.message || 'שגיאה בטעינת נתוני המשחק');

			toast({
				title: 'שגיאה',
				description: 'לא ניתן לטעון את נתוני המשחק',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditProduct = () => {
		navigate(`/products/edit/${gameId}`);
	};

	const handleBackToProducts = () => {
		navigate('/products');
	};

	const handleGameTypeSelect = async (selectedGameType) => {
		setIsUpdating(true);

		try {
			clog('🎮 Updating game type to:', selectedGameType);

			// Determine digital status based on game type options
			let digitalValue;

			// Check if the game type has only one option available
			if (selectedGameType.digital && !selectedGameType.offline) {
				// Only digital available
				digitalValue = true;
				clog('🎮 Auto-selecting digital=true (only option available)');
			} else if (!selectedGameType.digital && selectedGameType.offline) {
				// Only offline/print available
				digitalValue = false;
				clog('🎮 Auto-selecting digital=false (only option available)');
			} else if (selectedGameType.digital && selectedGameType.offline) {
				// Both options available - keep existing value or default to digital
				digitalValue = gameProduct?.type_attributes?.digital !== undefined
					? gameProduct.type_attributes.digital
					: true;
				clog('🎮 Both options available, keeping existing/default digital value:', digitalValue);
			} else {
				// Fallback to digital if neither is explicitly set
				digitalValue = true;
				clog('🎮 Fallback to digital=true');
			}

			// Update the product with the new game type and digital status
			const updatedProduct = await ProductAPI.update(gameId, {
				type_attributes: {
					...gameProduct.type_attributes,
					game_type: selectedGameType.key,
					digital: digitalValue,
				},
			});

			// Update local state
			setGameProduct(updatedProduct);
			setShowGameTypeSelector(false);

			// Show appropriate success message
			const digitalText = digitalValue ? 'דיגיטלי' : 'גרסה להדפסה';
			const hasOnlyOneOption = (selectedGameType.digital && !selectedGameType.offline) ||
									(!selectedGameType.digital && selectedGameType.offline);

			const description = hasOnlyOneOption
				? `סוג המשחק הוגדר ל: ${selectedGameType.singular} (${digitalText})`
				: `סוג המשחק הוגדר ל: ${selectedGameType.singular}`;

			toast({
				title: 'הוגדר בהצלחה',
				description,
				variant: 'default',
			});

			clog('🎮 Game type updated successfully:', updatedProduct);
		} catch (error) {
			cerror('❌ Error updating game type:', error);

			toast({
				title: 'שגיאה',
				description: 'לא ניתן לעדכן את סוג המשחק',
				variant: 'destructive',
			});
		} finally {
			setIsUpdating(false);
		}
	};

	const handleEditGameType = () => {
		setShowGameTypeSelector(true);
	};

	const handleDigitalChange = async (newDigitalString) => {
		const newDigitalValue = newDigitalString === 'true';
		setIsUpdating(true);

		try {
			clog('🎮 Updating digital status to:', newDigitalValue);

			// Update the product with the new digital value
			const updatedProduct = await ProductAPI.update(gameId, {
				type_attributes: {
					...gameProduct.type_attributes,
					digital: newDigitalValue,
				},
			});

			// Update local state
			setGameProduct(updatedProduct);

			toast({
				title: 'הוגדר בהצלחה',
				description: `סוג הגרסה שונה ל: ${newDigitalValue ? 'דיגיטלי' : 'גרסה להדפסה'}`,
				variant: 'default',
			});

			clog('🎮 Digital status updated successfully:', updatedProduct);
		} catch (error) {
			cerror('❌ Error updating digital status:', error);

			toast({
				title: 'שגיאה',
				description: 'לא ניתן לעדכן את סוג הגרסה',
				variant: 'destructive',
			});
		} finally {
			setIsUpdating(false);
		}
	};

	// Check if game has a selected game type
	const hasGameType = gameProduct?.type_attributes?.game_type;
	const shouldShowSelector = !hasGameType || showGameTypeSelector;

	// Get the selected game type configuration
	const selectedGameTypeConfig = hasGameType && settings?.game_types
		? Object.values(settings.game_types).find(gt => gt.key === gameProduct.type_attributes.game_type)
		: null;

	// Check if game settings are empty (only allow digital changes when empty)
	const hasGameSettings = gameEntity?.game_settings &&
		Object.keys(gameEntity.game_settings).length > 0 &&
		Object.values(gameEntity.game_settings).some(val => val !== null && val !== undefined && val !== '');

	// Check if the game type supports both digital and offline options
	const gameTypeHasBothOptions = selectedGameTypeConfig?.digital && selectedGameTypeConfig?.offline;

	// Can only change digital if: no game settings AND game type supports both options
	const canChangeDigital = !hasGameSettings && gameTypeHasBothOptions;

	// Handle game settings changes
	const handleGameSettingsChange = async (newSettings) => {
		setIsUpdating(true);

		try {
			clog('🎮 Saving game settings:', newSettings);

			// If we have a game entity, update it
			if (gameEntity?.id) {
				// Update the game entity settings
				const updatedEntity = await Game.update(gameEntity.id, {
					game_settings: newSettings
				});

				// Update local state
				setGameEntity(updatedEntity);

				toast({
					title: 'נשמר בהצלחה',
					description: 'הגדרות המשחק נשמרו בהצלחה',
					variant: 'default',
				});

				clog('🎮 Game settings saved successfully:', updatedEntity);
			} else {
				// Create new game entity if it doesn't exist
				const newGameEntity = await Game.create({
					game_type: gameProduct.type_attributes.game_type,
					digital: gameProduct.type_attributes.digital,
					game_settings: newSettings,
					creator_user_id: gameProduct.creator_user_id
				});

				// Update the product to reference the new game entity
				const updatedProduct = await ProductAPI.update(gameId, {
					entity_id: newGameEntity.id
				});

				// Update local state
				setGameEntity(newGameEntity);
				setGameProduct(updatedProduct);

				toast({
					title: 'נשמר בהצלחה',
					description: 'הגדרות המשחק נוצרו ונשמרו בהצלחה',
					variant: 'default',
				});

				clog('🎮 Game entity created and settings saved:', { newGameEntity, updatedProduct });
			}
		} catch (error) {
			cerror('❌ Error saving game settings:', error);

			toast({
				title: 'שגיאה',
				description: 'לא ניתן לשמור את הגדרות המשחק',
				variant: 'destructive',
			});
		} finally {
			setIsUpdating(false);
		}
	};

	// Render appropriate settings component based on game type and digital status
	const renderGameSettingsComponent = () => {
		const gameType = gameProduct?.type_attributes?.game_type;
		const isDigital = gameProduct?.type_attributes?.digital;

		// Memory Game Components
		if (gameType === 'memory_game') {
			if (isDigital) {
				return (
					<MemoryGameSettingsDigital
						gameProduct={gameProduct}
						gameEntity={gameEntity}
						onSettingsChange={handleGameSettingsChange}
						isUpdating={isUpdating}
					/>
				);
			} else {
				return (
					<MemoryGameSettingsOffline
						gameProduct={gameProduct}
						gameEntity={gameEntity}
						onSettingsChange={handleGameSettingsChange}
						isUpdating={isUpdating}
					/>
				);
			}
		}

		// Placeholder for other game types
		return (
			<div className={`p-8 border rounded-lg text-center ${
				isDigital
					? 'bg-blue-50 border-blue-200'
					: 'bg-green-50 border-green-200'
			}`}>
				{isDigital ? (
					<>
						<Monitor className='w-8 h-8 text-blue-600 mx-auto mb-2' />
						<h3 className='font-semibold text-blue-800 mb-1'>
							הגדרות {selectedGameTypeConfig?.singular} דיגיטלי
						</h3>
						<p className='text-sm text-blue-600'>
							רכיב ההגדרות עבור {selectedGameTypeConfig?.singular} דיגיטלי יתווסף בהמשך
						</p>
					</>
				) : (
					<>
						<FileText className='w-8 h-8 text-green-600 mx-auto mb-2' />
						<h3 className='font-semibold text-green-800 mb-1'>
							הגדרות {selectedGameTypeConfig?.singular} להדפסה
						</h3>
						<p className='text-sm text-green-600'>
							רכיב ההגדרות עבור {selectedGameTypeConfig?.singular} להדפסה יתווסף בהמשך
						</p>
					</>
				)}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<LudoraLoadingSpinner
					message='טוען הגדרות משחק...'
					status='loading'
					size='lg'
					theme='arcade'
				/>
			</div>
		);
	}

	if (error) {
		return (
			<div className='min-h-screen bg-gray-50 p-6'>
				<div className='max-w-4xl mx-auto'>
					<Alert
						variant='destructive'
						className='mb-6'
					>
						<AlertDescription>{error}</AlertDescription>
					</Alert>

					<div className='flex gap-4'>
						<Button
							onClick={handleBackToProducts}
							variant='outline'
						>
							<ArrowRight className='w-4 h-4 ml-2' />
							חזרה לרשימת המוצרים
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className='min-h-screen bg-gray-50 p-6'
			dir='rtl'
		>
			<div className='max-w-4xl mx-auto'>
				{/* Header */}
				<div className='mb-8'>
					<div className='flex items-center justify-between mb-4'>
						<div className='flex items-center gap-3'>
							<div className='w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg'>
								<Play className='w-6 h-6 text-white' />
							</div>
							<div>
								<h1 className='text-3xl font-bold text-gray-900 mb-1'>הגדרות משחק</h1>
								<div className='flex flex-row align-items-center gap-3'>
									<div className='text-gray-600'>{gameProduct?.title || 'משחק ללא שם'}</div>
									{gameProduct?.type_attributes?.game_type && (
										<GameTypeDisplay
											gameTypeKey={gameProduct?.type_attributes?.game_type}
											showEditButton={false}
											onEdit={handleEditGameType}
											size='small'
											variant='badge'
											className='max-w-2xl mx-auto'
										/>
									)}
								</div>
							</div>
						</div>

						<div className='flex gap-4'>
							<Button
								onClick={handleBackToProducts}
								variant='outline'
							>
								<ArrowRight className='w-4 h-4 ml-2' />
								חזרה לרשימת המוצרים
							</Button>

							<Button
								onClick={handleEditProduct}
								className='bg-blue-600 hover:bg-blue-700'
							>
								<Edit className='w-4 h-4 ml-2' />
								לדף עריכת המוצר
							</Button>
						</div>
					</div>
				</div>

				{/* Game Type Section */}
				<div className='mb-8'>
					{isUpdating ? (
						<div className='flex items-center justify-center py-12'>
							<LudoraLoadingSpinner
								message='מעדכן הגדרות משחק...'
								status='loading'
								size='md'
								theme='arcade'
							/>
						</div>
					) : shouldShowSelector ? (
						<GameTypeSelector
							onGameTypeSelect={handleGameTypeSelect}
							className='max-w-4xl mx-auto'
						/>
					) : null}
				</div>

				{/* Version Selection - Compact */}
				{hasGameType && !shouldShowSelector && (
					<div className='mb-6'>
						<div className='max-w-4xl mx-auto'>
							<div className='flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm'>
								<div className='flex items-center gap-2'>
									<Label className='text-sm font-medium text-gray-700'>סוג הגרסה:</Label>
									{!gameTypeHasBothOptions && (
										<span className='text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded'>
											אוטומטי
										</span>
									)}
								</div>

								<div className='flex items-center gap-2'>
									{!canChangeDigital && (
										<div className='flex items-center gap-1 text-amber-600'>
											<Lock className='w-3 h-3' />
											<span className='text-xs'>נעול</span>
										</div>
									)}

									<Select
										value={gameProduct?.type_attributes?.digital ? 'true' : 'false'}
										onValueChange={handleDigitalChange}
										disabled={!canChangeDigital || isUpdating}
									>
										<SelectTrigger className={`w-40 h-8 text-xs ${!canChangeDigital ? 'opacity-50' : ''}`}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="true">
												<div className='flex items-center gap-1'>
													<Monitor className='w-3 h-3 text-blue-600' />
													<span>דיגיטלי</span>
												</div>
											</SelectItem>
											<SelectItem value="false">
												<div className='flex items-center gap-1'>
													<FileText className='w-3 h-3 text-green-600' />
													<span>גרסה להדפסה</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Game Settings Component - Based on Version Selection */}
				{hasGameType && !shouldShowSelector && (
					<div className='mb-8'>
						<div className='max-w-4xl mx-auto'>
							{renderGameSettingsComponent()}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
