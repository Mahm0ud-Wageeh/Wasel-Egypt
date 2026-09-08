<?php

namespace App\Services\Reports;

use App\Models\CommunityReport;
use App\Models\User;

/**
 * Deterministic trust scoring from report history (no ML).
 *
 *   score = clamp(0, 100, BASE + VERIFIED_BONUS * verified - REJECTED_PENALTY * rejected)
 *
 * - "verified" reports are contributions a moderator verified (status
 *   verified or resolved — resolved reports were verified first).
 * - "rejected" reports are contributions a moderator rejected.
 *
 * New authors start neutral (BASE). Levels are derived from the score.
 */
class TrustScoreService
{
    public const BASE_SCORE = 50;
    public const VERIFIED_BONUS = 10;
    public const REJECTED_PENALTY = 15;

    public const TRUSTED_THRESHOLD = 70;
    public const LOW_THRESHOLD = 40;

    /**
     * Compute the trust score and level for a user.
     */
    public function score(User $user): array
    {
        $verified = CommunityReport::where('user_id', $user->id)
            ->whereIn('status', ['verified', 'resolved'])
            ->count();
        $rejected = CommunityReport::where('user_id', $user->id)
            ->where('status', 'rejected')
            ->count();
        $total = CommunityReport::where('user_id', $user->id)->count();

        $score = max(0, min(100, self::BASE_SCORE + self::VERIFIED_BONUS * $verified - self::REJECTED_PENALTY * $rejected));

        return [
            'user_id' => $user->id,
            'score' => $score,
            'level' => $this->level($score),
            'verified_reports' => $verified,
            'rejected_reports' => $rejected,
            'total_reports' => $total,
        ];
    }

    /**
     * Trust tier for a score.
     */
    public function level(int $score): string
    {
        if ($score >= self::TRUSTED_THRESHOLD) {
            return 'trusted';
        }

        return $score >= self::LOW_THRESHOLD ? 'standard' : 'low';
    }
}
