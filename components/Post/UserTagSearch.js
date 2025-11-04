import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserTagSearch({ selectedUsers, onUsersChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 50),
    initialData: [],
  });

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(user => !selectedUsers.find(u => u.email === user.email));

  const handleSelectUser = (user) => {
    onUsersChange([...selectedUsers, user]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleRemoveUser = (userEmail) => {
    onUsersChange(selectedUsers.filter(u => u.email !== userEmail));
  };

  return (
    <div>
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedUsers.map((user) => (
            <div
              key={user.email}
              className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
                {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <span className="font-medium">{user.full_name || user.email.split('@')[0]}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.email)}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search golfers to tag..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(e.target.value.length > 0);
          }}
          onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
          className="pl-10"
        />

        {/* Dropdown Results */}
        {showDropdown && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{user.full_name || user.email.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}