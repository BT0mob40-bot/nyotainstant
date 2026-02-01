import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Shield, ShieldOff, Search, Crown, User, Edit, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface UserProfile {
  id: string;
  email: string | null;
  created_at: string;
  balance: number;
}

interface UserRole {
  user_id: string;
  role: string;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newBalance, setNewBalance] = useState<string>('');
  const [resetRequests, setResetRequests] = useState<Array<{ id: string; user_email: string; requested_at: string; status: string }>>([]);
  const [loadingResets, setLoadingResets] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchResetRequests();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,created_at,balance')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (error) {
      console.error('Error fetching roles:', error);
    } else {
      setRoles(data || []);
    }
  };

  const fetchResetRequests = async () => {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('id, user_email, requested_at, status')
      .order('requested_at', { ascending: false });
    if (error) {
      console.error('Error fetching reset requests:', error);
    } else {
      setResetRequests(data || []);
    }
    setLoadingResets(false);
  };

  const getUserRole = (userId: string): string => {
    const userRole = roles.find(r => r.user_id === userId);
    return userRole?.role || 'user';
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    try {
      if (currentRole === 'admin') {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Admin role removed');
      } else {
        // Check if user already has a role entry
        const existingRole = roles.find(r => r.user_id === userId);
        
        if (existingRole) {
          // Update existing role
          const { error } = await supabase
            .from('user_roles')
            .update({ role: 'admin' })
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // Insert new admin role
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'admin' });

          if (error) throw error;
        }
        toast.success('Admin role granted');
      }
      
      fetchRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const openAdjustBalance = (user: UserProfile) => {
    setEditingUser(user);
    setNewBalance(user.balance?.toString() || '0');
  };

  const handleAdjustBalance = async () => {
    if (!editingUser) return;
    const amount = parseFloat(newBalance);
    if (Number.isNaN(amount)) {
      toast.error('Enter a valid amount');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ balance: amount })
      .eq('id', editingUser.id);
    if (error) {
      toast.error('Failed to update balance');
      return;
    }
    toast.success('Balance updated');
    setEditingUser(null);
    setNewBalance('');
    fetchUsers();
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = roles.filter(r => r.role === 'admin').length;
  const userCount = users.length - adminCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage users and their roles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Crown className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{userCount}</p>
                <p className="text-sm text-muted-foreground">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No users found matching your search' : 'No users yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const role = getUserRole(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email || 'N/A'}</TableCell>
                      <TableCell className="font-mono">{(user.balance || 0).toLocaleString()} KES</TableCell>
                      <TableCell>
                        {role === 'admin' ? (
                          <Badge className="bg-amber-500">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <User className="h-3 w-3 mr-1" />
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={role === 'admin' ? 'destructive' : 'outline'}
                            onClick={() => toggleAdminRole(user.id, role)}
                          >
                            {role === 'admin' ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAdjustBalance(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Adjust Balance
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Reset Requests</CardTitle>
          <CardDescription>Plain text requests submitted by users</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingResets ? (
            <div className="text-center py-8">Loading requests...</div>
          ) : resetRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No requests</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resetRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      {r.user_email}
                    </TableCell>
                    <TableCell>{new Date(r.requested_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">{editingUser?.email}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newBalance">New Balance (KES)</Label>
              <Input id="newBalance" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleAdjustBalance}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
