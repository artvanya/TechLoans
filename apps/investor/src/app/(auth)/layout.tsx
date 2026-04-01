// apps/investor/src/app/(auth)/layout.tsx
// Auth pages use a minimal layout (no sidebar, no portal shell)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
