<?php

namespace App\Http\Controllers;
use App\Events\NewJudgeCreated;
use App\Models\Judge;
use App\Models\Court;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class JudgeController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-judges')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Judge::with(['court', 'creator'])->where(function ($q) {
            if (Auth::user()->can('manage-any-judges')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-judges')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('judge_id', 'like', '%' . $request->search . '%')
                    ->orWhere('title', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('court_id') && $request->court_id !== '_empty_') {
            $query->where('court_id', $request->court_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['judge_id', 'name', 'created_at'];
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

        $judges = $query->paginate($perPage)->withQueryString();

        $courtQuery = Court::where(function($q) {
            if (Auth::user()->can('manage-any-courts')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-courts')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });
        $allCourts = (clone $courtQuery)->get(['id', 'name']);
        $courts = (clone $courtQuery)->active()->get(['id', 'name']);

        return Inertia::render('judges/index', [
            'judges' => $judges,
            'courts' => $courts,
            'allCourts' => $allCourts,
            'filters' => $request->only(['search', 'court_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-judges')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $validated = $request->validate([
            'court_id' => 'required|exists:courts,id',
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:100',
            'email' => 'required|email|max:255|unique:judges,email',
            'phone' => 'required|nullable|string|max:20',
            'preferences' => 'nullable|array',
            'contact_info' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);
        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Check if court belongs to the current user's company
        $court = Court::active()->where('id', $validated['court_id'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if (!$court) {
            return redirect()->back()->with('error', 'Invalid court selected.');
        }

        $exists = Judge::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Judge with this name already exists.');
        }

        $judge = Judge::create($validated);

        // Trigger notifications
        if ($judge && !IsDemo()) {
            event(new \App\Events\NewJudgeCreated($judge, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');
        $twilioError = session()->pull('twilio_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('Slack send failed: ') . $slackError;
        }
        if ($twilioError) {
            $errors[] = __('SMS send failed: ') . $twilioError;
        }

        if (!empty($errors)) {
            $message = __('Judge created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Judge created successfully.');
    }

    public function update(Request $request, $judgeId)
    {
        if (!Auth::user()->can('edit-judges')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $judge = Judge::where('id', $judgeId)->whereIn('created_by', getCompanyAndUsersId())->first();

        if ($judge) {
            try {
                $validated = $request->validate([
                    'court_id' => 'required|exists:courts,id',
                    'name' => 'required|string|max:255',
                    'title' => 'nullable|string|max:100',
                    'email' => 'required|email|max:255|unique:judges,email,' . $judgeId,
                    'phone' => 'nullable|string|max:20',
                    'preferences' => 'nullable|array',
                    'contact_info' => 'nullable|string',
                    'status' => 'nullable|in:active,inactive',
                    'notes' => 'nullable|string',
                ], [
                    'email.required' => 'Email address is required.',
                    'email.unique' => 'A judge with this email address already exists.',
                    'email.email' => 'Please enter a valid email address.',
                ]);

                // Check if court belongs to the current user's company
                $court = Court::active()->where('id', $validated['court_id'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->first();

                if (!$court) {
                    return redirect()->back()->with('error', 'Invalid court selected.');
                }

                $exists = Judge::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $judgeId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Judge with this name already exists.');
                }

                $judge->update($validated);

                return redirect()->back()->with('success', 'Judge updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update judge');
            }
        } else {
            return redirect()->back()->with('error', 'Judge not found.');
        }
    }

    public function show($judgeId)
    {
        $judge = Judge::with(['court', 'creator'])
            ->where('id', $judgeId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-judges')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-judges')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$judge) {
            return redirect()->route('judges.index')->with('error', 'Judge not found.');
        }

        return Inertia::render('judges/show', [
            'judge' => $judge,
        ]);
    }

    public function destroy($judgeId)
    {
        if (!Auth::user()->can('delete-judges')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $judge = Judge::where('id', $judgeId)->whereIn('created_by', getCompanyAndUsersId())->first();

        if ($judge) {
            try {
                $judge->delete();
                return redirect()->back()->with('success', 'Judge deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete judge');
            }
        } else {
            return redirect()->back()->with('error', 'Judge not found.');
        }
    }

    public function toggleStatus($judgeId)
    {
        if (!Auth::user()->can('toggle-status-judges')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $judge = Judge::where('id', $judgeId)->whereIn('created_by', getCompanyAndUsersId())->first();

        if ($judge) {
            try {
                $judge->status = $judge->status === 'active' ? 'inactive' : 'active';
                $judge->save();

                return redirect()->back()->with('success', 'Judge status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update judge status');
            }
        } else {
            return redirect()->back()->with('error', 'Judge not found.');
        }
    }
}
