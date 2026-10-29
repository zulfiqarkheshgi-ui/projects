<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-messages')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }

        $companyId = getCompanyId(auth()->id());

        $query = Conversation::where('company_id', $companyId)
            ->whereJsonContains('participants', auth()->id())
            ->with(['messages' => function ($q) {
                $q->with('sender')->orderBy('created_at', 'asc');
            }, 'case']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhereHas('messages', function ($msgQuery) use ($request) {
                        $msgQuery->where('content', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereExists(function ($subQuery) use ($request) {
                        $subQuery->select(\DB::raw(1))
                            ->from('users')
                            ->whereRaw('JSON_CONTAINS(conversations.participants, CAST(users.id as JSON))')
                            ->where('users.name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        $perPage = $request->input('per_page', 15);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 15;
        }
        $conversations = $query->orderBy('last_message_at', 'desc')
            ->paginate($perPage)->withQueryString();

        $conversations->getCollection()->transform(function ($conversation) {
            $conversation->receiver = collect($conversation->participant_users)
                    ->first(fn($u) => $u->id !== auth()->id());
            // Set latest message for display (last message is latest due to asc order)
            $conversation->latest_message = $conversation->messages->reverse()->first()?->content;
            // Count unread messages for this conversation
            $conversation->unread_count = Message::where('conversation_id', $conversation->id)
                ->where('recipient_id', auth()->id())
                ->where('is_read', false)
                ->count();
            return $conversation;
        });

        // Get user IDs + emails who already have a direct conversation with auth user
        $existingConversations = Conversation::where('company_id', $companyId)
            ->whereJsonContains('participants', auth()->id())
            ->where('type', 'direct')
            ->get('participants');

        $existingUserIds = $existingConversations
            ->flatMap(fn($c) => collect($c->participants)->filter(fn($id) => $id !== auth()->id()))
            ->unique()->values()->toArray();

        $existingEmails = User::whereIn('id', $existingUserIds)->pluck('email')->toArray();

        // Get users and clients based on role
        $users = collect();
        $clients = collect();

        if (auth()->user()->hasRole('client')) {
            // Client: their case handlers + company owner
            $client = \App\Models\Client::where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->with('user')->where('email', auth()->user()->email)->first();
            if ($client) {
                $caseUserIds = \App\Models\CaseModel::where('client_id', $client->id)
                    ->with('teamMembers')
                    ->get()
                    ->flatMap(fn($case) => $case->teamMembers->pluck('user_id'))
                    ->push($client->created_by)
                    ->push($companyId)
                    ->unique()->filter()->values()->toArray();

                $users = User::where(function ($q) {
                    if (Auth::user()->can('manage-any-users')) {
                        $q->whereIn('created_by', getCompanyAndUsersId());
                    } elseif (Auth::user()->can('manage-own-users')) {
                        $q->where('created_by', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })->whereIn('id', $caseUserIds)
                    ->where('status', 'active')
                    ->where('id', '!=', auth()->id())
                    ->whereNotIn('id', $existingUserIds)
                    ->get(['id', 'name', 'email', 'type', 'avatar']);
            }
        } elseif (auth()->user()->hasRole('company')) {
            // Company: all users and all clients
            $users = User::where(function ($q) {
                if (Auth::user()->can('manage-any-users')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->where('status', 'active')
                ->where('id', '!=', auth()->id())
                ->whereNotIn('id', $existingUserIds)
                ->get(['id', 'name', 'email', 'type', 'avatar']);

            $clients = \App\Models\Client::where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->where('created_by', $companyId)
                ->where('status', 'active')
                ->whereNotIn('email', array_merge($users->pluck('email')->toArray(), $existingEmails))
                ->get(['id', 'name', 'email']);
        } else {
            // Team member: all users + their assigned case clients + company owner
            $users = User::where(function ($q) {
                if (Auth::user()->can('manage-any-users')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-users')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->where('status', 'active')
                ->where('id', '!=', auth()->id())
                ->whereNotIn('id', $existingUserIds)
                ->get(['id', 'name', 'email', 'type', 'avatar']);

            $clients = \App\Models\Client::with('user')->where(function ($q) {
                if (Auth::user()->can('manage-any-clients')) {
                    $q->whereIn('created_by', getCompanyAndUsersId());
                } elseif (Auth::user()->can('manage-own-clients')) {
                    $q->where('created_by', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->whereHas('cases.teamMembers', function ($q) {
                    $q->where('user_id', auth()->id());
                })
                ->where('status', 'active')
                ->whereNotIn('email', array_merge($users->pluck('email')->toArray(), $existingEmails))
                ->get(['id', 'name', 'email', 'user_id']);
        }

        // Format and combine
        $users = $users->map(fn($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'type' => $u->type ?? 'user',
            'avatar' => $u->avatar,
        ]);

        $clients = $clients->map(fn($c) => [
            'id' => $c->user_id,
            'name' => $c->name,
            'email' => $c->email,
            'type' => 'client',
            'avatar' => $c->user->avatar,
        ]);

        $users = $users->concat($clients)->unique('email')->sortBy('name')->values();

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $users = $users->filter(fn($u) =>
                str_contains(strtolower($u['name']), $search) ||
                str_contains(strtolower($u['email']), $search)
            )->values();
        } else {
            $users = collect();
        }

        return Inertia::render('communication/messages/index', [
            'conversations' => $conversations,
            'users' => $users,
            'filters' => $request->only(['search', 'type', 'per_page']),
        ]);
    }

    public function markRead($conversationId)
    {
        Message::where('conversation_id', $conversationId)
            ->where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return redirect()->back();
    }

    public function startConversation(Request $request, $userId)
    {
        if (!Auth::user()->can('send-messages')) {
            return $request->expectsJson()
                ? response()->json(['error' => 'Permission Denied.'], 403)
                : redirect()->back()->with('error', __('Permission Denied.'));
        }

        $companyId = getCompanyId(auth()->id());

        $conversation = Conversation::where('company_id', $companyId)
            ->where('type', 'direct')
            ->whereJsonContains('participants', auth()->id())
            ->whereJsonContains('participants', (int) $userId)
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'company_id' => $companyId,
                'type' => 'direct',
                'participants' => [auth()->id(), (int) $userId],
                'last_message_at' => now(),
                'created_by' => auth()->id(),
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json(['conversation' => ['id' => $conversation->id]]);
        }

        return redirect()->route('communication.messages.show', $conversation->id);
    }

    public function show(Request $request, $conversationId)
    {
        if (!Auth::user()->can('manage-messages')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        $conversation = Conversation::with(['case'])
            ->where('id', $conversationId)
            ->first();

        if (!$conversation) {
            return redirect()->route('communication.messages.index')->with('error', 'Conversation not found.');
        }

        $conversation->receiver = collect($conversation->participant_users)->first(fn($u) => $u->id !== auth()->id());

        $perPage = $request->input('per_page', 50);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 200) {
            $perPage = 50;
        }
        $messages = Message::with(['sender'])
            ->where('conversation_id', $conversationId)
            ->orderBy('created_at', 'asc')
            ->paginate($perPage)->withQueryString();

        // Mark messages as read
        Message::where('conversation_id', $conversationId)
            ->where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return Inertia::render('communication/messages/show', [
            'conversation' => $conversation,
            'messages' => $messages,
            'filters' => $request->only(['per_page']),
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('send-messages')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        try {
            $validated = $request->validate([
                'recipient_id' => 'required_without:conversation_id|integer',
                'conversation_id' => 'required_without:recipient_id|exists:conversations,id',
                'subject' => 'nullable|string|max:255',
                'content' => 'required|string',
                'priority' => 'nullable|in:low,normal,high,urgent',
                'case_id' => 'nullable|exists:cases,id'
            ]);

            $companyId = getCompanyId(auth()->id());

            $validated['company_id'] = $companyId;
            $validated['sender_id'] = auth()->id();
            $validated['message_type'] = 'direct';
            $validated['priority'] = $validated['priority'] ?? 'normal';
            $validated['created_by'] = auth()->id();

            // Create or find conversation
            if (!isset($validated['conversation_id'])) {
                $conversation = Conversation::create([
                    'company_id' => $companyId,
                    'type' => 'direct',
                    'participants' => [auth()->id(), (int)$validated['recipient_id']],
                    'case_id' => $validated['case_id'] ?? null,
                    'last_message_at' => now(),
                    'created_by' => auth()->id()
                ]);
                $validated['conversation_id'] = $conversation->id;
            } else {
                $conversation = Conversation::find($validated['conversation_id']);
                $conversation->update(['last_message_at' => now()]);

                // Set recipient_id from conversation participants
                $recipientId = collect($conversation->participants)
                    ->first(fn($id) => $id !== auth()->id());
                $validated['recipient_id'] = $recipientId;
            }

            Message::create($validated);

            return redirect()->back()->with('success', 'Message sent successfully.');
        } catch (\Exception $e) {
            \Log::error('Message creation failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to send message: ' . $e->getMessage());
        }
    }

    public function getUnreadCount()
    {
        $count = Message::where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function getRecentMessages()
    {
        $messages = Message::with(['sender', 'conversation'])
            ->where('recipient_id', auth()->id())
            ->where('is_read', false)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json(['messages' => $messages]);
    }

    public function getUserDetails($userId)
    {
        $user = User::with(['roles', 'creator'])->findOrFail($userId);

        // Get client data if user is a client
        $client = null;
        if ($user->type === 'client') {
            $client = \App\Models\Client::where('email', $user->email)->first();
        }

        // Get cases related to this user
        $cases = collect();
        if ($client) {
            $cases = \App\Models\CaseModel::where('client_id', $client->id)
                ->with(['caseStatus', 'caseType'])
                ->get();
        } elseif ($user->hasRole('team_member')) {
            $cases = \App\Models\CaseModel::whereHas('teamMembers', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->with(['caseStatus', 'caseType'])->get();
        }

        return response()->json([
            'user' => array_merge($user->toArray(), [
                'client' => $client,
                'cases' => $cases
            ])
        ]);
    }

    public function destroy($conversationId)
    {
        if (!Auth::user()->can('delete-messages')) {
            return redirect()->back()->with('error', __('Permission Denied.'));
        }
        try {
            $conversation = Conversation::where('id', $conversationId)
                ->first();

            if (!$conversation) {
                return redirect()->back()->with('error', 'Conversation not found.');
            }

            // Delete all messages in the conversation
            Message::where('conversation_id', $conversationId)->delete();

            // Delete the conversation
            $conversation->delete();

            return redirect()->route('communication.messages.index')->with('success', 'Conversation deleted successfully.');
        } catch (\Exception $e) {
            \Log::error('Conversation deletion failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete conversation.');
        }
    }
}
