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
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile & Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account and security settings</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card - Compact */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex gap-2">
                   <Badge variant={user.isHead ? "default" : "secondary"} className="text-xs">
                      {user.isHead ? 'Department Head' : 'Staff Member'}
                   </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Department</p>
                    <p className="text-muted-foreground">{user.department}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Access Level</p>
                    <p className="text-muted-foreground">
                      {user.isHead ? 'Full Control' : 'Standard'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card - Compact */}
          <Card className="md:col-span-2">
             <CardHeader>
              <CardTitle className="text-lg">Security Settings</CardTitle>
              <CardDescription className="text-sm">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert variant={message.type === 'error' ? "destructive" : "default"} className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300' : ''}`}>
                  <AlertDescription className="text-sm">
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-9 pr-10 h-9"
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-9 px-3 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-9 pr-10 h-9"
                                {...field}
                                disabled={isLoading}
                              />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-9 px-3 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
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
                          <FormLabel className="text-sm">Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-9 pr-10 h-9"
                                {...field}
                                disabled={isLoading}
                              />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-9 px-3 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
