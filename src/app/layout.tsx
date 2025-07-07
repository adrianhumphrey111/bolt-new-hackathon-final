import "../../styles/global.css";
import { Metadata, Viewport } from "next";
import { AuthProvider } from "../components/AuthProvider";
import GoogleAnalytics from "../components/GoogleAnalytics";

export const metadata: Metadata = {
  title: "Tailored Labs - AI Video Editor",
  description: "Professional video editing powered by AI - Create stunning videos with Tailored Labs",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <GoogleAnalytics />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}