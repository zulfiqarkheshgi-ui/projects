<?php

namespace App\Http\Controllers;

use App\Models\contact;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContactUsController extends Controller
{
    public function index(Request $request)
    {
        $query = contact::query();

        if ($request->has('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%")
                  ->orWhere('subject', 'like', "%{$searchTerm}%")
                  ->orWhere('message', 'like', "%{$searchTerm}%");
            });
        }

        $query->orderBy('created_at', 'desc');

        // Handle pagination with validation
        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }
        
        $contacts = $query->paginate($perPage)->withQueryString();

        return Inertia::render('contact-us/index', [
            'contacts' => $contacts,
            'filters' => $request->only(['search', 'per_page', 'page']),
        ]);
    }

    public function destroy(contact $contact)
    {
        $contact->delete();

        return back()->with('success', 'Contact message deleted successfully.');
    }
}
