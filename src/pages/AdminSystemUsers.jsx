
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Crown, User as UserIcon, Mail, Calendar, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminSystemUsers() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!userLoading && currentUser) {
      checkAdminAccess();
    }
  }, [userLoading, currentUser]);

  const checkAdminAccess = async () => {
    try {
      // User data is now available from global UserContext
      if (currentUser.role !== 'admin') {
        navigate('/');
        return;
      }
      await loadUsers();
    } catch (error) {
      navigate('/');
    }
    setIsLoading(false);
  };

  const loadUsers = async () => {
    try {
      const allUsers = await User.list('-created_date');
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת המשתמשים' });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await User.update(userId, { role: newRole });
      setMessage({ type: 'success', text: 'תפקיד המשתמש עודכן בהצלחה' });
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון תפקיד המשתמש' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImpersonation = async (targetUserId) => {
    try {
      // Save current admin session
      localStorage.setItem('impersonating_admin_id', currentUser.id);
      localStorage.setItem('impersonating_user_id', targetUserId);
      
      setMessage({ type: 'success', text: 'מתחבר כמשתמש...' });
      
      // Reload the page to apply impersonation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error setting up impersonation:', error);
      setMessage({ type: 'error', text: 'שגיאה בהתחברות כמשתמש' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower)
    );
  });

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {/* Users Tab Content */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
              </div>

              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  {message.type === 'error' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {/* Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="חפש משתמשים..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-12"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>רשימת משתמשים ({filteredUsers.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              {user.role === 'admin' ? (
                                <Crown className="w-5 h-5 text-white" />
                              ) : (
                                <UserIcon className="w-5 h-5 text-white" />
                              )}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{user.display_name || user.full_name}</h4>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <div className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  <span>{user.email}</span>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>הצטרף ב-{new Date(user.created_date).toLocaleDateString('he-IL')}</span>
                                </div>
                              </div>
                              
                              {user.phone && (
                                <div className="text-sm text-gray-600 mt-1">
                                  טלפון: {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Role Change Dropdown */}
                            {user.id !== currentUser.id && (
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">משתמש</SelectItem>
                                  <SelectItem value="admin">מנהל</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            
                            {user.role !== 'admin' && user.id !== currentUser.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImpersonation(user.id)}
                              >
                                <UserIcon className="w-4 h-4 ml-2" />
                                התחבר כמשתמש
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">לא נמצאו משתמשים</h3>
                        <p className="text-gray-500">
                          {searchTerm ? 'נסה לחפש עם מילות מפתח אחרות' : 'אין משתמשים רשומים במערכת'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
