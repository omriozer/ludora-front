import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Calendar
} from 'lucide-react';
import { ludlog, luderror } from '@/lib/ludlog';
import ApprovalActionButtons from './ApprovalActionButtons';
import MembershipRequestModal from './MembershipRequestModal';

export default function PendingRequestsList() {
  const navigate = useNavigate();

  // Data states
  const [requests, setRequests] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Filter states
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const limit = 20;

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Bulk selection states
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Load classrooms for filter
  const loadClassrooms = useCallback(async () => {
    try {
      const response = await apiRequest('/entities/classroom');
      setClassrooms(response || []);
    } catch (error) {
      luderror.ui('Error loading classrooms:', error);
    }
  }, []);

  // Load membership requests
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: selectedStatus,
        page: currentPage.toString(),
        limit: limit.toString()
      });

      if (selectedClassroom && selectedClassroom !== 'all') {
        params.append('classroom_id', selectedClassroom);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await apiRequest(`/teacher-portal/classroom-memberships?${params.toString()}`);

      setRequests(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalRequests(response.pagination?.total || 0);
      setCurrentPage(response.pagination?.page || 1);

      ludlog.ui('Loaded membership requests:', {
        count: response.data?.length,
        total: response.pagination?.total
      });
    } catch (error) {
      luderror.ui('Error loading membership requests:', error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת בקשות ההצטרפות' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassroom, selectedStatus, searchTerm, currentPage]);

  // Initial load
  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  // Load requests when filters change
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handle approval/denial
  const handleApprovalAction = async (membershipId, action, approvalMessage = '') => {
    try {
      const response = await apiRequest(`/teacher-portal/classroom-memberships/${membershipId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          membership_id: membershipId,
          action,
          approval_message: approvalMessage
        })
      });

      // Show success message
      setMessage({
        type: 'success',
        text: action === 'approve'
          ? 'הבקשה אושרה בהצלחה. התלמיד התווסף לכיתה'
          : 'הבקשה נדחתה'
      });

      // Clear selected requests
      setSelectedRequests(new Set());
      setSelectAll(false);

      // Reload requests
      loadRequests();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

      ludlog.ui('Membership request processed:', { membershipId, action, parentConsentCreated: response.parent_consent_created });
    } catch (error) {
      luderror.ui('Error processing membership request:', error);
      setMessage({
        type: 'error',
        text: error.message || 'שגיאה בעיבוד הבקשה'
      });
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) return;

    try {
      const requestIds = Array.from(selectedRequests);

      for (const requestId of requestIds) {
        await handleApprovalAction(requestId, 'approve', 'אושר כחלק מאישור קבוצתי');
      }

      setMessage({
        type: 'success',
        text: `${requestIds.length} בקשות אושרו בהצלחה`
      });
    } catch (error) {
      luderror.ui('Error bulk approving requests:', error);
      setMessage({
        type: 'error',
        text: 'שגיאה באישור קבוצתי של הבקשות'
      });
    }
  };

  // Handle bulk deny
  const handleBulkDeny = async () => {
    if (selectedRequests.size === 0) return;

    try {
      const requestIds = Array.from(selectedRequests);

      for (const requestId of requestIds) {
        await handleApprovalAction(requestId, 'deny', 'נדחה כחלק מדחייה קבוצתית');
      }

      setMessage({
        type: 'success',
        text: `${requestIds.length} בקשות נדחו`
      });
    } catch (error) {
      luderror.ui('Error bulk denying requests:', error);
      setMessage({
        type: 'error',
        text: 'שגיאה בדחייה קבוצתית של הבקשות'
      });
    }
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requests.map(r => r.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual checkbox toggle
  const handleCheckboxToggle = (requestId) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
    setSelectAll(newSelected.size === requests.length && requests.length > 0);
  };

  // Handle view details
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'ממתין', variant: 'default', icon: Clock, color: 'bg-orange-100 text-orange-800' },
      approved: { label: 'אושר', variant: 'default', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      denied: { label: 'נדחה', variant: 'destructive', icon: UserX, color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 ml-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                בקשות הצטרפות לכיתות
              </h1>
              <p className="text-gray-600 mt-2">
                נהל בקשות תלמידים להצטרף לכיתות שלך
              </p>
            </div>

            {/* Summary Stats */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalRequests}</div>
                    <div className="text-xs text-gray-600">בקשות ממתינות</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6">
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="חפש תלמיד..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Classroom Filter */}
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הכיתות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הכיתות</SelectItem>
                  {classrooms.map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name || `כיתה ${classroom.grade_level}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="approved">אושר</SelectItem>
                  <SelectItem value="denied">נדחה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedRequests.size > 0 && selectedStatus === 'pending' && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedRequests.size} בקשות נבחרו
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkApprove}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserCheck className="w-4 h-4 ml-2" />
                    אשר הכל
                  </Button>
                  <Button
                    onClick={handleBulkDeny}
                    size="sm"
                    variant="destructive"
                  >
                    <UserX className="w-4 h-4 ml-2" />
                    דחה הכל
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">טוען בקשות...</p>
          </div>
        ) : requests.length > 0 ? (
          <>
            <Card className="bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {selectedStatus === 'pending' && (
                          <th className="p-4 text-right">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAllToggle}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </th>
                        )}
                        <th className="p-4 text-right text-sm font-semibold text-gray-900">תלמיד</th>
                        <th className="p-4 text-right text-sm font-semibold text-gray-900">כיתה</th>
                        <th className="p-4 text-right text-sm font-semibold text-gray-900">סטטוס</th>
                        <th className="p-4 text-right text-sm font-semibold text-gray-900">תאריך</th>
                        <th className="p-4 text-right text-sm font-semibold text-gray-900">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requests.map(request => (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          {selectedStatus === 'pending' && (
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={selectedRequests.has(request.id)}
                                onChange={() => handleCheckboxToggle(request.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {request.student?.display_name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {request.student?.display_name || 'לא ידוע'}
                                </div>
                                {request.request_message && (
                                  <div className="text-sm text-gray-500 line-clamp-1">
                                    {request.request_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.classroom?.name || 'לא ידוע'}
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {formatDate(request.requested_at)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleViewDetails(request)}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                פרטים
                              </Button>
                              {request.status === 'pending' && (
                                <ApprovalActionButtons
                                  membershipId={request.id}
                                  onApprove={(msg) => handleApprovalAction(request.id, 'approve', msg)}
                                  onDeny={(msg) => handleApprovalAction(request.id, 'deny', msg)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  דף {currentPage} מתוך {totalPages} ({totalRequests} בקשות)
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                    הקודם
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    הבא
                    <ChevronLeft className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200/50 max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                אין בקשות ממתינות
              </h2>

              <p className="text-gray-600 text-lg leading-relaxed max-w-lg mx-auto">
                כרגע אין בקשות הצטרפות חדשות לכיתות שלך.
                בקשות חדשות יופיעו כאן כשתלמידים יבקשו להצטרף.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      <MembershipRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onApprove={(msg) => {
          handleApprovalAction(selectedRequest.id, 'approve', msg);
          setShowRequestModal(false);
        }}
        onDeny={(msg) => {
          handleApprovalAction(selectedRequest.id, 'deny', msg);
          setShowRequestModal(false);
        }}
      />
    </div>
  );
}
