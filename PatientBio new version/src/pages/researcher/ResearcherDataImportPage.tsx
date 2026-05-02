import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearcherDataImportDialog } from "@/components/researcher/ResearcherDataImportDialog";
import { FileText, Users, BookOpen, Upload, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ResearcherDataImportPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import research studies, participant cohorts, and study notes from CSV files
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Data Migration Made Easy</AlertTitle>
        <AlertDescription>
          Transfer your existing research data to Patient Bio. Supported formats include research study definitions,
          participant lists, and historical study findings. Download templates for the correct format.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Research Studies</CardTitle>
                <CardDescription>Study definitions & budgets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import study titles, disease categories, token budgets, and per-patient offers. 
              Creates broadcast requests for patient recruitment.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <strong>Required fields:</strong> title, disease_category, token_budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Participant Cohorts</CardTitle>
                <CardDescription>Patient lists for studies</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import patient lists by email or GHPID. Creates data access requests and notifies 
              patients for approval. Unmatched patients are logged as warnings.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <strong>Required fields:</strong> patient_email or patient_ghpid
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Study Notes</CardTitle>
                <CardDescription>Findings & publications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import historical research notes, methodology descriptions, findings, sample sizes, 
              and publication links for your studies.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <strong>Required fields:</strong> study_title
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Start Import
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import your research data. Download templates for the correct format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResearcherDataImportDialog />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Research Studies</h4>
            <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
              title,disease_category,token_budget,tokens_per_patient,description,status
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">Participant Cohorts</h4>
            <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
              patient_email,patient_ghpid,disease_category,reason,token_offer
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">Study Notes</h4>
            <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
              study_title,methodology,findings,sample_size,is_published,publication_url
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the Download Template button in the import dialog to get a pre-formatted CSV with sample data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearcherDataImportPage;
