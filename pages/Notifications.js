import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserPlus, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom"; // Assuming react-router-dom for navigation
import { createPageUrl } from "@/utils"; // Assuming a utility to create page URLs

export default function Notifications() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Initialize useNavigate hook

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch notifications for current user
  const { data: notifications } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.Notification.filter({ recipient_email: currentUser.email }, '-created_date', 50);
    },
    enabled: !!currentUser,
    initialData: [],
  });

  // Fetch all users for displaying names
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 50),
    initialData: [],
  });

  // Fetch all posts for displaying post images
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 50),
    initialData: [],
  });

  // Fetch follows to check if already following
  const { data: follows } = useQuery({
    queryKey: ['follows', currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Follow back mutation
  const followBackMutation = useMutation({
    mutationFn: async (targetEmail) => {
      // Create follow relationship
      await base44.entities.Follow.create({
        follower_email: currentUser.email,
        following_email: targetEmail
      });

      // Update current user's following_count
      await base44.auth.updateMe({ 
        following_count: (currentUser.following_count || 0) + 1 
      });

      // Create notification for the person being followed back
      await base44.entities.Notification.create({
        recipient_email: targetEmail,
        sender_email: currentUser.email,
        type: "follow",
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profileUser'] });
      // Refresh current user
      base44.auth.me().then(setCurrentUser);
    }
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-green-600" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "tag":
        return <Tag className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "follow":
        return "started following you";
      case "tag":
        return "tagged you in a post";
      default:
        return "";
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const isFollowingBack = (userEmail) => {
    return follows.some(f => f.following_email === userEmail);
  };

  const handleFollowBack = (e, senderEmail) => {
    e.stopPropagation();
    followBackMutation.mutate(senderEmail);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🔔</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No notifications yet</h3>
            <p className="text-gray-600">Activity from other users will appear here</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const sender = users.find(u => u.email === notification.sender_email);
            const post = notification.post_id ? posts.find(p => p.id === notification.post_id) : null;
            const senderName = sender?.full_name || notification.sender_email.split('@')[0];
            const isFollow = notification.type === "follow";
            const alreadyFollowing = isFollowingBack(notification.sender_email);

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`border border-gray-200 rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer ${
                  notification.is_read ? 'bg-white' : 'bg-green-50'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the parent div's onClick from triggering
                    navigate(createPageUrl("Profile"), { state: { userEmail: notification.sender_email } });
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{senderName}</span>
                        {" "}
                        <span className="text-gray-600">{getNotificationText(notification)}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notification.created_date)}</p>
                      
                      {/* Follow Back Button */}
                      {isFollow && !alreadyFollowing && (
                        <Button
                          onClick={(e) => handleFollowBack(e, notification.sender_email)}
                          disabled={followBackMutation.isPending}
                          size="sm"
                          className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {followBackMutation.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Following...
                            </>
                          ) : (
                            'Follow Back'
                          )}
                        </Button>
                      )}
                      
                      {isFollow && alreadyFollowing && (
                        <span className="text-xs text-gray-500 mt-2 inline-block">Already following</span>
                      )}
                    </div>

                    {post && post.image_url && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
