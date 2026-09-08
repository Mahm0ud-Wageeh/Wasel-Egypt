<?php

namespace App\Repositories\Contracts;

use App\Models\Journey;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Read/write boundary for the Journey aggregate.
 *
 * Introduced (2026-09-07 audit) to honour the proposal's Service/Repository
 * pattern on the hottest aggregate without changing controller behaviour:
 * implementations keep the exact filter and eager-loading contracts the
 * controllers had.
 */
interface JourneyRepositoryInterface
{
    /**
     * Paginated journey list. $filters keys: user_id (admin scope),
     * status, per_page.
     */
    public function paginate(array $filters): LengthAwarePaginator;

    public function find(int $id): ?Journey;

    /** Full show payload eager-load: legs + route/stop/agency + transfers. */
    public function findWithLegs(int $id): ?Journey;

    public function create(array $attributes): Journey;
}
