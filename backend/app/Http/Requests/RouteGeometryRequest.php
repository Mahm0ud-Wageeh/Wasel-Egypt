<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RouteGeometryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize()
    {
        // Only users with 'transit-data-edit' permission can create/update/delete route geometry
        return $this->user()->hasPermission('transit-data-edit');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Two accepted payloads (same resource, both server-validated):
     *  - legacy per-point form: latitude/longitude/sequence;
     *  - full polyline form: geometry = [[lat,lng],...] — the stored shape
     *    of route_geometry (one JSON array per variant).
     */
    public function rules()
    {
        return [
            'route_variant_id' => 'required|exists:route_variants,id',
            'latitude' => ['required_without:geometry', 'numeric', 'between:-90,90'],
            'longitude' => ['required_without:geometry', 'numeric', 'between:-180,180'],
            'sequence' => ['required_without:geometry', 'integer', 'min:0'],
            'geometry' => ['required_without:latitude,longitude,sequence', 'array', 'min:2', 'max:2000'],
            'geometry.*' => ['array', 'size:2'],
            'geometry.*.0' => ['numeric', 'between:-90,90'],
            'geometry.*.1' => ['numeric', 'between:-180,180'],
        ];
    }
}
