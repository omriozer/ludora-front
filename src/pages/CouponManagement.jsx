import React, { useState, useEffect } from "react";
import { getApiBase } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Tag,
  Calendar,
  Percent,
  DollarSign,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Edit,
  Plus,
  Copy,
  Trash2,
  Users,
  BarChart3,
  Download,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredCoupons.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCoupons = filteredCoupons.slice(startIndex, endIndex);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortCoupons();
  }, [coupons, searchTerm, statusFilter, typeFilter, visibilityFilter, sortBy, sortOrder]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get all coupons
      const couponsResponse = await fetch(`${getApiBase()}/entities/coupon`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const couponsData = await couponsResponse.json();
      setCoupons(couponsData);
    } catch (error) {
      cerror("Error loading coupon data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  };

  const filterAndSortCoupons = () => {
    let filtered = [...coupons];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(coupon =>
        coupon.code?.toLowerCase().includes(searchLower) ||
        coupon.description?.toLowerCase().includes(searchLower) ||
        coupon.targeting_criteria?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(coupon => coupon.is_active);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(coupon => !coupon.is_active);
      } else if (statusFilter === "expired") {
        const now = new Date();
        filtered = filtered.filter(coupon =>
          coupon.valid_until && new Date(coupon.valid_until) < now
        );
      }
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(coupon => coupon.discount_type === typeFilter);
    }

    // Visibility filter
    if (visibilityFilter !== "all") {
      filtered = filtered.filter(coupon => coupon.visibility === visibilityFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'created_at' || sortBy === 'valid_until' || sortBy === 'valid_from') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCoupons(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקופון? פעולה זו בלתי הפיכה.')) {
      return;
    }

    try {
      await fetch(`${getApiBase()}/entities/coupon/${couponId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      setMessage({ type: 'success', text: 'הקופון נמחק בהצלחה' });
      toast({
        title: "קופון נמחק",
        description: "הקופון הוסר מהמערכת בהצלחה",
        variant: "default"
      });
      loadData(); // Reload data
    } catch (error) {
      cerror('Error deleting coupon:', error);
      setMessage({ type: 'error', text: 'שגיאה במחיקת הקופון' });
      toast({
        title: "שגיאה במחיקה",
        description: 'לא ניתן למחוק את הקופון',
        variant: "destructive"
      });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const newStatus = !coupon.is_active;
      await fetch(`${getApiBase()}/entities/coupon/${coupon.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      setMessage({
        type: 'success',
        text: newStatus ? 'הקופון הופעל בהצלחה' : 'הקופון הושבת בהצלחה'
      });
      toast({
        title: newStatus ? "קופון הופעל" : "קופון הושבת",
        description: newStatus ? "הקופון זמין עתה לשימוש" : "הקופון אינו זמין יותר",
        variant: "default"
      });
      loadData(); // Reload data
    } catch (error) {
      cerror('Error toggling coupon status:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון סטטוס הקופון' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDuplicateCoupon = async (coupon) => {
    try {
      const duplicatedCoupon = {
        ...coupon,
        code: `${coupon.code}_COPY`,
        is_active: false, // Start inactive for safety
      };
      delete duplicatedCoupon.id;
      delete duplicatedCoupon.created_at;
      delete duplicatedCoupon.updated_at;
      delete duplicatedCoupon.usage_count;

      await fetch(`${getApiBase()}/entities/coupon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicatedCoupon)
      });
      setMessage({ type: 'success', text: 'הקופון שוכפל בהצלחה' });
      toast({
        title: "קופון שוכפל",
        description: `נוצר קופון חדש: ${duplicatedCoupon.code}`,
        variant: "default"
      });
      loadData(); // Reload data
    } catch (error) {
      cerror('Error duplicating coupon:', error);
      setMessage({ type: 'error', text: 'שגיאה בשכפול הקופון' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const getStatusBadge = (coupon) => {
    if (!coupon.is_active) {
      return <Badge variant="secondary">לא פעיל</Badge>;
    }

    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return <Badge variant="destructive">פג תוקף</Badge>;
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return <Badge variant="outline">מוגבל</Badge>;
    }

    return <Badge variant="default" className="bg-green-100 text-green-800">פעיל</Badge>;
  };

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case 'public':
        return <Badge variant="outline" className="border-blue-300 text-blue-700">ציבורי</Badge>;
      case 'auto_suggest':
        return <Badge variant="outline" className="border-purple-300 text-purple-700">הצעה אוטומטית</Badge>;
      case 'secret':
      default:
        return <Badge variant="outline" className="border-gray-300 text-gray-700">סודי</Badge>;
    }
  };

  const getTargetingBadge = (targetingType) => {
    switch (targetingType) {
      case 'general':
        return <Badge variant="outline" className="border-green-300 text-green-700">כללי</Badge>;
      case 'product_type':
        return <Badge variant="outline" className="border-orange-300 text-orange-700">סוג מוצר</Badge>;
      case 'product_id':
        return <Badge variant="outline" className="border-red-300 text-red-700">מוצר ספציפי</Badge>;
      case 'user_segment':
        return <Badge variant="outline" className="border-indigo-300 text-indigo-700">קבוצת משתמשים</Badge>;
      default:
        return <Badge variant="outline">לא מוגדר</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען קופונים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול קופונים</h1>
              <p className="text-gray-500">צור, ערוך וניהל קופוני הנחה ומבצעים</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/coupons/analytics">
                <Button variant="outline" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">דוחות</span>
                </Button>
              </Link>
              <Link to="/coupons/bulk-generate">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">יצירה בכמות</span>
                </Button>
              </Link>
              <Link to="/coupons/create">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  צור קופון חדש
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Tag className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="חפש קופון..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סוג הנחה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="percentage">אחוז</SelectItem>
                  <SelectItem value="fixed_amount">סכום קבוע</SelectItem>
                </SelectContent>
              </Select>

              {/* Visibility Filter */}
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="נראות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="secret">סודי</SelectItem>
                  <SelectItem value="public">ציבורי</SelectItem>
                  <SelectItem value="auto_suggest">הצעה אוטומטית</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">תאריך יצירה</SelectItem>
                    <SelectItem value="code">קוד</SelectItem>
                    <SelectItem value="discount_value">ערך הנחה</SelectItem>
                    <SelectItem value="usage_count">שימושים</SelectItem>
                    <SelectItem value="valid_until">תוקף</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2"
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סה"כ קופונים</p>
                  <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">פעילים</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {coupons.filter(c => c.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">ציבוריים</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {coupons.filter(c => c.visibility === 'public' || c.visibility === 'auto_suggest').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">שימושים</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {coupons.reduce((total, c) => total + (c.usage_count || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              רשימת קופונים ({filteredCoupons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentCoupons.length > 0 ? (
              <div className="space-y-4">
                {currentCoupons.map((coupon) => (
                  <div key={coupon.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {coupon.code}
                          </h3>
                          {getStatusBadge(coupon)}
                          {getVisibilityBadge(coupon.visibility)}
                          {getTargetingBadge(coupon.targeting_type)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <div className="flex items-center gap-1">
                              {coupon.discount_type === 'percentage' ? (
                                <Percent className="w-4 h-4" />
                              ) : (
                                <DollarSign className="w-4 h-4" />
                              )}
                              <span className="font-medium">
                                {coupon.discount_type === 'percentage'
                                  ? `${coupon.discount_value}% הנחה`
                                  : `₪${coupon.discount_value} הנחה`
                                }
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>
                                {coupon.usage_count || 0}
                                {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''} שימושים
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {coupon.valid_until
                                  ? `עד ${format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: he })}`
                                  : 'ללא תוקף'
                                }
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs">
                              נוצר: {format(new Date(coupon.created_at), 'dd/MM/yyyy', { locale: he })}
                            </span>
                          </div>
                        </div>

                        {coupon.description && (
                          <p className="mt-2 text-gray-600 text-sm">{coupon.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(coupon)}
                          className={
                            coupon.is_active
                              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                          title={coupon.is_active ? "השבת קופון" : "הפעל קופון"}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateCoupon(coupon)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="שכפל קופון"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>

                        <Link to={`/coupons/edit/${coupon.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="ערוך קופון"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="מחק קופון"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      מציג {startIndex + 1} - {Math.min(endIndex, filteredCoupons.length)} מתוך {filteredCoupons.length} קופונים
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                        הקודם
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        הבא
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין קופונים</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" || visibilityFilter !== "all"
                    ? "לא נמצאו קופונים התואמים את הפילטרים"
                    : "עדיין לא נוצרו קופונים במערכת"
                  }
                </p>
                <Link to="/coupons/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    צור קופון ראשון
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}