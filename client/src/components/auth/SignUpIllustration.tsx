import signupIllustration from "@/assets/images/signup-illustration.png"

export function SignUpIllustration() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden lg:block lg:w-[60%]">
      <img
        src={signupIllustration}
        alt="Student registration illustration"
        className="h-full w-full object-cover"
      />
    </div>
  )
}
