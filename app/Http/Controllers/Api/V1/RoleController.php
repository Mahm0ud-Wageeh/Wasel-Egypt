<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Display a listing of the roles.
     */
    public function index()
    {
        $roles = Role::with('permissions')->get();

        return response()->json([
            'success' => true,
            'data' => $roles
        ]);
    }

    /**
     * Store a newly created role in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $role = Role::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully',
            'data' => $role
        ], 201);
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role)
    {
        return response()->json([
            'success' => true,
            'data' => $role->load('permissions')
        ]);
    }

    /**
     * Update the specified role in storage.
     */
    public function update(Request $request, Role $role)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $role->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully',
            'data' => $role
        ]);
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroy(Role $role)
    {
        // Check if role is assigned to any user
        if ($role->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete role that is assigned to users'
            ], 400);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully'
        ]);
    }

    /**
     * Assign a permission to the role.
     */
    public function assignPermission(Request $request, Role $role)
    {
        $validator = Validator::make($request->all(), [
            'permission_id' => 'required|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if the permission is already assigned
        if ($role->permissions()->where('permissions.id', $request->permission_id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Permission already assigned to this role'
            ], 400);
        }

        $role->permissions()->attach($request->permission_id);

        return response()->json([
            'success' => true,
            'message' => 'Permission assigned successfully',
            'data' => $role->load('permissions')
        ]);
    }

    /**
     * Remove a permission from the role.
     */
    public function removePermission(Role $role, Permission $permission)
    {
        // Check if the permission is assigned to the role
        if (!$role->permissions()->where('permissions.id', $permission->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Permission is not assigned to this role'
            ], 400);
        }

        $role->permissions()->detach($permission);

        return response()->json([
            'success' => true,
            'message' => 'Permission removed successfully',
            'data' => $role->load('permissions')
        ]);
    }
}