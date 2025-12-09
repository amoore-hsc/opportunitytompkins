import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Opportunity {
  id: string;
  type: string;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
  active: boolean;
}

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const { toast } = useToast();

  const ADMIN_PASSWORD = "snap2024admin"; // Simple password for demo

  useEffect(() => {
    if (authenticated) {
      fetchAllOpportunities();
    }
  }, [authenticated]);

  const fetchAllOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });
      fetchAllOpportunities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingOpportunity) return;

    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          type: editingOpportunity.type,
          description: editingOpportunity.description,
          location: editingOpportunity.location,
          on_bus_route: editingOpportunity.on_bus_route,
          hours_available: editingOpportunity.hours_available,
          days_times_available: editingOpportunity.days_times_available,
          additional_requirements: editingOpportunity.additional_requirements,
          org_name: editingOpportunity.org_name,
          org_email: editingOpportunity.org_email,
          org_phone: editingOpportunity.org_phone,
          active: editingOpportunity.active,
        })
        .eq("id", editingOpportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      setEditingOpportunity(null);
      fetchAllOpportunities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border shadow-sm">
          <div className="mb-6 text-center">
            <Handshake className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Manage Opportunities</h2>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium capitalize">{opp.type}</TableCell>
                  <TableCell>{opp.org_name}</TableCell>
                  <TableCell>{opp.location}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      opp.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {opp.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOpportunity(opp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Opportunity</DialogTitle>
                          <DialogDescription>
                            Make changes to the opportunity details
                          </DialogDescription>
                        </DialogHeader>
                        {editingOpportunity && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select
                                value={editingOpportunity.type}
                                onValueChange={(value) =>
                                  setEditingOpportunity({ ...editingOpportunity, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="volunteer">Volunteer</SelectItem>
                                  <SelectItem value="education">Education & Training</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={editingOpportunity.description}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, description: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Location</Label>
                              <Input
                                value={editingOpportunity.location}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, location: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingOpportunity.on_bus_route}
                                onCheckedChange={(checked) =>
                                  setEditingOpportunity({ ...editingOpportunity, on_bus_route: checked === true })
                                }
                              />
                              <Label>On Bus Route</Label>
                            </div>
                            <div className="space-y-2">
                              <Label>Hours Available</Label>
                              <Input
                                value={editingOpportunity.hours_available}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, hours_available: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Days/Times Available</Label>
                              <Input
                                value={editingOpportunity.days_times_available}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, days_times_available: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Organization Name</Label>
                              <Input
                                value={editingOpportunity.org_name}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, org_name: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingOpportunity.active}
                                onCheckedChange={(checked) =>
                                  setEditingOpportunity({ ...editingOpportunity, active: checked === true })
                                }
                              />
                              <Label>Active</Label>
                            </div>
                            <Button onClick={handleUpdate} className="w-full">
                              Save Changes
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(opp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Admin;