import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";

const categories = ["All", "terminology", "tone", "cta", "product naming", "structure", "other"];

export default function Corrections() {
  const [corrections, setCorrections] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterLang, setFilterLang] = useState("All");

  const load = async () => {
    const { data } = await supabase.from("corrections").select("*").order("created_at", { ascending: false });
    setCorrections(data || []);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("corrections").update({ is_active: !current }).eq("id", id);
    setCorrections((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
    toast.success(!current ? "Correction activated" : "Correction deactivated");
  };

  const remove = async (id: string) => {
    await supabase.from("corrections").delete().eq("id", id);
    setCorrections((prev) => prev.filter((c) => c.id !== id));
    toast.success("Correction deleted");
  };

  const filtered = corrections.filter((c) => {
    if (filterCat !== "All" && c.category !== filterCat) return false;
    if (filterLang !== "All" && c.language !== filterLang) return false;
    if (search && !c.original_text.toLowerCase().includes(search.toLowerCase()) && !c.corrected_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Corrections Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {corrections.filter((c) => c.is_active).length} active corrections shaping your AI copy
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search corrections..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Languages</SelectItem>
            <SelectItem value="it">IT</SelectItem>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="all">Universal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Original</TableHead>
              <TableHead className="w-[30%]">Correction</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No corrections found
                </TableCell>
              </TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                <TableCell className="font-mono text-xs">{c.original_text}</TableCell>
                <TableCell className="font-mono text-xs">{c.corrected_text}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{c.category}</Badge></TableCell>
                <TableCell className="text-xs uppercase">{c.language}</TableCell>
                <TableCell>
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
