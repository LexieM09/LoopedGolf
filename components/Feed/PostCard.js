import React, { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, ChevronLeft, ChevronRight, Download, Loader2, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger // Added DialogTrigger import
} from "@/components/ui/dialog";

export default function PostCard({ post, currentUser, customName, customDescription, customTaggedWith, customSecondImage }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [isLiked, setIsLiked] = useState(
    post.liked_by?.includes(currentUser?.email) || false
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Fetch the post creator's user data
  const { data: postCreator } = useQuery({
    queryKey: ['user', post.created_by],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: post.created_by });
      return users[0] || null;
    },
    enabled: !!post.created_by && !customName,
    initialData: null,
  });

  // Fetch comments for this post
  const { data: comments } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      return await base44.entities.Comment.filter({ post_id: post.id }, '-created_date');
    },
    initialData: [],
  });

  // Fetch tagged users details
  const { data: taggedUsersData } = useQuery({
    queryKey: ['taggedUsers', post.id],
    queryFn: async () => {
      if (!post.tagged_users || post.tagged_users.length === 0) return [];
      const usersPromises = post.tagged_users.map(email => 
        base44.entities.User.filter({ email })
      );
      const usersResults = await Promise.all(usersPromises);
      return usersResults.map(result => result[0]).filter(Boolean);
    },
    enabled: !!(post.tagged_users && post.tagged_users.length > 0),
    initialData: [],
  });

  // Determine which images to show
  const images = post.image_urls && post.image_urls.length > 0 
    ? post.image_urls 
    : customSecondImage 
    ? [post.image_url, customSecondImage]
    : [post.image_url];

  const hasMultipleImages = images.length > 1;
  const isOwnPost = currentUser && post.created_by === currentUser.email;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const newLikedBy = isLiked
        ? post.liked_by.filter((email) => email !== currentUser.email)
        : [...(post.liked_by || []), currentUser.email];

      await base44.entities.Post.update(post.id, {
        likes: newLikedBy.length,
        liked_by: newLikedBy
      });

      // Create notification if liking (not unliking) and not own post
      if (!isLiked && post.created_by !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: post.created_by,
          sender_email: currentUser.email,
          type: "like",
          post_id: post.id,
          is_read: false
        });
      }
    },
    onMutate: () => {
      setIsLiked(!isLiked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (commentData) => {
      await base44.entities.Comment.create(commentData);
      
      // Create notification for post owner if not commenting on own post
      if (post.created_by !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: post.created_by,
          sender_email: currentUser.email,
          type: "comment",
          post_id: post.id,
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setCommentText("");
    }
  });

  const handleLike = () => {
    if (currentUser) {
      likeMutation.mutate();
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || !currentUser) return;
    
    commentMutation.mutate({
      post_id: post.id,
      comment_text: commentText,
      commenter_email: currentUser.email
    });
  };

  const handleScorecardClick = () => {
    navigate(createPageUrl("Scorecard"), { state: { post } });
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Determine display name
  const displayName = customName || postCreator?.full_name || post.created_by?.split('@')[0] || "Golfer";

  const handleSaveToPhotos = async () => {
    setIsDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas element not found");
      }
      const ctx = canvas.getContext("2d");

      // Load main image
      const mainImg = new Image();
      mainImg.crossOrigin = "anonymous";
      mainImg.src = images[currentImageIndex];
      
      await new Promise((resolve, reject) => {
        mainImg.onload = resolve;
        mainImg.onerror = () => reject(new Error("Failed to load image"));
      });

      canvas.width = mainImg.naturalWidth;
      canvas.height = mainImg.naturalHeight;
      
      // Draw main image
      ctx.drawImage(mainImg, 0, 0, canvas.width, canvas.height);

      // Add Looped watermark at bottom right with more margin
      const watermarkImg = new Image();
      watermarkImg.crossOrigin = "anonymous";
      watermarkImg.src = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69062849b895e3e15345df90/35e2d3c55_looped.png";
      
      await new Promise((resolve, reject) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = () => reject(new Error("Failed to load watermark"));
      });

      // Draw watermark with increased right margin
      const watermarkWidth = canvas.width * 0.15;
      const watermarkHeight = (watermarkWidth * watermarkImg.naturalHeight) / watermarkImg.naturalWidth;
      const watermarkX = canvas.width - watermarkWidth - (canvas.width * 0.05); // Increased from 0.02 to 0.05
      const watermarkY = canvas.height - watermarkHeight - (canvas.height * 0.02);
      
      ctx.drawImage(watermarkImg, watermarkX, watermarkY, watermarkWidth, watermarkHeight);

      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) {
        throw new Error("Failed to create image");
      }

      // Create File object
      const fileName = `looped-${(post.course_name || 'round').replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Use Web Share API (iOS Safari, modern browsers)
        try {
          await navigator.share({
            title: 'Shared from Looped',
            text: 'Check out my round!',
            files: [file]
          });
        } catch (shareError) {
          // User cancelled the share or error occurred
          if (shareError.name !== 'AbortError') {
            console.error("Share failed:", shareError);
            // Fall back to download
            downloadFile(blob, fileName);
          }
        }
      } else {
        // Fall back to download for desktop/unsupported browsers
        downloadFile(blob, fileName);
      }
    } catch (error) {
      console.error("Error saving image:", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-white px-6 py-5 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header with Profile, Name, Course & Score */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => !customName && navigate(createPageUrl("Profile"), { state: { userEmail: post.created_by } })}
            className={!customName ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {postCreator?.profile_image ? (
                <img src={postCreator.profile_image} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                displayName[0]?.toUpperCase() || "U"
              )}
            </div>
          </button>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xl font-medium">{displayName}</p>
              {customName && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">{post.course_name || "Eagles Nest GC"}</p>
          </div>
        </div>
        
        {/* Score */}
        <div className="text-right">
          <span className="text-3xl font-normal">{post.score || "71"}</span>
        </div>
      </div>

      {/* Images - Single or Carousel */}
      <div className="mb-4">
        {images.length === 1 ? (
          // Single Image - Full Width
          <div
            className="rounded-2xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity aspect-[3/1] relative"
            onClick={handleScorecardClick}
          >
            <img
              src={images[0]}
              alt="Round"
              className="w-full h-full object-cover"
            />
            {/* Save to Photos Button - Only show for own posts */}
            {isOwnPost && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveToPhotos();
                }}
                disabled={isDownloading}
                className="absolute top-3 right-3 bg-white/95 hover:bg-white text-gray-800 rounded-full shadow-lg border border-gray-200 h-10 px-4"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Save to Photos
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          // Multiple Images - Carousel
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/1]">
            <img
              src={images[currentImageIndex]}
              alt={`Round ${currentImageIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleScorecardClick}
            />
            
            {/* Save to Photos Button - Only show for own posts */}
            {isOwnPost && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveToPhotos();
                }}
                disabled={isDownloading}
                className="absolute top-3 right-3 bg-white/95 hover:bg-white text-gray-800 rounded-full shadow-lg border border-gray-200 h-10 px-4 z-10"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Save to Photos
                  </>
                )}
              </Button>
            )}
            
            {/* Navigation Arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {/* Image Counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Caption Title */}
      <h3 className="mb-1 text-lg font-medium">{post.caption || "Great Round!"}</h3>
      
      {/* Description */}
      <p className="text-gray-700 mb-4 text-sm">
        {customDescription || post.description || "Hit it well, could've putt better..."}
      </p>

      {/* Footer with Tags and Actions */}
      <div className="flex items-center justify-between">
        {/* Tagged users section with dialog */}
        {(post.tagged_users && post.tagged_users.length > 0) || customTaggedWith ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
                <p className="text-sm text-gray-500">
                  {customTaggedWith || `with ${post.tagged_users.length} ${post.tagged_users.length === 1 ? 'golfer' : 'golfers'}`}
                </p>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Tagged Golfers</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {taggedUsersData.map((user) => (
                  <div key={user.email} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {user.profile_image ? (
                        <img src={user.profile_image} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        (user.full_name?.[0] || user.email[0]).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{user.full_name || user.email.split('@')[0]}</p>
                      <p className="text-sm text-gray-500">{user.home_course || user.location || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div />
        )}
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className="transition-transform hover:scale-110 flex items-center gap-1">
            <Heart
              className={`w-7 h-7 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
            {post.likes > 0 && <span className="text-sm text-gray-600">{post.likes}</span>}
          </button>
          <button 
            onClick={() => setShowComments(true)}
            className="transition-transform hover:scale-110 flex items-center gap-1">
            <MessageCircle className="w-7 h-7 text-gray-400" />
            {comments.length > 0 && <span className="text-sm text-gray-600">{comments.length}</span>}
          </button>
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {comments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="flex items-end gap-2 pt-4 border-t">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || commentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {commentMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function CommentItem({ comment }) {
  const navigate = useNavigate();
  
  const { data: commenter } = useQuery({
    queryKey: ['user', comment.commenter_email],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: comment.commenter_email });
      return users[0] || null;
    },
    initialData: null,
  });

  const displayName = commenter?.full_name || comment.commenter_email.split('@')[0];

  return (
    <div className="flex gap-3">
      <button
        onClick={() => navigate(createPageUrl("Profile"), { state: { userEmail: comment.commenter_email } })}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {commenter?.profile_image ? (
            <img src={commenter.profile_image} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            displayName[0]?.toUpperCase()
          )}
        </div>
      </button>
      <div className="flex-1">
        <p className="font-semibold text-sm">{displayName}</p>
        <p className="text-gray-700 text-sm mt-1">{comment.comment_text}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(comment.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
