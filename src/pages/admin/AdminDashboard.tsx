import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CaseManager from "@/components/admin/CaseManager";
import SessionManager from "@/components/admin/SessionManager";
import ParticipantList from "@/components/admin/ParticipantList";
import ResultsViewer from "@/components/admin/ResultsViewer";
import { LogOut, BookOpen, Users, Radio, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const [sessionExamMode, setSessionExamMode] = useState("oral_board");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" title="Buka halaman ujian peserta (scan QR / mulai ujian)">
            <Link to="/exam">
              <PlayCircle className="h-4 w-4" /> Ke Halaman Ujian
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto min-w-0 p-4 sm:p-6">
        <Tabs defaultValue="cases">
          <TabsList className="mb-6 grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="cases" className="gap-0 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
              <BookOpen className="hidden h-4 w-4 sm:block" /> Exam Details
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-0 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
              <Users className="hidden h-4 w-4 sm:block" /> Participants
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-0 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
              <Radio className="hidden h-4 w-4 sm:block" /> Sessions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cases">
            <CaseManager />
          </TabsContent>
          <TabsContent value="participants">
            <ParticipantList />
          </TabsContent>
          <TabsContent value="sessions">
            <div className="space-y-6">
              <Tabs value={sessionExamMode} onValueChange={setSessionExamMode}>
                <TabsList>
                  <TabsTrigger value="oral_board">Oral Board</TabsTrigger>
                  <TabsTrigger value="panel_exam">Panel</TabsTrigger>
                </TabsList>
              </Tabs>
              <SessionManager examMode={sessionExamMode} />
              <ResultsViewer examMode={sessionExamMode} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
