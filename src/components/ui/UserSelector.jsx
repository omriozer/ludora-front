import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/services/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserIcon, Crown, Search, X, Users } from "lucide-react";

export default function UserSelector({ value, onValueChange, placeholder = "בחר משתמש", disabled = false }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filterUsers = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
      (user.display_name && user.display_name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    );
    
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await User.list("full_name");
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (value && users.length > 0) {
      const user = users.find(u => u.id === value);
      setSelectedUser(user);
    } else {
      setSelectedUser(null);
    }
  }, [value, users]);

  useEffect(() => {
    if (isOpen && users.length === 0) {
      loadUsers();
    }
  }, [isOpen, users.length]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    onValueChange(user.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    onValueChange("");
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected User Display */}
      {selectedUser ? (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                {selectedUser.role === 'admin' ? (
                  <Crown className="w-4 h-4 text-purple-600" />
                ) : (
                  <UserIcon className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {selectedUser.display_name || selectedUser.full_name}
                </div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
                {selectedUser.phone && (
                  <div className="text-xs text-gray-400">{selectedUser.phone}</div>
                )}
              </div>
              {selectedUser.role === 'admin' && (
                <Badge className="bg-purple-100 text-purple-800">מנהל מערכת</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenModal}
                disabled={disabled}
                title="החלף משתמש"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={disabled}
                title="בטל בחירה"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleOpenModal}
          disabled={disabled}
          className="w-full justify-start text-gray-500 hover:text-gray-700"
        >
          <UserIcon className="w-4 h-4 ml-2" />
          {placeholder}
        </Button>
      )}

      {/* User Selection Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>בחר משתמש</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חפש לפי שם, אימייל או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Users List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 ml-2"></div>
                  <span>טוען משתמשים...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'לא נמצאו משתמשים התואמים לחיפוש' : 'לא נמצאו משתמשים'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Crown className="w-5 h-5 text-purple-600" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {user.display_name || user.full_name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-gray-400">{user.phone}</div>
                      )}
                    </div>
                    {user.role === 'admin' && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
                        מנהל
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}