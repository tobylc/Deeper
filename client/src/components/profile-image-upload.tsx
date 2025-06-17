import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Link as LinkIcon, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ProfileAvatar from "@/components/profile-avatar";
import { cn } from "@/lib/utils";

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate?: (imageUrl: string) => void;
}

export default function ProfileImageUpload({ currentImageUrl, onImageUpdate }: ProfileImageUploadProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileImageMutation = useMutation({
    mutationFn: async (profileImageUrl: string) => {
      const response = await fetch('/api/users/profile-image', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileImageUrl }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile image updated",
        description: "Your profile image has been successfully updated.",
        duration: 3000,
      });
      
      // Invalidate user queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/by-email/${user?.email}`] });
      
      setImageUrl("");
      setIsPreviewMode(false);
      onImageUpdate?.(data.profileImageUrl);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile image",
        description: error.message || "Please try again with a valid image URL.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handlePreview = () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Image URL required",
        description: "Please enter a valid image URL to preview.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewMode(true);
  };

  const handleSave = () => {
    updateProfileImageMutation.mutate(imageUrl);
  };

  const handleCancel = () => {
    setImageUrl("");
    setIsPreviewMode(false);
  };

  const handleRemoveImage = () => {
    updateProfileImageMutation.mutate("");
  };

  const suggestedServices = [
    { name: "Gravatar", url: "https://gravatar.com", description: "Universal avatar service" },
    { name: "GitHub", url: "https://github.com", description: "Use your GitHub profile picture" },
    { name: "Imgur", url: "https://imgur.com", description: "Free image hosting" },
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-ocean/5 to-amber/5">
        <CardTitle className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-ocean to-amber rounded-lg blur-sm opacity-60"></div>
            <div className="relative bg-gradient-to-br from-ocean to-amber p-2 rounded-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-lg font-bold text-slate-800">Profile Image</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Current Image Display */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <ProfileAvatar
                email={user?.email || ""}
                firstName={user?.firstName || undefined}
                lastName={user?.lastName || undefined}
                profileImageUrl={isPreviewMode ? imageUrl : currentImageUrl}
                size="xl"
                className="border-4 border-white shadow-xl"
              />
              
              {currentImageUrl && !isPreviewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={updateProfileImageMutation.isPending}
                  className="absolute -bottom-2 -right-2 h-8 w-8 p-0 bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Image URL Input */}
          <div className="space-y-3">
            <Label htmlFor="image-url" className="text-sm font-medium text-slate-700">
              Image URL
            </Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/your-image.jpg"
                  className="border-slate-200 focus:border-ocean focus:ring-ocean/20"
                  disabled={updateProfileImageMutation.isPending}
                />
              </div>
              
              {!isPreviewMode ? (
                <Button
                  onClick={handlePreview}
                  disabled={!imageUrl.trim() || updateProfileImageMutation.isPending}
                  variant="outline"
                  className="border-ocean text-ocean hover:bg-ocean hover:text-white"
                >
                  Preview
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileImageMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={updateProfileImageMutation.isPending}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-lg border border-slate-200/60">
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <LinkIcon className="w-4 h-4 mr-2 text-ocean" />
              Image Hosting Services
            </h4>
            <div className="grid gap-2">
              {suggestedServices.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{service.name}</span>
                    <span className="text-slate-500 ml-2">{service.description}</span>
                  </div>
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean hover:text-ocean/80 underline"
                  >
                    Visit
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Use a square image (1:1 aspect ratio) for best results</p>
            <p>• Recommended size: 400x400 pixels or larger</p>
            <p>• Supported formats: JPG, PNG, GIF, WebP</p>
            <p>• Make sure the image URL is publicly accessible</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}