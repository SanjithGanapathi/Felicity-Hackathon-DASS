import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";

// method to register the participant
const Register = () => {
  // use useState to hold user data state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    contactNumber: "",
    collegeOrOrg: "",
    role: "participant",
    isNonIIIT: false
  });
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // useState method to handle user data state
  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.id]: e.target.value 
    });
  };

  const handleRegister = async () => {
    // basic validation check all required fields
    if(!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.contactNumber || !formData.collegeOrOrg) {
        toast({ variant: "destructive", title: "Error", description: "All fields are required" });
        return;
    }

    setLoading(true);
    try {
      // create the payload to send to backend
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: "participant",
        participantProfile: {
            participantType: formData.isNonIIIT ? "Non-IIIT" : "IIIT",
            collegeOrOrg: formData.collegeOrOrg,
            contactNumber: formData.contactNumber
        }
      };

      // send a request to backend with the payload
      await api.post("/auth/register/participant", payload);
      
      toast({ title: "Account Created", description: "You can now log in." });
      // now move to the login page to login
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join Felicity events today.</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={formData.lastName} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" placeholder="9876543210" value={formData.contactNumber} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collegeOrOrg">College / Organization</Label>
              <Input id="collegeOrOrg" placeholder="IIIT Hyderabad" value={formData.collegeOrOrg} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} />
            </div>

            <div className="flex items-center gap-2">
              {/* use onCheckedChange to trigger a callback function to update the isNonIIIT var in payload to be sent */}
              <Checkbox
                id="isNonIIIT"
                checked={formData.isNonIIIT}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isNonIIIT: Boolean(checked) }))}
              />
              <Label htmlFor="isNonIIIT">
                Non-IIIT Participant
              </Label>
            </div>

        </CardContent>

        <CardFooter>
          <div className="space-y-3">
             <Button onClick={handleRegister} disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
             </Button>
             <div>
                Already have an account? <Link to="/login">Log in</Link>
             </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
