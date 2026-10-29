<?php

namespace App\Http\Controllers;
use App\Events\NewCourtCreated;
use App\Models\Court;
use App\Models\CourtType;
use App\Models\Judge;
use App\Models\Hearing;
use App\Models\CaseModel;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CourtController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-courts')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $query = Court::with(['creator', 'courtType'])->where(function ($q) {
            if (Auth::user()->can('manage-any-courts')) {
                $q->whereIn('created_by', getCompanyAndUsersId());
            } elseif (Auth::user()->can('manage-own-courts')) {
                $q->where('created_by', Auth::id());
            } else {
                $q->whereRaw('1 = 0');
            }
        });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('court_id', 'like', '%' . $request->search . '%')
                    ->orWhere('jurisdiction', 'like', '%' . $request->search . '%')
                    ->orWhere('address', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('court_type_id') && $request->court_type_id !== '_empty_') {
            $query->where('court_type_id', $request->court_type_id);
        }

        if ($request->filled('status') && $request->status !== '_empty_') {
            $allowedStatuses = ['active', 'inactive'];
            if (in_array($request->status, $allowedStatuses)) {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['court_id', 'name', 'created_at'];
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

        $courts = $query->paginate($perPage)->withQueryString();

        $courtTypeQuery = CourtType::where(function ($q) {
                if (Auth::user()->can('manage-any-court-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-court-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });
        $allCourtTypes = (clone $courtTypeQuery)->get(['id', 'name', 'color']);
        $courtTypes = (clone $courtTypeQuery)->active()->get(['id', 'name', 'color']);

        return Inertia::render('courts/index', [
            'courts' => $courts,
            'courtTypes' => $courtTypes,
            'allCourtTypes' => $allCourtTypes,
            'filters' => $request->only(['search', 'court_type_id', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-courts')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('courts', 'phone')->whereIn('created_by', getCompanyAndUsersId())],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('courts', 'email')->whereIn('created_by', getCompanyAndUsersId())],
            'jurisdiction' => 'nullable|string|max:255',
            'court_type_id' => 'required|exists:court_types,id',
            'status' => 'nullable|in:active,inactive',
            'facilities' => 'nullable|array',
            'filing_requirements' => 'nullable|string',
            'local_rules' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        // Verify user has permission and court type is accessible
        $courtType = CourtType::active()->where('id', $validated['court_type_id'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-court-types')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-court-types')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->first();

        if (!$courtType) {
            return redirect()->back()->with('error', 'Invalid court type selected or you do not have permission to use it.');
        }

        // Check if court with same name already exists for this company
        $exists = Court::where('name', $validated['name'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->exists();

        if ($exists) {
            return redirect()->back()->with('error', 'Court with this name already exists.');
        }

        $court = Court::create($validated);

        // Trigger notifications
        if ($court && !IsDemo()) {
            event(new \App\Events\NewCourtCreated($court, $request->all()));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $slackError = session()->pull('slack_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($slackError) {
            $errors[] = __('SMS send failed: ') . $slackError;
        }

        if (!empty($errors)) {
            $message = __('Court created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', 'Court created successfully.');
    }

    public function update(Request $request, $courtId)
    {
        if (!Auth::user()->can('edit-courts')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $court = Court::where('id', $courtId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($court) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'address' => 'nullable|string',
                    'phone' => ['nullable', 'string', 'max:20', Rule::unique('courts', 'phone')->whereIn('created_by', getCompanyAndUsersId())->ignore($courtId)],
                    'email' => ['nullable', 'email', 'max:255', Rule::unique('courts', 'email')->whereIn('created_by', getCompanyAndUsersId())->ignore($courtId)],
                    'jurisdiction' => 'nullable|string|max:255',
                    'court_type_id' => 'required|exists:court_types,id',
                    'status' => 'nullable|in:active,inactive',
                    'facilities' => 'nullable|array',
                    'filing_requirements' => 'nullable|string',
                    'local_rules' => 'nullable|string',
                    'notes' => 'nullable|string',
                ]);

                // Check if court with same name already exists for this company (excluding current)
                $exists = Court::where('name', $validated['name'])
                    ->whereIn('created_by', getCompanyAndUsersId())
                    ->where('id', '!=', $courtId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->with('error', 'Court with this name already exists.');
                }

                // Verify user has permission and court type is accessible
                $courtType = CourtType::active()->where('id', $validated['court_type_id'])
                    ->where(function ($q) {
                        if (Auth::user()->can('manage-any-court-types')) {
                            $q->whereIn('created_by', getCompanyAndUsersId());
                        } elseif (Auth::user()->can('manage-own-court-types')) {
                            $q->where('created_by', Auth::id());
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })
                    ->first();

                if (!$courtType) {
                    return redirect()->back()->with('error', 'Invalid court type selected or you do not have permission to use it.');
                }

                $court->update($validated);

                return redirect()->back()->with('success', 'Court updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update court');
            }
        } else {
            return redirect()->back()->with('error', 'Court not found.');
        }
    }

    public function show($courtId)
    {
        $court = Court::with(['creator'])
            ->where('id', $courtId)
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-courts')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-courts')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->first();

        if (!$court) {
            return redirect()->route('courts.index')->with('error', 'Court not found.');
        }

        return Inertia::render('courts/show', [
            'court' => $court,
        ]);
    }

    public function destroy($courtId)
    {
        if (!Auth::user()->can('delete-courts')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $court = Court::where('id', $courtId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($court) {

            $existingJudges = Judge::where('court_id',$courtId)->exists();
            if($existingJudges){
                return redirect()->back()->with('error', 'Cannot delete court that has associated judges.');
            }

            $existingHearings = Hearing::where('court_id',$courtId)->exists();
            if($existingHearings){
                return redirect()->back()->with('error', 'Cannot delete court that has associated hearing.');
            }

            $existingCase = CaseModel::where('court_id',$courtId)->exists();
            if($existingCase){
                return redirect()->back()->with('error', 'Cannot delete court that has associated case.');
            }

            try {
                $court->delete();
                return redirect()->back()->with('success', 'Court deleted successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to delete court');
            }
        } else {
            return redirect()->back()->with('error', 'Court not found.');
        }
    }

    public function toggleStatus($courtId)
    {
        if (!Auth::user()->can('toggle-status-courts')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $court = Court::where('id', $courtId)
            ->whereIn('created_by', getCompanyAndUsersId())
            ->first();

        if ($court) {
            try {
                $court->status = $court->status === 'active' ? 'inactive' : 'active';
                $court->save();

                return redirect()->back()->with('success', 'Court status updated successfully');
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to update court status');
            }
        } else {
            return redirect()->back()->with('error', 'Court not found.');
        }
    }
}
