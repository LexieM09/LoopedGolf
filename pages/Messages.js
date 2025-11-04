import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Messages() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 50),
    initialData: [],
  });

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 50),
    initialData: [],
  });

  // Generate conversations from users who have interacted with current user
  const generateConversations = () => {
    if (!currentUser) return [];
    
    const conversationMap = new Map();
    
    // Find users who tagged current user
    posts.forEach(post => {
      if (post.tagged_users && post.tagged_users.includes(currentUser.email) && post.created_by !== currentUser.email) {
        if (!conversationMap.has(post.created_by)) {
          const user = users.find(u => u.email === post.created_by);
          if (user) {
            conversationMap.set(post.created_by, {
              id: post.created_by,
              user: {
                name: user.full_name || post.created_by.split('@')[0],
                email: post.created_by,
                profile_image: user.profile_image,
                verified: false
              },
              lastMessage: `Tagged you in a post at ${post.course_name || "golf course"}`,
              time: "recently",
              unread: false
            });
          }
        }
      }
    });

    // Find users current user has tagged
    const userPosts = posts.filter(p => p.created_by === currentUser.email);
    userPosts.forEach(post => {
      if (post.tagged_users && post.tagged_users.length > 0) {
        post.tagged_users.forEach(taggedEmail => {
          if (!conversationMap.has(taggedEmail)) {
            const user = users.find(u => u.email === taggedEmail);
            if (user) {
              conversationMap.set(taggedEmail, {
                id: taggedEmail,
                user: {
                  name: user.full_name || taggedEmail.split('@')[0],
                  email: taggedEmail,
                  profile_image: user.profile_image,
                  verified: false
                },
                lastMessage: `You tagged them in a post`,
                time: "recently",
                unread: false
              });
            }
          }
        });
      }
    });

    return Array.from(conversationMap.values());
  };

  const conversations = generateConversations();

  const handleSendMessage = () => {
    if (messageText.trim()) {
      console.log("Sending message:", messageText);
      setMessageText("");
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversation(null)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <button
            onClick={() => navigate(createPageUrl("Profile"), { state: { userEmail: selectedConversation.user.email } })}
            className="hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {selectedConversation.user.profile_image ? (
                <img src={selectedConversation.user.profile_image} alt={selectedConversation.user.name} className="w-full h-full object-cover" />
              ) : (
                selectedConversation.user.name[0]
              )}
            </div>
          </button>
          <div className="flex-1">
            <h2 className="font-semibold">{selectedConversation.user.name}</h2>
            <p className="text-xs text-gray-500">Send them a message</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Start a conversation with {selectedConversation.user.name}</p>
          </div>
        </div>

        {/* Message Input */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex items-end gap-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="bg-green-600 hover:bg-green-700 h-11"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations List View
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No conversations yet</h3>
            <p className="text-gray-600">Tag golfers in your posts to start connecting!</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className="px-6 py-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl("Profile"), { state: { userEmail: conversation.user.email } });
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {conversation.user.profile_image ? (
                          <img src={conversation.user.profile_image} alt={conversation.user.name} className="w-full h-full object-cover" />
                        ) : (
                          conversation.user.name[0]
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{conversation.user.name}</h3>
                      <span className="text-xs text-gray-500">{conversation.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
