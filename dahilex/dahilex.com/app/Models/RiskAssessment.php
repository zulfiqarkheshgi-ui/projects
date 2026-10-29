<?php

namespace App\Models;

use App\Traits\AutoApplyPermissionCheck;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class RiskAssessment extends BaseModel
{
    use AutoApplyPermissionCheck;

    protected $fillable = [
        'risk_title',
        'risk_category_id',
        'description',
        'probability',
        'impact',
        'mitigation_plan',
        'control_measures',
        'assessment_date',
        'review_date',
        'status',
        'responsible_person',
        'created_by'
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'review_date' => 'date',
    ];

    /**
     * Check if a risk assessment with the same title and category already exists
     */
    public static function isDuplicate($riskTitle, $categoryId, $excludeId = null)
    {
        $query = static::where('risk_title', $riskTitle)
            ->where('risk_category_id', $categoryId)
            ->whereIn('created_by', getCompanyAndUsersId());

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Get the user who created the risk assessment.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function riskCategory()
    {
        return $this->belongsTo(RiskCategory::class);
    }

    /**
     * Calculate risk score based on probability and impact
     */
    public function getRiskScoreAttribute()
    {
        $probabilityValues = [
            'very_low' => 1,
            'low' => 2,
            'medium' => 3,
            'high' => 4,
            'very_high' => 5
        ];

        $impactValues = [
            'very_low' => 1,
            'low' => 2,
            'medium' => 3,
            'high' => 4,
            'very_high' => 5
        ];

        return ($probabilityValues[$this->probability] ?? 3) * ($impactValues[$this->impact] ?? 3);
    }

    /**
     * Get risk level based on score
     */
    public function getRiskLevelAttribute()
    {
        $score = $this->risk_score;

        if ($score <= 4) return 'low';
        if ($score <= 9) return 'medium';
        if ($score <= 16) return 'high';
        return 'critical';
    }
}
