<?php

namespace App\Models;

use App\Traits\AutoApplyPermissionCheck;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentVersion extends BaseModel
{
    use HasFactory, AutoApplyPermissionCheck;

    protected $fillable = [
        'document_id',
        'version_number',
        'file_path',
        'changes_description',
        'is_current',
        'created_by'
    ];

    protected $casts = [
        'is_current' => 'boolean',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getFilePathAttribute($value)
    {
        return check_file($value) ? get_file($value) : get_file('/storage/media/document/default.svg');
    }


    // public function scopeWithPermissionCheck($query)
    // {
    //     return $query->whereHas('document', function ($q) {
    //         $q->where('created_by', createdBy());
    //     });
    // }
}
