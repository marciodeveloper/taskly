<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * The demo scenario is development-only. Running this in production would
     * create a well-known account, so it is skipped there on purpose.
     */
    public function run(): void
    {
        if ($this->container->environment('production')) {
            $this->command?->warn('Ambiente de produção: DemoSeeder ignorado.');

            return;
        }

        $this->call(DemoSeeder::class);
    }
}
