import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function DebugAuth() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Register form state
  const [newUsername, setNewUsername] = useState("testuser");
  const [newPassword, setNewPassword] = useState("password123");
  const [fullName, setFullName] = useState("Test User");
  const [email, setEmail] = useState("test@example.com");
  const [role, setRole] = useState("admin");

  const handleLogin = async () => {
    try {
      setError(null);
      setResponse(null);
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(`Login failed: ${data.message || res.statusText}`);
      } else {
        setResponse(data);
        // Redirect after successful login
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  const checkSession = async () => {
    try {
      setError(null);
      
      const res = await fetch("/api/user");
      
      if (!res.ok) {
        setError(`Session check failed: ${res.statusText}`);
        setResponse(null);
      } else {
        const data = await res.json();
        setResponse(data);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };
  
  const handleRegister = async () => {
    try {
      setError(null);
      setResponse(null);
      
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: fullName,
          email: email,
          role: role,
          branchId: null // Optional branch ID
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        setError(`Registration failed: ${errorData.message || res.statusText}`);
      } else {
        const data = await res.json();
        setResponse(data);
        // Auto-fill login form with new credentials
        setUsername(newUsername);
        setPassword(newPassword);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto max-w-md p-4 mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Authentication Debugger</CardTitle>
          <CardDescription className="text-center">Fix authentication issues with your application</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create Test User</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogin} className="w-full">Login</Button>
                <Button onClick={checkSession} variant="outline">Check Session</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Username</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRegister} className="w-full">Create User</Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <Separator className="my-4" />
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded mt-4 text-red-800">
              {error}
            </div>
          )}
          
          {response && (
            <div className="p-3 bg-green-100 border border-green-300 rounded mt-4 text-green-800">
              <div className="font-semibold mb-1">Response:</div>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}