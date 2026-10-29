<?php

namespace App\Http\Controllers;

use App\Models\TimeEntry;
use App\Models\CaseModel;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class TimeEntryController extends Controller
{
    // public function index(Request $request)
    // {
    //     if (!Auth::user()->can('manage-time-entries')) {
    //         return redirect()->back()->with('error', __('Permission Denied.'));
    //     }

    //     $query = TimeEntry::with(['case', 'user', 'creator'])->where(function ($q) {
    //         if (Auth::user()->can('manage-any-time-entries')) {
    //             $q->whereIn('created_by', getCompanyAndUsersId());
    //         } elseif (Auth::user()->can('manage-own-time-entries')) {
    //             $q->where('created_by', Auth::id())
    //                     ->orWhereHas('case.client', function ($clientQuery) {
    //                         $clientQuery->where('user_id', Auth::id());
    //                     })
    //                     ->orWhereHas('case.teamMembers', function ($teamQuery) {
    //                         $teamQuery->where('user_id', Auth::id());
    //                     });
    //         } else {
    //             $q->whereRaw('1 = 0');
    //         }
    //     });

    //     // Handle search
    //     if ($request->has('search') && !empty($request->search)) {
    //         $query->where(function ($q) use ($request) {
    //             $q->where('description', 'like', '%' . $request->search . '%')
    //                 ->orWhere('entry_id', 'like', '%' . $request->search . '%')
    //                 ->orWhere('notes', 'like', '%' . $request->search . '%')
    //                 ->orWhereHas('user', function ($userQuery) use ($request) {
    //                     $userQuery->where('name', 'like', '%' . $request->search . '%');
    //                 })
    //                 ->orWhereHas('case', function ($caseQuery) use ($request) {
    //                     $caseQuery->where('case_id', 'like', '%' . $request->search . '%')
    //                         ->orWhere('title', 'like', '%' . $request->search . '%');
    //                 });
    //         });
    //     }

    //     if ($request->filled('case_id') && $request->case_id !== '_empty_') {
    //         $query->where('case_id', $request->case_id);
    //     }

    //     if ($request->filled('user_id') && $request->user_id !== '_empty_') {
    //         $query->where('user_id', $request->user_id);
    //     }

    //     if ($request->filled('status') && $request->status !== '_empty_') {
    //         $allowedStatuses = ['draft', 'submitted', 'approved', 'billed'];
    //         if (in_array($request->status, $allowedStatuses)) {
    //             $query->where('status', $request->status);
    //         }
    //     }

    //     if ($request->filled('is_billable') && $request->is_billable !== '_empty_') {
    //         $query->where('is_billable', $request->is_billable === '1');
    //     }

    //     if ($request->filled('date_from')) {
    //         $query->whereDate('entry_date', '>=', $request->date_from);
    //     }

    //     if ($request->filled('date_to')) {
    //         $query->whereDate('entry_date', '<=', $request->date_to);
    //     }

    //     $allowedSortFields = ['entry_id', 'entry_date', 'created_at'];
    //     $sortField = $request->input('sort_field', 'created_at');
    //     $sortDirection = $request->input('sort_direction', 'desc');

    //     if (!in_array($sortField, $allowedSortFields)) {
    //         $sortField = 'created_at';
    //     }

    //     $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

    //     $query->orderBy($sortField, $sortDirection);

    //     $perPage = $request->input('per_page', 10);
    //     if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
    //         $perPage = 10;
    //     }

    //     $timeEntries = $query->paginate($perPage)->withQueryString();

    //     $caseQuery = CaseModel::with(['teamMembers.user:id,name'])
    //         ->where(function ($q) {
    //             if (Auth::user()->can('manage-any-cases')) {
    //                 $q->whereIn('created_by', getCompanyAndUsersId());
    //             } elseif (Auth::user()->can('manage-own-cases')) {
    //                 $q->where('created_by', Auth::id())
    //                     ->orWhereHas('client', function ($clientQuery) {
    //                         $clientQuery->where('user_id', Auth::id());
    //                     })
    //                     ->orWhereHas('teamMembers', function ($teamQuery) {
    //                         $teamQuery->where('user_id', Auth::id());
    //                     });
    //             } else {
    //                 $q->whereRaw('1 = 0');
    //             }
    //         });
    //     $allCases = (clone $caseQuery)->with(['teamMembers' => fn($q) => $q->active()->with('user')])->get(['id', 'case_id', 'title']);
    //     $cases = (clone $caseQuery)->active()->with(['teamMembers' => fn($q) => $q->active()->with('user')])->get(['id', 'case_id', 'title']);

    //     $allUsers = $allCases->pluck('teamMembers')->flatten()
    //         ->filter(function ($teamMember) {
    //             $user = $teamMember->user;
    //             if (!$user) return false;
    //             if (Auth::user()->can('manage-any-case-team-members')) {
    //                 $hasAccess = in_array($teamMember->created_by, getCompanyAndUsersId());
    //             } elseif (Auth::user()->can('manage-own-case-team-members')) {
    //                 $hasAccess = $teamMember->created_by === Auth::id()
    //                     || optional($teamMember->user)->created_by === Auth::id()
    //                     || $teamMember->user_id === Auth::id();
    //             } else {
    //                 $hasAccess = false;
    //             }
    //             return $hasAccess && $user->type !== 'company';
    //         })
    //         ->map(fn($tm) => ['id' => $tm->user->id, 'name' => $tm->user->name])
    //         ->unique('id')
    //         ->values();

    //     return Inertia::render('billing/time-entries/index', [
    //         'timeEntries' => $timeEntries,
    //         'cases' => $cases,
    //         'allCases' => $allCases,
    //         'allUsers' => $allUsers,
    //         'filters' => $request->only(['search', 'case_id', 'user_id', 'status', 'is_billable', 'date_from', 'date_to', 'sort_field', 'sort_direction', 'per_page', 'page']),
    //     ]);
    // }

    // public function monthlyView(Request $request)
    // {
    //     if (!Auth::user()->can('manage-time-entries')) {
    //         return redirect()->back()->with('error', __('Permission Denied.'));
    //     }

    //     $currentMonth = (int) $request->input('month', now()->month);
    //     $currentYear  = (int) $request->input('year',  now()->year);

    //     $startOfMonth = Carbon::create($currentYear, $currentMonth, 1)->startOfDay();
    //     $endOfMonth   = $startOfMonth->copy()->endOfMonth();
    //     $daysInMonth  = $startOfMonth->daysInMonth;

    //     // Build day headers (1 … daysInMonth)
    //     $dayHeaders = [];
    //     for ($d = 1; $d <= $daysInMonth; $d++) {
    //         $date = Carbon::create($currentYear, $currentMonth, $d);
    //         $dayHeaders[] = [
    //             'day'        => $d,
    //             'day_name'   => $date->format('D'),
    //             'date'       => $date->toDateString(),
    //         ];
    //     }

    //     // Month / year option lists
    //     $monthOptions = collect(range(1, 12))->map(fn($m) => [
    //         'value' => (string) $m,
    //         'label' => Carbon::create(null, $m, 1)->format('F'),
    //     ])->values()->all();

    //     $systemYear = now()->year;
    //     $yearOptions = collect(range($systemYear - 2, $systemYear + 1))->map(fn($y) => [
    //         'value' => (string) $y,
    //         'label' => (string) $y,
    //     ]);

    //     // ── User scope: only users who are active team members of accessible cases ──
    //     $caseScope = function ($q) {
    //         if (Auth::user()->can('manage-any-cases')) {
    //             $q->whereIn('created_by', getCompanyAndUsersId());
    //         } elseif (Auth::user()->can('manage-own-cases')) {
    //             $q->where('created_by', Auth::id())
    //                 ->orWhereHas('client', fn($c) => $c->where('user_id', Auth::id()))
    //                 ->orWhereHas('teamMembers', fn($t) => $t->where('user_id', Auth::id()));
    //         } else {
    //             $q->whereRaw('1 = 0');
    //         }
    //     };

    //     // Collect user IDs from case team members — mirror CaseTeamMemberController permission logic
    //     $caseTeamMemberUserIds = \App\Models\CaseTeamMember::query()
    //         ->where(function ($q) {
    //             if (Auth::user()->can('manage-any-case-team-members')) {
    //                 $q->whereIn('created_by', getCompanyAndUsersId())
    //                     ->orWhereHas('case', fn($c) => $c->whereIn('created_by', getCompanyAndUsersId()));
    //             } elseif (Auth::user()->can('manage-own-case-team-members')) {
    //                 $q->where('created_by', Auth::id())
    //                     ->orWhere('user_id', Auth::id())
    //                     ->orWhereHas('case', fn($c) => $c->where('created_by', Auth::id()));
    //             } else {
    //                 $q->whereRaw('1 = 0');
    //             }
    //         })
    //         ->where('status', 'active')
    //         ->with('user:id,name,type,status')
    //         ->get()
    //         ->filter(
    //             fn($tm) => $tm->user
    //                 && $tm->user->type !== 'company'
    //                 && $tm->user->status === 'active'
    //                 && $tm->status === 'active'
    //         )
    //         ->pluck('user_id')
    //         ->unique()
    //         ->values()
    //         ->all();


    //     $userQuery = User::whereIn('id', $caseTeamMemberUserIds)
    //         ->orderBy('name');

    //     if ($request->filled('user_id') && $request->user_id !== 'all') {
    //         $userQuery->where('id', $request->user_id);
    //     }

    //     $perPage = (int) $request->input('per_page', 10);
    //     if ($perPage < 1 || $perPage > 100) $perPage = 10;

    //     $usersPaginated = (clone $userQuery)->paginate($perPage)->withQueryString();

    //     // Case filter for cells
    //     $filterCaseId = ($request->filled('case_id') && $request->case_id !== 'all')
    //         ? $request->case_id : null;

    //     $canManageAny = Auth::user()->can('manage-any-time-entries');
    //     $canManageOwn = Auth::user()->can('manage-own-time-entries');
    //     $authId       = Auth::id();
    //     $companyIds   = getCompanyAndUsersId();
    //     $dateFrom     = $startOfMonth->toDateString();
    //     $dateTo       = $endOfMonth->toDateString();

    //     $filterStatus     = ($request->filled('status') && $request->status !== '_empty_') ? $request->status : null;
    //     $filterIsBillable = ($request->filled('is_billable') && $request->is_billable !== '_empty_') ? $request->is_billable : null;

    //     // Fetch all relevant entries for the paginated users in one query
    //     $userIds    = $usersPaginated->pluck('id')->all();
    //     $search = $request->filled('search') ? trim($request->search) : null;
    //     $entriesRaw = TimeEntry::with(['user:id,name', 'case:id,case_id,title'])
    //         ->whereIn('user_id', $userIds)
    //         ->whereBetween('entry_date', [$dateFrom, $dateTo])
    //         ->when($filterCaseId, fn($q) => $q->where('case_id', $filterCaseId))
    //         ->when($filterStatus, fn($q) => $q->where('status', $filterStatus))
    //         ->when($filterIsBillable !== null, fn($q) => $q->where('is_billable', $filterIsBillable === '1'))
    //         ->when($search, fn($q) => $q->where(function ($s) use ($search) {
    //             $s->where('description', 'like', '%' . $search . '%')
    //                 ->orWhere('entry_id', 'like', '%' . $search . '%')
    //                 ->orWhere('notes', 'like', '%' . $search . '%')
    //                 ->orWhereHas('case', fn($c) => $c->where('title', 'like', '%' . $search . '%')
    //                     ->orWhere('case_id', 'like', '%' . $search . '%'));
    //         }))
    //         ->where(function ($q) use ($canManageAny, $canManageOwn, $authId, $companyIds) {
    //             if ($canManageAny) {
    //                 $q->whereIn('created_by', $companyIds);
    //             } elseif ($canManageOwn) {
    //                 $q->where(fn($s) => $s->where('created_by', $authId)->orWhere('user_id', $authId));
    //             } else {
    //                 $q->whereRaw('1 = 0');
    //             }
    //         })
    //         ->get(['id', 'entry_id', 'case_id', 'user_id', 'entry_date', 'hours', 'status', 'is_billable', 'description', 'notes', 'start_time', 'end_time', 'billable_rate']);

    //     // Index entries by [user_id][day]
    //     $entriesByUser = [];
    //     foreach ($entriesRaw as $entry) {
    //         $day = (int) Carbon::parse($entry->entry_date)->format('j');
    //         $entriesByUser[$entry->user_id][$day][] = $entry;
    //     }

    //     // Build userRows
    //     $userRowsData = $usersPaginated->getCollection()->map(function ($user) use ($dayHeaders, $entriesByUser, $currentYear, $currentMonth) {
    //         $lastEntryDate = TimeEntry::where('user_id', $user->id)->max('entry_date');

    //         $days = collect($dayHeaders)->map(function ($header) use ($user, $entriesByUser, $lastEntryDate, $currentYear, $currentMonth) {
    //             $d        = $header['day'];
    //             $date     = Carbon::create($currentYear, $currentMonth, $d);
    //             $isFuture = $date->gt($lastEntryDate);

    //             $entries = $entriesByUser[$user->id][$d] ?? [];

    //             $totalHours = collect($entries)->sum('hours');
    //             $entryIds   = collect($entries)->pluck('id')->all();

    //             $statuses   = collect($entries)->pluck('status')->unique()->values()->all();
    //             $cellStatus = count($entries) === 0
    //                 ? ($isFuture ? 'future' : 'empty')
    //                 : (count($statuses) === 1 ? $statuses[0] : 'mixed');

    //             return [
    //                 'day'         => $d,
    //                 'date'        => $header['date'],
    //                 'is_future'   => $isFuture,
    //                 'total_hours' => $totalHours > 0 ? round($totalHours, 2) : null,
    //                 'entry_count' => count($entries),
    //                 'status'      => $cellStatus,
    //                 'entry_ids'   => $entryIds,
    //                 'entry_id'    => count($entryIds) === 1 ? $entryIds[0] : null,
    //                 'entries'     => collect($entries)->map(fn($e) => [
    //                     'id'            => $e->id,
    //                     'entry_id'      => $e->entry_id,
    //                     'hours'         => $e->hours,
    //                     'status'        => $e->status,
    //                     'is_billable'   => $e->is_billable,
    //                     'description'   => $e->description,
    //                     'notes'         => $e->notes,
    //                     'entry_date'    => $e->entry_date,
    //                     'start_time'    => $e->getRawOriginal('start_time') ? Carbon::parse($e->getRawOriginal('start_time'))->format('H:i') : null,
    //                     'end_time'      => $e->getRawOriginal('end_time')   ? Carbon::parse($e->getRawOriginal('end_time'))->format('H:i')   : null,
    //                     'billable_rate' => $e->billable_rate,
    //                     'user'          => $e->user ? ['id' => $e->user->id, 'name' => $e->user->name] : null,
    //                     'case'          => $e->case ? ['id' => $e->case->id, 'case_id' => $e->case->case_id, 'title' => $e->case->title] : null,
    //                 ])->values()->all(),
    //             ];
    //         })->values()->all();

    //         $totalHoursMonth = collect($days)->sum('total_hours');
    //         $billedHours = 0;
    //         if (!empty($entriesByUser[$user->id])) {
    //             foreach ($entriesByUser[$user->id] as $dayEntries) {
    //                 foreach ($dayEntries as $e) {
    //                     if ($e->status === 'billed') $billedHours += $e->hours;
    //                 }
    //             }
    //         }

    //         return [
    //             'id'                => $user->id,
    //             'name'              => $user->name,
    //             'avatar'              => $user->avatar,
    //             'role'              => $user?->roles()?->first()?->label,
    //             'days'              => $days,
    //             'total_hours_month' => round($totalHoursMonth, 2),
    //             'billed_hours'      => round($billedHours, 2),
    //         ];
    //     });

    //     $userRows = $usersPaginated->setCollection($userRowsData);

    //     $allCasesForFilter = CaseModel::where($caseScope)->orderBy('case_id')->get(['id', 'case_id', 'title']);
    //     $allUsersForFilter = User::whereIn('id', $caseTeamMemberUserIds)->orderBy('name')->get(['id', 'name']);
    //     $casesForForm      = CaseModel::where($caseScope)->active()
    //         ->with(['teamMembers' => fn($q) => $q->active()->with('user:id,name')])
    //         ->get(['id', 'case_id', 'title']);

    //     return Inertia::render('billing/time-entries/monthly', [
    //         'userRows'     => $userRows,
    //         'dayHeaders'   => $dayHeaders,
    //         'monthOptions' => $monthOptions,
    //         'yearOptions'  => $yearOptions,
    //         'currentMonth' => $currentMonth,
    //         'currentYear'  => $currentYear,
    //         'allCases'     => $allCasesForFilter,
    //         'cases'        => $casesForForm,
    //         'allUsers'     => $allUsersForFilter,
    //         'filters'      => $request->only([
    //             'search',
    //             'case_id',
    //             'user_id',
    //             'status',
    //             'is_billable',
    //             'month',
    //             'year',
    //             'per_page',
    //             'page',
    //         ]),
    //     ]);
    // }

    public function weeklyView(Request $request)
    {
        TimeEntry::whereIn("user_id", getCompanyAndUsersId(Auth::user()->id))
            ->where('status', 'draft')
            ->update(['status' => 'submitted']);

        if (!Auth::user()->can('manage-time-entries')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        // Resolve the week start (Monday) from the request or default to current week
        if ($request->filled('week_start') && Carbon::hasFormat($request->input('week_start'), 'Y-m-d')) {
            $startOfWeek = Carbon::parse($request->input('week_start'))->startOfWeek(Carbon::MONDAY)->startOfDay();
        } else {
            $startOfWeek = now()->startOfWeek(Carbon::MONDAY)->startOfDay();
        }

        $endOfWeek = $startOfWeek->copy()->addDays(6)->endOfDay();

        // Build 7 day headers (Mon … Sun)
        $dayHeaders = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $startOfWeek->copy()->addDays($i);
            $dayHeaders[] = [
                'day'      => (int) $date->format('j'),
                'day_name' => $date->format('D'),
                'date'     => $date->toDateString(),
            ];
        }

        $caseScope = function ($q) {
            if (Auth::user()->can('manage-any-cases')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-cases')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('client', fn($c) => $c->where('user_id', Auth::id()))
                    ->orWhereHas('teamMembers', fn($t) => $t->where('user_id', Auth::id()));
            } else {
                $q->whereRaw('1 = 0');
            }
        };

        $caseTeamMemberUserIds = \App\Models\CaseTeamMember::query()
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-case-team-members')) {
                    $q->whereIn('created_by', getCompanyAndUsersId())
                        ->orWhereHas('case', fn($c) => $c->whereIn('created_by', getCompanyAndUsersId()));
                } elseif (Auth::user()->can('manage-own-case-team-members')) {
                    $q->where('created_by', Auth::id())
                        ->orWhere('user_id', Auth::id())
                        ->orWhereHas(
                            'case',
                            fn($c) =>
                            $c->where('created_by', Auth::id())
                                ->orWhereHas('client', fn($c) =>
                                $c->where('user_id', Auth::id()))
                        );
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->where('status', 'active')
            ->with('user:id,name,type,status')
            ->get()
            ->filter(
                fn($tm) => $tm->user
                    && $tm->user->type !== 'company'
                    && $tm->user->status === 'active'
                    && $tm->status === 'active'
            )
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        $userQuery = User::whereIn('id', $caseTeamMemberUserIds)->orderBy('name');

        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $userQuery->where('id', $request->user_id);
        }

        $usersPaginated = (clone $userQuery)->paginate(10)->withQueryString();

        $filterCaseId     = ($request->filled('case_id') && $request->case_id !== 'all') ? $request->case_id : null;
        $filterStatus     = ($request->filled('status') && $request->status !== '_empty_') ? $request->status : null;
        $filterIsBillable = ($request->filled('is_billable') && $request->is_billable !== '_empty_') ? $request->is_billable : null;
        $canManageAny     = Auth::user()->can('manage-any-time-entries');
        $canManageOwn     = Auth::user()->can('manage-own-time-entries');
        $authId           = Auth::id();
        $companyIds       = getCompanyAndUsersId();
        $dateFrom         = $startOfWeek->toDateString();
        $dateTo           = $endOfWeek->toDateString();
        $search           = $request->filled('search') ? trim($request->search) : null;
        $userIds          = $usersPaginated->pluck('id')->all();

        $entriesRaw = TimeEntry::with(['user:id,name', 'case:id,case_id,title', 'invoice'])
            ->whereIn('user_id', $userIds)
            ->whereBetween('entry_date', [$dateFrom, $dateTo])
            ->when($filterCaseId, fn($q) => $q->where('case_id', $filterCaseId))
            ->when($filterStatus, fn($q) => $q->where('status', $filterStatus))
            ->when($filterIsBillable !== null, fn($q) => $q->where('is_billable', $filterIsBillable === '1'))
            ->when($search, fn($q) => $q->where(function ($s) use ($search) {
                $s->where('description', 'like', '%' . $search . '%')
                    ->orWhere('entry_id', 'like', '%' . $search . '%')
                    ->orWhere('notes', 'like', '%' . $search . '%')
                    ->orWhereHas('case', fn($c) => $c->where('title', 'like', '%' . $search . '%')
                        ->orWhere('case_id', 'like', '%' . $search . '%'));
            }))
            ->where(function ($q) use ($canManageAny, $canManageOwn, $authId, $companyIds) {
                if ($canManageAny) {
                    $q->whereIn('created_by', $companyIds);
                } elseif ($canManageOwn) {
                    $q->where(fn($s) => $s->where('created_by', $authId)->orWhere('user_id', $authId)
                        ->orWhereHas(
                            'case',
                            fn($c) =>
                            $c->where('created_by', Auth::id())
                                ->orWhereHas('client', fn($c) =>
                                $c->where('user_id', Auth::id()))
                        ));
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->get(['id', 'entry_id', 'case_id', 'user_id', 'entry_date', 'hours', 'status', 'is_billable', 'description', 'notes', 'start_time', 'end_time', 'billable_rate', 'invoice_id']);

        // Index entries by [user_id][date string]
        $entriesByUser = [];
        foreach ($entriesRaw as $entry) {
            $dateKey = Carbon::parse($entry->entry_date)->toDateString();
            $entriesByUser[$entry->user_id][$dateKey][] = $entry;
        }

        $now = now()->toDateString();

        $userRowsData = $usersPaginated->getCollection()->map(function ($user) use ($dayHeaders, $entriesByUser, $now) {
            $lastEntryDate = TimeEntry::where('user_id', $user->id)->max('entry_date');

            $days = collect($dayHeaders)->map(function ($header) use ($user, $entriesByUser, $lastEntryDate, $now) {
                $dateKey  = $header['date'];
                $isFuture = $dateKey > ($lastEntryDate ?? $now);

                $entries    = $entriesByUser[$user->id][$dateKey] ?? [];
                $totalHours = collect($entries)->sum('hours');
                $entryIds   = collect($entries)->pluck('id')->all();
                $statuses   = collect($entries)->pluck('status')->unique()->values()->all();
                $cellStatus = count($entries) === 0
                    ? ($isFuture ? 'future' : 'empty')
                    : (count($statuses) === 1 ? $statuses[0] : 'mixed');

                return [
                    'day'         => $header['day'],
                    'date'        => $dateKey,
                    'day_name'    => $header['day_name'],
                    'is_today'    => $dateKey === $now,
                    'is_future'   => $isFuture,
                    'total_hours' => $totalHours > 0 ? round($totalHours, 2) : null,
                    'entry_count' => count($entries),
                    'status'      => $cellStatus,
                    'entry_ids'   => $entryIds,
                    'entry_id'    => count($entryIds) === 1 ? $entryIds[0] : null,
                    'entries'     => collect($entries)->map(fn($e) => [
                        'id'            => $e->id,
                        'invoice_number'=> $e?->invoice?->invoice_number,
                        'entry_id'      => $e->entry_id,
                        'hours'         => $e->hours,
                        'status'        => $e->status,
                        'is_billable'   => $e->is_billable,
                        'description'   => $e->description,
                        'notes'         => $e->notes,
                        'entry_date'    => $e->entry_date,
                        'start_time'    => $e->getRawOriginal('start_time') ? Carbon::parse($e->getRawOriginal('start_time'))->format('H:i') : null,
                        'end_time'      => $e->getRawOriginal('end_time')   ? Carbon::parse($e->getRawOriginal('end_time'))->format('H:i')   : null,
                        'billable_rate' => $e->billable_rate,
                        'user'          => $e->user ? ['id' => $e->user->id, 'name' => $e->user->name] : null,
                        'case'          => $e->case ? ['id' => $e->case->id, 'case_id' => $e->case->case_id, 'title' => $e->case->title] : null,
                    ])->values()->all(),
                ];
            })->values()->all();

            $totalHoursWeek = collect($days)->sum('total_hours');

            return [
                'id'               => $user->id,
                'name'             => $user->name,
                'email'             => $user->email,
                'avatar'           => $user->avatar,
                'role'             => $user?->roles()?->first()?->label,
                'days'             => $days,
                'total_hours_week' => round($totalHoursWeek, 2),
            ];
        });

        $userRows = $usersPaginated->setCollection($userRowsData);

        $allCasesForFilter = CaseModel::where($caseScope)->orderBy('case_id')->get(['id', 'case_id', 'title']);
        $allUsersForFilter = User::whereIn('id', $caseTeamMemberUserIds)->orderBy('name')->get(['id', 'name']);
        $casesForForm      = CaseModel::where($caseScope)->active()
            ->with(['teamMembers' => fn($q) => $q->active()->with('user:id,name')])
            ->get(['id', 'case_id', 'title']);

        $actualCurrentWeekStart = now()->startOfWeek(Carbon::MONDAY)->toDateString();

        return Inertia::render('billing/time-entries/weekly', [
            'userRows'         => $userRows,
            'dayHeaders'       => $dayHeaders,
            'weekStart'        => $startOfWeek->toDateString(),
            'weekEnd'          => $endOfWeek->toDateString(),
            'currentWeekStart' => $actualCurrentWeekStart,
            'monthLabel'       => $startOfWeek->addDays(3)->format('F Y'),
            'currentMonthNum'  => (int) $startOfWeek->addDays(3)->format('n'),
            'currentYearNum'   => (int) $startOfWeek->addDays(3)->format('Y'),
            'allCases'        => $allCasesForFilter,
            'cases'           => $casesForForm,
            'allUsers'        => $allUsersForFilter,
            'filters'         => $request->only([
                'search',
                'case_id',
                'user_id',
                'status',
                'is_billable',
                'week_start',
                'per_page',
                'page',
            ]),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-time-entries')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        try {
            $validated = $request->validate([
                'case_id' => 'nullable|integer',
                'user_id' => 'required|exists:users,id',
                'description' => 'required|string',
                'hours' => 'required|numeric|min:0.1|max:24',
                'billable_rate' => 'nullable|numeric|min:0',
                'is_billable' => 'boolean',
                'entry_date' => 'required|date',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i|after:start_time',
                'notes' => 'nullable|string',
            ]);

            // If user has manage-own-time-entries permission, restrict to their own user_id
            if (Auth::user()->can('manage-own-time-entries') && !Auth::user()->can('manage-any-time-entries')) {
                $validated['user_id'] = Auth::id();
            }

            // Convert is_billable to boolean
            if (isset($validated['is_billable'])) {
                $validated['is_billable'] = $validated['is_billable'] === '1' || $validated['is_billable'] === 1 || $validated['is_billable'] === true;
            } else {
                $validated['is_billable'] = true; // Default to billable
            }

            $validated['created_by'] = Auth::id();
            $validated['status'] = 'submitted';
            $validated['is_billable'] = $validated['is_billable'] ?? true;

            // Handle empty case_id or 'none' value (convert to null)
            if (empty($validated['case_id']) || $validated['case_id'] === 'none') {
                $validated['case_id'] = null;
            }

            // Verify case belongs to the current user's company if provided and get client_id
            if (!empty($validated['case_id'])) {
                $case = CaseModel::where('id', $validated['case_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                if (!$case) {
                    return redirect()->back()->with('error', 'Invalid case selected.');
                }

                // Set client_id from case
                $validated['client_id'] = $case->client_id;
            }

            // Verify user belongs to the current user's company
            $user = User::where('id', $validated['user_id'])
                ->whereIn('id', getCompanyAndUsersId())
                ->first();

            if (!$user) {
                return redirect()->back()->with('error', 'Invalid user selected.');
            }

            TimeEntry::create($validated);

            return redirect()->back()->with('success', 'Time sheet created successfully.');
        } catch (\Exception $e) {
            \Log::error('Time sheet creation failed: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->with('error', 'Failed to create time sheet: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $timeEntryId)
    {
        if (!Auth::user()->can('edit-time-entries')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $timeEntry = TimeEntry::where('id', $timeEntryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-time-entries')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-time-entries')) {
                    $q->where(function ($subQ) {
                        $subQ->where('created_by', Auth::id())
                            ->orWhere('user_id', Auth::id());
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$timeEntry) {
            return redirect()->back()->with('error', 'Time sheet not found.');
        }

        $validated = $request->validate([
            'case_id' => 'nullable|integer',
            'user_id' => 'required|exists:users,id',
            'description' => 'required|string',
            'hours' => 'required|numeric|min:0.1|max:24',
            'billable_rate' => 'nullable|numeric|min:0',
            'is_billable' => 'boolean',
            'entry_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'notes' => 'nullable|string',
        ]);

        // If user has manage-own-time-entries permission, restrict to their own user_id
        if (Auth::user()->can('manage-own-time-entries') && !Auth::user()->can('manage-any-time-entries')) {
            $validated['user_id'] = Auth::id();
        }

        // Convert is_billable to boolean
        if (isset($validated['is_billable'])) {
            $validated['is_billable'] = $validated['is_billable'] === '1' || $validated['is_billable'] === 1 || $validated['is_billable'] === true;
        } else {
            $validated['is_billable'] = true; // Default to billable
        }

        // Handle empty case_id or 'none' value (convert to null)
        if (empty($validated['case_id']) || $validated['case_id'] === 'none') {
            $validated['case_id'] = null;
        }

        // Verify case belongs to the current user's company if provided and get client_id
        if (!empty($validated['case_id'])) {
            $case = CaseModel::where('id', $validated['case_id'])
                ->whereIn('created_by', getCompanyAndUsersId())
                ->first();

            if (!$case) {
                return redirect()->back()->with('error', 'Invalid case selected.');
            }

            // Set client_id from case
            $validated['client_id'] = $case->client_id;
        }

        // Verify user belongs to the current user's company
        $user = User::where('id', $validated['user_id'])
            ->whereIn('id', getCompanyAndUsersId())
            ->first();

        if (!$user) {
            return redirect()->back()->with('error', 'Invalid user selected.');
        }

        $timeEntry->update($validated);

        return redirect()->back()->with('success', 'Time sheet updated successfully.');
    }

    public function destroy($timeEntryId)
    {
        if (!Auth::user()->can('delete-time-entries')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $timeEntry = TimeEntry::where('id', $timeEntryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-time-entries')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-time-entries')) {
                    $q->where(function ($subQ) {
                        $subQ->where('created_by', Auth::id())
                            ->orWhere('user_id', Auth::id());
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$timeEntry) {
            return redirect()->back()->with('error', 'Time sheet not found.');
        }

        // Prevent deletion of billed entries
        if ($timeEntry->status === 'billed') {
            return redirect()->back()->with('error', 'Cannot delete billed time sheet.');
        }

        $timeEntry->delete();

        return redirect()->back()->with('success', 'Time sheet deleted successfully.');
    }

    public function approve($timeEntryId)
    {
        if (!Auth::user()->can('approve-time-entries')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $timeEntry = TimeEntry::where('id', $timeEntryId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-time-entries')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-time-entries')) {
                    $q->where(function ($subQ) {
                        $subQ->where('created_by', Auth::id())
                            ->orWhere('user_id', Auth::id());
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$timeEntry) {
            return redirect()->back()->with('error', 'Time sheet not found.');
        }

        if ($timeEntry->status !== 'submitted') {
            return redirect()->back()->with('error', 'Only submitted time sheet can be approved.');
        }

        $timeEntry->update(['status' => 'approved']);

        return redirect()->back()->with('success', 'Time sheet approved successfully.');
    }

    public function startTimer(Request $request)
    {
        $validated = $request->validate([
            'case_id' => 'nullable|exists:cases,id',
            'description' => 'required|string',
        ]);

        // Handle empty case_id (convert to null) and get client_id
        $clientId = null;
        if (empty($validated['case_id'])) {
            $validated['case_id'] = null;
        } else {
            $case = CaseModel::find($validated['case_id']);
            if ($case) {
                $clientId = $case->client_id;
            }
        }

        // Check if user already has a running timer
        $runningTimer = TimeEntry::where('user_id', Auth::id())
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereNull('end_time')
            ->whereNotNull('start_time')
            ->where('status', 'draft')
            ->first();

        if ($runningTimer) {
            return redirect()->back()->with('error', 'You already have a running timer. Please stop it first.');
        }

        $timeEntry = TimeEntry::create([
            'case_id' => $validated['case_id'],
            'client_id' => $clientId,
            'user_id' => Auth::id(),
            'description' => $validated['description'],
            'hours' => 0,
            'is_billable' => true,
            'entry_date' => now()->toDateString(),
            'start_time' => now()->format('H:i'),
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'Timer started successfully.');
    }

    public function getCaseUsers($caseId)
    {
        if (!Auth::user()->can('manage-time-entries')) {
            return response()->json(['error' => __('Permission Denied.')], 403);
        }

        $case = CaseModel::where('id', $caseId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->with(['teamMembers' => fn($q) => $q->active()->with('user')])
            ->first();

        if (!$case) {
            return response()->json([]);
        }

        $users = $case->teamMembers
            ->filter(function ($teamMember) {
                $user = $teamMember->user;

                if (!$user) {
                    return false;
                }

                // Role-based access
                if (Auth::user()->can('manage-any-case-team-members')) {
                    $hasAccess = in_array($teamMember->created_by, getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-case-team-members')) {
                    $hasAccess =
                        $teamMember->created_by === Auth::id()
                        || optional($teamMember->user)->created_by === Auth::id()
                        || $teamMember->user_id === Auth::id();
                } else {
                    $hasAccess = false;
                }

                return $hasAccess
                    && $user->type !== 'company'
                    && $user->status === 'active';
            })
            ->map(fn($teamMember) => [
                'value' => $teamMember->user->id,
                'label' => $teamMember->user->name,
            ])
            ->values();

        return response()->json($users);
    }
}
