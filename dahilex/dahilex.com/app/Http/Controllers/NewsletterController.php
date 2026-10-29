<?php

namespace App\Http\Controllers;

use App\Models\NewsletterSubscription;
use App\Services\EmailTemplateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NewsletterController extends Controller
{
    public function subscribe(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255'
        ]);

        try {
            $newsletter = NewsletterSubscription::firstOrCreate([
                'email' => $request->email,
            ]);

            if ($newsletter->wasRecentlyCreated) {
                return back()->with('success', __('Thank you for subscribing to our newsletter!'));
            } else {
                return back()->with('error', __('This email is already subscribed to our newsletter.'));
            }
        } catch (\Exception $e) {
            return back()->with('error', __('Something went wrong. Please try again later.'));
        }
    }

    public function index(Request $request)
    {
        $query = NewsletterSubscription::query();

        if ($request->has('search')) {
            $query->where('email', 'like', "%{$request->search}%");
        }

        $perPage = $request->input('per_page', 10);
        if (!is_numeric($perPage) || $perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $subscriptions = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('newsletter/index', [
            'subscriptions' => $subscriptions,
            'filters' => $request->only(['search', 'per_page', 'page']),
        ]);
    }

    public function send(Request $request)
    {
        $activeSubscribers = NewsletterSubscription::whereNull('unsubscribed_at')->get();

        if ($activeSubscribers->count() === 0) {
            return redirect()->route('newsletter.index')->with('error', 'No active subscribers found.');
        }

        try {
            $emailService = new EmailTemplateService();

            foreach ($activeSubscribers as $subscriber) {
                // Extract name from email (part before @)
                $emailName = explode('@', $subscriber->email)[0];
                $friendlyName = ucfirst(str_replace(['.', '_', '-'], ' ', $emailName));

                $variables = [
                    '{subscriber_email}' => $subscriber->email,
                    '{app_name}' => config('app.name'),
                    '{app_url}' => config('app.url'),
                    '{user_name}' => $friendlyName,
                    '{unsubscribe_url}' => route('newsletter.unsubscribe', $subscriber->email)
                ];

                $emailService->sendTemplateEmailWithLanguage(
                    templateName: 'Newsletter',
                    variables: $variables,
                    toEmail: $subscriber->email,
                    toName: $friendlyName,
                    language: 'en'
                );
            }
            return redirect()->route('newsletter.index')->with('success', 'Newsletter sent to ' . $activeSubscribers->count() . ' subscribers!');
        } catch (\Exception $e) {
            return redirect()->route('newsletter.index')->with('error', 'Failed to send newsletter: ' . $e->getMessage());
        }
    }

    public function destroy(NewsletterSubscription $subscription)
    {
        $subscription->delete();

        return back()->with('success', 'Newsletter subscription deleted successfully.');
    }

    public function unsubscribe($email)
    {
        $subscription = NewsletterSubscription::where('email', $email)->first();

        if ($subscription) {
            $subscription->update(['unsubscribed_at' => now()]);
            return response('<h2>Successfully Unsubscribed</h2><p>You have been unsubscribed from our newsletter.</p>');
        }

        return response('<h2>Error</h2><p>Email not found in our subscription list.</p>');
    }
}
