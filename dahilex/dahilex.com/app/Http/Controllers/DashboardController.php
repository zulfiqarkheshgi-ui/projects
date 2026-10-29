<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PlanRequest;
use App\Models\CaseModel;
use App\Models\Message;
use App\Models\Task;
use App\Models\Hearing;
use App\Models\Client;
use App\Models\TimeEntry;
use App\Models\Coupon;
use App\Models\Payment;
use App\Models\Expense;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Super admin always gets dashboard
        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return $this->renderDashboard();
        }

        // Check if user has any permission (means they have access to some module)
        if ($user->getAllPermissions()->count() > 0) {
            return $this->renderDashboard();
        }

        // If no permissions, redirect to first available page
        return $this->redirectToFirstAvailablePage();
    }

    public function redirectToFirstAvailablePage()
    {
        $user = auth()->user();

        // Define available routes with their permissions
        $routes = [
            ['route' => 'users.index', 'permission' => 'manage-users'],
            ['route' => 'roles.index', 'permission' => 'manage-roles'],

            ['route' => 'plans.index', 'permission' => 'manage-plans'],
            ['route' => 'referral.index', 'permission' => 'manage-referral'],
            ['route' => 'settings.index', 'permission' => 'manage-settings'],
        ];

        // Find first available route
        foreach ($routes as $routeData) {
            if ($user->hasPermissionTo($routeData['permission'])) {
                return redirect()->route($routeData['route']);
            }
        }

        // If no permissions found, logout user
        auth()->logout();
        return redirect()->route('login')->with('error', __('No access permissions found.'));
    }

    private function renderDashboard()
    {
        $user = auth()->user();

        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return $this->renderSuperAdminDashboard();
        } else if ($user->type === 'company') {
            return $this->renderCompanyDashboard();
        } else if ($user->type === 'client') {
            return $this->renderClientDashboard();
        } else {
            return $this->renderTeamMemberDashboard();
        }
    }

    private function renderSuperAdminDashboard()
    {
        $revenueYear = (int) request('revenueYear', now()->year);
        $companiesYear = (int) request('companiesYear', now()->year);

        // Get system-wide statistics
        $totalCompanies = User::where('type', 'company')->count();
        $totalActivePlanCompanies = User::where('type', 'company')->where('plan_is_active', '1')->count();
        $totalUsers = User::where('type', '!=', 'superadmin')->where('type', '!=', 'super admin')->count();
        $totalRevenue = PlanOrder::where('status', 'approved')->sum('final_price') ?? 0;
        $activePlans = Plan::where('is_plan_enable', 'on')->count();
        $pendingRequests = PlanRequest::where('status', 'pending')->count();
        $activeCoupons = Coupon::where('status', true)->count();

        // Monthly revenue for all 12 months of selected year
        if (isDemo()) {
            $demoRevenue = [4200, 5800, 3900, 7100, 6400, 8900, 7600, 9200, 8100, 10500, 9800, 12400];
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $demoRevenue[$i - 1],
                ];
            }
        } else {
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $revenue = PlanOrder::where('status', 'approved')
                    ->whereMonth('processed_at', $i)
                    ->whereYear('processed_at', $revenueYear)
                    ->sum('final_price') ?? 0;
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $revenue,
                ];
            }
        }

        // Monthly companies registered for selected year
        if (isDemo()) {
            $demoCompanies = [3, 5, 4, 7, 6, 9, 8, 11, 7, 13, 10, 15];
            $monthlyCompanies = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyCompanies[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'count' => $demoCompanies[$i - 1],
                ];
            }
        } else {
            $monthlyCompanies = [];
            for ($i = 1; $i <= 12; $i++) {
                $count = User::where('type', 'company')
                    ->whereMonth('created_at', $i)
                    ->whereYear('created_at', $companiesYear)
                    ->count();
                $monthlyCompanies[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $companiesYear)),
                    'count' => $count,
                ];
            }
        }

        $firstCompanyYear = User::where('type', 'company')->min('created_at')
            ? (int) date('Y', strtotime(User::where('type', 'company')->min('created_at')))
            : now()->year;
        $availableCompanyYears = range(now()->year, $firstCompanyYear);

        // Calculate monthly growth
        $monthlyGrowth = 0;

        if (IsDemo()) {
            $monthlyGrowth = 55;
        } else {
            $currentMonthCompanies = User::where('type', 'company')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();
            $previousMonthCompanies = User::where('type', 'company')
                ->whereMonth('created_at', now()->subMonth()->month)
                ->whereYear('created_at', now()->subMonth()->year)
                ->count();
            $monthlyGrowth = $previousMonthCompanies > 0
                ? round((($currentMonthCompanies - $previousMonthCompanies) / $previousMonthCompanies) * 100, 1)
                : ($currentMonthCompanies > 0 ? 100 : 0);
        }

        $availableYears = range(now()->year + 2, now()->year - 4);

        $dashboardData = [
            'stats' => [
                'totalCompanies' => $totalCompanies,
                'totalActivePlanCompanies' => $totalActivePlanCompanies,
                'totalUsers' => $totalUsers,
                'totalRevenue' => $totalRevenue,
                'activePlans' => $activePlans,
                'pendingRequests' => $pendingRequests,
                'monthlyGrowth' => $monthlyGrowth,
                'activeCoupons' => $activeCoupons,
            ],
            'recentActivity' => User::where('type', 'company')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(['id', 'name', 'email', 'avatar', 'created_at'])
                ->map(function ($company) {
                    return [
                        'id' => $company->id,
                        'name' => $company->name,
                        'email' => $company->email,
                        'avatar' => $company->avatar,
                        'registered_at' => $company->created_at->diffForHumans(),
                        'status' => 'active',
                    ];
                }),
            'monthlyRevenue' => $monthlyRevenue,
            'revenueYear' => $revenueYear,
            'availableYears' => $availableYears,
            'monthlyCompanies' => $monthlyCompanies,
            'availableCompanyYears' => $availableCompanyYears,
            'topPlans' => Plan::withCount('users')
                ->orderBy('users_count', 'desc')
                ->take(3)
                ->get()
                ->map(function ($plan) {
                    return [
                        'name' => $plan->name,
                        'subscribers' => $plan->users_count,
                        'revenue' => $plan->users_count * $plan->price,
                    ];
                }),
        ];

        return Inertia::render('superadmin/dashboard', props: [
            'dashboardData' => $dashboardData,
        ]);
    }

    private function renderCompanyDashboard()
    {
        $user = auth()->user();
        $companyAndUserIds = getCompanyAndUsersId();
        $revenueYear = (int) request('revenueYear', now()->year);
        // Get legal management statistics
        $totalCases = CaseModel::whereIn('created_by', $companyAndUserIds)->count();
        $activeCases = CaseModel::whereIn('created_by', $companyAndUserIds)
            ->where(function ($query) {
                $query->whereHas('caseStatus', function ($q) {
                    $q->where('is_closed', false);
                })->Where('status', 'active');
            })
            ->count();
        $totalClients = Client::whereIn('created_by', $companyAndUserIds)->count();
        $activeClients = Client::whereIn('created_by', $companyAndUserIds)->where('status', 'active')->count();
        $pendingTasks = Task::whereIn('created_by', $companyAndUserIds)->where('status', 1)->count();
        $upcomingHearings = config('app.is_demo')
            ? 15 // Static count for demo (all hearings)
            : Hearing::whereIn('created_by', $companyAndUserIds)
            ->where('hearing_date', '>=', now())
            ->count();
        $unreadMessages = Message::where('company_id', auth()->id())
            ->where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->count();

        // Calculate monthly growth
        $currentMonthClients = Client::whereIn('created_by', $companyAndUserIds)
            ->whereMonth('created_at', now()->month)
            ->count();
        $previousMonthClients = Client::whereIn('created_by', $companyAndUserIds)
            ->whereMonth('created_at', now()->subMonth()->month)
            ->count();
        $monthlyGrowth = IsDemo() ? 50 : ($previousMonthClients > 0
            ? min(round((($currentMonthClients - $previousMonthClients) / $previousMonthClients) * 100, 1), 100)
            : ($currentMonthClients > 0 ? 100 : 0));

        // Cases by status
        $casesByStatus = CaseModel::whereIn('created_by', $companyAndUserIds)
            ->with('caseStatus')
            ->get()
            ->groupBy(function ($case) {
                return $case->caseStatus ? $case->caseStatus->name : ucfirst($case->status ?? 'pending');
            })
            ->map(function ($cases, $statusName) {
                $colors = ['#10b77f', '#f59e0b', '#6b7280', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#64748b'];
                static $colorIndex = 0;
                return [
                    'name' => $statusName,
                    'value' => $cases->count(),
                    'color' => $colors[$colorIndex++ % count($colors)]
                ];
            })
            ->values()
            ->toArray();

        // Recent activity
        $recentActivity = collect()
            ->merge(CaseModel::whereIn('created_by', $companyAndUserIds)->latest()->take(3)->get()->map(function ($case) {
                return [
                    'id' => $case->id,
                    'type' => 'case',
                    'title' => 'New case created',
                    'description' => $case->title,
                    'time' => $case->created_at->diffForHumans(),
                    'status' => 'success'
                ];
            }))
            ->merge(Message::where('company_id', auth()->id())->where('recipient_id', auth()->id())->latest()->take(2)->get()->map(function ($message) {
                return [
                    'id' => $message->id,
                    'type' => 'message',
                    'title' => 'New message received',
                    'description' => substr($message->content, 0, 50) . '...',
                    'time' => $message->created_at->diffForHumans(),
                    'status' => 'info'
                ];
            }))
            ->sortByDesc('time')
            ->take(5)
            ->values();

        // Upcoming hearings
        $upcomingHearingsList = config('app.is_demo')
            ? collect(getDemoUpcomingHearings())->map(function ($hearing) {
                return [
                    'id' => $hearing['id'],
                    'title' => $hearing['case_title'],
                    'court' => $hearing['court_name'],
                    'date' => \Carbon\Carbon::parse($hearing['date'])->format('M d, Y'),
                    'time' => \Carbon\Carbon::parse($hearing['time'])->format('H:i A'),
                    'type' => $hearing['hearing_type']
                ];
            })
            : Hearing::whereIn('created_by', $companyAndUserIds)
                ->where('hearing_date', '>=', now())
                ->orderBy('hearing_date')
                ->get()
                ->map(function ($hearing) {
                    return [
                        'id' => $hearing->id,
                        'title' => $hearing->title ?? 'Court Hearing',
                        'court' => $hearing->court ?? 'District Court',
                        'date' => $hearing->hearing_date->format('M d, Y'),
                        'time' => $hearing->hearing_date->format('H:i A'),
                        'type' => $hearing->hearing_type ?? 'General'
                    ];
                });

        // Recent tasks
        $recentTasks = Task::with(['taskType', 'taskStatus', 'assignedUser', 'case', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-tasks')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-tasks')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('clients.user_id', Auth::id());
                    })
                    ->orWhere('assigned_to', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })
            ->with(['assignedUser', 'taskStatus', 'case'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($task) {
                return [
                    'id'           => $task->id,
                    'task_id'      => $task->task_id,
                    'title'        => $task->title,
                    'priority'     => $task->priority,
                    'due_date'     => $task->due_date ? $task->due_date->format('Y-m-d') : null,
                    'status_name'  => $task->taskStatus?->name ?? ucfirst($task->status ?? 'pending'),
                    'status_color' => $task->taskStatus?->color ?? '#6b7280',
                    'assigned_to'  => $task->assignedUser?->name,
                    'case_title'   => $task->case?->case_title ?? $task->case?->title,
                ];
            });

        // Tasks by priority (in progress only)
        $tasksPriority = [
            [
                'priority' => 'High',
                'count' => Task::where('priority', 'high')->whereIn('created_by', $companyAndUserIds)->count(),
                'color' => '#ef4444'
            ],
            [
                'priority' => 'Medium',
                'count' => Task::where('priority', 'medium')->whereIn('created_by', $companyAndUserIds)->count(),
                'color' => '#f59e0b'
            ],
            [
                'priority' => 'Low',
                'count' => Task::where('priority', 'low')->whereIn('created_by', $companyAndUserIds)->count(),
                'color' => '#10b77f'
            ],
            [
                'priority' => 'Critical',
                'count' => Task::where('priority', 'low')->whereIn('created_by', $companyAndUserIds)->count(),
                'color' => '#dbdfddff'
            ]
        ];

        // Get user's current plan with relationship
        $user->load('plan');
        $currentPlan = $user->getCurrentPlan();
        $storageLimit = $currentPlan ? $currentPlan->storage_limit : 5; // Default 5GB if no plan

        // Calculate actual storage usage
        $documentsStorage = 0; // File size removed from documents
        $caseDocumentsStorage = 0; // File size removed from case documents
        $clientDocumentsStorage = 0; // File size removed from client documents

        $totalStorageUsed = $documentsStorage + $caseDocumentsStorage + $clientDocumentsStorage;

        // Get actual user count for the company
        $currentUsers = User::whereIn('created_by', getCompanyAndUsersId())
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'client');
            })->count();

        // Monthly revenue chart
        if (isDemo()) {
            $demoRevenue = [1200, 2100, 1800, 3200, 2800, 4100, 3600, 4800, 3900, 5200, 4700, 6100];
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $demoRevenue[$i - 1],
                ];
            }
        } else {
            $monthlyRevenue = [];
            for ($i = 1; $i <= 12; $i++) {
                $revenue = Payment::whereIn('created_by', $companyAndUserIds)
                    ->whereMonth('created_at', $i)
                    ->whereYear('created_at', $revenueYear)
                    ->sum('amount') ?? 0;
                $monthlyRevenue[] = [
                    'month' => date('F Y', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'short' => date('M', mktime(0, 0, 0, $i, 1, $revenueYear)),
                    'revenue' => (float) $revenue,
                ];
            }
        }

        $availableYears = range(now()->year - 3, now()->year + 2);

        // Calculate actual revenue from payments (most accurate)
        $totalRevenue = Payment::whereIn('created_by', $companyAndUserIds)
            ->sum('amount') ?? 0;

        // Today's time entries
        $todayTimeEntries = TimeEntry::with(['user:id,name', 'case:id,case_id,title', 'invoice'])
            ->where(function ($q) {
                if (auth()->user()->can('manage-any-time-entries')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (auth()->user()->can('manage-own-time-entries')) {
                    $q->where(fn($s) => $s->where('created_by', auth()->id())->orWhere('user_id', auth()->id())
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
            ->whereDate('entry_date', today())
            ->with(['case:id,title,case_id', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->get(['id', 'entry_id', 'case_id', 'user_id', 'description', 'hours', 'billable_rate', 'billing_rate_type', 'is_billable', 'start_time', 'end_time', 'entry_date'])
            ->map(fn($e) => [
                'id'           => $e->id,
                'entry_id'     => $e->entry_id,
                'description'  => $e->description,
                'hours'        => (float) $e->hours,
                'billable_rate' => (float) $e->billable_rate,
                'is_billable'  => (bool) $e->is_billable,
                'start_time'   => $e->start_time?->format('H:i'),
                'end_time'     => $e->end_time?->format('H:i'),
                'case_title'   => $e->case?->title,
                'case_id_str'  => $e->case?->case_id,
                'user_name'    => $e->user?->name,
                'total_amount' => (float) $e->total_amount,
            ]);

        // Today's expenses
        $todayExpensesQuery = Expense::where(function ($q) {
            if (Auth::user()->can('manage-any-expenses')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-expenses')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', fn($cq) => $cq->where('user_id', Auth::id()))
                    ->orWhereHas('case.teamMembers', fn($tq) => $tq->where('user_id', Auth::id()));
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        if (isDemo()) {
            $todayExpensesQuery->limit(5);
        } else {
            $todayExpensesQuery->whereDate('expense_date', today());
        }
        $todayExpenses = $todayExpensesQuery->with(['case:id,title,case_id', 'category:id,name'])
            ->orderBy('created_at', 'desc')
            ->get(['id', 'case_id', 'expense_category_id', 'description', 'amount', 'is_billable', 'status', 'expense_date'])
            ->map(fn($e) => [
                'id'          => $e->id,
                'description' => $e->description,
                'amount'      => (float) $e->amount,
                'is_billable' => (bool) $e->is_billable,
                'status'      => $e->status,
                'case_title'  => $e->case?->title,
                'case_id_str' => $e->case?->case_id,
                'category'    => $e->category?->name,
            ]);

        $dashboardData = [
            'stats' => [
                'totalCases' => $totalCases,
                'activeCases' => $activeCases,
                'totalClients' => $totalClients,
                'activeClients' => $activeClients,
                'currentUsers' => $currentUsers,
                'totalRevenue' => $totalRevenue,
                'monthlyGrowth' => $monthlyGrowth,
                'pendingTasks' => $pendingTasks,
                'upcomingHearings' => $upcomingHearings,
                'unreadMessages' => $unreadMessages
            ],
            'revenueYear' => $revenueYear,
            'availableYears' => $availableYears,
            'monthlyRevenue' => $monthlyRevenue,
            'recentActivity' => $recentActivity,
            'casesByStatus' => $casesByStatus,
            'upcomingHearings' => $upcomingHearingsList,
            'tasksPriority' => $tasksPriority,
            'plan' => [
                'name' => $currentPlan ? $currentPlan->name : 'Free Plan',
                'storage_limit' => $storageLimit,
                'max_users' => $currentPlan ? $currentPlan->max_users : 5,
                'max_cases' => $currentPlan ? $currentPlan->max_cases : 10,
                'max_clients' => $currentPlan ? $currentPlan->max_clients : 10,
                'price' => $currentPlan ? $currentPlan->price : 0,
                'yearly_price' => $currentPlan ? $currentPlan->yearly_price : 0,
                'is_trial' => $user->is_trial,
                'trial_expire_date' => $user->trial_expire_date,
                'plan_expire_date' => $user->plan_expire_date,
                'features' => $currentPlan ? [
                    'custom_domain' => $currentPlan->enable_custdomain === 'on',
                    'subdomain' => $currentPlan->enable_custsubdomain === 'on',
                    'pwa' => $currentPlan->pwa_business === 'on',
                    'chatgpt' => $currentPlan->enable_chatgpt === 'on',
                    'branding' => $currentPlan->enable_branding === 'on'
                ] : []
            ],
            'storage' => [
                'total_used' => round($totalStorageUsed, 2),
                'documents_used' => round($documentsStorage, 2),
                'case_documents_used' => round($caseDocumentsStorage, 2),
                'client_documents_used' => round($clientDocumentsStorage, 2),
                'limit' => $storageLimit
            ],
            'todayTimeEntries' => $todayTimeEntries,
            'todayExpenses'    => $todayExpenses,
            'recentTasks'      => $recentTasks,
        ];

        return Inertia::render('dashboard', [
            'dashboardData' => $dashboardData
        ]);
    }

    private function renderTeamMemberDashboard()
    {
        $user = auth()->user();

        // Upcoming hearings
        $upcomingHearings = config('app.is_demo')
            ? collect(getDemoUpcomingHearings())->take(5)->map(function ($hearing) {
                return [
                    'id'           => $hearing['id'],
                    'title'        => $hearing['case_title'],
                    'hearing_date' => $hearing['date'] . ' ' . $hearing['time'],
                    'hearing_time' => $hearing['time'],
                    'case'         => ['title' => $hearing['case_title']],
                    'court'        => ['name' => $hearing['court_name']],
                ];
            })
            : Hearing::with(['case', 'court'])->where(function ($q) {
                if (Auth::user()->can('manage-any-hearings')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-hearings')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        })
                        ->orWhereHas('case.teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->where('hearing_date', '>=', now())
            ->orderBy('hearing_date', 'asc')
            ->get(['id', 'title', 'hearing_date', 'hearing_time', 'case_id', 'court_id']);

        $canManageAny     = Auth::user()->can('manage-any-time-entries');
        $canManageOwn     = Auth::user()->can('manage-own-time-entries');


        $timeEntryScope = TimeEntry::with(['case'])
            ->where(function ($q) use ($canManageAny, $canManageOwn, $user) {
                if ($canManageAny) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif ($canManageOwn) {
                    $q->where(fn($s) => $s->where('created_by', $user->id)->orWhere('user_id', $user->id)
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
            });

        // My recent time entries
        $recentTimeEntries = (clone $timeEntryScope)
            ->orderBy('entry_date', 'desc')
            ->limit(5)
            ->get(['id', 'description', 'hours', 'entry_date', 'case_id']);

        $timesheets_by_status = [
            'submitted' => (float) (clone $timeEntryScope)->where('status', 'submitted')->sum('hours'),
            'approved'  => (float) (clone $timeEntryScope)->where('status', 'approved')->sum('hours'),
        ];

        $total_hours_this_month = (clone $timeEntryScope)
            ->whereMonth('entry_date', now()->month)
            ->whereYear('entry_date', now()->year)
            ->sum('hours') ?? 0;

        $expensesEntryScope = Expense::with(['case:id,title', 'category:id,name'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-expenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-expenses')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', fn($cq) => $cq->where('user_id', Auth::id()))
                        ->orWhereHas('case.teamMembers', fn($tq) => $tq->where('user_id', Auth::id()));
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
        // My recent expenses
        $myExpenses = (clone $expensesEntryScope)
            ->orderBy('expense_date', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($e) => [
                'id'           => $e->id,
                'description'  => $e->description,
                'amount'       => (float) $e->amount,
                'status'       => $e->status,
                'expense_date' => $e->expense_date?->format('Y-m-d'),
                'case_title'   => $e->case?->title,
                'category'     => $e->category?->name,
            ]);

        $expenses_by_status = [
            'pending'  => (clone $expensesEntryScope)->where('status', 'pending')->count(),
            'approved' => (clone $expensesEntryScope)->where('status', 'approved')->count(),
            'rejected' => (clone $expensesEntryScope)->where('status', 'rejected')->count(),
        ];

        $expenses_this_month =(clone $expensesEntryScope)
            ->whereMonth('expense_date', now()->month)
            ->whereYear('expense_date', now()->year)
            ->sum('amount') ?? 0;

        // Task counts by priority (for Task Priority Breakdown chart)
        $tasksQuery = Task::where(function ($q) {
            if (Auth::user()->can('manage-any-tasks')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-tasks')) {
                $q->where('created_by', Auth::id())->orWhere('assigned_to', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        $tasksByPriority = [
            'critical' => (clone $tasksQuery)->where('priority', 'critical')->count(),
            'high'     => (clone $tasksQuery)->where('priority', 'high')->count(),
            'medium'   => (clone $tasksQuery)->where('priority', 'medium')->count(),
            'low'      => (clone $tasksQuery)->where('priority', 'low')->count(),
        ];

        $totalTasks = (clone $tasksQuery)->count();

        $stats = [
            'total_expenses'        => (clone $expensesEntryScope)->count(),
            'total_expenses_amount' => (clone $expensesEntryScope)->sum('amount'),
            'expenses_this_month' => isDemo() ? (clone $expensesEntryScope)->sum('amount') : $expenses_this_month,
            'tasks_by_priority'     => $tasksByPriority,
            'total_tasks'           => $totalTasks,
            'total_hours_this_month' => $total_hours_this_month,
            'expenses_by_status'    => $expenses_by_status,
            'timesheets_by_status'  => $timesheets_by_status,
        ];

        return Inertia::render('dashboard/TeamMemberDashboard', [
            'myExpenses'        => $myExpenses,
            'upcomingHearings'  => $upcomingHearings,
            'recentTimeEntries' => $recentTimeEntries,
            'stats'             => $stats,
        ]);
    }

    private function renderClientDashboard()
    {
        $user = auth()->user();
        $client = Client::where('email', $user->email)->first();

        if (!$client) {
            return redirect()->route('login')->with('error', 'Client profile not found');
        }

        // Get cases with proper permission filtering
        $myCases = CaseModel::with(['caseStatus', 'caseType'])
            ->where(function ($q) use ($client) {
                if (Auth::user()->can('manage-any-cases')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-cases')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('client', function ($clientQuery) {
                            $clientQuery->where('user_id', Auth::id());
                        })
                        ->orWhereHas('teamMembers', function ($teamQuery) {
                            $teamQuery->where('user_id', Auth::id());
                        });
                } else {
                    $q->where('client_id', $client->id);
                }
            });

        // Get hearings with proper permission filtering
        $upcomingHearings = config('app.is_demo')
            ? collect(getDemoUpcomingHearings())->take(5)->map(function ($hearing) {
                return [
                    'id' => $hearing['id'],
                    'title' => $hearing['case_title'],
                    'hearing_date' => $hearing['date'] . ' ' . $hearing['time'],
                    'case' => ['title' => $hearing['case_title']],
                    'court' => ['name' => $hearing['court_name']]
                ];
            })
            : Hearing::with(['case', 'court'])
            ->where(function ($q) use ($client) {
                if (Auth::user()->can('manage-any-hearings')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-hearings')) {
                    $q->whereHas('case', function ($caseQuery) use ($client) {
                        $caseQuery->where('client_id', $client->id);
                    });
                } else {
                    $q->whereHas('case', function ($caseQuery) use ($client) {
                        $caseQuery->where('client_id', $client->id);
                    });
                }
            })
            ->where('hearing_date', '>=', now())
            ->get();


        $canManageAny     = Auth::user()->can('manage-any-time-entries');
        $canManageOwn     = Auth::user()->can('manage-own-time-entries');
        $authId           = Auth::id();
        $companyIds       = getCompanyAndUsersId();

        $recentTimeEntries = TimeEntry::with(['user:id,name', 'case:id,case_id,title', 'invoice'])
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
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'entry_id', 'case_id', 'user_id', 'description', 'hours', 'billable_rate', 'is_billable', 'start_time', 'end_time', 'entry_date'])
            ->map(fn($e) => [
                'id'           => $e->id,
                'description'  => $e->description,
                'hours'        => (float) $e->hours,
                'is_billable'  => (bool) $e->is_billable,
                'start_time'   => $e->start_time?->format('H:i'),
                'end_time'     => $e->end_time?->format('H:i'),
                'case_title'   => $e->case?->title,
                'user_name'    => $e->user?->name,
                'total_amount' => (float) $e->total_amount,
                'entry_date'   => $e->entry_date,
            ]);

        $recentExpenses = Expense::with(['case:id,title', 'category:id,name'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-expenses')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-expenses')) {
                    $q->where('created_by', Auth::id())
                        ->orWhereHas('case.client', fn($cq) => $cq->where('user_id', Auth::id()))
                        ->orWhereHas('case.teamMembers', fn($tq) => $tq->where('user_id', Auth::id()));
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'case_id', 'expense_category_id', 'description', 'amount', 'is_billable', 'status', 'expense_date'])
            ->map(fn($e) => [
                'id'          => $e->id,
                'description' => $e->description,
                'amount'      => (float) $e->amount,
                'is_billable' => (bool) $e->is_billable,
                'status'      => $e->status,
                'case_title'  => $e->case?->title,
                'category'    => $e->category?->name,
                'expense_date' => $e->expense_date,
            ]);


        // Calculate message counts for this client
        $totalMessages = Message::where('recipient_id', $user->id)
            ->where('recipient_id', Auth::id())
            ->count();
        $unreadMessages = Message::where('recipient_id', $user->id)
            ->where('is_read', false)
            ->where('recipient_id', Auth::id())
            ->count();

        $totalTasks = Task::where(function ($q) {
            if (Auth::user()->can('manage-any-tasks')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-tasks')) {
                $q->where('created_by', Auth::id())
                    ->orWhereHas('case.client', function ($cq) {
                        $cq->where('clients.user_id', Auth::id());
                    })
                    ->orWhere('assigned_to', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        })->count();

        $stats = [
            'total_cases' => $myCases->count(),
            'active_cases' => $myCases->active()->count(),
            'upcoming_hearings' => $upcomingHearings->count(),
            'total_messages' => $totalMessages,
            'unread_messages' => $unreadMessages,
            'total_tasks' => $totalTasks,
        ];

        return Inertia::render('dashboard/ClientDashboard', [
            'client' => $client,
            'myCases' => $myCases->get(),
            'upcomingHearings' => $upcomingHearings,
            'recentTimeEntries' => $recentTimeEntries,
            'recentExpenses' => $recentExpenses,
            'stats' => $stats,
            'userType' => 'client',
            'dashboardData' => ['stats' => $stats]
        ]);
    }
}
