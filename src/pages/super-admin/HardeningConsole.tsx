import { useState } from "react";
import {
  useMigrationDrafts,
  useCronJobs,
  useGenerateHardeningDrafts,
  useUpdateDraftStatus,
  type MigrationDraft,
} from "@/hooks/useGovernanceHardening";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";

const sevColor = (s: string) =>
  s === "critical"
    ? "destructive"
    : s === "warn"
      ? "secondary"
      : ("outline" as const);

export default function HardeningConsole() {
  const drafts = useMigrationDrafts();
  const cron = useCronJobs();
  const generate = useGenerateHardeningDrafts();
  const update = useUpdateDraftStatus();
  const [selected, setSelected] = useState<MigrationDraft | null>(null);
  const [notes, setNotes] = useState("");

  const pending = (drafts.data ?? []).filter((d) => d.status === "pending");
  const reviewed = (drafts.data ?? []).filter((d) => d.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hardening & Automation</h1>
          <p className="text-sm text-muted-foreground">
            Generated migration drafts and scheduled governance jobs. Drafts are
            never auto-applied — review and run via SQL editor.
          </p>
        </div>
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate drafts
        </Button>
      </div>

      <Tabs defaultValue="drafts">
        <TabsList>
          <TabsTrigger value="drafts">
            Drafts {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="cron">Cron jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts">
          <Card>
            <CardHeader>
              <CardTitle>Pending recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {drafts.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending drafts. Click "Generate drafts" to scan.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sevColor(d.severity)}>
                            {d.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(d.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(d);
                              setNotes("");
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed">
          <Card>
            <CardHeader>
              <CardTitle>Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewed.map((d) => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(d)}
                      >
                        <TableCell>{d.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              d.status === "applied" ? "default" : "secondary"
                            }
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.reviewed_at
                            ? new Date(d.reviewed_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.reviewer_notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cron">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {cron.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cron.data ?? []).map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-mono text-xs">
                          {j.job_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {j.schedule}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Clock className="inline mr-1 h-3 w-3" />
                          {j.last_run_at
                            ? new Date(j.last_run_at).toLocaleString()
                            : "never"}
                        </TableCell>
                        <TableCell>
                          {j.last_status === "ok" ? (
                            <Badge variant="default">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> ok
                            </Badge>
                          ) : j.last_status ? (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />{" "}
                              {j.last_status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {j.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[640px] sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Badge variant="outline">{selected.category}</Badge>
                  <Badge variant={sevColor(selected.severity)}>
                    {selected.severity}
                  </Badge>
                  <Badge>{selected.status}</Badge>
                </div>
                {selected.rationale && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Rationale</h4>
                    <p className="text-sm text-muted-foreground">
                      {selected.rationale}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-1">SQL draft</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {selected.sql_draft}
                  </pre>
                </div>
                {selected.status === "pending" && (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">
                        Reviewer notes
                      </h4>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Why are you applying or dismissing?"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() =>
                          update.mutate(
                            {
                              id: selected.id,
                              status: "dismissed",
                              notes,
                            },
                            { onSuccess: () => setSelected(null) },
                          )
                        }
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() =>
                          update.mutate(
                            {
                              id: selected.id,
                              status: "applied",
                              notes,
                            },
                            { onSuccess: () => setSelected(null) },
                          )
                        }
                      >
                        Mark applied
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
