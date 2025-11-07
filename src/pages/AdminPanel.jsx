
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Mail,
  AlertCircle,
  CheckCircle,
  Search,
  UserCheck,
  Eye,
  School // Added School icon import
} from "lucide-react";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData();
    }
  }, [userLoading, currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // User data is now available from global UserContext
      setIsAdmin(currentUser.role === 'admin');

      if (currentUser.role === 'admin') {
        const allUsers = await User.list("-created_date");
        setUsers(allUsers);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleMakeAdmin = async (userId) => {
    setIsUpdating(true);
    try {
      await User.update(userId, { role: 'admin' });
      setMessage({ type: 'success', text: 'המשתמש הוסף כמנהל בהצלחה' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בהוספת המנהל' });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveAdmin = async (userId) => {
    if (userId === currentUser.id) {
      setMessage({ type: 'error', text: 'לא ניתן להסיר את עצמך מתפקיד המנהל' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsUpdating(true);
    try {
      await User.update(userId, { role: 'user' });
      setMessage({ type: 'success', text: 'המנהל הוסר בהצלחה' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בהסרת המנהל' });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImpersonateUser = async (userId) => {
    if (!confirm('האם אתה בטוח שברצונך להתחבר כמשתמש זה? תועבר לדף הבית כמשתמש זה.')) {
      return;
    }

    try {
      // Store current admin user ID in localStorage for returning later
      localStorage.setItem('impersonating_admin_id', currentUser.id);
      localStorage.setItem('impersonating_user_id', userId);
      
      setMessage({ type: 'success', text: 'מתחבר כמשתמש...' });
      
      // Redirect to home page - the layout will handle the impersonation logic
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error impersonating user:', error);
      setMessage({ type: 'error', text: 'שגיאה בהתחברות כמשתמש' });
      setTimeout(() => setMessage(null), 3000);
    }
  };


  const adminFeatures = [
    {
      title: "משתמשים",
      icon: Users,
      url: "/system-users",
      description: "נהל את המשתמשים וההרשאות שלהם במערכת"
    },
    {
      title: "מוסדות חינוך", // Changed from "בתי ספר"
      icon: School,
      url: "/schools",
      description: "נהל את רשימת מוסדות החינוך במערכת"
    },
    {
      title: "קופוני הנחה",
      icon: Tag,
      url: "/coupons",
      description: "צור וניהל קופוני הנחה ומבצעים למערכת"
    },
    // Add other admin features here if necessary in the future
  ];

  if (userLoading || isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני ניהול...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לניהול המשתמשים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins = filteredUsers.filter(user => user.role === 'admin');
  const regularUsers = filteredUsers.filter(user => user.role === 'user');

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול משתמשים</h1>
          <p className="text-gray-500">נהלי הרשאות משתמשים והתחבר כמשתמש אחר</p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="חפשי משתמש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Admin Features Section */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">אפשרויות ניהול נוספות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminFeatures.map((feature, index) => (
              <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <feature.icon className="w-10 h-10 text-indigo-600 mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                  <Button asChild>
                    <a href={feature.url}>לניהול</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>


        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current Admins */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                מנהלים נוכחיים ({admins.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admins.length > 0 ? (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{admin.full_name}</div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">מנהל</Badge>
                        {admin.id !== currentUser.id && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImpersonateUser(admin.id)}
                              disabled={isUpdating}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="התחבר כמשתמש זה"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAdmin(admin.id)}
                              disabled={isUpdating}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>אין מנהלים נוספים</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regular Users */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                משתמשים רגילים ({regularUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regularUsers.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {regularUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">משתמש</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImpersonateUser(user.id)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="התחבר כמשתמש זה"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakeAdmin(user.id)}
                          disabled={isUpdating}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>אין משתמשים רגילים</p>
                  <p className="text-sm">משתמשים חדשים יופיעו כאן לאחר הרשמה</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="border-none shadow-lg mt-6">
          <CardHeader>
            <CardTitle>הוראות שימוש</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">איך להוסיף מנהל חדש:</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>1. המשתמש צריך להירשם לאתר קודם (יופיע ברשימת המשתמשים הרגילים)</li>
                  <li>2. לחצי על כפתור + ליד שם המשתמש כדי להוסיף אותו כמנהל</li>
                  <li>3. מנהלים יכולים לגשת לכל אזורי הניהול במערכת</li>
                  <li>4. ניתן להסיר מנהלים (למעט עצמך) באמצעות כפתור -</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">התחברות כמשתמש אחר:</h3>
                <ul className="text-green-800 space-y-1 text-sm">
                  <li>1. לחצי על כפתור העין (👁) ליד המשתמש כדי להתחבר אליו</li>
                  <li>2. תועבר לדף הבית ותראה את האתר כפי שהמשתמש רואה אותו</li>
                  <li>3. בתפריט העליון יופיע כפתור "חזור לעצמי" כדי לחזור לחשבון המנהל</li>
                  <li>4. זה שימושי כדי לבדוק בעיות או לראות איך המשתמש חווה את האתר</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
