'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
interface Props { data: { date: string; count: number }[]; period: string }
const OLIVE = '#8B9A35'
export default function OrdersChart({ data, period }: Props) {
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const yMax = Math.ceil(maxVal * 1.3)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top:5, right:5, left:0, bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, yMax]} tick={{ fontSize:10, fill:'var(--text-muted)' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={(val) => [val??0,'Commandes']} />
        <Line type="monotone" dataKey="count" stroke={OLIVE} strokeWidth={2} dot={{ fill:OLIVE, r:3, strokeWidth:0 }} activeDot={{ r:5, fill:OLIVE }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
