<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'name',
        'email',
        'tax_rate',
        'phone',
        'address',
        'client_type_id',
        'status',
        'company_name',
        'tax_id',
        'date_of_birth',
        'notes',
        'referral_source',
        'created_by',
        'user_id'
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'tax_rate' => 'decimal:2',
    ];

    /**
     * Boot method to auto-generate client ID
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($client) {
            if (!$client->client_id) {
                $client->client_id = 'CL' . str_pad(
                    (Client::max('id') ?? 0) + 1, 
                    6, 
                    '0', 
                    STR_PAD_LEFT
                );
            }
        });
    }

    /**
     * Get the client type that owns the client.
     */
    public function clientType()
    {
        return $this->belongsTo(ClientType::class);
    }

    /**
     * Get the user who created the client.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user associated with the client.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cases()
    {
        return $this->hasMany(CaseModel::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function billingInfo()
    {
        return $this->hasOne(ClientBillingInfo::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}