import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/utils/helpers';

interface Props {
    timelines: any[];
    permissions: string[];
    onAction: (action: string, item: any) => void;
    weekStart: string; // ISO YYYY-MM-DD (Monday)
    onWeekChange: (weekStart: string) => void;
    monthLabel: string;
    monthNum: number;
    yearNum: number;
    caseId: number | string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateOnly(str: string): Date {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function shiftWeek(dateStr: string, dir: 'prev' | 'next'): string {
    const d = toDateOnly(dateStr);
    d.setDate(d.getDate() + (dir === 'next' ? 7 : -7));
    return toDateStr(d);
}

export default function CaseTimelineCalendar({ timelines, permissions, onAction, weekStart, onWeekChange, monthLabel, monthNum, yearNum, caseId }: Props) {
    const { t } = useTranslation();

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const days = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => {
            const d = toDateOnly(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        }),
        [weekStart]
    );

    const goToday = () => {
        const d = new Date(today);
        const dow = d.getDay(); // 0=Sun
        d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
        onWeekChange(toDateStr(d));
    };

    const sorted = useMemo(() =>
        [...timelines]
            .filter(e => e.event_date)
            .sort((a, b) => toDateOnly(a.event_date).getTime() - toDateOnly(b.event_date).getTime()),
        [timelines]
    );

    const todayStr = toDateStr(today);

    const navigateMonth = (direction: 'prev' | 'next') => {
        let year = yearNum;
        let month = monthNum - 1 + (direction === 'next' ? 1 : -1);
        if (month > 11) { month = 0; year++; }
        if (month < 0)  { month = 11; year--; }
        const firstDay = new Date(year, month, 1);
        const dow = firstDay.getDay();
        const toMonday = dow === 0 ? -6 : 1 - dow;
        let monday = new Date(year, month, 1 + toMonday);
        if (monday.getMonth() !== month) monday = new Date(year, month, 1 + toMonday + 7);
        const y = monday.getFullYear();
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const d = String(monday.getDate()).padStart(2, '0');
        router.get(route('cases.show', caseId), { timeline_week_start: `${y}-${m}-${d}` }, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="bg-white dark:bg-gray-900 mb-4 overflow-hidden">
            {/* ── Month switcher ── */}
            <div className="mb-4 flex justify-center items-center gap-3">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center">
                    {monthLabel}
                </h2>
                <button
                    onClick={() => navigateMonth('next')}
                    className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* ── Legend ── */}
            <div className='border border-gray-200 rounded-lg border bg-white dark:bg-gray-900 shadow-sm mb-2'>
                <div className="flex items-center gap-5 px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Circle className="h-3 w-3 text-gray-300" />
                        {t('Pending')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {t('Completed')}
                    </span>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="border border-gray-200 rounded-lg border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-gray-200 dark:border-gray-800">
                            {/* Event label column */}
                            <TableHead className="sticky left-0 z-20 bg-white dark:bg-gray-900 text-center px-4 py-3.5 border-r border-gray-200 dark:border-gray-800 min-w-[176px] w-[176px] ">
                                <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('Event')}
                                </span>
                            </TableHead>

                            {/* Day columns */}
                            {days.map((d, idx) => {
                                const isToday = toDateStr(d) === todayStr;
                                return (
                                    <TableHead
                                        key={toDateStr(d)}
                                        className="text-center min-w-[100px] px-2 py-3 border-x border-gray-200 dark:border-gray-800"
                                    >
                                        {idx === 0 ? (
                                            <div className="relative flex items-center justify-center">
                                                <button
                                                    onClick={() => onWeekChange(shiftWeek(weekStart, 'prev'))}
                                                    className="absolute left-0 p-2 rounded transition-colors cursor-pointer"
                                                >
                                                    <ChevronLeft className="h-4 w-4 text-gray-500" />
                                                </button>
                                                <div>
                                                    <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">{DAY_NAMES[idx]}</div>
                                                    <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>{d.getDate()}</div>
                                                </div>
                                            </div>
                                        ) : idx === 6 ? (
                                            <div className="relative flex items-center justify-center">
                                                <div>
                                                    <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">{DAY_NAMES[idx]}</div>
                                                    <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>{d.getDate()}</div>
                                                </div>
                                                <button
                                                    onClick={() => onWeekChange(shiftWeek(weekStart, 'next'))}
                                                    className="absolute right-0 p-2 rounded transition-colors cursor-pointer"
                                                >
                                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-[10px] font-semibold tracking-widest mb-1.5 text-gray-400 dark:text-gray-500">{DAY_NAMES[idx]}</div>
                                                <div className={`text-sm font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : ''}`}>{d.getDate()}</div>
                                            </>
                                        )}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Clock className="h-10 w-10 opacity-30" />
                                        <p className="text-sm">{t('No timeline events this week.')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sorted.map((item) => {
                            const eventDateStr = item.event_date.slice(0, 10);
                            const completed = item.is_completed;

                            return (
                                <TableRow
                                    key={item.id}
                                    className="group transition-colors border border-gray-200 dark:border-gray-800 hover:bg-white"
                                >
                                    {/* Event label — sticky left */}
                                    <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 border-r border-gray-200 dark:border-gray-800 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {completed
                                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                                : <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                                            }
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{item.title}</p>
                                                {item.event_type && (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.event_type.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Day cells */}
                                    {days.map((d) => {
                                        const dStr = toDateStr(d);
                                        const hasEvent = dStr === eventDateStr;

                                        return (
                                            <TableCell
                                                key={dStr}
                                                className={cn(
                                                    'px-1 py-1 text-center border-x border-gray-200 dark:border-gray-800',
                                                )}
                                            >
                                                {hasEvent && (
                                                    <button
                                                        className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-150  cursor-pointer active:scale-95`}
                                                        onClick={() =>
                                                            hasPermission(permissions, 'view-case-timelines') &&
                                                            onAction('view', item)
                                                        }
                                                    >
                                                        <span
                                                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: `${item.event_type?.color}20`,
                                                                color: item.event_type?.color,
                                                                boxShadow: `inset 0 0 0 1px ${hexToRgba(item.event_type?.color, 0.2)}`,
                                                            }}
                                                        >
                                                            {item.event_type?.name || item.title}
                                                        </span>
                                                    </button>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
