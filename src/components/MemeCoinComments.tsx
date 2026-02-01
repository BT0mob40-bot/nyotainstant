import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  is_approved?: boolean;
  is_admin_post?: boolean;
  user_name?: string;
  profiles?: {
    email: string;
  };
}

interface MemeCoinCommentsProps {
  memeCoinId: string;
}

export function MemeCoinComments({ memeCoinId }: MemeCoinCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();

    // Subscribe to real-time comment updates
    const channel = supabase
      .channel(`comments-${memeCoinId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meme_coin_comments',
          filter: `meme_coin_id=eq.${memeCoinId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memeCoinId]);

  const fetchComments = async () => {
    try {
      // Fetch all comments, but we will filter in memory or rely on RLS if we set it up.
      // Since we want to show "Pending" to the author, we need to fetch their own unapproved ones too.
      // The simplest way without complex RLS for now is to fetch all and filter in client if RLS allows.
      // But we set RLS to only allow approved or own. So simple select is fine.
      const { data, error } = await supabase
        .from('meme_coin_comments')
        .select('*')
        .eq('meme_coin_id', memeCoinId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const commentsWithProfiles = data.map(comment => ({
          ...comment,
          profiles: profileMap.get(comment.user_id),
        }));
        
        // Filter: Show if approved OR if it belongs to current user (so they see pending)
        // Admin logic should ideally be here too but for public page, we just show approved + own.
        // Assuming backend RLS handles security, but we do frontend filtering for UX.
        const visibleComments = commentsWithProfiles.filter(c => 
          c.is_approved || (user && c.user_id === user.id)
        );
        
        setComments(visibleComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to post comments',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: 'Empty comment',
        description: 'Please write something',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('meme_coin_comments').insert({
        meme_coin_id: memeCoinId,
        user_id: user.id,
        comment: newComment.trim(),
        is_approved: false, // Default to false, require admin approval
      });

      if (error) throw error;

      setNewComment('');
      toast({
        title: 'Comment submitted! 📝',
        description: 'Comment submitted successfully.',
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Failed to post comment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('meme_coin_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed',
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Failed to delete comment',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <CardTitle>Community ({comments.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment input */}
        <div className="space-y-2">
          <Textarea
            placeholder={user ? "Share your thoughts..." : "Login to comment"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!user || submitting}
            className="resize-none"
            rows={3}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!user || submitting || !newComment.trim()}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </>
            )}
          </Button>
        </div>

        {/* Comments list */}
        <div className="space-y-4 mt-6">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 rounded-lg bg-muted/50 space-y-2 relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {comment.user_name ? comment.user_name[0].toUpperCase() : (comment.profiles?.email?.[0].toUpperCase() || '?')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                        {comment.user_name || comment.profiles?.email?.split('@')[0] || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(comment.created_at)}
                    </p>
                  </div>
                </div>
                {user && user.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm pl-10">{comment.comment}</p>
            </div>
          ))}

          {!loading && comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
