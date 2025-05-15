import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["admin", "branch_manager", "accountant"]).default("branch_manager"),
  branchId: z.number().optional(),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "branch_manager",
    },
  });

  // Login form submit handler
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  }

  // Register form submit handler
  function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate(values, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
        {/* Left column - Forms */}
        <div className="w-full lg:w-1/2 p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="material-icons text-primary text-2xl">account_balance</span>
            <h1 className="text-2xl font-bold">Finance Management</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>Enter your username and password to access your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Enter your details to create a new account</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Hero section */}
        <div className="hidden lg:block lg:w-1/2 bg-primary p-10 text-white flex flex-col justify-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Finance Management System</h2>
            <p className="text-lg">
              A comprehensive solution for managing invoices, tracking financial data, and generating reports for all your branches.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                <span>Manage invoices from wholesalers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                <span>Track daily financial activities per branch</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                <span>Role-based access control</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                <span>Generate reports with advanced filtering</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-icons text-lg">check_circle</span>
                <span>Visualize financial data with charts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
