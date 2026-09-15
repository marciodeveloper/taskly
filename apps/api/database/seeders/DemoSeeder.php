<?php

namespace Database\Seeders;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Deterministic demo data for local development and for the evaluation walkthrough.
 *
 * Never intended for production: DatabaseSeeder only calls this outside production,
 * and the account below uses a well-known password.
 */
class DemoSeeder extends Seeder
{
    public const string EMAIL = 'demo@taskly.test';

    public const string PASSWORD = 'password';

    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => self::EMAIL],
            [
                'name' => 'Usuário Demo',
                // The User model casts `password` to `hashed`, so this is hashed by Eloquent.
                'password' => self::PASSWORD,
                'email_verified_at' => now(),
            ],
        );

        // Start from a clean slate so re-running the seeder never duplicates the scenario.
        $user->projects()->each(fn (Project $project) => $project->delete());
        $user->tags()->delete();

        $tags = $this->createTags($user);
        $projects = $this->createProjects($user);

        $this->seedCaseUex($projects['case-uex'], $tags);
        $this->seedProdutoInterno($projects['produto-interno'], $tags);
        $this->seedIdeiasFuturas($projects['ideias-futuras'], $tags);
    }

    /** @return array<string, Tag> */
    private function createTags(User $user): array
    {
        $definitions = [
            'backend' => ['name' => 'Backend', 'color' => '#6366F1'],
            'frontend' => ['name' => 'Frontend', 'color' => '#22D3EE'],
            'urgente' => ['name' => 'Urgente', 'color' => '#EF7277'],
            'ux' => ['name' => 'UX', 'color' => '#48CA8D'],
            'documentacao' => ['name' => 'Documentação', 'color' => '#E7B454'],
        ];

        $tags = [];

        foreach ($definitions as $key => $attributes) {
            $tags[$key] = $user->tags()->create($attributes);
        }

        return $tags;
    }

    /** @return array<string, Project> */
    private function createProjects(User $user): array
    {
        $definitions = [
            'case-uex' => [
                'name' => 'Case UEX',
                'description' => 'Entrega do desafio técnico: escopo obrigatório, qualidade e apresentação.',
                'color' => '#29C6D3',
                'position' => 0,
            ],
            'produto-interno' => [
                'name' => 'Produto interno',
                'description' => 'Melhorias contínuas da plataforma usada pelo time.',
                'color' => '#6366F1',
                'position' => 1,
            ],
            'ideias-futuras' => [
                'name' => 'Ideias futuras',
                'description' => 'Backlog exploratório. Nada aqui está comprometido com uma data.',
                'color' => '#48CA8D',
                'position' => 2,
            ],
        ];

        $projects = [];

        foreach ($definitions as $key => $attributes) {
            $projects[$key] = $user->projects()->create($attributes);
        }

        return $projects;
    }

    /** @param array<string, Tag> $tags */
    private function seedCaseUex(Project $project, array $tags): void
    {
        $this->createTask($project, 0, [
            'title' => 'Revisar contratos da API REST',
            'short_description' => 'Conferir status codes e formato dos resources.',
            'description' => "Passar endpoint por endpoint confirmando:\n- códigos HTTP coerentes;\n- payloads estáveis via Resource;\n- mensagens de erro em pt-BR.",
            'status' => TaskStatus::InProgress,
            // Overdue on purpose: exercises the "Atrasada" indicator.
            'due_at' => now()->subDays(2)->setTime(18, 0),
        ], [$tags['backend'], $tags['urgente']]);

        $this->createTask($project, 1, [
            'title' => 'Gravar vídeo técnico da entrega',
            'short_description' => 'Roteiro curto cobrindo arquitetura e decisões.',
            'description' => 'Mostrar a fronteira Laravel/Next, autorização por propriedade e o fluxo de Kanban.',
            'status' => TaskStatus::NotStarted,
            'due_at' => now()->addDays(3)->setTime(17, 0),
        ], [$tags['documentacao']]);

        $this->createTask($project, 2, [
            'title' => 'Escrever a especificação técnica',
            'short_description' => 'Documento anterior ao bootstrap dos frameworks.',
            'description' => 'Escopo obrigatório, não-objetivos, regras de autorização e Definition of Done.',
            'status' => TaskStatus::Completed,
            'due_at' => now()->subDays(9)->setTime(12, 0),
            'completed_at' => now()->subDays(9)->setTime(11, 20),
        ], [$tags['documentacao'], $tags['backend']]);

        $this->createTask($project, 3, [
            'title' => 'Avaliar migração para PHP 8.5',
            'short_description' => 'Adiada: sem ganho técnico no momento.',
            'description' => 'A imagem do backend está consolidada em 8.3 e a suíte roda nessa linha. Ver ADR-004.',
            'status' => TaskStatus::Cancelled,
            'due_at' => null,
        ], []);
    }

    /** @param array<string, Tag> $tags */
    private function seedProdutoInterno(Project $project, array $tags): void
    {
        $this->createTask($project, 0, [
            'title' => 'Melhorar estados vazios do dashboard',
            'short_description' => 'Primeiro acesso precisa orientar melhor.',
            'description' => 'Revisar o texto e a ação primária de cada estado vazio: sem projetos, sem tarefas e sem etiquetas.',
            'status' => TaskStatus::InProgress,
            'due_at' => now()->addDays(7)->setTime(15, 30),
        ], [$tags['frontend'], $tags['ux']]);

        $this->createTask($project, 1, [
            'title' => 'Auditar contraste das cores de status',
            'short_description' => null,
            'description' => 'Conferir os quatro status do Kanban contra o contraste mínimo recomendado.',
            'status' => TaskStatus::NotStarted,
            'due_at' => null,
        ], [$tags['ux']]);

        $this->createTask($project, 2, [
            'title' => 'Indexar consultas por prazo',
            'short_description' => 'Suporte às listagens ordenadas por vencimento.',
            'description' => null,
            'status' => TaskStatus::Completed,
            'due_at' => now()->subDays(4)->setTime(10, 0),
            'completed_at' => now()->subDays(4)->setTime(9, 15),
        ], [$tags['backend']]);
    }

    /** @param array<string, Tag> $tags */
    private function seedIdeiasFuturas(Project $project, array $tags): void
    {
        $this->createTask($project, 0, [
            'title' => 'Exportar tarefas em CSV',
            'short_description' => 'Pedido recorrente em conversas com o time.',
            'description' => null,
            'status' => TaskStatus::NotStarted,
            'due_at' => null,
        ], []);

        $this->createTask($project, 1, [
            'title' => 'Lembretes de prazo por e-mail',
            'short_description' => 'Depende de fila e de agendamento.',
            'description' => 'Avaliar custo operacional antes de comprometer. Exigiria worker dedicado.',
            'status' => TaskStatus::NotStarted,
            'due_at' => now()->addDays(21)->setTime(9, 0),
        ], [$tags['backend']]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<Tag>  $tags
     */
    private function createTask(Project $project, int $position, array $attributes, array $tags): void
    {
        /** @var Task $task */
        $task = $project->tasks()->create([
            ...$attributes,
            'position' => $position,
        ]);

        if ($tags !== []) {
            $task->tags()->sync(collect($tags)->pluck('id')->all());
        }
    }
}
