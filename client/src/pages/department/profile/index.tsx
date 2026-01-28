import { useState } from "react"
import { toast } from "react-toastify"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2,Shield, Lock, Eye, EyeOff, Building2 } from "lucide-react"

import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

import { getCurrentDepartmentUser, changePasswordDepartment } from "@/services/departmentAuthService"

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordData = z.infer<typeof passwordSchema>

export default function DepartmentProfilePage() {
  const user = getCurrentDepartmentUser()
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const form = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onPasswordSubmit(data: PasswordData) {
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await changePasswordDepartment(data.currentPassword, data.newPassword)
      
      if (result.success) {
        toast.success(result.message || "Password changed successfully.")
        setMessage({ type: 'success', text: "Password changed successfully." })
        form.reset()
      } else {
        toast.error(result.message || "Failed to change password")
        setMessage({ type: 'error', text: result.message || "Failed to change password" })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
      setMessage({ type: 'error', text: err instanceof Error ? err.message : "Something went wrong" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <DepartmentLayout>
      <div className="flex-1 p-3 sm:p-4 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="mb-2 sm:mb-3 md:mb-3 lg:mb-4">
          <h2 className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold tracking-tight">Profile & Settings</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your account and security settings</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-4 lg:gap-6">
          {/* Profile Card - Compact */}
          <Card>
            <CardContent className="pt-3 sm:pt-4 md:pt-4 lg:pt-6 pb-3 sm:pb-4 md:pb-4 lg:pb-6">
              <div className="flex flex-col items-center space-y-2 sm:space-y-2.5 md:space-y-2.5 lg:space-y-4">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-16 md:w-16 lg:h-20 lg:w-20">
                  <AvatarFallback className="text-lg sm:text-xl md:text-xl lg:text-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center space-y-0.5 w-full">
                  <h3 className="text-sm sm:text-base md:text-base lg:text-lg font-semibold truncate w-full px-2">{user.name}</h3>
                  <p className="text-xs text-muted-foreground truncate w-full px-2">{user.email}</p>
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                   <Badge variant={user.isHead ? "default" : "secondary"} className="text-xs">
                      {user.isHead ? 'Department Head' : 'Staff Member'}
                   </Badge>
                </div>
              </div>

              <Separator className="my-2.5 sm:my-3 md:my-3 lg:my-4" />

              <div className="space-y-2 sm:space-y-2.5 md:space-y-2.5 lg:space-y-3 w-full">
                <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm">
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-xs sm:text-sm">Department</p>
                    <p className="text-muted-foreground truncate text-xs">{user.department}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-xs sm:text-sm">Access Level</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {user.isHead ? 'Full Control' : 'Standard'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card - Compact */}
          <Card>
             <CardHeader className="p-3 sm:p-4 md:p-4 lg:p-6 pb-2 sm:pb-2 md:pb-3 lg:pb-4">
              <CardTitle className="text-sm sm:text-base md:text-base lg:text-lg">Security Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-4 lg:p-6 pt-2 sm:pt-2 md:pt-3 lg:pt-4">
              {message && (
                <Alert variant={message.type === 'error' ? "destructive" : "default"} className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300' : ''}`}>
                  <AlertDescription className="text-xs sm:text-sm">
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-2 sm:space-y-2.5 md:space-y-2.5 lg:space-y-3">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-8 sm:pl-9 pr-9 sm:pr-10 h-8 sm:h-9 md:h-9 lg:h-10 text-xs sm:text-sm"
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-8 sm:h-9 md:h-9 lg:h-10 px-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2 sm:gap-2.5 md:gap-2.5 lg:gap-3 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-8 sm:pl-9 pr-9 sm:pr-10 h-8 sm:h-9 md:h-9 lg:h-10 text-xs sm:text-sm"
                                {...field}
                                disabled={isLoading}
                              />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-8 sm:h-9 md:h-9 lg:h-10 px-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              )}
                            </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-8 sm:pl-9 pr-9 sm:pr-10 h-8 sm:h-9 md:h-9 lg:h-10 text-xs sm:text-sm"
                                {...field}
                                disabled={isLoading}
                              />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-8 sm:h-9 md:h-9 lg:h-10 px-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              )}
                            </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-1 sm:pt-1.5 md:pt-2 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      size="sm"
                      className="w-full sm:w-auto h-8 sm:h-9 md:h-9 lg:h-10 text-xs sm:text-sm px-3 sm:px-4 md:px-4 lg:px-6"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DepartmentLayout>
  )
}
