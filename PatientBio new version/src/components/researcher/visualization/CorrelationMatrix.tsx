import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CorrelationMatrixProps {
  patientData: any[];
  variables: { value: string; label: string }[];
  onSelectPair: (v1: string, v2: string) => void;
}

function pearsonR(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function getColor(r: number): string {
  const abs = Math.abs(r);
  if (r > 0) return `hsl(142 ${Math.round(abs * 70)}% ${90 - Math.round(abs * 40)}%)`;
  return `hsl(0 ${Math.round(abs * 70)}% ${90 - Math.round(abs * 40)}%)`;
}

export const CorrelationMatrix = ({ patientData, variables, onSelectPair }: CorrelationMatrixProps) => {
  const matrix = variables.map((v1) => {
    const vals1 = patientData.map((p) => parseFloat(p[v1.value])).filter((v) => !isNaN(v));
    return variables.map((v2) => {
      const vals2 = patientData.map((p) => parseFloat(p[v2.value])).filter((v) => !isNaN(v));
      return pearsonR(vals1, vals2);
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Correlation Matrix</CardTitle>
        <CardDescription>Click a cell to view its scatter plot</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2" />
                {variables.map((v) => (
                  <th key={v.value} className="p-2 text-muted-foreground font-medium truncate max-w-[80px]">
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variables.map((v1, i) => (
                <tr key={v1.value}>
                  <td className="p-2 text-muted-foreground font-medium truncate max-w-[80px]">{v1.label}</td>
                  {variables.map((v2, j) => (
                    <td
                      key={v2.value}
                      className="p-2 text-center cursor-pointer hover:ring-2 hover:ring-primary rounded transition-all font-semibold"
                      style={{ backgroundColor: getColor(matrix[i][j]) }}
                      onClick={() => i !== j && onSelectPair(v1.value, v2.value)}
                    >
                      {matrix[i][j].toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
