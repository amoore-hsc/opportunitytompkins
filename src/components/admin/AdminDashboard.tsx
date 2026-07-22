import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Users,
  Briefcase,
  GraduationCap,
  XCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

interface DashboardMetrics {
  totalApplications: number;
  positionsFilled: number;
  listingsRemoved: number;
  activeListings: number;
  educationListings: number;
  volunteerListings: number;
  applicationsByOrg: Array<{ name: string; count: number }>;
  applicationsByRole: Array<{ name: string; count: number }>;
  applicationsByOpportunity: Array<{ title: string; orgName: string; count: number }>;
  positionsFilledByOrg: Array<{ name: string; positions: number; listings: number }>;
  removalReasons: Array<{ reason: string; count: number }>;
}

interface AdminDashboardProps {
  metrics: DashboardMetrics;
}

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`rounded-full p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </CardContent>
  </Card>
);

const BreakdownTable = ({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center text-muted-foreground py-6"
              >
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const AdminDashboard = ({ metrics }: AdminDashboardProps) => {
  const {
    totalApplications,
    positionsFilled,
    listingsRemoved,
    activeListings,
    educationListings,
    volunteerListings,
    applicationsByOrg,
    applicationsByRole,
    applicationsByOpportunity,
    positionsFilledByOrg,
    removalReasons,
  } = metrics;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total Applications"
          value={totalApplications}
          icon={ClipboardList}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Positions Filled"
          value={positionsFilled}
          icon={CheckCircle2}
          colorClass="bg-success/10 text-success"
        />
        <SummaryCard
          title="Listings Removed"
          value={listingsRemoved}
          icon={XCircle}
          colorClass="bg-destructive/10 text-destructive"
        />
        <SummaryCard
          title="Active Listings"
          value={activeListings}
          icon={TrendingUp}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="Education Listings"
          value={educationListings}
          icon={GraduationCap}
          colorClass="bg-highlight/10 text-highlight"
        />
        <SummaryCard
          title="Volunteer Listings"
          value={volunteerListings}
          icon={Users}
          colorClass="bg-success/10 text-success"
        />
      </div>

      <div className="space-y-6">
        <BreakdownTable
          title="Applications by Organization"
          headers={["Organization", "Applications"]}
          rows={applicationsByOrg.map((org) => (
            <TableRow key={org.name}>
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {org.count}
                </span>
              </TableCell>
            </TableRow>
          ))}
        />

        <BreakdownTable
          title="Applications by Role Classification"
          headers={["Classification", "Applications"]}
          rows={applicationsByRole.map((role) => (
            <TableRow key={role.name}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full bg-[#e67e22]/10 px-3 py-1 text-sm font-semibold text-[#e67e22]">
                  {role.count}
                </span>
              </TableCell>
            </TableRow>
          ))}
        />

        <BreakdownTable
          title="Applications by Opportunity"
          headers={["Opportunity", "Organization", "Applications"]}
          rows={applicationsByOpportunity.map((opp) => (
            <TableRow key={`${opp.title}-${opp.orgName}`}>
              <TableCell className="font-medium">{opp.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {opp.orgName}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {opp.count}
                </span>
              </TableCell>
            </TableRow>
          ))}
        />

        <BreakdownTable
          title="Positions Filled by Organization"
          headers={["Organization", "Listings Closed", "Positions Filled"]}
          rows={positionsFilledByOrg.map((org) => (
            <TableRow key={org.name}>
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell className="text-center text-muted-foreground">
                {org.listings}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                  {org.positions}
                </span>
              </TableCell>
            </TableRow>
          ))}
        />

        <BreakdownTable
          title="Removal Reasons"
          headers={["Reason", "Count"]}
          rows={removalReasons.map((item) => (
            <TableRow key={item.reason}>
              <TableCell className="font-medium">{item.reason}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                  {item.count}
                </span>
              </TableCell>
            </TableRow>
          ))}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
