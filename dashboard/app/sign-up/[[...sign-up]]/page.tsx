import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <SignUp appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "bg-gray-800 border-gray-700",
          headerTitle: "text-gray-100",
          headerSubtitle: "text-gray-300",
          socialButtonsBlockButton: "bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
          formFieldInput: "bg-gray-700 border-gray-600 text-gray-100",
          formFieldLabel: "text-gray-300",
          footerActionLink: "text-blue-400 hover:text-blue-300",
        }
      }} />
    </div>
  );
}
