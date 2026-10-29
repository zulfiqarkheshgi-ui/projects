<?php

use App\Http\Controllers\AddonController;
use App\Http\Controllers\AddonPricingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Add-On Billing Routes
|--------------------------------------------------------------------------
| Required from routes/web.php (see deployment steps). Two kinds of route
| per screen: a GET that renders the Inertia page, and JSON endpoints
| (".../data" for reads, POST for actions) that the page itself calls via
| fetch() once mounted — these controllers return response()->json(...),
| not Inertia responses, so they're deliberately kept separate from the
| page-render routes rather than reused for both.
*/

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('billing/addons', fn () => Inertia::render('billing/addons'))->name('addons.page');
    Route::get('billing/addons/data', [AddonController::class, 'index'])->name('addons.index');
    Route::post('billing/addons/{featureKey}', [AddonController::class, 'update'])->name('addons.update');
});

Route::middleware(['auth', 'verified', 'permission:manage-plans'])->prefix('super-admin')->group(function () {
    Route::get('addon-pricing', fn () => Inertia::render('super-admin/addon-pricing'))->name('addon-pricing.page');
    Route::get('addon-pricing/data', [AddonPricingController::class, 'index'])->name('addon-pricing.index');
    Route::post('addon-pricing/{feature}/rates', [AddonPricingController::class, 'store'])->name('addon-pricing.store');
    Route::post('addon-pricing/{feature}/toggle', [AddonPricingController::class, 'toggleFeature'])->name('addon-pricing.toggle');
});
