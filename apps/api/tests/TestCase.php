<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        $this->guardAgainstUnsafeTestDatabase();

        parent::setUp();
    }

    private function guardAgainstUnsafeTestDatabase(): void
    {
        foreach ([
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
        ] as $name => $expected) {
            $values = [
                'getenv' => getenv($name),
                '_ENV' => $_ENV[$name] ?? null,
                '_SERVER' => $_SERVER[$name] ?? null,
            ];

            foreach ($values as $source => $value) {
                if ($value !== $expected) {
                    throw new RuntimeException(sprintf(
                        'Unsafe test database configuration: %s[%s]=%s; expected %s. Aborting before Laravel test setup.',
                        $source,
                        $name,
                        $value === false || $value === null ? '<unset>' : $value,
                        $expected,
                    ));
                }
            }
        }
    }
}
