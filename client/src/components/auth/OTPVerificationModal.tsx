import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ShieldCheck } from "lucide-react"
import { otpSchema, type OTPFormData } from "@/lib/validations/auth"

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onSubmit: (data: OTPFormData) => Promise<void>
  onResend: () => Promise<void>
  isLoading: boolean
  error: string | null
  success: boolean
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  email,
  onSubmit,
  onResend,
  isLoading,
  error,
  success,
}: OTPVerificationModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    mode: "onChange",
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleResend = async () => {
    reset()
    await onResend()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Verify Your Email</DialogTitle>
          <DialogDescription className="text-center">
            Enter the 4-digit code sent to <br />
            <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* OTP Field */}
          <div className="space-y-2">
            <Label htmlFor="otp" className="sr-only">
              Enter OTP
            </Label>
            <Input
              id="otp"
              type="text"
              placeholder="0000"
              maxLength={4}
              {...register("otp")}
              disabled={isLoading}
              className={`text-center text-3xl tracking-[0.5em] font-bold ${
                errors.otp ? "border-destructive" : ""
              }`}
              autoComplete="one-time-code"
              autoFocus
            />
            {errors.otp && (
              <p className="text-xs text-destructive text-center">{errors.otp.message}</p>
            )}
            <p className="text-xs text-muted-foreground text-center">
              OTP expires in 2 minutes
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
              <AlertDescription className="text-sm">
                Email verified successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full cursor-pointer"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 size-4" />
                Verify OTP
              </>
            )}
          </Button>

          {/* Resend OTP Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer"
            onClick={handleResend}
            disabled={isLoading}
          >
            Resend OTP
          </Button>

          {/* Back Link */}
          <p className="text-center text-sm text-muted-foreground">
            Wrong email?{" "}
            <button
              type="button"
              onClick={handleClose}
              className="font-medium text-primary underline-offset-4 hover:underline"
              disabled={isLoading}
            >
              Go back
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
