import { useState } from "react";
// use useNavigate for program frontend routing and Link for jsx routing
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

// method to handle login
const Login = () => {
  // to re render email and password as user types
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // to set a loading state until the login is handled
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async () => {
    // if user hasn't entered fields
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both email and password.",
      });
      return;
    }

    // set the loading state to true until login is validated / invalidated
    setLoading(true);

    try {
      // send api call to backend 
      const res = await api.post("/auth/login", { email, password });

      toast({ title: "Login Successful", description: "Welcome back!" });

      // navigate after the backend call is a success based on role
      const role = res.data.role;
      if (role === "participant") {
        // see if they have any interests or following if not then allow them to onboard 
        const meResponse = await api.get("/participant/me");
        const interests = meResponse.data?.participantProfile?.interests || [];
        const following = meResponse.data?.participantProfile?.following || [];
        const alreadyOnboarded = localStorage.getItem("onboardingShown") === "true";
        const shouldOnboard = !alreadyOnboarded && interests.length === 0 && following.length === 0;

        if (shouldOnboard) {
          localStorage.setItem("onboardingShown", "true");
          navigate("/participant/onboarding");
        } else {
          navigate("/participant/dashboard");
        }
      }
      else if (role === "organizer") navigate("/organizer/dashboard");
      else if (role === "admin") navigate("/admin/dashboard");
      else navigate("/");

    } catch (err) {
      console.error("Login Error:", err);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.response?.data?.message || "Invalid credentials.",
      });
    } finally {
      // set loading to false after the request has been handled
      setLoading(false);
    }
  };

  return (
    // set to full screen height and place the items in the center with padding
    <div className="min-h-screen grid place-items-center p-4">
      {/* set the card to max width*/}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Felicity Login</CardDescription>
        </CardHeader>

        {/* space the input fields with 4px vertical width */}
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {/*set the email as soon as user enters to re render */}
            <Input
              id="email"
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter>
          <div className="space-y-3">
            {/* once clicked disable it until loading */}
            <Button onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>

            <div>
              <span>Don't have an account? </span>
              <Link to="/participant/register">
                Sign up here
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
