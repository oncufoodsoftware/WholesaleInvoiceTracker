import { useLocation } from "wouter";
import { SmartRedirect } from "@/components/smart-redirect";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <SmartRedirect currentPath={location} />
    </div>
  );
}
