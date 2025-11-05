import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { Settings } from 'lucide-react';
import GameTypeDisplay from '@/components/game/GameTypeDisplay';

/**
 * GameProductSection - Shows read-only game information and navigation
 * Displays selected game type (if any) and provides access to game settings
 */
const GameProductSection = ({ formData, editingProduct }) => {
	const { settings } = useUser();
	const navigate = useNavigate();

	// Get the selected game type details
	const selectedGameType = formData.type_attributes?.game_type;

	const handleGameSettings = () => {
		if (editingProduct?.id) {
			navigate(`/game-settings/${editingProduct.id}`);
		}
	};

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h3 className='text-lg font-semibold text-indigo-900'>הגדרות משחק</h3>
				<Button
					onClick={handleGameSettings}
					variant='outline'
					size='sm'
					className='flex items-center gap-2'
					disabled={!editingProduct?.id}
				>
					<Settings className='w-4 h-4' />
					הגדרות משחק
				</Button>
			</div>

			{selectedGameType && (
				<GameTypeDisplay
					gameTypeKey={selectedGameType}
					showEditButton={false}
					size='small'
					variant='badge'
					className='max-w-2xl mx-auto'
				/>
			)}
		</div>
	);
};

export default GameProductSection;
