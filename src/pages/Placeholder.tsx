import { AlertCircle } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-sky-50 text-sky-500 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <p className="text-slate-500 max-w-md">
          هذه الصفحة قيد التطوير حالياً. سيتم إضافة الميزات الخاصة بها قريباً.
        </p>
      </div>
    </div>
  );
}
