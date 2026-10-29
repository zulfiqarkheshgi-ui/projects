<?php

namespace App\Models;

use App\Traits\AutoApplyPermissionCheck;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends BaseModel
{
    use HasFactory, AutoApplyPermissionCheck;

    protected $fillable = [
        'created_by',
        'case_id',
        'expense_category_id',
        'invoice_id',
        'description',
        'amount',
        'expense_date',
        'is_billable',
        'status',
        'receipt_file',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'is_billable' => 'integer',
    ];

    protected static function booted()
    {
        static::addGlobalScope('company', function ($builder) {
            if (auth()->check() && auth()->user()->type !== 'super admin') {
                $user = auth()->user();

                $builder->where(function ($q) use ($user) {
                    // Show expenses created by company users
                    $q->whereIn('created_by', getCompanyAndUsersId());

                    // Also show expenses for cases where user is a team member or client owner
                    if ($user->can('manage-own-expenses')) {
                        $q->orWhereHas('case', function ($caseQuery) use ($user) {
                            $caseQuery->where(function ($cq) use ($user) {
                                $cq->where('created_by', $user->id)
                                    ->orWhereHas('client', function ($clientQuery) use ($user) {
                                        $clientQuery->where('user_id', $user->id);
                                    })
                                    ->orWhereHas('teamMembers', function ($teamQuery) use ($user) {
                                        $teamQuery->where('user_id', $user->id);
                                    });
                            });
                        });
                    }
                });
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }


    public function getBillableDisplayAttribute(): string
    {
        return $this->is_billable ? 'Billable' : 'Non-billable';
    }

    public function getReceiptFileAttribute($value)
    {
        return $value ? (check_file('storage/media/'.$value) ? get_file('storage/media/'.$value) : null) : null;
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseModel::class, 'case_id');
    }

    public function scopeUnbilled($query)
    {
        return $query->where('is_billable', true)
            ->where('status', 'approved')
            ->whereNull('invoice_id');
    }
}
