<?php

namespace App\Models;

use App\Traits\AutoApplyPermissionCheck;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CaseTimeline extends BaseModel
{
    use HasFactory, AutoApplyPermissionCheck;

    protected $fillable = [
        'case_id',
        'event_type',
        'event_type_id',
        'title',
        'description',
        'event_date',
        'is_completed',
        'status',
        'created_by',
        'google_calendar_event_id'
    ];

    protected $casts = [
        'event_date' => 'datetime',
        'is_completed' => 'boolean',
    ];

    public function case()
    {
        return $this->belongsTo(CaseModel::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function event_type()
    {
        return $this->belongsTo(EventType::class);
    }

    // public function scopeWithPermissionCheck($query)
    // {
    //     return $query->whereHas('case', function ($q) {
    //         $q->where('created_by', createdBy());
    //     });
    // }
}
