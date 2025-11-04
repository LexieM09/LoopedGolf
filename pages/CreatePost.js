import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera, Loader2, MapPin, Trophy, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ScorecardInput from "../components/scorecard/ScorecardInput";
import ScorecardGenerator from "../components/scorecard/ScorecardGenerator";
import ImageOverlayEditor from "../components/post/ImageOverlayEditor";
import UserTagSearch from "../components/post/UserTagSearch";

export default function CreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState([]); // Changed from selectedFile to selectedFiles (array)
  const [previews, setPreviews] = useState([]); // Changed from preview to previews (array)
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const [finalImages, setFinalImages] = useState([]); // Changed from finalImage to finalImages (array)
  const [scorecardImageURL, setScorecardImageURL] = useState(null);
  const [scorecardSVGString, setScorecardSVGString] = useState(null);
  const [scorecardTextColor, setScorecardTextColor] = useState("black");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [holeNumber, setHoleNumber] = useState("");
  const [score, setScore] = useState("");
  const [scorecard, setScorecard] = useState(Array(18).fill(0));
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files); // This 'files' array might be combined by the 'Add More' button logic
    
    if (files.length > 0) {
      const limitedFiles = files.slice(0, 10); // Ensure it's capped at 10
      setSelectedFiles(limitedFiles);
      setFinalImages([]); // Reset finalImages when selectedFiles change, as overlays might be specific to previous files.

      const newPreviews = [];
      let loadedCount = 0;
      limitedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          loadedCount++;
          if (loadedCount === limitedFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
        setSelectedFiles([]);
        setPreviews([]);
        setFinalImages([]);
    }
  };

  const handleRemoveImage = (index) => {
    const newSelectedFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // If we remove an image, any finalImages array built on the old selection is now invalid.
    // Resetting or rebuilding finalImages is necessary. Resetting is simpler here.
    setFinalImages([]); 

    setSelectedFiles(newSelectedFiles);
    setPreviews(newPreviews);
  };

  const handleScorecardGenerated = (imageURL, svgString) => {
    setScorecardImageURL(imageURL);
    setScorecardSVGString(svgString);
  };

  const handleAddOverlay = () => {
    // Overlay can only be added to the primary image (index 0) if one exists and scorecard is generated
    if (selectedFiles.length === 0 || !previews[0]) {
      alert("Please upload at least one photo first!");
      return;
    }
    if (!scorecardImageURL) {
      alert("Please fill in your scorecard first!");
      return;
    }
    setShowOverlayEditor(true);
  };

  const handleOverlaySave = (compositeFile) => {
    if (compositeFile && previews.length > 0) {
      // Create a new finalImages array based on current selectedFiles.
      // This ensures all original files are considered, and the first one is replaced.
      const updatedFinalImages = [...selectedFiles]; 
      updatedFinalImages[0] = compositeFile; // Replace the first image with the composite file
      setFinalImages(updatedFinalImages);

      // Update the preview for the first image to reflect the composite file
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[0] = reader.result; // Update the preview of the first image
        setPreviews(newPreviews);
      };
      reader.readAsDataURL(compositeFile);
    }
    setShowOverlayEditor(false);
  };

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      return await base44.entities.Post.create(postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(createPageUrl("Feed"));
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
        alert("Please upload at least one image.");
        return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls = [];
      const imagesToUpload = finalImages.length > 0 ? finalImages : selectedFiles;
      
      for (const file of imagesToUpload) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      
      const totalScore = scorecard.reduce((sum, s) => sum + (s || 0), 0);
      
      // Create the post
      await createPostMutation.mutateAsync({
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        caption,
        description,
        course_name: courseName,
        course_location: courseLocation,
        hole_number: holeNumber ? parseInt(holeNumber) : null,
        score: score || totalScore.toString(),
        scorecard: scorecard,
        tagged_users: taggedUsers.map(u => u.email),
        likes: 0,
        liked_by: [],
        comments_count: 0
      });

      // Fetch current user details once
      const currentUser = await base44.auth.me();
      const senderEmail = currentUser.email;

      // Create notifications for tagged users
      for (const taggedUser of taggedUsers) {
        // Prevent sending notification to self
        if (taggedUser.email !== senderEmail) { 
          await base44.entities.Notification.create({
            recipient_email: taggedUser.email,
            sender_email: senderEmail,
            type: "tag",
            is_read: false
          });
        }
      }

      // Update current user's posts count
      await base44.auth.updateMe({
        posts_count: (currentUser.posts_count || 0) + 1
      });
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Show overlay editor if active and there's a primary image
  if (showOverlayEditor && previews.length > 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ImageOverlayEditor
          baseImage={previews[0]} // Pass the first preview as base image for the editor
          scorecardImage={scorecardImageURL}
          onSave={handleOverlaySave}
          onCancel={() => setShowOverlayEditor(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-700">
            Upload your round
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Name - MOVED TO TOP */}
            <div>
              <Label htmlFor="course" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Golf Course
              </Label>
              <Input
                id="course"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Pebble Beach Golf Links"
                className="mt-2"
              />
            </div>

            {/* Scorecard Input */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Scorecard</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">Text Color:</Label>
                  <Button
                    type="button"
                    variant={scorecardTextColor === "black" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScorecardTextColor("black")}
                    className={scorecardTextColor === "black" ? "bg-black text-white hover:bg-gray-800" : ""}
                  >
                    Black
                  </Button>
                  <Button
                    type="button"
                    variant={scorecardTextColor === "white" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScorecardTextColor("white")}
                    className={scorecardTextColor === "white" ? "bg-white text-black border-2 hover:bg-gray-100" : ""}
                  >
                    White
                  </Button>
                </div>
              </div>
              <ScorecardInput scores={scorecard} onChange={setScorecard} />
              <ScorecardGenerator 
                scores={scorecard} 
                textColor={scorecardTextColor} 
                courseName={courseName}
                onGenerate={handleScorecardGenerated} 
              />
              {scorecardImageURL && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-800">Scorecard generated! Upload a photo to add overlay.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Image Upload - Multiple Files */}
            <div>
              <Label>Photos (up to 10)</Label>
              {previews.length === 0 ? (
                <label className="mt-2 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG or GIF (up to 10 images)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="mt-2 space-y-3">
                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {previews.map((previewUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={previewUrl}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Main
                          </div>
                        )}
                        {/* Add overlay button only for the first image and if scorecard is ready */}
                        {index === 0 && scorecardImageURL && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={handleAddOverlay}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Add Scorecard Overlay
                                </Button>
                            </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Add More Button */}
                  {selectedFiles.length < 10 && (
                    <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <Upload className="w-5 h-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600 font-medium">Add More Photos</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files);
                          const combinedFiles = [...selectedFiles, ...newFiles];
                          // Pass combined files to handleFileChange, which will then slice to 10
                          handleFileChange({ target: { files: combinedFiles } });
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share your thoughts about this round..."
                className="mt-2 h-24"
              />
            </div>

            {/* Comment/Description */}
            <div>
              <Label htmlFor="description">Comment</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hit it well, could've putt better..."
                className="mt-2 h-24"
              />
            </div>

            {/* Play with anyone? - Tag Users */}
            <div>
              <Label className="mb-2 block">Play with anyone?</Label>
              <UserTagSearch selectedUsers={taggedUsers} onUsersChange={setTaggedUsers} />
            </div>

            {/* Score - Now optional, auto-filled from scorecard */}
            <div>
              <Label htmlFor="score" className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-600" />
                Score (auto-calculated from scorecard)
              </Label>
              <Input
                id="score"
                type="number"
                value={score || scorecard.reduce((sum, s) => sum + (s || 0), 0)}
                onChange={(e) => setScore(e.target.value)}
                placeholder=""
                className="mt-2"
                disabled
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Share Post
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
