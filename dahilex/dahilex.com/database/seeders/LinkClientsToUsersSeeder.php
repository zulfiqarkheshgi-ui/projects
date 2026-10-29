<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LinkClientsToUsersSeeder extends Seeder
{
    public function run(): void
    {
        try {
            $clients = Client::whereNull('user_id')->whereNotNull('email')->get();
            $linked = 0;

            foreach ($clients as $client) {
                $user = User::where('email', $client->email)
                    ->where('type', 'client')
                    ->first();

                if ($user) {
                    $client->update(['user_id' => $user->id]);
                    $linked++;
                }
            }

            $this->command->info("Linked {$linked} clients to users.");
        } catch (\Exception $e) {
            $this->command->error("Error: " . $e->getMessage());
        }
    }
}
