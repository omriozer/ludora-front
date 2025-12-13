import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/messaging';
import { apiRequest } from '@/services/apiClient';
import { luderror } from '@/lib/ludlog';
import { haveAdminAccess } from "@/utils/adminCheck";
import {
  Shield,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Database,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

export default function PayPlusMaintenancePage() {
  const navigate = useNavigate();
  const { currentUser, settings } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [copiedData, setCopiedData] = useState(null);

  // Admin access check
  if (!haveAdminAccess(currentUser?.role, 'admin_access', settings)) {
    navigate('/');
    return null;
  }

  const runSubscriptionAudit = async () => {
    setIsLoading(true);
    setAuditResults(null);
    setRawData(null);

    try {
      const response = await apiRequest('/admin/subscriptions/audit');
      setAuditResults(response);
      showSuccess('בדיקת המנויים הושלמה בהצלחה');
    } catch (error) {
      luderror.payments('Error running subscription audit:', error);
      showError('שגיאה בביצוע בדיקת המנויים', 'אנא נסה שוב או צור קשר עם התמיכה');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRawData = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/admin/subscriptions/payplus-raw');
      setRawData(response);
      showSuccess('נתונים גולמיים נטענו בהצלחה');
    } catch (error) {
      luderror.payments('Error fetching raw data:', error);
      showError('שגיאה בטעינת נתונים גולמיים', 'אנא נסה שוב או בדוק את החיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = (reportPath) => {
    if (reportPath) {
      // Convert to downloadable link
      const fileName = reportPath.split('/').pop();
      const downloadUrl = `/api/files/temp/${fileName}`;
      window.open(downloadUrl, '_blank');
    }
  };

  const copyDataToClipboard = async (data, dataType) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopiedData(dataType);
      showSuccess('נתונים הועתקו ללוח');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedData(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showError('שגיאה בהעתקת הנתונים');
    }
  };

  const getSeverityColor = (type) => {
    switch (type) {
      case 'missing_activation_webhook':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'missing_in_database':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'status_mismatch':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    // PayPlus returns dates in DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('he-IL');
  };

  const getRecurringTypeText = (type) => {
    switch (type) {
      case 'monthly':
        return 'חודשי';
      case 'daily':
        return 'יומי';
      case 'weekly':
        return 'שבועי';
      case 'yearly':
        return 'שנתי';
      default:
        return type;
    }
  };

  const getSubscriptionPlanText = (extraInfo) => {
    if (!extraInfo) return '-';
    if (extraInfo.includes('מנוי פרימיום')) return 'מנוי פרימיום';
    if (extraInfo.length > 30) return extraInfo.substring(0, 30) + '...';
    return extraInfo;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">תחזוקת PayPlus</h1>
            <p className="text-gray-600">בדיקה וסנכרון של מנויים עם PayPlus</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={runSubscriptionAudit}
            disabled={isLoading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            בצע בדיקה מקיפה
          </button>

          <button
            onClick={fetchRawData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            טען נתונים גולמיים
          </button>
        </div>
      </div>

      {/* Audit Results */}
      {auditResults && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">PayPlus</p>
                  <p className="text-xl font-bold text-gray-900">
                    {auditResults.audit_summary.payplus_total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">מקומי</p>
                  <p className="text-xl font-bold text-gray-900">
                    {auditResults.audit_summary.local_total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סנכרון מושלם</p>
                  <p className="text-xl font-bold text-gray-900">
                    {auditResults.audit_summary.perfect_matches}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">בעיות</p>
                  <p className="text-xl font-bold text-gray-900">
                    {auditResults.audit_summary.total_discrepancies}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Issues */}
          {auditResults.audit_summary.total_discrepancies > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  פרטי בעיות שנמצאו
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {auditResults.audit_summary.missing_activation_webhooks > 0 && (
                    <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <p className="text-sm text-orange-600 font-medium">webhooks חסרים</p>
                      <p className="text-2xl font-bold text-orange-700">
                        {auditResults.audit_summary.missing_activation_webhooks}
                      </p>
                    </div>
                  )}

                  {auditResults.audit_summary.missing_in_database > 0 && (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600 font-medium">חסרים במאגר</p>
                      <p className="text-2xl font-bold text-red-700">
                        {auditResults.audit_summary.missing_in_database}
                      </p>
                    </div>
                  )}

                  {auditResults.audit_summary.status_mismatches > 0 && (
                    <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <p className="text-sm text-yellow-600 font-medium">סטטוס לא תואם</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {auditResults.audit_summary.status_mismatches}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {auditResults.recommendations && auditResults.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  המלצות לפעולה
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {auditResults.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rec.issue}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.action}</p>
                      {rec.endpoint !== 'No action required' && rec.endpoint !== 'Manual investigation required' && (
                        <p className="text-xs text-blue-600 mt-2 font-mono">{rec.endpoint}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Download */}
          {auditResults.report_file && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">דוח מפורט</h3>
                  <p className="text-gray-600">דוח markdown עם כל הפרטים</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyDataToClipboard(auditResults, 'audit')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {copiedData === 'audit' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedData === 'audit' ? 'הועתק!' : 'העתק JSON'}
                  </button>
                  <button
                    onClick={() => downloadReport(auditResults.report_file)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    הורד דוח
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription Data Table */}
      {rawData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  מנויים מ-PayPlus
                </h3>
                <p className="text-gray-600">
                  נמצאו {rawData.total_subscriptions} מנויים • נטענו ב-{new Date(rawData.retrieved_at).toLocaleString('he-IL')}
                </p>
              </div>
              <button
                onClick={() => copyDataToClipboard(rawData, 'raw')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {copiedData === 'raw' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedData === 'raw' ? 'הועתק!' : 'העתק JSON'}
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      מנוי
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      לקוח
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סכום
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סוג
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך יצירה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תוכנית
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rawData.subscriptions && rawData.subscriptions.map((subscription, index) => (
                    <tr key={subscription.uid} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-blue-600">{subscription.number}</div>
                        <div className="text-xs text-gray-500">{subscription.uid.split('-')[0]}...</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="font-medium text-gray-900">
                          {subscription.customer_name === 'General Customer - לקוח כללי'
                            ? 'לקוח כללי'
                            : subscription.customer_name
                          }
                        </div>
                        <div className="text-gray-500">{subscription.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(subscription.each_payment_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscription.recurring_type === 'monthly'
                            ? 'bg-blue-100 text-blue-800'
                            : subscription.recurring_type === 'daily'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getRecurringTypeText(subscription.recurring_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatDate(subscription.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subscription.valid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.valid ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {getSubscriptionPlanText(subscription.extra_info)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900">סה"כ מנויים</h4>
                <p className="text-2xl font-bold text-blue-600">{rawData.total_subscriptions}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900">מנויים פעילים</h4>
                <p className="text-2xl font-bold text-green-600">
                  {rawData.subscriptions ? rawData.subscriptions.filter(s => s.valid).length : 0}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-900">הכנסות צפויות (חודש)</h4>
                <p className="text-2xl font-bold text-amber-600">
                  {rawData.subscriptions ? formatCurrency(
                    rawData.subscriptions
                      .filter(s => s.valid && s.recurring_type === 'monthly')
                      .reduce((sum, s) => sum + parseFloat(s.each_payment_amount), 0)
                  ) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">איך זה עובד?</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• <strong>בדיקה מקיפה</strong> - משווה מנויים בין PayPlus למאגר המקומי</li>
              <li>• <strong>זיהוי webhooks חסרים</strong> - מנויים שהופעלו ב-PayPlus אך לא במאגר המקומי</li>
              <li>• <strong>המלצות לפעולה</strong> - הצעות קונקרטיות לתיקון הבעיות</li>
              <li>• <strong>נתונים גולמיים</strong> - גישה לכל הנתונים שחזרו מ-PayPlus</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}