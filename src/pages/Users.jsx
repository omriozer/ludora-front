import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, SubscriptionPlan, SubscriptionHistory, PendingSubscription, Purchase } from '@/services/entities';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/services/apiClient';
import { cerror } from '@/lib/utils';
import {
	Users,
	Search,
	Crown,
	User as UserIcon,
	Mail,
	Calendar,
	AlertTriangle,
	CheckCircle,
	Phone,
	UserCheck,
	Eye,
	Loader2,
	Clock,
	RefreshCw,
	Trash2, // Added for deleting pending subscriptions
	PlusCircle, // Added for adding new pending subscriptions
	Settings, // Added for AdminUserActionsModal
	MoreHorizontal, // Added for Actions button
} from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Dialog, // Added for the new modal
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Added for form labels in modal
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added for DatePicker
import { format } from 'date-fns'; // parseISO is not strictly needed if dates are always Date objects from the picker
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Assuming cn utility is available for styling conditional classes
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import AdminUserActionsModal from '@/components/AdminUserActionsModal';

// Helper component for confirmation dialog
function ConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText,
	cancelText,
	variant,
	isLoading,
}) {
	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription className='whitespace-pre-line'>{message}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
					<Button
						variant={variant === 'danger' ? 'destructive' : 'default'}
						onClick={onConfirm}
						disabled={isLoading}
					>
						{isLoading ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : null}
						{confirmText}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// New component: SubscriptionManagementModal
function SubscriptionManagementModal({
	user,
	subscriptionPlans,
	onClose,
	onUpdate,
	showMessage,
	setShowResetConfirm,
	setUserToReset,
	resetLoading,
}) {
	const [currentPlanId, setCurrentPlanId] = useState(user.current_subscription_plan_id || '');
	const [startDate, setStartDate] = useState(
		user.subscription_start_date ? new Date(user.subscription_start_date) : null
	);
	const [endDate, setEndDate] = useState(user.subscription_end_date ? new Date(user.subscription_end_date) : null);
	const [status, setStatus] = useState(user.subscription_status || 'free_plan');
	const [payplusUid, setPayplusUid] = useState(user.payplus_subscription_uid || '');
	const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
	const [newPendingPlanId, setNewPendingPlanId] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isFetchingPending, setIsFetchingPending] = useState(false);

	const fetchPendingSubscriptions = useCallback(async () => {
		setIsFetchingPending(true);
		try {
			const pending = await PendingSubscription.filter({ user_id: user.id });
			setPendingSubscriptions(pending);
		} catch (error) {
			cerror('Error fetching pending subscriptions:', error);
			showMessage('error', 'שגיאה בטעינת מנויים ממתינים.');
		} finally {
			setIsFetchingPending(false);
		}
	}, [user.id, showMessage]);

	useEffect(() => {
		fetchPendingSubscriptions();
	}, [fetchPendingSubscriptions]);

	const handleUpdateSubscription = async () => {
		setIsSaving(true);
		try {
			const updatedData = {
				current_subscription_plan_id: currentPlanId || null,
				subscription_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
				subscription_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
				subscription_status: status,
				payplus_subscription_uid: payplusUid || null,
				// Assuming subscription_status_updated_at should be updated upon manual change
				subscription_status_updated_at: new Date().toISOString(),
			};

			// If changing to free_plan, nullify relevant fields
			if (status === 'free_plan') {
				updatedData.current_subscription_plan_id = null;
				updatedData.subscription_start_date = null;
				updatedData.subscription_end_date = null;
				updatedData.payplus_subscription_uid = null;
			}

			await User.update(user.id, updatedData);
			showMessage('success', 'פרטי המנוי עודכנו בהצלחה.');
			onUpdate(); // Trigger refresh in parent and close modal
		} catch (error) {
			cerror('Error updating subscription:', error);
			showMessage('error', 'שגיאה בעדכון פרטי המנוי.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeletePending = async (pendingId) => {
		if (!window.confirm('האם אתה בטוח שברצונך למחוק מנוי ממתין זה?')) return;
		try {
			await PendingSubscription.delete(pendingId);
			showMessage('success', 'מנוי ממתין נמחק בהצלחה.');
			fetchPendingSubscriptions();
		} catch (error) {
			cerror('Error deleting pending subscription:', error);
			showMessage('error', 'שגיאה במחיקת מנוי ממתין.');
		}
	};

	const handleAddPending = async () => {
		if (!newPendingPlanId) {
			showMessage('error', 'יש לבחור תוכנית למנוי הממתין.');
			return;
		}
		try {
			await PendingSubscription.create({
				user_id: user.id,
				subscription_plan_id: newPendingPlanId,
				status: 'pending',
				created_date: new Date().toISOString(),
				payment_gateway: 'manual_admin', // Indicate manual creation by admin
			});
			showMessage('success', 'מנוי ממתין נוסף בהצלחה.');
			setNewPendingPlanId('');
			fetchPendingSubscriptions();
		} catch (error) {
			cerror('Error adding pending subscription:', error);
			showMessage('error', 'שגיאה בהוספת מנוי ממתין.');
		}
	};

	const getPlanName = (planId) => {
		const plan = subscriptionPlans.find((p) => p.id === planId);
		return plan ? plan.name : 'תוכנית לא ידועה';
	};

	return (
		<Dialog
			open={true}
			onOpenChange={onClose}
		>
			<DialogContent className='sm:max-w-[650px] max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>ניהול מנוי למשתמש: {user.full_name}</DialogTitle>
					<DialogDescription>עדכן את פרטי המנוי של המשתמש.</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 py-4'>
					{/* Current Subscription Section */}
					<h4 className='text-lg font-semibold border-b pb-2 mb-2'>מנוי נוכחי</h4>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='current-plan'>תוכנית נוכחית</Label>
							<Select
								value={currentPlanId}
								onValueChange={setCurrentPlanId}
							>
								<SelectTrigger id='current-plan'>
									<SelectValue placeholder='בחר תוכנית' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={null}>אין מנוי</SelectItem>
									{subscriptionPlans.map((plan) => (
										<SelectItem
											key={plan.id}
											value={plan.id}
										>
											{plan.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='status'>סטטוס מנוי</Label>
							<Select
								value={status}
								onValueChange={setStatus}
							>
								<SelectTrigger id='status'>
									<SelectValue placeholder='בחר סטטוס' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='active'>פעיל</SelectItem>
									<SelectItem value='past_due'>חוב</SelectItem>
									<SelectItem value='cancelled'>בוטל</SelectItem>
									<SelectItem value='free_plan'>חינמי</SelectItem>
									<SelectItem value='trialing'>תקופת ניסיון</SelectItem>
									<SelectItem value='paused'>מושהה</SelectItem> {/* Added paused status */}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='start-date'>תאריך התחלה</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant={'outline'}
										className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
									>
										<Calendar className='mr-2 h-4 w-4' />
										{startDate ? format(startDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className='w-auto p-0'
									align='start'
								>
									<Calendar
										mode='single'
										selected={startDate}
										onSelect={setStartDate}
										initialFocus
										locale={he}
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='end-date'>תאריך סיום</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant={'outline'}
										className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
									>
										<Calendar className='mr-2 h-4 w-4' />
										{endDate ? format(endDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className='w-auto p-0'
									align='start'
								>
									<Calendar
										mode='single'
										selected={endDate}
										onSelect={setEndDate}
										initialFocus
										locale={he}
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className='space-y-2 col-span-1 md:col-span-2'>
							<Label htmlFor='payplus-uid'>PayPlus UID (מזהה PayPlus)</Label>
							<Input
								id='payplus-uid'
								value={payplusUid || ''}
								onChange={(e) => setPayplusUid(e.target.value)}
								placeholder='הכנס PayPlus Subscription UID'
							/>
						</div>
					</div>

					{/* Pending Subscriptions Section */}
					<h4 className='text-lg font-semibold border-b pb-2 mb-2 mt-6'>מנויים ממתינים</h4>
					{isFetchingPending ? (
						<div className='flex items-center justify-center py-4 text-gray-500'>
							<Loader2 className='w-5 h-5 animate-spin mr-2' />
							<span>טוען מנויים ממתינים...</span>
						</div>
					) : pendingSubscriptions.length === 0 ? (
						<p className='text-gray-500 text-sm'>אין מנויים ממתינים למשתמש זה.</p>
					) : (
						<div className='space-y-2'>
							{pendingSubscriptions.map((pending) => (
								<div
									key={pending.id}
									className='flex items-center justify-between p-2 border rounded-md'
								>
									<div className='flex items-center gap-2'>
										<Clock className='w-4 h-4 text-orange-500' />
										<span>{getPlanName(pending.subscription_plan_id)}</span>
										<Badge variant='outline'>{pending.status}</Badge>
										<span className='text-xs text-gray-500'>
											נוצר ב-{pending.created_date && !isNaN(new Date(pending.created_date))
												? format(new Date(pending.created_date), 'dd/MM/yyyy', { locale: he })
												: 'תאריך לא ידוע'
											}
										</span>
									</div>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => handleDeletePending(pending.id)}
										title='מחק מנוי ממתין'
									>
										<Trash2 className='w-4 h-4 text-red-500' />
									</Button>
								</div>
							))}
						</div>
					)}

					<div className='flex flex-col sm:flex-row gap-2 mt-4'>
						<Select
							value={newPendingPlanId}
							onValueChange={setNewPendingPlanId}
							className='flex-grow'
						>
							<SelectTrigger>
								<SelectValue placeholder='הוסף מנוי ממתין חדש' />
							</SelectTrigger>
							<SelectContent>
								{subscriptionPlans.map((plan) => (
									<SelectItem
										key={plan.id}
										value={plan.id}
									>
										{plan.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							onClick={handleAddPending}
							disabled={!newPendingPlanId}
						>
							<PlusCircle className='w-4 h-4 mr-2' />
							הוסף ממתין
						</Button>
					</div>
				</div>

				<DialogFooter className='flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 pt-4 border-t'>
					<Button
						variant='destructive'
						onClick={() => {
							// Trigger the parent's confirmation dialog for full reset
							setUserToReset(user);
							setShowResetConfirm(true);
						}}
						disabled={resetLoading === user.id} // Use parent's reset loading state
					>
						{resetLoading === user.id ? (
							<Loader2 className='w-4 h-4 mr-2 animate-spin' />
						) : (
							<RefreshCw className='w-4 h-4 mr-2' />
						)}
						איפוס מנוי מלא
					</Button>
					<div className='flex gap-2 mt-2 sm:mt-0'>
						<Button
							variant='outline'
							onClick={onClose}
						>
							ביטול
						</Button>
						<Button
							onClick={handleUpdateSubscription}
							disabled={isSaving}
						>
							{isSaving ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : null}
							שמור שינויים
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function UsersPage() {
	const navigate = useNavigate();
	const { currentUser, isLoading: userLoading } = useUser();

	const [users, setUsers] = useState([]);
	const [subscriptionPlans, setSubscriptionPlans] = useState([]);
	const [isLoading, setLoading] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [message, setMessage] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [impersonationLoading, setImpersonationLoading] = useState(null);
	const [resetLoading, setResetLoading] = useState(null);

	// New states for subscription reset confirmation
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [userToReset, setUserToReset] = useState(null);

	// New states for subscription management modal
	const [showManageSubscription, setShowManageSubscription] = useState(false);
	const [userToManage, setUserToManage] = useState(null);

	// New states for admin user actions modal
	const [showUserActionsModal, setShowUserActionsModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	const fetchAdminDashboardData = useCallback(async () => {
		setLoading(true);
		try {
			// User data is now available from global UserContext
			setIsAdmin(currentUser.role === 'admin' || currentUser.role === 'sysadmin');

			if (currentUser.role === 'admin' || currentUser.role === 'sysadmin') {
				const [allUsersData, plansData] = await Promise.all([
					User.filter({}, { order: [['created_at', 'DESC']] }),
					SubscriptionPlan.filter({}, { order: [['sort_order', 'ASC']] }),
				]);

				setUsers(allUsersData);
				setSubscriptionPlans(plansData);
				setFilteredUsers(allUsersData);
			}
		} catch (error) {
			cerror('Error loading data:', error);
			setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים' });
		}
		setLoading(false);
	}, [currentUser]);

	useEffect(() => {
		if (!userLoading && currentUser) {
			fetchAdminDashboardData();
		}
	}, [fetchAdminDashboardData, userLoading, currentUser]);

	useEffect(() => {
		if (!searchTerm) {
			setFilteredUsers(users);
		} else {
			const searchLower = searchTerm.toLowerCase();
			setFilteredUsers(
				users.filter(
					(user) =>
						user.full_name?.toLowerCase().includes(searchLower) ||
						user.email?.toLowerCase().includes(searchLower) ||
						user.phone?.toLowerCase().includes(searchLower)
				)
			);
		}
	}, [searchTerm, users]);

	const showMessage = (type, text) => {
		setMessage({ type, text });
		setTimeout(() => setMessage(null), 3000);
	};

	const handleResetSubscription = async () => {
		if (!userToReset) return;

		setResetLoading(userToReset.id);

		try {

			// Delete all subscription history for this user
			const subscriptionHistoryRecords = await SubscriptionHistory.filter({ user_id: userToReset.id });
			for (const record of subscriptionHistoryRecords) {
				await SubscriptionHistory.delete(record.id);
			}

			// Delete any pending subscriptions for this user
			const pendingSubscriptions = await PendingSubscription.filter({ user_id: userToReset.id });
			for (const pending of pendingSubscriptions) {
				await PendingSubscription.delete(pending.id);
			}

			// Also check for pending subscriptions that might have JSON user_id format
			const allPendingSubscriptions = await PendingSubscription.find();
			for (const pending of allPendingSubscriptions) {
				let actualUserId = pending.user_id;

				// If user_id contains JSON, extract the real user_id
				if (typeof actualUserId === 'string' && actualUserId.startsWith('{')) {
					try {
						const parsedData = JSON.parse(actualUserId);
						actualUserId = parsedData.user_id;
					} catch (parseError) {
						// Continue to next pending record if parsing fails
						continue;
					}
				}

				if (actualUserId === userToReset.id) {
					await PendingSubscription.delete(pending.id);
				}
			}

			// Delete any pending purchases for this user
			const pendingPurchases = await Purchase.filter({
				buyer_user_id: userToReset.id,
				payment_status: 'pending'
			});
			for (const purchase of pendingPurchases) {
				await Purchase.delete(purchase.id);
			}

			// Reset user subscription data completely
			await User.update(userToReset.id, {
				current_subscription_plan_id: null,
				subscription_start_date: null,
				subscription_end_date: null,
				subscription_status: 'free_plan',
				subscription_status_updated_at: new Date().toISOString(), // Set timestamp for reset
				payplus_subscription_uid: null,
			});

			showMessage('success', `המנוי של המשתמש ${userToReset.display_name || userToReset.full_name} אופס בהצלחה.`);

			fetchAdminDashboardData(); // Refresh the data
		} catch (error) {
			cerror('Error resetting subscription:', error);
			showMessage('error', 'שגיאה באיפוס המנוי.');
		} finally {
			setShowResetConfirm(false);
			setUserToReset(null);
			setResetLoading(null);
		}
	};

	const handleRoleChange = async (userId, newRole) => {
		if (userId === currentUser?.id) {
			showMessage('error', 'לא ניתן לשנות את התפקיד שלך');
			return;
		}

		try {
			await User.update(userId, { role: newRole });
			showMessage('success', 'תפקיד המשתמש עודכן בהצלחה');
			fetchAdminDashboardData();
		} catch (error) {
			cerror('Error updating user role:', error);
			showMessage('error', 'שגיאה בעדכון תפקיד המשתמש');
		}
	};

	const handleUserTypeChange = async (userId, newUserType) => {
		try {
			const updateData = { user_type: newUserType === 'none' ? null : newUserType };
			await User.update(userId, updateData);
			showMessage('success', 'סוג המשתמש עודכן בהצלחה');
			fetchAdminDashboardData();
		} catch (error) {
			cerror('Error updating user type:', error);
			showMessage('error', 'שגיאה בעדכון סוג המשתמש');
		}
	};

	const handleImpersonate = async (user) => {
		if (user.id === currentUser?.id) {
			showMessage('error', 'לא ניתן להתחבר בתור עצמך');
			return;
		}

		setImpersonationLoading(user.id);

		try {
			localStorage.setItem('impersonating_user_id', user.id);
			localStorage.setItem('impersonating_admin_id', currentUser.id);

			setMessage({
				type: 'success',
				text: `מתחזה כעת למשתמש: ${user.full_name}`,
			});

			setTimeout(() => {
				navigate('/');
			}, 1000);
		} catch (error) {
			cerror('Error impersonating user:', error);
			setMessage({ type: 'error', text: 'שגיאה בהתחזות למשתמש' });
		} finally {
			setImpersonationLoading(null);
		}
	};

	const getRoleBadgeColor = (role) => {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800';
			case 'sysadmin':
				return 'bg-purple-100 text-purple-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getRoleText = (role) => {
		switch (role) {
			case 'admin':
				return 'מנהל';
			case 'sysadmin':
				return 'נאמן מערכת';
			default:
				return 'משתמש';
		}
	};

	const getUserTypeText = (userType) => {
		switch (userType) {
			case 'teacher':
				return 'מורה';
			case 'student':
				return 'תלמיד';
			case 'parent':
				return 'הורה';
			case 'headmaster':
				return 'מנהל בית ספר';
			default:
				return 'ללא סיווג';
		}
	};

	const getUserTypeBadgeColor = (userType) => {
		switch (userType) {
			case 'teacher':
				return 'bg-blue-100 text-blue-800';
			case 'student':
				return 'bg-green-100 text-green-800';
			case 'parent':
				return 'bg-yellow-100 text-yellow-800';
			case 'headmaster':
				return 'bg-indigo-100 text-indigo-800';
			default:
				return 'bg-gray-100 text-gray-600';
		}
	};

	// Handler for opening the admin user actions modal
	const handleUserActionsClick = (user) => {
		setSelectedUser(user);
		setShowUserActionsModal(true);
	};

	// Handler for managing user subscription from modal
	const handleManageSubscriptionFromModal = (user) => {
		setUserToManage(user);
		setShowManageSubscription(true);
	};

	// Handler for resetting user onboarding
	const handleResetOnboarding = async (user) => {
		try {
			// Show confirmation dialog
			const confirmed = window.confirm(
				`האם אתה בטוח שברצונך לאפס את סטטוס ההכנה עבור ${user.full_name}?\n\n` +
				`המשתמש יידרש להשלים את תהליך ההכנה שוב בכניסה הבאה למערכת.`
			);

			if (!confirmed) return;

			setLoading(true);

			// Call the API to reset onboarding using proper apiRequest function
			const result = await apiRequest(`/entities/user/${user.id}/reset-onboarding`, {
				method: 'PUT'
			});

			// Update the user in local state
			setUsers(prevUsers =>
				prevUsers.map(u =>
					u.id === user.id
						? { ...u, onboarding_completed: false }
						: u
				)
			);

			showMessage('success', `סטטוס ההכנה עבור ${user.full_name} אופס בהצלחה`);

		} catch (error) {
			cerror('Error resetting onboarding:', error);
			showMessage('error', `שגיאה באיפוס ההכנה: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	// Handler for hard resetting user onboarding (resets onboarding + subscription)
	const handleHardResetOnboarding = async (user) => {
		try {
			// Show confirmation dialog with more warning about hard reset
			const confirmed = window.confirm(
				`האם אתה בטוח שברצונך לבצע איפוס קשה של ההכנה עבור ${user.full_name}?\n\n` +
				`איפוס קשה יאפס:\n` +
				`• את סטטוס ההכנה\n` +
				`• את מנוי המשתמש (יחזור לחינמי)\n` +
				`• את כל נתוני המנוי\n\n` +
				`המשתמש יידרש להשלים את תהליך ההכנה שוב ולבחור מנוי מחדש.`
			);

			if (!confirmed) return;

			setLoading(true);

			// First reset onboarding
			await apiRequest(`/entities/user/${user.id}/reset-onboarding`, {
				method: 'PUT'
			});

			// Then reset subscription data to free plan
			await User.update(user.id, {
				current_subscription_plan_id: null,
				subscription_status: 'free_plan',
				subscription_start_date: null,
				subscription_end_date: null,
				subscription_status_updated_at: new Date().toISOString(),
				payplus_subscription_uid: null
			});

			// Update the user in local state
			setUsers(prevUsers =>
				prevUsers.map(u =>
					u.id === user.id
						? {
							...u,
							onboarding_completed: false,
							current_subscription_plan_id: null,
							subscription_status: 'free_plan',
							subscription_start_date: null,
							subscription_end_date: null,
							payplus_subscription_uid: null
						}
						: u
				)
			);

			showMessage('success', `איפוס קשה עבור ${user.full_name} בוצע בהצלחה`);

		} catch (error) {
			cerror('Error hard resetting onboarding:', error);
			showMessage('error', `שגיאה באיפוס קשה: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	const getSubscriptionPlanName = (planId) => {
		if (!planId) return 'אין מנוי';
		const plan = subscriptionPlans.find((p) => p.id === planId);
		return plan ? plan.name : 'מנוי לא זמין';
	};

	const getSubscriptionStatusText = (status) => {
		switch (status) {
			case 'active':
				return 'פעיל';
			case 'past_due':
				return 'חוב';
			case 'cancelled':
				return 'בוטל';
			case 'free_plan':
				return 'חינמי';
			case 'trialing':
				return 'תקופת ניסיון';
			case 'paused': // Added paused status
				return 'מושהה';
			default:
				return 'לא ידוע';
		}
	};

	const getSubscriptionStatusColor = (status) => {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'past_due':
				return 'bg-red-100 text-red-800';
			case 'cancelled':
				return 'bg-gray-100 text-gray-800';
			case 'free_plan':
				return 'bg-blue-100 text-blue-800';
			case 'trialing':
				return 'bg-yellow-100 text-yellow-800';
			case 'paused': // Added paused status color
				return 'bg-purple-100 text-purple-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	if (userLoading || isLoading) {
		return (
			<div className='flex items-center justify-center min-h-screen bg-gray-50 p-4'>
				<LudoraLoadingSpinner
					message="טוען נתונים..."
					size="lg"
					theme="science"
				/>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className='p-4 bg-gray-50 min-h-screen'>
				<div className='max-w-4xl mx-auto'>
					<Alert variant='destructive'>
						<AlertTriangle className='h-4 w-4' />
						<AlertDescription>אין לך הרשאות גישה למרכז הניהול. רק מנהלים יכולים לגשת לאזור זה.</AlertDescription>
					</Alert>
				</div>
			</div>
		);
	}

	return (
		<div
			className='min-h-screen bg-gray-50'
			dir='rtl'
		>
			<main className='flex-1 overflow-auto bg-gray-50'>
				<div className='max-w-7xl mx-auto p-4 md:p-8'>
					{message && (
						<Alert
							variant={message.type === 'error' ? 'destructive' : 'default'}
							className='mb-6'
						>
							{message.type === 'error' ? <AlertTriangle className='h-4 w-4' /> : <CheckCircle className='h-4 w-4' />}
							<AlertDescription>{message.text}</AlertDescription>
						</Alert>
					)}

					<div className='space-y-6'>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
							<div>
								<h3 className='text-2xl font-semibold'>ניהול משתמשים</h3>
								<p className='text-gray-600'>נהל את כל המשתמשים במערכת</p>
							</div>
							<Badge
								variant='outline'
								className='text-lg px-3 py-1'
							>
								{users.length} משתמשים
							</Badge>
						</div>

						<div className='relative max-w-md'>
							<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
							<Input
								placeholder='חפש לפי שם, מייל או טלפון...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='pl-10'
							/>
						</div>

						<Card className='border-none shadow-lg'>
							<CardContent className='p-0'>
								{filteredUsers.length === 0 ? (
									<div className='p-12 text-center'>
										<Users className='w-16 h-16 text-gray-300 mx-auto mb-4' />
										<h3 className='text-xl font-semibold text-gray-600 mb-2'>
											{searchTerm ? 'לא נמצאו משתמשים' : 'אין משתמשים'}
										</h3>
										<p className='text-gray-500'>
											{searchTerm ? 'נסה לחפש עם מילות מפתח אחרות' : 'משתמשים יופיעו כאן'}
										</p>
									</div>
								) : (
									<div className='divide-y divide-gray-200'>
										{filteredUsers.map((user) => (
											<div
												key={user.id}
												className='p-4 hover:bg-gray-50 transition-colors'
											>
												<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
													<div className='flex-1'>
														<div className='flex items-center gap-3 mb-2'>
															<h4 className='font-semibold text-lg'>{user.full_name}</h4>
															<Badge className={getRoleBadgeColor(user.role)}>{getRoleText(user.role)}</Badge>
															{user.user_type && (
																<Badge className={getUserTypeBadgeColor(user.user_type)}>
																	{getUserTypeText(user.user_type)}
																</Badge>
															)}
															{user.id === currentUser?.id && (
																<Badge
																	variant='outline'
																	className='text-xs'
																>
																	אתה
																</Badge>
															)}
														</div>

														<div className='space-y-2'>
															<div className='space-y-1 text-sm text-gray-600'>
																<div className='flex items-center gap-2'>
																	<Mail className='w-4 h-4' />
																	<span>{user.email}</span>
																</div>
																{user.phone && (
																	<div className='flex items-center gap-2'>
																		<Phone className='w-4 h-4' />
																		<span>{user.phone}</span>
																	</div>
																)}
																<div className='flex items-center gap-2'>
																	<Calendar className='w-4 h-4' />
																	<span>
																		הצטרף ב-
																		{user.created_at && !isNaN(new Date(user.created_at))
																			? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: he })
																			: 'לא ידוע'}
																	</span>
																</div>
															</div>

															{/* Subscription Information */}
															<div className='border-t pt-2 mt-2'>
																<h5 className='text-sm font-medium text-gray-700 mb-2'>מידע מנוי:</h5>
																<div className='flex flex-wrap gap-2 text-xs'>
																	<div className='flex items-center gap-1'>
																		<Crown className='w-3 h-3 text-purple-500' />
																		<span className='font-medium'>תוכנית:</span>
																		<span>{getSubscriptionPlanName(user.current_subscription_plan_id)}</span>
																	</div>
																	<Badge
																		className={getSubscriptionStatusColor(user.subscription_status || 'free_plan')}
																	>
																		{getSubscriptionStatusText(user.subscription_status || 'free_plan')}
																	</Badge>
																	{user.subscription_end_date && (
																		<div className='flex items-center gap-1 text-gray-500'>
																			<Calendar className='w-3 h-3' />
																			<span>
																				עד: {format(new Date(user.subscription_end_date), 'dd/MM/yyyy', { locale: he })}
																			</span>
																		</div>
																	)}
																	{user.pending_subscription_plan_id && (
																		<div className='flex items-center gap-1 text-orange-600'>
																			<Clock className='w-3 h-3' />
																			<span>ממתין: {getSubscriptionPlanName(user.pending_subscription_plan_id)}</span>
																		</div>
																	)}
																</div>
															</div>
														</div>
													</div>

													<div className='flex items-center justify-end'>
														<Button
															variant='outline'
															size='sm'
															onClick={() => handleUserActionsClick(user)}
															className='flex items-center gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50'
														>
															<MoreHorizontal className='w-4 h-4' />
															פעולות
														</Button>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			{/* Subscription Management Modal */}
			{showManageSubscription && userToManage && (
				<SubscriptionManagementModal
					user={userToManage}
					subscriptionPlans={subscriptionPlans}
					onClose={() => {
						setShowManageSubscription(false);
						setUserToManage(null);
					}}
					onUpdate={() => {
						fetchAdminDashboardData(); // Refresh the main user list after update
						setShowManageSubscription(false); // Close the modal
						setUserToManage(null); // Clear the user
					}}
					showMessage={showMessage}
					setShowResetConfirm={setShowResetConfirm} // Pass parent's state setter to modal
					setUserToReset={setUserToReset} // Pass parent's state setter to modal
					resetLoading={resetLoading} // Pass parent's loading state to modal
				/>
			)}

			{/* Subscription Reset Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={showResetConfirm}
				onClose={() => {
					setShowResetConfirm(false);
					setUserToReset(null);
				}}
				onConfirm={handleResetSubscription}
				title='איפוס מנוי משתמש'
				message={`האם אתה בטוח שברצונך לאפס לחלוטין את המנוי של המשתמש ${
					userToReset?.full_name
				}?\n\nפעולה זו תמחק:\n• את כל היסטוריית המנויים\n• מנויים ממתינים\n• נתוני המנוי הנוכחיים\n\nהפעולה היא בלתי הפיכה!`}
				confirmText='כן, אפס מנוי'
				cancelText='ביטול'
				isLoading={resetLoading === userToReset?.id}
				variant='danger'
			/>

			{/* Admin User Actions Modal */}
			{showUserActionsModal && selectedUser && (
				<AdminUserActionsModal
					user={selectedUser}
					currentUser={currentUser}
					isOpen={showUserActionsModal}
					onClose={() => {
						setShowUserActionsModal(false);
						setSelectedUser(null);
					}}
					onRoleChange={handleRoleChange}
					onUserTypeChange={handleUserTypeChange}
					onManageSubscription={handleManageSubscriptionFromModal}
					onImpersonate={handleImpersonate}
					onResetOnboarding={handleResetOnboarding}
					onHardResetOnboarding={handleHardResetOnboarding}
					impersonationLoading={impersonationLoading}
					getRoleText={getRoleText}
					getUserTypeText={getUserTypeText}
					getRoleBadgeColor={getRoleBadgeColor}
					getUserTypeBadgeColor={getUserTypeBadgeColor}
					getSubscriptionPlanName={getSubscriptionPlanName}
					getSubscriptionStatusText={getSubscriptionStatusText}
					getSubscriptionStatusColor={getSubscriptionStatusColor}
				/>
			)}
		</div>
	);
}
