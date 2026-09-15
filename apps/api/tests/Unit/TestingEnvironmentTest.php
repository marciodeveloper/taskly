<?php

namespace Tests\Unit;

use Tests\TestCase;

class TestingEnvironmentTest extends TestCase
{
    public function test_phpunit_forces_an_isolated_environment(): void
    {
        $this->assertSame('testing', getenv('APP_ENV'));
        $this->assertSame('sqlite', getenv('DB_CONNECTION'));
        $this->assertSame(':memory:', getenv('DB_DATABASE'));
        $this->assertSame('array', getenv('SESSION_DRIVER'));
        $this->assertSame('array', getenv('CACHE_STORE'));
        $this->assertSame('sync', getenv('QUEUE_CONNECTION'));
        $this->assertSame('sqlite', $_ENV['DB_CONNECTION']);
        $this->assertSame(':memory:', $_ENV['DB_DATABASE']);
        $this->assertSame('sqlite', $_SERVER['DB_CONNECTION']);
        $this->assertSame(':memory:', $_SERVER['DB_DATABASE']);
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }
}
