"use client"
import '../globals.css'
import { AuthProvider } from '../context/AuthContext'
import LoginButton from '../components/auth/LoginButton'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-[#071422] text-slate-900 dark:text-white">
            <header className="p-4 flex justify-end">
              <LoginButton />
            </header>
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
