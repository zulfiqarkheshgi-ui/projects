<?php

namespace App\Http\Controllers;
use App\Models\RiskAssessment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RiskAssessmentController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-risk-assessments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $query = RiskAssessment::with(['creator', 'riskCategory'])->where(function ($q) {
            if (Auth::user()->can('manage-any-risk-assessments')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-risk-assessments')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // ── Stats & matrix counts from unfiltered base ─────────────────────
        $allRecords = (clone $query)->get(['id', 'probability', 'impact', 'status']);

        $probValues  = ['very_low' => 1, 'low' => 2, 'medium' => 3, 'high' => 4, 'very_high' => 5];
        $matrixCounts = [];
        $criticalHigh = 0;
        $openCount    = 0;

        foreach ($allRecords as $r) {
            $p   = $probValues[$r->probability] ?? 3;
            $i   = $probValues[$r->impact]      ?? 3;
            $key = "{$r->probability}_{$r->impact}";
            $matrixCounts[$key] = ($matrixCounts[$key] ?? 0) + 1;
            $score = $p * $i;
            if ($score > 9)            $criticalHigh++;
            if ($r->status !== 'closed') $openCount++;
        }

        $stats = [
            'total'         => $allRecords->count(),
            'critical_high' => $criticalHigh,
            'open'          => $openCount,
            'closed'        => $allRecords->where('status', 'closed')->count(),
        ];
        // ── Stats & matrix counts from unfiltered base ───────────────────────────
        $allRecords = (clone $query)->get(['id', 'probability', 'impact', 'status']);

        $probValues = ['very_low' => 1, 'low' => 2, 'medium' => 3, 'high' => 4, 'very_high' => 5];
        $matrixCounts = [];
        $totalCount = $allRecords->count();
        $criticalHigh = 0;
        $openCount = 0;

        foreach ($allRecords as $r) {
            $p = $probValues[$r->probability] ?? 3;
            $i = $probValues[$r->impact] ?? 3;
            $key = "{$r->probability}_{$r->impact}";
            $matrixCounts[$key] = ($matrixCounts[$key] ?? 0) + 1;
            $score = $p * $i;
            if ($score > 9) $criticalHigh++;
            if ($r->status !== 'closed') $openCount++;
        }

        $stats = [
            'total'         => $totalCount,
            'critical_high' => $criticalHigh,
            'open'          => $openCount,
            'closed'        => $allRecords->where('status', 'closed')->count(),
        ];

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('risk_title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%')
                    ->orWhere('responsible_person', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('risk_category') && $request->risk_category !== '_empty_') {
            $query->where('risk_category_id', $request->risk_category);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $query->where('status', $request->status);
        }

        if ($request->filled('impact') && $request->impact !== '_empty_') {
            $query->where('impact', $request->impact);
        }

        if ($request->filled('probability') && $request->probability !== '_empty_') {
            $query->where('probability', $request->probability);
        }

        if ($request->filled('risk_level') && $request->risk_level !== '_empty_') {
            // This requires a more complex query since risk_level is calculated
            $query->whereRaw('
                CASE
                    WHEN (
                        CASE probability
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END *
                        CASE impact
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END
                    ) <= 4 THEN "low"
                    WHEN (
                        CASE probability
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END *
                        CASE impact
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END
                    ) <= 9 THEN "medium"
                    WHEN (
                        CASE probability
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END *
                        CASE impact
                            WHEN "very_low" THEN 1
                            WHEN "low" THEN 2
                            WHEN "medium" THEN 3
                            WHEN "high" THEN 4
                            WHEN "very_high" THEN 5
                            ELSE 3
                        END
                    ) <= 16 THEN "high"
                    ELSE "critical"
                END = ?
            ', [$request->risk_level]);
        }

        $allowedSortFields = ['risk_title', 'assessment_date', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }

        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $riskAssessments = $query->paginate($perPage)->withQueryString();

        $riskCategoryQuery = \App\Models\RiskCategory::where(function($q) {
                if (Auth::user()->can('manage-any-risk-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-risk-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
        $allRiskCategories = (clone $riskCategoryQuery)->get(['id', 'name', 'color']);
        $riskCategories = (clone $riskCategoryQuery)->active()->get(['id', 'name', 'color']);

        return Inertia::render('compliance/risk-assessments/index', [
            'riskAssessments' => $riskAssessments,
            'riskCategories' => $riskCategories,
            'allRiskCategories' => $allRiskCategories,
            'stats' => $stats,
            'matrixCounts' => $matrixCounts,
            'filters' => $request->only(['search', 'risk_category', 'status', 'risk_level', 'probability', 'impact', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-risk-assessments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $validated = $request->validate([
            'risk_title' => 'required|string|max:255',
            'risk_category_id' => 'required|exists:risk_categories,id',
            'description' => 'required|string',
            'probability' => 'required|in:very_low,low,medium,high,very_high',
            'impact' => 'required|in:very_low,low,medium,high,very_high',
            'mitigation_plan' => 'nullable|string',
            'control_measures' => 'nullable|string',
            'assessment_date' => 'required|date',
            'review_date' => 'nullable|date|after:assessment_date',
            'status' => 'nullable|in:identified,assessed,mitigated,monitored,closed',
            'responsible_person' => 'nullable|string|max:255',
        ]);

        $category = \App\Models\RiskCategory::active()->where('id', $validated['risk_category_id'])
            ->where(function($q) {
                if (Auth::user()->can('manage-any-risk-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-risk-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();
        if (!$category) {
            return redirect()->back()->with('error', 'Invalid risk category selected.');
        }

        // Check for duplicate risk assessment
        $duplicateExists = RiskAssessment::where('risk_title', $validated['risk_title'])
            ->where('risk_category_id', $validated['risk_category_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($duplicateExists) {
            return redirect()->back()->with('error', 'A risk assessment with this title already exists in the selected category.');
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'identified';

        RiskAssessment::create($validated);

        return redirect()->back()->with('success', 'Risk assessment created successfully.');
    }

    public function update(Request $request, $riskAssessmentId)
    {
        if (!Auth::user()->can('edit-risk-assessments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $riskAssessment = RiskAssessment::where('id', $riskAssessmentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-risk-assessments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-risk-assessments')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$riskAssessment) {
            return redirect()->back()->with('error', 'Risk assessment not found.');
        }

        $validated = $request->validate([
            'risk_title' => 'required|string|max:255',
            'risk_category_id' => 'required|exists:risk_categories,id',
            'description' => 'required|string',
            'probability' => 'required|in:very_low,low,medium,high,very_high',
            'impact' => 'required|in:very_low,low,medium,high,very_high',
            'mitigation_plan' => 'nullable|string',
            'control_measures' => 'nullable|string',
            'assessment_date' => 'required|date',
            'review_date' => 'nullable|date|after:assessment_date',
            'status' => 'nullable|in:identified,assessed,mitigated,monitored,closed',
            'responsible_person' => 'nullable|string|max:255',
        ]);

        $category = \App\Models\RiskCategory::active()->where('id', $validated['risk_category_id'])
            ->where(function($q) {
                if (Auth::user()->can('manage-any-risk-categories')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-risk-categories')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();
        if (!$category) {
            return redirect()->back()->with('error', 'Invalid risk category selected.');
        }

        // Check for duplicate risk assessment (excluding current record)
        $duplicateExists = RiskAssessment::where('risk_title', $validated['risk_title'])
            ->where('risk_category_id', $validated['risk_category_id'])
            ->where('id', '!=', $riskAssessmentId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($duplicateExists) {
            return redirect()->back()->with('error', 'A risk assessment with this title already exists in the selected category.');
        }

        $riskAssessment->update($validated);

        return redirect()->back()->with('success', 'Risk assessment updated successfully');
    }

    public function destroy($riskAssessmentId)
    {
        if (!Auth::user()->can('delete-risk-assessments')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $riskAssessment = RiskAssessment::where('id', $riskAssessmentId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-risk-assessments')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-risk-assessments')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$riskAssessment) {
            return redirect()->back()->with('error', 'Risk assessment not found.');
        }

        $riskAssessment->delete();
        return redirect()->back()->with('success', 'Risk assessment deleted successfully');
    }
}
