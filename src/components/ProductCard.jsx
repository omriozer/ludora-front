import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductTypeName, formatGradeRange } from '@/config/productTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductImage from '@/components/ui/ProductImage';
import { Eye, CheckCircle, Edit, BookOpen } from 'lucide-react';
import PriceDisplayTag from '@/components/ui/PriceDisplayTag';
import ProductActionBar from '@/components/ui/ProductActionBar';
import { getSubjectColors } from '@/config/subjectColors';
import { getToolCategoryLabel } from '@/config/toolCategories';
import { useUser } from '@/contexts/UserContext';
import { ludlog } from '@/lib/ludlog';
import KitBadge from '@/components/ui/KitBadge';
import DraftBadgeDisplay from '@/components/ui/DraftBadgeDisplay';
import { isBundle } from '@/lib/bundleUtils';
import { isDraft } from '@/lib/productAccessUtils';
import { SafeHtmlRenderer, hasRichContent } from '@/components/ui/SafeHtmlRenderer';
import CurriculumLinkButton from '@/components/ui/CurriculumLinkButton';
import { useAnalytics, useInteractionTracking } from '@/hooks/useAnalytics';
import { withPerformanceMonitoring, usePerformanceMeasurement } from '@/utils/performanceMonitor.jsx';

// Hebrew grade names constant
export const HEBREW_GRADES = {
	1: 'כיתה א',
	2: 'כיתה ב',
	3: 'כיתה ג',
	4: 'כיתה ד',
	5: 'כיתה ה',
	6: 'כיתה ו',
	7: 'כיתה ז',
	8: 'כיתה ח',
	9: 'כיתה ט',
	10: 'כיתה י',
	11: 'כיתה יא',
	12: 'כיתה יב',
};

function ProductCard({
	product,
	_userPurchases = [], // Legacy parameter - no longer used (AccessControlIntegrator provides access info)
	onFileAccess,
	onPdfPreview,
	isExpanded = false,
	onToggleExpanded,
	onEdit,
	showActionBar = true,
	subscriptionEligibility = null,
	onSubscriptionSuccess,
}) {
	const navigate = useNavigate();
	const { currentUser, isAdmin } = useUser();
	const [isHovered, setIsHovered] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Analytics tracking
	const { track } = useAnalytics();
	const { trackInteraction } = useInteractionTracking('ProductCard');

	// Performance monitoring
	const { startMeasurement, endMeasurement } = usePerformanceMeasurement();

	// SINGLE SOURCE OF TRUTH: Use only AccessControlIntegrator embedded access info
	const access = product?.access || {};
	const hasAccess = access.hasAccess || false;

	// ADMIN-ONLY VISIBILITY: Hide unpublished products from non-admins
	if (isDraft(product) && !isAdmin()) {
		return null;
	}

	// Detect if device is mobile/touch with improved logic
	useEffect(() => {
		const checkMobile = () => {
			// More accurate mobile detection
			const width = window.innerWidth <= 768;
			const touchDevice = 'ontouchstart' in window && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
			const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			);

			const isMobileDevice = width || (touchDevice && mobileUserAgent);

			setIsMobile(isMobileDevice);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Handle successful purchase for ProductActionBar
	const handlePurchaseSuccess = () => {
		// Purchase handled successfully
		if (onSubscriptionSuccess) {
			onSubscriptionSuccess();
		}
	};

	// Handle successful subscription claim for ProductActionBar
	const handleSubscriptionClaimSuccess = (claimResult) => {
		// Subscription claim handled successfully
		ludlog.ui('Product claimed via subscription from ProductCard', {
			productId: product.id,
			productType: product.product_type,
			claimResult,
		});

		// Call parent callback to refetch subscription data
		if (onSubscriptionSuccess) {
			onSubscriptionSuccess();
		}
	};

	// Handle bundle access for ProductActionBar
	const handleBundleAccess = (bundleProduct) => {
		// For bundles, navigate to ProductDetails page which can show the bundle preview modal
		navigate(`/product-details?product=${bundleProduct.id}`);
	};

	const handleDetailsClick = () => {
		// Track product view interaction
		track.product('view', product.product_type, product.id, {
			has_access: hasAccess,
			is_bundle: isBundle(product),
			is_draft: isDraft(product),
			price: product.price,
			creator_type: currentUser?.id === product.creator_user_id ? 'self' : 'other'
		});

		trackInteraction('details_click', {
			product_id: product.id,
			product_type: product.product_type,
			source: 'product_card'
		});

		navigate(`/product-details?product=${product.id}`);
	};

	const handleEdit = (e) => {
		e.stopPropagation();
		if (onEdit) {
			onEdit(product);
		}
	};


	const handleCardClick = (e) => {
		e.stopPropagation();

		if (isMobile) {
			// On mobile: toggle expanded state
			if (onToggleExpanded) {
				onToggleExpanded(product.id);
			}
		} else {
			// On desktop: go to details page
			handleDetailsClick();
		}
	};

	// Get subject from type_attributes for study class display
	const getStudyClass = () => {
		// For tools, use Hebrew category translation
		if (product.product_type === 'tool' && product.category) {
			return getToolCategoryLabel(product.category);
		}
		// For other types, use subject or fallback to category
		return product.type_attributes?.subject || product.category || '';
	};

	// Get grade range for expanded view with proper Hebrew names
	const getGradeRange = () => {
		if (!product.type_attributes) return '';
		const { grade_min, grade_max } = product.type_attributes;
		if (!grade_min && !grade_max) return '';

		if (grade_min && grade_max) {
			if (grade_min === grade_max) {
				return HEBREW_GRADES[grade_min] || `כיתה ${grade_min}`;
			}
			const minName = HEBREW_GRADES[grade_min] || grade_min;
			const maxName = HEBREW_GRADES[grade_max] || grade_max;
			return `כיתות ${minName.replace('כיתה ', '')}-${maxName.replace('כיתה ', '')}`;
		}

		if (grade_min) {
			const minName = HEBREW_GRADES[grade_min] || `כיתה ${grade_min}`;
			return `מ${minName}`;
		}

		if (grade_max) {
			const maxName = HEBREW_GRADES[grade_max] || `כיתה ${grade_max}`;
			return `עד ${maxName}`;
		}

		return '';
	};

	// Get description content - prioritize short_description, then use description
	const getDescriptionContent = () => {
		startMeasurement('ProductCard-description-processing');

		// Prefer short_description as it's designed to be brief
		if (product.short_description && product.short_description.trim()) {
			endMeasurement('ProductCard-description-processing');
			return {
				content: product.short_description,
				isRichText: false,
			};
		}

		// Use description field
		const desc = product.description || '';
		if (!desc.trim()) {
			endMeasurement('ProductCard-description-processing');
			return null;
		}

		// Check if description contains rich text formatting
		const isRich = hasRichContent(desc);
		if (isRich) {
			endMeasurement('ProductCard-description-processing');
			return {
				content: desc,
				isRichText: true,
			};
		} else {
			// Plain text description - truncate if needed
			const truncated = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
			endMeasurement('ProductCard-description-processing');
			return {
				content: truncated,
				isRichText: false,
			};
		}
	};

	// Memoize expensive calculations to prevent infinite re-renders
	const cardHeight = useMemo(() => {
		const baseHeight = 352; // Fixed height for all cards (320px + 10%)
		return baseHeight;
	}, []);

	return (
		<div
			className='group transition-all duration-300 hover:scale-[1.02] break-inside-avoid mb-3 md:mb-4 cursor-pointer mobile-safe-card'
			onMouseEnter={() => {
				!isMobile && setIsHovered(true);
			}}
			onMouseLeave={() => {
				!isMobile && setIsHovered(false);
			}}
			onClick={handleCardClick}
		>
			{/* 100% Image Card with Overlays */}
			<div
				className='relative rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden'
				style={{ height: `${cardHeight}px` }}
			>
				{/* Background Image */}
				<ProductImage
					product={product}
					className='absolute inset-0 w-full h-full object-cover'
					iconClassName='w-16 h-16 text-gray-400'
					containerClassName='absolute inset-0 w-full h-full'
				/>

				{/* Base overlay for better text readability */}
				<div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10'></div>

				{/* Always Visible - Top Left: Details Button and Edit Button (for admins) */}
				<div className='absolute top-3 md:top-4 left-3 md:left-4 z-50 flex gap-1 md:gap-2'>
					{/* Edit Button - Only visible to admin users */}
					{(() => {
						return isAdmin();
					})() && (
						<Button
							variant='ghost'
							size='sm'
							onClick={handleEdit}
							className='bg-blue-500/95 backdrop-blur-sm text-white hover:bg-blue-600 rounded-full p-2 shadow-lg transition-all duration-300'
						>
							<Edit className='w-4 h-4' />
						</Button>
					)}

					{/* Curriculum Link Button - Only visible to admin users and for supported product types */}
					<CurriculumLinkButton
						product={product}
						variant="default"
						className="p-2"
						onLinksUpdated={onSubscriptionSuccess}
					/>
					<Button
						variant='ghost'
						size='sm'
						onClick={(e) => {
							e.stopPropagation();
							handleDetailsClick();
						}}
						className='bg-white/95 backdrop-blur-sm text-gray-800 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300'
					>
						<Eye className='w-4 h-4' />
					</Button>
				</div>

				{/* Always Visible - Top Right: Price or Owned Indicator + Draft Badge + Kit Badge */}
				<div className='absolute top-3 md:top-4 right-3 md:right-4 z-30 flex flex-col items-end gap-1 md:gap-2'>
					{/* Draft Badge for unpublished products (admin only) */}
					<DraftBadgeDisplay
						product={product}
						user={currentUser}
						variant='default'
						size='sm'
					/>

					{/* Kit Badge for bundle products */}
					{isBundle(product) && (
						<KitBadge
							product={product}
							variant='default'
							size='sm'
						/>
					)}

					{/* Price or Owned Status */}
					{hasAccess ? (
						<div className='bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-2'>
							<CheckCircle className='w-3 h-3' />
							ברשותך
						</div>
					) : (
						<div className='bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg'>
							<PriceDisplayTag
								originalPrice={product.price}
								discount={product.discount || 0}
								variant='simple'
								size='xs'
								showDiscount={true}
							/>
						</div>
					)}
				</div>

				{/* Always Visible - Bottom: Name, Study Subject, and Tags */}
				<div className='absolute bottom-0 left-0 right-0 mobile-padding z-30'>
					{/* Title */}
					<h3 className='text-white text-base md:text-lg font-bold leading-tight line-clamp-2 mb-1.5 md:mb-2 drop-shadow-lg mobile-safe-text'>
						{product.title}
					</h3>

					{/* Study Subject - Under the name */}
					{getStudyClass() && (
						<div className='mb-2'>
							<span
								className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
									getSubjectColors(getStudyClass()).bg
								} ${getSubjectColors(getStudyClass()).text} border ${getSubjectColors(getStudyClass()).border}`}
							>
								{getStudyClass()}
							</span>
						</div>
					)}

					{/* Tags - Always visible */}
					{product.tags && product.tags.length > 0 && product.tags.some((tag) => tag && tag.trim()) && (
						<div className='flex flex-wrap gap-1'>
							{product.tags
								.filter((tag) => tag && tag.trim())
								.slice(0, 2)
								.map((tag, index) => (
									<Badge
										key={index}
										variant='secondary'
										className='text-xs bg-white/20 backdrop-blur-sm text-white border-white/20 px-2 py-1 rounded-full font-medium'
									>
										{tag}
									</Badge>
								))}
							{product.tags.filter((tag) => tag && tag.trim()).length > 2 && (
								<Badge
									variant='secondary'
									className='text-xs bg-white/10 backdrop-blur-sm text-white/80 border-white/10 px-2 py-1 rounded-full font-medium'
								>
									+{product.tags.filter((tag) => tag && tag.trim()).length - 2}
								</Badge>
							)}
						</div>
					)}
				</div>

				{/* Enhanced Expanded Content - Appears on Hover (desktop) or Click (mobile) */}
				<div
					className={`absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70 backdrop-blur-[2px] transition-all duration-500 z-40 mobile-safe-container ${
						isHovered || isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
					}`}
				>
					<div className='h-full flex flex-col justify-between mobile-padding'>
						{/* Top: Grades */}
						<div className='flex justify-end items-start'>
							{/* Grades - Extended mode only */}
							{getGradeRange() && (
								<div className='bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/10'>
									📚 {getGradeRange()}
								</div>
							)}
						</div>

						{/* Center: Enhanced Description */}
						<div className='text-center flex-grow flex flex-col justify-center mobile-padding-x'>
							{/* Description */}
							{(() => {
								const descContent = getDescriptionContent();
								if (!descContent) return null;

								if (descContent.isRichText) {
									// Render rich text with SafeHtmlRenderer and CSS line-clamp for truncation
									return (
										<SafeHtmlRenderer
											htmlContent={descContent.content}
											className='text-white text-sm md:text-xl leading-relaxed font-light drop-shadow-2xl max-w-lg mx-auto mobile-safe-text line-clamp-3'
											fallbackText=''
										/>
									);
								} else {
									// Render plain text
									return (
										<div className='text-white text-sm md:text-xl leading-relaxed font-light drop-shadow-2xl max-w-lg mx-auto mobile-safe-text'>
											{descContent.content}
										</div>
									);
								}
							})()}
						</div>

						{/* Bottom: Action Buttons */}
						{showActionBar && (
							<div className='flex justify-center'>
								<ProductActionBar
									product={product}
									size='default'
									className='text-base font-semibold'
									showCartButton={true}
									showSubscriptionClaim={true}
									onPurchaseSuccess={handlePurchaseSuccess}
									onSubscriptionClaimSuccess={handleSubscriptionClaimSuccess}
									onFileAccess={onFileAccess}
									onPdfPreview={onPdfPreview}
									onBundleAccess={handleBundleAccess}
									subscriptionEligibility={subscriptionEligibility}
								/>
							</div>
						)}
					</div>
				</div>
			</div>

		</div>
	);
}

// Export with performance monitoring wrapper
export default withPerformanceMonitoring(ProductCard);
