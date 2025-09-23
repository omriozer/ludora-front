
import React, { useState, useEffect } from "react";
import { User, Purchase, Workshop, Course, File, Tool } from "@/services/entities";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Participants() {
  const [registrations, setRegistrations] = useState([]);
  // 'workshops' state variable will now store ALL Product entities, not just 'workshop' type.
  const [workshops, setWorkshops] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        // Get all entities and purchases
        const [workshopsData, coursesData, filesData, toolsData, purchasesData] = await Promise.all([
          Workshop.find({}, '-created_date'),
          Course.find({}, '-created_date'),
          File.find({}, '-created_date'),
          Tool.find({}, '-created_date'),
          Purchase.list("-created_date")
        ]);

        // Combine all entities for the product filter
        const allEntities = [...workshopsData, ...coursesData, ...filesData, ...toolsData];
        setWorkshops(allEntities); // `workshops` state now stores all entities

        // Create participants list from Purchase records only
        const participants = purchasesData
          .filter(purchase => purchase.payment_status === 'paid')
          .map(purchase => ({
            ...purchase,
            type: 'purchase',
            participant_name: purchase.buyer_name,
            participant_email: purchase.buyer_email,
            participant_phone: purchase.buyer_phone,
            // Handle both new polymorphic and legacy product_id structure
            product_id: purchase.purchasable_id || purchase.product_id,
            workshop_id: purchase.purchasable_id || purchase.product_id, // Backward compatibility
            payment_amount: purchase.total_amount,
            payment_status: 'paid',
            order_number: purchase.purchase_id,
            created_date: purchase.created_date,
          }));

        setRegistrations(participants);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex justify-center items-center">
        <p>טוען נתונים...</p>
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
              אין לך הרשאות גישה לדף המשתתפים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const filteredRegistrations = registrations.filter(reg => {
    // Find the associated product using reg.product_id
    const product = workshops.find(p => p.id === reg.product_id);
    const searchLower = searchTerm.toLowerCase();

    return (
      (reg.participant_name && reg.participant_name.toLowerCase().includes(searchLower)) ||
      (reg.participant_email && reg.participant_email.toLowerCase().includes(searchLower)) ||
      (reg.order_number && reg.order_number.toLowerCase().includes(searchLower)) ||
      (product && product.title.toLowerCase().includes(searchLower))
    );
  });

  // Map registrations with their corresponding product details
  const registrationsWithProducts = filteredRegistrations.map(reg => ({
    ...reg,
    product: workshops.find(p => p.id === reg.product_id)
  }));

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mobile-first Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ניהול משתתפים</h1>
            <p className="text-gray-500 text-sm">רשימת כל המורים והמורות שנרשמו ל{getProductTypeName('workshop', 'plural')}</p>
          </div>

          {/* Mobile-responsive Search */}
          <div className="w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`חיפוש לפי שם, מייל או ${getProductTypeName('workshop', 'singular')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>

        {/* Participants List */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-600" />
              רשימת משתתפים ({registrationsWithProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrationsWithProducts.length > 0 ? (
              <div className="space-y-4">
                {registrationsWithProducts.map((registration) => (
                  <div key={`${registration.id}-${registration.type}`} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col space-y-4">
                      {/* Header with name and status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{registration.participant_name}</h3>
                          <Badge className={
                            registration.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : registration.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : registration.payment_status === 'registered' // Added status for registrations
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800' // Refunded or other (e.g., 'cancelled')
                          }>
                            {registration.payment_status === 'paid' ? 'שולם' :
                             registration.payment_status === 'pending' ? 'ממתין לתשלום' :
                             registration.payment_status === 'registered' ? 'נרשם' : 'הוחזר'}
                          </Badge>
                          {registration.type === 'purchase' && (
                            <Badge variant="outline" className="text-xs">רכישה</Badge>
                          )}
                          {registration.type === 'registration' && (
                            <Badge variant="outline" className="text-xs">הרשמה</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <DollarSign className="w-4 h-4" />
                          <span>₪{registration.payment_amount || 0}</span>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="break-all">{registration.participant_email}</span>
                        </div>
                        {registration.participant_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{registration.participant_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>נרשם ב-{format(new Date(registration.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                        </div>
                        {registration.order_number && (
                          <div className="text-xs text-gray-400">
                            מספר הזמנה: {registration.order_number}
                          </div>
                        )}
                      </div>

                      {/* Product details (formerly Workshop details) */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium text-gray-900">
                          {registration.product?.title || 'מוצר לא נמצא'}
                        </div>
                        {registration.product?.scheduled_date && (
                          <div className="text-sm text-gray-600 mt-1">
                            {format(new Date(registration.product.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </div>
                        )}
                        {/* New: Display product type */}
                        <div className="text-xs text-gray-500 mt-1">
                          {registration.product?.product_type === 'workshop' ? getProductTypeName('workshop', 'singular') :
                           registration.product?.product_type === 'course' ? getProductTypeName('course', 'singular') :
                           registration.product?.product_type === 'tool' ? getProductTypeName('tool', 'singular') : 'מוצר'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">אין משתתפים עדיין</h3>
                <p>משתתפים יופיעו כאן לאחר הרשמה ל{getProductTypeName('workshop', 'plural')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
