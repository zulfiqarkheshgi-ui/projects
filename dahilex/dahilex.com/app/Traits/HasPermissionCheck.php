<?php

namespace App\Traits;

use Illuminate\Http\Request;

trait HasPermissionCheck
{
    /**
     * Check if user has permission for the given action
     */
    protected function checkPermission(string $permission): bool
    {
        if (!auth()->check()) {
            return false;
        }

        $user = auth()->user();
        
        // Super admin has all permissions
        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return true;
        }

        return $user->hasPermissionTo($permission);
    }

    /**
     * Authorize user for specific action or abort
     */
    protected function authorize(string $permission): void
    {
        if (!$this->checkPermission($permission)) {
            abort(403, 'Access denied. You do not have permission to perform this action.');
        }
    }

    /**
     * Check multiple permissions (user needs at least one)
     */
    protected function checkAnyPermission(array $permissions): bool
    {
        if (!auth()->check()) {
            return false;
        }

        $user = auth()->user();
        
        // Super admin has all permissions
        if ($user->type === 'superadmin' || $user->type === 'super admin') {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get permission-filtered query for the model
     */
    protected function getPermissionQuery($modelClass, string $module)
    {
        return $modelClass::withPermissionCheck();
    }

    /**
     * Check if user can manage specific resource
     */
    protected function canManage(string $module, $resourceId = null): bool
    {
        $permissions = [
            "manage-any-{$module}",
            "manage-{$module}",
        ];

        if ($resourceId) {
            $permissions[] = "manage-own-{$module}";
        }

        return $this->checkAnyPermission($permissions);
    }

    /**
     * Check if user can view specific resource
     */
    protected function canView(string $module): bool
    {
        return $this->checkAnyPermission([
            "view-{$module}",
            "manage-any-{$module}",
            "manage-own-{$module}",
            "manage-{$module}",
        ]);
    }

    /**
     * Check if user can create resource
     */
    protected function canCreate(string $module): bool
    {
        return $this->checkAnyPermission([
            "create-{$module}",
            "manage-any-{$module}",
            "manage-{$module}",
        ]);
    }

    /**
     * Check if user can edit resource
     */
    protected function canEdit(string $module): bool
    {
        return $this->checkAnyPermission([
            "edit-{$module}",
            "manage-any-{$module}",
            "manage-own-{$module}",
            "manage-{$module}",
        ]);
    }

    /**
     * Check if user can delete resource
     */
    protected function canDelete(string $module): bool
    {
        return $this->checkAnyPermission([
            "delete-{$module}",
            "manage-any-{$module}",
            "manage-own-{$module}",
            "manage-{$module}",
        ]);
    }
}