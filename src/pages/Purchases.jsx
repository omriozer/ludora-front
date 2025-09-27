import React, { useState, useEffect } from "react";
import { Purchase, User, Workshop, Course, File, Tool, Game } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  DollarSign,
  Calendar,
  User as UserIcon,
  Package,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Mail,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const ITEMS_PER_PAGE = 20;

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPurchases = filteredPurchases.slice(startIndex, endIndex);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortPurchases();
  }, [purchases, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        const [purchasesData, workshopsData, coursesData, filesData, toolsData, gamesData] = await Promise.all([
          Purchase.list("-created_date", { includes: ['buyer'] }), // Include buyer user info
          Workshop.find({}, '-created_date'),
          Course.find({}, '-created_date'),
          File.find({}, '-created_date'),
          Tool.find({}, '-created_date'),
          Game.find({}, '-created_date')
        ]);

        setPurchases(purchasesData);
        // Combine all entities for product lookups
        const allEntities = [
          ...workshopsData.map(w => ({ ...w, entity_type: 'workshop' })),
          ...coursesData.map(c => ({ ...c, entity_type: 'course' })),
          ...filesData.map(f => ({ ...f, entity_type: 'file' })),
          ...toolsData.map(t => ({ ...t, entity_type: 'tool' })),
          ...gamesData.map(g => ({ ...g, entity_type: 'game' }))
        ];
        setProducts(allEntities);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  };

  const filterAndSortPurchases = () => {
    let filtered = [...purchases];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(purchase =>
        purchase.buyer?.full_name?.toLowerCase().includes(searchLower) ||
        purchase.buyer?.email?.toLowerCase().includes(searchLower) ||
        purchase.order_number?.toLowerCase().includes(searchLower) ||
        products.find(p => p.id === purchase.purchasable_id)?.title?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(purchase => purchase.payment_status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'created_date':
          aValue = new Date(a.created_date);
          bValue = new Date(b.created_date);
          break;
        case 'payment_amount':
          aValue = a.payment_amount || 0;
          bValue = b.payment_amount || 0;
          break;
        case 'buyer_name':
          aValue = a.buyer_name || '';
          bValue = b.buyer_name || '';
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPurchases(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const getProductTitle = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.title || 'מוצר לא נמצא';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { label: 'שולם', className: 'bg-green-100 text-green-800' },
      pending: { label: 'ממתין לתשלום', className: 'bg-yellow-100 text-yellow-800' },
      refunded: { label: 'הוחזר', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען רכישות...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לרשימת הרכישות. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">רשימת רכישות</h1>
            <p className="text-gray-500 text-sm">צפייה וניהול כל הרכישות במערכת</p>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי שם, מייל, מספר הזמנה או מוצר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="refunded">הוחזר</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="מיון לפי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date">תאריך רכישה</SelectItem>
                  <SelectItem value="payment_amount">סכום</SelectItem>
                  <SelectItem value="buyer_name">שם קונה</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">סה"כ רכישות</p>
                  <p className="text-xl font-bold">{purchases.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">רכישות ששולמו</p>
                  <p className="text-xl font-bold">{purchases.filter(p => p.payment_status === 'paid').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">סה"כ הכנסות</p>
                  <p className="text-xl font-bold">
                    ₪{purchases.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (p.payment_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchases Table */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              רכישות ({filteredPurchases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPurchases.length > 0 ? (
              <div className="space-y-4">
                {currentPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Purchase Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{purchase.buyer?.full_name || 'משתמש לא ידוע'}</h3>
                          {getStatusBadge(purchase.payment_status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="break-all">{purchase.buyer?.email || 'אימייל לא זמין'}</span>
                          </div>
                          {purchase.buyer?.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{purchase.buyer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {getProductTitle(purchase.purchasable_id)}
                        </h4>
                        <div className="text-sm text-gray-600">
                          מספר הזמנה: {purchase.order_number}
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div>
                        <div className="text-lg font-bold text-green-600 mb-1">
                          ₪{purchase.payment_amount?.toLocaleString() || 0}
                        </div>
                        {purchase.discount_amount > 0 && (
                          <div className="text-xs text-gray-500">
                            הנחה: ₪{purchase.discount_amount.toLocaleString()}
                          </div>
                        )}
                        {purchase.coupon_code && (
                          <div className="text-xs text-blue-600">
                            קופון: {purchase.coupon_code}
                          </div>
                        )}
                      </div>

                      {/* Date Info */}
                      <div>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(purchase.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                          </div>
                          {purchase.access_until && (
                            <div className="text-xs text-orange-600">
                              גישה עד: {format(new Date(purchase.access_until), 'dd/MM/yyyy', { locale: he })}
                            </div>
                          )}
                          {purchase.purchased_lifetime_access && (
                            <div className="text-xs text-green-600">
                              גישה לכל החיים
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      מציג {startIndex + 1}-{Math.min(endIndex, filteredPurchases.length)} מתוך {filteredPurchases.length} רכישות
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                        הקודם
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">אין רכישות</h3>
                <p>רכישות יופיעו כאן לאחר שמשתמשים ירכשו מוצרים</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}