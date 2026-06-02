import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx';

export default function AuthCard({ title, description, children }) {
  return (
    <Card className="border-white/10 bg-white/[0.06]">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-2 text-3xl font-black tracking-tight text-blue-500">M-ECAL</div>
        <CardTitle className="text-xl font-bold text-white">{title}</CardTitle>
        {description && <CardDescription className="text-slate-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
