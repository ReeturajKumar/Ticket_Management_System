import { useState, useEffect } from "react"
import { StudentLayout } from "@/components/layout/StudentLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser } from "@/lib/auth"
import { updateProfile, changePassword, getProfile } from "@/services/profileService"
import { getStudentDashboardStats } from "@/services/dashboardService"
import {
  User,
  Mail,
  Shield,
  Calendar,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState(getCurrentUser())
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    totalTickets: 0,
    resolvedTickets: 0,
  })

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Fetch profile and stats data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch profile
        const profileResult = await getProfile()
        if (profileResult.data?.user) {
          setUser(profileResult.data.user)
          setFormData({
            name: profileResult.data.user.name,
            email: profileResult.data.user.email,
          })
          localStorage.setItem('user', JSON.stringify(profileResult.data.user))
        }

        // Fetch stats
        const statsResult = await getStudentDashboardStats()
        if (statsResult.data?.summary) {
          setStats({
            totalTickets: statsResult.data.summary.totalTickets,
            resolvedTickets: statsResult.data.summary.resolvedTickets,
          })
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    
    try {
      const result = await updateProfile(formData.name)
      
      // Update state and localStorage with new user data
      if (result.data?.user) {
        setUser(result.data.user)
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }
      
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update profile. Please try again."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    // Validate password length
    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    setIsChangingPassword(true)
    setPasswordError(null)
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      
      // Clear form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to change password. Please try again."
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    })
    setIsEditing(false)
  }

  return (
    <StudentLayout>
      <div className="container mx-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your account information and preferences
              </p>
            </div>
            {!isEditing && !isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="cursor-pointer gap-2"
              >
                <Edit className="size-4" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Success Alert */}
              {saveSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-sm text-green-900 dark:text-green-100">
                    Profile updated successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {saveError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription className="text-sm">{saveError}</AlertDescription>
                </Alert>
              )}

              {/* Main Content - Two Column Layout */}
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                {/* Left Column - Profile Card */}
                <div>
                  <Card className="sticky top-20">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div className="mb-4">
                          <Avatar className="size-24">
                            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                              {getInitials(user?.name || "User")}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* User Info */}
                        <h3 className="text-lg font-semibold">{user?.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
                        <Badge variant="secondary" className="mt-3">
                          {user?.role || "Student"}
                        </Badge>

                        <Separator className="my-6" />

                        {/* Quick Stats */}
                        <div className="grid w-full grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.totalTickets}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Total Tickets</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.resolvedTickets}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Resolved</p>
                          </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Member Since */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="size-4" />
                          <span>Member since {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Tabs Content */}
                <div>
                  <Tabs defaultValue="general" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general" className="cursor-pointer">General</TabsTrigger>
                      <TabsTrigger value="security" className="cursor-pointer">Security</TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Personal Information</CardTitle>
                          <CardDescription className="text-sm">Update your account details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="grid gap-5 sm:grid-cols-2">
                            {/* Name */}
                            <div className="space-y-2">
                              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                                <User className="size-4" />
                                Full Name
                              </Label>
                              {isEditing ? (
                                <Input
                                  id="name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  autoComplete="name"
                                  className="h-10"
                                />
                              ) : (
                                <p className="flex h-10 items-center rounded-lg border bg-muted/50 px-3 text-sm">
                                  {user?.name}
                                </p>
                              )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                                <Mail className="size-4" />
                                Email Address
                              </Label>
                              <p className="flex h-10 items-center rounded-lg border bg-muted/50 px-3 text-sm">
                                {user?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Shield className="size-4" />
                                Role
                              </Label>
                              <div className="flex h-10 items-center">
                                <Badge variant="secondary" className="text-sm">
                                  {user?.role || "Student"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {isEditing && (
                            <>
                              <Separator className="my-5" />
                              <div className="flex justify-end gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancel}
                                  disabled={isSaving}
                                  className="cursor-pointer gap-2"
                                >
                                  <X className="size-4" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSave}
                                  disabled={isSaving}
                                  className="cursor-pointer gap-2"
                                >
                                  {isSaving ? (
                                    <>Saving...</>
                                  ) : (
                                    <>
                                      <Save className="size-4" />
                                      Save Changes
                                    </>
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Change Password</CardTitle>
                          <CardDescription className="text-sm">
                            Update your password to keep your account secure
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          {/* Password Success Alert */}
                          {passwordSuccess && (
                            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                              <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                              <AlertDescription className="text-sm text-green-900 dark:text-green-100">
                                Password changed successfully!
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Password Error Alert */}
                          {passwordError && (
                            <Alert variant="destructive">
                              <AlertCircle className="size-4" />
                              <AlertDescription className="text-sm">{passwordError}</AlertDescription>
                            </Alert>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="current-password" className="text-sm font-medium">
                              Current Password
                            </Label>
                            <div className="relative">
                              <Input
                                id="current-password"
                                type={showCurrentPassword ? "text" : "password"}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                autoComplete="current-password"
                                className="h-10 pr-10"
                                disabled={isChangingPassword}
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                tabIndex={-1}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="new-password" className="text-sm font-medium">
                                New Password
                              </Label>
                              <div className="relative">
                                <Input
                                  id="new-password"
                                  type={showNewPassword ? "text" : "password"}
                                  value={passwordData.newPassword}
                                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                  autoComplete="new-password"
                                  className="h-10 pr-10"
                                  disabled={isChangingPassword}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                  tabIndex={-1}
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="size-4" />
                                  ) : (
                                    <Eye className="size-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password" className="text-sm font-medium">
                                Confirm Password
                              </Label>
                              <div className="relative">
                                <Input
                                  id="confirm-password"
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={passwordData.confirmPassword}
                                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                  autoComplete="new-password"
                                  className="h-10 pr-10"
                                  disabled={isChangingPassword}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="size-4" />
                                  ) : (
                                    <Eye className="size-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <Separator className="my-5" />
                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              className="cursor-pointer"
                              onClick={handlePasswordChange}
                              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                            >
                              {isChangingPassword ? "Updating..." : "Update Password"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
