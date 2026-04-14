import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Mail, MessageSquare, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  sent: "bg-green-100 text-green-700",
};

const campaignTypes = ["All", "Product Launch", "Promo Weekend", "Newsletter", "Storytelling", "Abandoned Cart", "Welcome Series", "Announcement"];
const languages = ["All", "it", "en", "both"];
const statuses = ["All", "draft", "approved", "sent"];

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filterType, setFilterType] = useState("All");
  const [filterLang, setFilterLang] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      setCampaigns(data || []);
    };
    load();
  }, []);

  const filtered = campaigns.filter((c) => {
    if (filterType !== "All" && c.type !== filterType) return false;
    if (filterLang !== "All" && c.language !== filterLang) return false;
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your email & WhatsApp marketing copy</p>
        </div>
        <Button asChild>
          <Link to="/new-campaign">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {campaignTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {languages.map((l) => <SelectItem key={l} value={l}>{l === "All" ? "All Languages" : l.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statuses.map((s) => <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No campaigns yet</p>
          <p className="text-sm">Create your first campaign to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/campaign/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{c.name}</h3>
                    <Badge className={statusColors[c.status] || ""} variant="secondary">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded">{c.type}</span>
                    <span>{c.language?.toUpperCase()}</span>
                    <span>•</span>
                    <span>{c.framework}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</div>
                    <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> WhatsApp</div>
                    <span className="ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
