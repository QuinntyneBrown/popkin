namespace Popkin.Cli;

/// <summary>
/// The `popkin` command-line tool. `migrate`, `seed` and `reset` are added with the first
/// migration; until then every command is unknown.
/// </summary>
public static class PopkinCli
{
    public static async Task<int> RunAsync(string[] args, TextWriter output)
    {
        if (args.Length == 0)
        {
            await output.WriteLineAsync("Usage: popkin <command>");
            await output.WriteLineAsync("No commands are available yet.");
            return 0;
        }

        await output.WriteLineAsync($"Unknown command '{args[0]}'.");
        return 1;
    }
}
