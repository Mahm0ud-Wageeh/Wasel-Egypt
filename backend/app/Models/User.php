<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\CanResetPassword;

class User extends Authenticatable implements CanResetPassword
{
    use HasFactory, SoftDeletes, HasApiTokens, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password_hash',
        'status',
        'locale',
        'email_verified_at',
        'phone_verified_at',
        'google_id',
        'github_id',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the roles for the user.
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Check if the user has a given role.
     */
    public function hasRole($role): bool
    {
        if (is_string($role)) {
            return $this->roles()->where('name', $role)->exists();
        }

        return !! $role->intersect($this->roles)->count();
    }

    /**
     * Check if the user has any of the given roles.
     */
    public function hasAnyRole($roles): bool
    {
        if (is_array($roles)) {
            return !! $this->roles()->whereIn('name', $roles)->count();
        }

        return $this->hasRole($roles);
    }

    /**
     * Get the permissions for the user via their roles.
     */
    public function permissions()
    {
        return Permission::query()
            ->join('role_permission', 'permissions.id', '=', 'role_permission.permission_id')
            ->join('role_user', 'role_permission.role_id', '=', 'role_user.role_id')
            ->where('role_user.user_id', $this->id)
            ->select('permissions.*')
            ->distinct();
    }

    /**
     * Check if the user has a given permission.
     */
    public function hasPermission($permission): bool
    {
        if (is_string($permission)) {
            return $this->permissions()->where('name', $permission)->exists();
        }

        return !! $permission->intersect($this->permissions)->count();
    }

    /**
     * Check if the user has any of the given permissions.
     */
    public function hasAnyPermission($permissions): bool
    {
        if (is_array($permissions)) {
            return !! $this->permissions()->whereIn('name', $permissions)->count();
        }

        return $this->hasPermission($permissions);
    }

    /**
     * Get the user preferences.
     */
    public function preferences()
    {
        return $this->hasOne(UserPreference::class);
    }

    /**
     * Get the journeys for the user.
     */
    public function journeys()
    {
        return $this->hasMany(Journey::class);
    }

    /**
     * Get the active journeys for the user.
     */
    public function activeJourneys()
    {
        return $this->hasMany(ActiveJourney::class);
    }

    /**
     * Get the saved trips for the user.
     */
    public function savedTrips()
    {
        return $this->hasMany(SavedTrip::class);
    }

    /**
     * Get the favorite locations for the user.
     */
    public function favoriteLocations()
    {
        return $this->hasMany(FavoriteLocation::class);
    }

    /**
     * Get the community reports for the user.
     */
    public function communityReports()
    {
        return $this->hasMany(CommunityReport::class);
    }

    /**
     * Get the notifications for the user.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the email address that should be used for reset password notifications.
     *
     * @return string
     */
    public function getEmailForPasswordReset(): string
    {
        return $this->email;
    }

    /**
     * Get the audit logs for the user.
     */
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Get the analytics events for the user.
     */
    public function analyticsEvents()
    {
        return $this->hasMany(AnalyticsEvent::class);
    }

    /**
     * Get the reset URL for password reset notifications.
     *
     * @param  string  $token
     * @return string
     */

    public function incidentReports()
    {
        return $this->hasMany(IncidentReport::class);
    }

    public function incidentVotes()
    {
        return $this->hasMany(IncidentVote::class);
    }

    public function savedPlaces()
    {
        return $this->hasMany(SavedPlace::class);
    }

    public function tripFeedback()
    {
        return $this->hasMany(TripFeedback::class);
    }

    public function aiConversations()
    {
        return $this->hasMany(AiConversation::class);
    }

    public function resetUrl($token)
    {
        return url('/api/v1/auth/reset-password?token=' . $token . '&email=' . $this->getEmailForPasswordReset());
    }
}
