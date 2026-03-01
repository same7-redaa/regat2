import React from 'react';

// ===== Base Skeleton pulse block =====
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
    );
}

// ===== Table row skeleton =====
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
    return (
        <tr className="border-b border-slate-100">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className={`h-4 ${i === 0 ? 'w-6' : i === 1 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
                </td>
            ))}
        </tr>
    );
}

// ===== Card skeleton for Home stats =====
export function StatCardSkeleton() {
    return (
        <div className="bg-white border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

// ===== Order list row skeleton =====
export function OrderRowSkeleton() {
    return (
        <tr className="border-b border-slate-100">
            <td className="px-3 py-3"><Skeleton className="h-4 w-4 rounded" /></td>
            <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
            <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
            <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
            <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
            <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
            <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
            <td className="px-3 py-3 flex gap-2">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
            </td>
        </tr>
    );
}

// ===== Spinning loader icon =====
export function Spinner({ size = 'sm', color = 'white' }: { size?: 'sm' | 'md' | 'lg'; color?: 'white' | 'sky' | 'slate' }) {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
    const colorClass = color === 'white' ? 'text-white' : color === 'sky' ? 'text-sky-600' : 'text-slate-500';
    return (
        <svg
            className={`animate-spin ${sizeClass} ${colorClass}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

// ===== Full page skeleton for list pages =====
export function PageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header bar */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-9 w-32 rounded" />
            </div>
            {/* Search / filter bar */}
            <div className="flex gap-3">
                <Skeleton className="h-9 flex-1 rounded" />
                <Skeleton className="h-9 w-24 rounded" />
            </div>
            {/* Table */}
            <div className="bg-white border border-slate-200 rounded overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-4 py-3 text-right">
                                    <Skeleton className="h-4 w-16" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <React.Fragment key={i}>
                                <TableRowSkeleton cols={cols} />
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
