import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation } from "wouter";
import { CircleDollarSign, TrendingUp, BarChart3, PieChart, Banknote, Coins } from "lucide-react";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});



export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Login form - initialize before any conditionals
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in - AFTER all hooks are called
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  // Login form submit handler
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        setLocation("/dashboard");
      },
    });
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Money Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600">
        {/* Floating Money Icons */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large floating elements */}
          <div className="absolute top-10 left-10 animate-pulse">
            <CircleDollarSign className="w-16 h-16 text-white/20" />
          </div>
          <div className="absolute top-32 right-20 animate-bounce delay-300">
            <Banknote className="w-12 h-12 text-white/15" />
          </div>
          <div className="absolute bottom-20 left-20 animate-pulse delay-500">
            <Coins className="w-14 h-14 text-white/20" />
          </div>
          <div className="absolute top-1/2 right-10 animate-bounce delay-700">
            <TrendingUp className="w-10 h-10 text-white/15" />
          </div>
          <div className="absolute bottom-32 right-32 animate-pulse delay-1000">
            <BarChart3 className="w-12 h-12 text-white/20" />
          </div>
          <div className="absolute top-20 left-1/2 animate-bounce delay-1200">
            <PieChart className="w-8 h-8 text-white/15" />
          </div>
          
          {/* Small floating elements */}
          <div className="absolute top-1/4 left-1/4 animate-pulse delay-200">
            <CircleDollarSign className="w-6 h-6 text-white/10" />
          </div>
          <div className="absolute bottom-1/4 right-1/4 animate-bounce delay-600">
            <Banknote className="w-8 h-8 text-white/10" />
          </div>
          <div className="absolute top-3/4 left-1/3 animate-pulse delay-800">
            <Coins className="w-7 h-7 text-white/10" />
          </div>
          <div className="absolute top-1/3 right-1/3 animate-bounce delay-1100">
            <TrendingUp className="w-5 h-5 text-white/10" />
          </div>
        </div>
        
        {/* Geometric patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* Left column - Login Form */}
          <div className="w-full lg:w-1/2 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                <CircleDollarSign className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Öncü Finance</h1>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl text-gray-800 dark:text-white">Welcome Back</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Sign in to access your financial management dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              className="border-gray-300 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              className="border-gray-300 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Signing in...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Hero section */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700 p-10 text-white flex-col justify-center relative overflow-hidden">
            {/* Background pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10">
                <CircleDollarSign className="w-32 h-32" />
              </div>
              <div className="absolute bottom-10 left-10">
                <TrendingUp className="w-24 h-24" />
              </div>
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold leading-tight">
                  Smart Financial
                  <br />
                  Management
                </h2>
                <p className="text-lg text-emerald-100 leading-relaxed">
                  Streamline your business operations with our comprehensive financial management platform designed for modern enterprises.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-50">Advanced Analytics & Reporting</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-50">Invoice & Payment Management</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-50">Real-time Financial Insights</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-50">Multi-branch Operations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
